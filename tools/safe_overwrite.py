#!/usr/bin/env python3
"""Sobreescritura segura (Proyecto Tlatoa). Solo biblioteca estandar.
Valida antes de escribir, rechaza fechas anteriores salvo --force,
backup con SHA-256, escritura atomica + relectura, y en SQLite
transaccion con INSERT ... ON CONFLICT(slug) DO UPDATE e integrity_check.
Uso: validate --file X | json --src N --dest D [--force] [--dry-run]
     | db --db storage/tlatoa.db --records R [--force] [--dry-run]"""
import argparse, codecs, hashlib, json, os, re, shutil, sqlite3, sys, unicodedata
from datetime import date, datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
JSON_BACKUP_DIR = BASE_DIR / "storage" / "data" / "backup"
DB_BACKUP_DIR = BASE_DIR / "storage" / "backup"
FORBIDDEN_KEYS = {"domicilio", "domicilio_particular", "direccion_particular",
    "telefono_personal", "telefono_particular", "celular_personal",
    "telefono_casa", "curp", "rfc", "familiar", "familiares", "esposa",
    "esposo", "hijo", "hija", "hijos", "correo_personal"}
DATE_KEYS = {"fecha_extraccion", "generado_en", "fecha_sincronizacion_titulares", "fecha_oficial", "fecha_contraste"}
MESES_ES = {"enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6,
    "julio": 7, "agosto": 8, "septiembre": 9, "setiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12}

def slugify(text):
    if not text:
        return ""
    text = unicodedata.normalize("NFKD", str(text)).encode("ascii", "ignore").decode("utf-8")
    text = re.sub(r"[^\w\s-]", "", text.lower()).strip()
    return re.sub(r"[-\s]+", "-", text)

def parse_date(value):
    """date o None. Acepta ISO y fechas en espanol ('3-Septiembre-2024')."""
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if not isinstance(value, str) or not value.strip():
        return None
    text = value.strip()
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).date()
    except ValueError:
        pass
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    m = re.search(r"(\d{1,2})[ -]+(?:de[ -]+)?([A-Za-záéíóú]+)[ -]+(?:de[ -]+)?(\d{4})", text, re.I)
    if m:
        mes = MESES_ES.get(m.group(2).lower())
        if mes:
            try:
                return date(int(m.group(3)), mes, int(m.group(1)))
            except ValueError:
                return None
    return None

def _collect_dates(obj, out):
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key in DATE_KEYS:
                parsed = parse_date(value)
                if parsed is not None:
                    out.append(parsed)
            else:
                _collect_dates(value, out)
    elif isinstance(obj, list):
        for item in obj:
            _collect_dates(item, out)

def extract_max_date(data):
    found = []
    _collect_dates(data, found)
    return max(found) if found else None

def _scan_personal_keys(obj, errors, where="dataset"):
    if isinstance(obj, dict):
        for key, value in obj.items():
            if str(key).lower() in FORBIDDEN_KEYS:
                errors.append(f"{where}: clave de dato personal prohibida: {key}")
            _scan_personal_keys(value, errors, where)
    elif isinstance(obj, list):
        for item in obj:
            _scan_personal_keys(item, errors, where)

def _check_legislador(rec, errors, idx, top_entidad=None):
    nombre = (rec.get("nombre_completo") or rec.get("nombre") or "").strip()
    for field, label in (("nombre_completo", nombre), ("partido", rec.get("partido")),
                         ("camara", rec.get("camara"))):
        if not label:
            errors.append(f"registro {idx} ({nombre or '?'}): falta {field}")
    if rec.get("legislatura") is None:
        errors.append(f"registro {idx} ({nombre or '?'}): falta legislatura")
    if not (rec.get("entidad") or top_entidad):
        errors.append(f"registro {idx} ({nombre or '?'}): falta entidad")

def _check_contraste(rec, errors, idx):
    nombre = (rec.get("nombre_completo") or "").strip()
    texto = f"{rec.get('dato_contrastado') or ''} {rec.get('cargo') or ''}".lower()
    institucional = any(w in texto for w in ("votaci", "integración", "directorio", "legislatura vigente"))
    if not nombre and not institucional:
        errors.append(f"registro {idx}: falta nombre_completo")
    if not rec.get("entidad"):
        errors.append(f"registro {idx} ({nombre or '?'}): falta entidad")
    if not rec.get("estado_frescura"):
        errors.append(f"registro {idx} ({nombre or '?'}): falta estado_frescura")
    if parse_date(rec.get("fecha_contraste")) is None:
        errors.append(f"registro {idx} ({nombre or '?'}): falta fecha_contraste valida")

def collect_records(data):
    """Aplana un dataset a (tipo, lista_de_registros)."""
    if isinstance(data, list):
        return "registros", data
    if not isinstance(data, dict):
        return "desconocido", []
    if "registros" in data and isinstance(data["registros"], list):
        return "contraste", list(data["registros"])
    if "votaciones" in data and isinstance(data["votaciones"], list):
        return "votaciones", list(data["votaciones"])
    if "mandatarios" in data and isinstance(data["mandatarios"], list):
        return "mandatarios", list(data["mandatarios"])
    for key in ("diputados", "senadores", "legisladores", "integrantes"):
        if key in data and isinstance(data[key], list):
            out = list(data[key])
            other = "senadores" if key == "diputados" else None
            if other and isinstance(data.get(other), list):
                out += list(data[other])
            return "legisladores", out
        if key in data and isinstance(data[key], dict):
            return "asistencias", list(data[key].values())
    if "alcaldes" in data:
        raw = data["alcaldes"]
        if isinstance(raw, dict):
            return "alcaldes", list(raw.values())
        if isinstance(raw, list):
            return "alcaldes", list(raw)
    if "nombre_completo" in data:
        return "registros", [data]
    return "desconocido", []

def validate_dataset(data, name="dataset"):
    """Valida un dataset cargado. Devuelve errores (vacia = OK)."""
    errors = []
    if data is None:
        return ["dataset vacio"]
    _scan_personal_keys(data, errors, name)
    kind, records = collect_records(data)
    if kind == "desconocido" or not records:
        errors.append(f"{name}: sin registros reconocibles para validar")
        return errors
    if kind == "votaciones":
        for idx, rec in enumerate(records):
            if not isinstance(rec, dict):
                errors.append(f"votacion {idx}: no es un objeto")
                continue
            if not rec.get("titulo"):
                errors.append(f"votacion {idx}: falta titulo")
            if parse_date(rec.get("fecha")) is None:
                errors.append(f"votacion {idx}: falta fecha valida ({rec.get('fecha')})")
            if not isinstance(rec.get("totales"), dict):
                errors.append(f"votacion {idx}: falta totales")
        return errors
    if kind == "asistencias":
        for idx, rec in enumerate(records):
            if not isinstance(rec, dict):
                errors.append(f"registro {idx}: no es un objeto")
                continue
            if not (rec.get("nombre_completo") or rec.get("nombre") or "").strip():
                errors.append(f"registro {idx}: falta nombre_completo")
            if not rec.get("partido"):
                errors.append(f"registro {idx}: falta partido")
        if extract_max_date(data) is None:
            errors.append(f"{name}: falta fecha valida")
        return errors
    top_entidad = data.get("entidad") if isinstance(data, dict) else None
    for idx, rec in enumerate(records):
        if not isinstance(rec, dict):
            errors.append(f"registro {idx}: no es un objeto")
            continue
        if kind == "contraste":
            _check_contraste(rec, errors, idx)
        elif kind in ("mandatarios", "alcaldes"):
            if not (rec.get("nombre_completo") or rec.get("nombre") or "").strip():
                errors.append(f"registro {idx}: falta nombre_completo")
            if kind == "mandatarios" and not rec.get("partido"):
                errors.append(f"registro {idx}: falta partido")
        else:
            _check_legislador(rec, errors, idx, top_entidad)
    if extract_max_date(data) is None:
        errors.append(f"{name}: falta fecha valida (fecha_extraccion, generado_en, fecha_oficial o fecha_contraste)")
    return errors

def sha256_bytes(data):
    return hashlib.sha256(data).hexdigest()

def backup_file(path, backup_dir):
    """Copia path a backup_dir con sello de tiempo y manifiesto SHA-256."""
    path, backup_dir = Path(path), Path(backup_dir)
    backup_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup = backup_dir / f"{path.stem}.{stamp}{path.suffix}"
    shutil.copy2(path, backup)
    digest = sha256_bytes(backup.read_bytes())
    backup.with_suffix(backup.suffix + ".sha256").write_text(f"{digest}  {backup.name}\n", encoding="utf-8")
    manifest = backup_dir / "manifest.json"
    entries = []
    if manifest.exists():
        try:
            entries = json.loads(manifest.read_text(encoding="utf-8"))
            entries = entries if isinstance(entries, list) else []
        except json.JSONDecodeError:
            entries = []
    entries.append({"destino": str(path), "backup": str(backup), "sha256": digest, "fecha": stamp})
    manifest.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")
    return backup, digest

def atomic_write(path, data_bytes):
    """Temporal en el mismo dir + fsync + os.replace + fsync del dir; relectura."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f".{path.name}.tmp-{os.getpid()}")
    try:
        with open(tmp, "wb") as handle:
            handle.write(data_bytes)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(tmp, path)
        dir_fd = os.open(path.parent, os.O_RDONLY)
        try:
            os.fsync(dir_fd)
        finally:
            os.close(dir_fd)
    finally:
        if tmp.exists():
            tmp.unlink(missing_ok=True)
    if sha256_bytes(path.read_bytes()) != sha256_bytes(data_bytes):
        raise ValueError(f"verificacion fallida tras escribir {path}")
    return path

def _read_json_bytes(raw, name):
    if raw.startswith(codecs.BOM_UTF8):
        raise ValueError(f"{name}: tiene BOM UTF-8, prohibido por DATA_SCHEMA.md")
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ValueError(f"{name}: no es UTF-8 valido: {exc}") from exc
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(f"{name}: JSON invalido: {exc}") from exc

def overwrite_json(src, dest, force=False, dry_run=False):
    """Valida src y lo escribe sobre dest con backup y escritura atomica."""
    src, dest = Path(src), Path(dest)
    raw = src.read_bytes()
    data = _read_json_bytes(raw, str(src))
    errors = validate_dataset(data, str(src))
    if errors:
        raise ValueError("validacion fallida:\n- " + "\n- ".join(errors))
    new_date, old_date, backup = extract_max_date(data), None, None
    if dest.exists():
        try:
            old_date = extract_max_date(_read_json_bytes(dest.read_bytes(), str(dest)))
        except ValueError:
            old_date = None
    if old_date is not None and new_date is not None and new_date < old_date and not force:
        raise ValueError(f"fecha nueva {new_date} anterior a la existente {old_date}; usa --force solo si es una correccion justificada")
    result = {"src": str(src), "dest": str(dest), "dry_run": dry_run,
              "fecha_nueva": str(new_date), "fecha_existente": str(old_date),
              "backup": None, "sha256": sha256_bytes(raw)}
    if dry_run:
        return result
    if dest.exists():
        backup, _digest = backup_file(dest, JSON_BACKUP_DIR)
        result["backup"] = str(backup)
    atomic_write(dest, raw)
    return result

def _record_date(record):
    for key in ("fecha_oficial", "fecha_extraccion", "fecha_contraste"):
        parsed = parse_date(record.get(key))
        if parsed is not None:
            return parsed
    meta = record.get("metadata") or {}
    return parse_date(meta.get("fecha_extraccion")) if isinstance(meta, dict) else None

def _record_fields(record):
    nombre = (record.get("nombre_completo") or record.get("nombre") or "").strip()
    return (record.get("slug") or slugify(nombre), nombre,
            record.get("partido") or "Sin Partido",
            record.get("cargo") or record.get("cargo_oficial") or "Legislador(a)",
            record.get("camara") or "Congreso Local",
            record.get("entidad") or "Nacional",
            record.get("foto_oficial_url") or record.get("foto_url") or "")

UPSERT_SQL = """INSERT INTO politicos (slug, nombre_completo, partido, partido_color, cargo, camara, entidad, es_activo, foto_url, datos_json)
    VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET nombre_completo=excluded.nombre_completo,
    partido=excluded.partido, cargo=excluded.cargo, camara=excluded.camara, entidad=excluded.entidad,
    foto_url=excluded.foto_url, datos_json=excluded.datos_json"""

def upsert_db(db_path, records_path, force=False, dry_run=False, backup=True):
    """Upsert por slug en politicos, en transaccion, con backup e integrity_check."""
    db_path, records_path = Path(db_path), Path(records_path)
    data = _read_json_bytes(records_path.read_bytes(), str(records_path))
    _kind, records = collect_records(data)
    usable = [r for r in records if isinstance(r, dict) and (r.get("nombre_completo") or r.get("nombre"))]
    if not usable:
        raise ValueError("sin registros con nombre_completo para insertar en la DB")
    if not db_path.exists():
        raise FileNotFoundError(f"no existe la DB: {db_path}")
    conn = sqlite3.connect(db_path)
    try:
        if conn.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise ValueError("integrity_check previo fallo")
        before = conn.execute("SELECT COUNT(*) FROM politicos").fetchone()[0]
        existing = {row[0]: row[1] for row in conn.execute("SELECT slug, datos_json FROM politicos")}
        skipped = sum(1 for r in usable
                      if _record_date(r) is not None
                      and _record_fields(r)[0] in existing
                      and _record_date(json.loads(existing[_record_fields(r)[0]] or "{}")) is not None
                      and _record_date(r) < _record_date(json.loads(existing[_record_fields(r)[0]] or "{}"))
                      and not force)
        if dry_run:
            return {"db": str(db_path), "dry_run": True, "antes": before,
                    "insertables_o_actualizables": len(usable) - skipped,
                    "omitidos_por_fecha": skipped, "backup": None}
        backup_path = None
        if backup:
            DB_BACKUP_DIR.mkdir(parents=True, exist_ok=True)
            stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
            backup_path = DB_BACKUP_DIR / f"{db_path.stem}.{stamp}{db_path.suffix}"
            shutil.copy2(db_path, backup_path)
        inserted = updated = 0
        try:
            conn.execute("BEGIN IMMEDIATE")
            for record in usable:
                slug, nombre, partido, cargo, camara, entidad, foto = _record_fields(record)
                if slug in existing:
                    old_date = _record_date(json.loads(existing[slug] or "{}"))
                    if _record_date(record) is not None and old_date is not None and _record_date(record) < old_date and not force:
                        continue
                    updated += 1
                else:
                    inserted += 1
                conn.execute(UPSERT_SQL, (slug, nombre, partido, "#6C757D", cargo, camara,
                                          entidad, 1, foto, json.dumps(record, ensure_ascii=False)))
                conn.execute("DELETE FROM politicos_fts WHERE slug = ?", (slug,))
                conn.execute("INSERT INTO politicos_fts (slug, nombre, partido, cargo, entidad) VALUES (?,?,?,?,?)",
                             (slug, nombre, partido, cargo, entidad))
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        if conn.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise ValueError("integrity_check posterior fallo")
        after = conn.execute("SELECT COUNT(*) FROM politicos").fetchone()[0]
        return {"db": str(db_path), "dry_run": False, "antes": before, "despues": after,
                "insertados": inserted, "actualizados": updated, "omitidos_por_fecha": skipped,
                "backup": str(backup_path) if backup_path else None}
    finally:
        conn.close()

def main(argv=None):
    parser = argparse.ArgumentParser(description="Sobreescritura segura de datos Tlatoa")
    sub = parser.add_subparsers(dest="cmd", required=True)
    pv = sub.add_parser("validate", help="Valida un JSON sin escribir")
    pv.add_argument("--file", required=True)
    pj = sub.add_parser("json", help="Sobrescribe un JSON con backup")
    pj.add_argument("--src", required=True)
    pj.add_argument("--dest", required=True)
    pj.add_argument("--force", action="store_true")
    pj.add_argument("--dry-run", action="store_true")
    pd = sub.add_parser("db", help="Upsert de registros en una SQLite")
    pd.add_argument("--db", required=True)
    pd.add_argument("--records", required=True)
    pd.add_argument("--force", action="store_true")
    pd.add_argument("--dry-run", action="store_true")
    pd.add_argument("--no-backup", action="store_true")
    args = parser.parse_args(argv)
    try:
        if args.cmd == "validate":
            data = _read_json_bytes(Path(args.file).read_bytes(), args.file)
            errors = validate_dataset(data, args.file)
            if errors:
                print("NO VALIDO:\n" + "\n".join(f"- {e}" for e in errors))
                return 1
            print(f"OK: {args.file} (fecha maxima {extract_max_date(data)})")
            return 0
        if args.cmd == "json":
            print(json.dumps(overwrite_json(args.src, args.dest, args.force, args.dry_run), ensure_ascii=False, indent=2))
            return 0
        print(json.dumps(upsert_db(args.db, args.records, args.force, args.dry_run, backup=not args.no_backup), ensure_ascii=False, indent=2))
        return 0
    except (ValueError, FileNotFoundError, sqlite3.Error, OSError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    raise SystemExit(main())

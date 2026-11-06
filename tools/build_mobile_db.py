#!/usr/bin/env python3
"""
tools/build_mobile_db.py — Compilador de Base de Datos SQLite Ultracompacta (Proyecto Tlatoa)
Convierte los datasets JSON en un archivo SQLite 'storage/tlatoa.db' optimizado con FTS5.

Sobreescritura segura: se construye en 'tlatoa.db.tmp', se verifica
con integrity_check y FTS5, se compara el total (aborta si cae >5%
o <15000) y solo entonces se reemplaza, con backup previo.

Orden y fechas: los archivos se procesan por legislatura descendente
y el primer slug visto gana. Por eso un registro nuevo solo sustituye
a uno viejo si su fecha es >= a la existente (tools/safe_overwrite.py).
"""

import argparse
import json
import re
import shutil
import sqlite3
import sys
import unicodedata
from datetime import datetime
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

try:
    import orjson

    def load_json_file(path: Path):
        return orjson.loads(path.read_bytes())
except ImportError:
    def load_json_file(path: Path):
        with open(path, encoding="utf-8", errors="replace") as f:
            return json.load(f)

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "storage" / "data" / "json"
OUTPUT_DB = BASE_DIR / "storage" / "tlatoa.db"
DB_BACKUP_DIR = BASE_DIR / "storage" / "backup"


def previous_total():
    """Total de politicos en la DB anterior, o None si no existe o esta rota."""
    if not OUTPUT_DB.exists():
        return None
    try:
        conn = sqlite3.connect(f"file:{OUTPUT_DB}?mode=ro", uri=True)
        try:
            return conn.execute("SELECT COUNT(*) FROM politicos").fetchone()[0]
        finally:
            conn.close()
    except sqlite3.Error:
        return None


def check_counts(old_total, new_total, allow_drop_pct=5.0, min_total=15000):
    """Aborta si el total nuevo es demasiado bajo o la caida supera el umbral."""
    if new_total < min_total:
        raise SystemExit(
            f"ABORTADO: total nuevo {new_total} < minimo {min_total}; "
            "la DB anterior queda intacta"
        )
    if old_total is not None and old_total > 0:
        drop_pct = (old_total - new_total) / old_total * 100
        if drop_pct > allow_drop_pct:
            raise SystemExit(
                f"ABORTADO: caida de {old_total} a {new_total} "
                f"({drop_pct:.1f}% > {allow_drop_pct}% permitido); "
                "la DB anterior queda intacta"
            )
    return True


def backup_db():
    """Copia la DB actual a storage/backup/ con sello de tiempo."""
    DB_BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup = DB_BACKUP_DIR / f"{OUTPUT_DB.stem}.{stamp}{OUTPUT_DB.suffix}"
    shutil.copy2(OUTPUT_DB, backup)
    return backup


def slugify(text: str) -> str:
    if not text:
        return ""
    text = unicodedata.normalize("NFKD", str(text)).encode("ascii", "ignore").decode("utf-8")
    text = re.sub(r"[^\w\s-]", "", text.lower()).strip()
    return re.sub(r"[-\s]+", "-", text)


def get_party_color(partido: str) -> str:
    if not partido:
        return "#6C757D"
    p = partido.upper()
    if "MORENA" in p:
        return "#8B1C3F"
    if "PAN" in p and "PANAL" not in p:
        return "#003893"
    if "VERDE" in p or "PVEM" in p:
        return "#009E49"
    if "PRI" in p:
        return "#C8102E"
    if "PT" in p or "TRABAJO" in p:
        return "#DA291C"
    if "MC" in p or "CIUDADANO" in p or "CONVERGENCIA" in p:
        return "#FF8300"
    if "PES" in p:
        return "#582C83"
    if "PRD" in p:
        return "#FFD100"
    if "PANAL" in p or "NUEVA ALIANZA" in p:
        return "#00A896"
    return "#6C757D"


def extract_leg_num(path: Path) -> int:
    m = re.search(r"_leg_(\d+)\.json$", path.name)
    return int(m.group(1)) if m else 0


def historical_local_files() -> set:
    """Rutas 'json/...' de storage/data/historico.json; vacio si falta."""
    try:
        data = load_json_file(BASE_DIR / "storage" / "data" / "historico.json")
        return {x["archivo"] for x in data.get("archivos", [])}
    except Exception:
        return set()

def is_federal_executive(path: Path, data: dict) -> bool:
    """True si el archivo es Ejecutivo Federal (presidencia_*.json o nivel federal)."""
    return path.name.startswith("presidencia_") or data.get("nivel") == "federal" or data.get("ambito") == "federal"


def init_database(conn: sqlite3.Connection):
    cursor = conn.cursor()
    cursor.execute("PRAGMA journal_mode = OFF;")
    cursor.execute("PRAGMA synchronous = 0;")
    cursor.execute("PRAGMA page_size = 4096;")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS politicos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT UNIQUE NOT NULL,
            nombre_completo TEXT NOT NULL,
            partido TEXT NOT NULL,
            partido_color TEXT NOT NULL,
            cargo TEXT NOT NULL,
            camara TEXT NOT NULL,
            entidad TEXT NOT NULL,
            es_activo INTEGER NOT NULL DEFAULT 1,
            foto_url TEXT,
            datos_json TEXT NOT NULL
        );
    """)

    cursor.execute("CREATE INDEX IF NOT EXISTS idx_politicos_nombre ON politicos(nombre_completo);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_politicos_entidad ON politicos(entidad);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_politicos_partido ON politicos(partido);")

    cursor.execute("""
        CREATE VIRTUAL TABLE IF NOT EXISTS politicos_fts USING fts5(
            slug UNINDEXED,
            nombre,
            partido,
            cargo,
            entidad,
            tokenize = 'unicode61 remove_diacritics 2'
        );
    """)
    conn.commit()


def insert_record(cursor, politicos_vistos, slug, nombre, partido, color, cargo, camara, entidad, es_activo, foto, raw_dict) -> bool:
    if not nombre or not slug or slug in politicos_vistos:
        return False
    politicos_vistos.add(slug)
    json_str = json.dumps(raw_dict, ensure_ascii=False)
    cursor.execute("""
        INSERT INTO politicos (slug, nombre_completo, partido, partido_color, cargo, camara, entidad, es_activo, foto_url, datos_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (slug, nombre, partido, color, cargo, camara, entidad, es_activo, foto or "", json_str))

    cursor.execute("""
        INSERT INTO politicos_fts (slug, nombre, partido, cargo, entidad)
        VALUES (?, ?, ?, ?, ?)
    """, (slug, nombre, partido, cargo, entidad))
    return True


def build_database(allow_drop_pct=5.0, min_total=15000, backup=True, dry_run=False):
    old_total = previous_total()
    OUTPUT_DB.parent.mkdir(parents=True, exist_ok=True)
    tmp_db = OUTPUT_DB.with_suffix(".db.tmp")
    if tmp_db.exists():
        tmp_db.unlink()

    print(f">>> Generando base de datos SQLite en: {OUTPUT_DB}")
    conn = sqlite3.connect(str(tmp_db))
    init_database(conn)
    cursor = conn.cursor()

    politicos_vistos = set()
    counts = {"federales": 0, "ejecutivo": 0, "alcaldes": 0, "locales": 0}

    # 1. Procesar Congreso Federal (Diputados y Senadores, priorizando LXVI más reciente)
    fed_files = sorted(DATA_DIR.glob("congreso_union_leg_*.json"), key=extract_leg_num, reverse=True)
    for fed_file in fed_files:
        try:
            data = load_json_file(fed_file)
            leg_num = extract_leg_num(fed_file)
            es_activo = 1 if leg_num >= 66 else 0
            for camara, lista in [("Diputados", data.get("diputados", [])), ("Senadores", data.get("senadores", []))]:
                for p in lista:
                    if not isinstance(p, dict):
                        continue
                    nombre = (p.get("nombre_completo") or p.get("nombre") or "").strip()
                    slug = p.get("slug") or slugify(nombre)
                    partido = p.get("partido") or "Sin Partido"
                    color = get_party_color(partido)
                    entidad = p.get("entidad") or "Nacional"
                    cargo = "Senador(a) de la República" if camara == "Senadores" else "Diputado(a) Federal"
                    foto = p.get("foto_oficial_url") or p.get("foto_url") or ""
                    if insert_record(cursor, politicos_vistos, slug, nombre, partido, color, cargo, camara, entidad, es_activo, foto, p):
                        counts["federales"] += 1
        except Exception as e:
            print(f"  [Aviso] Omitiendo {fed_file.name}: {e}")

    # 2. Ejecutivo Federal y Gobernadores (slug por mandato; una sola
    # fila activa por persona y cargo vigente).
    dir_ejecutivo = DATA_DIR / "ejecutivo"
    if dir_ejecutivo.exists():
        ejec_files = sorted(dir_ejecutivo.glob("*.json"),
                            key=lambda p: (0 if p.name.startswith("presidencia_") else 1, p.name))
        for gob_file in ejec_files:
            try:
                data = load_json_file(gob_file)
                if not isinstance(data, dict):
                    continue
                es_federal = is_federal_executive(gob_file, data)
                camara_ejec = "Ejecutivo Federal" if es_federal else "Ejecutivo Estatal"
                entidad = data.get("entidad") or "Nacional"
                mandatarios = data.get("mandatarios", [])
                if not isinstance(mandatarios, list):
                    continue
                # Recorrer del más reciente al más antiguo
                for idx, m in enumerate(reversed(mandatarios)):
                    if not isinstance(m, dict):
                        continue
                    nombre = (m.get("nombre_completo") or m.get("nombre") or "").strip()
                    slug = m.get("slug") or slugify(f"{nombre}-{entidad}")
                    partido = m.get("partido") or "Sin Partido"
                    color = m.get("partido_color") or get_party_color(partido)
                    es_activo = 1 if idx == 0 else 0
                    cargo_base = m.get("cargo_oficial") or f"Gobernador(a) de {entidad}"
                    cargo = cargo_base if es_activo else f"Ex {cargo_base}"
                    foto = m.get("foto_url") or m.get("foto_oficial_url") or ""
                    if insert_record(cursor, politicos_vistos, slug, nombre, partido, color, cargo, camara_ejec, entidad, es_activo, foto, m):
                        counts["ejecutivo"] += 1
            except Exception as e:
                print(f"  [Aviso] Omitiendo {gob_file.name}: {e}")

    # 3. Procesar Presidentes Municipales / Alcaldes (2,474 municipios)
    dir_alcaldes = DATA_DIR / "alcaldes"
    if dir_alcaldes.exists():
        for alc_file in sorted(dir_alcaldes.glob("*.json")):
            try:
                data = load_json_file(alc_file)
                raw_alcaldes = data.get("alcaldes", []) if isinstance(data, dict) else data
                if isinstance(raw_alcaldes, dict):
                    items = list(raw_alcaldes.values())
                elif isinstance(raw_alcaldes, list):
                    items = raw_alcaldes
                else:
                    items = []

                for a in items:
                    if not isinstance(a, dict):
                        continue
                    nombre = (a.get("nombre_completo") or a.get("nombre") or a.get("alcalde") or "").strip()
                    if not nombre or len(nombre) < 3:
                        continue
                    mun = (a.get("municipio") or "").strip()
                    entidad = (a.get("entidad") or "").strip()
                    slug = a.get("slug") or slugify(f"{nombre}-{mun}-{entidad}")
                    partido = a.get("partido") or "Sin Partido"
                    color = get_party_color(partido)
                    cargo = f"Presidente(a) Municipal de {mun}" if mun else "Presidente(a) Municipal"
                    foto = a.get("foto_url") or ""
                    if insert_record(cursor, politicos_vistos, slug, nombre, partido, color, cargo, "Municipal", entidad, 1, foto, a):
                        counts["alcaldes"] += 1
            except Exception as e:
                print(f"  [Aviso] Omitiendo {alc_file.name}: {e}")

    # 4. Congresos Locales: primero los vigentes (es_activo=1), luego los
    # historicos (es_activo=0); un historico con leg alta (ALDF leg 7)
    # ganaba el dedup y dejaba activos a ex-diputados. El cargo no cambia.
    historical = historical_local_files()
    local_files = [
        p for p in DATA_DIR.glob("congreso_*_leg_*.json")
        if not p.name.startswith("congreso_union_")
    ]
    local_files.sort(key=lambda p: (0 if f"json/{p.name}" not in historical else 1, -extract_leg_num(p)))
    for c_file in local_files:
        try:
            c_data = load_json_file(c_file)
            if isinstance(c_data, dict):
                dips = c_data.get("legisladores") or c_data.get("diputados") or c_data.get("integrantes") or []
                meta_entidad = c_data.get("metadata", {}).get("entidad") or c_data.get("entidad") or "Congreso Local"
            elif isinstance(c_data, list):
                dips = c_data
                meta_entidad = "Congreso Local"
            else:
                dips = []
                meta_entidad = "Congreso Local"
            for d in dips:
                if not isinstance(d, dict):
                    continue
                nombre = (d.get("nombre_completo") or d.get("nombre") or "").strip()
                slug = d.get("slug") or slugify(nombre)
                partido = d.get("partido") or "Sin Partido"
                color = get_party_color(partido)
                entidad = d.get("entidad") or meta_entidad
                cargo = f"Diputado(a) Local ({entidad})" if entidad and entidad != "Congreso Local" else "Diputado(a) Local"
                foto = d.get("foto_oficial_url") or d.get("foto_url") or ""
                es_activo = 1 if f"json/{c_file.name}" not in historical else 0
                if insert_record(cursor, politicos_vistos, slug, nombre, partido, color, cargo, "Congreso Local", entidad, es_activo, foto, d):
                    counts["locales"] += 1
        except Exception as e:
            print(f"  [Aviso] Omitiendo {c_file.name}: {e}")

    conn.commit()
    cursor.execute("VACUUM;")
    cursor.execute("ANALYZE;")
    conn.commit()

    # Verificacion en el archivo temporal, antes de tocar la DB anterior.
    total = sum(counts.values())
    integrity = cursor.execute("PRAGMA integrity_check").fetchone()[0]
    if integrity != "ok":
        conn.close()
        tmp_db.unlink(missing_ok=True)
        raise SystemExit(f"ABORTADO: integrity_check fallo en la DB temporal: {integrity}")
    fts_hits = cursor.execute(
        "SELECT COUNT(*) FROM politicos_fts WHERE politicos_fts MATCH ?", ("lopez",)
    ).fetchone()[0]
    if fts_hits <= 0:
        conn.close()
        tmp_db.unlink(missing_ok=True)
        raise SystemExit("ABORTADO: prueba FTS5 fallo (MATCH 'lopez' devolvio 0 filas)")
    try:
        check_counts(old_total, total, allow_drop_pct, min_total)
    except SystemExit:
        conn.close()
        tmp_db.unlink(missing_ok=True)
        raise
    conn.close()

    if dry_run:
        tmp_db.unlink(missing_ok=True)
        print("DRY-RUN: no se reemplazo la DB anterior.")
        print(f"   - Total anterior: {old_total}")
        print(f"   - Total nuevo (temporal): {total} (FTS5 'lopez': {fts_hits} filas)")
        return counts

    backup_path = None
    if backup and OUTPUT_DB.exists():
        backup_path = backup_db()

    tmp_db.replace(OUTPUT_DB)

    size_mb = OUTPUT_DB.stat().st_size / (1024 * 1024)
    print("✅ Base de datos SQLite compilada con éxito!")
    print(f"   - Legisladores Federales: {counts['federales']}")
    print(f"   - Gobernadores / Ejecutivo: {counts['ejecutivo']}")
    print(f"   - Presidentes Municipales (Alcaldes): {counts['alcaldes']}")
    print(f"   - Diputados Locales: {counts['locales']}")
    print(f"   - Total de actores políticos indexados: {total}")
    print(f"   - Tamaño final del archivo SQLite: {size_mb:.2f} MB")
    if backup_path:
        print(f"   - Copia de seguridad de la DB anterior: {backup_path}")
    return counts


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Compila storage/tlatoa.db con guardas de sobreescritura segura")
    parser.add_argument("--backup", dest="backup", action="store_true", default=True)
    parser.add_argument("--no-backup", dest="backup", action="store_false")
    parser.add_argument("--allow-drop-pct", type=float, default=5.0)
    parser.add_argument("--min-total", type=int, default=15000)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    build_database(allow_drop_pct=args.allow_drop_pct, min_total=args.min_total,
                   backup=args.backup, dry_run=args.dry_run)

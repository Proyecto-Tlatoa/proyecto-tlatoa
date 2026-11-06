"""Construye storage/contraste.db a partir de storage/data/contraste/*.json.

Solo biblioteca estandar. No toca los datasets canonicos de
storage/data/json/. Regenera la DB con el mismo mecanismo de
sobreescritura segura que tools/safe_overwrite.py: valida cada JSON,
construye en un archivo temporal, verifica integrity_check, guarda
backup de la DB anterior y solo entonces hace os.replace. Uso:
    python3 tools/build_contraste_db.py
"""
import json
import os
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from safe_overwrite import backup_file, validate_dataset  # noqa: E402

BASE_DIR = Path(__file__).resolve().parent.parent
CONTRASTE_DIR = BASE_DIR / "storage" / "data" / "contraste"
DB_PATH = BASE_DIR / "storage" / "contraste.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS contraste (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lote TEXT NOT NULL,
    archivo TEXT NOT NULL,
    referencia_sil TEXT,
    cvegeo TEXT,
    nombre_completo TEXT,
    cargo TEXT,
    entidad TEXT,
    dato_contrastado TEXT,
    valor_oficial TEXT,
    fecha_oficial TEXT,
    fuente_oficial_url TEXT,
    estado_frescura TEXT,
    fuente_medio TEXT,
    fuente_url TEXT,
    fuente_fecha_publicacion TEXT,
    fuente_titulo TEXT,
    fuente_desactualizada INTEGER NOT NULL DEFAULT 0,
    fecha_contraste TEXT NOT NULL,
    notas TEXT
);
CREATE INDEX IF NOT EXISTS idx_contraste_estado
    ON contraste (estado_frescura);
CREATE INDEX IF NOT EXISTS idx_contraste_entidad
    ON contraste (entidad);
"""


def load_records():
    """Lee todos los JSON de contraste y devuelve (lote, archivo, registro)."""
    records = []
    for path in sorted(CONTRASTE_DIR.glob("contraste_*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        errors = validate_dataset(data, str(path))
        if errors:
            raise ValueError(f"{path}: validacion fallida:\n- " + "\n- ".join(errors))
        lote = data.get("lote", path.stem)
        for record in data.get("registros", []):
            records.append((lote, path.name, record))
    return records


def main():
    records = load_records()
    tmp_db = DB_PATH.with_suffix(".db.tmp")
    if tmp_db.exists():
        tmp_db.unlink()
    conn = sqlite3.connect(tmp_db)
    try:
        conn.executescript(SCHEMA)
        for lote, archivo, r in records:
            fuente = r.get("fuente_actualizada_no_oficial") or {}
            conn.execute(
                """
                INSERT INTO contraste (
                    lote, archivo, referencia_sil, cvegeo, nombre_completo,
                    cargo, entidad, dato_contrastado, valor_oficial,
                    fecha_oficial, fuente_oficial_url, estado_frescura,
                    fuente_medio, fuente_url, fuente_fecha_publicacion,
                    fuente_titulo, fuente_desactualizada, fecha_contraste,
                    notas
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                (
                    lote,
                    archivo,
                    r.get("referencia_sil"),
                    r.get("cvegeo"),
                    r.get("nombre_completo"),
                    r.get("cargo"),
                    r.get("entidad"),
                    r.get("dato_contrastado"),
                    r.get("valor_oficial"),
                    r.get("fecha_oficial"),
                    r.get("fuente_oficial_url"),
                    r.get("estado_frescura"),
                    fuente.get("medio"),
                    fuente.get("url"),
                    fuente.get("fecha_publicacion"),
                    fuente.get("titulo"),
                    1 if r.get("fuente_desactualizada") else 0,
                    r.get("fecha_contraste"),
                    r.get("notas"),
                ),
            )
        conn.commit()
        total = conn.execute("SELECT COUNT(*) FROM contraste").fetchone()[0]
        integrity = conn.execute("PRAGMA integrity_check").fetchone()[0]
        if integrity != "ok":
            raise ValueError(f"integrity_check fallo en la DB temporal: {integrity}")
        counts = list(conn.execute(
            "SELECT estado_frescura, COUNT(*) FROM contraste "
            "GROUP BY estado_frescura ORDER BY estado_frescura"
        ))
    finally:
        conn.close()
    # Solo tras verificar el temporal: backup de la anterior y replace.
    backup = None
    if DB_PATH.exists():
        backup, _digest = backup_file(DB_PATH, DB_PATH.parent / "backup")
    os.replace(tmp_db, DB_PATH)
    print(f"registros: {total}")
    print(f"db: {DB_PATH} ({DB_PATH.stat().st_size} bytes)")
    for row in counts:
        print(f"  {row[0]}: {row[1]}")
    if backup:
        print(f"backup de la DB anterior: {backup}")


if __name__ == "__main__":
    main()

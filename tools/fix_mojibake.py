#!/usr/bin/env python3
"""
Herramienta de saneamiento de codificación UTF-8 / Mojibake para Proyecto Tlatoa.
Repara secuencias de doble codificación (Latin-1/UTF-8) en los datasets canónicos JSON.
"""

from pathlib import Path
import json

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "storage" / "data" / "json"

PATTERNS = {
    'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú',
    'Ã±': 'ñ', 'Ã‘': 'Ñ', 'Ã“': 'Ó', 'Ã‰': 'É', 'Ãš': 'Ú',
    'Ã ': 'Á', 'Ã ': 'Í', 'Ã¼': 'ü', 'Ãœ': 'Ü'
}

def fix_all():
    print("🔍 Escaneando y corrigiendo mojibake en storage/data/json/...")
    fixed_count = 0
    total_files = 0

    for json_file in DATA_DIR.glob("**/*.json"):
        total_files += 1
        try:
            text = json_file.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            raw = json_file.read_bytes()
            text = raw.decode("latin-1", errors="replace")

        modified = False
        for bad_pat, good_char in PATTERNS.items():
            if bad_pat in text:
                text = text.replace(bad_pat, good_char)
                modified = True

        if modified:
            try:
                # Validar sintaxis JSON antes de persistir
                json.loads(text)
                json_file.write_text(text, encoding="utf-8")
                fixed_count += 1
            except Exception as e:
                print(f"⚠️ Error validando JSON en {json_file.name}: {e}")

    print(f"✅ Proceso completado: {fixed_count} archivos reparados de {total_files} escaneados.")

if __name__ == "__main__":
    fix_all()

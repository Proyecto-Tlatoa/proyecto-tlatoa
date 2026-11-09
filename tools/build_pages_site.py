#!/usr/bin/env python3
"""
Compilador del sitio estático para GitHub Pages (Proyecto Tlatoa)
Genera el índice de búsqueda search_index.json, sincroniza assets y genera .nojekyll y 404.html
"""

import sqlite3
import json
import shutil
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
PAGES_DIR = ROOT_DIR / "pages"
DATA_DIR = PAGES_DIR / "data"
ASSETS_DIR = PAGES_DIR / "assets"
DB_PATH = ROOT_DIR / "storage" / "tlatoa.db"

def build():
    print("🚀 Compilando sitio estático para GitHub Pages...")
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Crear .nojekyll para evitar que GitHub Pages ejecute Jekyll
    nojekyll_file = PAGES_DIR / ".nojekyll"
    nojekyll_file.touch()
    print("  [+] Creado pages/.nojekyll")

    # 2. Copiar assets esenciales
    src_assets = ROOT_DIR / "assets"
    for filename in ["banner.png", "tecolote.png", "favicon.svg", "favicon.ico"]:
        src_file = src_assets / filename
        if src_file.exists():
            shutil.copy2(src_file, ASSETS_DIR / filename)
            print(f"  [+] Copiado asset: {filename}")

    src_svg = src_assets / "img" / "tecolote.svg"
    if src_svg.exists():
        (ASSETS_DIR / "img").mkdir(exist_ok=True)
        shutil.copy2(src_svg, ASSETS_DIR / "img" / "tecolote.svg")

    # 3. Copiar fotos locales de representantes si existen en storage/raw/photos y assets/img/presidentes
    src_photos = ROOT_DIR / "storage" / "raw" / "photos"
    src_pres_photos = ROOT_DIR / "assets" / "img" / "presidentes"
    dest_photos = ASSETS_DIR / "photos"
    dest_photos.mkdir(parents=True, exist_ok=True)
    local_photo_files = set()
    if src_photos.exists():
        for p_file in src_photos.glob("*.jpg"):
            shutil.copy2(p_file, dest_photos / p_file.name)
            local_photo_files.add(p_file.name)
        for p_file in src_photos.glob("*.png"):
            shutil.copy2(p_file, dest_photos / p_file.name)
            local_photo_files.add(p_file.name)
    if src_pres_photos.exists():
        for p_file in src_pres_photos.glob("*.jpg"):
            shutil.copy2(p_file, dest_photos / p_file.name)
            local_photo_files.add(p_file.name)
        for p_file in src_pres_photos.glob("*.png"):
            shutil.copy2(p_file, dest_photos / p_file.name)
            local_photo_files.add(p_file.name)
    print(f"  [+] Copiadas {len(local_photo_files)} fotos locales a pages/assets/photos/")

    output_path = DATA_DIR / "search_index.json"

    # 4. Extraer datos compactos de SQLite si existe
    if DB_PATH.exists():
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT slug, nombre_completo, partido, partido_color, cargo, camara, entidad, es_activo, foto_url, datos_json 
            FROM politicos
            ORDER BY es_activo DESC, nombre_completo ASC
        """)

        items = []
        for row in cursor.fetchall():
            slug, nombre, partido, color, cargo, camara, entidad, es_activo, foto, dj_str = row
            dj = json.loads(dj_str) if dj_str else {}
            
            fuente = dj.get("fuente_url") or (dj.get("metadata") or {}).get("fuente_url")
            if not fuente and dj.get("referencia_sil"):
                fuente = f"https://sil.gobernacion.gob.mx/Librerias/pp_PerfilLegislador.php?Referencia={dj['referencia_sil']}"

            # Resolver foto: priorizar copia local en ./assets/photos/ para carga instantánea y sin fallos SSL
            final_foto = ""
            slug_base = slug.replace("-mexico", "")
            if foto:
                f_name = Path(foto).name
                if f_name in local_photo_files:
                    final_foto = f"./assets/photos/{f_name}"
                elif dj.get("referencia_sil") and f"{dj['referencia_sil']}.jpg" in local_photo_files:
                    final_foto = f"./assets/photos/{dj['referencia_sil']}.jpg"
                elif f"{slug}.jpg" in local_photo_files:
                    final_foto = f"./assets/photos/{slug}.jpg"
                elif f"{slug_base}.jpg" in local_photo_files:
                    final_foto = f"./assets/photos/{slug_base}.jpg"
                elif foto.startswith("http://") or foto.startswith("https://"):
                    final_foto = foto.replace("http://sil.gobernacion.gob.mx", "https://sil.gobernacion.gob.mx")
            elif f"{slug}.jpg" in local_photo_files:
                final_foto = f"./assets/photos/{slug}.jpg"
            elif f"{slug_base}.jpg" in local_photo_files:
                final_foto = f"./assets/photos/{slug_base}.jpg"
            elif dj.get("referencia_sil") and f"{dj['referencia_sil']}.jpg" in local_photo_files:
                final_foto = f"./assets/photos/{dj['referencia_sil']}.jpg"

            c_lower = (cargo or "").lower()
            if "senador" in c_lower:
                categoria = "senador"
            elif "diputado(a) federal" in c_lower or "diputados" in (camara or "").lower():
                categoria = "diputado_federal"
            elif "gobernador" in c_lower or "jefe de gobierno" in c_lower or "regente" in c_lower:
                categoria = "gobernador"
            elif "president" in c_lower and "municipal" not in c_lower:
                categoria = "presidente"
            elif "municipal" in c_lower or "alcalde" in c_lower or "alcaldesa" in c_lower:
                categoria = "alcalde"
            elif "local" in c_lower:
                categoria = "diputado_local"
            else:
                categoria = "otros"

            items.append({
                "s": slug,
                "n": nombre,
                "p": partido or "Ind.",
                "c": color or "#4B5563",
                "r": cargo or "Servidor Público",
                "e": entidad or "México",
                "k": categoria,
                "a": es_activo or 0,
                "f": final_foto or "",
                "u": fuente or "https://www.gob.mx"
            })

        conn.close()

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, separators=(",", ":"))

        size_mb = output_path.stat().st_size / (1024 * 1024)
        print(f"✅ Catálogo generado con éxito: {len(items):,} registros ({size_mb:.2f} MB)")
    else:
        if output_path.exists():
            print(f"ℹ️ Base de datos no encontrada en CI; usando catálogo existente en {output_path}")
        else:
            print("⚠️ Advertencia: No se encontró storage/tlatoa.db ni pages/data/search_index.json")

    # 4. Crear 404.html estático para redirección SPA elegante
    create_404()

def create_404():
    p404 = PAGES_DIR / "404.html"
    content = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Página no encontrada — Proyecto Tlatoa</title>
    <link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #F4F5F8;
            color: #1A1A1E;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            text-align: center;
            padding: 20px;
        }
        .box {
            background: #FFFFFF;
            padding: 40px 32px;
            border-radius: 16px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.06);
            max-width: 440px;
        }
        .btn {
            display: inline-block;
            margin-top: 20px;
            padding: 10px 24px;
            background: #2563EB;
            color: #FFF;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="box">
        <div style="font-size:3.5rem;margin-bottom:8px;">🦉</div>
        <h2 style="margin:0 0 8px;">Página no encontrada</h2>
        <p style="color:#6B7280;font-size:0.95rem;margin:0 0 16px;">
            La ruta solicitada no existe o fue movida.
        </p>
        <a href="./" class="btn">Volver al Observatorio</a>
    </div>
    <script>
        // Si el usuario intentó acceder a un subpath, redirigir al index con hash
        const path = window.location.pathname.split('/').pop();
        if (path && path !== '404' && path !== '404.html') {
            window.location.replace('./#q=' + encodeURIComponent(path));
        }
    </script>
</body>
</html>
"""
    with open(p404, "w", encoding="utf-8") as f:
        f.write(content)
    print("  [+] Generado pages/404.html")

if __name__ == "__main__":
    build()

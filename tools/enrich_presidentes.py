"""
Proyecto Tlatoa — Generador y Enriquecedor de Datos de Presidentes de México
Extrae resúmenes biográficos y consolida logros, polémicas, línea de tiempo completa,
trayectoria de partidos ('chapulineo') y post-presidencia, con semáforo de evidencias.
"""

import json
import sys
import urllib.request
import urllib.parse
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from tools.seed_presidentes_actuales import PRESIDENTES_ACTUALES
from tools.seed_presidentes_siglo21 import PRESIDENTES_SIGLO21
from tools.seed_presidentes_siglo20 import PRESIDENTES_SIGLO20

OUTPUT_FILE = BASE_DIR / "storage" / "data" / "json" / "ejecutivo" / "presidentes_detalle.json"

PRESIDENTES_SEED = PRESIDENTES_ACTUALES + PRESIDENTES_SIGLO21 + PRESIDENTES_SIGLO20


def obtener_extracto_wikipedia(title: str) -> str:
    """Consulta la API de Wikipedia en español para obtener el extracto introductorio."""
    try:
        url = (
            f"https://es.wikipedia.org/w/api.php?action=query&format=json&prop=extracts"
            f"&exintro=1&explaintext=1&titles={urllib.parse.quote(title)}"
        )
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "ProyectoTlatoaCivicBot/1.0 (observatorio civico; https://tlatoa.org)"}
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            pages = data.get("query", {}).get("pages", {})
            for _, page in pages.items():
                extract = page.get("extract", "")
                if extract:
                    return extract.strip()
    except Exception as e:
        print(f"Aviso: No se pudo obtener extracto para {title}: {e}")
    return ""


def main():
    print("Iniciando enriquecimiento de datos de Presidentes de México...")
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    enriched_data = []
    for pres in PRESIDENTES_SEED:
        slug = pres.get("slug", "")
        wiki_title = pres.get("wiki_title", "")
        pres["foto_url"] = f"/assets/img/presidentes/{slug}.jpg"
        pres["fuente_wikipedia_url"] = f"https://es.wikipedia.org/wiki/{urllib.parse.quote(wiki_title)}"

        # Si ya cuenta con resumen_corto, preservarlo para máxima concisión
        if not pres.get("wiki_extract"):
            extract = obtener_extracto_wikipedia(wiki_title)
            pres["wiki_extract"] = extract if extract else pres.get("resumen_cargo", "")

        enriched_data.append(pres)

    payload = {
        "titulo": "Colección Histórica y Dossier de Presidentes de México (1988–2030)",
        "fuentes_primarias": [
            "Diario Oficial de la Federación (dof.gob.mx)",
            "Presidencia de la República (gob.mx/presidencia)",
            "Instituto Nacional Electoral (ine.mx)",
            "Wikipedia en Español (es.wikipedia.org)",
            "Hemerotecas y Medios de Comunicación Consolidados"
        ],
        "semaforo_definicion": {
            "verde": "Información 100% oficial verificable en el DOF, Gob.mx y fuentes primarias.",
            "amarillo": "Citación a medios periodísticos independientes con respaldo sólido donde varios medios coinciden.",
            "rojo": "Afirmación sin respaldo probatorio documental o señalamiento no acreditado formalmente."
        },
        "total": len(enriched_data),
        "presidentes": enriched_data
    }

    OUTPUT_FILE.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"¡Éxito! Archivo guardado con {len(enriched_data)} presidentes en:\n{OUTPUT_FILE}")


if __name__ == "__main__":
    main()

"""
Proyecto Tlatoa — Servicio de Datos Históricos de Presidentes de México
Carga y consulta dossiers presidenciales, líneas de tiempo, chapulineo y semáforo de evidencias.
"""

import json
from pathlib import Path
from typing import Any, Optional

BASE_DIR = Path(__file__).resolve().parent.parent.parent
PRESIDENTES_FILE = BASE_DIR / "storage" / "data" / "json" / "ejecutivo" / "presidentes_detalle.json"

_CACHE_DATA: Optional[dict[str, Any]] = None
_CACHE_MTIME: float = 0.0


def _load_data() -> dict[str, Any]:
    global _CACHE_DATA, _CACHE_MTIME
    if not PRESIDENTES_FILE.exists():
        return {"total": 0, "presidentes": []}

    try:
        mtime = PRESIDENTES_FILE.stat().st_mtime
        if _CACHE_DATA is not None and mtime <= _CACHE_MTIME:
            return _CACHE_DATA
        content = PRESIDENTES_FILE.read_text(encoding="utf-8")
        _CACHE_DATA = json.loads(content)
        _CACHE_MTIME = mtime
        return _CACHE_DATA or {"total": 0, "presidentes": []}
    except Exception as e:
        print(f"Error cargando presidentes_detalle.json: {e}")
        return _CACHE_DATA or {"total": 0, "presidentes": []}


def get_presidentes_list() -> list[dict[str, Any]]:
    """Retorna el catálogo completo de presidentes ordenados cronológicamente."""
    data = _load_data()
    return data.get("presidentes", [])


def get_presidente_by_slug(slug: str) -> Optional[dict[str, Any]]:
    """Busca y retorna un presidente por su slug único o coincidencia amigable."""
    target_slug = (slug or "").lower().strip()
    presidentes = get_presidentes_list()
    for pres in presidentes:
        if pres.get("slug", "").lower() == target_slug:
            return pres
    for pres in presidentes:
        p_slug = pres.get("slug", "").lower()
        if target_slug in p_slug or p_slug.startswith(target_slug):
            return pres
    return None


def get_semaforo_definiciones() -> dict[str, str]:
    """Retorna las descripciones oficiales del semáforo de verificación de evidencias."""
    data = _load_data()
    return data.get("semaforo_definicion", {
        "verde": "Información 100% oficial verificable en el DOF, Gob.mx y fuentes primarias.",
        "amarillo": "Citación periodística e independiente con múltiples fuentes coincidentes (neutralidad informativa).",
        "rojo": "Afirmación sin respaldo probatorio documental o señalamiento no acreditado judicialmente."
    })

"""
Proyecto Tlatoa — Router de Presidentes de México (Poder Ejecutivo Federal)
Rutas web y API para la consulta de dossiers presidenciales, líneas de tiempo,
diagramas de militancia ('chapulineo') y semáforo de verificación de evidencias.
"""

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from jinja2 import select_autoescape
from jinja2.sandbox import SandboxedEnvironment
import jinja2

from app.core.config import settings
from app.services.presidentes_service import (
    get_presidentes_list,
    get_presidente_by_slug,
    get_semaforo_definiciones,
)

router = APIRouter(tags=["Presidentes de México"])

templates = Jinja2Templates(directory=str(settings.TEMPLATES_DIR))
templates.env = SandboxedEnvironment(
    loader=jinja2.FileSystemLoader(str(settings.TEMPLATES_DIR)),
    autoescape=select_autoescape(["html", "xml", "htm"]),
)
templates.env.globals["app_name"] = settings.APP_NAME
templates.env.globals["app_short_name"] = settings.APP_SHORT_NAME
templates.env.globals["app_tagline"] = settings.APP_TAGLINE


@router.get("/presidentes", response_class=HTMLResponse)
async def presidentes_index(request: Request):
    """Listado cronológico de Presidentes de México (1988–2030)."""
    presidentes = get_presidentes_list()
    semaforo = get_semaforo_definiciones()

    return templates.TemplateResponse(
        request=request,
        name="presidentes.html",
        context={
            "presidentes": presidentes,
            "semaforo": semaforo,
            "seo": {
                "title": f"Presidentes de México (1988–2030) — {settings.APP_NAME}",
                "description": "Dossier cívico e histórico de Presidentes de México: logros, polémicas, línea de tiempo de carrera, actividades actuales y diagramas de militancia política.",
                "canonical": "/presidentes",
            },
        },
    )


@router.get("/presidentes/{slug}", response_class=HTMLResponse)
async def presidente_detalle_view(request: Request, slug: str):
    """Perfil detallado, logros, polémicas, línea de tiempo y chapulineo de un presidente."""
    presidente = get_presidente_by_slug(slug)
    if not presidente:
        raise HTTPException(status_code=404, detail="Presidente no encontrado")

    semaforo = get_semaforo_definiciones()

    return templates.TemplateResponse(
        request=request,
        name="presidente_detalle.html",
        context={
            "pres": presidente,
            "semaforo": semaforo,
            "seo": {
                "title": f"{presidente['nombre_completo']} ({presidente['periodo']}) — {settings.APP_NAME}",
                "description": f"Dossier de {presidente['nombre_completo']}: logros de gobierno, polémicas verificadas, línea de tiempo completa y trayectoria de partidos.",
                "canonical": f"/presidentes/{presidente['slug']}",
            },
        },
    )


@router.get("/api/presidentes", response_class=JSONResponse)
async def api_presidentes_list():
    """API JSON: Lista de presidentes con métricas y enlaces."""
    return {
        "ok": True,
        "total": len(get_presidentes_list()),
        "presidentes": get_presidentes_list(),
    }


@router.get("/api/presidentes/{slug}", response_class=JSONResponse)
async def api_presidente_detalle(slug: str):
    """API JSON: Ficha técnica completa de un presidente específico."""
    presidente = get_presidente_by_slug(slug)
    if not presidente:
        raise HTTPException(status_code=404, detail="Presidente no encontrado")
    return {"ok": True, "presidente": presidente}

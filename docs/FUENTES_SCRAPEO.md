# Fuentes de scraping — Catálogo integrado (2026-11-06)

Registro vivo de las fuentes de la suite. La fuente de verdad ejecutable es
[`config/sources.php`](../config/sources.php); este documento resume el
catálogo y las decisiones. Solo se registran URLs verificadas con petición
real; ninguna URL de este documento fue inventada.

## Fuente fundamental: anticorrupción

**Elegida: Plataforma Digital Nacional (PDN), Sistema 3 — servidores
públicos y particulares sancionados**, a través de su API pública JSON
(`api.plataformadigitalnacional.org/s3-wrapper`). Servicio en la suite:
`src/Services/AnticorrupcionScraperService.php` (`php tools/gateway.php
scrape anticorrupcion`).

Por qué esta y no las otras candidatas:

| Candidata | Veredicto 2026-11-06 | Razón |
|---|---|---|
| PDN Sistema 3 (API pública) | **FUNDAMENTAL** | Datos estructurados (nombre, cargo, ente público, entidad, falta, resolución con fechas y autoridad). API sin autenticación, 23 proveedores, HTTP 200 verificado. Es la única fuente anticorrupción con registros por persona y cargo, listos para contrastar contra Tlatoa. |
| SNA portal (sna.org.mx) | Complemento institucional | HTTP 200, pero es un portal informativo; los datos estructurados viven en la PDN. Su robots.txt prohíbe crawlers de IA (GPTBot, ClaudeBot, CCBot, ByteSpider, Bingbot, Meta-ExternalAgent); no hay regla para `User-agent: *` ni para PulsoCivicoBot. |
| Secretaría de Anticorrupción y Buen Gobierno (gob.mx/buengobierno) | Complemento de verificación | HTTP 200. Trámites y constancias de no inhabilitación; no publica rosters ni sanciones por persona. La ruta `gob.mx/anticorrupcion` NO existe (HTTP 400). |
| Plataforma Nacional de Transparencia | Verificación caso por caso | HTTP 200, pero es una aplicación de solicitudes, no un roster. Acervo histórico en revisión tras la extinción del INAI (2025-03-20); no asumir integridad. |
| Transparencia para el Pueblo (transparencia.gob.mx) | Bloqueada en esta sesión | HTTP 000 (tiempo agotado) desde la VM el 2026-11-06. Reintentar manualmente; no evadir. |
| PDN Sistema 1 (declaraciones patrimoniales) | NO integrada a propósito | Contiene datos personales (montos, bienes, familiares). El scraper anticorrupción solo extrae lo público del cargo; el Sistema 1 no se consulta. |

Regla de privacidad del servicio anticorrupción: solo nombre, cargo,
ente público, entidad federativa (clave INEGI), falta cometida, expediente
y resolución (título, fechas, autoridad). El DTO descarta por diseño RFC,
CURP, domicilios, teléfonos, correos personales y montos patrimoniales,
aunque la API los devolviera. Salida SIEMPRE a `storage/data/contraste/`,
nunca a canónico: las sanciones verifican y enriquecen personas que ya
existen en Tlatoa, no crean rosters.

## Niveles y flujos

- **Nivel A (oficial, .gob.mx o API pública oficial):** puede alimentar
  canónico (flujo `canonico`) o verificación de contraste (flujo
  `contraste`).
- **Nivel B (medio no oficial verificable):** SOLO contraste, etiquetado
  `[Fuente Actualizada No Oficial]` o `[Fuente Desactualizada]`.
- **Nivel C (pista informativa no confirmada):** SOLO flujo `pista`:
  registra la pista y su URL para verificación posterior; nunca escribe
  un dato como hecho.

## Fuentes integradas (resumen)

| ID | Nivel | Flujo | Estado 2026-11-06 |
|---|---|---|---|
| pdn-s3 (fundamental) | A | contraste | activa (API 200, 23 proveedores) |
| sna | A | contraste | activa |
| buengobierno | A | contraste | activa |
| pnt | A | contraste | degradada |
| transparencia-pueblo | A | contraste | bloqueada (HTTP 000) |
| gaceta | A | canonico | activa (roster LVIII/LIX verificado) |
| dof | A | canonico | activa |
| sitl | A | canonico | parcial (LX–LXV 200; LVII/LVIII/LIX/LXVI vacío) |
| sil | A | canonico | parcial (perfil `pp_PerfilLegislador.php` VETADO por robots.txt) |
| senado | A | canonico | bloqueada (403 Incapsula) |
| ine | A | canonico | parcial (votos y acuerdos, no roster con nombres) |
| inafed | A | canonico | activa (nombre y periodo, sin partido) |
| presidencia | A | canonico | activa |
| tepjf | A | canonico | activa (verificación de casos) |
| congresos-locales | A | canonico | parcial (32 servicios en la suite; SLP vetado) |
| expansion | B | contraste | activa (200) |
| milenio | B | contraste | bloqueada (403) |
| wikipedia-anexos | C | pista | activa (solo respaldo; partido a menudo vacío) |

## Qué NO se usa

- **SIL `pp_PerfilLegislador.php`:** vetado por robots.txt. Nunca se abre.
- **Congreso de San Luis Potosí:** robots.txt `Disallow: /`. No se scrapea.
- **Senado (`senado.gob.mx`):** 403 Incapsula. Reintentar manualmente; no evadir.
- **Milenio:** 403 en robots.txt y en /politica. Bloquea bots.
- **Declaraciones patrimoniales (PDN Sistema 1):** datos personales; fuera del scraper.
- **Medios sin verificar:** Animal Político, BBC News Mundo, Reuters,
  Excélsior, El Universal, AP y EFE fueron evaluados en rondas anteriores
  pero no probados en esta sesión; re-verificar HTTP y robots.txt antes de
  registrarlos en `config/sources.php`.

## Prueba de la suite (dry-run 2026-11-06)

`php tools/dry_run_fuentes.php` (sin PHP en esta VM se ejecutó la prueba
equivalente con curl/Python y la misma pausa de 1,250 ms; evidencia en
`storage/raw/html/dry_run_*_2026-11-06.*`, gitignored):

| Fuente | Nivel | Flujo | HTTP | Resultado |
|---|---|---|---|---|
| pdn-s3 (API providers) | A | contraste | 200 | 23 proveedores |
| gaceta (ALFABETICO.PDF LVIII) | A | canonico | 200 | 32,349 bytes |
| dof (Bando Solemne Fox 2000) | A | canonico | 200 | 51,855 bytes |
| expansion (Política) | B | contraste | 200 | 196,432 bytes |

Prueba adicional del Sistema 3: `faltas_administrativas_graves` del
proveedor SESEA_Morelos devolvió 2 registros con nombre, cargo, ente
público, entidad, falta y resolución (SHA-256 en la evidencia).

## Cómo añadir una fuente

1. Verificar la URL con petición real y leer su robots.txt.
2. Añadir la entrada en `config/sources.php` con nivel, flujo, estado y notas.
3. Si es Nivel A canónico, crear o reutilizar el servicio en `src/Services/`
   y registrarlo en `tools/core/ScraperRouter.php`.
4. Probar con `php tools/dry_run_fuentes.php --fuentes=<id>`.
5. Documentar aquí el estado verificado, sin inventar URLs.

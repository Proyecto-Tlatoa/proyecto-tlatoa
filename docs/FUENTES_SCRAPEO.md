# Fuentes de scraping — Catálogo integrado (2026-11-06)

Registro vivo de las fuentes de la suite. La fuente de verdad ejecutable es
[`config/sources.php`](../config/sources.php); este documento resume el
catálogo y las decisiones. Solo se registran URLs verificadas con petición
real; ninguna URL de este documento fue inventada.

**Total del registro: 73 fuentes** — 18 originales en `config/sources.php`
+ 32 portales estatales en `config/sources_estatales.php` + 23 medios en
`config/sources_medios.php` (fusionados con `array_merge`). Niveles:
A 47 (15 originales + 32 estatales), B contraste 16, C pista 10.
Contrastado el 2026-11-06 contra el catálogo de 66 fuentes
(`~/workspace/tlatoa/fuentes-scrapeo-catalogo-2026-11-06.md`).

## Contraste de las 18 fuentes originales contra el catálogo (2026-11-06)

| ID | Veredicto del contraste |
|---|---|
| pdn-s3 (fundamental) | Sin entrada en el catálogo (no es fuente de rosters/medios); se mantiene tal cual. |
| sna | Sin entrada en el catálogo; se mantiene como complemento institucional. |
| buengobierno | Sin entrada en el catálogo; se mantiene como complemento de verificación. |
| pnt | Coincide: PNT degradada, sin rosters; verificación caso por caso. |
| transparencia-pueblo | Coincide en espíritu: el catálogo confirma al INAI extinguido y a la PNT degradada; la entrada sigue bloqueada (HTTP 000). |
| gaceta | Coincide, con corrección: robots.txt da 403 por WAF (no legible). Home y gp_hoy.html dan 200. |
| dof | **Corregida**: robots.txt prohíbe `nota_detalle.php?` y `nota_to_doc.php?`; la ruta pasa a índices por fecha (`index_111.php`). Buscador 000. |
| sitl | **Corregida**: NO está totalmente bloqueado. Las rutas .php directas dan 200 (listado LXVI 229 KB, 500 enlaces); solo el índice da 403. Se documentan las rutas y el parámetro `pert` (verificar qué `pert` cubre 2026). |
| sil | Coincide, con precisión: robots.txt prohíbe solo 3 rutas (perfil y 2 clases); el resto está permitido. https muerta (000). |
| senado | Coincide: 403 Incapsula total, incluido comunicacion.senado.gob.mx. |
| ine | Coincide, con precisión: robots.txt permisivo (200) con sitemap; computos.ine.mx muerto (000). |
| inafed | **Corregida**: dominio MUERTO, sin registro A en DNS público. Estado pasa de activa a bloqueada; no usar para alcaldes históricos. |
| presidencia | Coincide, con precisión: no hay página de gabinete ni RSS. |
| tepjf | **Corregida**: home con muro Radware; la vía es sicje.te.gob.mx (IUS/SISREL, 200) y PDF de sentencias directos. |
| congresos-locales | **Corregida**: SLP NO es `Disallow:/` (es Crawl-delay: 10; el bloqueo real es Sucuri con reto JS, requiere navegador). Campeche `Disallow:/` para `*` (solo consulta manual). Veracruz caído. |
| expansion | Coincide: RSS válido (`/rss`), robots `Allow: /`. |
| milenio | Coincide: 403 hoy (bloqueo no necesariamente permanente). |
| wikipedia-anexos | Coincide: solo pista; columna de partido a menudo vacía. |

## Fuentes añadidas del catálogo (2026-11-06)

| Grupo | Añadidas | Estado |
|---|---|---|
| Portales estatales (Nivel A, canónico) | 32 (los 32 congresos locales como entradas individuales) | activa 12, parcial 17, bloqueada 3 (Campeche robots, SLP Sucuri, Veracruz caído) |
| Medios Nivel B (contraste, RSS/sitemap) | 14 (El Financiero, Excélsior, Infobae, SinEmbargo, El Sol, N+, EFE, France 24, BBC Mundo RSS-solamente, Aristegui, Animal Político, El Universal solo-cita-manual, El País, DW) | activa 9, parcial 4, bloqueada 1 (El Universal robots) |
| Medios Nivel C (pista) | 9 (Reuters, AP, La Jornada, Proceso, La Silla Rota, AFP, Reforma, Latinus, Eje Central) | activa 1, bloqueada 8 |

Detalle por fuente en `config/sources_estatales.php` y `config/sources_medios.php`.
No añadidas a propósito: Senado (403 total), INAFED (muerto), INAI (extinguido),
SIL `pp_PerfilLegislador.php` (vetado), DOF `nota_detalle.php` (vetado).

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
| inafed | A | canonico | **bloqueada (CORRECCIÓN catálogo: dominio muerto, sin registro A en DNS)** |
| tepjf | A | canonico | parcial (home Radware; vía sicje.te.gob.mx IUS/SISREL) |
| congresos-locales | A | canonico | parcial (32 servicios en la suite; SLP requiere navegador, Campeche solo manual) |
| + 32 estatales individuales | A | canonico | ver `config/sources_estatales.php` (activa 12, parcial 17, bloqueada 3) |
| expansion | B | contraste | activa (200, RSS válido) |
| milenio | B | contraste | bloqueada (403) |
| + 14 medios B | B | contraste | ver `config/sources_medios.php` (activa 9, parcial 4, bloqueada 1) |
| wikipedia-anexos | C | pista | activa (solo respaldo; partido a menudo vacío) |
| + 9 medios C | C | pista | ver `config/sources_medios.php` (activa 1, bloqueada 8) |

## Qué NO se usa

- **SIL `pp_PerfilLegislador.php`:** vetado por robots.txt. Nunca se abre.
- **Congreso de San Luis Potosí (por curl):** su robots.txt NO es `Disallow:/`
  (es `Crawl-delay: 10`); el bloqueo real es Sucuri CloudProxy con reto JS.
  Requiere navegador real; no se evade.
- **Congreso de Campeche (scraping):** robots `Disallow:/` para `*`.
  Solo consulta manual y cita.
- **DOF `nota_detalle.php?` y `nota_to_doc.php?`:** `Disallow` en
  robots.txt. Usar índices por fecha (`index_111.php`).
- **INAFED (dominio muerto):** sin registro A en DNS público; la
  Enciclopedia es inaccesible. No hay fuente federal única de alcaldes
  históricos; rutas: cómputos OPLE/IEEM y sitios municipales uno por uno.
- **Senado (`senado.gob.mx`):** 403 Incapsula. Reintentar manualmente; no evadir.
- **Milenio:** 403 en robots.txt y en /politica. Bloquea bots.
- **Declaraciones patrimoniales (PDN Sistema 1):** datos personales; fuera del scraper.
- **Medios ya verificados en el catálogo 2026-11-06:** Animal Político
  (B con reserva, RSS no verificado), BBC News Mundo (B vía RSS solamente,
  sin scraping), Reuters y AP (C en la práctica por 401/Cloudflare),
  Excélsior, El Universal (solo cita manual), EFE y El Financiero (RSS
  válido) ya están registrados en `config/sources_medios.php`.
- **INAI:** extinguido 2025-03-20; la PNT sigue degradada, sin rosters.

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

## Prueba de la suite — contraste contra el catálogo (dry-run 2026-11-06)

Equivalente curl/Python con pausa de 1,250 ms (sin PHP en la VM; el lint
`php -l` queda pendiente en máquina con PHP 8.1+). Evidencia en
`storage/raw/html/dry_run_catalogo_*_2026-11-06.*`, gitignored, con SHA-256.
Sin escribir canónicos; la pista C solo se registró, sin extraer dato.

| Fuente | Nivel | Flujo | HTTP | Resultado |
|---|---|---|---|---|
| qroo (Congreso Quintana Roo) | A | canonico | 200 | 64,307 bytes (exacto al catálogo) |
| chihuahua (diputadosAnteriores.php) | A | canonico | 200 | 66,916 bytes (exacto al catálogo) |
| el-financiero (RSS) | B | contraste | 200 | 794,005 bytes |
| excelsior (RSS) | B | contraste | 200 | 346,193 bytes |
| eje-central | C | pista | 200 | 281,463 bytes; pista registrada, sin extraer dato |
| sitl (listado LXVI, ruta directa) | A | canonico | 200 | 229,288 bytes; **500 enlaces `curricula.php?dipt=`** (confirma la corrección del catálogo) |

6/6 con HTTP 200.

## Cómo añadir una fuente

1. Verificar la URL con petición real y leer su robots.txt.
2. Añadir la entrada en `config/sources.php` con nivel, flujo, estado y notas.
3. Si es Nivel A canónico, crear o reutilizar el servicio en `src/Services/`
   y registrarlo en `tools/core/ScraperRouter.php`.
4. Probar con `php tools/dry_run_fuentes.php --fuentes=<id>`.
5. Documentar aquí el estado verificado, sin inventar URLs.

# Esquema de Datos (contrato estándar)

Todo scraper debe producir JSON con estos campos (`snake_case`, UTF-8, fechas `YYYY-MM-DD`).
La fuente de verdad del formato son las clases en `src/DTO/`.

## Reglas generales
- **Obligatorio en todo registro o dataset**: `fuente_url` y `fecha_extraccion` (dentro de `metadata`).
- Valores desconocidos: `null` (nunca cadenas inventadas como "N/D").
- Nombres de partido: siglas oficiales (`MORENA`, `PAN`, `PRI`, `PVEM`, `PT`, `MC`, `PRD`…). Si el partido no está verificado en la fuente, se usa `Sin Partido`, nunca una sigla supuesta.
- Entidades: nombre oficial INEGI (`Ciudad de México`, `Estado de México`, …).

## Frescura y etiqueta histórica
- **Vigente**: dato con `fecha_extraccion` o `fecha_actualizacion` no mayor a 1 mes (corte 2026-10-06 para el re-scrape de 2026-11-06), con fuente oficial `.gob.mx`.
- **[Información Historica]**: legislaturas cerradas de los 34 congresos. No se borra ningún registro histórico, no se cambian sus fechas, `fuente_url` ni partidos, y no se marca como desactualizado. La etiqueta vive en el índice `storage/data/historico.json` (`etiqueta_frescura: "[Información Historica]"` por archivo, con su legislatura), no como campo por registro: reescribir los 286 archivos históricos solo para añadir un campo no cambia nada en el builder ni en la web (que solo leen `metadata.entidad`) y arriesga corromperlos. Los archivos vigentes (legislatura máxima por alias) no están en ese índice.
- **Contraste**: lo vigente que la fuente oficial no entrega o entrega con más de 1 mes va solo a `storage/data/contraste/` con `[Fuente Actualizada No Oficial]`, `[Fuente Desactualizada]` o `no_verificado`, nunca sobrescribiendo un canónico con noticias.

## Legislador (`LegisladorDTO`)
| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `referencia_sil` | string | ✅ | ID en la fuente (SIL u otra). Identificador estable |
| `nombre_completo` | string | ✅ | |
| `camara` | string | ✅ | `Diputados` / `Senado` / congreso local |
| `legislatura` | int | ✅ | Ej. `66` (LXVI) |
| `partido` | string | ✅ | Siglas |
| `principio_eleccion` | string | ✅ | Mayoría relativa / Representación proporcional / Primera minoría |
| `entidad` | string | ✅ | |
| `distrito` | string\|null | | |
| `tipo_cargo` | string | | `Propietario` / `Suplente` |
| `suplente_nombre` | string\|null | | |
| `fecha_toma_protesta` | date\|null | | |
| `fecha_nacimiento` | date\|null | | Solo si es pública en la fuente oficial |
| `correo_institucional` | string\|null | | Solo institucional |
| `telefono` | string\|null | | Solo de oficina institucional |
| `ubicacion_oficina` | string\|null | | Oficina en recinto legislativo |
| `ultimo_grado_estudios` | string\|null | | |
| `preparacion_academica` | string\|null | | |
| `experiencia_legislativa_resumen` | string\|null | | |
| `foto_oficial_url` | string\|null | | URL original |
| `foto_local_path` | string\|null | | Ruta en `storage/raw/photos/` |
| `comisiones` | array | | `[{nombre, cargo, ...}]` |
| `trayectoria_politica` | array | | Base del historial de partidos ("chapulineo") |
| `trayectoria_legislativa` | array | | |
| `trayectoria_administrativa` | array | | |
| `escolaridad_detalle` | array | | |
| `licencias` | array | | |
| `iniciativas` | array | | |
| `puntos_acuerdo` | array | | |
| `redes_sociales` | array | | Solo cuentas públicas oficiales |
| `metadata` | object | ✅ | `{fuente_url, fecha_extraccion, ...}` |

## Votación (`VotacionDTO`)
| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `id_votacion_origen` | int | ✅ | ID en el portal de origen |
| `camara` | string | ✅ | |
| `legislatura` | int | ✅ | |
| `fecha` | date | ✅ | |
| `titulo` | string | ✅ | Título oficial del asunto votado |
| `tema_clave` | string\|null | | Categoría temática |
| `resumen_bancadas` | array | | Votos por partido |
| `totales` | object | ✅ | `{favor, contra, abstencion, ausentes, total}` |
| `votos_individuales` | array | | `[{referencia, nombre, partido, voto}]` |

## Sesión de Pleno (`SesionPlenoDTO`)
Ver `src/DTO/SesionPlenoDTO.php` (asistencias por sesión).

## Alcalde y Mandato Municipal (`alcaldes` / `municipios/{cvegeo}.json`)
| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `cvegeo` | string | ✅ | Clave geoestadística única INEGI (5 dígitos: ej. `01001`) |
| `entidad` | string | ✅ | Nombre oficial de la entidad federativa |
| `cve_ent` | int | ✅ | Clave de entidad (1 a 32) |
| `municipio` | string | ✅ | Nombre oficial del municipio o alcaldía |
| `cve_mun` | int | ✅ | Clave de municipio según catálogo INEGI |
| `nombre_completo`| string | ✅ | Nombre completo de la presidenta o presidente municipal |
| `periodo` | string | ✅ | Rango de gestión (ej. `2024-2027`) |
| `ano_inicio` | int | ✅ | Año de inicio de mandato |
| `ano_fin` | int | ✅ | Año de término de mandato |
| `partido` | string | ✅ | Siglas o coalición partidista |
| `es_vigente` | bool | ✅ | Indica si se encuentra en funciones |
| `genero` | string | | `M`, `F` |
| `margen_victoria`| float\|null| | Diferencia porcentual respecto al segundo lugar |
| `segundo_lugar` | string\|null| | Candidatura que quedó en segunda posición |
| `partido_segundo_lugar` | string\|null| | Siglas del partido en segunda posición |
| `metadata` | object | ✅ | `{fuente_url, fecha_extraccion}` |

## Mandatario Estatal / Gobernador (`ejecutivo/*.json`)
| Campo | Tipo | Req. | Descripción |
|---|---|---|---|
| `slug` | string | ✅ | Identificador único URL (ej. `teresa-jimenez-esquivel`) |
| `entidad` | string | ✅ | Estado representado |
| `cve_ent` | int | ✅ | Clave de entidad INEGI |
| `nombre_completo`| string | ✅ | Nombre oficial del mandatario |
| `tipo_mandato` | string | ✅ | `Constitucional`, `Sustituto`, `Interino`, `Regente` |
| `periodo_inicio` | date/int | ✅ | Fecha o año de inicio de funciones |
| `periodo_fin` | date/int | ✅ | Fecha o año de conclusión |
| `partido` | string | ✅ | Siglas o filiación política |
| `es_vigente` | bool | ✅ | Si encabeza el ejecutivo actualmente |
| `metadata` | object | ✅ | `{fuente_url, fecha_extraccion}` |

---

> Cambiar un DTO o esquema existente requiere verificación de compatibilidad con los datasets JSON ya consolidados.

---

## 🗺️ Navegación y Conexiones (Obsidian Graph)

* [[README|Índice Principal de Proyecto Tlatoa]]
* [[DICCIONARIO_DE_DATOS|Diccionario de Datos y Entidades]]
* [[FUENTES|Catálogo de Fuentes Primarias Gubernamentales]]
* [[MANUAL_DE_DATOS_Y_EVIDENCIA|Manual de Datos y Evidencia]]
* [[COMO_CREAR_UN_SCRAPER|Guía para Crear un Scraper]]
* [[ARQUITECTURA|Arquitectura del Sistema y Grafo de Conocimiento]]
* [[PLAN_RESILIENCIA_Y_PRESERVACION|Protocolo de Resiliencia y Preservación Digital]]


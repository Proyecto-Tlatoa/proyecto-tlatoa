<?php
declare(strict_types=1);

/**
 * Registro central de fuentes de scraping — Proyecto Tlatoa / Pulso Cívico.
 *
 * Cada fuente lleva su nivel de confiabilidad y su flujo de salida:
 *   - Nivel A: fuente oficial (.gob.mx o API pública oficial). Puede alimentar
 *     canónico (flujo "canonico") o verificación de contraste (flujo "contraste").
 *   - Nivel B: medio no oficial verificable. SOLO flujo "contraste", etiquetado
 *     [Fuente Actualizada No Oficial] o [Fuente Desactualizada]. Nunca canónico.
 *   - Nivel C: pista informativa no confirmada. SOLO flujo "pista": registra la
 *     pista y su URL para verificación posterior; nunca escribe un dato como hecho.
 *
 * Estado verificado el 2026-11-06 con petición real (HTTP y robots.txt).
 * Contrastado el 2026-11-06 contra el catálogo de 66 fuentes
 * (~/workspace/tlatoa/fuentes-scrapeo-catalogo-2026-11-06.md): las
 * correcciones que el catálogo exige llevan la marca "CORRECCIÓN
 * catálogo 2026-11-06" en sus notas. Las fuentes estatales (32) y de
 * medios (23) viven en config/sources_estatales.php y
 * config/sources_medios.php y se fusionan al final con array_merge;
 * este archivo conserva las 18 fuentes originales.
 *
 * Solo se registran URLs verificadas. Ninguna URL de este archivo fue inventada.
 */
$fuentes = [
    // ------------------------------------------------------------------
    // FUENTE FUNDAMENTAL — Anticorrupción (Nivel A, flujo contraste)
    // ------------------------------------------------------------------
    [
        'id' => 'pdn-s3',
        'nombre' => 'Plataforma Digital Nacional — Sistema 3 (servidores públicos y particulares sancionados)',
        'institucion' => 'Sistema Nacional Anticorrupción (SESNA)',
        'url' => 'https://api.plataformadigitalnacional.org/s3-wrapper/api/v1/providers',
        'url_portal' => 'https://www.plataformadigitalnacional.org/servidores',
        'nivel' => 'A',
        'flujo' => 'contraste',
        'fundamental' => true,
        'cargos' => ['todos los cargos públicos (verificación de sanciones e inhabilitaciones)'],
        'formato' => 'API pública JSON (sin autenticación)',
        'frecuencia_revision' => 'mensual',
        'estado' => 'activa',
        'robots_txt' => 'sin robots.txt (404); el portal es una SPA y los datos viven en la API pública',
        'notas' => 'Colecciones: faltas_administrativas_graves, faltas_administrativas_no_graves, '
            . 'faltas_graves_personas_fisicas, faltas_graves_personas_morales. '
            . '23 proveedores (SESEA estatales + IFT + Colima) verificados 2026-11-06. '
            . 'Solo campos públicos del cargo (nombre, cargo, ente público, entidad, falta, resolución). '
            . 'PROHIBIDO extraer RFC, CURP, domicilios, teléfonos o montos patrimoniales.',
    ],
    [
        'id' => 'sna',
        'nombre' => 'Sistema Nacional Anticorrupción (portal institucional)',
        'institucion' => 'Sistema Nacional Anticorrupción',
        'url' => 'https://www.sna.org.mx/',
        'nivel' => 'A',
        'flujo' => 'contraste',
        'fundamental' => false,
        'cargos' => ['todos (contexto institucional y seguimiento a sistemas estatales)'],
        'formato' => 'HTML',
        'frecuencia_revision' => 'mensual',
        'estado' => 'activa',
        'robots_txt' => '200: prohíbe ShapBot, Bingbot, Meta-ExternalAgent, GPTBot, ChatGPT-User, ClaudeBot, CCBot y ByteSpider; sin regla para User-agent: * ni para PulsoCivicoBot',
        'notas' => 'Portal institucional; los datos estructurados viven en la PDN (pdn-s3).',
    ],
    [
        'id' => 'buengobierno',
        'nombre' => 'Secretaría de Anticorrupción y Buen Gobierno',
        'institucion' => 'Secretaría de Anticorrupción y Buen Gobierno',
        'url' => 'https://www.gob.mx/buengobierno',
        'nivel' => 'A',
        'flujo' => 'contraste',
        'fundamental' => false,
        'cargos' => ['servidores públicos federales (constancias de no inhabilitación, trámites)'],
        'formato' => 'HTML (gob.mx)',
        'frecuencia_revision' => 'mensual',
        'estado' => 'activa',
        'robots_txt' => 'gob.mx/robots.txt 200: sin prohibiciones genéricas',
        'notas' => 'La ruta gob.mx/anticorrupcion NO existe (HTTP 400 verificado 2026-11-06); la URL oficial es gob.mx/buengobierno.',
    ],
    [
        'id' => 'pnt',
        'nombre' => 'Plataforma Nacional de Transparencia',
        'institucion' => 'Transparencia para el Pueblo (antes INAI, extinguido 2025-03-20)',
        'url' => 'https://www.plataformadetransparencia.org.mx/',
        'nivel' => 'A',
        'flujo' => 'contraste',
        'fundamental' => false,
        'cargos' => ['todos (solicitudes de información y obligaciones de transparencia)'],
        'formato' => 'HTML (aplicación web; requiere solicitud por caso)',
        'frecuencia_revision' => 'bajo demanda',
        'estado' => 'degradada',
        'robots_txt' => '200: señales de contenido, sin Disallow genérico',
        'notas' => 'No publica rosters de legisladores. Sirve para verificar un dato caso por caso '
            . 'mediante solicitudes. Acervo histórico en revisión tras la extinción del INAI; no asumir integridad.',
    ],
    [
        'id' => 'transparencia-pueblo',
        'nombre' => 'Transparencia para el Pueblo',
        'institucion' => 'Secretaría de Anticorrupción y Buen Gobierno',
        'url' => 'https://transparencia.gob.mx/',
        'nivel' => 'A',
        'flujo' => 'contraste',
        'fundamental' => false,
        'cargos' => ['todos (autoridad garante federal de acceso a la información)'],
        'formato' => 'HTML',
        'frecuencia_revision' => 'mensual',
        'estado' => 'bloqueada',
        'robots_txt' => 'sin respuesta (HTTP 000, tiempo agotado) desde esta VM el 2026-11-06',
        'notas' => 'Inalcanzable en la prueba del 2026-11-06. Reintentar manualmente; no evadir.',
    ],

    // ------------------------------------------------------------------
    // Nivel A — Oficiales, flujo canónico
    // ------------------------------------------------------------------
    [
        'id' => 'gaceta',
        'nombre' => 'Gaceta Parlamentaria de la Cámara de Diputados',
        'institucion' => 'Cámara de Diputados',
        'url' => 'https://gaceta.diputados.gob.mx/',
        'nivel' => 'A',
        'flujo' => 'canonico',
        'fundamental' => false,
        'cargos' => ['diputados federales (roster por grupo parlamentario, licencias, suplencias)'],
        'formato' => 'HTML y PDF con texto',
        'frecuencia_revision' => 'semanal',
        'estado' => 'activa',
        'robots_txt' => '403 en /robots.txt por WAF (no legible; sin regla verificable) — catálogo A4 2026-11-06',
        'notas' => 'Entregó los rosters oficiales de LVIII (Gaceta 579, 2000) y LIX (Gaceta 1454, 2004). '
            . 'Home y gp_hoy.html dan 200 sin captcha; edición diaria en periodo de sesiones.',
    ],
    [
        'id' => 'dof',
        'nombre' => 'Diario Oficial de la Federación',
        'institucion' => 'Secretaría de Gobernación',
        'url' => 'https://dof.gob.mx/index_111.php?year=2026&month=11&day=06',
        'nivel' => 'A',
        'flujo' => 'canonico',
        'fundamental' => false,
        'cargos' => ['presidencia (Bandos Solemnes), asignaciones IFE/INE, decretos'],
        'formato' => 'HTML y PDF (índices por fecha)',
        'frecuencia_revision' => 'semanal',
        'estado' => 'activa',
        'robots_txt' => 'CORRECCIÓN catálogo 2026-11-06: robots.txt 200 con Disallow: /nota_detalle.php? y /nota_to_doc.php? — NUNCA usar nota_detalle.php; la ruta respetuosa son los índices por fecha (index_111.php)',
        'notas' => 'Fuente de los votos finales de presidentes y de los acuerdos CG de asignación RP. '
            . 'El buscador dof.gob.mx/buscador.php da 000 (sin buscador verificado); la navegación es por fecha.',
    ],
    [
        'id' => 'sitl',
        'nombre' => 'Sistema Integral de Información y Documentación Legislativa (SITL)',
        'institucion' => 'Cámara de Diputados',
        'url' => 'https://sitl.diputados.gob.mx/LXVI_leg/listado_diputados_gpnp.php',
        'nivel' => 'A',
        'flujo' => 'canonico',
        'fundamental' => false,
        'cargos' => ['diputados federales por legislatura (listado por grupo parlamentario); votaciones nominales y asistencias LXVI'],
        'formato' => 'HTML (iso-8859-1, tablas)',
        'frecuencia_revision' => 'mensual',
        'estado' => 'activa',
        'robots_txt' => 'CORRECCIÓN catálogo 2026-11-06: /robots.txt da 403 por WAF (no legible); el índice /LXVI_leg/ da 403 Apache, pero las rutas .php directas dan 200 y son extraíbles',
        'rutas' => [
            'listado_lxvi' => 'https://sitl.diputados.gob.mx/LXVI_leg/listado_diputados_gpnp.php (200, 229 KB, 500 enlaces curricula.php?dipt=N)',
            'votaciones_por_diputado' => 'https://sitl.diputados.gob.mx/LXVI_leg/votaciones_diputados_xperiodonplxvi.php?dipt=N (200)',
            'votaciones_por_periodo' => 'https://sitl.diputados.gob.mx/LXVI_leg/votaciones_por_pernplxvi.php?iddipt=N&pert=6 (votos hasta 9-dic-2025, incluye Ley de Ingresos 2026)',
            'asistencias_calendario' => 'https://sitl.diputados.gob.mx/LXVI_leg/asistencias_diputados_calendarionplxvi.php?pert=N (claves A/AC/AO/PM/IJ/I/IV)',
            'historico' => 'Subdominios sitllx, sitllxi, sitllxii con ?tipot=TOTAL|1|2|3|M|R|C (200); sitllxv y sitllxiv listados 200',
        ],
        'notas' => 'CORRECCIÓN catálogo 2026-11-06: el SITL NO está totalmente bloqueado; solo el índice da 403. '
            . 'Parámetro pert = periodo de sesiones (valores vistos 3, 5, 6); PENDIENTE verificar qué pert cubre 2026. '
            . 'LVII/LVIII/LIX se completaron por Gaceta (no por SITL: sitllviii/sitllix vacíos, HTTP 000). '
            . 'ParliamentScraperService ya implementa estas rutas directas (BASE_SITL_DIPUTADOS + pert).',
    ],
    [
        'id' => 'sil',
        'nombre' => 'Sistema de Información Legislativa (SIL)',
        'institucion' => 'SEGOB',
        'url' => 'http://sil.gobernacion.gob.mx/',
        'nivel' => 'A',
        'flujo' => 'canonico',
        'fundamental' => false,
        'cargos' => ['diputados federales y senadores (fichas y reportes de integración)'],
        'formato' => 'HTML (reportes)',
        'frecuencia_revision' => 'mensual',
        'estado' => 'parcial',
        'robots_txt' => 'CORRECCIÓN catálogo 2026-11-06: robots.txt 200 — solo 3 rutas prohibidas (Librerias/pp_PerfilLegislador.php, LibClases/LegisladorDatos.class.php, Utilerias/LegisladorDatos.class.php); el resto está permitido. pp_PerfilLegislador.php NUNCA se abre aunque devuelva 200',
        'notas' => 'El servicio SilIngestService usa solo el endpoint de reportes, no los perfiles. '
            . 'Portal /portal/Numeralia (200) con numeralia y sesiones; https da 000 (sin TLS); nsil.gobernacion.gob.mx muerto (000). '
            . 'No publica roster de personas: útil solo como contraste de numeralia/sesiones.',
    ],
    [
        'id' => 'senado',
        'nombre' => 'Senado de la República',
        'institucion' => 'Senado de la República',
        'url' => 'https://www.senado.gob.mx/',
        'nivel' => 'A',
        'flujo' => 'canonico',
        'fundamental' => false,
        'cargos' => ['senadores (roster, licencias, protestas)'],
        'formato' => 'HTML',
        'frecuencia_revision' => 'mensual',
        'estado' => 'bloqueada',
        'robots_txt' => '403 Incapsula en /robots.txt y en el portal; comunicacion.senado.gob.mx también 403 (catálogo 2026-11-06)',
        'notas' => 'Bloqueo confirmado en reintentos. Sin ruta oficial de roster RP en esta sesión. '
            . 'Sustitutos: INE/DOF (asignación RP) y SIL /portal/ReporteSesion/Senadores (numeralia).',
    ],
    [
        'id' => 'ine',
        'nombre' => 'Instituto Nacional Electoral (estadística y acuerdos)',
        'institucion' => 'INE',
        'url' => 'https://sitios.ine.mx/',
        'nivel' => 'A',
        'flujo' => 'canonico',
        'fundamental' => false,
        'cargos' => ['todos los cargos electos (cómputos, estadística, acuerdos del Consejo General)'],
        'formato' => 'HTML, PDF y tablas de votos',
        'frecuencia_revision' => 'mensual',
        'estado' => 'parcial',
        'robots_txt' => 'CORRECCIÓN catálogo 2026-11-06: ine.mx/robots.txt 200, permisivo (User-agent: * + Disallow: vacío; solo bloquea /wp-content/uploads/wpforms/). Sitemap: https://www.ine.mx/sitemap_index.xml',
        'notas' => 'Las estadísticas traen votos por partido/distrito, no listas de electos con nombres; '
            . 'los acuerdos CG publicados en el DOF sí traen nombre y partido. '
            . 'computos.ine.mx muerto (000); usar ine.mx, sitios.ine.mx, SICEE (sicee.ine.mx, 200) y repositorio documental.',
    ],
    [
        'id' => 'inafed',
        'nombre' => 'INAFED — Enciclopedia de los Municipios y Delegaciones de México',
        'institucion' => 'SEGOB / INAFED',
        'url' => 'http://www.inafed.gob.mx/work/enciclopedia/',
        'nivel' => 'A',
        'flujo' => 'canonico',
        'fundamental' => false,
        'cargos' => ['alcaldes históricos (cronología por municipio)'],
        'formato' => 'HTML y PDF con texto (cuando el dominio vivía)',
        'frecuencia_revision' => 'sin revisión (dominio muerto)',
        'estado' => 'bloqueada',
        'robots_txt' => 'CORRECCIÓN catálogo 2026-11-06: dominio MUERTO — sin registro A en DNS público (solo SOA ns.gobernacion.gob.mx); inafed.gob.mx da HTTP 000. Sin robots.txt verificable.',
        'notas' => 'CORRECCIÓN catálogo 2026-11-06: la Enciclopedia es inaccesible y gob.mx/inafed no la enlaza. '
            . 'NO usar como fuente de alcaldes históricos: no hay fuente federal única; rutas: cómputos de cada OPLE/IEEM '
            . 'y sitios municipales .gob.mx uno por uno. Daba nombre y periodo, pero NO partido (cruce con INE o null). '
            . 'InafedScraperService queda sin fuente viva hasta nuevo aviso.',
    ],
    [
        'id' => 'presidencia',
        'nombre' => 'Presidencia de la República',
        'institucion' => 'Presidencia de la República',
        'url' => 'https://www.gob.mx/presidencia',
        'nivel' => 'A',
        'flujo' => 'canonico',
        'fundamental' => false,
        'cargos' => ['presidencia (titular vigente y comunicados)'],
        'formato' => 'HTML (gob.mx)',
        'frecuencia_revision' => 'mensual',
        'estado' => 'activa',
        'robots_txt' => 'gob.mx/robots.txt 200: sin prohibiciones genéricas',
        'notas' => 'Verifica titular vigente; los periodos y votos se confirman en DOF e INE. '
            . 'CORRECCIÓN catálogo 2026-11-06: NO hay página de gabinete (la URL supuesta redirige a /presidencia) '
            . 'ni RSS (/presidencia/rss y /feed dan 404). Los nombramientos se confirman en DOF.',
    ],
    [
        'id' => 'tepjf',
        'nombre' => 'Tribunal Electoral del Poder Judicial de la Federación',
        'institucion' => 'TEPJF',
        'url' => 'https://www.tepjf.gob.mx/',
        'url_portal' => 'https://sicje.te.gob.mx/',
        'nivel' => 'A',
        'flujo' => 'canonico',
        'fundamental' => false,
        'cargos' => ['todos los cargos electos (sentencias, constancias, elecciones extraordinarias)'],
        'formato' => 'HTML y PDF',
        'frecuencia_revision' => 'bajo demanda',
        'estado' => 'parcial',
        'robots_txt' => 'CORRECCIÓN catálogo 2026-11-06: /robots.txt da 404; la home es página Radware (loader sin contenido)',
        'notas' => 'CORRECCIÓN catálogo 2026-11-06: usar sicje.te.gob.mx — IUS Electoral (IUSE) y SISREL (Sentencias Relevantes), '
            . 'renovados oct-2026, HTTP 200; los PDF de sentencias directos también dan 200. '
            . 'Son SPA (Angular): el contenido llega por API JS, no HTML estático. '
            . 'Validación de cambios de integración por sentencia (suplencias, asignaciones RP impugnadas); no publica rosters completos.',
    ],
    [
        'id' => 'congresos-locales',
        'nombre' => 'Congresos locales (32 entidades)',
        'institucion' => 'Congresos estatales',
        'url' => '',
        'nivel' => 'A',
        'flujo' => 'canonico',
        'fundamental' => false,
        'cargos' => ['diputados locales por entidad'],
        'formato' => 'HTML y PDF (varía por congreso)',
        'frecuencia_revision' => 'mensual',
        'estado' => 'parcial',
        'robots_txt' => 'varía por congreso; ver config/sources_estatales.php (32 entradas individuales con su robots.txt)',
        'notas' => 'Los 32 servicios ya existen en src/Services/Congreso*ScraperService.php. '
            . 'CORRECCIONES catálogo 2026-11-06: (1) San Luis Potosí NO es Disallow:/ — su robots.txt es Crawl-delay: 10 '
            . '(Disallow /includes/ /misc/); el bloqueo real es Sucuri CloudProxy (reto JS, requiere navegador). '
            . '(2) Campeche: robots Disallow:/ para * — solo consulta manual, NO scrapeable. '
            . '(3) Veracruz: legisver.gob.mx caído (falla de fibra óptica, ene-2026). '
            . 'Huecos 2000-2018 en Chiapas, Quintana Roo, Yucatán, Campeche, Veracruz, Chihuahua, '
            . 'Nuevo León, Sinaloa y Coahuila; QROO es la única con historial completo I–XVIII.',
    ],

    // ------------------------------------------------------------------
    // Nivel B — Contraste (medios no oficiales verificables)
    // ------------------------------------------------------------------
    [
        'id' => 'expansion',
        'nombre' => 'Expansión Política',
        'institucion' => 'Expansión (Grupo Expansión)',
        'url' => 'https://politica.expansion.mx/',
        'url_rss' => 'https://politica.expansion.mx/rss',
        'nivel' => 'B',
        'flujo' => 'contraste',
        'fundamental' => false,
        'cargos' => ['todos (renuncias, licencias, suplencias, elecciones)'],
        'formato' => 'HTML y RSS válido',
        'frecuencia_revision' => 'semanal',
        'estado' => 'activa',
        'robots_txt' => '200 verificado 2026-11-06; robots Allow: / y Allow: /rss$ (catálogo B1)',
        'notas' => 'Ya usado como [Fuente Actualizada No Oficial] en el dataset de contraste. Vía recomendada: RSS.',
    ],
    [
        'id' => 'milenio',
        'nombre' => 'Milenio (Política)',
        'institucion' => 'Milenio',
        'url' => 'https://www.milenio.com/politica',
        'nivel' => 'B',
        'flujo' => 'contraste',
        'fundamental' => false,
        'cargos' => ['todos (renuncias, licencias, suplencias, elecciones)'],
        'formato' => 'HTML',
        'frecuencia_revision' => 'semanal',
        'estado' => 'bloqueada',
        'robots_txt' => '403 en /robots.txt y en /politica (verificado 2026-11-06); catálogo B15: bloqueo hoy, reintentar otro día, no asumir permanente',
        'notas' => 'Ya usado como [Fuente Actualizada No Oficial] en el dataset de contraste, '
            . 'pero hoy bloquea bots. Reintentar manualmente; no evadir.',
    ],

    // ------------------------------------------------------------------
    // Nivel C — Pistas informativas (nunca un dato como hecho)
    // ------------------------------------------------------------------
    [
        'id' => 'wikipedia-anexos',
        'nombre' => 'Wikipedia — anexos de legislaturas',
        'institucion' => 'Wikipedia (comunidad)',
        'url' => 'https://es.wikipedia.org/wiki/Anexo:LVIII_Legislatura_del_Congreso_de_la_Unión_de_México',
        'nivel' => 'C',
        'flujo' => 'pista',
        'fundamental' => false,
        'cargos' => ['diputados federales y senadores por legislatura (listas de respaldo)'],
        'formato' => 'HTML (tablas)',
        'frecuencia_revision' => 'bajo demanda',
        'estado' => 'activa',
        'robots_txt' => 'sin bloqueo verificado en las sesiones de trabajo',
        'notas' => 'Solo como pista o respaldo. La columna de partido a menudo está vacía y '
            . 'hay errores de copia entre legislaturas. Todo dato que aporte debe verificarse '
            . 'contra DOF, INE o Gaceta antes de entrar a canónico o a contraste verificado.',
    ],
];

// Registros del catálogo 2026-11-06 (66 fuentes): portales estatales (32)
// y medios de contraste/informativos (23). Se fusionan aquí para que
// tools/dry_run_fuentes.php y el resto de la suite los vean como un solo
// registro; los archivos viven aparte para mantener cada archivo <400 líneas.
$estatales = require __DIR__ . '/sources_estatales.php';
$medios = require __DIR__ . '/sources_medios.php';

return array_merge($fuentes, $estatales, $medios);

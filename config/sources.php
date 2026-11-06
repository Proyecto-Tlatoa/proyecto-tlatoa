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
 * Estado verificado el 2026-11-06 con petición real (HTTP y robots.txt):
 *   - "activa": responde 200 y permite el scraping con la pausa de 1,250 ms.
 *   - "parcial": responde pero con huecos o rutas vetadas (ver "notas").
 *   - "bloqueada": 403, vacío o robots.txt Disallow:/. Reintentar manualmente;
 *     NUNCA evadir el bloqueo.
 *   - "degradada": responde pero con cobertura incompleta o en transición.
 *
 * Solo se registran URLs verificadas. Ninguna URL de este archivo fue inventada.
 */
return [
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
        'robots_txt' => 'sin bloqueo verificado en las sesiones de trabajo',
        'notas' => 'Entregó los rosters oficiales de LVIII (Gaceta 579, 2000) y LIX (Gaceta 1454, 2004).',
    ],
    [
        'id' => 'dof',
        'nombre' => 'Diario Oficial de la Federación',
        'institucion' => 'Secretaría de Gobernación',
        'url' => 'https://dof.gob.mx/',
        'nivel' => 'A',
        'flujo' => 'canonico',
        'fundamental' => false,
        'cargos' => ['presidencia (Bandos Solemnes), asignaciones IFE/INE, decretos'],
        'formato' => 'HTML (nota_detalle.php)',
        'frecuencia_revision' => 'semanal',
        'estado' => 'activa',
        'robots_txt' => 'sin bloqueo verificado en las sesiones de trabajo',
        'notas' => 'Fuente de los votos finales de presidentes y de los acuerdos CG de asignación RP.',
    ],
    [
        'id' => 'sitl',
        'nombre' => 'Sistema Integral de Información y Documentación Legislativa (SITL)',
        'institucion' => 'Cámara de Diputados',
        'url' => 'https://sitllx.diputados.gob.mx/listado_diputados_gpnp.php?tipot=TOTAL',
        'nivel' => 'A',
        'flujo' => 'canonico',
        'fundamental' => false,
        'cargos' => ['diputados federales por legislatura (listado por grupo parlamentario)'],
        'formato' => 'HTML',
        'frecuencia_revision' => 'mensual',
        'estado' => 'parcial',
        'robots_txt' => '403 en todos los subdominios (no se pudo leer ningún Disallow)',
        'notas' => 'Patrón sitl<romano>.diputados.gob.mx. Responden 200 los subdominios LX–LXV; '
            . 'LVII, LVIII, LIX y LXVI responden vacío (HTTP 000).',
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
        'robots_txt' => 'PROHÍBE pp_PerfilLegislador.php — esa ruta NUNCA se abre',
        'notas' => 'El servicio SilIngestService usa solo el endpoint de reportes, no los perfiles.',
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
        'robots_txt' => '403 Incapsula en /robots.txt y en el portal',
        'notas' => 'Bloqueo confirmado en reintentos. Sin ruta oficial de roster RP en esta sesión.',
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
        'robots_txt' => 'sin bloqueo verificado en las sesiones de trabajo',
        'notas' => 'Las estadísticas traen votos por partido/distrito, no listas de electos con nombres; '
            . 'los acuerdos CG publicados en el DOF sí traen nombre y partido.',
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
        'formato' => 'HTML y PDF con texto',
        'frecuencia_revision' => 'trimestral',
        'estado' => 'activa',
        'robots_txt' => 'sin bloqueo verificado en las sesiones de trabajo',
        'notas' => 'Da nombre y periodo, pero NO partido: el partido requiere cruce con cómputos del INE o null.',
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
        'notas' => 'Verifica titular vigente; los periodos y votos se confirman en DOF e INE.',
    ],
    [
        'id' => 'tepjf',
        'nombre' => 'Tribunal Electoral del Poder Judicial de la Federación',
        'institucion' => 'TEPJF',
        'url' => 'https://www.tepjf.gob.mx/',
        'nivel' => 'A',
        'flujo' => 'canonico',
        'fundamental' => false,
        'cargos' => ['todos los cargos electos (sentencias, constancias, elecciones extraordinarias)'],
        'formato' => 'HTML y PDF',
        'frecuencia_revision' => 'bajo demanda',
        'estado' => 'activa',
        'robots_txt' => 'sin bloqueo verificado en las sesiones de trabajo',
        'notas' => 'Verificación de casos concretos (ej. ST-JDC-301/2009). No publica rosters completos.',
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
        'robots_txt' => 'varía por congreso; verificar por sitio antes de scrapear',
        'notas' => 'Los 32 servicios ya existen en src/Services/Congreso*ScraperService.php. '
            . 'EXCEPCIÓN: San Luis Potosí tiene robots.txt Disallow:/ — NO se scrapea. '
            . 'Huecos 2000-2018 en Chiapas, Quintana Roo, Yucatán, Campeche, Veracruz, Chihuahua, '
            . 'Nuevo León, Sinaloa y Coahuila.',
    ],

    // ------------------------------------------------------------------
    // Nivel B — Contraste (medios no oficiales verificables)
    // ------------------------------------------------------------------
    [
        'id' => 'expansion',
        'nombre' => 'Expansión Política',
        'institucion' => 'Expansión (Grupo Expansión)',
        'url' => 'https://politica.expansion.mx/',
        'nivel' => 'B',
        'flujo' => 'contraste',
        'fundamental' => false,
        'cargos' => ['todos (renuncias, licencias, suplencias, elecciones)'],
        'formato' => 'HTML',
        'frecuencia_revision' => 'semanal',
        'estado' => 'activa',
        'robots_txt' => '200 verificado 2026-11-06',
        'notas' => 'Ya usado como [Fuente Actualizada No Oficial] en el dataset de contraste.',
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
        'robots_txt' => '403 en /robots.txt y en /politica (verificado 2026-11-06)',
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

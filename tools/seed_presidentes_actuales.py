"""Seeds para presidentes actuales (2018–2030)."""

PRESIDENTES_ACTUALES = [ { 'id': 'pres_claudia_sheinbaum',
    'slug': 'claudia-sheinbaum-pardo',
    'nombre_completo': 'Claudia Sheinbaum Pardo',
    'periodo': '2024–2030',
    'fecha_inicio': '2024-10-01',
    'fecha_conclusion': '2030-09-30',
    'es_vigente': True,
    'partido_actual': 'Morena',
    'partido_llegada': 'Morena',
    'coalicion': 'Sigamos Haciendo Historia (Morena - PT - PVEM)',
    'votos_obtenidos': 35924519,
    'porcentaje_votos': 59.75,
    'wiki_title': 'Claudia_Sheinbaum',
    'bando_dof_url': 'http://diariooficial.segob.gob.mx/nota_detalle.php?codigo=5737865&fecha=02/09/2024',
    'foto_url': '/assets/img/presidentes/claudia-sheinbaum-pardo.jpg',
    'resumen_cargo': 'Primera mujer en asumir la Presidencia de México en más de 200 años de '
                     'historia independiente.',
    'chapulineo': { 'ha_cambiado_partido': True,
                    'veces_cambio': 1,
                    'descripcion': 'Inició en el PRD participando en el gobierno de Cuauhtémoc '
                                   'Cárdenas y AMLO; en 2014 transitó a Morena desde su fundación.',
                    'historial': [ { 'partido': 'PRD',
                                     'periodo': '1989–2014',
                                     'cargos': 'Secretaria de Medio Ambiente del DF (2000-2006)',
                                     'color': '#FFD100'},
                                   { 'partido': 'Morena',
                                     'periodo': '2014–presente',
                                     'cargos': 'Alcaldesa Tlalpan (2015-2017), Jefa de Gobierno '
                                               'CDMX (2018-2023), Presidenta de México (2024-2030)',
                                     'color': '#8B1C3F'}]},
    'logros': [ { 'titulo': 'Constitucionalización de Nuevos Programas Sociales',
                  'descripcion': 'Ampliación de derechos sociales universales, creación de la Beca '
                                 'Universal Rita Cetina para educación básica y programa de apoyo '
                                 'a mujeres de 60 a 64 años.',
                  'fuente_tipo': 'verde',
                  'fuente_nombre': 'Diario Oficial de la Federación (DOF - 31/10/2024)',
                  'fuente_url': 'https://www.dof.gob.mx/nota_detalle.php?codigo=5742296&fecha=31/10/2024'},
                { 'titulo': 'Estrategia Nacional de Expansión Ferroviaria de Pasajeros',
                  'descripcion': 'Licitación y arranque de vías férreas prioritarias de pasajeros '
                                 'México-Querétaro, México-Pachuca y conectividad intermodal.',
                  'fuente_tipo': 'verde',
                  'fuente_nombre': 'Secretaría de Infraestructura, Comunicaciones y Transportes '
                                   '(Comunicado 127/2024)',
                  'fuente_url': 'https://www.gob.mx/sict/prensa/inician-estudios-para-tren-pasajeros-mexico-queretaro'},
                { 'titulo': 'Creación de la Secretaría de Ciencia, Humanidades, Tecnología e '
                            'Innovación',
                  'descripcion': 'Elevación de Conahcyt a rango de secretaría de Estado para '
                                 'política científica orientada a soberanía energética, '
                                 'alimentaria y tecnología pública.',
                  'fuente_tipo': 'verde',
                  'fuente_nombre': 'Diario Oficial de la Federación (DOF - 28/11/2024)',
                  'fuente_url': 'https://www.dof.gob.mx/nota_detalle.php?codigo=5744212&fecha=28/11/2024'}],
    'polemicas': [ { 'titulo': 'Reforma Constitucional al Poder Judicial',
                     'descripcion': 'Implementación de la elección por voto popular de jueces, '
                                    'magistrados y ministros de la SCJN; generó protestas de '
                                    'trabajadores judiciales y advertencias de calificadoras '
                                    'financieras internacionales.',
                     'fuente_tipo': 'amarillo',
                     'fuente_nombre': 'El Economista (Artículo: Publican decreto de reforma '
                                      'judicial en el DOF)',
                     'fuente_url': 'https://www.eleconomista.com.mx/politica/publican-decreto-reforma-judicial-dof-20240915-726410.html',
                     'cita_medio': 'Citación a medio El Economista, no se declara que sea '
                                   'verdadera ni falsa esta información.'},
                   { 'titulo': 'Tensión presupuestal y consolidación fiscal',
                     'descripcion': 'Retos en la reducción del déficit fiscal superior al 5% del '
                                    'PIB heredado de megaobras y gastos operativos de 2024.',
                     'fuente_tipo': 'amarillo',
                     'fuente_nombre': 'El Financiero (Artículo: Paquete Económico 2025: Hacienda '
                                      'prevé recorte al déficit fiscal)',
                     'fuente_url': 'https://www.elfinanciero.com.mx/economia/2024/11/15/paquete-economico-2025-hacienda-entrega-presupuesto-con-recorte-al-deficit/',
                     'cita_medio': 'Citación a medio El Financiero, no se declara que sea '
                                   'verdadera ni falsa esta información.'},
                   { 'titulo': 'Especulaciones sobre supuesta dualidad de mando',
                     'descripcion': 'Afirmaciones mediáticas sobre presunta injerencia de su '
                                    'predecesor en decisiones de gabinete y reformas prioritarias.',
                     'fuente_tipo': 'rojo',
                     'fuente_nombre': 'El País (Crónica: Sheinbaum asume con el reto de marcar su '
                                      'propio rumbo)',
                     'fuente_url': 'https://elpais.com/mexico/2024-10-01/sheinbaum-asume-la-presidencia-con-la-promesa-de-continuidad-y-el-reto-de-marcar-su-propio-rumbo.html',
                     'cita_medio': 'Citación a medio El País, no se declara que sea verdadera ni '
                                   'falsa esta información. Sin sustento probatorio documental.'}],
    'linea_tiempo': [ { 'anio': '1989',
                        'evento': 'Miembro fundadora del Partido de la Revolución Democrática '
                                  '(PRD).',
                        'tipo': 'carrera'},
                      { 'anio': '2000–2006',
                        'evento': 'Secretaria del Medio Ambiente del Distrito Federal en el '
                                  'gabinete de Andrés Manuel López Obrador.',
                        'tipo': 'carrera'},
                      { 'anio': '2007',
                        'evento': 'Coautora del Panel Intergubernamental sobre el Cambio Climático '
                                  '(IPCC) de la ONU (galardonado con el Nobel de la Paz).',
                        'tipo': 'carrera'},
                      { 'anio': '2014',
                        'evento': 'Renuncia al PRD y se afilia a Morena en su etapa formativa.',
                        'tipo': 'carrera'},
                      { 'anio': '2015–2017',
                        'evento': 'Jefa Delegacional de Tlalpan en la Ciudad de México.',
                        'tipo': 'carrera'},
                      { 'anio': '2018–2023',
                        'evento': 'Jefa de Gobierno de la Ciudad de México, primera mujer electa '
                                  'democráticamente para el cargo.',
                        'tipo': 'carrera'},
                      { 'anio': '2024',
                        'evento': 'Gana las elecciones presidenciales con el 59.75% de los votos.',
                        'tipo': 'presidencia'},
                      { 'anio': '2024–2030',
                        'evento': 'Presidenta Constitucional de los Estados Unidos Mexicanos.',
                        'tipo': 'presidencia'}],
    'post_presidencia': { 'estado': 'En ejercicio de mandato constitucional',
                          'actividades': 'Administración del Poder Ejecutivo Federal para el '
                                         'sexenio 2024-2030.'},
    'wiki_extract': 'Científica, académica y política mexicana. Es la presidenta constitucional de '
                    'México para el periodo 2024–2030, y la primera mujer en asumir la titularidad '
                    'del Poder Ejecutivo Federal en la historia del país.',
    'resumen_corto': 'Científica, académica y política mexicana. Es la presidenta constitucional '
                     'de México para el periodo 2024–2030, y la primera mujer en asumir la '
                     'titularidad del Poder Ejecutivo Federal en la historia del país.',
    'fuente_wikipedia_url': 'https://es.wikipedia.org/wiki/Claudia_Sheinbaum'},
  { 'id': 'pres_amlo',
    'slug': 'andres-manuel-lopez-obrador',
    'nombre_completo': 'Andrés Manuel López Obrador',
    'periodo': '2018–2024',
    'fecha_inicio': '2018-12-01',
    'fecha_conclusion': '2024-09-30',
    'es_vigente': False,
    'partido_actual': 'Morena',
    'partido_llegada': 'Morena',
    'coalicion': 'Juntos Haremos Historia (Morena - PT - PES)',
    'votos_obtenidos': 30113483,
    'porcentaje_votos': 53.19,
    'wiki_title': 'Andrés_Manuel_López_Obrador',
    'bando_dof_url': 'https://dof.gob.mx',
    'foto_url': '/assets/img/presidentes/andres-manuel-lopez-obrador.jpg',
    'resumen_cargo': "Presidente de México de 2018 a 2024. Promotor de la denominada 'Cuarta "
                     "Transformación' (4T).",
    'chapulineo': { 'ha_cambiado_partido': True,
                    'veces_cambio': 3,
                    'descripcion': 'Inició su trayectoria en el PRI de Tabasco, cofundó el FDN y '
                                   'PRD en 1989 y finalmente fundó Morena en 2014 tras salir del '
                                   'PRD.',
                    'historial': [ { 'partido': 'PRI',
                                     'periodo': '1976–1988',
                                     'cargos': 'Director Centro Indigenista Tabasco, Presidente '
                                               'del CDE PRI Tabasco',
                                     'color': '#C8102E'},
                                   { 'partido': 'FDN / Corriente Democrática',
                                     'periodo': '1988',
                                     'cargos': 'Candidato a Gobernador de Tabasco',
                                     'color': '#475569'},
                                   { 'partido': 'PRD',
                                     'periodo': '1989–2012',
                                     'cargos': 'Presidente Nacional PRD (1996-1999), Jefe de '
                                               'Gobierno DF (2000-2005), Candidato Presidencial '
                                               '(2006, 2012)',
                                     'color': '#FFD100'},
                                   { 'partido': 'Morena',
                                     'periodo': '2014–presente',
                                     'cargos': 'Presidente del CNE (2015-2017), Presidente de '
                                               'México (2018-2024)',
                                     'color': '#8B1C3F'}]},
    'logros': [ { 'titulo': 'Pensión Universal para Adultos Mayores con Rango Constitucional',
                  'descripcion': 'Reforma al artículo 4° de la Constitución para establecer como '
                                 'derecho no negociable la pensión no contributiva a mayores de 65 '
                                 'años.',
                  'fuente_tipo': 'verde',
                  'fuente_nombre': 'Diario Oficial de la Federación (DOF - 08/05/2020)',
                  'fuente_url': 'https://dof.gob.mx/nota_detalle.php?codigo=5593045&fecha=08/05/2020'},
                { 'titulo': 'Grandes Obras de Infraestructura Pública',
                  'descripcion': 'Construcción e inauguración del Tren Maya (1,554 km), el '
                                 'Aeropuerto Internacional Felipe Ángeles (AIFA) y la Refinería '
                                 'Dos Bocas.',
                  'fuente_tipo': 'verde',
                  'fuente_nombre': 'Gobierno de México (Memoria Técnica Tren Maya)',
                  'fuente_url': 'https://www.trenmaya.gob.mx'},
                { 'titulo': 'Aumento Histórico al Salario Mínimo y Supresión del Outsourcing',
                  'descripcion': 'Incremento nominal del salario mínimo de 88 a 248 pesos diarios '
                                 '(más de 110% real) y prohibición de la subcontratación abusiva.',
                  'fuente_tipo': 'verde',
                  'fuente_nombre': 'CONASAMI / Secretaría del Trabajo (Resolución Salarios Mínimos '
                                   '2024)',
                  'fuente_url': 'https://www.gob.mx/conasami/articulos/incremento-a-los-salarios-minimos-para-2024'}],
    'polemicas': [ { 'titulo': 'Cancelación del Nuevo Aeropuerto de Texcoco (NAIM)',
                     'descripcion': 'Cancelación del proyecto tras consulta ciudadana informal; '
                                    'derivó en pago millonario de bonos y liquidación de contratos '
                                    'por más de 100 mil mdp.',
                     'fuente_tipo': 'amarillo',
                     'fuente_nombre': 'Animal Político (Reportaje: Costo de cancelar NAIM Texcoco '
                                      'por ASF)',
                     'fuente_url': 'https://grupoanimal.mx/noticias/cancelar-naim-texcoco-costo-millones-pesos-auditoria-superior',
                     'cita_medio': 'Citación a medio Animal Político, no se declara que sea '
                                   'verdadera ni falsa esta información.'},
                   { 'titulo': 'Crisis en Sistema de Abastecimiento de Medicamentos y Megafarmacia',
                     'descripcion': 'Transición fallida de compra consolidada, extinción del '
                                    'Seguro Popular, creación y desaparición del Insabi hacia '
                                    'IMSS-Bienestar.',
                     'fuente_tipo': 'amarillo',
                     'fuente_nombre': 'El País (Reportaje: AMLO admite desabasto de medicamentos y '
                                      'exige solución)',
                     'fuente_url': 'https://elpais.com/mexico/2021-11-11/lopez-obrador-admite-el-desabasto-de-medicamentos-y-exige-al-secretario-de-salud-una-solucion-ya-no-hay-excusas.html',
                     'cita_medio': 'Citación a medio El País, no se declara que sea verdadera ni '
                                   'falsa esta información.'},
                   { 'titulo': 'Señalamientos sobre presunto financiamiento ilícito en 2006',
                     'descripcion': 'Reportajes de ProPublica y The New York Times basados en '
                                    'declaraciones de testigos protegidos de la DEA que cerraron '
                                    'la investigación sin cargos judiciales formales.',
                     'fuente_tipo': 'rojo',
                     'fuente_nombre': 'ProPublica (Investigación: Did Drug Traffickers Funnel '
                                      'Millions to AMLO Campaign?)',
                     'fuente_url': 'https://www.propublica.org/article/mexico-amlo-lopez-obrador-campaign-drug-cartel',
                     'cita_medio': 'Citación a investigación periodística de ProPublica, no se '
                                   'declara que sea verdadera ni falsa esta información. Sin '
                                   'imputación judicial formal.'}],
    'linea_tiempo': [ { 'anio': '1976',
                        'evento': 'Inicia su carrera política apoyando la campaña de Carlos '
                                  'Pellicer para el Senado por el PRI.',
                        'tipo': 'carrera'},
                      { 'anio': '1977–1982',
                        'evento': 'Director del Centro Coordinador Indigenista Chontal de Tabasco '
                                  '(INI).',
                        'tipo': 'carrera'},
                      { 'anio': '1983',
                        'evento': 'Presidente del Comité Directivo Estatal del PRI en Tabasco.',
                        'tipo': 'carrera'},
                      { 'anio': '1988',
                        'evento': 'Rompe con el PRI, se une al Frente Democrático Nacional y '
                                  'contiende por la gubernatura de Tabasco.',
                        'tipo': 'carrera'},
                      { 'anio': '1989',
                        'evento': 'Cofundador y líder estatal del Partido de la Revolución '
                                  'Democrática (PRD) en Tabasco.',
                        'tipo': 'carrera'},
                      { 'anio': '1996–1999',
                        'evento': 'Presidente Nacional del PRD, logrando victorias clave en el DF '
                                  'y gubernaturas.',
                        'tipo': 'carrera'},
                      { 'anio': '2000–2005',
                        'evento': 'Jefe de Gobierno del Distrito Federal; enfrenta proceso de '
                                  'desafuero en 2005.',
                        'tipo': 'carrera'},
                      { 'anio': '2006',
                        'evento': 'Candidato presidencial del PRD-PT-Convergencia (diferencia de '
                                  '0.56% frente a Calderón).',
                        'tipo': 'carrera'},
                      { 'anio': '2012',
                        'evento': 'Segunda candidatura presidencial del PRD; posteriormente '
                                  'anuncia salida del partido.',
                        'tipo': 'carrera'},
                      { 'anio': '2014',
                        'evento': 'Funda formalmente el partido Morena tras obtener el registro '
                                  'ante el INE.',
                        'tipo': 'carrera'},
                      { 'anio': '2018–2024',
                        'evento': 'Presidente de México tras obtener más de 30 millones de votos.',
                        'tipo': 'presidencia'},
                      { 'anio': '2024–presente',
                        'evento': 'Retiro oficial de la vida pública activa y residencia en su '
                                  'quinta de Palenque, Chiapas.',
                        'tipo': 'post_presidencia'}],
    'post_presidencia': { 'estado': 'Retirado de la vida pública política activa',
                          'actividades': 'Reside en Palenque, Chiapas; dedicado a la escritura e '
                                         'investigación histórica sobre las culturas originarias y '
                                         'el pensamiento político mexicano. Ha declarado que no '
                                         'intervendrá en debates públicos ni redes sociales.'},
    'wiki_extract': 'Político y escritor mexicano. Fue presidente constitucional de los Estados '
                    'Unidos Mexicanos de 2018 a 2024 y fundador del partido Morena, tras haberse '
                    'desempeñado como jefe de Gobierno del Distrito Federal.',
    'resumen_corto': 'Político y escritor mexicano. Fue presidente constitucional de los Estados '
                     'Unidos Mexicanos de 2018 a 2024 y fundador del partido Morena, tras haberse '
                     'desempeñado como jefe de Gobierno del Distrito Federal.',
    'fuente_wikipedia_url': 'https://es.wikipedia.org/wiki/Andr%C3%A9s_Manuel_L%C3%B3pez_Obrador'}]

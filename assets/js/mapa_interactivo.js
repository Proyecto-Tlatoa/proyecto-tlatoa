/**
 * Proyecto Tlatoa — Controlador del Mapa Interactivo SVG y Radiografía 360
 */

(function () {
    const map = document.getElementById('mexicoSvgMap');
    const tooltip = document.getElementById('mapTooltip');
    const capasDataEl = document.getElementById('capasMapaJson');
    const resumen360El = document.getElementById('resumenEstados360Json');

    let capasData = {};
    try { capasData = JSON.parse(capasDataEl.textContent || '{}'); } catch (e) { }

    let resumen360Data = {};
    try { resumen360Data = JSON.parse(resumen360El.textContent || '{}'); } catch (e) { }

    const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt ?? ''; };
    const setHtml = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html ?? ''; };
    const setHref = (id, href) => { const el = document.getElementById(id); if (el) el.href = href ?? '#'; };

    const fuerzaMayoritariaContainer = document.getElementById('fuerzaMayoritariaContainer');
    const capaPills = document.querySelectorAll('.capa-pill');

    let currentCapa = 'gobernadores';
    let selectedSlug = 'baja-california';
    let activeFilteredParty = null;

    const PARTY_SHORT_NAMES = [
        [['USOS Y COSTUMBRES', 'SNI', 'UYC'], 'SNI / UYC'],
        [['CONCEJO'], 'Concejo'],
        [['LITIGIO'], 'En Litigio'],
        [['MOVIMIENTO CIUDADANO', 'MC'], 'MC'],
        [['VERDE', 'PVEM'], 'PVEM'],
        [['TRABAJO', 'PT'], 'PT'],
        [['INDEPENDIENTE', 'SIN PARTIDO', 'INDEP'], 'Indep.'],
        [['NUEVA ALIANZA', 'PANAL'], 'PANAL'],
        [['REVOLUCIONARIO', 'PRI'], 'PRI'],
        [['ACCION NACIONAL', 'PAN'], 'PAN'],
        [['MORENA'], 'Morena'],
        [['PRD'], 'PRD'],
        [['PES', 'ENCUENTRO'], 'PES']
    ];

    function getShortPartyName(partido) {
        if (!partido) return '';
        const upper = partido.toUpperCase().trim();
        for (const [tokens, short] of PARTY_SHORT_NAMES) {
            if (tokens.some(t => upper.includes(t) || upper === t)) return short;
        }
        return partido;
    }

    const PARTY_COLORS = [
        ['MORENA', '#8B1C3F'],
        ['PAN', '#003893'],
        ['VERDE', '#009E49'],
        ['PVEM', '#009E49'],
        ['PRI', '#C8102E'],
        ['REVOLUCIONARIO', '#C8102E'],
        ['PT', '#DA291C'],
        ['TRABAJO', '#DA291C'],
        ['MC', '#FF8300'],
        ['CIUDADANO', '#FF8300'],
        ['PES', '#582C83'],
        ['PRD', '#FFD100'],
        ['PANAL', '#00A896'],
        ['NUEVA ALIANZA', '#00A896'],
        ['USOS Y COSTUMBRES', '#475569'],
        ['INDEPENDIENTE', '#64748B']
    ];

    function getPartyColorJs(partido) {
        if (!partido) return '#6C757D';
        const upper = partido.toUpperCase().trim();
        for (const [key, color] of PARTY_COLORS) {
            if (upper.includes(key)) return color;
        }
        return '#6C757D';
    }

    function applyPartyFilter(party) {
        if (!map) return;
        const paths = map.querySelectorAll('.state-path');
        const chips = fuerzaMayoritariaContainer ? fuerzaMayoritariaContainer.querySelectorAll('.party-kpi-chip') : [];
        const btnPartidos = document.getElementById('btnLimpiarFiltroPartidos');
        const hintPartidos = document.getElementById('hintFiltroPartidos');

        if (activeFilteredParty === party) {
            activeFilteredParty = null;
            paths.forEach(p => p.classList.remove('state-dimmed', 'state-highlighted'));
            chips.forEach(c => c.classList.remove('chip-active'));
            if (btnPartidos) { btnPartidos.classList.add('d-none'); btnPartidos.classList.remove('d-inline-flex'); }
            if (hintPartidos) hintPartidos.classList.remove('d-none');
        } else {
            activeFilteredParty = party;
            const targetShort = getShortPartyName(party).toUpperCase();
            paths.forEach(p => {
                const pParty = p.getAttribute('data-party') || '';
                const pShort = getShortPartyName(pParty).toUpperCase();
                const matches = (pParty.toUpperCase() === party.toUpperCase()) || (pShort === targetShort);
                p.classList.toggle('state-dimmed', !matches);
                p.classList.toggle('state-highlighted', matches);
            });
            chips.forEach(c => {
                const cParty = c.getAttribute('data-party') || '';
                const cShort = getShortPartyName(cParty).toUpperCase();
                const matches = (cParty.toUpperCase() === party.toUpperCase()) || (cShort === targetShort);
                c.classList.toggle('chip-active', matches);
            });
            if (btnPartidos) { btnPartidos.classList.remove('d-none'); btnPartidos.classList.add('d-inline-flex'); }
            if (hintPartidos) hintPartidos.classList.add('d-none');
        }
    }

    function updateCard(slug) {
        selectedSlug = slug;
        const capaInfo = capasData[currentCapa];
        if (!capaInfo || !capaInfo.estados || !capaInfo.estados[slug]) return;
        const est = capaInfo.estados[slug];

        setTxt('cardCapaBadge', capaInfo.badge);
        setTxt('cardEstadoAbbr', est.abbr || 'MEX');
        setTxt('cardEstadoNombre', est.nombre);
        setTxt('cardEstadoSubtitulo', est.subtitulo_card);

        const partyColor = est.color_mayoria || getPartyColorJs(est.partido_mayoria);
        const cardTitularNombre = document.getElementById('cardTitularNombre');
        const cardTitularCargo = document.getElementById('cardTitularCargo');

        if (currentCapa === 'gobernadores') {
            setTxt('cardMayoriaTitulo', 'Titular en Funciones:');
            setHtml('cardEstadoMayoriaBadge', `
                <div class="d-flex align-items-center mb-1">
                    <span class="badge rounded-pill px-3 py-1" style="background-color: ${partyColor}; color: #fff; font-weight: 600;">${est.partido_mayoria}</span>
                </div>
                <div class="text-secondary small d-flex align-items-center gap-1" style="font-size: 0.74rem;">
                    <i class="bi bi-calendar3 text-muted" aria-hidden="true"></i><span>${est.mayoria_label}</span>
                </div>
            `);
            if (cardTitularNombre) { cardTitularNombre.textContent = est.titular || 'Titular del Ejecutivo'; cardTitularNombre.style.display = 'block'; }
            if (cardTitularCargo) { cardTitularCargo.textContent = est.cargo || 'Gobernador(a) Constitucional'; cardTitularCargo.style.display = 'block'; }
            setTxt('cardDesgloseTitulo', 'Filiación Institucional:');
            setHtml('cardEstadoProgressBar', `<div class="progress-bar" style="width: 100%; background-color: ${partyColor};" title="${est.partido_mayoria}"></div>`);
            setHtml('cardEstadoPartidosList', `
                <div class="d-flex justify-content-between align-items-center py-1 border-bottom border-light">
                    <span class="d-flex align-items-center gap-2">
                        <span class="rounded-circle d-inline-block" style="width: 8px; height: 8px; background-color: ${partyColor};"></span>
                        <span class="text-dark fw-medium">${est.partido_mayoria}</span>
                    </span>
                    <span class="badge bg-light text-dark border font-monospace"><strong>Vigente</strong></span>
                </div>
            `);
        } else {
            const tituloMayoria = currentCapa === 'alcaldias' ? 'Fuerza Mayoritaria en Municipios:' :
                (currentCapa === 'congresos_locales' ? 'Mayoría Parlamentaria Local:' : 'Fuerza Mayoritaria en el Congreso:');
            setTxt('cardMayoriaTitulo', tituloMayoria);
            setHtml('cardEstadoMayoriaBadge', `
                <div class="d-flex align-items-center mb-1">
                    <span class="badge rounded-pill px-3 py-1" style="background-color: ${partyColor}; color: #fff; font-weight: 600;">${est.partido_mayoria}</span>
                </div>
                <div class="text-secondary small d-flex align-items-center gap-1" style="font-size: 0.74rem;">
                    <i class="bi bi-pie-chart-fill text-muted" aria-hidden="true"></i><span>${est.mayoria_label}</span>
                </div>
            `);
            if (cardTitularNombre) cardTitularNombre.style.display = 'none';
            if (cardTitularCargo) cardTitularCargo.style.display = 'none';
            setTxt('cardDesgloseTitulo', 'Composición por Bancadas:');

            const total = est.total_representantes || 1;
            let progressHtml = '', listHtml = '';
            for (const [pName, pCount] of Object.entries(est.conteo_partidos || {})) {
                const pct = Math.max(3, Math.round((pCount / total) * 100));
                const c = getPartyColorJs(pName);
                progressHtml += `<div class="progress-bar" style="width: ${pct}%; background-color: ${c};" title="${pName}: ${pCount}"></div>`;
                const labelUnit = currentCapa === 'alcaldias' ? (pCount === 1 ? 'alcaldía' : 'alcaldías') : 'curules';
                listHtml += `
                    <div class="d-flex justify-content-between align-items-center py-1 border-bottom border-light">
                        <span class="d-flex align-items-center gap-2">
                            <span class="rounded-circle d-inline-block" style="width: 8px; height: 8px; background-color: ${c};"></span>
                            <span class="text-dark fw-medium">${pName}</span>
                        </span>
                        <span class="badge bg-light text-dark border font-monospace"><strong>${pCount}</strong> ${labelUnit}</span>
                    </div>
                `;
            }
            setHtml('cardEstadoProgressBar', progressHtml);
            setHtml('cardEstadoPartidosList', listHtml);
        }

        setHref('btnExplorarEstado', est.boton_url || '#');
        setTxt('btnExplorarText', est.boton_text || 'Explorar detalles');
        updateRadiografia360(slug);
    }

    function updateRadiografia360(slug) {
        const r = resumen360Data[slug];
        if (!r) return;

        setTxt('rad360Abbr', r.abbr || 'MEX');
        setTxt('rad360Nombre', r.nombre);
        setTxt('rad360CargosBadge', `${r.total_cargos} Cargos Auditados`);

        if (r.gobernador) {
            setHtml('rad360GovParty', `<span class="badge rounded-pill px-2 py-1" style="background-color: ${r.gobernador.color}; color: #fff;">${r.gobernador.partido}</span>`);
        }

        setHref('rad360AlcLink', r.alcaldias_url);
        if (r.alcaldias) {
            setTxt('rad360AlcTotal', r.alcaldias.total);
            setHtml('rad360AlcParty', `<span class="badge rounded-pill px-2 py-1" style="background-color: ${r.alcaldias.color}; color: #fff;">${r.alcaldias.partido}</span>`);
        }

        if (r.congreso_local) {
            setTxt('rad360LocTotal', r.congreso_local.total);
            setHtml('rad360LocParty', `<span class="badge rounded-pill px-2 py-1" style="background-color: ${r.congreso_local.color}; color: #fff;">${r.congreso_local.partido}</span>`);
        }

        setHref('rad360FedLink', r.federal_url);
        if (r.federal) {
            setTxt('rad360FedTotal', r.federal.total);
            setHtml('rad360FedParty', `<span class="badge rounded-pill px-2 py-1" style="background-color: ${r.federal.color}; color: #fff;">${r.federal.partido}</span>`);
        }

        setHref('rad360EstudiosLink', r.estudios_url);
        if (r.estudios) {
            setTxt('rad360EstudiosPct', `${r.estudios.superiores_pct}%`);
            setTxt('rad360EstudiosDetalle', `${r.estudios.superiores_total} con Licenciatura / Posgrado`);
            setTxt('rad360PosgradosDetalle', `${r.estudios.posgrados_total} cuentan con Posgrado`);
        }

        setHref('rad360ChapulinesLink', r.chapulines_url);
        if (r.chapulines) {
            setTxt('rad360ChapulinesPct', `${r.chapulines.pct}%`);
            setTxt('rad360ChapulinesDetalle', `${r.chapulines.total} con cambio de partido`);
            setTxt('rad360FielesDetalle', `${r.chapulines.fieles_total} han sido fieles a su partido`);
        }

        setHref('rad360BtnFichaEstatal', r.federal_url);
        setHref('rad360BtnExplorador', r.explorador_url);
        setHtml('rad360BtnExplorador', `<span>Ver ficha completa de ${r.nombre} en Explorador</span><i class="bi bi-arrow-right ms-1" aria-hidden="true"></i>`);
    }

    function renderCapa(capaKey) {
        currentCapa = capaKey;
        activeFilteredParty = null;
        const capaInfo = capasData[capaKey];
        if (!capaInfo) return;

        capaPills.forEach(btn => {
            const isTarget = btn.getAttribute('data-capa') === capaKey;
            btn.classList.toggle('btn-primary', isTarget);
            btn.classList.toggle('text-white', isTarget);
            btn.classList.toggle('shadow-xs', isTarget);
            btn.classList.toggle('btn-light', !isTarget);
            btn.classList.toggle('text-dark', !isTarget);
            btn.classList.toggle('border', !isTarget);
        });

        setTxt('badgeCapaActiva', capaInfo.badge);
        const mapaTituloSpan = document.querySelector('#mapaTitulo span');
        if (mapaTituloSpan) mapaTituloSpan.textContent = capaInfo.titulo;
        setTxt('mapaDescripcion', capaInfo.descripcion);
        setTxt('labelFuerzaMayoritaria', (capaInfo.label_fuerza || 'Fuerza mayoritaria') + ':');

        if (fuerzaMayoritariaContainer && capaInfo.fuerza_nacional) {
            let chipsHtml = '';
            capaInfo.fuerza_nacional.forEach(([pName, count]) => {
                const color = getPartyColorJs(pName);
                const shortName = getShortPartyName(pName);
                chipsHtml += `
                    <button type="button" class="party-kpi-chip" data-party="${pName}" title="Filtrar entidades por ${pName}" aria-label="Filtrar entidades por ${pName}">
                        <span class="party-kpi-dot" style="background-color: ${color};"></span>
                        <span class="party-kpi-name">${shortName}</span>
                        <span class="party-kpi-count">${count}</span>
                    </button>
                `;
            });
            fuerzaMayoritariaContainer.innerHTML = chipsHtml;

            fuerzaMayoritariaContainer.querySelectorAll('.party-kpi-chip').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    applyPartyFilter(btn.getAttribute('data-party'));
                });
            });
        }

        if (map) {
            map.querySelectorAll('.state-path').forEach(p => {
                p.classList.remove('state-dimmed', 'state-highlighted');
                const slug = p.getAttribute('data-slug');
                const est = capaInfo.estados[slug];
                if (est) {
                    p.setAttribute('fill', est.color_mayoria || getPartyColorJs(est.partido_mayoria));
                    p.setAttribute('data-party', est.partido_mayoria);
                    p.setAttribute('data-reps', est.total_representantes);
                    p.setAttribute('data-subtitle', est.subtitulo_card);
                    p.setAttribute('data-label', est.mayoria_label);
                    p.setAttribute('data-url', est.boton_url);
                    p.setAttribute('data-btntext', est.boton_text);
                    if (est.titular) {
                        p.setAttribute('data-titular', est.titular);
                        p.setAttribute('data-cargo', est.cargo);
                        p.setAttribute('data-periodo', est.periodo);
                    } else {
                        p.removeAttribute('data-titular');
                        p.removeAttribute('data-cargo');
                        p.removeAttribute('data-periodo');
                    }
                }
            });
        }

        updateCard(selectedSlug);
    }

    capaPills.forEach(btn => {
        btn.addEventListener('click', () => {
            const capa = btn.getAttribute('data-capa');
            if (capa && capa !== currentCapa) renderCapa(capa);
        });
    });

    if (map) {
        const paths = map.querySelectorAll('.state-path');
        paths.forEach(p => {
            p.addEventListener('mouseenter', () => {
                const name = p.getAttribute('data-name');
                const party = p.getAttribute('data-party');
                const titular = p.getAttribute('data-titular');
                const reps = p.getAttribute('data-reps');
                let extra = (currentCapa === 'gobernadores' && titular) ? `<small>${titular} &bull; ${party}</small>` :
                    (currentCapa === 'alcaldias' ? `<small>${reps} alcaldías &bull; Mayoría ${party}</small>` :
                    (currentCapa === 'congresos_locales' ? `<small>${reps} curules locales &bull; Mayoría ${party}</small>` :
                    `<small>${reps} legisladores &bull; ${party}</small>`));
                if (tooltip) {
                    tooltip.innerHTML = `<strong>${name}</strong><br>${extra}`;
                    tooltip.style.display = 'block';
                }
            });

            p.addEventListener('mousemove', (e) => {
                if (tooltip) {
                    const rect = map.getBoundingClientRect();
                    tooltip.style.left = (e.clientX - rect.left + 15) + 'px';
                    tooltip.style.top = (e.clientY - rect.top + 10) + 'px';
                }
            });

            p.addEventListener('mouseleave', () => { if (tooltip) tooltip.style.display = 'none'; });

            const selectPath = () => {
                paths.forEach(el => el.classList.remove('state-selected'));
                p.classList.add('state-selected');
                updateCard(p.getAttribute('data-slug'));
            };

            p.addEventListener('click', selectPath);
            p.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectPath();
                }
            });
        });
    }

    function limpiarTodosLosFiltros() {
        activeFilteredParty = null;
        if (map) {
            map.querySelectorAll('.state-path').forEach(p => p.classList.remove('state-dimmed', 'state-highlighted', 'state-selected'));
        }
        if (fuerzaMayoritariaContainer) {
            fuerzaMayoritariaContainer.querySelectorAll('.party-kpi-chip').forEach(c => c.classList.remove('chip-active'));
        }
        const btnPartidos = document.getElementById('btnLimpiarFiltroPartidos');
        if (btnPartidos) { btnPartidos.classList.add('d-none'); btnPartidos.classList.remove('d-inline-flex'); }
        const hintPartidos = document.getElementById('hintFiltroPartidos');
        if (hintPartidos) hintPartidos.classList.remove('d-none');
        updateCard('baja-california');
    }

    const btnLimpiar = document.getElementById('btnLimpiarFiltro');
    if (btnLimpiar) btnLimpiar.addEventListener('click', (e) => { e.preventDefault(); limpiarTodosLosFiltros(); });

    const btnLimpiarPartidos = document.getElementById('btnLimpiarFiltroPartidos');
    if (btnLimpiarPartidos) btnLimpiarPartidos.addEventListener('click', (e) => { e.preventDefault(); limpiarTodosLosFiltros(); });

    if (capasData && capasData.gobernadores) renderCapa('gobernadores');
})();

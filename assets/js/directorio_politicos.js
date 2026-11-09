/**
 * Proyecto Tlatoa — Controlador del Directorio de Servidores Públicos
 * Filtrado facetado, infinite scroll progresivo y modal de auditoría ciudadana.
 */

document.addEventListener('DOMContentLoaded', () => {
    const apiUrl = '/api/politicos';
    const inputTexto = document.getElementById('filtroTexto');
    const selectLeg = document.getElementById('filtroLegislatura');
    const selectCargo = document.getElementById('filtroCargo');
    const selectEstado = document.getElementById('filtroEstado');
    const selectPartido = document.getElementById('filtroPartido');
    const switchActivos = document.getElementById('filtroSoloActivos');
    const numMostrados = document.getElementById('numMostrados');
    const numTotales = document.getElementById('numTotales');
    const btnLimpiar = document.getElementById('btnLimpiarFiltros');
    const btnReset = document.getElementById('btnResetTodos');
    const noResultados = document.getElementById('noResultados');
    const grid = document.getElementById('gridPoliticos');
    const sentinel = document.getElementById('infiniteScrollSentinel');
    const btnCargarMas = document.getElementById('btnCargarMas');
    const loaderSpinner = document.getElementById('loaderSpinner');

    if (!grid) return;

    let currentPage = 1;
    let isLoading = false;
    const initialHasMoreAttr = grid.getAttribute('data-initial-has-more');
    let hasMore = initialHasMoreAttr !== null ? (initialHasMoreAttr === 'true') : true;
    let currentAbortController = null;

    function getParametros(pageNumber = 1) {
        const params = new URLSearchParams();
        params.set('page', pageNumber);
        params.set('limit', '32');

        const texto = (inputTexto ? inputTexto.value : '').trim();
        if (texto) params.set('q', texto);
        if (selectLeg && selectLeg.value !== 'todas') params.set('leg', selectLeg.value);
        if (selectCargo && selectCargo.value !== 'todos') params.set('cargo', selectCargo.value);
        if (selectEstado && selectEstado.value !== 'todos') params.set('estado', selectEstado.value);
        if (selectPartido && selectPartido.value !== 'todos') params.set('partido', selectPartido.value);
        if (switchActivos && switchActivos.checked) params.set('activo', '1');

        return params;
    }

    function hayFiltrosActivos() {
        return (inputTexto && (inputTexto.value || '').trim() !== '')
            || (selectLeg && selectLeg.value !== 'todas')
            || (selectCargo && selectCargo.value !== 'todos')
            || (selectEstado && selectEstado.value !== 'todos')
            || (selectPartido && selectPartido.value !== 'todos')
            || (switchActivos && switchActivos.checked);
    }

    // Catálogo original completo para faceted filtering
    const opcionesOriginales = new Map();
    [
        { select: selectLeg, neutro: 'todas' },
        { select: selectCargo, neutro: 'todos' },
        { select: selectEstado, neutro: 'todos' },
        { select: selectPartido, neutro: 'todos' }
    ].forEach(item => {
        if (item.select) {
            opcionesOriginales.set(item.select, Array.from(item.select.options).map(opt => ({
                value: opt.value,
                text: opt.text
            })));
        }
    });

    const CARGOS_LOCALES_MUNICIPALES = new Set(['diputado_local', 'alcalde', 'edil', 'gobernador', 'cambio_partido']);

    function toggleOptions(select, condition) {
        if (!select) return;
        Array.from(select.options).forEach(opt => {
            const invalid = condition(opt.value);
            opt.disabled = invalid;
            opt.classList.toggle('text-muted', invalid);
        });
    }

    function sincronizarFiltrosCruzados() {
        if (!switchActivos || !selectLeg || !selectCargo) return;
        const esSoloActivos = switchActivos.checked;
        const legVal = selectLeg.value;
        const cargoVal = selectCargo.value;

        if (esSoloActivos) {
            selectLeg.value = '66';
            selectLeg.disabled = true;
            selectLeg.classList.add('bg-secondary-subtle');
            toggleOptions(selectCargo, val => CARGOS_LOCALES_MUNICIPALES.has(val));
            if (CARGOS_LOCALES_MUNICIPALES.has(selectCargo.value)) selectCargo.value = 'todos';
            return;
        }

        selectLeg.disabled = false;
        selectLeg.classList.remove('bg-secondary-subtle');

        if (legVal !== 'todas') {
            toggleOptions(selectCargo, val => CARGOS_LOCALES_MUNICIPALES.has(val));
            if (CARGOS_LOCALES_MUNICIPALES.has(selectCargo.value)) selectCargo.value = 'todos';
            toggleOptions(selectLeg, () => false);
            return;
        }

        if (CARGOS_LOCALES_MUNICIPALES.has(cargoVal)) {
            selectLeg.value = 'todas';
            toggleOptions(selectLeg, val => val !== 'todas');
            toggleOptions(selectCargo, () => false);
            return;
        }

        toggleOptions(selectCargo, () => false);
        toggleOptions(selectLeg, () => false);
    }

    function actualizarOpcionesDropdown(selectElement, valoresValidos, neutroValue = 'todos') {
        if (!selectElement || !Array.isArray(valoresValidos)) return;
        const optsOriginales = opcionesOriginales.get(selectElement);
        if (!optsOriginales) return;

        const setValidos = new Set(valoresValidos.map(v => String(v).toLowerCase()));
        const valorActual = selectElement.value;
        let valorSigueValido = false;

        selectElement.innerHTML = '';
        for (const opt of optsOriginales) {
            const esNeutro = (opt.value === neutroValue || opt.value === '');
            if (esNeutro || setValidos.has(String(opt.value).toLowerCase())) {
                const optEl = document.createElement('option');
                optEl.value = opt.value;
                optEl.textContent = opt.text;
                if (opt.value === valorActual) {
                    optEl.selected = true;
                    valorSigueValido = true;
                }
                selectElement.appendChild(optEl);
            }
        }

        if (!valorSigueValido && valorActual !== neutroValue) selectElement.value = neutroValue;
        sincronizarFiltrosCruzados();
    }

    function resetearOpcionesDropdown(selectElement, neutroValue = 'todos') {
        if (!selectElement) return;
        const optsOriginales = opcionesOriginales.get(selectElement);
        if (!optsOriginales) return;

        selectElement.innerHTML = '';
        for (const opt of optsOriginales) {
            const optEl = document.createElement('option');
            optEl.value = opt.value;
            optEl.textContent = opt.text;
            if (opt.value === neutroValue) optEl.selected = true;
            selectElement.appendChild(optEl);
        }
        selectElement.value = neutroValue;
    }

    async function cargarLote(reset = false) {
        if (isLoading || (!reset && !hasMore)) return;

        if (currentAbortController) currentAbortController.abort();
        currentAbortController = new AbortController();

        isLoading = true;
        const targetPage = reset ? 1 : (currentPage + 1);

        if (reset) {
            grid.innerHTML = '';
            if (noResultados) noResultados.classList.add('d-none');
            grid.classList.remove('d-none');
        }

        if (sentinel) {
            sentinel.classList.remove('d-none');
            if (loaderSpinner) loaderSpinner.classList.remove('d-none');
            if (btnCargarMas) btnCargarMas.classList.add('d-none');
        }

        if (btnLimpiar) btnLimpiar.classList.toggle('d-none', !hayFiltrosActivos());

        try {
            const params = getParametros(targetPage);
            const response = await fetch(`${apiUrl}?${params.toString()}`, {
                signal: currentAbortController.signal,
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) throw new Error('Error al consultar representantes');

            const data = await response.json();
            if (data.ok) {
                if (data.facetas) {
                    if (data.facetas.partidos) actualizarOpcionesDropdown(selectPartido, data.facetas.partidos, 'todos');
                    if (data.facetas.estados) actualizarOpcionesDropdown(selectEstado, data.facetas.estados, 'todos');
                    if (data.facetas.cargos) actualizarOpcionesDropdown(selectCargo, data.facetas.cargos, 'todos');
                    if (data.facetas.legislaturas) actualizarOpcionesDropdown(selectLeg, data.facetas.legislaturas, 'todas');
                }

                if (data.html && data.html.trim() !== '') {
                    grid.insertAdjacentHTML('beforeend', data.html);
                    if (noResultados) noResultados.classList.add('d-none');
                    grid.classList.remove('d-none');
                } else if (reset) {
                    if (noResultados) noResultados.classList.remove('d-none');
                    grid.classList.add('d-none');
                }

                const totalEnDOM = grid.querySelectorAll('.politico-card-item').length;
                if (numMostrados) numMostrados.textContent = totalEnDOM.toLocaleString();
                if (numTotales && data.total_filtrados !== undefined) {
                    numTotales.textContent = Number(data.total_filtrados).toLocaleString();
                }

                currentPage = targetPage;
                hasMore = Boolean(data.has_more);
                if (!hasMore && sentinel) sentinel.classList.add('d-none');
            }
        } catch (err) {
            if (err.name !== 'AbortError') console.error('Error cargando representantes:', err);
        } finally {
            isLoading = false;
            if (loaderSpinner) loaderSpinner.classList.add('d-none');
            if (hasMore && btnCargarMas) btnCargarMas.classList.remove('d-none');
        }
    }

    function resetearFiltros() {
        if (inputTexto) inputTexto.value = '';
        if (switchActivos) switchActivos.checked = false;
        resetearOpcionesDropdown(selectLeg, 'todas');
        resetearOpcionesDropdown(selectCargo, 'todos');
        resetearOpcionesDropdown(selectEstado, 'todos');
        resetearOpcionesDropdown(selectPartido, 'todos');
        sincronizarFiltrosCruzados();
        cargarLote(true);
    }

    let debounceTimer = null;
    function debounce(fn, delay) {
        return function (...args) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    let userHasScrolled = false;
    window.addEventListener('scroll', () => { userHasScrolled = true; }, { once: true, passive: true });

    if (btnCargarMas) {
        btnCargarMas.addEventListener('click', () => {
            userHasScrolled = true;
            cargarLote(false);
        });
    }

    if (sentinel && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            const first = entries[0];
            if (first && first.isIntersecting && hasMore && !isLoading && userHasScrolled) {
                cargarLote(false);
            }
        }, { rootMargin: '100px 0px' });
        observer.observe(sentinel);
    }

    if (inputTexto) inputTexto.addEventListener('input', debounce(() => cargarLote(true), 220));
    if (selectLeg) selectLeg.addEventListener('change', () => { sincronizarFiltrosCruzados(); cargarLote(true); });
    if (selectCargo) selectCargo.addEventListener('change', () => { sincronizarFiltrosCruzados(); cargarLote(true); });
    if (selectEstado) selectEstado.addEventListener('change', () => cargarLote(true));
    if (selectPartido) selectPartido.addEventListener('change', () => cargarLote(true));
    if (switchActivos) switchActivos.addEventListener('change', () => { sincronizarFiltrosCruzados(); cargarLote(true); });

    if (btnLimpiar) btnLimpiar.addEventListener('click', resetearFiltros);
    if (btnReset) btnReset.addEventListener('click', resetearFiltros);

    sincronizarFiltrosCruzados();

    function abrirReporteDesdeFiltros() {
        const texto = (inputTexto ? inputTexto.value : '').trim();
        const legText = selectLeg && selectLeg.options[selectLeg.selectedIndex] ? selectLeg.options[selectLeg.selectedIndex].text : '';
        const cargoText = selectCargo && selectCargo.options[selectCargo.selectedIndex] ? selectCargo.options[selectCargo.selectedIndex].text : '';
        const estadoText = selectEstado && selectEstado.options[selectEstado.selectedIndex] ? selectEstado.options[selectEstado.selectedIndex].text : '';
        const partidoText = selectPartido && selectPartido.options[selectPartido.selectedIndex] ? selectPartido.options[selectPartido.selectedIndex].text : '';
        const soloActivos = switchActivos ? switchActivos.checked : false;

        const cardsVisibles = Array.from(grid.querySelectorAll('.card-civic-hover, .card-civic')).slice(0, 15);
        const politicosVisibles = cardsVisibles.map(card => {
            const enlace = card.querySelector('h5 a, a.fw-bold') || card.querySelector('h5, strong');
            const nombre = enlace ? enlace.textContent.trim() : 'Sin nombre';
            const badgeCargo = card.querySelector('.badge.bg-primary-subtle, .badge.bg-danger-subtle, .badge');
            const cargo = badgeCargo ? badgeCargo.textContent.trim() : '';
            return { nombre, cargo };
        }).filter(p => p.nombre !== 'Sin nombre');

        const totalMostrados = parseInt(numMostrados ? numMostrados.textContent : '0') || 0;
        const totalRegistros = parseInt(numTotales ? numTotales.textContent : '0') || 0;

        const payload = {
            filtros_activos: {
                busqueda_texto: texto || '(ninguna)',
                legislatura: selectLeg ? selectLeg.value : '',
                legislatura_label: legText,
                cargo: selectCargo ? selectCargo.value : '',
                cargo_label: cargoText,
                entidad_federativa: selectEstado ? selectEstado.value : '',
                entidad_label: estadoText,
                partido_politico: selectPartido ? selectPartido.value : '',
                partido_label: partidoText,
                solo_en_funciones_lxvi: soloActivos
            },
            resultados_obtenidos: {
                total_filtrados: totalRegistros,
                mostrados_en_pantalla: totalMostrados,
                muestra_primeros_representantes: politicosVisibles
            },
            meta: {
                url_consulta: window.location.href,
                fecha_reporte: new Date().toISOString()
            }
        };

        const resumenHumano = `
            <div><strong>Filtros aplicados:</strong> Cargo: <code>${cargoText}</code> &bull; Estado: <code>${estadoText}</code> &bull; Partido: <code>${partidoText}</code> &bull; Legislatura: <code>${legText}</code> ${soloActivos ? '&bull; <em>Solo en funciones (LXVI)</em>' : ''}</div>
            <div class="text-muted mt-1">Resultados auditados: <strong>${totalRegistros}</strong> encontrados (${politicosVisibles.length} en pantalla).</div>
        `;

        let prellenadoDetalle = '';
        if (selectCargo && selectCargo.value === 'gobernador') {
            prellenadoDetalle = 'Reporto que en los resultados del filtro "Ex-Gobernadores" aparece(n) figura(s) que nunca ejercieron la titularidad de una Gubernatura o Jefatura de Gobierno: ';
        } else if (totalRegistros === 0) {
            prellenadoDetalle = 'Reporto inconsistencia en este cruce de filtros porque no arroja resultados o la información parece faltante: ';
        }

        if (typeof window.abrirModalReporte === 'function') {
            window.abrirModalReporte({
                tipo: 'filtro_directorio',
                id: 'filtro_' + (selectCargo ? selectCargo.value : '') + '_' + (selectEstado ? selectEstado.value : ''),
                nombre: 'Directorio: ' + cargoText + ' (' + estadoText + ')',
                url: window.location.href,
                filtrosJson: payload,
                filtrosHumano: resumenHumano,
                categoriaDefault: 'falso_positivo',
                prellenarDetalle: prellenadoDetalle
            });
        }
    }

    const btnReportarFiltros = document.getElementById('btnReportarFiltros');
    const btnReportarBanner = document.getElementById('btnReportarBanner');
    const btnReportarSinResultados = document.getElementById('btnReportarSinResultados');

    if (btnReportarFiltros) btnReportarFiltros.addEventListener('click', abrirReporteDesdeFiltros);
    if (btnReportarBanner) btnReportarBanner.addEventListener('click', abrirReporteDesdeFiltros);
    if (btnReportarSinResultados) btnReportarSinResultados.addEventListener('click', abrirReporteDesdeFiltros);

    if (hayFiltrosActivos()) cargarLote(true);
});

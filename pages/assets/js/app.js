/**
 * Proyecto Tlatoa — Controlador del Catálogo Estático (GitHub Pages)
 * Búsqueda reactiva multi-término, filtrado por cargo/estado y paginación progresiva.
 */

let ALL_DATA = [];
let CURRENT_FILTERED = [];
let currentCat = 'todos';
let currentState = 'todos';
let debounceTimer = null;
let lastQuery = '';
let renderedCount = 60;
let bsModalInstance = null;
let bsDownloadsModal = null;

const resultsGrid = document.getElementById('resultsGrid');
const searchInput = document.getElementById('searchInput');
const resultCount = document.getElementById('resultCount');
const latencyStat = document.getElementById('latencyStat');
const statusBadge = document.getElementById('statusBadge');
const stateFilter = document.getElementById('stateFilter');
const detailModalEl = document.getElementById('detailModal');
const downloadsModalEl = document.getElementById('downloadsModal');
const btnTop = document.getElementById('btnTop');

// Scroll suave al inicio
window.addEventListener('scroll', () => {
    if (btnTop) btnTop.style.display = window.scrollY > 400 ? 'flex' : 'none';
});

// Limpieza de hash al cerrar modal
if (detailModalEl) {
    detailModalEl.addEventListener('hidden.bs.modal', () => {
        if (window.location.hash.startsWith('#/politico/')) {
            history.replaceState(null, '', window.location.pathname + window.location.search);
        }
    });
}

function getModalInstance() {
    if (!bsModalInstance && typeof bootstrap !== 'undefined' && detailModalEl) {
        bsModalInstance = bootstrap.Modal.getOrCreateInstance(detailModalEl);
    }
    return bsModalInstance;
}

function openDownloadsModal() {
    if (!bsDownloadsModal && typeof bootstrap !== 'undefined' && downloadsModalEl) {
        bsDownloadsModal = bootstrap.Modal.getOrCreateInstance(downloadsModalEl);
    }
    if (bsDownloadsModal) bsDownloadsModal.show();
}

// Detección de conectividad PWA (Online / Offline)
function updateOnlineStatus() {
    const netBadge = document.getElementById('networkBadge');
    if (netBadge) {
        if (navigator.onLine) {
            netBadge.innerHTML = '<i class="bi bi-wifi text-success me-1"></i> En línea';
            netBadge.className = 'badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-1 small';
        } else {
            netBadge.innerHTML = '<i class="bi bi-wifi-off text-warning me-1"></i> Modo Offline (PWA)';
            netBadge.className = 'badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-2 py-1 small';
        }
    }
}
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Registro de Service Worker para PWA
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
}

async function loadData() {
    try {
        const res = await fetch('./data/search_index.json');
        ALL_DATA = await res.json();
        
        if (statusBadge) {
            statusBadge.innerHTML = `<i class="bi bi-circle-fill me-1" style="font-size:0.5rem;"></i> Catálogo Activo • ${ALL_DATA.length.toLocaleString()} Registros`;
        }

        if (stateFilter) {
            const states = [...new Set(ALL_DATA.map(d => d.e).filter(Boolean))].sort();
            states.forEach(st => {
                const opt = document.createElement('option');
                opt.value = st;
                opt.textContent = st;
                stateFilter.appendChild(opt);
            });
        }

        const params = new URLSearchParams(window.location.search);
        if (params.has('q')) {
            searchInput.value = params.get('q');
            lastQuery = params.get('q').toLowerCase();
        }
        if (params.has('cat')) {
            currentCat = params.get('cat');
            document.querySelectorAll('.filter-pill').forEach(b => {
                b.classList.toggle('active', b.dataset.cat === currentCat);
            });
        }
        if (params.has('estado') && stateFilter) {
            currentState = params.get('estado');
            stateFilter.value = currentState;
        }

        filterAndRender(true);
        updateOnlineStatus();

        const hash = window.location.hash.replace(/^#\/?(politico\/)?/, '');
        if (hash) openDetails(decodeURIComponent(hash));
    } catch (err) {
        if (resultsGrid) {
            resultsGrid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div style="font-size:3rem;margin-bottom:8px;">🦉</div>
                    <h5 class="fw-bold text-danger">No se pudo cargar el catálogo de datos</h5>
                    <p class="text-muted small">Verifica que el archivo <code>data/search_index.json</code> esté disponible.</p>
                </div>`;
        }
    }
}

// Filtros por Categoría
document.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCat = btn.dataset.cat;
        filterAndRender(true);
    });
});

if (stateFilter) {
    stateFilter.addEventListener('change', (e) => {
        currentState = e.target.value;
        filterAndRender(true);
    });
}

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        lastQuery = e.target.value.trim().toLowerCase();
        debounceTimer = setTimeout(() => filterAndRender(true), 50);
    });
}

function filterAndRender(resetPagination = false) {
    const t0 = performance.now();
    if (resetPagination) renderedCount = 60;

    let filtered = ALL_DATA;
    if (currentCat !== 'todos') filtered = filtered.filter(item => item.k === currentCat);
    if (currentState !== 'todos') filtered = filtered.filter(item => item.e === currentState);

    if (lastQuery.length > 0) {
        const tokens = lastQuery.split(/\s+/).filter(Boolean);
        filtered = filtered.filter(item => {
            const haystack = `${item.n} ${item.e} ${item.p} ${item.r}`.toLowerCase();
            return tokens.every(tok => haystack.includes(tok));
        });
    }

    CURRENT_FILTERED = filtered;
    const elapsed = (performance.now() - t0).toFixed(1);

    if (latencyStat) latencyStat.innerHTML = `Latencia: <strong class="text-success">${elapsed} ms</strong>`;
    if (resultCount) {
        resultCount.innerText = `Mostrando ${Math.min(renderedCount, filtered.length).toLocaleString()} de ${filtered.length.toLocaleString()} resultados`;
    }

    renderGrid(filtered.slice(0, renderedCount), filtered.length);
}

function loadMore() {
    renderedCount += 60;
    renderGrid(CURRENT_FILTERED.slice(0, renderedCount), CURRENT_FILTERED.length);
    if (resultCount) {
        resultCount.innerText = `Mostrando ${Math.min(renderedCount, CURRENT_FILTERED.length).toLocaleString()} de ${CURRENT_FILTERED.length.toLocaleString()} resultados`;
    }
}

function renderGrid(items, totalCount) {
    if (!resultsGrid) return;

    if (items.length === 0) {
        resultsGrid.innerHTML = `
            <div class="col-12 text-center py-5">
                <div style="font-size:3rem;margin-bottom:8px;">🦉</div>
                <h5 class="fw-bold text-dark">Sin coincidencias</h5>
                <p class="text-muted small">No se encontraron representantes para tu búsqueda o filtros seleccionados.</p>
            </div>`;
        return;
    }

    let html = items.map((p, idx) => {
        const color = p.c || '#4B5563';
        const photoUrl = resolvePhotoUrl(p.f, 160);
        const imgId = `card_img_${idx}`;
        
        let fotoHtml = '';
        if (photoUrl) {
            fotoHtml = `<img id="${imgId}" src="${encodeURI(photoUrl)}" alt="${escapeHtml(p.n)}" data-name="${escapeHtml(p.n)}" data-color="${escapeHtml(color)}" data-size="46" data-style="margin-right:12px;" loading="lazy" referrerpolicy="no-referrer" style="width:46px;height:46px;border-radius:50%;object-fit:cover;margin-right:12px;flex-shrink:0;background:#E5E7EB;border:1.5px solid rgba(0,0,0,0.08);" onerror="handleImgError(this)">`;
        } else {
            fotoHtml = `<img id="${imgId}" src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='46' height='46'></svg>" alt="${escapeHtml(p.n)}" data-name="${escapeHtml(p.n)}" data-color="${escapeHtml(color)}" data-size="46" data-style="margin-right:12px;" loading="lazy" style="width:46px;height:46px;border-radius:50%;object-fit:cover;margin-right:12px;flex-shrink:0;background:${color}15;border:1.5px solid ${color}35;" onerror="handleImgError(this)">`;
            setTimeout(() => {
                const el = document.getElementById(imgId);
                if (el) fetchWikipediaPhoto(p.n, el, 160);
            }, 10);
        }

        return `
        <div class="col">
            <div class="card-pol" onclick="openDetails('${escapeHtml(p.s)}')">
                <div>
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="badge rounded-pill fw-semibold" style="background-color:${color}18;color:${color};border:1px solid ${color}40;font-size:0.75rem;">
                            ${escapeHtml(p.p)}
                        </span>
                        <span class="text-secondary small d-flex align-items-center gap-1" style="font-size:0.78rem;">
                            <i class="bi bi-geo-alt"></i>${escapeHtml(p.e)}
                        </span>
                    </div>
                    <div class="d-flex align-items-center">
                        ${fotoHtml}
                        <div style="overflow:hidden;flex-grow:1;">
                            <div class="fw-bold text-dark text-truncate" style="font-size:0.92rem;" title="${escapeHtml(p.n)}">
                                ${escapeHtml(p.n)}
                            </div>
                            <div class="text-secondary small text-truncate" style="font-size:0.8rem;" title="${escapeHtml(p.r)}">
                                ${escapeHtml(p.r)}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="mt-2 pt-2 border-top d-flex justify-content-between align-items-center">
                    <span class="badge ${p.a ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'} rounded-pill" style="font-size:0.68rem;">
                        ${p.a ? '● En funciones' : '○ Histórico'}
                    </span>
                    <span class="text-primary small fw-semibold" style="font-size:0.78rem;">
                        Ver ficha <i class="bi bi-chevron-right" style="font-size:0.7rem;"></i>
                    </span>
                </div>
            </div>
        </div>`;
    }).join('');

    if (totalCount > renderedCount) {
        const remaining = totalCount - renderedCount;
        html += `
        <div class="col-12 text-center py-4">
            <button type="button" class="btn btn-outline-primary rounded-pill px-4 py-2 shadow-2xs fw-semibold small" onclick="loadMore()">
                <i class="bi bi-plus-circle me-1"></i> Cargar más representantes (+${Math.min(60, remaining).toLocaleString()})
            </button>
            <div class="text-muted mt-2" style="font-size:0.75rem;">Quedan ${remaining.toLocaleString()} resultados por mostrar.</div>
        </div>`;
    }

    resultsGrid.innerHTML = html;
}

function openDetails(slug) {
    const p = ALL_DATA.find(item => item.s === slug);
    if (!p) return;

    window.location.hash = `#/politico/${encodeURIComponent(slug)}`;

    const color = p.c || '#007AFF';
    const photoUrl = resolvePhotoUrl(p.f, 320);
    const modalImgId = 'modal_pol_img';

    let fotoHtml = '';
    if (photoUrl) {
        fotoHtml = `<img id="${modalImgId}" src="${encodeURI(photoUrl)}" alt="${escapeHtml(p.n)}" data-name="${escapeHtml(p.n)}" data-color="${escapeHtml(color)}" data-size="84" data-style="margin:0 auto 12px auto;display:flex;" loading="lazy" referrerpolicy="no-referrer" style="width:84px;height:84px;border-radius:50%;object-fit:cover;margin:0 auto 12px auto;display:block;background:#E5E7EB;border:3px solid #FFFFFF;box-shadow:0 4px 16px rgba(0,0,0,0.12);" onerror="handleImgError(this)">`;
    } else {
        fotoHtml = `<img id="${modalImgId}" src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='84' height='84'></svg>" alt="${escapeHtml(p.n)}" data-name="${escapeHtml(p.n)}" data-color="${escapeHtml(color)}" data-size="84" data-style="margin:0 auto 12px auto;display:flex;" style="width:84px;height:84px;border-radius:50%;object-fit:cover;margin:0 auto 12px auto;display:block;background:${color}15;border:3px solid #FFFFFF;box-shadow:0 4px 16px rgba(0,0,0,0.12);" onerror="handleImgError(this)">`;
        setTimeout(() => {
            const el = document.getElementById(modalImgId);
            if (el) fetchWikipediaPhoto(p.n, el, 320);
        }, 10);
    }

    const modalHeader = document.getElementById('modalPolHeader');
    if (modalHeader) {
        modalHeader.innerHTML = `
            <div class="text-center w-100 pb-2">
                ${fotoHtml}
                <h5 class="fw-bold text-dark mb-1">${escapeHtml(p.n)}</h5>
                <div class="d-flex justify-content-center gap-2 mt-2">
                    <span class="badge rounded-pill fw-semibold" style="background-color:${color}20;color:${color};border:1px solid ${color}40;padding:4px 12px;">
                        ${escapeHtml(p.p)}
                    </span>
                    <span class="badge ${p.a ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-secondary-subtle text-secondary border'} rounded-pill px-3 py-1">
                        ${p.a ? '✅ Activo / Vigente' : '📜 Histórico'}
                    </span>
                </div>
            </div>
        `;
    }

    const modalBody = document.getElementById('modalPolBody');
    if (modalBody) {
        modalBody.innerHTML = `
            <div class="d-flex flex-column gap-2 text-start small">
                <div class="p-2 rounded-3 bg-light border">
                    <div class="text-muted" style="font-size:0.75rem;">CARGO OFICIAL REGISTRADO</div>
                    <div class="fw-semibold text-dark">${escapeHtml(p.r)}</div>
                </div>
                <div class="p-2 rounded-3 bg-light border">
                    <div class="text-muted" style="font-size:0.75rem;">ENTIDAD FEDERATIVA</div>
                    <div class="fw-semibold text-dark">${escapeHtml(p.e)}</div>
                </div>
                <div class="p-2 rounded-3 bg-light border">
                    <div class="text-muted" style="font-size:0.75rem;">IDENTIFICADOR CANÓNICO (SLUG)</div>
                    <code class="text-primary">${escapeHtml(p.s)}</code>
                </div>
                <div class="p-3 rounded-3 border mt-1" style="background:#F8FAFC;">
                    <div class="d-flex align-items-center gap-1 text-success fw-bold mb-1">
                        <i class="bi bi-patch-check-fill"></i> Fuente Gubernamental Oficial (.gob.mx)
                    </div>
                    <p class="text-muted mb-2" style="font-size:0.8rem;">
                        Registro cotejado contra portales oficiales de transparencia gubernamental:
                    </p>
                    <div class="d-flex gap-2">
                        <a href="${escapeHtml(p.u)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-primary flex-grow-1 rounded-pill d-flex align-items-center justify-content-center gap-2">
                            <span>Verificar documento oficial</span>
                            <i class="bi bi-box-arrow-up-right"></i>
                        </a>
                        <button type="button" class="btn btn-sm btn-outline-secondary rounded-pill px-3" onclick="sharePolitico('${escapeHtml(p.s)}', '${escapeHtml(p.n)}', '${escapeHtml(p.r)}')" title="Compartir ficha cívica">
                            <i class="bi bi-share"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    const modal = getModalInstance();
    if (modal) modal.show();
}

loadData();

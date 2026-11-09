/**
 * Proyecto Tlatoa — Controlador de Catálogo Estático (GitHub Pages)
 * Búsqueda multi-término, descarga activa (CSV/JSON), Web Share API y modo PWA.
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

// Inicializar listener de scroll para volver arriba
window.addEventListener('scroll', () => {
    if (btnTop) {
        btnTop.style.display = window.scrollY > 400 ? 'flex' : 'none';
    }
});

// Listener de cierre de modal para limpiar URL hash
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

        // Poblar select de entidades federativas
        if (stateFilter) {
            const states = [...new Set(ALL_DATA.map(d => d.e).filter(Boolean))].sort();
            states.forEach(st => {
                const opt = document.createElement('option');
                opt.value = st;
                opt.textContent = st;
                stateFilter.appendChild(opt);
            });
        }

        // Sincronizar parámetros de URL (?q=...&cat=...&estado=...)
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

        // Soporte para deep link en hash (#/politico/slug o #slug)
        const hash = window.location.hash.replace(/^#\/?(politico\/)?/, '');
        if (hash) {
            openDetails(decodeURIComponent(hash));
        }
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

// Filtro por Estado
if (stateFilter) {
    stateFilter.addEventListener('change', (e) => {
        currentState = e.target.value;
        filterAndRender(true);
    });
}

// Búsqueda en vivo con debounce de 50ms
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        lastQuery = e.target.value.trim().toLowerCase();
        debounceTimer = setTimeout(() => filterAndRender(true), 50);
    });
}

// Búsqueda inteligente multi-término (multi-token search)
function filterAndRender(resetPagination = false) {
    const t0 = performance.now();
    if (resetPagination) {
        renderedCount = 60;
    }

    let filtered = ALL_DATA;

    if (currentCat !== 'todos') {
        filtered = filtered.filter(item => item.k === currentCat);
    }

    if (currentState !== 'todos') {
        filtered = filtered.filter(item => item.e === currentState);
    }

    if (lastQuery.length > 0) {
        const tokens = lastQuery.split(/\s+/).filter(Boolean);
        filtered = filtered.filter(item => {
            const haystack = `${item.n} ${item.e} ${item.p} ${item.r}`.toLowerCase();
            return tokens.every(tok => haystack.includes(tok));
        });
    }

    CURRENT_FILTERED = filtered;

    const elapsed = (performance.now() - t0).toFixed(1);
    if (latencyStat) {
        latencyStat.innerHTML = `Latencia: <strong class="text-success">${elapsed} ms</strong>`;
    }
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

function getInitials(name) {
    if (!name) return '🦉';
    const words = name.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function renderAvatarHtml(name, color, size, extraStyle = '') {
    const initials = getInitials(name);
    const bg = color ? color + '1F' : '#EFF6FF';
    const fg = color || '#1D4ED8';
    const border = color ? color + '40' : '#BFDBFE';
    const fontSize = Math.round(size * 0.38);
    return `<div style="width:${size}px;height:${size}px;min-width:${size}px;border-radius:50%;background:${bg};color:${fg};border:1.5px solid ${border};display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:${fontSize}px;flex-shrink:0;user-select:none;${extraStyle}">${escapeHtml(initials)}</div>`;
}

window.handleImgError = function(img) {
    const name = img.getAttribute('data-name') || '';
    const color = img.getAttribute('data-color') || '#4B5563';
    const size = parseInt(img.getAttribute('data-size') || '44', 10);
    const extraStyle = img.getAttribute('data-style') || '';
    const div = document.createElement('div');
    div.innerHTML = renderAvatarHtml(name, color, size, extraStyle);
    if (div.firstElementChild) {
        img.replaceWith(div.firstElementChild);
    }
};

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

    let html = items.map(p => {
        const color = p.c || '#4B5563';
        const fotoHtml = p.f 
            ? `<img src="${encodeURI(p.f)}" alt="${escapeHtml(p.n)}" data-name="${escapeHtml(p.n)}" data-color="${escapeHtml(color)}" data-size="44" data-style="margin-right:12px;" loading="lazy" referrerpolicy="no-referrer" style="width:44px;height:44px;border-radius:50%;object-fit:cover;margin-right:12px;flex-shrink:0;background:#E5E7EB;" onerror="handleImgError(this)">` 
            : renderAvatarHtml(p.n, color, 44, 'margin-right:12px;');
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
    const fotoHtml = p.f 
        ? `<img src="${encodeURI(p.f)}" alt="${escapeHtml(p.n)}" data-name="${escapeHtml(p.n)}" data-color="${escapeHtml(color)}" data-size="76" data-style="margin:0 auto 12px auto;display:flex;" loading="lazy" referrerpolicy="no-referrer" style="width:76px;height:76px;border-radius:50%;object-fit:cover;margin:0 auto 12px auto;display:block;background:#E5E7EB;border:2px solid #FFFFFF;box-shadow:0 4px 12px rgba(0,0,0,0.1);" onerror="handleImgError(this)">`
        : renderAvatarHtml(p.n, color, 76, 'margin:0 auto 12px auto;display:flex;');

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

// Módulo de Descarga Activa: Exportación de datos en cliente
function exportCurrentCSV() {
    if (!CURRENT_FILTERED.length) return;
    const headers = ["Nombre", "Cargo", "Entidad", "Partido", "Estatus", "Fuente_URL", "Slug"];
    const rows = CURRENT_FILTERED.map(p => [
        `"${(p.n || '').replace(/"/g, '""')}"`,
        `"${(p.r || '').replace(/"/g, '""')}"`,
        `"${(p.e || '').replace(/"/g, '""')}"`,
        `"${(p.p || '').replace(/"/g, '""')}"`,
        p.a ? '"Activo"' : '"Histórico"',
        `"${(p.u || '').replace(/"/g, '""')}"`,
        `"${(p.s || '')}"`
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    triggerBlobDownload(csvContent, `tlatoa_${currentCat}_${currentState}.csv`, "text/csv;charset=utf-8;");
}

function exportCurrentJSON() {
    if (!CURRENT_FILTERED.length) return;
    const jsonContent = JSON.stringify(CURRENT_FILTERED, null, 2);
    triggerBlobDownload(jsonContent, `tlatoa_${currentCat}_${currentState}.json`, "application/json;charset=utf-8;");
}

function triggerBlobDownload(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Módulo Web Share API nativo / Copiar enlace permanente
function sharePolitico(slug, name, cargo) {
    const fullUrl = `${window.location.origin}${window.location.pathname}#/politico/${encodeURIComponent(slug)}`;
    if (navigator.share) {
        navigator.share({
            title: `${name} — Proyecto Tlatoa`,
            text: `Consulta la ficha oficial de ${name} (${cargo}) en Proyecto Tlatoa:`,
            url: fullUrl
        }).catch(() => {});
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(fullUrl).then(() => {
            alert('Enlace cívico copiado al portapapeles');
        });
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

loadData();

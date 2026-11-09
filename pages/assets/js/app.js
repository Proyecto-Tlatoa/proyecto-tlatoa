/**
 * Proyecto Tlatoa — Controlador de Catálogo Estático (GitHub Pages)
 * Renderizado de alta velocidad con filtrado reactivo del lado del cliente.
 */

let ALL_DATA = [];
let currentCat = 'todos';
let currentState = 'todos';
let debounceTimer = null;
let lastQuery = '';
let bsModalInstance = null;

const resultsGrid = document.getElementById('resultsGrid');
const searchInput = document.getElementById('searchInput');
const resultCount = document.getElementById('resultCount');
const latencyStat = document.getElementById('latencyStat');
const statusBadge = document.getElementById('statusBadge');
const stateFilter = document.getElementById('stateFilter');
const detailModalEl = document.getElementById('detailModal');
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

function closeModal() {
    const modal = getModalInstance();
    if (modal) modal.hide();
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

        filterAndRender();

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
        filterAndRender();
    });
});

// Filtro por Estado
if (stateFilter) {
    stateFilter.addEventListener('change', (e) => {
        currentState = e.target.value;
        filterAndRender();
    });
}

// Búsqueda en vivo con debounce de 60ms
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        lastQuery = e.target.value.trim().toLowerCase();
        debounceTimer = setTimeout(filterAndRender, 60);
    });
}

function filterAndRender() {
    const t0 = performance.now();
    let filtered = ALL_DATA;

    if (currentCat !== 'todos') {
        filtered = filtered.filter(item => item.k === currentCat);
    }

    if (currentState !== 'todos') {
        filtered = filtered.filter(item => item.e === currentState);
    }

    if (lastQuery.length > 0) {
        filtered = filtered.filter(item => 
            item.n.toLowerCase().includes(lastQuery) ||
            item.e.toLowerCase().includes(lastQuery) ||
            item.p.toLowerCase().includes(lastQuery) ||
            item.r.toLowerCase().includes(lastQuery)
        );
    }

    const elapsed = (performance.now() - t0).toFixed(1);
    if (latencyStat) {
        latencyStat.innerHTML = `Latencia: <strong class="text-success">${elapsed} ms</strong>`;
    }
    if (resultCount) {
        resultCount.innerText = `Mostrando ${filtered.length.toLocaleString()} resultados de ${ALL_DATA.length.toLocaleString()}`;
    }

    const toRender = filtered.slice(0, 120);
    renderGrid(toRender, filtered.length);
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

    if (totalCount > 120) {
        html += `
        <div class="col-12 text-center py-3 text-muted small">
            <em>(Mostrando 120 de ${totalCount.toLocaleString()} resultados. Escribe más letras en el buscador para acotar con precisión).</em>
        </div>`;
    }

    resultsGrid.innerHTML = html;
}

function openDetails(slug) {
    const p = ALL_DATA.find(item => item.s === slug);
    if (!p) return;

    window.location.hash = '#/politico/' + encodeURIComponent(slug);

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
                    <a href="${escapeHtml(p.u)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-primary w-100 rounded-pill d-flex align-items-center justify-content-center gap-2">
                        <span>Verificar documento oficial</span>
                        <i class="bi bi-box-arrow-up-right"></i>
                    </a>
                </div>
            </div>
        `;
    }

    const modal = getModalInstance();
    if (modal) modal.show();
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

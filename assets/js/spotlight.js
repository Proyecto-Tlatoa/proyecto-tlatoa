/**
 * Proyecto Tlatoa — Spotlight Search Controller (Ctrl+K)
 * Modal accesible de búsqueda rápida de legisladores, estados y comisiones.
 */

(function () {
    const modal = document.getElementById('spotlightModal');
    const input = document.getElementById('spotlightInput');
    const resultsContainer = document.getElementById('spotlightResults');
    const btnOpen = document.getElementById('btnOpenSpotlight');
    const btnClose = document.getElementById('btnCloseSpotlight');

    if (!modal || !input || !resultsContainer) return;

    function openSpotlight() {
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
        input.value = '';
        resultsContainer.innerHTML = '<div class="text-center text-muted p-4 small">Comienza a escribir para buscar...</div>';
        setTimeout(() => input.focus(), 50);
    }

    function closeSpotlight() {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        if (btnOpen) btnOpen.focus();
    }

    if (btnOpen) btnOpen.addEventListener('click', openSpotlight);
    if (btnClose) btnClose.addEventListener('click', closeSpotlight);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeSpotlight();
    });

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            if (modal.style.display === 'flex') closeSpotlight();
            else openSpotlight();
        }
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            closeSpotlight();
        }
    });

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    let debounceTimer;
    input.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        clearTimeout(debounceTimer);
        if (query.length < 2) {
            resultsContainer.innerHTML = '<div class="text-center text-muted p-4 small">Escribe al menos 2 caracteres...</div>';
            return;
        }

        debounceTimer = setTimeout(() => {
            fetch(`/api/buscar?q=${encodeURIComponent(query)}`)
                .then(r => {
                    if (!r.ok) throw new Error('Error en búsqueda');
                    return r.json();
                })
                .then(data => {
                    const items = data.resultados || [];
                    if (items.length === 0) {
                        resultsContainer.innerHTML = '<div class="text-center text-muted p-4 small">No se encontraron resultados para "' + escapeHtml(query) + '"</div>';
                        return;
                    }
                    resultsContainer.innerHTML = items.map(item => `
                        <a href="${encodeURI(item.url || '#')}" class="d-flex align-items-center justify-content-between p-2 rounded text-decoration-none text-dark hover-bg">
                            <div>
                                <div class="fw-semibold small">${escapeHtml(item.nombre)}</div>
                                <span class="badge bg-light text-secondary border" style="font-size: 0.65rem;">${escapeHtml(item.camara || '')} &bull; ${escapeHtml(item.partido || '')}</span>
                            </div>
                            <small class="text-muted">${escapeHtml(item.entidad || '')}</small>
                        </a>
                    `).join('');
                })
                .catch(() => {
                    resultsContainer.innerHTML = '<div class="text-center text-danger p-4 small">Error al consultar el servicio</div>';
                });
        }, 200);
    });
})();

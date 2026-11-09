/**
 * Proyecto Tlatoa — Módulo Interactivo para Dossier de Presidentes
 * Controla el filtrado por semáforo de evidencias y la ventana flotante (modal)
 * con el orden requerido: Título -> Fuentes Citadas -> Aviso de Veracidad -> Noticia Completa.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Manejo del Semáforo de Filtrado
    const botonesFiltro = document.querySelectorAll('.btn-filtro-semaforo');
    const claimCards = document.querySelectorAll('.claim-card');

    botonesFiltro.forEach(btn => {
        btn.addEventListener('click', () => {
            botonesFiltro.forEach(b => {
                b.classList.remove('active', 'btn-dark', 'btn-success', 'btn-warning', 'btn-danger');
                const tipo = b.getAttribute('data-filter');
                if (tipo === 'todos') b.classList.add('btn-outline-dark');
                else if (tipo === 'verde') b.classList.add('btn-outline-success');
                else if (tipo === 'amarillo') b.classList.add('btn-outline-warning');
                else if (tipo === 'rojo') b.classList.add('btn-outline-danger');
            });

            btn.classList.add('active');
            const filtro = btn.getAttribute('data-filter');

            if (filtro === 'todos') btn.classList.add('btn-dark');
            else if (filtro === 'verde') btn.classList.add('btn-success', 'text-white');
            else if (filtro === 'amarillo') btn.classList.add('btn-warning');
            else if (filtro === 'rojo') btn.classList.add('btn-danger', 'text-white');

            claimCards.forEach(card => {
                const tipoFuente = card.getAttribute('data-tipo-fuente');
                if (filtro === 'todos' || tipoFuente === filtro) {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // 2. Manejo del Recuadro Flotante (Modal de Noticia Completa)
    const modalEl = document.getElementById('modalDetalleNoticia');
    if (!modalEl) return;

    const modalTitulo = document.getElementById('modalNoticiaTitulo');
    const modalCategoria = document.getElementById('modalNoticiaCategoriaBadge');
    const modalFuenteEnlace = document.getElementById('modalNoticiaFuenteEnlace');
    const modalFuenteNombre = document.getElementById('modalNoticiaFuenteNombre');
    const modalBtnAbrirFuente = document.getElementById('modalNoticiaBtnAbrirFuente');
    const modalAvisoCard = document.getElementById('modalNoticiaAvisoCard');
    const modalAvisoIcon = document.getElementById('modalNoticiaAvisoIcon');
    const modalAvisoTitulo = document.getElementById('modalNoticiaAvisoTitulo');
    const modalAvisoTexto = document.getElementById('modalNoticiaAvisoTexto');
    const modalDescripcion = document.getElementById('modalNoticiaDescripcion');

    const tarjetas = document.querySelectorAll('.card-noticia-interactiva');

    function abrirDetalleNoticia(tarjeta) {
        const titulo = tarjeta.getAttribute('data-titulo') || '';
        const categoria = tarjeta.getAttribute('data-categoria') || 'Dossier Presidencial';
        const fuenteTipo = tarjeta.getAttribute('data-fuente-tipo') || 'verde';
        const fuenteNombre = tarjeta.getAttribute('data-fuente-nombre') || 'Fuente Oficial';
        const fuenteUrl = tarjeta.getAttribute('data-fuente-url') || '#';
        const avisoVeracidad = tarjeta.getAttribute('data-aviso-veracidad') || '';
        const descripcion = tarjeta.getAttribute('data-descripcion') || '';

        // 1. TÍTULO
        if (modalTitulo) modalTitulo.textContent = titulo;
        if (modalCategoria) {
            modalCategoria.textContent = categoria;
            modalCategoria.className = 'badge rounded-pill px-2 py-1 font-monospace small ' +
                (categoria.toLowerCase().includes('logro') ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-warning-subtle text-dark border border-warning-subtle');
        }

        // 2. FUENTES CITADAS
        if (modalFuenteNombre) modalFuenteNombre.textContent = fuenteNombre;
        if (modalFuenteEnlace) {
            modalFuenteEnlace.href = fuenteUrl;
            modalFuenteEnlace.style.pointerEvents = (fuenteUrl === '#' || !fuenteUrl) ? 'none' : 'auto';
        }
        if (modalBtnAbrirFuente) {
            modalBtnAbrirFuente.href = fuenteUrl;
            modalBtnAbrirFuente.style.display = (fuenteUrl === '#' || !fuenteUrl) ? 'none' : 'inline-flex';
        }

        // 3. AVISO DE VERACIDAD
        if (modalAvisoCard && modalAvisoIcon && modalAvisoTitulo && modalAvisoTexto) {
            modalAvisoCard.className = 'mb-4 p-3 rounded-3 border';
            if (fuenteTipo === 'verde') {
                modalAvisoCard.classList.add('bg-success-subtle', 'border-success', 'text-success-emphasis');
                modalAvisoIcon.className = 'bi bi-patch-check-fill text-success fs-5';
                modalAvisoTitulo.textContent = '🟢 Información Verificable Oficial (Gob.mx / DOF)';
            } else if (fuenteTipo === 'amarillo') {
                modalAvisoCard.classList.add('bg-warning-subtle', 'border-warning', 'text-dark');
                modalAvisoIcon.className = 'bi bi-info-circle-fill text-warning-emphasis fs-5';
                modalAvisoTitulo.textContent = '🟡 Citación a Medios Coincidentes con Respaldo Sólido';
            } else {
                modalAvisoCard.classList.add('bg-danger-subtle', 'border-danger', 'text-danger-emphasis');
                modalAvisoIcon.className = 'bi bi-shield-x text-danger fs-5';
                modalAvisoTitulo.textContent = '🔴 Afirmación Sin Respaldo Sólido / Rumor no acreditado';
            }
            modalAvisoTexto.textContent = avisoVeracidad;
        }

        // 4. NOTICIA COMPLETA
        if (modalDescripcion) {
            modalDescripcion.textContent = descripcion;
        }

        // Abrir modal con Bootstrap
        if (window.bootstrap && window.bootstrap.Modal) {
            const bsModal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
            bsModal.show();
        }
    }

    tarjetas.forEach(tarjeta => {
        tarjeta.addEventListener('click', (e) => {
            // Evitar que el clic en el botón de fuente externa abra el modal en lugar de la fuente
            if (e.target.closest('a') && !e.target.closest('.btn-abrir-modal')) {
                return;
            }
            abrirDetalleNoticia(tarjeta);
        });

        // Soporte de accesibilidad con teclado (Enter o Espacio)
        tarjeta.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                abrirDetalleNoticia(tarjeta);
            }
        });
    });
});

/**
 * Proyecto Tlatoa — Módulo de Fotografías e Imágenes Oficiales
 * Soporta fotos locales, proxy seguro HTTPS (weserv) para portales gubernamentales
 * y descarga activa bajo demanda desde Wikipedia/Wikimedia con fallback a avatar.
 */

const WIKI_CACHE = {};

// Resolver URL de fotografía: Local vs CDN de alta velocidad para fotos .gob.mx
function resolvePhotoUrl(rawUrl, size = 160) {
    if (!rawUrl) return '';
    if (rawUrl.startsWith('./assets/')) return rawUrl;
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
        return `https://images.weserv.nl/?url=${encodeURIComponent(rawUrl)}&w=${size}&h=${size}&fit=cover&default=404`;
    }
    return '';
}

// Descarga activa bajo demanda desde Wikipedia para figuras sin foto SIL previa
async function fetchWikipediaPhoto(name, imgElement, size = 160) {
    if (!name || !imgElement || !navigator.onLine) return;
    const cacheKey = name.trim().toLowerCase();

    if (WIKI_CACHE[cacheKey]) {
        if (WIKI_CACHE[cacheKey] !== 'NOT_FOUND') {
            imgElement.src = WIKI_CACHE[cacheKey];
        }
        return;
    }

    try {
        const cleanTitle = name.trim().replace(/\s+/g, '_');
        const url = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTitle)}`;
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (res.ok) {
            const data = await res.json();
            if (data.thumbnail && data.thumbnail.source) {
                const proxyThumb = `https://images.weserv.nl/?url=${encodeURIComponent(data.thumbnail.source)}&w=${size}&h=${size}&fit=cover`;
                WIKI_CACHE[cacheKey] = proxyThumb;
                imgElement.src = proxyThumb;
                return;
            }
        }
        WIKI_CACHE[cacheKey] = 'NOT_FOUND';
    } catch {
        WIKI_CACHE[cacheKey] = 'NOT_FOUND';
    }
}

function getInitials(name) {
    if (!name) return '🦉';
    const words = name.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
}

function renderAvatarHtml(name, color, size, extraStyle = '') {
    const initials = getInitials(name);
    const bg = color ? `${color}1F` : '#EFF6FF';
    const fg = color || '#1D4ED8';
    const border = color ? `${color}40` : '#BFDBFE';
    const fontSize = Math.round(size * 0.38);
    return `<div style="width:${size}px;height:${size}px;min-width:${size}px;border-radius:50%;background:${bg};color:${fg};border:1.5px solid ${border};display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:${fontSize}px;flex-shrink:0;user-select:none;${extraStyle}">${escapeHtml(initials)}</div>`;
}

window.handleImgError = function(img) {
    const name = img.getAttribute('data-name') || '';
    const color = img.getAttribute('data-color') || '#4B5563';
    const size = parseInt(img.getAttribute('data-size') || '46', 10);
    const extraStyle = img.getAttribute('data-style') || '';
    const div = document.createElement('div');
    div.innerHTML = renderAvatarHtml(name, color, size, extraStyle);
    if (div.firstElementChild) img.replaceWith(div.firstElementChild);
};

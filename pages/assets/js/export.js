/**
 * Proyecto Tlatoa — Módulo de Exportación y Compartición Cívica
 * Descarga activa en cliente (CSV/JSON UTF-8) y Web Share API nativo.
 */

function exportCurrentCSV() {
    if (!CURRENT_FILTERED || !CURRENT_FILTERED.length) return;
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
    if (!CURRENT_FILTERED || !CURRENT_FILTERED.length) return;
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

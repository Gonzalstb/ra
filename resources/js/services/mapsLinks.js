function isAppleDevice() {
    return /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);
}

export function buildDirectionsUrl(from, to) {
    const origin = `${from.lat},${from.lng}`;
    const destination = `${to.lat},${to.lng}`;

    if (isAppleDevice()) {
        return `https://maps.apple.com/?saddr=${origin}&daddr=${destination}&dirflg=d`;
    }

    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
}

export function openDirections(from, to) {
    window.open(buildDirectionsUrl(from, to), '_blank', 'noopener,noreferrer');
}

export function mapsLinkHtml(from, to, label = 'Abrir en Maps') {
    const url = buildDirectionsUrl(from, to);
    return `<a href="${url}" target="_blank" rel="noopener noreferrer"
        class="inline-flex items-center gap-1 text-[10px] font-bold text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 px-2 py-1 rounded-lg border border-sky-500/20 transition">${label}</a>`;
}

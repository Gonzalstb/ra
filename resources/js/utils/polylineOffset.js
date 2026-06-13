/** Desplaza una polyline [lat,lng][] perpendicularmente (metros, lado derecho del recorrido). */
export function offsetPolylineLatLngs(coords, offsetMeters) {
    if (!coords?.length || !offsetMeters) return coords;
    if (coords.length === 1) return coords;

    const earthRadius = 6378137;
    const out = [];

    for (let i = 0; i < coords.length; i += 1) {
        const lat = coords[i][0];
        const lng = coords[i][1];
        const prev = coords[Math.max(0, i - 1)];
        const next = coords[Math.min(coords.length - 1, i + 1)];

        const dx = (next[1] - prev[1]) * Math.cos((lat * Math.PI) / 180);
        const dy = next[0] - prev[0];
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;

        const dLat = (offsetMeters / earthRadius) * (180 / Math.PI) * nx;
        const dLng = (offsetMeters / earthRadius) * (180 / Math.PI) * ny / Math.cos((lat * Math.PI) / 180);

        out.push([lat + dLat, lng + dLng]);
    }

    return out;
}

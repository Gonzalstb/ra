export function getOffsetLatLng(p1, p2, offsetMeters = 1500) {
    const latOffsetDegree = offsetMeters / 111111;
    const lngOffsetDegree = offsetMeters / (111111 * Math.cos((p1.lat + p2.lat) * Math.PI / 360));

    const dy = p2.lat - p1.lat;
    const dx = p2.lng - p1.lng;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) {
        return { p1Offset: p1, p2Offset: p2 };
    }

    const px = -dy / len;
    const py = dx / len;

    return {
        p1Offset: { lat: p1.lat + px * latOffsetDegree, lng: p1.lng + py * lngOffsetDegree },
        p2Offset: { lat: p2.lat + px * latOffsetDegree, lng: p2.lng + py * lngOffsetDegree },
    };
}

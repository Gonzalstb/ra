export function sameDayId(a, b) {
    return a != null && b != null && String(a) === String(b);
}

export function destinationBelongsToDay(dest, dayId) {
    if (dest?.dayId == null || dest.dayId === '') return false;
    return sameDayId(dest.dayId, dayId);
}

export function isTextOnlyDestination(dest) {
    return !!dest?.isTextOnly;
}

export function isWineryDestination(dest) {
    return !!dest?.isWinery;
}

export function destinationMapBadgeIcon(dest, routeIndex) {
    if (dest?.isReserved) return '✓';
    if (isWineryDestination(dest)) return '🍷';
    if (dest?.inRoute) return String(routeIndex + 1);
    return '🔍';
}

export function hasMapCoords(dest) {
    return !isTextOnlyDestination(dest)
        && dest?.lat != null
        && dest?.lng != null
        && !Number.isNaN(Number(dest.lat))
        && !Number.isNaN(Number(dest.lng));
}

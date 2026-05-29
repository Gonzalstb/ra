import { formatPrice } from './formatPrice';

export const DESTINATION_PLACE_META = {
    winery: {
        icon: '🍷',
        label: 'Bodega',
        badgeText: 'text-purple-300',
        badgeBg: 'bg-purple-500/10',
        badgeBorder: 'border-purple-500/30',
        mapBadgeColor: 'bg-purple-700',
    },
    hotel: {
        icon: '🛏️',
        label: 'Hotel',
        badgeText: 'text-teal-300',
        badgeBg: 'bg-teal-500/10',
        badgeBorder: 'border-teal-500/30',
        mapBadgeColor: 'bg-teal-700',
    },
    bar: {
        icon: '🍖',
        label: 'Bar',
        badgeText: 'text-orange-300',
        badgeBg: 'bg-orange-500/10',
        badgeBorder: 'border-orange-500/30',
        mapBadgeColor: 'bg-orange-700',
    },
};

const PLACE_EMOJI_BADGES = new Set(['🍷', '🛏️', '🍖']);

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

export function isHotelDestination(dest) {
    return !!dest?.isHotel;
}

export function isBarDestination(dest) {
    return !!dest?.isBar;
}

export function destinationPlaceType(dest) {
    if (isWineryDestination(dest)) return 'winery';
    if (isHotelDestination(dest)) return 'hotel';
    if (isBarDestination(dest)) return 'bar';
    return null;
}

export function placeTypeFromFlags({ isWinery, isHotel, isBar } = {}) {
    if (isWinery) return 'winery';
    if (isHotel) return 'hotel';
    if (isBar) return 'bar';
    return '';
}

export function flagsFromPlaceType(type) {
    return {
        isWinery: type === 'winery',
        isHotel: type === 'hotel',
        isBar: type === 'bar',
    };
}

export function destinationPlaceMeta(dest) {
    const type = destinationPlaceType(dest);
    return type ? DESTINATION_PLACE_META[type] : null;
}

export function hasDisplayPrice(dest) {
    return dest?.price != null && dest?.price !== '';
}

export function destinationPriceBadgeHtml(dest, { compact = false } = {}) {
    if (!hasDisplayPrice(dest)) return '';
    const size = compact ? 'text-[8px] font-black uppercase tracking-wide' : 'text-[9px] font-bold';
    return `<span data-price-badge="${dest.id}" class="hidden ${size} text-violet-300 bg-violet-950/80 px-1.5 py-0.5 rounded border border-violet-500/40">${formatPrice(dest.price)}</span>`;
}

export function destinationPlaceBadgeHtml(dest, { compact = false } = {}) {
    const meta = destinationPlaceMeta(dest);
    if (!meta) return '';
    const size = compact ? 'text-[8px] font-black uppercase tracking-wide' : 'text-[9px] font-bold';
    return `<span class="${size} ${meta.badgeText} ${meta.badgeBg} px-1.5 py-0.5 rounded border ${meta.badgeBorder}">${meta.icon} ${meta.label}</span>`;
}

/** Muestra u oculta el badge de precio junto al tipo de lugar (hotel, bodega…). */
export function toggleDestinationPriceBadge(destId) {
    document.querySelectorAll(`[data-price-badge="${destId}"]`).forEach((el) => {
        el.classList.toggle('hidden');
    });
}

export function canTogglePriceOnStop(dest) {
    return !!destinationPlaceMeta(dest) && hasDisplayPrice(dest);
}

export function destinationFreePoiLabel(dest) {
    const meta = destinationPlaceMeta(dest);
    return meta ? meta.icon : 'POI';
}

export function destinationMapBadgeIcon(dest, routeIndex) {
    if (dest?.isReserved) return '✓';
    const meta = destinationPlaceMeta(dest);
    if (meta) return meta.icon;
    if (dest?.inRoute) return String(routeIndex + 1);
    return '🔍';
}

export function destinationMapBadgeColor(dest) {
    if (dest?.isReserved) return 'bg-emerald-600';
    const meta = destinationPlaceMeta(dest);
    if (meta) return meta.mapBadgeColor;
    if (dest?.inRoute) return 'bg-rose-600';
    return 'bg-sky-600';
}

export function isPlaceEmojiBadge(icon) {
    return PLACE_EMOJI_BADGES.has(icon);
}

export function hasMapCoords(dest) {
    return !isTextOnlyDestination(dest)
        && dest?.lat != null
        && dest?.lng != null
        && !Number.isNaN(Number(dest.lat))
        && !Number.isNaN(Number(dest.lng));
}

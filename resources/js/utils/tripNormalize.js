import { normalizeDestinationsOrder } from '../state/plannerStore';
import { syncTripRouteFields } from '../services/routePlans';
import { syncRouteAndItinerary } from '../services/routeItinerarySync';

const PLACE_PREFIXES = [
    { key: 'isWinery', prefix: '[bodega]' },
    { key: 'isHotel', prefix: '[hotel]' },
    { key: 'isBar', prefix: '[bar]' },
];

function normalizeDescriptionFlags(d) {
    const description = d.description ?? '';
    const isTextOnly = !!d.isTextOnly || description.startsWith('[sin-mapa]');
    let cleanDescription = description;

    if (cleanDescription.startsWith('[sin-mapa] ')) {
        cleanDescription = cleanDescription.slice('[sin-mapa] '.length);
    }

    const flags = { isTextOnly };
    for (const { key, prefix } of PLACE_PREFIXES) {
        flags[key] = !!d[key] || description.startsWith(prefix);
        if (cleanDescription.startsWith(`${prefix} `)) {
            cleanDescription = cleanDescription.slice(`${prefix} `.length);
        }
    }

    return { ...flags, description: cleanDescription };
}

export function normalizeTrip(trip) {
    const base = {
        ...trip,
        days: trip.days ?? [],
        ownerId: trip.ownerId ?? null,
        isOwner: trip.isOwner !== false,
        canShare: trip.canShare !== false,
        activityLogs: Array.isArray(trip.activityLogs) ? trip.activityLogs : [],
        returnToStart: trip.returnToStart !== false,
        endingPoint: trip.endingPoint ?? null,
        routePlans: trip.routePlans ?? [],
        activeRoutePlanId: trip.activeRoutePlanId ?? null,
        destinations: normalizeDestinationsOrder(trip.destinations ?? []).map((d) => {
            const flags = normalizeDescriptionFlags(d);
            return {
                ...d,
                description: flags.description,
                dayId: d.dayId ?? null,
                isReserved: !!d.isReserved,
                isFavorite: !!d.isFavorite,
                isWinery: flags.isWinery,
                isHotel: flags.isHotel,
                isBar: flags.isBar,
                isTextOnly: flags.isTextOnly,
                price: d.price != null ? d.price : null,
                siteUrl: d.siteUrl ?? '',
                lat: flags.isTextOnly ? null : d.lat,
                lng: flags.isTextOnly ? null : d.lng,
            };
        }),
    };

    return syncRouteAndItinerary(syncTripRouteFields(base));
}

import { normalizeDestinationsOrder } from '../state/plannerStore';

export function normalizeTrip(trip) {
    return {
        ...trip,
        days: trip.days ?? [],
        returnToStart: trip.returnToStart !== false,
        endingPoint: trip.endingPoint ?? null,
        routeSegments: trip.routeSegments ?? [],
        destinations: normalizeDestinationsOrder(trip.destinations ?? []).map((d) => ({
            ...d,
            dayId: d.dayId ?? null,
            isReserved: !!d.isReserved,
            isWinery: !!d.isWinery,
            isTextOnly: !!d.isTextOnly,
            price: d.price != null ? d.price : null,
            lat: d.isTextOnly ? null : d.lat,
            lng: d.isTextOnly ? null : d.lng,
        })),
    };
}

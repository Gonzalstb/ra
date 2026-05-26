import { normalizeDestinationsOrder } from '../state/plannerStore';

function normalizeDescriptionFlags(d) {
    const description = d.description ?? '';
    const isTextOnly = !!d.isTextOnly || description.startsWith('[sin-mapa]');
    const isWinery = !!d.isWinery || description.startsWith('[bodega]');
    let cleanDescription = description;
    if (cleanDescription.startsWith('[sin-mapa] ')) {
        cleanDescription = cleanDescription.slice('[sin-mapa] '.length);
    }
    if (cleanDescription.startsWith('[bodega] ')) {
        cleanDescription = cleanDescription.slice('[bodega] '.length);
    }
    return { isTextOnly, isWinery, description: cleanDescription };
}

export function normalizeTrip(trip) {
    return {
        ...trip,
        days: trip.days ?? [],
        returnToStart: trip.returnToStart !== false,
        endingPoint: trip.endingPoint ?? null,
        routeSegments: trip.routeSegments ?? [],
        destinations: normalizeDestinationsOrder(trip.destinations ?? []).map((d) => {
            const flags = normalizeDescriptionFlags(d);
            return {
                ...d,
                description: flags.description,
                dayId: d.dayId ?? null,
                isReserved: !!d.isReserved,
                isWinery: flags.isWinery,
                isTextOnly: flags.isTextOnly,
                price: d.price != null ? d.price : null,
                lat: flags.isTextOnly ? null : d.lat,
                lng: flags.isTextOnly ? null : d.lng,
            };
        }),
    };
}

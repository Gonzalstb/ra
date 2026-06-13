import { parseDestPointKey, destPointKey } from './routing';
import { getActiveRouteSegments, withActiveRouteSegments } from './routePlans';
import { sameDayId } from '../utils/destinationHelpers';

/** Sincroniza dayId/travelDate entre tramos activos y paradas del itinerario. */
export function syncRouteAndItinerary(trip) {
    if (!trip) return trip;

    let destinations = [...(trip.destinations ?? [])];
    let segments = [...getActiveRouteSegments(trip)];

    segments.forEach((seg) => {
        if (!seg.dayId) return;
        const destId = parseDestPointKey(seg.toKey);
        if (!destId) return;
        destinations = destinations.map((d) => {
            if (d.id !== destId) return d;
            if (sameDayId(d.dayId, seg.dayId)) return d;
            return { ...d, dayId: seg.dayId, inRoute: d.isTextOnly ? d.inRoute : true };
        });
    });

    destinations.forEach((d) => {
        if (!d.dayId || d.isTextOnly) return;
        const key = destPointKey(d.id);
        const day = trip.days?.find((dayItem) => dayItem.id === d.dayId);
        segments = segments.map((seg) => {
            if (seg.toKey !== key) return seg;
            if (sameDayId(seg.dayId, d.dayId)) return seg;
            return {
                ...seg,
                dayId: d.dayId,
                travelDate: day?.date || seg.travelDate || null,
            };
        });
    });

    return {
        ...withActiveRouteSegments(trip, segments),
        destinations,
    };
}

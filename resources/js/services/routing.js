const legCache = new Map();

function legKey(from, to) {
    return `${from.lat.toFixed(5)},${from.lng.toFixed(5)}->${to.lat.toFixed(5)},${to.lng.toFixed(5)}`;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJsonWithRetry(url, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });
            if (response.ok) {
                return response.json();
            }
            if (response.status >= 500 && attempt < retries) {
                await sleep(400 * (attempt + 1));
                continue;
            }
            return null;
        } catch {
            if (attempt < retries) {
                await sleep(400 * (attempt + 1));
                continue;
            }
            return null;
        }
    }
    return null;
}

export function coordsNearlyEqual(a, b) {
    if (!a || !b) return false;
    return Math.abs(a.lat - b.lat) < 1e-5 && Math.abs(a.lng - b.lng) < 1e-5;
}

export function getTripEndPoint(trip) {
    if (trip.returnToStart !== false) {
        return { ...trip.startingPoint };
    }
    if (trip.endingPoint?.lat != null && trip.endingPoint?.lng != null) {
        return { ...trip.endingPoint };
    }
    return { ...trip.startingPoint };
}

export const ROUTE_POINT_START = 'start';
export const ROUTE_POINT_END = 'end';

export function destPointKey(destId) {
    return `dest:${destId}`;
}

export function parseDestPointKey(key) {
    if (!key?.startsWith('dest:')) return null;
    return key.slice(5);
}

/** Paradas con chincheta en el mapa (en ruta o punto libre). */
export function getMapDestinations(trip) {
    return (trip.destinations ?? []).filter(
        (d) => !d.isTextOnly && d.lat != null && d.lng != null
    );
}

/** Opciones para selects Desde / Hasta y selección en mapa. */
export function getRoutePointOptions(trip) {
    const options = [
        { key: ROUTE_POINT_START, label: `🟢 Origen: ${trip.startingPoint.name}` },
    ];

    const end = getTripEndPoint(trip);
    const endIsStart = trip.returnToStart !== false
        || (end.lat === trip.startingPoint.lat && end.lng === trip.startingPoint.lng);

    if (!endIsStart) {
        options.push({ key: ROUTE_POINT_END, label: `🏁 Final: ${end.name ?? 'Punto final'}` });
    }

    const routeIds = (trip.destinations ?? []).filter((d) => d.inRoute).map((d) => d.id);

    getMapDestinations(trip).forEach((d) => {
        const routeIndex = routeIds.indexOf(d.id);
        const prefix = routeIndex >= 0 ? `#${routeIndex + 1}` : '🔍';
        options.push({
            key: destPointKey(d.id),
            label: `${prefix} ${d.name}`,
        });
    });

    return options;
}

export function resolveRoutePoint(trip, pointKey) {
    if (!pointKey || pointKey === ROUTE_POINT_START) {
        return { ...trip.startingPoint, key: ROUTE_POINT_START };
    }
    if (pointKey === ROUTE_POINT_END) {
        const end = getTripEndPoint(trip);
        return { ...end, key: ROUTE_POINT_END };
    }
    const destId = parseDestPointKey(pointKey);
    if (destId) {
        const dest = trip.destinations.find((d) => d.id === destId);
        if (dest && dest.lat != null && dest.lng != null && !dest.isTextOnly) {
            return { lat: dest.lat, lng: dest.lng, name: dest.name, key: pointKey, destId: dest.id };
        }
    }
    return null;
}

import { getActiveRouteSegments } from './routePlans';

/** Convierte los tramos definidos por el usuario en geometría dibujable. */
export function resolveDrawableSegments(trip) {
    const plan = getActiveRouteSegments(trip);
    const drawable = [];

    for (const seg of plan) {
        const from = resolveRoutePoint(trip, seg.fromKey);
        const to = resolveRoutePoint(trip, seg.toKey);
        if (!from || !to) continue;
        if (from.lat === to.lat && from.lng === to.lng) continue;

        const toDestId = parseDestPointKey(seg.toKey);

        drawable.push({
            id: seg.id,
            from,
            to,
            sameRoadAs: seg.sameRoadAs || null,
            toDestId,
        });
    }

    return drawable;
}

export function reverseGeometry(geometry) {
    return geometry?.length ? [...geometry].reverse() : [];
}

export async function fetchRouteLeg(from, to) {
    const key = legKey(from, to);
    if (legCache.has(key)) {
        return legCache.get(key);
    }

    const params = new URLSearchParams({
        fromLat: from.lat,
        fromLng: from.lng,
        toLat: to.lat,
        toLng: to.lng,
    });

    const data = await fetchJsonWithRetry(`/route-leg?${params}`);
    if (data) {
        legCache.set(key, data);
    }
    return data;
}

export async function computeRouteDurations(trip) {
    const segments = resolveDrawableSegments(trip);
    const durationById = {};
    const legBySegmentId = new Map();

    for (const seg of segments) {
        if (seg.sameRoadAs) {
            const ref = legBySegmentId.get(seg.sameRoadAs);
            if (ref?.durationMin && seg.toDestId) {
                durationById[seg.toDestId] = formatDuration(ref.durationMin);
            }
            continue;
        }

        const leg = await fetchRouteLeg(
            { lat: seg.from.lat, lng: seg.from.lng },
            { lat: seg.to.lat, lng: seg.to.lng }
        );
        if (!leg) continue;

        legBySegmentId.set(seg.id, leg);

        if (seg.toDestId) {
            durationById[seg.toDestId] = leg.durationFormatted ?? formatDuration(leg.durationMin);
        }
    }

    return durationById;
}

export function formatDuration(minutes) {
    const m = Math.round(minutes);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return rest > 0 ? `${h}h ${rest}m` : `${h}h`;
}

export function clearRouteLegCache() {
    legCache.clear();
}

/** Resumen para chip del mapa (usa caché OSRM si existe). */
export function estimateRouteSummary(trip) {
    const plan = getActiveRouteSegments(trip);
    const drawable = resolveDrawableSegments(trip);
    let totalMin = 0;
    let cachedLegs = 0;

    for (const seg of drawable) {
        const leg = legCache.get(legKey(
            { lat: seg.from.lat, lng: seg.from.lng },
            { lat: seg.to.lat, lng: seg.to.lng }
        ));
        if (leg?.durationMin) {
            totalMin += leg.durationMin;
            cachedLegs += 1;
        }
    }

    return {
        segmentCount: plan.length,
        durationLabel: cachedLegs > 0 ? formatDuration(totalMin) : '',
    };
}

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

    const stopOrder = getRouteStopOrderByDestId(trip);

    getMapDestinations(trip).forEach((d) => {
        const orderNum = stopOrder.get(String(d.id));
        const prefix = orderNum != null ? `${orderNum}.` : '🔍';
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

import { getActiveRouteSegments, ensureRoutePlans } from './routePlans';

/** Orden 1-based de paradas según llegadas (toKey) en la ruta activa. */
export function getRouteStopOrderByDestId(trip) {
    const normalized = ensureRoutePlans(trip);
    const orderMap = new Map();
    let seq = 0;

    getActiveRouteSegments(normalized).forEach((seg) => {
        const destId = parseDestPointKey(seg.toKey);
        if (!destId) return;
        const key = String(destId);
        if (orderMap.has(key)) return;
        const dest = normalized.destinations?.find((d) => String(d.id) === key);
        if (!dest || dest.isTextOnly || dest.lat == null || dest.lng == null) return;
        seq += 1;
        orderMap.set(key, seq);
    });

    if (!orderMap.size) {
        normalized.destinations
            ?.filter((d) => d.inRoute && !d.isTextOnly && d.lat != null && d.lng != null)
            .forEach((d, i) => orderMap.set(String(d.id), i + 1));
    }

    return orderMap;
}

export function getDestRouteOrderNumber(trip, destId) {
    if (destId == null || destId === '') return null;
    return getRouteStopOrderByDestId(trip).get(String(destId)) ?? null;
}

/** IDs de paradas referenciadas en tramos (todas las rutas alternativas). */
export function getRouteReferencedDestIds(trip) {
    const ids = new Set();
    ensureRoutePlans(trip).routePlans.forEach((plan) => {
        (plan.segments ?? []).forEach((seg) => {
            const fromId = parseDestPointKey(seg.fromKey);
            const toId = parseDestPointKey(seg.toKey);
            if (fromId) ids.add(String(fromId));
            if (toId) ids.add(String(toId));
        });
    });
    return ids;
}

/** Parada que debe seguir visible en modo «solo ruta». */
export function isDestinationOnMapRoute(trip, dest) {
    if (!dest || dest.isTextOnly || dest.lat == null || dest.lng == null) return false;
    if (dest.inRoute) return true;
    return getRouteReferencedDestIds(trip).has(String(dest.id));
}

export function isOffRouteMapPoint(trip, dest) {
    if (!dest || dest.isTextOnly || dest.lat == null || dest.lng == null) return false;
    return !isDestinationOnMapRoute(trip, dest);
}

/** Convierte los tramos definidos por el usuario en geometría dibujable. */
export function resolveDrawableSegments(trip, segmentsOverride = null) {
    const plan = segmentsOverride ?? getActiveRouteSegments(trip);
    const drawable = [];

    for (const seg of plan) {
        const from = resolveRoutePoint(trip, seg.fromKey);
        const to = resolveRoutePoint(trip, seg.toKey);
        if (!from || !to) continue;
        if (from.lat === to.lat && from.lng === to.lng) continue;

        const toDestId = parseDestPointKey(seg.toKey);

        drawable.push({
            id: seg.id,
            fromKey: seg.fromKey,
            toKey: seg.toKey,
            from,
            to,
            sameRoadAs: seg.sameRoadAs || null,
            toDestId,
            lineColor: seg.lineColor || null,
        });
    }

    return drawable;
}

export function defaultSegmentLineColor(sameRoadAs) {
    return sameRoadAs ? '#a855f7' : '#10b981';
}

export const SEGMENT_LINE_COLORS = [
    '#10b981',
    '#3b82f6',
    '#f59e0b',
    '#ef4444',
    '#a855f7',
    '#ec4899',
    '#06b6d4',
    '#84cc16',
    '#f97316',
    '#6366f1',
];

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

function cachedLegForDrawable(trip, drawable) {
    if (drawable.sameRoadAs) {
        const ref = resolveDrawableSegments(trip).find((s) => s.id === drawable.sameRoadAs);
        if (!ref) return null;
        return legCache.get(legKey(
            { lat: ref.from.lat, lng: ref.from.lng },
            { lat: ref.to.lat, lng: ref.to.lng },
        ));
    }
    return legCache.get(legKey(
        { lat: drawable.from.lat, lng: drawable.from.lng },
        { lat: drawable.to.lat, lng: drawable.to.lng },
    ));
}

/** Tiempo en coche de un tramo (caché OSRM o estimación de la parada). */
export function getSegmentDurationInfo(trip, seg) {
    const drawable = resolveDrawableSegments(trip).find((s) => s.id === seg.id);
    if (!drawable) return null;

    const leg = cachedLegForDrawable(trip, drawable);
    if (leg?.durationMin != null) {
        return {
            label: leg.durationFormatted ?? formatDuration(leg.durationMin),
            distanceKm: leg.distanceKm ?? null,
            source: 'route',
        };
    }

    const destId = parseDestPointKey(seg.toKey);
    if (destId) {
        const dest = trip.destinations?.find((d) => d.id === destId);
        if (dest?.duration) {
            return { label: dest.duration, distanceKm: null, source: 'estimate' };
        }
    }

    return null;
}

/** Precarga tiempos OSRM de tramos que aún no están en caché. */
export async function prefetchRouteLegDurations(trip) {
    const segments = resolveDrawableSegments(trip);
    const legBySegmentId = new Map();
    let updated = false;

    for (const seg of segments) {
        if (seg.sameRoadAs) continue;

        const from = { lat: seg.from.lat, lng: seg.from.lng };
        const to = { lat: seg.to.lat, lng: seg.to.lng };
        if (legCache.has(legKey(from, to))) continue;

        const leg = await fetchRouteLeg(from, to);
        if (leg) {
            legBySegmentId.set(seg.id, leg);
            updated = true;
        }
    }

    return updated;
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

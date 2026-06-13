/** @typedef {{ id: string, name: string, segments: Array<{ id: string, fromKey: string, toKey: string, sameRoadAs: string|null }> }} RoutePlan */

import { ROUTE_POINT_START, destPointKey } from './routing';

function legacyRouteSegments(trip) {
    return Array.isArray(trip.routeSegments) ? [...trip.routeSegments] : [];
}

function repairRoutePlansFromLegacy(trip) {
    const legacySegments = legacyRouteSegments(trip);
    if (!legacySegments.length) return trip;

    const routePlans = trip.routePlans.map((plan, index) => {
        if ((plan.segments?.length ?? 0) > 0) return plan;
        const activeId = trip.activeRoutePlanId ?? trip.routePlans[0]?.id;
        if (plan.id === activeId || (index === 0 && !activeId)) {
            return { ...plan, segments: legacySegments };
        }
        return plan;
    });

    const anyHasSegments = routePlans.some((p) => (p.segments?.length ?? 0) > 0);
    if (!anyHasSegments) {
        routePlans[0] = { ...routePlans[0], segments: legacySegments };
    }

    const activeId = trip.activeRoutePlanId ?? routePlans[0]?.id;
    const activeSegments = routePlans.find((p) => p.id === activeId)?.segments ?? legacySegments;

    return {
        ...trip,
        routePlans,
        activeRoutePlanId: activeId,
        routeSegments: activeSegments,
    };
}

export function ensureRoutePlans(trip) {
    if (Array.isArray(trip.routePlans) && trip.routePlans.length > 0) {
        const activeId = trip.activeRoutePlanId ?? trip.routePlans[0]?.id;
        const activePlan = trip.routePlans.find((p) => p.id === activeId) ?? trip.routePlans[0];
        const activeSegments = activePlan?.segments ?? [];
        const legacySegments = legacyRouteSegments(trip);

        if (!activeSegments.length && legacySegments.length) {
            return repairRoutePlansFromLegacy(trip);
        }

        const anyPlanHasSegments = trip.routePlans.some((p) => (p.segments?.length ?? 0) > 0);
        if (!anyPlanHasSegments && legacySegments.length) {
            return repairRoutePlansFromLegacy(trip);
        }

        return trip;
    }

    const segments = legacyRouteSegments(trip);
    const id = 'rp-1';

    return {
        ...trip,
        routePlans: [{ id, name: 'Ruta 1', segments }],
        activeRoutePlanId: id,
        routeSegments: segments,
    };
}

/** @returns {RoutePlan|null} */
export function getActiveRoutePlan(trip) {
    const normalized = ensureRoutePlans(trip);
    const activeId = normalized.activeRoutePlanId ?? normalized.routePlans[0]?.id;

    return normalized.routePlans.find((p) => p.id === activeId)
        ?? normalized.routePlans[0]
        ?? null;
}

export function getActiveRouteSegments(trip) {
    return getActiveRoutePlan(trip)?.segments ?? [];
}

export function getActiveRoutePlanName(trip) {
    return getActiveRoutePlan(trip)?.name ?? 'Ruta 1';
}

export function withActiveRouteSegments(trip, segments) {
    const normalized = ensureRoutePlans(trip);
    const activeId = normalized.activeRoutePlanId ?? normalized.routePlans[0]?.id;
    const nextSegments = [...segments];

    const routePlans = normalized.routePlans.map((plan) =>
        (plan.id === activeId ? { ...plan, segments: nextSegments } : plan)
    );

    return {
        ...normalized,
        routePlans,
        activeRoutePlanId: activeId,
        routeSegments: nextSegments,
    };
}

export function withActiveRoutePlanId(trip, planId) {
    const normalized = ensureRoutePlans(trip);
    if (!normalized.routePlans.some((p) => p.id === planId)) {
        return normalized;
    }

    const plan = normalized.routePlans.find((p) => p.id === planId);

    return {
        ...normalized,
        activeRoutePlanId: planId,
        routeSegments: plan?.segments ?? [],
    };
}

export function addRoutePlan(trip) {
    const normalized = ensureRoutePlans(trip);
    const num = normalized.routePlans.length + 1;
    const id = `rp-${Date.now()}`;
    const newPlan = { id, name: `Ruta ${num}`, segments: [] };

    return {
        ...normalized,
        routePlans: [...normalized.routePlans, newPlan],
        activeRoutePlanId: id,
        routeSegments: [],
    };
}

function cloneRoutePlanSegments(segments) {
    const list = Array.isArray(segments) ? segments : [];
    if (!list.length) return [];

    const idMap = new Map();
    const ts = Date.now();
    const cloned = list.map((seg, i) => {
        const newId = `seg-${ts}-${i}`;
        idMap.set(seg.id, newId);
        return { ...seg, id: newId };
    });

    return cloned.map((seg) => {
        if (!seg.sameRoadAs) return seg;
        const mapped = idMap.get(seg.sameRoadAs);
        return mapped ? { ...seg, sameRoadAs: mapped } : { ...seg, sameRoadAs: null };
    });
}

export function duplicateRoutePlan(trip, sourcePlanId) {
    const normalized = ensureRoutePlans(trip);
    const source = normalized.routePlans.find((p) => p.id === sourcePlanId);
    if (!source) return normalized;

    const id = `rp-${Date.now()}`;
    const segments = cloneRoutePlanSegments(source.segments);
    const baseName = (source.name ?? 'Ruta').trim();
    const newPlan = {
        id,
        name: `${baseName} (copia)`,
        segments,
    };

    return {
        ...normalized,
        routePlans: [...normalized.routePlans, newPlan],
        activeRoutePlanId: id,
        routeSegments: segments,
    };
}

export function removeRoutePlan(trip, planId) {
    const normalized = ensureRoutePlans(trip);
    if (normalized.routePlans.length <= 1) {
        return normalized;
    }

    const routePlans = normalized.routePlans.filter((p) => p.id !== planId);
    const activeId = normalized.activeRoutePlanId === planId
        ? routePlans[0].id
        : normalized.activeRoutePlanId;
    const active = routePlans.find((p) => p.id === activeId);

    return {
        ...normalized,
        routePlans,
        activeRoutePlanId: activeId,
        routeSegments: active?.segments ?? [],
    };
}

export function renameRoutePlan(trip, planId, name) {
    const normalized = ensureRoutePlans(trip);
    const trimmed = (name ?? '').trim();
    if (!trimmed) {
        return normalized;
    }

    const routePlans = normalized.routePlans.map((plan) =>
        (plan.id === planId ? { ...plan, name: trimmed } : plan)
    );

    return { ...normalized, routePlans };
}

export function syncTripRouteFields(trip) {
    const normalized = ensureRoutePlans(trip);
    const segments = getActiveRouteSegments(normalized);

    return {
        ...normalized,
        routeSegments: segments,
    };
}

/** Cadena origen → paradas en el orden indicado; conserva metadatos de tramos existentes por toKey. */
export function buildChainSegmentsForRoute(trip, route) {
    if (!route.length) return [];

    const oldSegments = getActiveRouteSegments(trip);
    const oldByToKey = new Map(oldSegments.map((s) => [s.toKey, s]));

    let fromKey = ROUTE_POINT_START;
    const ts = Date.now();

    return route.map((d, i) => {
        const toKey = destPointKey(d.id);
        const prev = oldByToKey.get(toKey);
        const day = d.dayId ? trip.days?.find((dayItem) => dayItem.id === d.dayId) : null;
        const seg = {
            id: prev?.id ?? `seg-${ts}-${i}`,
            fromKey,
            toKey,
            sameRoadAs: null,
            dayId: prev?.dayId ?? d.dayId ?? null,
            travelDate: prev?.travelDate ?? day?.date ?? null,
            lineColor: prev?.lineColor ?? null,
        };
        fromKey = toKey;
        return seg;
    });
}

export function buildChainSegmentsForTrip(trip) {
    const route = (trip.destinations ?? []).filter((d) => d.inRoute);
    return buildChainSegmentsForRoute(trip, route);
}

export function reorderActiveRouteSegmentsToMatchDestinations(trip, routeOverride = null) {
    const route = routeOverride ?? (trip.destinations ?? []).filter((d) => d.inRoute);
    const segments = buildChainSegmentsForRoute(trip, route);
    return withActiveRouteSegments(trip, segments);
}

/** @typedef {{ id: string, name: string, segments: Array<{ id: string, fromKey: string, toKey: string, sameRoadAs: string|null }> }} RoutePlan */

export function ensureRoutePlans(trip) {
    if (Array.isArray(trip.routePlans) && trip.routePlans.length > 0) {
        return trip;
    }

    const segments = Array.isArray(trip.routeSegments) ? [...trip.routeSegments] : [];
    const id = 'rp-1';

    return {
        ...trip,
        routePlans: [{ id, name: 'Ruta 1', segments }],
        activeRoutePlanId: id,
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

import { ensureRoutePlans, getActiveRoutePlan } from './routePlans';

export function segmentRouteKey(fromKey, toKey) {
    return `${fromKey}|${toKey}`;
}

/** Mapa tramo (from|to) → rutas que lo comparten. */
export function getOverlappingSegmentInfo(trip) {
    const normalized = ensureRoutePlans(trip);
    const byKey = new Map();

    normalized.routePlans.forEach((plan) => {
        (plan.segments ?? []).forEach((seg) => {
            if (!seg.fromKey || !seg.toKey || seg.fromKey === seg.toKey) return;
            const key = segmentRouteKey(seg.fromKey, seg.toKey);
            if (!byKey.has(key)) byKey.set(key, []);
            byKey.get(key).push({
                planId: plan.id,
                planName: plan.name,
                segId: seg.id,
            });
        });
    });

    const overlaps = new Map();
    byKey.forEach((entries, key) => {
        const uniquePlans = [...new Map(entries.map((e) => [e.planId, e])).values()];
        if (uniquePlans.length > 1) {
            overlaps.set(key, uniquePlans);
        }
    });

    return overlaps;
}

export function isSegmentOverlapping(trip, seg) {
    if (!seg?.fromKey || !seg?.toKey) return false;
    return getOverlappingSegmentInfo(trip).has(segmentRouteKey(seg.fromKey, seg.toKey));
}

export function overlappingPlanNamesForSegment(trip, seg, excludePlanId = null) {
    if (!seg?.fromKey || !seg?.toKey) return [];
    const plans = getOverlappingSegmentInfo(trip).get(segmentRouteKey(seg.fromKey, seg.toKey)) ?? [];
    return plans
        .filter((p) => p.planId !== excludePlanId)
        .map((p) => p.planName);
}

export function tripHasRouteOverlaps(trip) {
    return getOverlappingSegmentInfo(trip).size > 0;
}

export function getActivePlanId(trip) {
    return getActiveRoutePlan(trip)?.id ?? ensureRoutePlans(trip).routePlans[0]?.id ?? null;
}

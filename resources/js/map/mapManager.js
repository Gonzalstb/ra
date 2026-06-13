import { getActiveTrip, splitDestinations, updateActiveTrip, isHideOffRouteMapPoints } from '../state/plannerStore';
import {
    fetchRouteLeg,
    formatDuration,
    clearRouteLegCache,
    resolveDrawableSegments,
    computeRouteDurations,
    reverseGeometry,
    getTripEndPoint,
    coordsNearlyEqual,
    getMapDestinations,
} from '../services/routing';
import { ensureRoutePlans, getActiveRouteSegments } from '../services/routePlans';
import { getOverlappingSegmentInfo, segmentRouteKey, tripHasRouteOverlaps } from '../services/routeOverlap';
import { effectiveSegmentLineColor, buildSegmentColorPopupHtml } from '../utils/segmentColorUi';
import { offsetPolylineLatLngs } from '../utils/polylineOffset';
import { mapsLinkHtml } from '../services/mapsLinks';
import { showAlert } from '../ui/alerts';
import {
    destinationMapBadgeColor, destinationMapBadgeIcon, destinationPlaceBadgeHtml,
    destinationPriceBadgeHtml, isPlaceEmojiBadge, canTogglePriceOnStop,
    toggleDestinationPriceBadge,
} from '../utils/destinationHelpers';
import { ROUTE_POINT_END, ROUTE_POINT_START, destPointKey } from '../services/routing';

let mapInstance = null;
const layers = { markers: [], polylines: [], labels: [] };
let routeMapHandlers = {
    onSelectPoint: null,
    onDeleteSegmentRequest: null,
    onSegmentColorChange: null,
    getPendingFromPoint: null,
    isRoutePickPending: null,
};

export function setRouteMapHandlers(handlers = {}) {
    routeMapHandlers = { ...routeMapHandlers, ...handlers };
}

export function initMap(container, onMapClick) {
    if (!window.L || mapInstance) {
        return mapInstance;
    }

    const trip = getActiveTrip();
    const initialCenter = trip
        ? [trip.startingPoint.lat, trip.startingPoint.lng]
        : [20, 0];
    const initialZoom = trip ? 10 : 2;

    const map = window.L.map(container, {
        center: initialCenter,
        zoom: initialZoom,
        zoomControl: false,
        worldCopyJump: true,
    });

    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20,
    }).addTo(map);

    window.L.control.zoom({ position: 'bottomright' }).addTo(map);
    map.on('click', onMapClick);
    container.addEventListener('click', (e) => {
        const pickBtn = e.target.closest('[data-route-pick-point]');
        if (pickBtn) {
            const pointKey = pickBtn.dataset.routePickPoint;
            routeMapHandlers.onSelectPoint?.(pointKey);
            map.closePopup();
            return;
        }

        const colorBtn = e.target.closest('[data-seg-color]');
        if (colorBtn) {
            routeMapHandlers.onSegmentColorChange?.(colorBtn.dataset.segColor, colorBtn.dataset.color || null);
            map.closePopup();
            return;
        }

        const resetColorBtn = e.target.closest('[data-seg-color-reset]');
        if (resetColorBtn) {
            routeMapHandlers.onSegmentColorChange?.(resetColorBtn.dataset.segColorReset, null);
            map.closePopup();
            return;
        }

        const delPopupBtn = e.target.closest('[data-seg-delete-popup]');
        if (delPopupBtn) {
            routeMapHandlers.onDeleteSegmentRequest?.(delPopupBtn.dataset.segDeletePopup);
            map.closePopup();
        }

        const priceStop = e.target.closest('[data-toggle-price-on-stop]');
        if (priceStop) {
            e.stopPropagation();
            toggleDestinationPriceBadge(priceStop.dataset.togglePriceOnStop);
        }
    });
    mapInstance = map;

    return map;
}

export function getMap() {
    return mapInstance;
}

export function invalidateSize() {
    mapInstance?.invalidateSize();
}

export function focusOnLocation(lat, lng, isStart = false) {
    mapInstance?.setView([lat, lng], isStart ? 11 : 12, { animate: true, duration: 1.2 });
}

export function fitTripBounds() {
    const trip = getActiveTrip();
    if (!mapInstance || !trip) return;

    const activeRoutes = trip.destinations.filter((d) => d.inRoute && d.lat != null && d.lng != null && !d.isTextOnly);
    if (activeRoutes.length > 0) {
        const end = getTripEndPoint(trip);
        const coordsList = [
            [trip.startingPoint.lat, trip.startingPoint.lng],
            ...activeRoutes.map((d) => [d.lat, d.lng]),
            [end.lat, end.lng],
        ];
        mapInstance.fitBounds(window.L.latLngBounds(coordsList), { padding: [60, 60] });
    } else {
        mapInstance.setView([trip.startingPoint.lat, trip.startingPoint.lng], 10);
    }
}

export function fitDestinationsBounds(destinations) {
    const withCoords = (destinations ?? []).filter((d) => d.lat != null && d.lng != null && !d.isTextOnly);
    if (!mapInstance || !withCoords.length) return;

    const trip = getActiveTrip();
    const coords = trip
        ? [[trip.startingPoint.lat, trip.startingPoint.lng], ...withCoords.map((d) => [d.lat, d.lng])]
        : withCoords.map((d) => [d.lat, d.lng]);

    if (coords.length === 1) {
        mapInstance.setView(coords[0], 12);
    } else {
        mapInstance.fitBounds(window.L.latLngBounds(coords), { padding: [60, 60] });
    }
}

function clearLayers() {
    if (!mapInstance) return;

    layers.markers.forEach((m) => mapInstance.removeLayer(m));
    layers.polylines.forEach((p) => mapInstance.removeLayer(p));
    layers.labels.forEach((l) => mapInstance.removeLayer(l));
    layers.markers = [];
    layers.polylines = [];
    layers.labels = [];
}

function coordsToLatLngs(geometry) {
    return geometry.map((c) => [c[1], c[0]]);
}

function setRoutingLoading(visible) {
    document.getElementById('map-routing-loading')?.classList.toggle('hidden', !visible);
}

function persistDurationsIfChanged(durationById) {
    const trip = getActiveTrip();
    if (!trip || !Object.keys(durationById).length) return false;

    let changed = false;
    const destinations = trip.destinations.map((d) => {
        if (!durationById[d.id] || d.duration === durationById[d.id]) return d;
        changed = true;
        return { ...d, duration: durationById[d.id] };
    });

    if (changed) {
        updateActiveTrip({ destinations });
    }
    return changed;
}

function labelAtCoord(L, lat, lng, html, iconAnchor = [80, 12]) {
    layers.labels.push(L.marker([lat, lng], {
        icon: L.divIcon({
            className: 'custom-time-label',
            html,
            iconAnchor,
        }),
    }).addTo(mapInstance));
}

function midpointAlongCoords(coords) {
    if (!coords?.length) return null;
    const idx = Math.floor(coords.length / 2);
    return coords[idx];
}

function bindSegmentLineClick(line, seg) {
    line.on('click', (e) => {
        window.L.DomEvent.stopPropagation(e);
        window.L.popup({
            closeButton: true,
            autoClose: true,
            className: 'route-segment-color-popup-wrap',
        })
            .setLatLng(e.latlng)
            .setContent(buildSegmentColorPopupHtml(seg.id, seg))
            .openOn(mapInstance);
    });
}

function escapeMapHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
}

const GHOST_PLAN_COLORS = ['#64748b', '#94a3b8', '#475569'];

async function drawOneRouteSegment(L, drawable, {
    isActive,
    planName,
    overlapKeys,
    legBySegmentId,
    durationById,
    ghostOffsetIndex,
}) {
    const fromLabel = drawable.from.name?.split(' ')[0] ?? 'Origen';
    const toLabel = drawable.to.name?.split(' ')[0] ?? 'Destino';
    const routeKey = segmentRouteKey(drawable.fromKey, drawable.toKey);
    const isOverlap = overlapKeys.has(routeKey);

    let lineCoords;
    let leg = null;
    let durationLabel;

    if (drawable.sameRoadAs) {
        const refLeg = legBySegmentId.get(drawable.sameRoadAs);
        if (!refLeg?.geometry?.length) return false;
        lineCoords = coordsToLatLngs(reverseGeometry(refLeg.geometry));
        durationLabel = formatDuration(refLeg.durationMin ?? 0);
    } else {
        leg = await fetchRouteLeg(
            { lat: drawable.from.lat, lng: drawable.from.lng },
            { lat: drawable.to.lat, lng: drawable.to.lng },
        );
        if (!leg?.geometry?.length) return false;
        legBySegmentId.set(drawable.id, leg);
        lineCoords = coordsToLatLngs(leg.geometry);
        durationLabel = leg.durationFormatted ?? formatDuration(leg.durationMin);
    }

    if (isActive && drawable.toDestId) {
        durationById[drawable.toDestId] = durationLabel;
    }

    let drawCoords = lineCoords;
    let lineColor = effectiveSegmentLineColor(drawable);
    let weight = 5;
    let opacity = 0.92;
    let dashArray = drawable.sameRoadAs ? '10, 8' : null;

    if (!isActive) {
        lineColor = drawable.lineColor || GHOST_PLAN_COLORS[ghostOffsetIndex % GHOST_PLAN_COLORS.length];
        weight = isOverlap ? 4.5 : 3.5;
        opacity = isOverlap ? 0.82 : 0.42;
        dashArray = drawable.sameRoadAs ? '6, 9' : '8, 12';
        if (isOverlap) {
            drawCoords = offsetPolylineLatLngs(lineCoords, 16 + (ghostOffsetIndex * 14));
        }
    }

    const polylineOpts = {
        color: lineColor,
        weight,
        opacity,
        lineCap: 'round',
        lineJoin: 'round',
    };
    if (dashArray) polylineOpts.dashArray = dashArray;

    const line = L.polyline(drawCoords, polylineOpts).addTo(mapInstance);

    if (isActive) {
        bindSegmentLineClick(line, drawable);
    } else {
        line.bindTooltip(
            `<span class="font-bold">${escapeMapHtml(planName)}</span>${isOverlap ? ' · <span class="text-violet-300">superpuesta</span>' : ''}`,
            { direction: 'top', className: 'route-ghost-tooltip' },
        );
    }

    layers.polylines.push(line);

    const mid = midpointAlongCoords(drawCoords);
    if (!mid) return true;

    if (isActive) {
        const overlapPlans = overlapKeys.get(routeKey) ?? [];
        const overlapBadge = overlapPlans.length > 1
            ? `<span class="text-violet-600 font-bold"> · ↔ ${overlapPlans.length} rutas</span>`
            : '';
        const borderClass = drawable.sameRoadAs ? 'border-indigo-300' : 'border-emerald-300';
        const labelClass = drawable.sameRoadAs ? 'text-indigo-600' : 'text-emerald-700';
        labelAtCoord(L, mid[0], mid[1], `<div class="px-2 py-0.5 rounded-md bg-white/95 shadow-md border ${borderClass} text-[10px] font-bold whitespace-nowrap">
            <span class="${labelClass}">${fromLabel} → ${toLabel}:</span> <span class="text-amber-600">${durationLabel}</span>${overlapBadge}
            ${leg?.distanceKm ? `<span class="text-slate-500"> · ${leg.distanceKm} km</span>` : ''}
            ${drawable.sameRoadAs ? '<span class="text-slate-500"> · misma vía</span>' : ''}
        </div>`, [95, 12]);
    } else if (isOverlap) {
        labelAtCoord(L, mid[0], mid[1], `<div class="px-2 py-1 rounded-lg bg-slate-900/92 border border-violet-500/40 text-[9px] font-bold text-slate-100 shadow-lg backdrop-blur-sm whitespace-nowrap">
            ↕ ${escapeMapHtml(planName)} <span class="text-violet-300">· alternativa</span>
        </div>`, [72, 22]);
    }

    return true;
}

function updateMapOverlapLegend(trip) {
    const el = document.getElementById('map-overlap-legend');
    if (!el) return;
    const normalized = ensureRoutePlans(trip);
    const hasMultiple = normalized.routePlans.length > 1;
    const hasOverlap = tripHasRouteOverlaps(trip);
    el.classList.toggle('hidden', !hasMultiple);
    el.classList.toggle('opacity-100', hasOverlap);
    el.classList.toggle('opacity-60', hasMultiple && !hasOverlap);
}

async function drawRouteSegments(L, trip) {
    const normalized = ensureRoutePlans(trip);
    const activeId = normalized.activeRoutePlanId ?? normalized.routePlans[0]?.id;
    const overlapKeys = getOverlappingSegmentInfo(trip);
    const legBySegmentId = new Map();
    const durationById = {};
    let allOk = false;

    updateMapOverlapLegend(trip);

    const inactivePlans = normalized.routePlans.filter((p) => p.id !== activeId);
    let ghostIndex = 0;
    for (const plan of inactivePlans) {
        const drawableList = resolveDrawableSegments(trip, plan.segments ?? []);
        for (const drawable of drawableList) {
            const ok = await drawOneRouteSegment(L, drawable, {
                isActive: false,
                planName: plan.name,
                overlapKeys,
                legBySegmentId,
                durationById,
                ghostOffsetIndex: ghostIndex,
            });
            if (ok) allOk = true;
        }
        ghostIndex += 1;
    }

    const activePlan = normalized.routePlans.find((p) => p.id === activeId);
    if (activePlan?.segments?.length) {
        const drawableList = resolveDrawableSegments(trip, activePlan.segments);
        for (const drawable of drawableList) {
            const ok = await drawOneRouteSegment(L, drawable, {
                isActive: true,
                planName: activePlan.name,
                overlapKeys,
                legBySegmentId,
                durationById,
                ghostOffsetIndex: 0,
            });
            if (ok) allOk = true;
        }
    }

    persistDurationsIfChanged(durationById);
    return allOk;
}

function bindDestinationLongPress(marker, destId) {
    let pressTimer = null;
    let started = false;

    const clearPress = () => {
        if (pressTimer) clearTimeout(pressTimer);
        pressTimer = null;
        started = false;
    };

    const toggleFavorite = () => {
        const trip = getActiveTrip();
        if (!trip) return;
        const target = trip.destinations.find((d) => d.id === destId);
        if (!target) return;
        const nextFavorite = !target.isFavorite;
        updateActiveTrip({
            destinations: trip.destinations.map((d) => (d.id === destId ? { ...d, isFavorite: nextFavorite } : d)),
        });
        showAlert(
            nextFavorite
                ? `★ «${target.name}» añadido a favoritos.`
                : `«${target.name}» quitado de favoritos.`,
            nextFavorite ? 'success' : 'info'
        );
    };

    const startPress = () => {
        clearPress();
        started = true;
        pressTimer = setTimeout(() => {
            if (!started) return;
            toggleFavorite();
        }, 650);
    };

    marker.on('mousedown', startPress);
    marker.on('touchstart', startPress);
    marker.on('mouseup', clearPress);
    marker.on('mouseout', clearPress);
    marker.on('touchend', clearPress);
    marker.on('touchcancel', clearPress);
    marker.on('dragstart', clearPress);
}

export async function applyOsrmDurationsToTrip() {
    const trip = getActiveTrip();
    if (!trip) return false;

    if (!(trip.routeSegments ?? []).length) return false;

    const durationById = await computeRouteDurations(trip);
    const changed = persistDurationsIfChanged(durationById);
    clearRouteLegCache();
    return changed || Object.keys(durationById).length > 0;
}

export async function drawMapElements() {
    const L = window.L;
    const trip = getActiveTrip();

    if (!L || !mapInstance || !trip) return;

    clearLayers();

    const { startingPoint, destinations } = trip;

    const greenMarkerIcon = L.divIcon({
        className: 'custom-pin-start',
        html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-10 h-10 bg-emerald-500/30 rounded-full animate-ping"></div>
          <div class="w-8 h-8 bg-emerald-600 border-2 border-white rounded-full flex items-center justify-center shadow-lg text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m12 3-1.912 5.886L3.82 9.24l4.59 4.475L7.33 19.6 12 16.5l4.67 3.1-1.08-5.885 4.59-4.475-6.268-.354Z"/></svg>
          </div>
          <div class="absolute -bottom-6 bg-emerald-950 border border-emerald-500/50 text-[9px] text-white px-1.5 py-0.5 rounded font-extrabold whitespace-nowrap shadow-md">
            ORIGEN: ${startingPoint.name.split(' ')[0]}
          </div>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });

    const startMarker = L.marker([startingPoint.lat, startingPoint.lng], { icon: greenMarkerIcon })
        .addTo(mapInstance)
        .bindPopup(`
        <div class="p-2 font-sans text-slate-200">
          <span class="bg-emerald-950 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-800">Punto de Origen</span>
          <h4 class="font-bold text-slate-100 text-sm mt-1.5">${startingPoint.name}</h4>
          <button type="button" data-route-pick-point="${ROUTE_POINT_START}" class="mt-2 px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold">Añadir a la ruta</button>
        </div>`);

    layers.markers.push(startMarker);

    const endPoint = getTripEndPoint(trip);
    const showEndMarker = trip.returnToStart === false
        && !coordsNearlyEqual(endPoint, startingPoint);

    if (showEndMarker) {
        const endIcon = L.divIcon({
            className: 'custom-pin-end',
            html: `
            <div class="relative flex items-center justify-center">
              <div class="w-8 h-8 bg-amber-500 border-2 border-white rounded-full flex items-center justify-center shadow-lg text-slate-950 font-black text-xs">🏁</div>
              <div class="absolute -bottom-6 bg-amber-950 border border-amber-500/50 text-[9px] text-white px-1.5 py-0.5 rounded font-extrabold whitespace-nowrap shadow-md max-w-[90px] truncate">
                FIN: ${endPoint.name.split(' ')[0]}
              </div>
            </div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
        });
        const endMarker = L.marker([endPoint.lat, endPoint.lng], { icon: endIcon })
            .addTo(mapInstance)
            .bindPopup(`
            <div class="p-2 font-sans text-slate-200">
              <span class="bg-amber-950 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-700">Punto final</span>
              <h4 class="font-bold text-slate-100 text-sm mt-1.5">${endPoint.name}</h4>
              <button type="button" data-route-pick-point="${ROUTE_POINT_END}" class="mt-2 px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 text-[10px] font-bold">Añadir a la ruta</button>
            </div>`);
        layers.markers.push(endMarker);
    }

    const routeDestinations = destinations.filter((d) => d.inRoute && d.lat != null && d.lng != null && !d.isTextOnly);
    const mapDestinations = getMapDestinations(trip);
    const pickPending = routeMapHandlers.isRoutePickPending?.() ?? false;
    const hideOffRoute = isHideOffRouteMapPoints() && !pickPending;

    destinations.forEach((dest) => {
        if (dest.isTextOnly || dest.lat == null || dest.lng == null) return;
        if (hideOffRoute && !dest.inRoute) return;

        const routeIndex = routeDestinations.findIndex((d) => d.id === dest.id);
        const isReserved = !!dest.isReserved;
        const borderClass = isReserved
            ? 'border-emerald-400 ring-2 ring-emerald-400/50'
            : dest.inRoute ? 'border-amber-500' : 'border-sky-400';
        const badgeColor = destinationMapBadgeColor(dest);
        const badgeIcon = destinationMapBadgeIcon(dest, routeIndex);
        const badgeEmojiClass = isPlaceEmojiBadge(badgeIcon) ? 'text-[10px] leading-none' : 'text-[9px]';
        const favoriteBadge = dest.isFavorite
            ? '<div class="absolute -top-1 -left-1 w-5 h-5 bg-amber-500 text-white border-2 border-white text-[9px] rounded-full flex items-center justify-center font-bold shadow-md">★</div>'
            : '';
        const placeBadge = destinationPlaceBadgeHtml(dest);
        const priceBadge = canTogglePriceOnStop(dest) ? destinationPriceBadgeHtml(dest) : '';
        const popupBadges = placeBadge
            ? `<span class="inline-flex flex-wrap items-center gap-1 mt-1.5${canTogglePriceOnStop(dest) ? ' cursor-pointer' : ''}"${canTogglePriceOnStop(dest) ? ` data-toggle-price-on-stop="${dest.id}" role="button" tabindex="0" title="Ver precio"` : ''}>${placeBadge}${priceBadge}</span>`
            : '';

        const destIcon = L.divIcon({
            className: 'custom-pin-dest',
            html: `
          <div class="relative flex items-center justify-center font-sans">
            <div class="w-10 h-10 border-2 ${borderClass} rounded-full overflow-hidden shadow-lg transition-transform hover:scale-110 duration-200 bg-slate-800">
              <img src="${dest.photoUrl}" class="w-full h-full object-cover" alt="" />
            </div>
            ${favoriteBadge}
            <div class="absolute -top-1 -right-1 w-5 h-5 ${badgeColor} text-white border-2 border-white ${badgeEmojiClass} rounded-full flex items-center justify-center font-bold shadow-md">
              ${badgeIcon}
            </div>
          </div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
        });

        const prevForMaps = routeIndex > 0
            ? { lat: routeDestinations[routeIndex - 1].lat, lng: routeDestinations[routeIndex - 1].lng }
            : { lat: startingPoint.lat, lng: startingPoint.lng };

        const mapsBtn = dest.inRoute
            ? `<div class="mt-2">${mapsLinkHtml(prevForMaps, { lat: dest.lat, lng: dest.lng })}</div>`
            : '';

        const routePickBtn = `<button type="button" data-route-pick-point="${destPointKey(dest.id)}" class="mt-2 px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold">${pickPending ? 'Usar como destino del tramo' : 'Añadir a la ruta'}</button>`;

        const popupContent = `
        <div class="w-64 overflow-hidden rounded-lg font-sans">
          <img src="${dest.photoUrl}" class="w-full h-32 object-cover m-0" alt="" />
          <div class="p-3">
            <h3 class="font-bold text-white text-base m-0 truncate">${dest.name}</h3>
            ${isReserved ? '<span class="inline-block mt-1.5 text-[10px] font-bold text-emerald-300 bg-emerald-950 border border-emerald-600/50 px-2 py-0.5 rounded">✓ Reservado</span>' : ''}
            ${dest.isFavorite ? '<span class="inline-block mt-1.5 ml-1 text-[10px] font-bold text-amber-300 bg-amber-950 border border-amber-500/50 px-2 py-0.5 rounded">★ Favorito</span>' : ''}
            ${popupBadges}
            <p class="text-xs text-slate-300 my-2 leading-relaxed">${dest.description}</p>
            <p class="text-[10px] text-slate-400 -mt-1">Mantén pulsada la chincheta para marcar/quitar favorito.</p>
            ${dest.inRoute ? `
              <div class="text-xs text-amber-400 font-extrabold bg-slate-900/80 p-2 rounded border border-slate-800 mt-2">
                🚗 ${dest.duration} <span class="text-slate-500 font-normal">· en coche</span>
              </div>
              ${mapsBtn}
              ` : ''}
            ${routePickBtn}
          </div>
        </div>`;

        const marker = L.marker([dest.lat, dest.lng], { icon: destIcon })
            .addTo(mapInstance)
            .bindPopup(popupContent, { maxWidth: 280, padding: 0 });
        bindDestinationLongPress(marker, dest.id);
        marker.on('click', () => {
            if (routeMapHandlers.isRoutePickPending?.()) {
                routeMapHandlers.onSelectPoint?.(destPointKey(dest.id));
            }
        });

        layers.markers.push(marker);
    });

    if (ensureRoutePlans(trip).routePlans.some((p) => (p.segments?.length ?? 0) > 0)) {
        setRoutingLoading(true);
        try {
            const ok = await drawRouteSegments(L, trip);
            if (!ok) {
                // Evitamos fijar avisos visuales en el mapa cuando el trazado falla.
            }
        } finally {
            setRoutingLoading(false);
        }
    }

    const pending = routeMapHandlers.getPendingFromPoint?.();
    if (pending) {
        const candidates = [
            { lat: startingPoint.lat, lng: startingPoint.lng, key: ROUTE_POINT_START },
            ...mapDestinations.map((d) => ({ lat: d.lat, lng: d.lng, key: destPointKey(d.id) })),
        ];
        if (showEndMarker) {
            candidates.push({ lat: endPoint.lat, lng: endPoint.lng, key: ROUTE_POINT_END });
        }

        candidates
            .filter((c) => c.key !== pending.key)
            .forEach((c) => {
                layers.polylines.push(L.polyline([[pending.lat, pending.lng], [c.lat, c.lng]], {
                    color: '#f59e0b',
                    weight: 2,
                    opacity: 0.35,
                    dashArray: '4, 8',
                }).addTo(mapInstance));
            });

        labelAtCoord(
            L,
            pending.lat,
            pending.lng,
            '<div class="px-2 py-1 rounded-md bg-amber-950/95 border border-amber-500/40 text-[10px] text-amber-200 font-bold">Origen del tramo. Pulsa otro punto.</div>',
            [110, 12]
        );
    }
}

export function waitForLeaflet(callback) {
    if (window.L) {
        callback();
        return;
    }
    setTimeout(() => waitForLeaflet(callback), 100);
}

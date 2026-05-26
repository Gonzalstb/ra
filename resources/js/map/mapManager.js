import { getActiveTrip, splitDestinations, updateActiveTrip } from '../state/plannerStore';
import {
    fetchRouteLeg,
    formatDuration,
    clearRouteLegCache,
    resolveDrawableSegments,
    computeRouteDurations,
    reverseGeometry,
    getTripEndPoint,
    coordsNearlyEqual,
} from '../services/routing';
import { mapsLinkHtml } from '../services/mapsLinks';
import { destinationMapBadgeIcon, isWineryDestination } from '../utils/destinationHelpers';

let mapInstance = null;
const layers = { markers: [], polylines: [], labels: [] };

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

async function drawRouteSegments(L, trip) {
    const segments = resolveDrawableSegments(trip);
    const legBySegmentId = new Map();
    const durationById = {};
    let allOk = segments.length > 0;

    for (const seg of segments) {
        const fromLabel = seg.from.name?.split(' ')[0] ?? 'Origen';
        const toLabel = seg.to.name?.split(' ')[0] ?? 'Destino';

        if (seg.sameRoadAs) {
            const refLeg = legBySegmentId.get(seg.sameRoadAs);
            if (!refLeg?.geometry?.length) {
                allOk = false;
                continue;
            }
            const returnCoords = coordsToLatLngs(reverseGeometry(refLeg.geometry));
            layers.polylines.push(L.polyline(returnCoords, {
                color: '#a855f7',
                weight: 4.5,
                opacity: 0.92,
                dashArray: '10, 8',
                lineCap: 'round',
                lineJoin: 'round',
            }).addTo(mapInstance));

            const durationLabel = formatDuration(refLeg.durationMin ?? 0);
            if (seg.toDestId) {
                durationById[seg.toDestId] = durationLabel;
            }

            const mid = midpointAlongCoords(returnCoords);
            if (mid) {
                labelAtCoord(L, mid[0], mid[1], `<div class="px-2 py-0.5 rounded-md bg-white/95 shadow-md border border-indigo-300 text-[10px] font-bold whitespace-nowrap">
              <span class="text-indigo-600">${fromLabel} → ${toLabel}:</span> <span class="text-amber-600">${durationLabel}</span>
              <span class="text-slate-500"> · misma vía</span></div>`, [95, 12]);
            }
            continue;
        }

        const leg = await fetchRouteLeg(
            { lat: seg.from.lat, lng: seg.from.lng },
            { lat: seg.to.lat, lng: seg.to.lng }
        );

        if (!leg?.geometry?.length) {
            allOk = false;
            continue;
        }

        legBySegmentId.set(seg.id, leg);
        const lineCoords = coordsToLatLngs(leg.geometry);

        layers.polylines.push(L.polyline(lineCoords, {
            color: '#10b981',
            weight: 5,
            opacity: 0.92,
            lineCap: 'round',
            lineJoin: 'round',
        }).addTo(mapInstance));

        if (seg.toDestId) {
            durationById[seg.toDestId] = leg.durationFormatted ?? formatDuration(leg.durationMin);
        }

        const mid = midpointAlongCoords(lineCoords);
        if (mid) {
            const durationLabel = seg.toDestId
                ? durationById[seg.toDestId]
                : (leg.durationFormatted ?? formatDuration(leg.durationMin));
            labelAtCoord(L, mid[0], mid[1], `<div class="px-2 py-0.5 rounded-md bg-white/95 shadow-md border border-emerald-300 text-[10px] font-bold whitespace-nowrap">
              <span class="text-emerald-700">${fromLabel} → ${toLabel}:</span> <span class="text-amber-600">${durationLabel}</span>
              ${leg.distanceKm ? `<span class="text-slate-500"> · ${leg.distanceKm} km</span>` : ''}</div>`);
        }
    }

    persistDurationsIfChanged(durationById);
    return allOk;
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
        layers.markers.push(L.marker([endPoint.lat, endPoint.lng], { icon: endIcon }).addTo(mapInstance));
    }

    const routeDestinations = destinations.filter((d) => d.inRoute && d.lat != null && d.lng != null && !d.isTextOnly);

    destinations.forEach((dest) => {
        if (dest.isTextOnly || dest.lat == null || dest.lng == null) return;

        const routeIndex = routeDestinations.findIndex((d) => d.id === dest.id);
        const isReserved = !!dest.isReserved;
        const borderClass = isReserved
            ? 'border-emerald-400 ring-2 ring-emerald-400/50'
            : dest.inRoute ? 'border-amber-500' : 'border-sky-400';
        const badgeColor = isReserved
            ? 'bg-emerald-600'
            : isWineryDestination(dest) ? 'bg-purple-700'
            : dest.inRoute ? 'bg-rose-600' : 'bg-sky-600';
        const badgeIcon = destinationMapBadgeIcon(dest, routeIndex);

        const destIcon = L.divIcon({
            className: 'custom-pin-dest',
            html: `
          <div class="relative flex items-center justify-center font-sans">
            <div class="w-10 h-10 border-2 ${borderClass} rounded-full overflow-hidden shadow-lg transition-transform hover:scale-110 duration-200 bg-slate-800">
              <img src="${dest.photoUrl}" class="w-full h-full object-cover" alt="" />
            </div>
            <div class="absolute -top-1 -right-1 w-5 h-5 ${badgeColor} text-white border-2 border-white ${badgeIcon === '🍷' ? 'text-[10px] leading-none' : 'text-[9px]'} rounded-full flex items-center justify-center font-bold shadow-md">
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

        const popupContent = `
        <div class="w-64 overflow-hidden rounded-lg font-sans">
          <img src="${dest.photoUrl}" class="w-full h-32 object-cover m-0" alt="" />
          <div class="p-3">
            <h3 class="font-bold text-white text-base m-0 truncate">${dest.name}</h3>
            ${isReserved ? '<span class="inline-block mt-1.5 text-[10px] font-bold text-emerald-300 bg-emerald-950 border border-emerald-600/50 px-2 py-0.5 rounded">✓ Reservado</span>' : ''}
            ${isWineryDestination(dest) ? '<span class="inline-block mt-1.5 ml-1 text-[10px] font-bold text-purple-200 bg-purple-950 border border-purple-500/50 px-2 py-0.5 rounded">🍷 Bodega</span>' : ''}
            <p class="text-xs text-slate-300 my-2 leading-relaxed">${dest.description}</p>
            ${dest.inRoute ? `
              <div class="text-xs text-amber-400 font-extrabold bg-slate-900/80 p-2 rounded border border-slate-800 mt-2">
                🚗 ${dest.duration} <span class="text-slate-500 font-normal">· en coche</span>
              </div>
              ${mapsBtn}` : ''}
          </div>
        </div>`;

        const marker = L.marker([dest.lat, dest.lng], { icon: destIcon })
            .addTo(mapInstance)
            .bindPopup(popupContent, { maxWidth: 280, padding: 0 });

        layers.markers.push(marker);
    });

    if ((trip.routeSegments ?? []).length > 0) {
        setRoutingLoading(true);
        try {
            const ok = await drawRouteSegments(L, trip);
            if (!ok) {
                labelAtCoord(
                    L,
                    startingPoint.lat,
                    startingPoint.lng,
                    '<div class="px-2 py-1 rounded-md bg-rose-950/95 border border-rose-500/40 text-[10px] text-rose-200 font-bold">No se pudo trazar la ruta en coche. Reintenta en unos segundos.</div>',
                    [120, -8]
                );
            }
        } finally {
            setRoutingLoading(false);
        }
    }
}

export function waitForLeaflet(callback) {
    if (window.L) {
        callback();
        return;
    }
    setTimeout(() => waitForLeaflet(callback), 100);
}

import { fetchTrips } from '../api/tripsApi';
import {
    setState, setUi, subscribe, enableSync, tripsDataChanged,
    setActiveDayId, getActiveTrip, splitDestinations, getState,
} from '../state/plannerStore';
import { normalizeTrip } from '../utils/tripNormalize';
import { ensureRoutePlans } from '../services/routePlans';
import { showAlert, bindAlertClose, hideAlert } from '../ui/alerts';
import { bindTabControls, renderTabs, setActiveTab } from '../ui/tabs';
import { bindModals, isEditStartModalOpen, isEditDestModalOpen, updateGuideText } from '../ui/modals';
import { renderSidebar, bindSidebarListEvents } from '../ui/sidebar';
import { bindForms, setFormCoords, refreshFormDaySelect } from '../ui/forms';
import { bindGallery, renderGallery } from '../ui/gallery';
import { bindItinerary, renderItinerary } from '../ui/itinerary';
import { bindRouteDragDrop } from '../ui/routeDragDrop';
import { bindTripReturn, handleMapPickEnd, isPickingEndOnMap } from '../ui/tripReturn';
import { bindRoutePlan, renderMapRouteChip, updateMapRouteGuide } from '../ui/routePlan';
import { bindMapControls, renderMapPointsVisibilityControl } from '../ui/mapControls';
import { scheduleSync, retrySync } from '../services/syncScheduler';
import { bindMobilePanel } from '../ui/mobilePanel';
import {
    initMap, drawMapElements, waitForLeaflet, invalidateSize, fitTripBounds,
    applyOsrmDurationsToTrip, setRouteMapHandlers,
} from '../map/mapManager';
import { getPendingMapRoutePoint, handleMapRoutePointSelection, requestDeleteRouteSegment, updateSegmentLineColor, isMapRoutePickPending } from '../ui/routePlan';

let lastRenderedTab = '';
let lastMapFingerprint = '';
let mapRedrawInFlight = false;
let mapRedrawPending = false;
let mapReady = false;

function bootstrapMap(onMapClick) {
    waitForLeaflet(() => {
        initMap(document.getElementById('map-container'), onMapClick);
        mapReady = true;
        document.getElementById('map-loading')?.classList.add('hidden');
        invalidateSize();
        // Leaflet necesita un layout estable; forzamos el primer dibujado tras mostrar la app.
        lastMapFingerprint = '';
        requestAnimationFrame(() => {
            invalidateSize();
            onMapRedraw();
        });
        window.addEventListener('resize', () => invalidateSize());
    });
}

function buildMapFingerprint(trip) {
    if (!trip) return '';
    const { route } = splitDestinations(trip.destinations);
    return JSON.stringify({
        start: trip.startingPoint,
        returnToStart: trip.returnToStart,
        endingPoint: trip.endingPoint,
        routePlans: ensureRoutePlans(trip).routePlans.map((p) => ({
            id: p.id,
            active: p.id === (trip.activeRoutePlanId ?? trip.routePlans?.[0]?.id),
            segments: (p.segments ?? []).map((s) => ({
                id: s.id,
                fromKey: s.fromKey,
                toKey: s.toKey,
                sameRoadAs: s.sameRoadAs,
                lineColor: s.lineColor || null,
            })),
        })),
        activeRoutePlanId: trip.activeRoutePlanId,
        dests: trip.destinations.map((d) => ({
            id: d.id,
            lat: d.lat,
            lng: d.lng,
            inRoute: d.inRoute,
            isReserved: d.isReserved,
            isFavorite: d.isFavorite,
            isWinery: d.isWinery,
            isHotel: d.isHotel,
            isBar: d.isBar,
            isTextOnly: d.isTextOnly,
        })),
        routeOrder: route.map((d) => d.id),
        hideOffRouteMapPoints: getState().ui.hideOffRouteMapPoints,
    });
}

function shouldRedrawMap(state) {
    const trip = getActiveTrip();
    const fp = buildMapFingerprint(trip);
    const tab = state.ui.activeTab;
    const tabOpenedMap = tab === 'map' && lastRenderedTab !== 'map';

    if (fp !== lastMapFingerprint || tabOpenedMap) {
        lastMapFingerprint = fp;
        return true;
    }
    return false;
}

async function onMapRedraw() {
    if (mapRedrawInFlight) {
        mapRedrawPending = true;
        return;
    }
    mapRedrawInFlight = true;
    try {
        do {
            mapRedrawPending = false;
            await drawMapElements();
            fitTripBounds();
            const trip = getActiveTrip();
            if (trip) renderMapRouteChip(trip);
        } while (mapRedrawPending);
    } finally {
        mapRedrawInFlight = false;
    }
}

function showApp() {
    document.getElementById('app-loader')?.classList.add('hidden');
    document.getElementById('app-main')?.classList.remove('hidden');
    document.getElementById('map-loading')?.classList.add('hidden');
}

function handleMapClick(e) {
    const { lat, lng } = e.latlng;

    if (isPickingEndOnMap()) {
        handleMapPickEnd(lat, lng, () => { onMapRedraw(); });
        return;
    }

    if (isEditStartModalOpen()) {
        document.getElementById('edit-start-lat').value = lat.toFixed(5);
        document.getElementById('edit-start-lng').value = lng.toFixed(5);
        showAlert('📍 Coordenadas seleccionadas para el Origen.', 'info');
    } else if (isEditDestModalOpen()) {
        document.getElementById('edit-dest-lat').value = lat.toFixed(5);
        document.getElementById('edit-dest-lng').value = lng.toFixed(5);
        showAlert('📍 Nueva posición seleccionada para el punto.', 'info');
    } else {
        setFormCoords(lat.toFixed(5), lng.toFixed(5));
        showAlert('📍 Coordenadas capturadas para el nuevo punto.', 'info');
    }
}

export async function initPlanner() {
    bindAlertClose();
    hideAlert();

    const redraw = () => { onMapRedraw(); };

    bindTabControls();
    bindMobilePanel();
    bindModals({ onMapRedraw: redraw });
    bindSidebarListEvents(redraw);
    bindForms(redraw);
    bindGallery();
    bindItinerary(redraw);
    bindRouteDragDrop(redraw);
    bindTripReturn(redraw);
    bindRoutePlan(redraw);
    bindMapControls(redraw);
    setRouteMapHandlers({
        onSelectPoint: (pointKey) => handleMapRoutePointSelection(pointKey, redraw),
        onDeleteSegmentRequest: (segId) => requestDeleteRouteSegment(segId, redraw),
        onSegmentColorChange: (segId, color) => updateSegmentLineColor(segId, color, redraw),
        getPendingFromPoint: () => getPendingMapRoutePoint(),
        isRoutePickPending: () => isMapRoutePickPending(),
    });
    renderGallery();

    document.getElementById('saving-badge')?.addEventListener('click', retrySync);

    document.getElementById('btn-calc-times')?.addEventListener('click', async () => {
        const btn = document.getElementById('btn-calc-times');
        if (btn) btn.disabled = true;
        showAlert('Recalculando tiempos en coche por carreteras reales…', 'info');
        try {
            const ok = await applyOsrmDurationsToTrip();
            if (ok) {
                showAlert('Tiempos actualizados (ruta en coche por OSRM).', 'success');
                renderSidebar();
                redraw();
            } else {
                showAlert('No hay tramos en la ruta para calcular.', 'info');
            }
        } catch (err) {
            console.error(err);
            showAlert('No se pudieron calcular los tiempos. Inténtalo más tarde.', 'error');
        } finally {
            if (btn) btn.disabled = false;
        }
    });

    subscribe((state) => {
        const trip = getActiveTrip();

        renderSidebar();
        renderItinerary();
        refreshFormDaySelect();

        if (trip) {
            renderMapRouteChip(trip);
            updateMapRouteGuide(trip);
            renderMapPointsVisibilityControl();
        }

        if (state.ui.activeTab !== lastRenderedTab) {
            renderTabs(state.ui.activeTab);
            lastRenderedTab = state.ui.activeTab;
        }

        if (state.ui.dataLoaded && mapReady && shouldRedrawMap(state)) {
            redraw();
        }

        if (tripsDataChanged()) {
            scheduleSync();
        }
    });

    try {
        const data = await fetchTrips();
        const trips = (data.trips ?? []).map(normalizeTrip);
        const activeTrip = trips.find((t) => t.id === data.activeTripId) ?? trips[0];
        if (activeTrip?.days?.length) {
            setActiveDayId(activeTrip.days[0].id);
        }
        setState({
            trips,
            activeTripId: data.activeTripId ?? trips[0]?.id ?? '',
        });
        setUi({ dataLoaded: true });
        enableSync();
        renderSidebar();
        renderItinerary();
        renderTabs('map');
        lastRenderedTab = 'map';
        showApp();

        bootstrapMap(handleMapClick);
    } catch (err) {
        console.error(err);
        showAlert('Error al cargar los viajes. Comprueba la conexión o inicia sesión de nuevo.', 'error');
        setUi({ dataLoaded: true });
        enableSync();
        renderTabs('map');
        lastRenderedTab = 'map';
        showApp();
    }

    updateGuideText(false);
}

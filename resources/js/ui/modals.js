import {
    getState, setUi, getActiveTrip, updateActiveTrip, setState, markTripDeleted,
    rebuildRouteByDayOrder,
} from '../state/plannerStore';
import { parsePriceInput } from '../utils/formatPrice';
import { geocodeAddress } from '../services/geocoding';
import { showAlert } from './alerts';
import { setActiveTab } from './tabs';
import { focusOnLocation } from '../map/mapManager';
import { populateDaySelect } from './itinerary';
import { renderSidebar } from './sidebar';
import { clearRouteLegCache } from '../services/routing';
import { initOriginAirportPicker, getOriginAirportPicker } from './originAirportPicker';
import {
    bindPlaceTypePicker, initPlaceTypeFromDest, readPlaceTypeFlags,
} from './placeTypeForm';

let pendingNewTripOrigin = null;

function toggleModal(id, show) {
    document.getElementById(id)?.classList.toggle('hidden', !show);
}

export function openEditStartModal() {
    const trip = getActiveTrip();
    if (!trip) return;

    setUi({
        editStartModal: {
            isOpen: true,
            name: trip.startingPoint.name,
            lat: String(trip.startingPoint.lat),
            lng: String(trip.startingPoint.lng),
        },
        startPointSearchQuery: '',
    });

    document.getElementById('edit-start-name').value = trip.startingPoint.name;
    document.getElementById('edit-start-lat').value = trip.startingPoint.lat;
    document.getElementById('edit-start-lng').value = trip.startingPoint.lng;
    const summary = document.getElementById('edit-start-summary');
    if (summary) {
        summary.textContent = `✈️ ${trip.startingPoint.name}`;
    }
    toggleModal('modal-edit-start', true);
    updateGuideText(true);
}

export function closeEditStartModal() {
    setUi({ editStartModal: { isOpen: false, name: '', lat: '', lng: '' } });
    toggleModal('modal-edit-start', false);
    updateGuideText(false);
}

export function updateGuideText(originMode) {
    const el = document.getElementById('guide-text');
    if (el) {
        if (originMode === true) {
            el.textContent = 'Modo Origen: elige país y aeropuerto, o busca una dirección.';
        } else if (originMode === 'edit-dest') {
            el.textContent = 'Modo Edición: Pulsa en el mapa para mover la chincheta del punto.';
        } else {
            el.textContent = 'Modo Destino: Toca el mapa o busca la dirección en el panel + Parada.';
        }
    }
}

function applyEditStartOrigin({ name, lat, lng }) {
    document.getElementById('edit-start-name').value = name;
    document.getElementById('edit-start-lat').value = lat;
    document.getElementById('edit-start-lng').value = lng;
    const summary = document.getElementById('edit-start-summary');
    if (summary) {
        summary.textContent = `✈️ ${name}`;
    }
}

function applyNewTripOrigin({ name, lat, lng }) {
    pendingNewTripOrigin = { name, lat, lng };
    const summary = document.getElementById('new-trip-origin-summary');
    if (summary) {
        summary.textContent = `✈️ ${name}`;
    }
}

export function bindModals(handlers) {
    bindPlaceTypePicker('edit');
    initOriginAirportPicker('edit-start', { onSelect: applyEditStartOrigin });
    initOriginAirportPicker('new-trip', { onSelect: applyNewTripOrigin });

    document.getElementById('btn-edit-origin')?.addEventListener('click', openEditStartModal);
    document.getElementById('btn-focus-origin')?.addEventListener('click', () => {
        const trip = getActiveTrip();
        if (trip) {
            setActiveTab('map');
            focusOnLocation(trip.startingPoint.lat, trip.startingPoint.lng, true);
        }
    });

    document.querySelectorAll('[data-close-edit-start]').forEach((el) => {
        el.addEventListener('click', closeEditStartModal);
    });

    document.getElementById('form-edit-start')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const lat = parseFloat(document.getElementById('edit-start-lat').value);
        const lng = parseFloat(document.getElementById('edit-start-lng').value);
        const name = document.getElementById('edit-start-name').value;

        if (!name || Number.isNaN(lat) || Number.isNaN(lng)) {
            showAlert('Selecciona un aeropuerto o busca una dirección de origen.', 'error');
            return;
        }

        updateActiveTrip({
            startingPoint: { name: name || 'Punto de Partida', lat, lng },
        });
        clearRouteLegCache();
        closeEditStartModal();
        showAlert('📍 Origen de este viaje actualizado con éxito.');
        setActiveTab('map');
        focusOnLocation(lat, lng, true);
    });

    document.getElementById('btn-new-trip')?.addEventListener('click', () => {
        setUi({ newTripModal: { isOpen: true, name: '' } });
        document.getElementById('new-trip-name').value = '';
        pendingNewTripOrigin = null;
        const summary = document.getElementById('new-trip-origin-summary');
        if (summary) {
            summary.textContent = 'Elige el aeropuerto desde el que sales.';
        }
        getOriginAirportPicker('new-trip')?.reset();
        toggleModal('modal-new-trip', true);
    });

    document.querySelectorAll('[data-close-new-trip]').forEach((el) => {
        el.addEventListener('click', () => toggleModal('modal-new-trip', false));
    });

    document.getElementById('form-new-trip')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('new-trip-name').value.trim();
        if (!name) {
            showAlert('Por favor, escribe un nombre para tu viaje.', 'error');
            return;
        }
        if (!pendingNewTripOrigin) {
            showAlert('Selecciona país y aeropuerto de salida.', 'error');
            return;
        }
        const origin = pendingNewTripOrigin;
        const newTrip = {
            id: `trip-${Date.now()}`,
            name,
            startingPoint: { lat: origin.lat, lng: origin.lng, name: origin.name },
            ownerId: null,
            isOwner: true,
            canShare: true,
            activityLogs: [],
            returnToStart: true,
            endingPoint: null,
            routeSegments: [],
            days: [],
            destinations: [],
        };
        const { trips } = getState();
        setState({ trips: [...trips, newTrip], activeTripId: newTrip.id });
        toggleModal('modal-new-trip', false);
        pendingNewTripOrigin = null;
        setActiveTab('map');
        showAlert(`💼 ¡Viaje '${newTrip.name}' creado e iniciado con éxito!`);
        setTimeout(() => focusOnLocation(origin.lat, origin.lng, true), 300);
        renderSidebar();
    });

    document.getElementById('btn-delete-trip')?.addEventListener('click', () => {
        const trip = getActiveTrip();
        if (!trip) return;
        if (trip.isOwner === false) {
            showAlert('Solo el propietario puede eliminar el viaje.', 'error');
            return;
        }
        setUi({ deleteTripModal: { isOpen: true, targetId: trip.id, targetName: trip.name } });
        document.getElementById('delete-trip-name').textContent = trip.name;
        toggleModal('modal-delete-trip', true);
    });

    document.querySelectorAll('[data-close-delete-trip]').forEach((el) => {
        el.addEventListener('click', () => toggleModal('modal-delete-trip', false));
    });

    document.getElementById('btn-confirm-delete-trip')?.addEventListener('click', () => {
        const { deleteTripModal } = getState().ui;
        const { trips: allTrips, activeTripId } = getState();
        const targetTrip = allTrips.find((t) => t.id === deleteTripModal.targetId);
        if (targetTrip && targetTrip.isOwner === false) {
            showAlert('Solo el propietario puede eliminar el viaje.', 'error');
            toggleModal('modal-delete-trip', false);
            return;
        }
        if (allTrips.length <= 1) {
            showAlert('No puedes eliminar el único viaje disponible.', 'error');
            toggleModal('modal-delete-trip', false);
            return;
        }
        let nextActiveId = activeTripId;
        if (activeTripId === deleteTripModal.targetId) {
            nextActiveId = allTrips.filter((t) => t.id !== deleteTripModal.targetId)[0].id;
        }
        markTripDeleted(deleteTripModal.targetId);
        setState({
            trips: allTrips.filter((t) => t.id !== deleteTripModal.targetId),
            activeTripId: nextActiveId,
        });
        toggleModal('modal-delete-trip', false);
        showAlert(`El viaje '${deleteTripModal.targetName}' ha sido eliminado con éxito.`, 'info');
        renderSidebar();
    });

    document.querySelectorAll('[data-close-delete-dest]').forEach((el) => {
        el.addEventListener('click', () => toggleModal('modal-delete-dest', false));
    });

    document.getElementById('btn-confirm-delete-dest')?.addEventListener('click', () => {
        const { deleteModal } = getState().ui;
        const trip = getActiveTrip();
        if (!trip) return;
        updateActiveTrip({
            destinations: trip.destinations.filter((d) => d.id !== deleteModal.targetId),
        });
        toggleModal('modal-delete-dest', false);
        showAlert('Se ha eliminado la parada del viaje actual.', 'info');
        renderSidebar();
        handlers.onMapRedraw?.();
    });

    document.querySelectorAll('[data-close-edit-dest]').forEach((el) => {
        el.addEventListener('click', closeEditDestModal);
    });

    document.getElementById('form-edit-dest')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const { editDestModal } = getState().ui;
        const trip = getActiveTrip();
        if (!trip || !editDestModal.destId) return;

        const lat = parseFloat(document.getElementById('edit-dest-lat').value);
        const lng = parseFloat(document.getElementById('edit-dest-lng').value);
        const name = document.getElementById('edit-dest-name').value.trim();

        if (!name || Number.isNaN(lat) || Number.isNaN(lng)) {
            showAlert('Completa nombre y coordenadas válidas.', 'error');
            return;
        }

        const inRoute = editDestFormState.inRoute;
        const dayId = document.getElementById('edit-dest-day').value || null;
        const isReserved = document.getElementById('edit-dest-reserved')?.checked ?? false;
        const siteUrl = document.getElementById('edit-dest-site-url')?.value?.trim() ?? '';
        const placeFlags = readPlaceTypeFlags('edit');
        const price = parsePriceInput(document.getElementById('edit-dest-price')?.value);

        let destinations = trip.destinations.map((d) => {
            if (d.id !== editDestModal.destId) return d;
            const next = {
                ...d,
                name,
                description: document.getElementById('edit-dest-description').value || d.description,
                siteUrl,
                photoUrl: document.getElementById('edit-dest-photo').value || d.photoUrl,
                duration: document.getElementById('edit-dest-duration').value || d.duration,
                isRoundTrip: editDestFormState.isRoundTrip,
                isReserved,
                ...placeFlags,
                price,
                inRoute: dayId ? true : inRoute,
                dayId: dayId || null,
                lat,
                lng,
            };
            return next;
        });

        destinations = rebuildRouteByDayOrder({ ...trip, destinations });
        updateActiveTrip({ destinations });
        closeEditDestModal();
        showAlert(`✏️ '${name}' actualizado correctamente.`, 'success');
        renderSidebar();
        handlers.onMapRedraw?.();
    });

    document.getElementById('btn-geocode-edit-dest')?.addEventListener('click', async () => {
        const query = document.getElementById('edit-dest-search')?.value ?? '';
        if (!query.trim()) {
            showAlert('Introduce una dirección para buscar.', 'error');
            return;
        }
        try {
            const result = await geocodeAddress(query);
            if (result) {
                document.getElementById('edit-dest-lat').value = result.lat.toFixed(5);
                document.getElementById('edit-dest-lng').value = result.lng.toFixed(5);
                if (!document.getElementById('edit-dest-name').value) {
                    document.getElementById('edit-dest-name').value = result.name;
                }
                showAlert(`📍 Ubicación encontrada: ${result.matchedLabel}.`);
            } else {
                showAlert('No se encontró esa dirección.', 'error');
            }
        } catch {
            showAlert('Error al buscar la dirección.', 'error');
        }
    });

    document.querySelectorAll('[data-edit-in-route]').forEach((btn) => {
        btn.addEventListener('click', () => {
            editDestFormState.inRoute = btn.dataset.editInRoute === 'true';
            updateEditDestInRouteUI(editDestFormState.inRoute);
        });
    });

    document.getElementById('edit-dest-round-trip')?.addEventListener('click', () => {
        editDestFormState.isRoundTrip = !editDestFormState.isRoundTrip;
        updateEditRoundTripUI(editDestFormState.isRoundTrip);
    });
}

export function openDeleteDestModal(id, name) {
    setUi({ deleteModal: { isOpen: true, targetId: id, targetName: name } });
    document.getElementById('delete-dest-name').textContent = name;
    toggleModal('modal-delete-dest', true);
}

const editDestFormState = { inRoute: true, isRoundTrip: false };

export function openEditDestModal(destId) {
    const trip = getActiveTrip();
    const dest = trip?.destinations.find((d) => d.id === destId);
    if (!dest) return;

    editDestFormState.inRoute = dest.inRoute;
    editDestFormState.isRoundTrip = dest.isRoundTrip;

    setUi({ editDestModal: { isOpen: true, destId } });
    document.getElementById('edit-dest-name').value = dest.name;
    document.getElementById('edit-dest-description').value = dest.description ?? '';
    const siteUrl = document.getElementById('edit-dest-site-url');
    if (siteUrl) siteUrl.value = dest.siteUrl ?? '';
    document.getElementById('edit-dest-lat').value = dest.lat;
    document.getElementById('edit-dest-lng').value = dest.lng;
    document.getElementById('edit-dest-duration').value = dest.duration ?? '';
    document.getElementById('edit-dest-photo').value = dest.photoUrl ?? '';
    document.getElementById('edit-dest-search').value = '';
    const reservedEl = document.getElementById('edit-dest-reserved');
    if (reservedEl) reservedEl.checked = !!dest.isReserved;
    initPlaceTypeFromDest('edit', dest);
    const priceEl = document.getElementById('edit-dest-price');
    if (priceEl) priceEl.value = dest.price != null && dest.price !== '' ? String(dest.price) : '';
    populateDaySelect(document.getElementById('edit-dest-day'), dest.dayId);
    updateEditDestInRouteUI(dest.inRoute);
    updateEditRoundTripUI(dest.isRoundTrip);
    toggleModal('modal-edit-dest', true);
    updateGuideText('edit-dest');
}

export function closeEditDestModal() {
    setUi({ editDestModal: { isOpen: false, destId: null } });
    toggleModal('modal-edit-dest', false);
    updateGuideText(false);
}

function updateEditDestInRouteUI(inRoute) {
    document.getElementById('edit-dest-route-fields')?.classList.toggle('hidden', !inRoute);
    document.querySelectorAll('[data-edit-in-route]').forEach((btn) => {
        const active = btn.dataset.editInRoute === String(inRoute);
        btn.className = `py-2 text-xs font-bold rounded-lg border h-10 transition ${
            active && inRoute
                ? 'bg-amber-500/20 text-amber-400 border-amber-500'
                : active && !inRoute
                    ? 'bg-sky-500/20 text-sky-400 border-sky-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
        }`;
    });
}

function updateEditRoundTripUI(isRoundTrip) {
    const toggle = document.getElementById('edit-round-trip-toggle');
    const knob = document.getElementById('edit-round-trip-knob');
    toggle?.classList.toggle('bg-indigo-600', isRoundTrip);
    toggle?.classList.toggle('bg-slate-700', !isRoundTrip);
    knob?.classList.toggle('translate-x-4', isRoundTrip);
    knob?.classList.toggle('translate-x-0', !isRoundTrip);
}

export function isEditStartModalOpen() {
    return !document.getElementById('modal-edit-start')?.classList.contains('hidden');
}

export function isEditDestModalOpen() {
    return !document.getElementById('modal-edit-dest')?.classList.contains('hidden');
}

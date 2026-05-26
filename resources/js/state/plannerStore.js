const initialUi = {
    activeTab: 'map',
    isSaving: false,
    syncStatus: 'idle',
    dataLoaded: false,
    skipSync: true,
    mobilePanelOpen: false,
    form: {
        name: '',
        description: '',
        photoUrl: '',
        duration: '',
        isRoundTrip: false,
        inRoute: true,
        isTextOnly: false,
        coords: { lat: '', lng: '' },
    },
    addressSearchQuery: '',
    isSearchingAddress: false,
    startPointSearchQuery: '',
    isSearchingStartPoint: false,
    editStartModal: { isOpen: false, name: '', lat: '', lng: '' },
    deleteModal: { isOpen: false, targetId: null, targetName: '' },
    editDestModal: { isOpen: false, destId: null },
    deleteTripModal: { isOpen: false, targetId: null, targetName: '' },
    newTripModal: { isOpen: false, name: '', startPresetIndex: 0 },
    activeDayId: '',
    collapsedDayIds: [],
    mapPickMode: null,
};

let pendingDeletedTripIds = [];

let state = {
    trips: [],
    activeTripId: '',
    ui: structuredClone(initialUi),
};

const listeners = new Set();
let lastTripsSnapshot = '';

export function getState() {
    return state;
}

export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function emit() {
    listeners.forEach((listener) => listener(state));
}

export function setState(partial) {
    state = { ...state, ...partial };
    emit();
}

/** Actualiza viajes desde el servidor sin volver a disparar guardado. */
export function setStateFromServer(partial) {
    state = { ...state, ...partial };
    lastTripsSnapshot = buildTripsSnapshot(state.trips, state.activeTripId);
    emit();
}

export function setUi(partial) {
    state = { ...state, ui: { ...state.ui, ...partial } };
    emit();
}

export function setForm(partial) {
    state = {
        ...state,
        ui: { ...state.ui, form: { ...state.ui.form, ...partial } },
    };
    emit();
}

export function resolveActiveTripId() {
    const { activeTripId, trips } = state;
    if (activeTripId && trips.some((t) => t.id === activeTripId)) {
        return activeTripId;
    }
    return trips[0]?.id ?? '';
}

export function getActiveTrip() {
    const tripId = resolveActiveTripId();
    if (!tripId) return null;
    return state.trips.find((t) => t.id === tripId) ?? null;
}

export function updateActiveTrip(fields) {
    const tripId = resolveActiveTripId();
    if (!tripId) return;

    setState({
        trips: state.trips.map((t) =>
            t.id === tripId ? { ...t, ...fields } : t
        ),
    });
}

export function splitDestinations(destinations) {
    return {
        route: destinations.filter((d) => d.inRoute),
        standalone: destinations.filter((d) => !d.inRoute),
    };
}

export function mergeDestinations(route, standalone) {
    return [...route, ...standalone];
}

/** Reordena la ruta: primero paradas por orden de días del plan, luego sin día. */
export function rebuildRouteByDayOrder(trip) {
    const { route, standalone } = splitDestinations(trip.destinations);
    const days = trip.days ?? [];
    const newRoute = [];
    for (const day of days) {
        newRoute.push(...route.filter((d) => d.dayId === day.id));
    }
    newRoute.push(...route.filter((d) => !d.dayId));
    return mergeDestinations(newRoute, standalone);
}

export function assignDestinationToDay(destId, dayId) {
    const trip = getActiveTrip();
    if (!trip) return;

    const destinations = trip.destinations.map((d) => {
        if (d.id !== destId) return d;
        if (!dayId) return { ...d, dayId: null };
        if (d.isTextOnly) return { ...d, dayId };
        return { ...d, dayId, inRoute: true };
    });

    updateActiveTrip({
        destinations: rebuildRouteByDayOrder({ ...trip, destinations }),
    });
}

export function updateDestinationFields(destId, fields) {
    const trip = getActiveTrip();
    if (!trip) return;
    updateActiveTrip({
        destinations: trip.destinations.map((d) =>
            d.id === destId ? { ...d, ...fields } : d
        ),
    });
}

export function normalizeDestinationsOrder(destinations) {
    const { route, standalone } = splitDestinations(destinations);
    return mergeDestinations(route, standalone);
}

export function reorderRouteDestination(destId, direction) {
    const trip = getActiveTrip();
    if (!trip) return false;

    const { route } = splitDestinations(trip.destinations);
    const idx = route.findIndex((d) => d.id === destId);
    if (idx === -1) return false;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= route.length) return false;

    return moveRouteDestinationToIndex(destId, swapIdx);
}

export function moveRouteDestinationToIndex(destId, toIndex) {
    const trip = getActiveTrip();
    if (!trip) return false;

    const { route, standalone } = splitDestinations(trip.destinations);
    const fromIndex = route.findIndex((d) => d.id === destId);
    if (fromIndex === -1) return false;

    const [item] = route.splice(fromIndex, 1);
    const insertAt = Math.max(0, Math.min(toIndex, route.length));

    if (insertAt === fromIndex) {
        route.splice(fromIndex, 0, item);
        return false;
    }

    route.splice(insertAt, 0, item);
    updateActiveTrip({ destinations: mergeDestinations(route, standalone) });
    return true;
}

export function setDestinationRouteStatus(destId, inRoute) {
    const trip = getActiveTrip();
    if (!trip) return;

    const dest = trip.destinations.find((d) => d.id === destId);
    if (!dest) return;

    let { route, standalone } = splitDestinations(trip.destinations);
    route = route.filter((d) => d.id !== destId);
    standalone = standalone.filter((d) => d.id !== destId);

    const updated = { ...dest, inRoute };
    if (inRoute) route.push(updated);
    else standalone.push(updated);

    updateActiveTrip({ destinations: mergeDestinations(route, standalone) });
}

export function appendDestination(dest, options = {}) {
    const trip = getActiveTrip();
    if (!trip) return;

    const newDest = {
        isReserved: false,
        price: null,
        ...dest,
    };

    if (options.dayId) {
        newDest.dayId = options.dayId;
        if (newDest.isTextOnly) {
            newDest.inRoute = false;
        } else if (newDest.inRoute !== false) {
            newDest.inRoute = true;
        }
    }

    const { route, standalone } = splitDestinations(trip.destinations);
    if (newDest.inRoute) route.push(newDest);
    else standalone.push(newDest);

    let destinations = mergeDestinations(route, standalone);
    if (options.dayId && !newDest.isTextOnly) {
        destinations = rebuildRouteByDayOrder({ ...trip, destinations });
    }

    updateActiveTrip({ destinations });
}

/** Parada del plan sin ubicación en el mapa (bar, comida, recordatorio…). */
export function addTextStopToDay(dayId, name, description = '') {
    const trip = getActiveTrip();
    if (!trip || !name?.trim()) return null;

    if (!trip.days?.some((d) => String(d.id) === String(dayId))) {
        return null;
    }

    const newDest = {
        id: `text-${Date.now()}`,
        name: name.trim(),
        description: description?.trim() || '',
        photoUrl: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=100&auto=format&fit=crop&q=80',
        duration: '',
        isRoundTrip: false,
        inRoute: false,
        isTextOnly: true,
        dayId,
        isReserved: false,
        price: null,
        lat: null,
        lng: null,
    };

    const destinations = [...(trip.destinations ?? []), newDest];
    updateActiveTrip({ destinations });

    const saved = getActiveTrip()?.destinations?.some((d) => d.id === newDest.id);
    return saved ? newDest : null;
}

export function enableSync() {
    lastTripsSnapshot = buildTripsSnapshot(state.trips, state.activeTripId);
    setUi({ skipSync: false });
}

export function tripsDataChanged() {
    return buildTripsSnapshot(state.trips, state.activeTripId) !== lastTripsSnapshot;
}

function buildTripsSnapshot(trips, activeTripId) {
    return JSON.stringify({ trips, activeTripId });
}

let savedBadgeFadeTimer = null;

export function setSyncStatus(status) {
    state.ui.syncStatus = status;
    state.ui.isSaving = status === 'saving';
    const badge = document.getElementById('saving-badge');
    if (!badge) return;

    badge.classList.remove('cursor-pointer', 'text-rose-400', 'hover:text-rose-300');
    clearTimeout(savedBadgeFadeTimer);

    if (status === 'saving') {
        badge.textContent = '· Guardando…';
    } else if (status === 'error') {
        badge.textContent = '· Error al guardar (tocar)';
        badge.classList.add('cursor-pointer', 'text-rose-400', 'hover:text-rose-300');
    } else if (status === 'saved') {
        badge.textContent = '· Guardado';
        savedBadgeFadeTimer = setTimeout(() => {
            if (state.ui.syncStatus === 'saved') {
                badge.textContent = '';
            }
        }, 2500);
    } else {
        badge.textContent = '';
    }
}

export function setSavingIndicator(isSaving) {
    setSyncStatus(isSaving ? 'saving' : 'saved');
}

export function markTripDeleted(tripId) {
    if (!pendingDeletedTripIds.includes(tripId)) {
        pendingDeletedTripIds.push(tripId);
    }
}

export function consumeDeletedTripIds() {
    const ids = [...pendingDeletedTripIds];
    pendingDeletedTripIds = [];
    return ids;
}

export function getActiveDayId(trip) {
    if (!trip?.days?.length) return '';
    const { activeDayId, collapsedDayIds } = state.ui;
    if (activeDayId && trip.days.some((d) => d.id === activeDayId)) {
        return activeDayId;
    }
    const today = new Date().toISOString().slice(0, 10);
    const todayDay = trip.days.find((d) => {
        const start = d.date;
        if (!start) return false;
        const end = d.dateEnd || d.date_end || start;
        return today >= start && today <= end;
    });
    return todayDay?.id ?? trip.days[0].id;
}

export function setActiveDayId(dayId) {
    setUi({ activeDayId: dayId });
}

export function toggleDayCollapsed(dayId) {
    const collapsed = new Set(state.ui.collapsedDayIds ?? []);
    if (collapsed.has(dayId)) {
        collapsed.delete(dayId);
    } else {
        collapsed.add(dayId);
    }
    setUi({ collapsedDayIds: [...collapsed] });
}

export function moveItineraryDayToIndex(dayId, toIndex) {
    const trip = getActiveTrip();
    if (!trip) return false;

    const days = [...(trip.days ?? [])];
    const fromIndex = days.findIndex((d) => d.id === dayId);
    if (fromIndex === -1) return false;

    const [item] = days.splice(fromIndex, 1);
    const insertAt = Math.max(0, Math.min(toIndex, days.length));
    if (insertAt === fromIndex) {
        days.splice(fromIndex, 0, item);
        return false;
    }
    days.splice(insertAt, 0, item);
    const destinations = rebuildRouteByDayOrder({ ...trip, days });
    updateActiveTrip({ days, destinations });
    return true;
}

export function reorderItineraryDay(dayId, direction) {
    const trip = getActiveTrip();
    if (!trip) return false;
    const days = trip.days ?? [];
    const idx = days.findIndex((d) => d.id === dayId);
    if (idx === -1) return false;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= days.length) return false;
    return moveItineraryDayToIndex(dayId, swapIdx);
}

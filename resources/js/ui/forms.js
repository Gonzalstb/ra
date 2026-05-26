import { DEFAULT_PHOTO_URL } from '../constants/presets';
import {
    getState, getActiveTrip, getActiveDayId, setForm, setUi,
    appendDestination, updateActiveTrip, addTextStopToDay,
} from '../state/plannerStore';
import { destPointKey, clearRouteLegCache } from '../services/routing';
import { defaultFromKey } from './routePlan';
import { scheduleSync } from '../services/syncScheduler';
import { populateDaySelect } from './itinerary';
import { parsePriceInput } from '../utils/formatPrice';
import { geocodeAddress } from '../services/geocoding';
import { showAlert } from './alerts';
import { setActiveTab } from './tabs';
import { focusOnLocation, getMap } from '../map/mapManager';
import { renderSidebar } from './sidebar';
import { hasMapCoords } from '../utils/destinationHelpers';

function getFormStopType(form) {
    if (form.isTextOnly) return 'text';
    if (form.inRoute) return 'route';
    return 'free';
}

export function bindForms(onMapRedraw) {
    updateFormStopTypeUI('route');

    document.querySelectorAll('[data-form-stop-type]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.formStopType;
            if (type === 'text') {
                setForm({ isTextOnly: true, inRoute: false });
            } else if (type === 'free') {
                setForm({ isTextOnly: false, inRoute: false });
            } else {
                setForm({ isTextOnly: false, inRoute: true });
            }
            updateFormStopTypeUI(type);
        });
    });

    document.getElementById('form-round-trip')?.addEventListener('click', () => {
        const { form } = getState().ui;
        setForm({ isRoundTrip: !form.isRoundTrip });
        updateRoundTripUI(!form.isRoundTrip);
    });

    document.getElementById('btn-geocode-address')?.addEventListener('click', async () => {
        const query = document.getElementById('address-search')?.value ?? '';
        if (!query.trim()) {
            showAlert('Por favor, introduce una dirección o lugar primero.', 'error');
            return;
        }
        setUi({ isSearchingAddress: true });
        try {
            const result = await geocodeAddress(query);
            if (result) {
                document.getElementById('form-lat').value = result.lat.toFixed(5);
                document.getElementById('form-lng').value = result.lng.toFixed(5);
                if (!document.getElementById('form-name').value) {
                    document.getElementById('form-name').value = result.name;
                }
                showAlert(`📍 Encontrado mediante: ${result.matchedLabel}.`);
                setActiveTab('map');
                focusOnLocation(result.lat, result.lng);
            } else {
                showAlert('No pudimos localizar esa dirección. Prueba con calle, ciudad y país (ej. «Sant\'Uberto 164, Castagneto Carducci, Italia») o marca el punto en el mapa.', 'error');
            }
        } catch {
            showAlert('Error al conectar con el servidor de búsqueda de direcciones.', 'error');
        } finally {
            setUi({ isSearchingAddress: false });
        }
    });

    document.getElementById('form-add-destination')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('form-name').value.trim();
        const lat = document.getElementById('form-lat').value;
        const lng = document.getElementById('form-lng').value;
        const { form } = getState().ui;

        if (!name) {
            showAlert('Por favor, introduce un nombre para el destino.', 'error');
            return;
        }

        const trip = getActiveTrip();
        const daySelect = document.getElementById('form-day');
        const selectedDayId = daySelect?.value || '';
        const activeDayId = getActiveDayId(trip);

        if (form.isTextOnly) {
            const assignDayId = selectedDayId || activeDayId || null;
            if (!assignDayId) {
                showAlert('Crea un día en el plan o elige uno en «Día del plan».', 'error');
                return;
            }
            const newDest = addTextStopToDay(
                assignDayId,
                name,
                document.getElementById('form-description').value || ''
            );
            if (!newDest) {
                showAlert('No se pudo añadir. Comprueba que el día existe.', 'error');
                return;
            }
            const price = parsePriceInput(document.getElementById('form-price')?.value);
            if (price != null) {
                updateActiveTrip({
                    destinations: getActiveTrip().destinations.map((d) =>
                        d.id === newDest.id ? { ...d, price } : d
                    ),
                });
            }
            resetAddForm();
            setActiveTab('itinerary');
            showAlert(`📝 «${newDest.name}» añadida al día (sin mapa).`, 'success');
            renderSidebar();
            onMapRedraw?.();
            return;
        }

        if (!lat || !lng) {
            showAlert('Por favor, selecciona una posición en el mapa o busca una dirección antes de guardar.', 'error');
            setActiveTab('map');
            return;
        }

        const assignDayId = form.inRoute ? (selectedDayId || activeDayId || null) : null;

        const newDest = {
            id: Date.now().toString(),
            name,
            description: document.getElementById('form-description').value || 'Punto de exploración guardado en el mapa del viaje.',
            photoUrl: (form.inRoute ? document.getElementById('form-photo') : document.getElementById('form-photo-alt'))?.value || document.getElementById('form-photo')?.value || DEFAULT_PHOTO_URL,
            duration: document.getElementById('form-duration').value || '1h',
            isRoundTrip: form.isRoundTrip,
            inRoute: form.inRoute,
            isTextOnly: false,
            dayId: assignDayId,
            isReserved: false,
            price: parsePriceInput(document.getElementById('form-price')?.value),
            lat: parseFloat(lat),
            lng: parseFloat(lng),
        };

        const tripBefore = getActiveTrip();
        const createSegment = form.inRoute
            && document.getElementById('form-create-segment')?.checked !== false;

        appendDestination(newDest, { dayId: assignDayId });

        if (createSegment && tripBefore) {
            const fromKey = defaultFromKey(tripBefore);
            const segs = [...(tripBefore.routeSegments ?? [])];
            segs.push({
                id: `seg-${Date.now()}`,
                fromKey,
                toKey: destPointKey(newDest.id),
                sameRoadAs: null,
            });
            updateActiveTrip({ routeSegments: segs });
            clearRouteLegCache();
            scheduleSync();
        }

        resetAddForm();
        setActiveTab('map');
        showAlert(
            newDest.inRoute
                ? `🚀 ¡Añadida la parada hacia ${newDest.name}!`
                : `🔍 ¡Lugar '${newDest.name}' guardado como Punto Libre!`
        );

        setTimeout(() => {
            const map = getMap();
            if (!map || !hasMapCoords(newDest)) return;
            if (newDest.inRoute) {
                const prevRoute = trip.destinations.filter((d) => d.inRoute && hasMapCoords(d));
                const from = prevRoute.length > 0 ? prevRoute[prevRoute.length - 1] : trip.startingPoint;
                map.fitBounds(window.L.latLngBounds([
                    [from.lat, from.lng],
                    [newDest.lat, newDest.lng],
                ]), { padding: [60, 60] });
            } else {
                focusOnLocation(newDest.lat, newDest.lng);
            }
        }, 300);

        renderSidebar();
        onMapRedraw?.();
    });
}

function resetAddForm() {
    document.getElementById('form-name').value = '';
    document.getElementById('form-description').value = '';
    document.getElementById('form-photo').value = '';
    document.getElementById('form-duration').value = '';
    const priceEl = document.getElementById('form-price');
    if (priceEl) priceEl.value = '';
    document.getElementById('form-lat').value = '';
    document.getElementById('form-lng').value = '';
    document.getElementById('address-search').value = '';
    setForm({
        name: '', description: '', photoUrl: '', duration: '',
        isRoundTrip: false, inRoute: true, isTextOnly: false, coords: { lat: '', lng: '' },
    });
    updateFormStopTypeUI('route');
    updateRoundTripUI(false);
}

function updateCreateSegmentCheckbox() {
    const trip = getActiveTrip();
    const el = document.getElementById('form-create-segment');
    if (!el) return;
    el.checked = (trip?.routeSegments?.length ?? 0) > 0;
}

function updateFormStopTypeUI(type) {
    const isText = type === 'text';
    const inRoute = type === 'route';

    document.getElementById('form-map-fields')?.classList.toggle('hidden', isText);
    document.getElementById('route-fields')?.classList.toggle('hidden', !inRoute);
    document.getElementById('form-create-segment-wrap')?.classList.toggle('hidden', !inRoute);
    document.getElementById('form-day-field')?.classList.toggle('hidden', isText && !(getActiveTrip()?.days?.length));
    if (inRoute) updateCreateSegmentCheckbox();

    const freeField = document.getElementById('free-photo-field');
    freeField?.classList.toggle('hidden', inRoute || isText);
    if (!inRoute && !isText) {
        const photo = document.getElementById('form-photo');
        const alt = document.getElementById('form-photo-alt');
        if (photo && alt) alt.value = photo.value;
    }

    const hint = document.getElementById('form-stop-type-hint');
    if (hint) {
        hint.textContent = isText
            ? 'Solo en el plan del día: bar, comida, tren… No se dibuja en el mapa.'
            : (inRoute
                ? 'Parada en la ruta del mapa. Necesitas ubicación en el mapa o buscar dirección.'
                : 'Punto en el mapa, fuera de la ruta en coche.');
    }

    document.querySelectorAll('[data-form-stop-type]').forEach((btn) => {
        const active = btn.dataset.formStopType === type;
        const t = btn.dataset.formStopType;
        btn.classList.toggle('bg-amber-500/20', active && t === 'route');
        btn.classList.toggle('text-amber-400', active && t === 'route');
        btn.classList.toggle('border-amber-500', active && t === 'route');
        btn.classList.toggle('bg-sky-500/20', active && t === 'free');
        btn.classList.toggle('text-sky-400', active && t === 'free');
        btn.classList.toggle('border-sky-500', active && t === 'free');
        btn.classList.toggle('bg-violet-500/20', active && t === 'text');
        btn.classList.toggle('text-violet-300', active && t === 'text');
        btn.classList.toggle('border-violet-500', active && t === 'text');
        btn.classList.toggle('bg-slate-950', !active);
        btn.classList.toggle('text-slate-400', !active);
        btn.classList.toggle('border-slate-800', !active);
    });

    const field = document.getElementById('form-day-field');
    const trip = getActiveTrip();
    if (field) {
        const showDay = (trip?.days?.length ?? 0) > 0 && (inRoute || isText);
        field.classList.toggle('hidden', !showDay);
        if (showDay) {
            populateDaySelect(document.getElementById('form-day'), getActiveDayId(trip));
        }
    }

    const submit = document.getElementById('btn-submit-dest');
    if (submit) {
        let classes = 'w-full font-extrabold py-3.5 px-4 rounded-xl shadow-lg active:scale-[0.98] transition flex items-center justify-center gap-2 h-12 text-xs md:text-sm ';
        let label = '+ Registrar';
        if (isText) {
            classes += 'bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-500 hover:to-violet-600 text-white';
            label = '+ Añadir al día (sin mapa)';
        } else if (inRoute) {
            classes += 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950';
            label = '+ Registrar Parada y Trazar Ruta';
        } else {
            classes += 'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-slate-950';
            label = '+ Registrar Punto Libre';
        }
        submit.className = classes;
        submit.textContent = label;
    }
}

function updateRoundTripUI(isRoundTrip) {
    const toggle = document.getElementById('round-trip-toggle');
    const knob = document.getElementById('round-trip-knob');
    toggle?.classList.toggle('bg-indigo-600', isRoundTrip);
    toggle?.classList.toggle('bg-slate-700', !isRoundTrip);
    knob?.classList.toggle('translate-x-4', isRoundTrip);
    knob?.classList.toggle('translate-x-0', !isRoundTrip);
}

export function setFormCoords(lat, lng) {
    const { form } = getState().ui;
    if (form.isTextOnly) return;
    document.getElementById('form-lat').value = lat;
    document.getElementById('form-lng').value = lng;
}

export function refreshFormDaySelect() {
    updateCreateSegmentCheckbox();
    const trip = getActiveTrip();
    const { form } = getState().ui;
    const type = getFormStopType(form);
    const field = document.getElementById('form-day-field');
    if (!field) return;
    const hasDays = (trip?.days?.length ?? 0) > 0;
    const show = hasDays && (type === 'route' || type === 'text');
    field.classList.toggle('hidden', !show);
    if (show) {
        populateDaySelect(document.getElementById('form-day'), getActiveDayId(trip));
    }
}

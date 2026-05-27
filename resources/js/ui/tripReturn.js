import { getActiveTrip, updateActiveTrip, setUi, getState } from '../state/plannerStore';
import { getTripEndPoint } from '../services/routing';
import { showAlert } from './alerts';
import { setActiveTab } from './tabs';
import { clearRouteLegCache } from '../services/routing';
import { scheduleSync } from '../services/syncScheduler';
import { focusOnLocation } from '../map/mapManager';
import { initOriginAirportPicker } from './originAirportPicker';

export function renderTripReturnSettings() {
    const trip = getActiveTrip();
    const card = document.getElementById('trip-return-card');
    if (!card || !trip) return;

    const returnToStart = trip.returnToStart !== false;
    const end = getTripEndPoint(trip);

    const toggle = document.getElementById('trip-return-to-start');
    const customFields = document.getElementById('trip-custom-end-fields');
    const endLabel = document.getElementById('trip-end-label');
    const nameInput = document.getElementById('trip-end-name');
    const latInput = document.getElementById('trip-end-lat');
    const lngInput = document.getElementById('trip-end-lng');
    const pickBtn = document.getElementById('btn-pick-end-map');

    if (toggle) toggle.checked = returnToStart;
    customFields?.classList.toggle('hidden', returnToStart);

    if (endLabel) {
        endLabel.textContent = returnToStart
            ? 'Mismo que el origen'
            : (end.name || 'Punto final personalizado');
    }

    if (!returnToStart && trip.endingPoint) {
        if (nameInput) nameInput.value = trip.endingPoint.name ?? '';
        if (latInput) latInput.value = trip.endingPoint.lat ?? '';
        if (lngInput) lngInput.value = trip.endingPoint.lng ?? '';
    }

    const picking = getState().ui.mapPickMode === 'end';
    if (pickBtn) {
        pickBtn.textContent = picking ? 'Toca el mapa…' : 'Elegir en mapa';
        pickBtn.classList.toggle('ring-2', picking);
        pickBtn.classList.toggle('ring-amber-400', picking);
    }
}

function applyReturnSettings(fields, onMapRedraw) {
    const trip = getActiveTrip();
    if (!trip) return;

    updateActiveTrip(fields);
    clearRouteLegCache();
    renderTripReturnSettings();
    onMapRedraw?.();
    scheduleSync();
}

function applyTripEndFromPicker({ name, lat, lng }, onMapRedraw) {
    const nameInput = document.getElementById('trip-end-name');
    const latInput = document.getElementById('trip-end-lat');
    const lngInput = document.getElementById('trip-end-lng');
    if (nameInput) nameInput.value = name;
    if (latInput) latInput.value = lat;
    if (lngInput) lngInput.value = lng;

    applyReturnSettings({
        returnToStart: false,
        endingPoint: { name, lat, lng },
    }, onMapRedraw);

    setActiveTab('map');
    focusOnLocation(lat, lng);
}

export function bindTripReturn(onMapRedraw) {
    initOriginAirportPicker('trip-end', {
        onSelect: (coords) => applyTripEndFromPicker(coords, onMapRedraw),
        messages: {
            airportSuccess: (label) => `🏁 Punto final: ${label}`,
            geocodeSuccess: '📍 Punto final localizado por dirección.',
        },
    });

    document.getElementById('trip-return-to-start')?.addEventListener('change', (e) => {
        const returnToStart = e.target.checked;
        const trip = getActiveTrip();
        if (!trip) return;

        if (returnToStart) {
            applyReturnSettings({ returnToStart: true, endingPoint: null }, onMapRedraw);
            showAlert('El viaje terminará de vuelta en el origen.', 'info');
        } else {
            const end = trip.endingPoint ?? {
                name: 'Punto final',
                lat: trip.startingPoint.lat,
                lng: trip.startingPoint.lng,
            };
            applyReturnSettings({ returnToStart: false, endingPoint: end }, onMapRedraw);
            showAlert('Indica dónde termina el viaje (distinto del origen si quieres).', 'info');
        }
    });

    document.getElementById('btn-save-trip-end')?.addEventListener('click', () => {
        const name = document.getElementById('trip-end-name')?.value?.trim() || 'Punto final';
        const lat = parseFloat(document.getElementById('trip-end-lat')?.value);
        const lng = parseFloat(document.getElementById('trip-end-lng')?.value);
        if (Number.isNaN(lat) || Number.isNaN(lng)) {
            showAlert('Introduce coordenadas válidas o elige en el mapa.', 'error');
            return;
        }
        applyReturnSettings({
            returnToStart: false,
            endingPoint: { name, lat, lng },
        }, onMapRedraw);
        showAlert(`Punto final: ${name}`, 'success');
    });

    document.getElementById('btn-pick-end-map')?.addEventListener('click', () => {
        const trip = getActiveTrip();
        if (!trip) return;
        if (trip.returnToStart !== false) {
            showAlert('Desactiva «Mismo origen» para elegir otro punto final.', 'info');
            return;
        }
        setUi({ mapPickMode: 'end' });
        renderTripReturnSettings();
        setActiveTab('map');
        showAlert('Toca el mapa para marcar el punto final del viaje.', 'info');
    });
}

export function handleMapPickEnd(lat, lng, onMapRedraw) {
    const name = document.getElementById('trip-end-name')?.value?.trim() || 'Punto final';
    document.getElementById('trip-end-lat').value = lat.toFixed(5);
    document.getElementById('trip-end-lng').value = lng.toFixed(5);
    if (!document.getElementById('trip-end-name')?.value?.trim()) {
        document.getElementById('trip-end-name').value = 'Punto final';
    }

    applyReturnSettings({
        returnToStart: false,
        endingPoint: { name, lat, lng },
    }, onMapRedraw);

    setUi({ mapPickMode: null });
    showAlert('Punto final guardado en el mapa.', 'success');
}

export function isPickingEndOnMap() {
    return getState().ui.mapPickMode === 'end';
}

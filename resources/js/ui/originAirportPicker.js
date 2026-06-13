import { fetchCountries, fetchAirportsByCountry } from '../services/airportsApi';
import { geocodeAddress, geocodeErrorMessage } from '../services/geocoding';
import { showAlert } from './alerts';

const pickers = new Map();

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
}

function formatAirportLabel(airport) {
    const city = airport.city ? `${airport.city} · ` : '';
    return `${airport.iata} — ${city}${airport.name}`;
}

const DEFAULT_MESSAGES = {
    geocodeEmpty: 'Escribe una dirección para buscar.',
    geocodeSuccess: '📍 Ubicación localizada por dirección.',
    geocodeNotFound: 'No se encontró esa dirección.',
    geocodeError: 'Error al buscar la dirección.',
    airportSuccess: (label) => `✈️ Origen: ${label}`,
};

export function initOriginAirportPicker(prefix, { onSelect, getCurrent, messages: messageOverrides } = {}) {
    const messages = { ...DEFAULT_MESSAGES, ...messageOverrides };
    const root = document.querySelector(`[data-origin-picker="${prefix}"]`);
    if (!root || pickers.has(prefix)) {
        return pickers.get(prefix);
    }

    const countrySelect = root.querySelector('[data-origin-country]');
    const airportSelect = root.querySelector('[data-origin-airport]');
    const searchWrap = document.getElementById(`${prefix}-airport-search-wrap`);
    const searchInput = root.querySelector('[data-origin-airport-search]');
    const hintEl = document.getElementById(`${prefix}-airport-hint`);
    const geocodeBtn = root.querySelector('[data-origin-geocode-btn]');
    const addressInput = root.querySelector('[data-origin-address-search]');

    let allAirports = [];
    let selectedAirport = null;

    const state = {
        setFields(name, lat, lng) {
            onSelect?.({ name, lat, lng });
        },
        getSelected() {
            return selectedAirport;
        },
        reset() {
            selectedAirport = null;
            countrySelect.value = '';
            airportSelect.innerHTML = '<option value="">Primero elige un país</option>';
            airportSelect.disabled = true;
            searchWrap?.classList.add('hidden');
            if (searchInput) searchInput.value = '';
            hintEl?.classList.add('hidden');
        },
    };

    async function loadCountries() {
        try {
            const countries = await fetchCountries();
            countrySelect.innerHTML = '<option value="">Selecciona un país…</option>'
                + countries.map((c) =>
                    `<option value="${c.code}">${escapeHtml(c.name)}</option>`
                ).join('');
        } catch {
            showAlert('No se pudo cargar la lista de países.', 'error');
        }
    }

    function renderAirportOptions(airports) {
        const filter = (searchInput?.value ?? '').trim().toLowerCase();
        const filtered = filter
            ? airports.filter((a) =>
                formatAirportLabel(a).toLowerCase().includes(filter)
                || a.iata.toLowerCase().includes(filter)
            )
            : airports;

        airportSelect.innerHTML = filtered.length
            ? '<option value="">Selecciona un aeropuerto…</option>'
                + filtered.map((a) =>
                    `<option value="${a.iata}">${escapeHtml(formatAirportLabel(a))}</option>`
                ).join('')
            : '<option value="">Sin resultados</option>';

        if (hintEl) {
            hintEl.textContent = `${filtered.length} de ${airports.length} aeropuertos`;
            hintEl.classList.toggle('hidden', airports.length === 0);
        }
    }

    countrySelect?.addEventListener('change', async () => {
        const code = countrySelect.value;
        selectedAirport = null;
        searchInput && (searchInput.value = '');

        if (!code) {
            airportSelect.innerHTML = '<option value="">Primero elige un país</option>';
            airportSelect.disabled = true;
            searchWrap?.classList.add('hidden');
            hintEl?.classList.add('hidden');
            return;
        }

        airportSelect.disabled = true;
        airportSelect.innerHTML = '<option value="">Cargando aeropuertos…</option>';

        try {
            allAirports = await fetchAirportsByCountry(code);
            renderAirportOptions(allAirports);
            airportSelect.disabled = allAirports.length === 0;

            if (allAirports.length > 8) {
                searchWrap?.classList.remove('hidden');
            } else {
                searchWrap?.classList.add('hidden');
            }
        } catch {
            airportSelect.innerHTML = '<option value="">Error al cargar</option>';
            showAlert('No se pudieron cargar los aeropuertos de ese país.', 'error');
        }
    });

    searchInput?.addEventListener('input', () => {
        renderAirportOptions(allAirports);
    });

    airportSelect?.addEventListener('change', () => {
        const iata = airportSelect.value;
        if (!iata) {
            selectedAirport = null;
            return;
        }

        const airport = allAirports.find((a) => a.iata === iata);
        if (!airport) return;

        selectedAirport = airport;
        const label = `${airport.name} (${airport.iata})`;
        state.setFields(label, airport.lat, airport.lng);
        showAlert(messages.airportSuccess(label), 'success');
    });

    geocodeBtn?.addEventListener('click', async () => {
        const query = addressInput?.value?.trim();
        if (!query) {
            showAlert(messages.geocodeEmpty, 'error');
            return;
        }
        try {
            const result = await geocodeAddress(query, false);
            if (result) {
                state.setFields(result.name, result.lat, result.lng);
                showAlert(messages.geocodeSuccess, 'success');
            } else {
                showAlert(messages.geocodeNotFound, 'error');
            }
        } catch (err) {
            showAlert(geocodeErrorMessage(err), 'error');
        }
    });

    loadCountries();

    const current = getCurrent?.();
    if (current?.lat && current?.lng) {
        // Mantener valores actuales en campos del formulario padre
    }

    pickers.set(prefix, state);
    return state;
}

export function getOriginAirportPicker(prefix) {
    return pickers.get(prefix);
}

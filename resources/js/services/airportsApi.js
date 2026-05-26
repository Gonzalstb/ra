let countriesCache = null;
const airportsCache = new Map();

export async function fetchCountries() {
    if (countriesCache) {
        return countriesCache;
    }

    const response = await fetch('/airports/countries', {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    });

    if (!response.ok) {
        throw new Error('No se pudieron cargar los países');
    }

    const data = await response.json();
    countriesCache = data.countries ?? [];

    return countriesCache;
}

export async function fetchAirportsByCountry(countryCode) {
    const code = countryCode.toUpperCase();
    if (airportsCache.has(code)) {
        return airportsCache.get(code);
    }

    const response = await fetch(`/airports?country=${encodeURIComponent(code)}`, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    });

    if (!response.ok) {
        throw new Error('No se pudieron cargar los aeropuertos');
    }

    const data = await response.json();
    const airports = data.airports ?? [];
    airportsCache.set(code, airports);

    return airports;
}

async function nominatimSearch(query, includeLocalita = true) {
    const params = new URLSearchParams({ q: query });
    if (!includeLocalita) {
        params.set('includeLocalita', '0');
    }

    const response = await fetch(`/geocode?${params}`, {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    });

    if (response.status === 404) {
        return null;
    }

    if (!response.ok) {
        throw new Error('Error en geocoding');
    }

    return response.json();
}

export async function geocodeAddress(rawQuery, includeLocalita = true) {
    const result = await nominatimSearch(rawQuery.trim(), includeLocalita);
    return result;
}

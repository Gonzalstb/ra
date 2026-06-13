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

    if (response.status === 429) {
        throw new GeocodeRateLimitError();
    }

    if (!response.ok) {
        throw new Error('Error en geocoding');
    }

    return response.json();
}

export class GeocodeRateLimitError extends Error {
    constructor() {
        super('rate_limit');
        this.name = 'GeocodeRateLimitError';
    }
}

/** Elimina texto de confirmaciones de reserva y recorta consultas demasiado largas. */
export function sanitizeGeocodeQuery(rawQuery) {
    let q = String(rawQuery ?? '').trim();
    if (!q) return '';

    const firstLine = q.split(/\r?\n/).map((line) => line.trim()).find((line) => line.length > 0) ?? q;
    q = firstLine;

    const cutPatterns = [
        /\b(después de reservar|after booking|once you have booked|tras la reserva|after your booking)\b/i,
        /\b(encontrarás todos los datos|you will find all the details|you'll find all)\b/i,
        /\b(confirmación de la reserva|booking confirmation|in your account|en tu cuenta)\b/i,
    ];
    for (const pattern of cutPatterns) {
        const match = q.match(pattern);
        if (match && match.index > 8) {
            q = q.slice(0, match.index).trim();
        }
    }

    q = q.replace(
        /(Italia|Italy|España|Espana|Spain|France|Francia|Portugal|Germany|Alemania)(?=[A-ZÁÉÍÓÚÀ-ÿ])/u,
        '$1',
    );

    const addressMatch = q.match(/^(.+?\b\d{5}\b[^.!?]{0,80}?)(?:[.!?]|$)/u);
    if (addressMatch?.[1]) {
        const candidate = addressMatch[1].trim();
        if (candidate.length >= 10) q = candidate;
    }

    q = q.replace(/\s+/g, ' ').trim();
    if (q.length > 200) q = q.slice(0, 200).trim();

    return q;
}

export function geocodeErrorMessage(err) {
    if (err instanceof GeocodeRateLimitError) {
        return 'Demasiadas búsquedas seguidas. Espera un minuto e inténtalo de nuevo.';
    }
    return 'Error al conectar con el servidor de búsqueda de direcciones.';
}

export async function geocodeAddress(rawQuery, includeLocalita = true) {
    const query = sanitizeGeocodeQuery(rawQuery);
    if (!query) {
        return null;
    }
    const result = await nominatimSearch(query, includeLocalita);
    return result;
}

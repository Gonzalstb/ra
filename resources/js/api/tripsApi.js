const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';

async function handleResponse(response) {
    if (response.status === 401 || response.status === 419) {
        window.location.href = '/login';
        throw new Error('Sesión expirada');
    }

    if (!response.ok) {
        let message = 'Error en la petición al servidor';
        try {
            const payload = await response.json();
            if (payload?.message) message = payload.message;
        } catch {
            // keep default message
        }
        throw new Error(message);
    }

    return response.json();
}

export async function fetchTrips() {
    const response = await fetch('/trips', {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
    });

    return handleResponse(response);
}

export async function syncTrips(trips, activeTripId, deletedTripIds = []) {
    const response = await fetch('/trips/sync', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({ trips, activeTripId, deletedTripIds }),
    });

    return handleResponse(response);
}

export async function shareTrip(tripId, email) {
    const response = await fetch(`/trips/${encodeURIComponent(tripId)}/share`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-TOKEN': getCsrfToken(),
        },
        credentials: 'same-origin',
        body: JSON.stringify({ email }),
    });

    return handleResponse(response);
}

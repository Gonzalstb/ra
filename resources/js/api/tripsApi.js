const getCsrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';

async function handleResponse(response) {
    if (response.status === 401 || response.status === 419) {
        window.location.href = '/login';
        throw new Error('Sesión expirada');
    }

    if (!response.ok) {
        throw new Error('Error en la petición al servidor');
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

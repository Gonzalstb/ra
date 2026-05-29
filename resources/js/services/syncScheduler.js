import { getState, setSyncStatus, tripsDataChanged, setStateFromServer, consumeDeletedTripIds } from '../state/plannerStore';
import { syncTrips } from '../api/tripsApi';
import { showAlert } from '../ui/alerts';
import { normalizeTrip } from '../utils/tripNormalize';
import {
    isBarDestination, isHotelDestination, isTextOnlyDestination, isWineryDestination,
} from '../utils/destinationHelpers';

let syncTimer = null;
let syncInFlight = false;
let syncPending = false;

/** Preserva en el estado local flags que el servidor aún no devuelve bien. */
function mergeServerTripsPreservingLocalFields(serverTrips, localTrips, activeTripId) {
    const localTrip = localTrips.find((t) => t.id === activeTripId);
    const serverTrip = serverTrips.find((t) => t.id === activeTripId);
    if (!localTrip || !serverTrip) return serverTrips;

    const localDests = localTrip.destinations ?? [];
    const serverDests = serverTrip.destinations ?? [];
    const serverIds = new Set(serverDests.map((d) => d.id));

    const mergedDests = serverDests.map((sd) => {
        const local = localDests.find((d) => d.id === sd.id);
        if (!local) return sd;
        let next = sd;
        if (isWineryDestination(local) && !isWineryDestination(sd)) {
            next = { ...next, isWinery: true };
        }
        if (isHotelDestination(local) && !isHotelDestination(sd)) {
            next = { ...next, isHotel: true };
        }
        if (isBarDestination(local) && !isBarDestination(sd)) {
            next = { ...next, isBar: true };
        }
        if (local.isReserved && !sd.isReserved) {
            next = { ...next, isReserved: true };
        }
        return next;
    });

    const missingLocal = localDests.filter((d) => !serverIds.has(d.id));

    return serverTrips.map((t) => {
        if (t.id !== activeTripId) return t;
        return {
            ...t,
            destinations: [...mergedDests, ...missingLocal],
        };
    });
}

function runSync(force = false) {
    const { ui, trips, activeTripId } = getState();

    if (!ui.dataLoaded || ui.skipSync || !trips.length || !activeTripId) {
        return;
    }

    if (!force && !tripsDataChanged()) {
        return;
    }

    clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
        const current = getState();
        if (!force && !tripsDataChanged()) return;

        syncInFlight = true;
        setSyncStatus('saving');
        try {
            const deletedTripIds = consumeDeletedTripIds();
            const data = await syncTrips(current.trips, current.activeTripId, deletedTripIds);
            if (data?.trips) {
                const mergedTrips = mergeServerTripsPreservingLocalFields(
                    data.trips,
                    current.trips,
                    data.activeTripId ?? current.activeTripId
                );
                setStateFromServer({
                    trips: mergedTrips.map(normalizeTrip),
                    activeTripId: data.activeTripId ?? current.activeTripId,
                });
            }
            setSyncStatus('saved');
        } catch (err) {
            console.error(err);
            setSyncStatus('error');
            showAlert('Error al guardar los cambios en el servidor.', 'error');
        } finally {
            syncInFlight = false;
            if (syncPending) {
                syncPending = false;
                runSync(true);
            } else if (tripsDataChanged()) {
                runSync(true);
            }
        }
    }, force ? 0 : 800);
}

export function scheduleSync(force = false) {
    if (syncInFlight) {
        syncPending = true;
        return;
    }

    runSync(force);
}

export function retrySync() {
    if (getState().ui.syncStatus === 'error') {
        scheduleSync(true);
    }
}

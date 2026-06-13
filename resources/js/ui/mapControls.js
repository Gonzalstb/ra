import { getActiveTrip, toggleHideOffRouteMapPoints, isHideOffRouteMapPoints } from '../state/plannerStore';
import { showAlert } from './alerts';

export function countOffRouteMapPoints(trip) {
    if (!trip) return 0;
    return (trip.destinations ?? []).filter(
        (d) => !d.isTextOnly && d.lat != null && d.lng != null && !d.inRoute,
    ).length;
}

export function renderMapPointsVisibilityControl() {
    const btn = document.getElementById('btn-map-hide-off-route');
    const badge = document.getElementById('map-off-route-count');
    const label = document.getElementById('map-hide-off-route-label');
    const iconWrap = document.getElementById('map-hide-off-route-icon');
    if (!btn) return;

    const trip = getActiveTrip();
    const hidden = isHideOffRouteMapPoints();
    const offRouteCount = countOffRouteMapPoints(trip);

    btn.disabled = offRouteCount === 0 && !hidden;
    btn.setAttribute('aria-pressed', hidden ? 'true' : 'false');
    btn.title = offRouteCount === 0
        ? 'No hay puntos libres en el mapa'
        : (hidden
            ? `Mostrando solo paradas en ruta (${offRouteCount} oculto${offRouteCount !== 1 ? 's' : ''}). Pulsa para ver todos.`
            : `Ocultar ${offRouteCount} punto${offRouteCount !== 1 ? 's' : ''} libre${offRouteCount !== 1 ? 's' : ''} del mapa`);

    btn.classList.toggle('map-vis-btn--active', hidden);
    btn.classList.toggle('opacity-50', offRouteCount === 0 && !hidden);
    btn.classList.toggle('cursor-not-allowed', offRouteCount === 0 && !hidden);

    if (badge) {
        badge.textContent = String(offRouteCount);
        badge.classList.toggle('hidden', offRouteCount === 0);
    }

    if (label) {
        label.textContent = hidden ? 'Solo ruta' : 'Puntos libres';
    }

    if (iconWrap) {
        iconWrap.innerHTML = hidden
            ? `<svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>`
            : `<svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>`;
    }
}

export function bindMapControls(onMapRedraw) {
    const btn = document.getElementById('btn-map-hide-off-route');
    if (!btn || btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';

    btn.addEventListener('click', () => {
        const trip = getActiveTrip();
        const offRouteCount = countOffRouteMapPoints(trip);
        if (offRouteCount === 0 && !isHideOffRouteMapPoints()) {
            showAlert('No hay puntos libres que ocultar.', 'info');
            return;
        }

        toggleHideOffRouteMapPoints();
        const hidden = isHideOffRouteMapPoints();
        renderMapPointsVisibilityControl();
        onMapRedraw?.();

        if (hidden) {
            showAlert(
                offRouteCount
                    ? `${offRouteCount} punto${offRouteCount !== 1 ? 's' : ''} libre${offRouteCount !== 1 ? 's' : ''} oculto${offRouteCount !== 1 ? 's' : ''}. Solo se muestran paradas en ruta.`
                    : 'Solo se muestran paradas en ruta.',
                'info',
            );
        } else {
            showAlert('Todos los puntos del mapa visibles de nuevo.', 'info');
        }
    });
}

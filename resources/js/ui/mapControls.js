import { getActiveTrip, toggleHideOffRouteMapPoints, isHideOffRouteMapPoints } from '../state/plannerStore';
import { isOffRouteMapPoint } from '../services/routing';
import { showAlert } from './alerts';

export function countOffRouteMapPoints(trip) {
    if (!trip) return 0;
    return (trip.destinations ?? []).filter((d) => isOffRouteMapPoint(trip, d)).length;
}

const EYE_OPEN_SVG = `<svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>`;

const EYE_OFF_SVG = `<svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>`;

export function renderMapPointsVisibilityControl() {
    const btn = document.getElementById('btn-map-hide-off-route');
    const badge = document.getElementById('map-off-route-count');
    const iconWrap = document.getElementById('map-hide-off-route-icon');
    if (!btn) return;

    const trip = getActiveTrip();
    const hidden = isHideOffRouteMapPoints();
    const offRouteCount = countOffRouteMapPoints(trip);
    const canToggle = offRouteCount > 0 || hidden;

    btn.setAttribute('aria-pressed', hidden ? 'true' : 'false');
    btn.setAttribute('aria-label', hidden
        ? 'Mostrar todos los puntos del mapa'
        : 'Ocultar puntos libres del mapa');

    btn.title = offRouteCount === 0
        ? (hidden ? 'Mostrar todos los puntos del mapa' : 'No hay puntos libres que ocultar')
        : (hidden
            ? `Mostrando solo paradas en ruta (${offRouteCount} oculto${offRouteCount !== 1 ? 's' : ''}). Pulsa para ver todos.`
            : `Ocultar ${offRouteCount} punto${offRouteCount !== 1 ? 's' : ''} libre${offRouteCount !== 1 ? 's' : ''} del mapa`);

    btn.classList.toggle('map-vis-btn--active', hidden);
    btn.classList.toggle('opacity-40', !canToggle);
    btn.classList.toggle('cursor-not-allowed', !canToggle);

    if (badge) {
        badge.textContent = String(offRouteCount);
        badge.classList.toggle('hidden', offRouteCount === 0);
    }

    if (iconWrap) {
        iconWrap.innerHTML = hidden ? EYE_OFF_SVG : EYE_OPEN_SVG;
    }
}

export function bindMapControls(onMapRedraw) {
    const btn = document.getElementById('btn-map-hide-off-route');
    if (!btn || btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';

    renderMapPointsVisibilityControl();

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

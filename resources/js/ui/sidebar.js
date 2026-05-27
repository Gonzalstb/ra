import {
    getState, getActiveTrip, setState, updateActiveTrip,
    reorderRouteDestination, setDestinationRouteStatus, splitDestinations,
} from '../state/plannerStore';
import { showAlert } from './alerts';
import { setActiveTab } from './tabs';
import { focusOnLocation } from '../map/mapManager';
import { openDeleteDestModal, openEditDestModal } from './modals';
import { renderTripReturnSettings } from './tripReturn';
import { renderRoutePlan, getDestSegmentNumbers } from './routePlan';
import {
    destinationFreePoiLabel, destinationPlaceBadgeHtml, isTextOnlyDestination,
} from '../utils/destinationHelpers';
import { openDirections } from '../services/mapsLinks';
import { icon } from './icons';

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
}

function renderDragHandle(dest) {
    return `
    <div class="route-drag-handle flex items-center justify-center shrink-0 p-1.5 rounded-md text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 cursor-grab active:cursor-grabbing touch-none min-h-[40px] min-w-[32px]"
      draggable="true" data-route-drag-handle data-dest-id="${dest.id}" title="Arrastrar para reordenar">
      ${icon('grip')}
    </div>`;
}

function renderMoveButtons(dest, index, routeCount) {
    const upDisabled = index === 0;
    const downDisabled = index === routeCount - 1;
    const btnClass = 'p-1 rounded-md transition min-h-[36px] min-w-[36px] flex items-center justify-center';
    const enabledClass = 'text-amber-500/80 hover:text-amber-400 hover:bg-amber-500/10';
    const disabledClass = 'text-slate-700 cursor-not-allowed opacity-40';

    return `
    <div class="flex flex-col gap-0.5 shrink-0">
      <button type="button" data-move-route="${dest.id}" data-direction="up" ${upDisabled ? 'disabled' : ''}
        class="${btnClass} ${upDisabled ? disabledClass : enabledClass}" title="Subir">${icon('chevronUp')}</button>
      <button type="button" data-move-route="${dest.id}" data-direction="down" ${downDisabled ? 'disabled' : ''}
        class="${btnClass} ${downDisabled ? disabledClass : enabledClass}" title="Bajar">${icon('chevronDown')}</button>
    </div>`;
}

function renderMapsButton(dest, index, routeDestinations, trip) {
    const prev = index === 0
        ? { lat: trip.startingPoint.lat, lng: trip.startingPoint.lng }
        : { lat: routeDestinations[index - 1].lat, lng: routeDestinations[index - 1].lng };

    return `
    <button type="button" data-open-maps data-from-lat="${prev.lat}" data-from-lng="${prev.lng}"
      data-to-lat="${dest.lat}" data-to-lng="${dest.lng}"
      class="text-[10px] font-bold text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 px-2 py-1 rounded-lg border border-sky-500/20 transition shrink-0"
      title="Abrir en Maps">🧭 Maps</button>`;
}

function renderActionButtons(dest, isRoute) {
    const toggleClass = isRoute
        ? 'bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/20'
        : 'bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-slate-950 border border-sky-500/20';

    return `
    <div class="dest-card-actions flex items-center justify-end gap-1 shrink-0">
      <button type="button" data-edit-dest="${dest.id}" class="dest-action-btn p-2 text-slate-500 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition" title="Editar">${icon('edit')}</button>
      <button type="button" data-delete-dest="${dest.id}" data-dest-name="${escapeHtml(dest.name)}" class="dest-action-btn p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition" title="Eliminar">${icon('trash')}</button>
      <button type="button" data-toggle-route="${dest.id}" class="dest-action-btn p-2 ${toggleClass} rounded-lg transition" title="${isRoute ? 'Desconectar de ruta' : 'Conectar a ruta'}">${isRoute ? icon('linkOff') : icon('link')}</button>
    </div>`;
}

function renderDestCard(dest, index, type, trip, routeDestinations = [], routeCount = 0) {
    const isRoute = type === 'route';
    const textOnly = isTextOnlyDestination(dest);
    const placeBadge = destinationPlaceBadgeHtml(dest);
    const dayTitle = dest.dayId ? (trip.days ?? []).find((d) => d.id === dest.dayId)?.title : null;
    const segNums = isRoute ? getDestSegmentNumbers(trip, dest.id) : [];
    const segBadge = segNums.length
        ? `<span class="text-[9px] font-bold text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">En tramo ${segNums.join(', ')}</span>`
        : '';
    const borderClass = isRoute
        ? 'border-amber-500/20 hover:border-amber-500/40'
        : 'border-sky-500/10 hover:border-sky-500/30';
    const bgClass = isRoute
        ? 'bg-slate-900/80 hover:bg-slate-900'
        : 'bg-slate-900/40 hover:bg-slate-900/70';

    return `
    <div class="dest-card group ${bgClass} border ${borderClass} p-3 rounded-xl flex flex-col gap-2 transition duration-200 overflow-hidden"
      data-dest-card data-route-item="${isRoute ? 'true' : 'false'}" data-dest-id="${dest.id}" data-lat="${dest.lat}" data-lng="${dest.lng}">
      <div class="flex gap-2 min-w-0 items-start">
        ${isRoute ? `<div class="dest-card-reorder flex items-center gap-0.5 shrink-0">${renderDragHandle(dest)}${renderMoveButtons(dest, index, routeCount)}</div>` : ''}
        <div class="flex flex-1 min-w-0 gap-2 cursor-pointer" data-dest-card-body>
          <div class="w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden shrink-0 bg-slate-800 border border-slate-700 relative flex items-center justify-center">
            ${textOnly
        ? '<span class="text-xl">📝</span>'
        : `<img src="${escapeHtml(dest.photoUrl)}" alt="" class="w-full h-full object-cover" />
            ${isRoute
        ? `<span class="absolute bottom-0 right-0 bg-slate-950/90 text-[8px] text-amber-400 font-extrabold px-1 py-0.5 rounded-tl-md">#${index + 1}</span>`
        : `<span class="absolute top-0.5 left-0.5 bg-sky-950/90 text-[8px] text-sky-400 font-extrabold px-1 py-0.5 rounded">${destinationFreePoiLabel(dest)}</span>`}`}
          </div>
          <div class="flex-1 min-w-0 text-left">
            <h4 class="font-bold text-sm ${isRoute ? 'text-white' : 'text-slate-300'} truncate">${escapeHtml(dest.name)}</h4>
            <div class="flex flex-wrap gap-1 mt-0.5">
            ${dayTitle ? `<span class="text-[9px] font-bold text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20 max-w-full truncate">${escapeHtml(dayTitle)}</span>` : ''}
            ${segBadge}
            ${dest.isReserved ? '<span class="text-[9px] font-bold text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">Reservado</span>' : ''}
            ${placeBadge}
            </div>
            <p class="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">${escapeHtml(dest.description)}</p>
          </div>
        </div>
      </div>
      ${isRoute
        ? `<div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold pl-0 sm:pl-[4.5rem]">
            <span class="text-amber-400">${escapeHtml(dest.duration)}</span>
            <span class="text-indigo-400 whitespace-nowrap">${dest.isRoundTrip ? '🔄 Ida/Vuelta' : '➡️ Solo Ida'}</span>
            ${renderMapsButton(dest, index, routeDestinations, trip)}
          </div>`
        : `<div class="text-[10px] text-slate-500 pl-0">${dest.lat != null && dest.lng != null ? `${dest.lat.toFixed(2)}, ${dest.lng.toFixed(2)}` : 'Nota del plan (sin mapa)'}</div>`}
      <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
        ${isRoute ? '<span class="text-[9px] text-slate-600 hidden sm:inline">⋮⋮ Arrastra · ▲▼</span>' : '<span class="sr-only">Acciones</span>'}
        ${renderActionButtons(dest, isRoute)}
      </div>
    </div>`;
}

export function renderSidebar() {
    const trip = getActiveTrip();
    const { trips, activeTripId } = getState();

    if (!trip) return;

    const { route: routeDestinations, standalone: standalonePoints } = splitDestinations(trip.destinations);
    const mapStandalonePoints = standalonePoints.filter((d) => !isTextOnlyDestination(d));

    document.getElementById('stat-route')?.replaceChildren(document.createTextNode(String(routeDestinations.length)));
    document.getElementById('stat-standalone')?.replaceChildren(document.createTextNode(String(mapStandalonePoints.length)));
    document.getElementById('stat-total')?.replaceChildren(document.createTextNode(String(trip.destinations.length + 1)));
    document.getElementById('route-count')?.replaceChildren(document.createTextNode(String(routeDestinations.length)));
    document.getElementById('standalone-count')?.replaceChildren(document.createTextNode(String(mapStandalonePoints.length)));
    document.getElementById('origin-name')?.replaceChildren(document.createTextNode(trip.startingPoint.name));
    renderTripReturnSettings();
    renderRoutePlan();

    const printBtn = document.getElementById('btn-print-trip');
    if (printBtn) {
        printBtn.href = `/trips/print?trip=${encodeURIComponent(trip.id)}`;
    }

    const select = document.getElementById('trip-select');
    if (select) {
        select.innerHTML = trips.map((t) => `<option value="${t.id}" ${t.id === activeTripId ? 'selected' : ''}>💼 ${escapeHtml(t.name)}</option>`).join('');
    }

    document.getElementById('btn-delete-trip')?.classList.toggle('hidden', trips.length <= 1);

    const routeList = document.getElementById('route-list');
    const standaloneList = document.getElementById('standalone-list');

    if (routeList) {
        routeList.innerHTML = routeDestinations.length
            ? routeDestinations.map((d, i) => renderDestCard(d, i, 'route', trip, routeDestinations, routeDestinations.length)).join('')
            : '<p class="text-xs text-slate-500 italic py-4 text-center bg-slate-900/20 rounded-xl border border-slate-800/40">Ningún punto conectado. Utiliza los botones de conexión rápida de abajo o haz clic en el mapa.</p>';
    }

    if (standaloneList) {
        standaloneList.innerHTML = mapStandalonePoints.length
            ? mapStandalonePoints.map((d) => renderDestCard(d, 0, 'standalone', trip)).join('')
            : '<p class="text-xs text-slate-500 italic py-4 text-center bg-slate-900/20 rounded-xl border border-slate-800/40">No tienes puntos libres creados en el mapa.</p>';
    }
}

export function bindSidebarListEvents(onMapRedraw) {
    document.getElementById('trip-select')?.addEventListener('change', (e) => {
        setState({ activeTripId: e.target.value });
        renderSidebar();
        onMapRedraw?.();
    });

    document.getElementById('sidebar-content')?.addEventListener('click', (e) => {
        const mapsBtn = e.target.closest('[data-open-maps]');
        if (mapsBtn) {
            e.stopPropagation();
            openDirections(
                { lat: parseFloat(mapsBtn.dataset.fromLat), lng: parseFloat(mapsBtn.dataset.fromLng) },
                { lat: parseFloat(mapsBtn.dataset.toLat), lng: parseFloat(mapsBtn.dataset.toLng) }
            );
            return;
        }

        const moveBtn = e.target.closest('[data-move-route]');
        if (moveBtn && !moveBtn.disabled) {
            e.stopPropagation();
            const destId = moveBtn.dataset.moveRoute;
            const direction = moveBtn.dataset.direction;
            const trip = getActiveTrip();
            const dest = trip?.destinations.find((d) => d.id === destId);
            if (reorderRouteDestination(destId, direction)) {
                showAlert(
                    direction === 'up'
                        ? `⬆️ '${dest?.name}' subió en el orden de la ruta.`
                        : `⬇️ '${dest?.name}' bajó en el orden de la ruta.`,
                    'info'
                );
                renderSidebar();
                onMapRedraw?.();
            }
            return;
        }

        const editBtn = e.target.closest('[data-edit-dest]');
        if (editBtn) {
            e.stopPropagation();
            openEditDestModal(editBtn.dataset.editDest);
            return;
        }

        const deleteBtn = e.target.closest('[data-delete-dest]');
        if (deleteBtn) {
            e.stopPropagation();
            openDeleteDestModal(deleteBtn.dataset.deleteDest, deleteBtn.dataset.destName);
            return;
        }

        const toggleBtn = e.target.closest('[data-toggle-route]');
        if (toggleBtn) {
            e.stopPropagation();
            const id = toggleBtn.dataset.toggleRoute;
            const trip = getActiveTrip();
            const dest = trip.destinations.find((d) => d.id === id);
            if (!dest) return;
            const inRoute = !dest.inRoute;
            setDestinationRouteStatus(id, inRoute);
            showAlert(
                inRoute ? `📍 '${dest.name}' se ha conectado al final de la ruta.` : `🔍 '${dest.name}' ahora se muestra como punto libre en el mapa.`,
                inRoute ? 'success' : 'info'
            );
            renderSidebar();
            onMapRedraw?.();
            return;
        }

        const cardBody = e.target.closest('[data-dest-card-body]');
        if (cardBody) {
            const card = cardBody.closest('[data-dest-card]');
            const destId = card?.dataset.destId;
            const dest = getActiveTrip()?.destinations.find((d) => d.id === destId);
            if (card && dest && dest.lat != null && dest.lng != null && !dest.isTextOnly) {
                if (window.innerWidth < 1024) setActiveTab('map');
                focusOnLocation(parseFloat(card.dataset.lat), parseFloat(card.dataset.lng));
            } else if (dest?.isTextOnly) {
                setActiveTab('itinerary');
            }
        }
    });
}

import {
    getActiveTrip, updateActiveTrip, splitDestinations, addTextStopToDay,
    getActiveDayId, setActiveDayId, toggleDayCollapsed, reorderItineraryDay,
    assignDestinationToDay, updateDestinationFields, rebuildRouteByDayOrder,
    getState, setUi,
} from '../state/plannerStore';
import { formatPrice, parsePriceInput, sumPrices } from '../utils/formatPrice';
import { showAlert } from './alerts';
import { renderSidebar } from './sidebar';
import { focusOnLocation, fitDestinationsBounds } from '../map/mapManager';
import { openDirections } from '../services/mapsLinks';
import { setActiveTab } from './tabs';
import { parseDestPointKey, getDestRouteOrderNumber } from '../services/routing';
import { getActiveRouteSegments } from '../services/routePlans';
import { getDestSegmentNumbers } from './routePlan';
import { formatDayDateBadge, formatDayDateRangeLong } from '../utils/dayDates';
import {
    destinationPlaceBadgeHtml, destinationPlaceMeta, destinationPriceBadgeHtml,
    hasMapCoords, isTextOnlyDestination, destinationBelongsToDay, sameDayId,
    canTogglePriceOnStop, toggleDestinationPriceBadge,
} from '../utils/destinationHelpers';

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
}

function ensureDays(trip) {
    if (!trip.days) trip.days = [];
    return trip;
}

function getDayStopsInRouteOrder(trip, dayId) {
    const { route } = splitDestinations(trip.destinations);
    return route.filter((d) => destinationBelongsToDay(d, dayId));
}

/** Paradas que algún tramo define como llegada (toKey) y pertenecen al día. */
function getStopsArrivingOnDay(trip, dayId) {
    const segments = getActiveRouteSegments(trip);
    if (!segments.length) {
        return getDayStopsInRouteOrder(trip, dayId);
    }

    const ordered = [];
    const seen = new Set();

    segments.forEach((seg) => {
        const destId = parseDestPointKey(seg.toKey);
        if (!destId || seen.has(destId)) return;
        const dest = trip.destinations.find((d) => d.id === destId);
        if (!dest) return;
        const onDay = (seg.dayId && sameDayId(seg.dayId, dayId))
            || destinationBelongsToDay(dest, dayId);
        if (onDay) {
            seen.add(destId);
            ordered.push(dest);
        }
    });

    if (ordered.length) return ordered;
    return getDayStopsInRouteOrder(trip, dayId);
}

/** Paradas del resumen del día: llegadas por tramo + notas de solo texto. */
function getDayStopsForSummary(trip, dayId) {
    const fromSegments = getStopsArrivingOnDay(trip, dayId);
    const ids = new Set(fromSegments.map((d) => d.id));
    const textNotes = trip.destinations.filter((d) => destinationBelongsToDay(d, dayId) && isTextOnlyDestination(d));
    return [...fromSegments, ...textNotes.filter((d) => !ids.has(d.id))];
}

let editingPriceDestId = null;
/** Día cuyo editor de fechas del badge está abierto. */
let datesPanelOpenDayId = null;

function renderPlanPriceBlock(d) {
    const hasPrice = d.price != null && d.price !== '';
    const priceLabel = hasPrice ? formatPrice(d.price) : '';
    const isEditing = editingPriceDestId === d.id;

    if (isEditing) {
        const raw = d.price != null && d.price !== '' ? String(d.price) : '';
        return `
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center" data-price-editor="${d.id}">
            <label class="flex flex-1 items-center gap-0 rounded-xl overflow-hidden border border-violet-500/40 bg-slate-950 min-h-[44px] focus-within:border-violet-400">
                <span class="px-3 py-2 bg-slate-900 text-violet-300 font-bold text-sm border-r border-violet-500/20 shrink-0">€</span>
                <input type="number" inputmode="decimal" step="0.01" min="0" placeholder="0"
                    data-stop-price-input="${d.id}" value="${escapeHtml(raw)}"
                    class="flex-1 min-w-0 px-2 py-2 text-sm text-white bg-transparent outline-none" />
            </label>
            <div class="flex gap-2 shrink-0">
                <button type="button" data-save-price="${d.id}"
                    class="flex-1 sm:flex-none min-h-[44px] px-4 rounded-lg text-[11px] font-bold bg-violet-600 text-white border border-violet-500">Guardar</button>
                <button type="button" data-cancel-price="${d.id}"
                    class="flex-1 sm:flex-none min-h-[44px] px-3 rounded-lg text-[11px] font-bold text-slate-400 bg-slate-900 border border-slate-700">Cancelar</button>
            </div>
        </div>`;
    }

    return `
    <div class="flex items-center justify-between gap-2 min-h-[40px] px-2.5 py-1.5 rounded-lg bg-violet-950/30 border border-violet-500/20">
        <span class="text-[11px] font-bold truncate ${hasPrice ? 'text-violet-300' : 'text-slate-500 italic'}">${hasPrice ? escapeHtml(priceLabel) : 'Sin precio'}</span>
        <button type="button" data-edit-price="${d.id}"
            class="shrink-0 text-[10px] font-bold text-violet-400 hover:text-violet-300 px-2.5 py-1.5 rounded-md border border-violet-500/25 hover:bg-violet-500/10 min-h-[36px]">
            ${hasPrice ? 'Editar' : 'Añadir precio'}
        </button>
    </div>`;
}

function renderPlanStopCard(d, trip, routeIndex) {
    const reserved = !!d.isReserved;
    const favorite = !!d.isFavorite;
    const cardBorder = reserved
        ? 'border-emerald-500/40 bg-emerald-950/25'
        : 'border-slate-800 bg-slate-950/80';
    const prev = routeIndex > 0
        ? getDayStopsInRouteOrder(trip, d.dayId)[routeIndex - 1]
        : null;
    const fromLat = routeIndex === 0 ? trip.startingPoint.lat : prev?.lat;
    const fromLng = routeIndex === 0 ? trip.startingPoint.lng : prev?.lng;
    const textOnly = isTextOnlyDestination(d);
    const placeMeta = destinationPlaceMeta(d);
    const placeBadge = destinationPlaceBadgeHtml(d, { compact: true });
    const priceBadge = canTogglePriceOnStop(d) ? destinationPriceBadgeHtml(d, { compact: true }) : '';
    const priceToggleAttrs = canTogglePriceOnStop(d)
        ? ` data-toggle-price-on-stop="${d.id}" role="button" tabindex="0" title="Ver precio"`
        : '';
    const mapsAttrs = !textOnly && d.inRoute && fromLat != null
        ? `data-day-maps data-from-lat="${fromLat}" data-from-lng="${fromLng}" data-to-lat="${d.lat}" data-to-lng="${d.lng}"`
        : '';
    const segNums = getDestSegmentNumbers(trip, d.id);
    const stopOrderNum = getDestRouteOrderNumber(trip, d.id) ?? (routeIndex >= 0 ? routeIndex + 1 : null);
    const segBadge = segNums.length
        ? `<span class="text-[8px] font-bold text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/25 px-1.5 py-0.5 rounded">Tramo ${segNums.join(', ')}</span>`
        : '';
    const favoriteBtn = `<button type="button" data-toggle-favorite="${d.id}" class="text-[8px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded border transition ${
        favorite
            ? 'text-amber-300 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
            : 'text-slate-500 bg-slate-900/40 border-slate-700 hover:text-amber-300 hover:border-amber-500/30'
    }" title="${favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}">★</button>`;
    const siteBtn = d.siteUrl
        ? `<button type="button" data-open-site="${d.id}" class="text-[8px] font-black uppercase tracking-wide text-sky-300 bg-sky-500/10 border border-sky-500/25 px-1.5 py-0.5 rounded hover:bg-sky-500/20 transition" title="Abrir web">🌐</button>`
        : '';

    return `
    <div class="plan-stop-card rounded-xl border ${cardBorder} p-2.5 space-y-2" data-plan-stop="${d.id}">
        <div class="flex gap-2 min-w-0">
            <div class="relative shrink-0">
                ${textOnly
        ? `<div class="w-11 h-11 rounded-lg border border-violet-500/40 bg-violet-950/80 flex items-center justify-center text-lg">${placeMeta ? placeMeta.icon : '📝'}</div>`
        : `<img src="${escapeHtml(d.photoUrl)}" alt="" class="w-11 h-11 rounded-lg object-cover border ${reserved ? 'border-emerald-500/60' : 'border-slate-700'}" />
                ${stopOrderNum != null ? `<span class="absolute -bottom-1 -right-1 text-[8px] font-black bg-slate-950 text-amber-400 px-1 rounded border border-amber-500/30">${stopOrderNum}</span>` : ''}`}
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-1${canTogglePriceOnStop(d) ? ' cursor-pointer' : ''}"${priceToggleAttrs}>
                    <p class="text-[11px] font-bold text-white truncate max-w-full">${stopOrderNum != null ? `<span class="text-amber-400 font-black mr-0.5">${stopOrderNum}.</span>` : ''}${escapeHtml(d.name)}</p>
                    ${reserved ? '<span class="text-[8px] font-black uppercase tracking-wide text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded">Reservado</span>' : ''}
                    ${favoriteBtn}
                    ${siteBtn}
                    ${placeBadge}
                    ${priceBadge}
                    ${segBadge}
                </div>
                ${textOnly
        ? '<p class="text-[9px] text-violet-400/90 mt-0.5">Nota del plan (sin mapa)</p>'
        : (d.inRoute ? `<p class="text-[9px] text-amber-400/90 mt-0.5">${escapeHtml(d.duration)}</p>` : (placeMeta ? `<p class="text-[9px] ${placeMeta.badgeText} mt-0.5">${placeMeta.icon} ${placeMeta.label}</p>` : '<p class="text-[9px] text-sky-400/80 mt-0.5">Punto libre</p>'))}
            </div>
            ${hasMapCoords(d) ? `<button type="button" data-focus-dest="${d.id}" class="shrink-0 text-[10px] text-slate-500 hover:text-amber-400 px-1.5 min-h-[36px]" title="Ver en mapa">📍</button>` : ''}
        </div>
        ${renderPlanPriceBlock(d)}
        <div class="flex flex-wrap items-stretch gap-2 pt-1 border-t border-slate-800/80">
            <button type="button" data-toggle-reserved="${d.id}"
                class="flex-1 min-w-[140px] min-h-[44px] rounded-lg text-[11px] font-bold border transition flex items-center justify-center gap-1.5 ${
        reserved
            ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm shadow-emerald-900/40'
            : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-emerald-500/40 hover:text-emerald-300'
    }">
                ${reserved ? '✓ Reservado' : 'Marcar reservado'}
            </button>
            ${mapsAttrs ? `<button type="button" ${mapsAttrs} class="shrink-0 min-h-[44px] px-3 rounded-lg text-[10px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20">Maps</button>` : ''}
            <button type="button" data-unlink-dest="${d.id}" class="shrink-0 min-h-[44px] min-w-[40px] text-slate-500 hover:text-rose-400 text-sm rounded-lg border border-transparent hover:border-rose-500/20" title="Quitar del día">✕</button>
        </div>
    </div>`;
}

function renderDayBudgetFooter(stops) {
    const total = sumPrices(stops);
    if (!total) return '';
    return `<p class="text-[10px] font-bold text-violet-300/90 pt-1 border-t border-violet-500/20 mt-2">Total día: ${escapeHtml(formatPrice(total))}</p>`;
}

function buildDayStopsHtml(trip, dayId) {
    const ordered = getDayStopsForSummary(trip, dayId);
    const linked = trip.destinations.filter((d) => destinationBelongsToDay(d, dayId));
    if (!ordered.length && !linked.length) {
        const hasRouteSegments = getActiveRouteSegments(trip).length > 0;
        return hasRouteSegments
            ? '<p class="text-[10px] text-slate-500 italic py-2">Asigna un día a los tramos de la ruta para ver las paradas aquí.</p>'
            : '<p class="text-[10px] text-slate-500 italic py-2">Sin paradas. Añade una con el selector o crea una parada asignada al día activo.</p>';
    }
    const displayStops = ordered.length ? ordered : linked;
    const orderedInRoute = getDayStopsInRouteOrder(trip, dayId);
    return displayStops.map((d) => {
        const routeIdx = orderedInRoute.findIndex((r) => r.id === d.id);
        return renderPlanStopCard(d, trip, routeIdx >= 0 ? routeIdx : 0);
    }).join('') + renderDayBudgetFooter(linked);
}

function renderDaySummary(trip) {
    const card = document.getElementById('day-summary-card');
    const select = document.getElementById('active-day-select');
    const meta = document.getElementById('day-summary-meta');
    const stopsEl = document.getElementById('day-summary-stops');

    if (!card || !trip?.days?.length) {
        card?.classList.add('hidden');
        return;
    }

    card.classList.remove('hidden');
    const activeDayId = getActiveDayId(trip);
    const day = trip.days.find((d) => d.id === activeDayId) ?? trip.days[0];

    if (select) {
        select.innerHTML = trip.days.map((d) =>
            `<option value="${d.id}" ${d.id === day.id ? 'selected' : ''}>${escapeHtml(d.title)}</option>`
        ).join('');
    }

    if (meta) {
        const rangeLabel = formatDayDateRangeLong(day);
        meta.innerHTML = `
            ${rangeLabel ? `<p class="text-violet-300 font-semibold">📅 ${escapeHtml(rangeLabel)}</p>` : ''}
            ${day.notes ? `<p class="italic">${escapeHtml(day.notes)}</p>` : '<p class="text-slate-500">Sin notas para este día.</p>'}`;
    }

    const ordered = getDayStopsForSummary(trip, day.id);
    const extra = trip.destinations.filter((d) => destinationBelongsToDay(d, day.id) && !d.inRoute && !isTextOnlyDestination(d));

    if (stopsEl) {
        if (!ordered.length && !extra.length) {
            const hasSegments = getActiveRouteSegments(trip).length > 0;
            stopsEl.innerHTML = hasSegments
                ? '<p class="text-[10px] text-slate-500 italic">Ningún tramo llega a una parada de este día.</p>'
                : '<p class="text-[10px] text-slate-500 italic">Sin paradas en la ruta para este día.</p>';
        } else {
            let prev = { lat: trip.startingPoint.lat, lng: trip.startingPoint.lng, name: trip.startingPoint.name };
            const parts = [];

            ordered.forEach((d, i) => {
                const segNums = getDestSegmentNumbers(trip, d.id);
                const priceLabel = d.price != null && d.price !== '' ? formatPrice(d.price) : '';
                parts.push(`
                <div class="flex items-center gap-2 rounded-lg px-2 py-2 ${d.isReserved ? 'bg-emerald-950/40 border border-emerald-500/30' : 'bg-slate-950/80 border border-violet-500/20'}">
                    <span class="text-[10px] font-black ${d.isReserved ? 'text-emerald-400' : 'text-violet-400'} w-5">${i + 1}</span>
                    <img src="${escapeHtml(d.photoUrl)}" alt="" class="w-9 h-9 rounded object-cover shrink-0 ${d.isReserved ? 'ring-2 ring-emerald-500/50' : ''}" />
                    <div class="flex-1 min-w-0">
                        <p class="text-[11px] font-bold text-white truncate">${escapeHtml(d.name)}${d.isReserved ? ' <span class="text-emerald-400 text-[9px]">✓</span>' : ''}${segNums.length ? ` <span class="text-emerald-400/90 text-[9px]">· Tramo ${segNums.join(', ')}</span>` : ''}</p>
                        <p class="text-[9px] text-amber-400">${escapeHtml(d.duration)}</p>
                        ${priceLabel ? `<p class="text-[9px] font-bold text-violet-300">${escapeHtml(priceLabel)}</p>` : ''}
                    </div>
                    <button type="button" data-day-maps data-from-lat="${prev.lat}" data-from-lng="${prev.lng}" data-to-lat="${d.lat}" data-to-lng="${d.lng}"
                        class="text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-1.5 rounded-lg border border-sky-500/20 min-h-[36px] shrink-0">Maps</button>
                </div>`);
                prev = { lat: d.lat, lng: d.lng, name: d.name };
            });

            const dayTotal = sumPrices(ordered);
            if (dayTotal) {
                parts.push(`<p class="text-[10px] font-bold text-violet-300 text-right pt-1">Total: ${escapeHtml(formatPrice(dayTotal))}</p>`);
            }

            extra.forEach((d) => {
                parts.push(`
                <div class="flex items-center gap-2 bg-slate-950/50 border border-slate-800 rounded-lg px-2 py-1.5 opacity-80">
                    <span class="text-[9px] text-sky-400">POI</span>
                    <span class="text-[11px] text-slate-300 truncate flex-1">${escapeHtml(d.name)}</span>
                </div>`);
            });

            stopsEl.innerHTML = parts.join('');
        }
    }

    card.dataset.activeDayId = day.id;
}

export function renderItinerary() {
    const trip = getActiveTrip();
    const list = document.getElementById('itinerary-days-list');
    const empty = document.getElementById('itinerary-empty');
    if (!trip || !list) return;

    ensureDays(trip);
    const days = trip.days;
    const { collapsedDayIds } = getState().ui;

    empty?.classList.toggle('hidden', days.length > 0);
    list.classList.toggle('hidden', days.length === 0);

    renderDaySummary(trip);

    if (!days.length) {
        list.innerHTML = '';
        return;
    }

    const unassigned = trip.destinations.filter((d) => !d.dayId);

    list.innerHTML = days.map((day, dayIndex) => {
        const collapsed = (collapsedDayIds ?? []).includes(day.id);
        const linked = trip.destinations.filter((d) => destinationBelongsToDay(d, day.id));
        const linkedHtml = buildDayStopsHtml(trip, day.id);

        const options = trip.destinations.map((d) => {
            const taken = d.dayId && !sameDayId(d.dayId, day.id);
            if (taken) return '';
            const selected = sameDayId(d.dayId, day.id);
            return `<option value="${d.id}" ${selected ? 'selected' : ''}>${escapeHtml(d.name)}</option>`;
        }).join('');

        const upDisabled = dayIndex === 0;
        const downDisabled = dayIndex === days.length - 1;
        const datesPanelOpen = datesPanelOpenDayId === day.id;

        return `
        <article class="bg-slate-900/60 border border-violet-500/20 rounded-xl overflow-hidden" data-day-id="${day.id}">
            <header class="p-3 space-y-2 border-b border-slate-800/60" data-day-header="${day.id}">
                <div class="flex items-start gap-2">
                    <div class="flex flex-col gap-0.5 shrink-0 self-center" data-day-reorder>
                        <button type="button" data-move-day="${day.id}" data-direction="up" ${upDisabled ? 'disabled' : ''}
                            class="p-1 rounded-md min-h-[28px] min-w-[28px] flex items-center justify-center ${upDisabled ? 'text-slate-700 opacity-40' : 'text-violet-400 hover:bg-violet-500/10'}">▲</button>
                        <button type="button" data-move-day="${day.id}" data-direction="down" ${downDisabled ? 'disabled' : ''}
                            class="p-1 rounded-md min-h-[28px] min-w-[28px] flex items-center justify-center ${downDisabled ? 'text-slate-700 opacity-40' : 'text-violet-400 hover:bg-violet-500/10'}">▼</button>
                    </div>
                    <button type="button" data-toggle-day-dates="${day.id}" data-day-badge="${day.id}"
                        class="bg-violet-500/20 text-violet-200 hover:bg-violet-500/30 text-[10px] font-black px-2 py-1.5 rounded-md shrink-0 min-h-[44px] max-w-[48%] text-left leading-tight border border-violet-500/30"
                        title="Toca para elegir fecha o rango">
                        ${escapeHtml(formatDayDateBadge(day, dayIndex + 1))}
                    </button>
                    <div class="flex-1 min-w-0 cursor-pointer" data-toggle-day="${day.id}">
                        <p class="text-xs font-bold text-white truncate">${escapeHtml(day.title)}</p>
                        ${linked.length ? `<p data-day-stop-count="${day.id}" class="text-[9px] text-slate-500">${linked.length} parada${linked.length > 1 ? 's' : ''}${sumPrices(linked) ? ` · ${escapeHtml(formatPrice(sumPrices(linked)))}` : ''}</p>` : `<p data-day-stop-count="${day.id}" class="text-[9px] text-slate-500 hidden"></p>`}
                    </div>
                    <span class="text-slate-500 text-xs shrink-0 cursor-pointer min-h-[44px] flex items-center" data-toggle-day="${day.id}">${collapsed ? '▶' : '▼'}</span>
                    <button type="button" data-delete-day="${day.id}" class="p-1.5 text-slate-500 hover:text-rose-400 shrink-0 min-h-[36px] min-w-[36px]" title="Eliminar día">🗑</button>
                </div>
                <div data-day-dates-panel="${day.id}" class="${datesPanelOpen ? '' : 'hidden'} space-y-2 p-2.5 rounded-lg border border-violet-500/40 bg-violet-950/30" data-stop-toggle-day>
                    <p class="text-[9px] font-bold text-violet-300 uppercase">Fecha en el badge (día o rango)</p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label class="block">
                            <span class="text-[9px] text-slate-500">Inicio</span>
                            <input type="date" data-day-date-start="${day.id}" value="${escapeHtml(day.date || '')}"
                                class="w-full mt-0.5 bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-lg px-2 py-2 text-[11px] text-slate-300 outline-none min-h-[44px]" />
                        </label>
                        <label class="block">
                            <span class="text-[9px] text-slate-500">Fin (opcional)</span>
                            <input type="date" data-day-date-end="${day.id}" value="${escapeHtml(day.dateEnd || day.date_end || '')}"
                                class="w-full mt-0.5 bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-lg px-2 py-2 text-[11px] text-slate-300 outline-none min-h-[44px]" />
                        </label>
                    </div>
                </div>
            </header>
            <div class="px-3 pb-3 space-y-3 ${collapsed ? 'hidden' : ''}" data-day-body="${day.id}">
                <div class="space-y-2 pt-2">
                    <input type="text" data-day-title="${day.id}" value="${escapeHtml(day.title)}" placeholder="Ej. Llegada a Florencia"
                        class="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-lg px-2.5 py-2 text-xs text-white outline-none font-bold min-h-[44px]" />
                </div>
                <textarea data-day-notes="${day.id}" rows="2" placeholder="Notas del día (alojamiento, comidas...)"
                    class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-[11px] text-slate-300 outline-none resize-none">${escapeHtml(day.notes || '')}</textarea>
                <div class="space-y-1.5">
                    <p class="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Paradas del día</p>
                    <div class="space-y-1" data-day-stops-list="${day.id}">${linkedHtml}</div>
                </div>
                <div data-day-text-stop-wrap="${day.id}" class="p-2.5 rounded-xl border border-violet-500/25 bg-violet-950/20 space-y-2">
                    <p class="text-[9px] font-bold text-violet-300 uppercase">Parada sin mapa</p>
                    <div class="flex gap-2">
                        <input type="text" data-day-text-stop="${day.id}" placeholder="Ej. Bar, comida, tren…"
                            class="flex-1 bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-lg px-2.5 py-2 text-xs text-white outline-none min-h-[44px]" />
                        <button type="button" data-add-day-text-stop="${day.id}"
                            class="shrink-0 min-h-[44px] px-3 rounded-lg text-[10px] font-bold text-violet-200 bg-violet-600 hover:bg-violet-500 border border-violet-500/40">
                            Añadir
                        </button>
                    </div>
                    <p class="text-[9px] text-slate-500 leading-snug">No aparece como chincheta; solo en este día del plan.</p>
                </div>
                <select data-link-day="${day.id}" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-[11px] text-white outline-none min-h-[44px]">
                    <option value="">+ Vincular parada del mapa a este día...</option>
                    ${options}
                </select>
            </div>
        </article>`;
    }).join('');

    if (unassigned.length) {
        list.innerHTML += `
        <div class="pt-2 border-t border-slate-800">
            <p class="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">Sin día asignado (${unassigned.length})</p>
            <div class="flex flex-wrap gap-1.5">
                ${unassigned.map((d) => `<span class="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-1 rounded-md">${escapeHtml(d.name)}</span>`).join('')}
            </div>
        </div>`;
    }
}

export function bindItinerary(onMapRedraw) {
    if (document.getElementById('itinerary-days-list')?.dataset.itineraryBound === '1') {
        return;
    }
    document.getElementById('itinerary-days-list')?.setAttribute('data-itinerary-bound', '1');

    document.getElementById('btn-add-day')?.addEventListener('click', () => {
        const trip = getActiveTrip();
        if (!trip) return;
        ensureDays(trip);
        const n = trip.days.length + 1;
        const newDay = {
            id: `day-${Date.now()}`,
            title: `Día ${n}`,
            date: '',
            dateEnd: '',
            notes: '',
        };
        updateActiveTrip({ days: [...trip.days, newDay] });
        setActiveDayId(newDay.id);
        renderItinerary();
        showAlert(`📅 Día ${n} añadido al plan.`, 'success');
    });

    document.getElementById('active-day-select')?.addEventListener('change', (e) => {
        setActiveDayId(e.target.value);
        renderItinerary();
    });

    document.getElementById('btn-day-fit-map')?.addEventListener('click', () => {
        const trip = getActiveTrip();
        if (!trip) return;
        const dayId = getActiveDayId(trip);
        const linked = trip.destinations.filter((d) => destinationBelongsToDay(d, dayId) && hasMapCoords(d));
        const toFit = linked.length ? linked : getDayStopsInRouteOrder(trip, dayId).filter(hasMapCoords);
        if (!toFit.length) {
            showAlert('No hay paradas para centrar en el mapa.', 'info');
            return;
        }
        if (window.innerWidth < 1024) setActiveTab('map');
        fitDestinationsBounds(toFit);
    });

    document.getElementById('day-summary-stops')?.addEventListener('click', (e) => {
        const mapsBtn = e.target.closest('[data-day-maps]');
        if (mapsBtn) {
            openDirections(
                { lat: parseFloat(mapsBtn.dataset.fromLat), lng: parseFloat(mapsBtn.dataset.fromLng) },
                { lat: parseFloat(mapsBtn.dataset.toLat), lng: parseFloat(mapsBtn.dataset.toLng) }
            );
        }
    });

    document.getElementById('itinerary-days-list')?.addEventListener('click', (e) => {
        const priceStop = e.target.closest('[data-toggle-price-on-stop]');
        if (priceStop && !e.target.closest('button')) {
            e.preventDefault();
            e.stopPropagation();
            toggleDestinationPriceBadge(priceStop.dataset.togglePriceOnStop);
            return;
        }

        const favBtn = e.target.closest('[data-toggle-favorite]');
        if (favBtn) {
            e.preventDefault();
            e.stopPropagation();
            const destId = favBtn.dataset.toggleFavorite;
            const dest = getActiveTrip()?.destinations.find((d) => d.id === destId);
            if (!dest) return;
            const next = !dest.isFavorite;
            updateDestinationFields(destId, { isFavorite: next });
            renderItinerary();
            renderSidebar();
            onMapRedraw?.();
            showAlert(next ? `★ «${dest.name}» añadido a favoritos.` : `«${dest.name}» quitado de favoritos.`, next ? 'success' : 'info');
            return;
        }

        const siteBtn = e.target.closest('[data-open-site]');
        if (siteBtn) {
            e.preventDefault();
            e.stopPropagation();
            const destId = siteBtn.dataset.openSite;
            const dest = getActiveTrip()?.destinations.find((d) => d.id === destId);
            const raw = dest?.siteUrl?.trim();
            if (!raw) return;
            const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
            window.open(url, '_blank', 'noopener,noreferrer');
            return;
        }

        const addTextStopBtn = e.target.closest('[data-add-day-text-stop]');
        if (addTextStopBtn) {
            e.preventDefault();
            e.stopPropagation();
            const dayId = addTextStopBtn.getAttribute('data-add-day-text-stop');
            if (dayId) addTextStopFromDayInput(dayId, onMapRedraw);
            return;
        }

        if (e.target.closest('[data-day-text-stop]')) {
            e.stopPropagation();
            return;
        }

        const moveBtn = e.target.closest('[data-move-day]');
        if (moveBtn && !moveBtn.disabled) {
            e.stopPropagation();
            if (reorderItineraryDay(moveBtn.dataset.moveDay, moveBtn.dataset.direction)) {
                renderItinerary();
                renderSidebar();
                onMapRedraw?.();
                showAlert('Día reordenado. La ruta sigue el orden del plan.', 'info');
            }
            return;
        }

        const toggleDates = e.target.closest('[data-toggle-day-dates]');
        if (toggleDates) {
            e.stopPropagation();
            const dayId = toggleDates.dataset.toggleDayDates;
            datesPanelOpenDayId = datesPanelOpenDayId === dayId ? null : dayId;
            if (datesPanelOpenDayId) {
                const collapsed = (getState().ui.collapsedDayIds ?? []).filter((id) => id !== dayId);
                setUi({ collapsedDayIds: collapsed });
            }
            renderItinerary();
            if (datesPanelOpenDayId) {
                requestAnimationFrame(() => {
                    document.querySelector(`[data-day-date-start="${dayId}"]`)?.focus();
                });
            }
            return;
        }

        if (e.target.closest('[data-day-dates-panel]') || e.target.closest('[data-stop-toggle-day]')) {
            e.stopPropagation();
            return;
        }

        const toggleHeader = e.target.closest('[data-toggle-day]');
        if (toggleHeader && !e.target.closest('[data-day-reorder]') && !e.target.closest('[data-delete-day]')
            && !e.target.closest('[data-day-text-stop-wrap]')) {
            toggleDayCollapsed(toggleHeader.dataset.toggleDay);
            renderItinerary();
            return;
        }

        const deleteBtn = e.target.closest('[data-delete-day]');
        if (deleteBtn) {
            e.stopPropagation();
            const dayId = deleteBtn.dataset.deleteDay;
            const trip = getActiveTrip();
            const days = trip.days.filter((d) => d.id !== dayId);
            let destinations = trip.destinations.map((d) =>
                d.dayId === dayId ? { ...d, dayId: null } : d
            );
            destinations = rebuildRouteByDayOrder({ ...trip, days, destinations });
            updateActiveTrip({ days, destinations });
            renderItinerary();
            renderSidebar();
            showAlert('Día eliminado del itinerario.', 'info');
            return;
        }

        const editPriceBtn = e.target.closest('[data-edit-price]');
        if (editPriceBtn) {
            editingPriceDestId = editPriceBtn.dataset.editPrice;
            renderItinerary();
            document.querySelector(`[data-stop-price-input="${editPriceBtn.dataset.editPrice}"]`)?.focus();
            return;
        }

        const savePriceBtn = e.target.closest('[data-save-price]');
        if (savePriceBtn) {
            const destId = savePriceBtn.dataset.savePrice;
            const input = document.querySelector(`[data-stop-price-input="${destId}"]`);
            const price = parsePriceInput(input?.value);
            updateDestinationFields(destId, { price });
            editingPriceDestId = null;
            renderItinerary();
            showAlert('Precio actualizado.', 'success');
            return;
        }

        const cancelPriceBtn = e.target.closest('[data-cancel-price]');
        if (cancelPriceBtn) {
            editingPriceDestId = null;
            renderItinerary();
            return;
        }

        const reservedBtn = e.target.closest('[data-toggle-reserved]');
        if (reservedBtn) {
            const destId = reservedBtn.dataset.toggleReserved;
            const dest = getActiveTrip()?.destinations.find((d) => d.id === destId);
            if (!dest) return;
            const next = !dest.isReserved;
            updateDestinationFields(destId, { isReserved: next });
            renderItinerary();
            renderSidebar();
            onMapRedraw?.();
            showAlert(
                next ? `✓ «${dest.name}» marcado como reservado.` : `«${dest.name}» ya no está marcado como reservado.`,
                next ? 'success' : 'info'
            );
            return;
        }

        const unlinkBtn = e.target.closest('[data-unlink-dest]');
        if (unlinkBtn) {
            handleAssignDestToDay(unlinkBtn.dataset.unlinkDest, null);
            return;
        }

        const focusBtn = e.target.closest('[data-focus-dest]');
        if (focusBtn) {
            const dest = getActiveTrip()?.destinations.find((d) => d.id === focusBtn.dataset.focusDest);
            if (dest && hasMapCoords(dest)) {
                if (window.innerWidth < 1024) setActiveTab('map');
                focusOnLocation(dest.lat, dest.lng);
            }
            return;
        }

    });

    document.getElementById('itinerary-days-list')?.addEventListener('change', (e) => {
        const linkSelect = e.target.closest('[data-link-day]');
        if (linkSelect && linkSelect.value) {
            handleAssignDestToDay(linkSelect.value, linkSelect.dataset.linkDay);
            linkSelect.value = '';
            return;
        }

        const titleInput = e.target.closest('[data-day-title]');
        if (titleInput) {
            updateDayField(titleInput.dataset.dayTitle, { title: titleInput.value });
            return;
        }

        const dateStart = e.target.closest('[data-day-date-start]');
        if (dateStart) {
            e.stopPropagation();
            const dayId = dateStart.dataset.dayDateStart;
            const trip = getActiveTrip();
            const day = trip?.days.find((d) => d.id === dayId);
            const end = day?.dateEnd || day?.date_end || '';
            const fields = { date: dateStart.value };
            if (end && dateStart.value && end < dateStart.value) {
                fields.dateEnd = dateStart.value;
            }
            updateDayField(dayId, fields, dayIndexFromId(trip, dayId));
            return;
        }

        const dateEnd = e.target.closest('[data-day-date-end]');
        if (dateEnd) {
            e.stopPropagation();
            const dayId = dateEnd.dataset.dayDateEnd;
            const trip = getActiveTrip();
            updateDayField(dayId, { dateEnd: dateEnd.value }, dayIndexFromId(trip, dayId));
        }
    });

    document.getElementById('itinerary-days-list')?.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const textInput = e.target.closest('[data-day-text-stop]');
        if (textInput) {
            e.preventDefault();
            addTextStopFromDayInput(textInput.getAttribute('data-day-text-stop'), onMapRedraw);
            return;
        }
        const input = e.target.closest('[data-stop-price-input]');
        if (input) {
            e.preventDefault();
            document.querySelector(`[data-save-price="${input.dataset.stopPriceInput}"]`)?.click();
        }
    });

    function addTextStopFromDayInput(dayId, onMapRedraw) {
        const trip = getActiveTrip();
        if (!trip?.days?.some((d) => sameDayId(d.id, dayId))) {
            showAlert('No se encontró el día. Recarga la página e inténtalo de nuevo.', 'error');
            return;
        }

        const input = document.querySelector(`[data-day-text-stop="${dayId}"]`);
        const name = input?.value?.trim();
        if (!name) {
            showAlert('Escribe un nombre (ej. Bar, almuerzo…).', 'error');
            input?.focus();
            return;
        }

        const collapsed = (getState().ui.collapsedDayIds ?? []).filter((id) => !sameDayId(id, dayId));
        if (collapsed.length !== (getState().ui.collapsedDayIds ?? []).length) {
            setUi({ collapsedDayIds: collapsed });
        }

        const dest = addTextStopToDay(dayId, name);
        if (!dest) {
            showAlert('No se pudo guardar la parada. Prueba de nuevo o recarga la página.', 'error');
            return;
        }

        requestAnimationFrame(() => {
            const freshInput = document.querySelector(`[data-day-text-stop="${dayId}"]`);
            if (freshInput) freshInput.value = '';
            document.querySelector(`[data-plan-stop="${dest.id}"]`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });

        showAlert(`📝 «${dest.name}» añadida al día (sin mapa).`, 'success');
    }

    document.getElementById('itinerary-days-list')?.addEventListener('input', (e) => {
        const notesInput = e.target.closest('[data-day-notes]');
        if (notesInput) {
            updateDayField(notesInput.dataset.dayNotes, { notes: notesInput.value });
        }
    });

    function handleAssignDestToDay(destId, dayId) {
        const trip = getActiveTrip();
        assignDestinationToDay(destId, dayId);
        renderItinerary();
        renderSidebar();
        onMapRedraw?.();
        if (dayId) {
            const day = trip.days.find((d) => d.id === dayId);
            const dest = getActiveTrip()?.destinations.find((d) => d.id === destId);
            showAlert(`📌 «${dest?.name}» añadido a la ruta en ${day?.title || 'el día'}.`, 'success');
        }
    }

    function dayIndexFromId(trip, dayId) {
        const idx = trip?.days?.findIndex((d) => d.id === dayId) ?? -1;
        return idx >= 0 ? idx + 1 : 1;
    }

    function updateDayField(dayId, fields, dayIndex = 1) {
        const trip = getActiveTrip();
        const days = trip.days.map((d) => (d.id === dayId ? { ...d, ...fields } : d));
        updateActiveTrip({ days });
        const updated = days.find((d) => d.id === dayId);
        const badge = document.querySelector(`[data-day-badge="${dayId}"]`);
        if (badge && updated) {
            badge.textContent = formatDayDateBadge(updated, dayIndex);
        }
        renderDaySummary(getActiveTrip());
        populateDaySelect(document.getElementById('active-day-select'), getActiveDayId(getActiveTrip()));
    }
}

export function populateDaySelect(selectEl, selectedDayId) {
    if (!selectEl) return;
    const trip = getActiveTrip();
    const days = trip?.days ?? [];
    selectEl.innerHTML = '<option value="">Sin asignar</option>'
        + days.map((d, i) => {
            const badge = formatDayDateBadge(d, i + 1);
            return `<option value="${d.id}" ${d.id === selectedDayId ? 'selected' : ''}>${escapeHtml(badge)} — ${escapeHtml(d.title)}</option>`;
        }).join('');
}

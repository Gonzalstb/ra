import {
    getActiveTrip, getActiveDayId, updateActiveTrip, splitDestinations,
} from '../state/plannerStore';
import { formatDayDateBadge } from '../utils/dayDates';
import {
    getActiveRouteSegments,
    getActiveRoutePlanName,
    withActiveRouteSegments,
    withActiveRoutePlanId,
    addRoutePlan,
    removeRoutePlan,
    renameRoutePlan,
    ensureRoutePlans,
} from '../services/routePlans';
import {
    getRoutePointOptions,
    getMapDestinations,
    ROUTE_POINT_START,
    ROUTE_POINT_END,
    destPointKey,
    clearRouteLegCache,
    resolveRoutePoint,
    estimateRouteSummary,
} from '../services/routing';
import { showAlert } from './alerts';
import { scheduleSync } from '../services/syncScheduler';
import { syncRouteAndItinerary } from '../services/routeItinerarySync';
import { setActiveTab } from './tabs';
import { openEditStartModal } from './modals';
import { focusOnLocation, getMap } from '../map/mapManager';

let pendingMapFromKey = null;
let pendingDeleteRoutePlan = null;

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
}

function formatLogDate(isoDate) {
    if (!isoDate) return 'ahora';
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return 'ahora';
    return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function historyMessage(log) {
    const userName = log?.user?.name ?? 'Usuario';
    const payload = log?.payload ?? {};
    if (log.action === 'point_added') {
        return `📍 ${userName} añadió el punto «${payload.pointName ?? 'Punto'}».`;
    }
    if (log.action === 'point_deleted') {
        return `🗑️ ${userName} borró el punto «${payload.pointName ?? 'Punto'}».`;
    }
    if (log.action === 'segment_added') {
        return `🛣️ ${userName} creó tramo: ${payload.fromLabel ?? 'Origen'} → ${payload.toLabel ?? 'Destino'}.`;
    }
    if (log.action === 'segment_deleted') {
        return `❌ ${userName} eliminó tramo: ${payload.fromLabel ?? 'Origen'} → ${payload.toLabel ?? 'Destino'}.`;
    }
    return `ℹ️ ${userName} actualizó el viaje.`;
}

function renderTripActivity(trip) {
    const list = document.getElementById('trip-activity-list');
    if (!list) return;
    const logs = trip.activityLogs ?? [];
    if (!logs.length) {
        list.innerHTML = '<p class="text-[10px] text-slate-500 italic py-2 px-2 bg-slate-950/40 rounded border border-slate-800/70">Aún no hay acciones registradas.</p>';
        return;
    }

    list.innerHTML = logs.slice(0, 30).map((log) => `
        <article class="rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-2">
            <p class="text-[10px] text-slate-200 leading-snug">${escapeHtml(historyMessage(log))}</p>
            <p class="text-[9px] text-slate-500 mt-1">${escapeHtml(formatLogDate(log.createdAt))}</p>
        </article>
    `).join('');
}

function labelForKey(trip, key) {
    const opt = getRoutePointOptions(trip).find((o) => o.key === key);
    return opt?.label?.replace(/^[^\s]+\s/, '') ?? key;
}

function buildSelectOptions(trip, selectedKey) {
    const placeholder = `<option value="" ${!selectedKey ? 'selected' : ''}>— Elige punto —</option>`;
    const opts = getRoutePointOptions(trip).map((opt) =>
        `<option value="${escapeHtml(opt.key)}" ${opt.key === selectedKey ? 'selected' : ''}>${escapeHtml(opt.label)}</option>`
    ).join('');
    return placeholder + opts;
}

function defaultSegmentDayFields(trip) {
    const dayId = getActiveDayId(trip) || null;
    const day = trip?.days?.find((d) => d.id === dayId);
    return {
        dayId,
        travelDate: day?.date || null,
    };
}

function segmentTravelDate(seg, trip) {
    if (seg.travelDate) return seg.travelDate;
    if (seg.dayId) {
        const day = trip?.days?.find((d) => d.id === seg.dayId);
        return day?.date || '';
    }
    return '';
}

function buildSegmentDayOptions(trip, selectedDayId) {
    const days = trip?.days ?? [];
    return '<option value="">Sin día</option>'
        + days.map((d, i) => {
            const badge = formatDayDateBadge(d, i + 1);
            return `<option value="${escapeHtml(d.id)}" ${d.id === selectedDayId ? 'selected' : ''}>${escapeHtml(badge)} — ${escapeHtml(d.title)}</option>`;
        }).join('');
}

function buildSegmentDayControls(seg, trip) {
    const dateVal = segmentTravelDate(seg, trip);
    const hasDays = (trip?.days?.length ?? 0) > 0;
    const daySelect = hasDays ? `
        <label class="flex-1 min-w-[120px]">
            <span class="text-[9px] font-bold text-slate-500 uppercase">Día del plan</span>
            <select data-seg-day="${seg.id}" class="w-full mt-0.5 bg-slate-900 border border-violet-500/30 rounded-lg px-2 py-2 text-[11px] text-white outline-none min-h-[40px]">
                ${buildSegmentDayOptions(trip, seg.dayId || null)}
            </select>
        </label>` : '';
    return `
        <label class="shrink-0 min-w-[130px]">
            <span class="text-[9px] font-bold text-slate-500 uppercase">Fecha</span>
            <input type="date" data-seg-travel-date="${seg.id}" value="${escapeHtml(dateVal)}"
                class="w-full mt-0.5 bg-slate-900 border border-violet-500/30 rounded-lg px-2 py-2 text-[11px] text-white outline-none min-h-[40px]" />
        </label>
        ${daySelect}`;
}

export function defaultFromKey(trip) {
    const segs = getActiveRouteSegments(trip);
    if (!segs.length) return ROUTE_POINT_START;
    return segs[segs.length - 1].toKey;
}

function segmentValidation(trip, seg) {
    if (!seg.fromKey || !seg.toKey) {
        return { valid: false, message: 'Elige puntos en Desde y Hasta.' };
    }
    if (seg.fromKey === seg.toKey) {
        return { valid: false, message: 'Este tramo no se dibuja hasta que elijas puntos distintos.' };
    }
    if (!resolveRoutePoint(trip, seg.fromKey) || !resolveRoutePoint(trip, seg.toKey)) {
        return { valid: false, message: 'Falta una parada referenciada en este tramo.' };
    }
    return { valid: true, message: '' };
}

function updateSegments(mutator, onMapRedraw, extraTripPatch = null) {
    const trip = getActiveTrip();
    if (!trip) return;
    let segments = [...getActiveRouteSegments(trip)];
    const next = mutator(segments);
    if (next !== undefined) segments = next;
    updateActiveTrip(syncRouteAndItinerary({
        ...withActiveRouteSegments(trip, segments),
        ...(extraTripPatch ?? {}),
    }));
    clearRouteLegCache();
    renderRoutePlan();
    onMapRedraw?.();
    scheduleSync();
}

function patchSegmentDayMeta(segId, segmentPatch, { syncDayDate = false } = {}, onMapRedraw) {
    const trip = getActiveTrip();
    if (!trip) return;
    const segments = getActiveRouteSegments(trip).map((s) =>
        (s.id === segId ? { ...s, ...segmentPatch } : s)
    );
    const seg = segments.find((s) => s.id === segId);
    let days = trip.days ?? [];
    if (syncDayDate && seg?.dayId && Object.prototype.hasOwnProperty.call(segmentPatch, 'travelDate')) {
        days = days.map((d) =>
            (d.id === seg.dayId ? { ...d, date: segmentPatch.travelDate || null } : d)
        );
    }
    updateActiveTrip(syncRouteAndItinerary({ ...withActiveRouteSegments(trip, segments), days }));
    clearRouteLegCache();
    renderRoutePlan();
    onMapRedraw?.();
    scheduleSync();
}

function addSegmentFromMapPoints(fromKey, toKey, onMapRedraw) {
    if (!fromKey || !toKey || fromKey === toKey) return false;
    const trip = getActiveTrip();
    if (!trip) return false;
    const exists = getActiveRouteSegments(trip).some((s) => s.fromKey === fromKey && s.toKey === toKey);
    if (exists) return false;

    updateSegments((segments) => {
        segments.push({
            id: `seg-${Date.now()}`,
            fromKey,
            toKey,
            sameRoadAs: null,
            ...defaultSegmentDayFields(trip),
        });
    }, onMapRedraw);
    return true;
}

export function isMapRoutePickPending() {
    return pendingMapFromKey != null;
}

export function cancelMapRoutePick(onMapRedraw) {
    if (!pendingMapFromKey) return;
    pendingMapFromKey = null;
    onMapRedraw?.();
    showAlert('Selección de tramo cancelada.', 'info');
}

export function startMapRouteFromPoint(pointKey, onMapRedraw) {
    const trip = getActiveTrip();
    if (!trip || !pointKey) return false;
    const point = resolveRoutePoint(trip, pointKey);
    if (!point) return false;

    pendingMapFromKey = pointKey;
    onMapRedraw?.();
    setActiveTab('map');
    showAlert(`«${point.name ?? labelForKey(trip, pointKey)}» seleccionado. Pulsa otro punto para crear el tramo.`, 'info');
    return true;
}

export function getPendingMapRoutePoint() {
    const trip = getActiveTrip();
    if (!trip || !pendingMapFromKey) return null;
    const point = resolveRoutePoint(trip, pendingMapFromKey);
    return point ? { ...point, key: pendingMapFromKey } : null;
}

export function handleMapRoutePointSelection(pointKey, onMapRedraw) {
    if (!pointKey) return;
    const trip = getActiveTrip();
    if (!trip) return;
    if (!resolveRoutePoint(trip, pointKey)) return;

    if (!pendingMapFromKey) {
        startMapRouteFromPoint(pointKey, onMapRedraw);
        return;
    }

    if (pendingMapFromKey === pointKey) {
        cancelMapRoutePick(onMapRedraw);
        return;
    }

    const fromKey = pendingMapFromKey;
    const fromLabel = labelForKey(trip, fromKey);
    pendingMapFromKey = null;
    const created = addSegmentFromMapPoints(fromKey, pointKey, onMapRedraw);
    if (created) {
        const toLabel = labelForKey(trip, pointKey);
        showAlert(`Tramo creado: ${fromLabel} → ${toLabel}`, 'success');
        setActiveTab('route');
    } else {
        showAlert('No se añadió el tramo (ya existía o era inválido).', 'info');
    }
}

export function requestDeleteRouteSegment(segId, onMapRedraw) {
    if (!segId) return;
    const trip = getActiveTrip();
    const exists = getActiveRouteSegments(trip).some((s) => s.id === segId);
    if (!exists) return;
    updateSegments((segments) => segments.filter((s) => s.id !== segId), onMapRedraw);
    showAlert('Tramo eliminado.', 'info');
}

function renderRoutePanelOrigin(trip) {
    const el = document.getElementById('route-panel-origin-name');
    if (el && trip) {
        el.textContent = trip.startingPoint.name;
    }
}

function renderRoutePlansBar(trip) {
    const bar = document.getElementById('route-plans-bar');
    if (!bar) return;

    const normalized = ensureRoutePlans(trip);
    const activeId = normalized.activeRoutePlanId ?? normalized.routePlans[0]?.id;
    const canDelete = normalized.routePlans.length > 1;

    bar.innerHTML = `
        <div class="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
            ${normalized.routePlans.map((plan) => {
                const isActive = plan.id === activeId;
                const segCount = plan.segments?.length ?? 0;
                return `
                <button type="button" data-select-route-plan="${plan.id}"
                    class="group flex items-center gap-1 max-w-full min-h-[36px] px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:border-emerald-500/30 hover:text-slate-200'}">
                    <span class="truncate" data-route-plan-label="${plan.id}">${escapeHtml(plan.name)}</span>
                    <span class="text-[9px] opacity-70 shrink-0">${segCount} tr.</span>
                    ${canDelete ? `<span type="button" data-delete-route-plan="${plan.id}" class="ml-0.5 text-rose-400/80 hover:text-rose-300 opacity-0 group-hover:opacity-100 transition" title="Eliminar ruta">✕</span>` : ''}
                </button>`;
            }).join('')}
        </div>
        <button type="button" id="btn-add-route-plan"
            class="shrink-0 min-h-[36px] px-2.5 py-1 rounded-lg text-[10px] font-bold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition">
            + Ruta
        </button>`;
}

function renderRouteTimeline(trip) {
    const wrap = document.getElementById('route-timeline-wrap');
    const el = document.getElementById('route-timeline');
    if (!wrap || !el) return;

    const segments = getActiveRouteSegments(trip);
    if (!segments.length) {
        wrap.classList.add('hidden');
        return;
    }

    wrap.classList.remove('hidden');
    const parts = [labelForKey(trip, ROUTE_POINT_START)];
    segments.forEach((seg, i) => {
        parts.push(`<button type="button" data-timeline-seg="${seg.id}" class="text-amber-400 hover:text-amber-300 underline-offset-2 hover:underline min-h-[32px] px-0.5">→ ${escapeHtml(labelForKey(trip, seg.toKey))}</button>`);
    });

    el.innerHTML = parts.join('<span class="text-slate-600 mx-0.5"> </span>');
}

function renderQuickNextSegment(trip) {
    const wrap = document.getElementById('route-quick-next');
    const btn = document.getElementById('btn-quick-next-segment');
    if (!wrap || !btn) return;

    const { route } = splitDestinations(trip.destinations);
    if (!route.length) {
        wrap.classList.add('hidden');
        return;
    }

    const segs = getActiveRouteSegments(trip);
    const fromKey = defaultFromKey(trip);
    const usedTo = new Set(segs.map((s) => s.toKey));
    const nextDest = route.find((d) => !usedTo.has(destPointKey(d.id)));

    if (!nextDest) {
        wrap.classList.add('hidden');
        return;
    }

    wrap.classList.remove('hidden');
    const fromLabel = labelForKey(trip, fromKey);
    btn.textContent = `¿Siguiente tramo desde ${fromLabel} hasta #${route.findIndex((d) => d.id === nextDest.id) + 1} ${nextDest.name}?`;
    btn.dataset.quickFrom = fromKey;
    btn.dataset.quickTo = destPointKey(nextDest.id);
}

function suggestQuickAddToKey(trip, fromKey) {
    const keys = getRoutePointOptions(trip).map((o) => o.key).filter((k) => k !== fromKey);
    const { route } = splitDestinations(trip.destinations);
    for (const d of route) {
        const key = destPointKey(d.id);
        if (key !== fromKey && keys.includes(key)) return key;
    }
    for (const d of getMapDestinations(trip)) {
        const key = destPointKey(d.id);
        if (key !== fromKey && keys.includes(key)) return key;
    }
    if (keys.includes(ROUTE_POINT_END)) return ROUTE_POINT_END;
    return keys[0] || '';
}

function renderQuickAddSegment(trip) {
    const fromSel = document.getElementById('quick-add-seg-from');
    const toSel = document.getElementById('quick-add-seg-to');
    if (!fromSel || !toSel || !trip) return;

    const options = getRoutePointOptions(trip);
    const prevFrom = fromSel.value;
    const prevTo = toSel.value;
    const defaultFrom = defaultFromKey(trip);
    const fromKey = options.some((o) => o.key === prevFrom) ? prevFrom : defaultFrom;
    let toKey = options.some((o) => o.key === prevTo) ? prevTo : suggestQuickAddToKey(trip, fromKey);

    fromSel.innerHTML = buildSelectOptions(trip, fromKey);
    toSel.innerHTML = buildSelectOptions(trip, toKey);
    fromSel.value = fromKey;
    if (toKey) toSel.value = toKey;
}

export function renderMapRouteChip(trip) {
    const chip = document.getElementById('map-route-chip');
    if (!chip) return;

    const summary = estimateRouteSummary(trip);
    const count = summary.segmentCount;

    if (count === 0) {
        chip.className = 'pointer-events-auto flex items-center gap-2 min-h-[44px] px-3.5 py-2 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-200 text-[11px] font-bold shadow-lg backdrop-blur-md';
        chip.innerHTML = '<span>Definir ruta</span>';
        chip.dataset.chipMode = 'empty';
        return;
    }

    const planName = getActiveRoutePlanName(trip);
    const durationPart = summary.durationLabel ? ` · ${summary.durationLabel}` : '';
    chip.className = 'pointer-events-auto flex items-center gap-2 min-h-[44px] px-3.5 py-2 rounded-full bg-emerald-950/95 border border-emerald-500/40 text-emerald-200 text-[11px] font-bold shadow-lg backdrop-blur-md';
    chip.innerHTML = `<span>${escapeHtml(planName)} · ${count} tramo${count !== 1 ? 's' : ''}${escapeHtml(durationPart)}</span>`;
    chip.dataset.chipMode = 'ready';
}

export function updateMapRouteGuide(trip) {
    const hint = document.getElementById('guide-route-hint');
    if (!hint || !trip) return;
    const count = getActiveRouteSegments(trip).length;
    const planName = getActiveRoutePlanName(trip);
    hint.textContent = count === 0
        ? `${planName}: sin tramos — abre la pestaña Ruta para planificar el recorrido en coche.`
        : `${planName}: ${count} tramo(s). Cambia de ruta arriba si tienes alternativas.`;
}

export function renderRoutePlan() {
    const trip = getActiveTrip();
    const list = document.getElementById('route-plan-list');
    const empty = document.getElementById('route-plan-empty');
    if (!list || !trip) return;

    renderRoutePlansBar(trip);
    renderRoutePanelOrigin(trip);
    renderRouteTimeline(trip);
    renderQuickNextSegment(trip);
    renderQuickAddSegment(trip);
    renderTripActivity(trip);
    renderMapRouteChip(trip);
    updateMapRouteGuide(trip);

    const segments = getActiveRouteSegments(trip);

    empty?.classList.toggle('hidden', segments.length > 0);
    list.classList.toggle('hidden', segments.length === 0);

    if (!segments.length) {
        list.innerHTML = '';
        return;
    }

    const priorIds = segments.map((s) => s.id);

    list.innerHTML = segments.map((seg, index) => {
        const canSameRoad = index > 0;
        const validation = segmentValidation(trip, seg);
        const invalidClass = validation.valid ? '' : 'border-rose-500/40 opacity-90';
        return `
        <article class="bg-slate-950/80 border rounded-xl p-2.5 space-y-2 ${validation.valid ? 'border-amber-500/25' : invalidClass}" data-route-seg="${seg.id}">
            <div class="flex flex-wrap items-end justify-between gap-2">
                <div class="flex flex-wrap items-end gap-2 flex-1 min-w-0">
                    <span class="text-[10px] font-black text-amber-400 pb-2 shrink-0">Tramo ${index + 1}</span>
                    ${buildSegmentDayControls(seg, trip)}
                </div>
                <div class="flex gap-1 shrink-0">
                    <button type="button" data-center-seg="${seg.id}" class="p-1 rounded text-[10px] min-h-[32px] min-w-[28px] text-sky-400 hover:bg-sky-500/10" title="Centrar en mapa">◎</button>
                    <button type="button" data-move-seg="${seg.id}" data-direction="up" ${index === 0 ? 'disabled' : ''}
                        class="p-1 rounded text-[10px] min-h-[32px] min-w-[28px] ${index === 0 ? 'text-slate-700 opacity-40' : 'text-amber-400 hover:bg-amber-500/10'}">▲</button>
                    <button type="button" data-move-seg="${seg.id}" data-direction="down" ${index === segments.length - 1 ? 'disabled' : ''}
                        class="p-1 rounded text-[10px] min-h-[32px] min-w-[28px] ${index === segments.length - 1 ? 'text-slate-700 opacity-40' : 'text-amber-400 hover:bg-amber-500/10'}">▼</button>
                    <button type="button" data-delete-seg="${seg.id}" class="p-1 rounded text-rose-400 hover:bg-rose-500/10 min-h-[32px] min-w-[28px] text-sm">✕</button>
                </div>
            </div>
            ${!validation.valid ? `<p class="text-[10px] font-semibold text-rose-400/90 leading-snug">${escapeHtml(validation.message)}</p>` : ''}
            <div class="grid grid-cols-1 gap-2">
                <label class="block">
                    <span class="text-[9px] font-bold text-slate-500 uppercase">Desde</span>
                    <select data-seg-from="${seg.id}" class="w-full mt-0.5 bg-slate-900 border border-slate-700 rounded-lg px-2 py-2.5 text-[11px] text-white outline-none min-h-[44px]">
                        ${buildSelectOptions(trip, seg.fromKey)}
                    </select>
                </label>
                <label class="block">
                    <span class="text-[9px] font-bold text-slate-500 uppercase">Hasta</span>
                    <select data-seg-to="${seg.id}" class="w-full mt-0.5 bg-slate-900 border border-slate-700 rounded-lg px-2 py-2.5 text-[11px] text-white outline-none min-h-[44px]">
                        ${buildSelectOptions(trip, seg.toKey)}
                    </select>
                </label>
            </div>
            ${canSameRoad ? `
            <label class="flex items-center gap-2 min-h-[40px] cursor-pointer">
                <input type="checkbox" data-seg-same-road="${seg.id}" ${seg.sameRoadAs === priorIds[index - 1] ? 'checked' : ''}
                    class="rounded border-slate-600 text-purple-600 focus:ring-purple-500" />
                <span class="text-[10px] text-slate-400">Vuelta por la misma vía que el tramo anterior</span>
            </label>` : ''}
            <p class="text-[9px] text-slate-500 leading-snug">Camino más corto en coche solo en este trayecto.</p>
        </article>`;
    }).join('');
}

function fitSegmentOnMap(trip, segId) {
    const seg = getActiveRouteSegments(trip).find((s) => s.id === segId);
    if (!seg) return;
    const from = resolveRoutePoint(trip, seg.fromKey);
    const to = resolveRoutePoint(trip, seg.toKey);
    if (!from || !to) return;
    setActiveTab('map');
    const map = getMap();
    if (!map || !window.L) {
        focusOnLocation(to.lat, to.lng);
        return;
    }
    map.fitBounds(window.L.latLngBounds([
        [from.lat, from.lng],
        [to.lat, to.lng],
    ]), { padding: [80, 80] });
}

function highlightSegmentRow(segId) {
    const row = document.querySelector(`[data-route-seg="${segId}"]`);
    if (!row) return;
    row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    row.classList.add('ring-2', 'ring-amber-400/60');
    setTimeout(() => row.classList.remove('ring-2', 'ring-amber-400/60'), 1600);
}

function buildChainSegments(trip) {
    const { route } = splitDestinations(trip.destinations);
    if (!route.length) return null;

    const segments = [];
    let fromKey = ROUTE_POINT_START;
    const ts = Date.now();

    route.forEach((d, i) => {
        const day = d.dayId ? trip.days?.find((dayItem) => dayItem.id === d.dayId) : null;
        segments.push({
            id: `seg-${ts}-${i}`,
            fromKey,
            toKey: destPointKey(d.id),
            sameRoadAs: null,
            dayId: d.dayId || null,
            travelDate: day?.date || null,
        });
        fromKey = destPointKey(d.id);
    });

    return segments;
}

export function bindRoutePlan(onMapRedraw) {
    bindRoutePlansBar(onMapRedraw);
    bindDeleteRoutePlanModal(onMapRedraw);

    document.getElementById('btn-edit-origin-route')?.addEventListener('click', openEditStartModal);
    document.getElementById('btn-focus-origin-route')?.addEventListener('click', () => {
        const trip = getActiveTrip();
        if (trip) {
            setActiveTab('map');
            focusOnLocation(trip.startingPoint.lat, trip.startingPoint.lng, true);
        }
    });

    document.getElementById('map-route-chip')?.addEventListener('click', () => {
        setActiveTab('route');
    });

    document.getElementById('btn-chain-route')?.addEventListener('click', () => {
        const trip = getActiveTrip();
        if (!trip) return;
        const chain = buildChainSegments(trip);
        if (!chain) {
            showAlert('Añade paradas «En ruta» antes de generar la cadena.', 'error');
            return;
        }
        updateActiveTrip(syncRouteAndItinerary(withActiveRouteSegments(trip, chain)));
        clearRouteLegCache();
        renderRoutePlan();
        onMapRedraw?.();
        scheduleSync();
        showAlert(`Ruta en cadena: ${chain.length} tramo(s) desde origen hasta la última parada.`, 'success');
    });

    document.getElementById('btn-quick-next-segment')?.addEventListener('click', (e) => {
        const btn = e.currentTarget;
        const fromKey = btn.dataset.quickFrom;
        const toKey = btn.dataset.quickTo;
        if (!fromKey || !toKey) return;
        const trip = getActiveTrip();

        updateSegments((segments) => {
            segments.push({
                id: `seg-${Date.now()}`,
                fromKey,
                toKey,
                sameRoadAs: null,
                ...defaultSegmentDayFields(trip),
            });
        }, onMapRedraw);
        showAlert('Tramo añadido.', 'success');
    });

    document.getElementById('route-timeline')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-timeline-seg]');
        if (!btn) return;
        const trip = getActiveTrip();
        if (!trip) return;
        highlightSegmentRow(btn.dataset.timelineSeg);
        fitSegmentOnMap(trip, btn.dataset.timelineSeg);
    });

    document.getElementById('btn-quick-add-segment')?.addEventListener('click', () => {
        const trip = getActiveTrip();
        if (!trip) return;
        const fromKey = document.getElementById('quick-add-seg-from')?.value;
        const toKey = document.getElementById('quick-add-seg-to')?.value;
        if (!fromKey || !toKey) {
            showAlert('Elige puntos en Desde y Hasta.', 'error');
            return;
        }
        if (fromKey === toKey) {
            showAlert('Desde y Hasta deben ser puntos distintos.', 'error');
            return;
        }
        if (!resolveRoutePoint(trip, fromKey) || !resolveRoutePoint(trip, toKey)) {
            showAlert('Uno de los puntos elegidos no tiene ubicación válida.', 'error');
            return;
        }

        updateSegments((segments) => {
            segments.push({
                id: `seg-${Date.now()}`,
                fromKey,
                toKey,
                sameRoadAs: null,
                ...defaultSegmentDayFields(trip),
            });
        }, onMapRedraw);

        const tripAfter = getActiveTrip();
        if (tripAfter) {
            const fromSel = document.getElementById('quick-add-seg-from');
            const toSel = document.getElementById('quick-add-seg-to');
            if (fromSel) fromSel.value = toKey;
            if (toSel) {
                toSel.innerHTML = buildSelectOptions(tripAfter, '');
                toSel.value = suggestQuickAddToKey(tripAfter, toKey);
            }
        }
        showAlert('Tramo añadido.', 'success');
    });

    document.getElementById('quick-add-seg-from')?.addEventListener('change', () => {
        const trip = getActiveTrip();
        if (!trip) return;
        const fromSel = document.getElementById('quick-add-seg-from');
        const toSel = document.getElementById('quick-add-seg-to');
        if (!fromSel || !toSel) return;
        const toKey = suggestQuickAddToKey(trip, fromSel.value);
        toSel.innerHTML = buildSelectOptions(trip, toKey);
        if (toKey) toSel.value = toKey;
    });

    document.getElementById('btn-add-route-segment')?.addEventListener('click', () => {
        const trip = getActiveTrip();
        if (!trip) return;

        updateSegments((segments) => {
            segments.push({
                id: `seg-${Date.now()}`,
                fromKey: defaultFromKey(trip),
                toKey: '',
                sameRoadAs: null,
                ...defaultSegmentDayFields(trip),
            });
        }, onMapRedraw);

        showAlert('Tramo vacío añadido. Completa Desde y Hasta en la lista.', 'success');
    });

    document.getElementById('route-plan-list')?.addEventListener('change', (e) => {
        const fromSel = e.target.closest('[data-seg-from]');
        const toSel = e.target.closest('[data-seg-to]');
        const sameRoad = e.target.closest('[data-seg-same-road]');
        const travelDateInput = e.target.closest('[data-seg-travel-date]');
        const daySel = e.target.closest('[data-seg-day]');

        if (travelDateInput) {
            const id = travelDateInput.dataset.segTravelDate;
            const value = travelDateInput.value || null;
            patchSegmentDayMeta(id, { travelDate: value }, { syncDayDate: true }, onMapRedraw);
            return;
        }

        if (daySel) {
            const id = daySel.dataset.segDay;
            const dayId = daySel.value || null;
            const trip = getActiveTrip();
            const day = trip?.days?.find((d) => d.id === dayId);
            const current = getActiveRouteSegments(trip).find((s) => s.id === id);
            patchSegmentDayMeta(id, {
                dayId,
                travelDate: day?.date || current?.travelDate || null,
            }, {}, onMapRedraw);
            return;
        }

        if (fromSel) {
            const id = fromSel.dataset.segFrom;
            updateSegments((segments) => segments.map((s) =>
                s.id === id ? { ...s, fromKey: fromSel.value, sameRoadAs: null } : s
            ), onMapRedraw);
            return;
        }

        if (toSel) {
            const id = toSel.dataset.segTo;
            updateSegments((segments) => segments.map((s) =>
                s.id === id ? { ...s, toKey: toSel.value, sameRoadAs: null } : s
            ), onMapRedraw);
            return;
        }

        if (sameRoad) {
            const id = sameRoad.dataset.segSameRoad;
            const trip = getActiveTrip();
            const idx = getActiveRouteSegments(trip).findIndex((s) => s.id === id);
            const segs = getActiveRouteSegments(trip);
            const prevId = idx > 0 ? segs[idx - 1].id : null;
            updateSegments((segments) => segments.map((s) =>
                s.id === id
                    ? { ...s, sameRoadAs: sameRoad.checked && prevId ? prevId : null }
                    : s
            ), onMapRedraw);
        }
    });

    document.getElementById('route-plan-list')?.addEventListener('click', (e) => {
        const center = e.target.closest('[data-center-seg]');
        if (center) {
            const trip = getActiveTrip();
            if (trip) fitSegmentOnMap(trip, center.dataset.centerSeg);
            return;
        }

        const del = e.target.closest('[data-delete-seg]');
        if (del) {
            updateSegments((segments) => segments.filter((s) => s.id !== del.dataset.deleteSeg), onMapRedraw);
            return;
        }

        const move = e.target.closest('[data-move-seg]');
        if (move && !move.disabled) {
            const id = move.dataset.moveSeg;
            const dir = move.dataset.direction;
            updateSegments((segments) => {
                const idx = segments.findIndex((s) => s.id === id);
                if (idx === -1) return;
                const swap = dir === 'up' ? idx - 1 : idx + 1;
                if (swap < 0 || swap >= segments.length) return;
                const copy = [...segments];
                [copy[idx], copy[swap]] = [copy[swap], copy[idx]];
                return copy;
            }, onMapRedraw);
        }
    });
}

export function getDestSegmentNumbers(trip, destId) {
    const key = destPointKey(destId);
    return getActiveRouteSegments(trip)
        .map((s, i) => (s.toKey === key ? i + 1 : null))
        .filter((n) => n != null);
}

function switchRoutePlan(planId, onMapRedraw) {
    const trip = getActiveTrip();
    if (!trip) return;
    pendingMapFromKey = null;
    updateActiveTrip(withActiveRoutePlanId(trip, planId));
    clearRouteLegCache();
    renderRoutePlan();
    onMapRedraw?.();
    scheduleSync();
}

function openDeleteRoutePlanModal(planId, planName) {
    pendingDeleteRoutePlan = { planId, planName };
    const nameEl = document.getElementById('delete-route-plan-name');
    if (nameEl) nameEl.textContent = planName;
    document.getElementById('modal-delete-route-plan')?.classList.remove('hidden');
}

function closeDeleteRoutePlanModal() {
    pendingDeleteRoutePlan = null;
    document.getElementById('modal-delete-route-plan')?.classList.add('hidden');
}

function confirmDeleteRoutePlan(onMapRedraw) {
    if (!pendingDeleteRoutePlan) return;
    const trip = getActiveTrip();
    if (!trip) return;
    const { planId, planName } = pendingDeleteRoutePlan;
    closeDeleteRoutePlanModal();
    pendingMapFromKey = null;
    updateActiveTrip(removeRoutePlan(trip, planId));
    clearRouteLegCache();
    renderRoutePlan();
    onMapRedraw?.();
    scheduleSync();
    showAlert(`«${planName}» eliminada.`, 'info');
}

function bindDeleteRoutePlanModal(onMapRedraw) {
    const modal = document.getElementById('modal-delete-route-plan');
    if (!modal || modal.dataset.bound === '1') return;
    modal.dataset.bound = '1';

    document.querySelectorAll('[data-close-delete-route-plan]').forEach((el) => {
        el.addEventListener('click', () => closeDeleteRoutePlanModal());
    });

    document.getElementById('btn-confirm-delete-route-plan')?.addEventListener('click', () => {
        confirmDeleteRoutePlan(onMapRedraw);
    });
}

function bindRoutePlansBar(onMapRedraw) {
    const wrap = document.getElementById('route-plans-wrap');
    if (!wrap || wrap.dataset.bound === '1') return;
    wrap.dataset.bound = '1';
    wrap.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('[data-delete-route-plan]');
        if (deleteBtn) {
            e.stopPropagation();
            const trip = getActiveTrip();
            if (!trip) return;
            const planId = deleteBtn.dataset.deleteRoutePlan;
            const plan = ensureRoutePlans(trip).routePlans.find((p) => p.id === planId);
            if (!plan) return;
            openDeleteRoutePlanModal(planId, plan.name);
            return;
        }

        const selectBtn = e.target.closest('[data-select-route-plan]');
        if (selectBtn && !e.target.closest('[data-delete-route-plan]')) {
            switchRoutePlan(selectBtn.dataset.selectRoutePlan, onMapRedraw);
            return;
        }

        if (e.target.closest('#btn-add-route-plan')) {
            const trip = getActiveTrip();
            if (!trip) return;
            pendingMapFromKey = null;
            const next = addRoutePlan(trip);
            updateActiveTrip(next);
            clearRouteLegCache();
            renderRoutePlan();
            onMapRedraw?.();
            scheduleSync();
            const name = next.routePlans.find((p) => p.id === next.activeRoutePlanId)?.name ?? 'Nueva ruta';
            showAlert(`«${name}» creada. Origen y destino del viaje se mantienen; define sus tramos.`, 'success');
        }
    });

    wrap.addEventListener('dblclick', (e) => {
        const label = e.target.closest('[data-route-plan-label]');
        if (!label) return;
        const planId = label.dataset.routePlanLabel;
        const trip = getActiveTrip();
        if (!trip) return;
        const plan = ensureRoutePlans(trip).routePlans.find((p) => p.id === planId);
        if (!plan) return;
        const nextName = window.prompt('Nombre de la ruta:', plan.name);
        if (nextName == null) return;
        updateActiveTrip(renameRoutePlan(trip, planId, nextName));
        renderRoutePlan();
        scheduleSync();
    });
}

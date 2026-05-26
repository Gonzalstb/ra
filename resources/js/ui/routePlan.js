import {
    getActiveTrip, updateActiveTrip, splitDestinations,
} from '../state/plannerStore';
import {
    getRoutePointOptions,
    ROUTE_POINT_START,
    destPointKey,
    clearRouteLegCache,
    resolveRoutePoint,
    estimateRouteSummary,
} from '../services/routing';
import { showAlert } from './alerts';
import { scheduleSync } from '../services/syncScheduler';
import { setActiveTab } from './tabs';
import { openEditStartModal } from './modals';
import { focusOnLocation, getMap } from '../map/mapManager';

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
}

function labelForKey(trip, key) {
    const opt = getRoutePointOptions(trip).find((o) => o.key === key);
    return opt?.label?.replace(/^[^\s]+\s/, '') ?? key;
}

function buildSelectOptions(trip, selectedKey) {
    return getRoutePointOptions(trip).map((opt) =>
        `<option value="${escapeHtml(opt.key)}" ${opt.key === selectedKey ? 'selected' : ''}>${escapeHtml(opt.label)}</option>`
    ).join('');
}

export function defaultFromKey(trip) {
    const segs = trip.routeSegments ?? [];
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

function updateSegments(mutator, onMapRedraw) {
    const trip = getActiveTrip();
    if (!trip) return;
    let segments = [...(trip.routeSegments ?? [])];
    const next = mutator(segments);
    if (next !== undefined) segments = next;
    updateActiveTrip({ routeSegments: segments });
    clearRouteLegCache();
    renderRoutePlan();
    onMapRedraw?.();
    scheduleSync();
}

function renderRoutePanelOrigin(trip) {
    const el = document.getElementById('route-panel-origin-name');
    if (el && trip) {
        el.textContent = trip.startingPoint.name;
    }
}

function renderRouteTimeline(trip) {
    const wrap = document.getElementById('route-timeline-wrap');
    const el = document.getElementById('route-timeline');
    if (!wrap || !el) return;

    const segments = trip.routeSegments ?? [];
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

    const segs = trip.routeSegments ?? [];
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

    const durationPart = summary.durationLabel ? ` · ${summary.durationLabel}` : '';
    chip.className = 'pointer-events-auto flex items-center gap-2 min-h-[44px] px-3.5 py-2 rounded-full bg-emerald-950/95 border border-emerald-500/40 text-emerald-200 text-[11px] font-bold shadow-lg backdrop-blur-md';
    chip.innerHTML = `<span>${count} tramo${count !== 1 ? 's' : ''}${escapeHtml(durationPart)}</span>`;
    chip.dataset.chipMode = 'ready';
}

export function updateMapRouteGuide(trip) {
    const hint = document.getElementById('guide-route-hint');
    if (!hint || !trip) return;
    const count = trip.routeSegments?.length ?? 0;
    hint.textContent = count === 0
        ? '0 tramos — abre la pestaña Ruta para planificar el recorrido en coche.'
        : `${count} tramo(s) definido(s). La ruta está lista; edítala en la pestaña Ruta.`;
}

export function renderRoutePlan() {
    const trip = getActiveTrip();
    const list = document.getElementById('route-plan-list');
    const empty = document.getElementById('route-plan-empty');
    if (!list || !trip) return;

    renderRoutePanelOrigin(trip);
    renderRouteTimeline(trip);
    renderQuickNextSegment(trip);
    renderMapRouteChip(trip);
    updateMapRouteGuide(trip);

    const segments = trip.routeSegments ?? [];

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
            <div class="flex items-center justify-between gap-2">
                <span class="text-[10px] font-black text-amber-400">Tramo ${index + 1}</span>
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
    const seg = (trip.routeSegments ?? []).find((s) => s.id === segId);
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
        segments.push({
            id: `seg-${ts}-${i}`,
            fromKey,
            toKey: destPointKey(d.id),
            sameRoadAs: null,
        });
        fromKey = destPointKey(d.id);
    });

    return segments;
}

export function bindRoutePlan(onMapRedraw) {
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
        updateActiveTrip({ routeSegments: chain });
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

        updateSegments((segments) => {
            segments.push({
                id: `seg-${Date.now()}`,
                fromKey,
                toKey,
                sameRoadAs: null,
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

    document.getElementById('btn-add-route-segment')?.addEventListener('click', () => {
        const trip = getActiveTrip();
        if (!trip) return;

        const { route } = splitDestinations(trip.destinations);
        if (!route.length) {
            showAlert('Añade al menos una parada «En ruta» antes de definir tramos.', 'error');
            return;
        }

        const fromKey = defaultFromKey(trip);
        const usedTo = new Set((trip.routeSegments ?? []).map((s) => s.toKey));
        const firstDest = route.find((d) => !usedTo.has(destPointKey(d.id))) ?? route[0];

        updateSegments((segments) => {
            segments.push({
                id: `seg-${Date.now()}`,
                fromKey,
                toKey: destPointKey(firstDest.id),
                sameRoadAs: null,
            });
        }, onMapRedraw);

        showAlert('Tramo añadido. Ajusta Desde y Hasta si hace falta.', 'success');
    });

    document.getElementById('route-plan-list')?.addEventListener('change', (e) => {
        const fromSel = e.target.closest('[data-seg-from]');
        const toSel = e.target.closest('[data-seg-to]');
        const sameRoad = e.target.closest('[data-seg-same-road]');

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
            const idx = (trip.routeSegments ?? []).findIndex((s) => s.id === id);
            const prevId = idx > 0 ? trip.routeSegments[idx - 1].id : null;
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
    return (trip.routeSegments ?? [])
        .map((s, i) => (s.toKey === key ? i + 1 : null))
        .filter((n) => n != null);
}

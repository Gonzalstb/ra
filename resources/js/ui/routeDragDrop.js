import { getActiveTrip, splitDestinations, moveRouteDestinationToIndex } from '../state/plannerStore';
import { showAlert } from './alerts';
import { renderSidebar } from './sidebar';

let draggedDestId = null;
let dropTargetId = null;
let pointerDragActive = false;
let pointerHandle = null;

function clearDragState(routeList) {
    draggedDestId = null;
    dropTargetId = null;
    pointerDragActive = false;
    pointerHandle = null;
    routeList?.querySelectorAll('[data-route-item="true"]').forEach((el) => {
        el.classList.remove('route-dragging', 'route-drag-over', 'route-drag-over-top', 'route-drag-over-bottom');
        el.style.opacity = '';
    });
}

function getDropIndex(route, targetEl, clientY) {
    const targetId = targetEl.dataset.destId;
    const targetIndex = route.findIndex((d) => d.id === targetId);
    if (targetIndex === -1) return -1;

    const rect = targetEl.getBoundingClientRect();
    const insertAfter = clientY > rect.top + rect.height / 2;
    return insertAfter ? targetIndex + 1 : targetIndex;
}

function highlightDropTarget(routeList, target, clientY) {
    if (!target || target.dataset.destId === draggedDestId) return;

    routeList.querySelectorAll('[data-route-item="true"]').forEach((el) => {
        el.classList.remove('route-drag-over-top', 'route-drag-over-bottom');
    });

    const rect = target.getBoundingClientRect();
    const insertAfter = clientY > rect.top + rect.height / 2;
    target.classList.add(insertAfter ? 'route-drag-over-bottom' : 'route-drag-over-top');
    dropTargetId = target.dataset.destId;
}

function findRouteItemUnderPoint(routeList, x, y) {
    const el = document.elementFromPoint(x, y);
    return el?.closest('[data-route-item="true"]') ?? null;
}

function commitDrop(routeList, clientY, onMapRedraw) {
    if (!draggedDestId || !dropTargetId) {
        clearDragState(routeList);
        return;
    }

    const trip = getActiveTrip();
    if (!trip) {
        clearDragState(routeList);
        return;
    }

    const { route } = splitDestinations(trip.destinations);
    const targetEl = routeList.querySelector(`[data-route-item="true"][data-dest-id="${dropTargetId}"]`);
    if (!targetEl) {
        clearDragState(routeList);
        return;
    }

    let toIndex = getDropIndex(route, targetEl, clientY);
    const fromIndex = route.findIndex((d) => d.id === draggedDestId);
    if (fromIndex !== -1 && toIndex > fromIndex) {
        toIndex -= 1;
    }

    const dest = route.find((d) => d.id === draggedDestId);
    if (moveRouteDestinationToIndex(draggedDestId, toIndex)) {
        showAlert(`↕️ '${dest?.name}' reordenado en la ruta.`, 'info');
        renderSidebar();
        onMapRedraw?.();
    }

    clearDragState(routeList);
}

export function bindRouteDragDrop(onMapRedraw) {
    const routeList = document.getElementById('route-list');
    if (!routeList) return;

    routeList.addEventListener('dragstart', (e) => {
        const handle = e.target.closest('[data-route-drag-handle]');
        if (!handle) return;

        draggedDestId = handle.dataset.destId;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedDestId);

        const item = handle.closest('[data-route-item]');
        item?.classList.add('route-dragging');
        requestAnimationFrame(() => {
            if (item) item.style.opacity = '0.45';
        });
    });

    routeList.addEventListener('dragend', (e) => {
        const item = e.target.closest('[data-route-item]');
        if (item) item.style.opacity = '';
        clearDragState(routeList);
    });

    routeList.addEventListener('dragover', (e) => {
        if (!draggedDestId || pointerDragActive) return;

        const target = e.target.closest('[data-route-item="true"]');
        if (!target || target.dataset.destId === draggedDestId) return;

        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        highlightDropTarget(routeList, target, e.clientY);
    });

    routeList.addEventListener('dragleave', (e) => {
        const target = e.target.closest('[data-route-item="true"]');
        if (!target) return;
        if (!target.contains(e.relatedTarget)) {
            target.classList.remove('route-drag-over-top', 'route-drag-over-bottom');
        }
    });

    routeList.addEventListener('drop', (e) => {
        e.preventDefault();
        if (pointerDragActive) return;
        commitDrop(routeList, e.clientY, onMapRedraw);
    });

    routeList.addEventListener('pointerdown', (e) => {
        const handle = e.target.closest('[data-route-drag-handle]');
        if (!handle || e.button !== 0) return;

        draggedDestId = handle.dataset.destId;
        pointerDragActive = true;
        pointerHandle = handle;
        handle.setPointerCapture(e.pointerId);

        const item = handle.closest('[data-route-item]');
        item?.classList.add('route-dragging');
        if (item) item.style.opacity = '0.45';
    });

    routeList.addEventListener('pointermove', (e) => {
        if (!pointerDragActive || !draggedDestId) return;

        const target = findRouteItemUnderPoint(routeList, e.clientX, e.clientY);
        if (target) {
            highlightDropTarget(routeList, target, e.clientY);
        }
    });

    routeList.addEventListener('pointerup', (e) => {
        if (!pointerDragActive) return;

        if (pointerHandle?.hasPointerCapture(e.pointerId)) {
            pointerHandle.releasePointerCapture(e.pointerId);
        }

        commitDrop(routeList, e.clientY, onMapRedraw);
    });

    routeList.addEventListener('pointercancel', () => {
        clearDragState(routeList);
    });
}

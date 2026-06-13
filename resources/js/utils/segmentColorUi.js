import { defaultSegmentLineColor, SEGMENT_LINE_COLORS } from '../services/routing';

export function effectiveSegmentLineColor(seg) {
    return seg.lineColor || defaultSegmentLineColor(!!seg.sameRoadAs);
}

export function buildSegmentColorSwatchesHtml(segId, seg, {
    colorDataAttr = 'data-seg-color',
    resetDataAttr = 'data-seg-color-reset',
    swatchClass = 'w-6 h-6',
} = {}) {
    const currentColor = effectiveSegmentLineColor(seg);
    const swatches = SEGMENT_LINE_COLORS.map((color) => {
        const selected = color.toLowerCase() === currentColor.toLowerCase();
        return `<button type="button" ${colorDataAttr}="${segId}" data-color="${color}"
            class="${swatchClass} rounded-full border-2 shadow-sm transition hover:scale-110 ${selected ? 'border-white ring-2 ring-amber-400' : 'border-slate-700'}"
            style="background-color:${color}" title="${color}"></button>`;
    }).join('');

    return `<div class="flex flex-wrap items-center gap-1.5">${swatches}
        <button type="button" ${resetDataAttr}="${segId}"
            class="text-[9px] font-semibold text-slate-500 hover:text-slate-300 px-1.5 py-0.5 rounded border border-slate-700"
            title="Restaurar color por defecto">↺</button>
    </div>`;
}

export function buildSegmentColorPopupHtml(segId, seg) {
    const swatches = buildSegmentColorSwatchesHtml(segId, seg, {
        swatchClass: 'w-7 h-7',
    });

    return `<div class="route-segment-color-popup p-2.5 space-y-2 min-w-[180px]">
        <p class="text-[10px] font-bold text-slate-700 m-0">Color de la línea del tramo</p>
        ${swatches}
        <button type="button" data-seg-delete-popup="${segId}"
            class="w-full px-2 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold">
            🗑 Eliminar tramo
        </button>
    </div>`;
}

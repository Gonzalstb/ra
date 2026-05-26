<nav data-mobile-nav class="lg:hidden fixed bottom-0 inset-x-0 h-[64px] bg-slate-950 border-t border-slate-800/80 grid grid-cols-6 z-40" role="tablist" aria-label="Navegación del planificador">
    <button type="button" data-tab-btn="map" role="tab" aria-selected="true" class="flex flex-col items-center justify-center gap-0.5 text-[9px] font-bold transition text-amber-400 bg-slate-900/40 px-0.5 min-h-[44px]">
        <x-planner-icon name="map" class="w-4 h-4" /><span>Mapa</span>
    </button>
    <button type="button" data-tab-btn="list" role="tab" aria-selected="false" class="flex flex-col items-center justify-center gap-0.5 text-[9px] font-bold transition text-slate-400 px-0.5 min-h-[44px]">
        <x-planner-icon name="book" class="w-4 h-4" /><span>Destinos</span>
    </button>
    <button type="button" data-tab-btn="route" role="tab" aria-selected="false" class="flex flex-col items-center justify-center gap-0.5 text-[9px] font-bold transition text-slate-400 px-0.5 min-h-[44px]">
        <x-planner-icon name="route" class="w-4 h-4" /><span>Ruta</span>
    </button>
    <button type="button" data-tab-btn="itinerary" role="tab" aria-selected="false" class="flex flex-col items-center justify-center gap-0.5 text-[9px] font-bold transition text-slate-400 px-0.5 min-h-[44px]">
        <x-planner-icon name="clock" class="w-4 h-4" /><span>Plan</span>
    </button>
    <button type="button" data-tab-btn="add" role="tab" aria-selected="false" class="flex flex-col items-center justify-center gap-0.5 text-[9px] font-bold transition text-slate-400 px-0.5 min-h-[44px]">
        <x-planner-icon name="plus" class="w-4 h-4" /><span>+ Parada</span>
    </button>
    <button type="button" data-tab-btn="presets" role="tab" aria-selected="false" class="flex flex-col items-center justify-center gap-0.5 text-[9px] font-bold transition text-slate-400 px-0.5 min-h-[44px]">
        <x-planner-icon name="image" class="w-4 h-4" /><span>Galería</span>
    </button>
</nav>

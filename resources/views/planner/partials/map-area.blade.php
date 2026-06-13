<main id="main-map" class="flex-1 min-w-0 h-full relative bg-slate-900 block absolute lg:relative inset-0 bottom-[64px] lg:bottom-0 z-10">
    <div id="map-map-controls" class="absolute top-3 right-3 z-[1100] flex flex-col items-end gap-2 pointer-events-none">
        <button type="button" id="btn-map-hide-off-route" aria-pressed="false" aria-label="Ocultar puntos libres del mapa"
            class="map-vis-btn pointer-events-auto relative flex items-center justify-center w-11 h-11 rounded-full bg-slate-950/95 backdrop-blur-md border border-slate-600/80 text-sky-400 shadow-xl hover:border-sky-400/50 hover:bg-slate-900 hover:text-sky-300 transition-all duration-200"
            title="Ocultar puntos libres del mapa">
            <span id="map-hide-off-route-icon" class="shrink-0 flex items-center justify-center">
                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
            </span>
            <span id="map-off-route-count" class="hidden absolute -top-0.5 -right-0.5 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-sky-500 text-slate-950 text-[9px] font-black flex items-center justify-center ring-2 ring-slate-950">0</span>
        </button>
    </div>
    <div class="absolute bottom-4 left-4 z-[1100] bg-slate-950/95 backdrop-blur-md border border-slate-800 p-2.5 rounded-xl shadow-xl space-y-1 text-[10px] md:text-xs text-left max-w-[180px] md:max-w-none">
        <div class="font-bold text-slate-300 border-b border-slate-800 pb-1 mb-1 text-[9px] tracking-wider uppercase">Elementos</div>
        <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 bg-rose-600 rounded-full inline-block"></span><span class="text-slate-400 font-medium">📍 Parada Activa</span></div>
        <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 bg-sky-600 rounded-full inline-block"></span><span class="text-slate-400 font-medium">🔍 Punto Libre</span></div>
        <div class="flex items-center gap-1.5 pt-1 border-t border-slate-800 mt-1"><span class="w-4 h-1 bg-emerald-500 rounded inline-block"></span><span class="text-slate-400 font-medium">🚗 Tramo en coche · clic para cambiar color</span></div>
        <div class="flex items-center gap-1.5"><span class="w-4 h-1 bg-amber-500 rounded inline-block"></span><span class="text-slate-400 font-medium">🏁 Vuelta al final</span></div>
        <div class="flex items-center gap-1.5"><span class="w-4 h-1 bg-purple-500 rounded inline-block border border-dashed border-purple-300"></span><span class="text-slate-400 font-medium">↺ Misma vía ida/vuelta</span></div>
        <div id="map-overlap-legend" class="hidden pt-1 border-t border-slate-800 mt-1 space-y-1">
            <div class="flex items-center gap-1.5"><span class="relative w-4 h-2 inline-block"><span class="absolute inset-x-0 top-0 h-0.5 bg-emerald-500 rounded"></span><span class="absolute inset-x-0 top-1 h-0.5 border-t border-dashed border-slate-400"></span></span><span class="text-slate-400 font-medium">↕ Rutas superpuestas</span></div>
        </div>
    </div>
    <div id="map-routing-loading" class="hidden absolute top-16 left-1/2 -translate-x-1/2 z-[1100] pointer-events-none">
        <div class="bg-slate-950/95 backdrop-blur border border-emerald-500/30 text-emerald-300 text-[11px] font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
            <span class="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></span>
            Calculando ruta en coche…
        </div>
    </div>
    <div id="map-container" class="w-full h-full" style="min-height:100%"></div>
    <div id="map-loading" class="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-3 z-50 pointer-events-none">
        <div class="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-slate-400 font-medium text-xs md:text-sm">Cargando mapa...</p>
    </div>
</main>

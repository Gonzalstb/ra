<main id="main-map" class="flex-1 min-w-0 h-full relative bg-slate-900 block absolute lg:relative inset-0 bottom-[64px] lg:bottom-0 z-10">
    <div class="absolute top-4 left-4 right-4 md:right-auto z-20 pointer-events-none">
        <div class="bg-slate-950/90 backdrop-blur-md border border-slate-800 text-slate-200 p-3 rounded-xl shadow-xl flex gap-3 pointer-events-auto max-w-sm">
            <div class="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <x-planner-icon name="navigation" class="w-4 h-4" />
            </div>
            <div class="text-left">
                <h4 class="text-[11px] md:text-xs font-bold text-amber-400">Guía de Navegación</h4>
                <p id="guide-text" class="text-[10px] md:text-[11px] text-slate-400 mt-0.5 leading-relaxed">Modo Destino: Toca el mapa o busca la dirección en el panel + Parada.</p>
                <p id="guide-route-hint" class="text-[9px] text-emerald-500/90 mt-1">0 tramos — abre la pestaña Ruta para planificar el recorrido en coche.</p>
            </div>
        </div>
    </div>
    <div class="absolute bottom-4 left-4 z-20 bg-slate-950/95 backdrop-blur-md border border-slate-800 p-2.5 rounded-xl shadow-xl space-y-1 text-[10px] md:text-xs text-left max-w-[180px] md:max-w-none">
        <div class="font-bold text-slate-300 border-b border-slate-800 pb-1 mb-1 text-[9px] tracking-wider uppercase">Elementos</div>
        <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 bg-rose-600 rounded-full inline-block"></span><span class="text-slate-400 font-medium">📍 Parada Activa</span></div>
        <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 bg-sky-600 rounded-full inline-block"></span><span class="text-slate-400 font-medium">🔍 Punto Libre</span></div>
        <div class="flex items-center gap-1.5 pt-1 border-t border-slate-800 mt-1"><span class="w-4 h-1 bg-emerald-500 rounded inline-block"></span><span class="text-slate-400 font-medium">🚗 Tramo en coche</span></div>
        <div class="flex items-center gap-1.5"><span class="w-4 h-1 bg-amber-500 rounded inline-block"></span><span class="text-slate-400 font-medium">🏁 Vuelta al final</span></div>
        <div class="flex items-center gap-1.5"><span class="w-4 h-1 bg-purple-500 rounded inline-block border border-dashed border-purple-300"></span><span class="text-slate-400 font-medium">↺ Misma vía ida/vuelta</span></div>
    </div>
    <button type="button" id="map-route-chip" class="absolute top-4 right-4 z-20 lg:hidden" aria-label="Abrir plan de ruta"></button>
    <div id="map-routing-loading" class="hidden absolute top-20 left-1/2 -translate-x-1/2 z-[25] pointer-events-none">
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

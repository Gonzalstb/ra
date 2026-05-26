<div class="space-y-4 text-left">
    <div>
        <h3 class="text-sm font-bold tracking-wider text-emerald-400 uppercase">Ruta en coche</h3>
        <p class="text-[11px] text-slate-500 mt-1">Define cada trayecto: Desde → Hasta. El mapa traza el camino más corto solo en ese tramo.</p>
    </div>

    <div class="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/80 border border-emerald-500/20">
        <div class="min-w-0">
            <p class="text-[9px] font-bold text-slate-500 uppercase">Origen</p>
            <p id="route-panel-origin-name" class="text-xs font-bold text-slate-100 truncate"></p>
        </div>
        <div class="flex gap-1 shrink-0">
            <button type="button" id="btn-edit-origin-route" title="Modificar origen" class="p-2 bg-slate-800 hover:bg-emerald-950/80 rounded-lg text-slate-300 hover:text-emerald-400 border border-slate-700 min-h-[40px] min-w-[40px]">
                <x-planner-icon name="edit" class="w-3.5 h-3.5" />
            </button>
            <button type="button" id="btn-focus-origin-route" title="Centrar en mapa" class="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 min-h-[40px] min-w-[40px]">
                <x-planner-icon name="eye" class="w-3.5 h-3.5" />
            </button>
        </div>
    </div>

    <div id="trip-return-card" class="p-3 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
        <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
                <p class="text-[9px] font-bold text-amber-400 uppercase tracking-wider">Punto final del viaje</p>
                <p id="trip-end-label" class="text-xs font-bold text-slate-200 truncate mt-0.5">Mismo que el origen</p>
            </div>
            <label class="flex flex-col items-end gap-1 cursor-pointer shrink-0 min-h-[44px] justify-center">
                <span class="text-[9px] font-bold text-slate-500 uppercase">Mismo origen</span>
                <span class="relative inline-flex h-6 w-11 items-center">
                    <input type="checkbox" id="trip-return-to-start" checked class="peer sr-only" />
                    <span class="block h-6 w-11 rounded-full bg-slate-700 peer-checked:bg-emerald-600 transition"></span>
                    <span class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5"></span>
                </span>
            </label>
        </div>
        <div id="trip-custom-end-fields" class="hidden space-y-2 p-3 rounded-xl border border-amber-500/20 bg-amber-950/20">
            <input type="text" id="trip-end-name" placeholder="Nombre del punto final"
                class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-white outline-none min-h-[44px] focus:border-amber-500" />
            <button type="button" id="btn-pick-end-map"
                class="w-full min-h-[44px] rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-[11px] font-bold border border-amber-500/30 transition">
                Elegir en el mapa
            </button>
            <div class="grid grid-cols-2 gap-2">
                <input type="text" id="trip-end-lat" placeholder="Latitud" class="bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-[11px] text-white outline-none min-h-[44px]" />
                <input type="text" id="trip-end-lng" placeholder="Longitud" class="bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-[11px] text-white outline-none min-h-[44px]" />
            </div>
            <button type="button" id="btn-save-trip-end"
                class="w-full min-h-[44px] rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 text-[11px] font-extrabold transition">
                Guardar punto final
            </button>
        </div>
    </div>

    <div id="route-timeline-wrap" class="hidden">
        <p class="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Resumen del recorrido</p>
        <div id="route-timeline" class="flex flex-wrap items-center gap-1 text-[10px] font-semibold text-slate-300"></div>
    </div>

    <div id="route-quick-next" class="hidden">
        <button type="button" id="btn-quick-next-segment"
            class="w-full min-h-[44px] rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold transition text-left px-3 py-2">
        </button>
    </div>

    <div class="flex flex-wrap gap-2">
        <button type="button" id="btn-chain-route"
            class="flex-1 min-w-[120px] min-h-[44px] rounded-lg text-[10px] font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition">
            Ruta en cadena
        </button>
        <button type="button" id="btn-add-route-segment"
            class="flex-1 min-w-[120px] min-h-[44px] rounded-lg text-[10px] font-bold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition">
            + Tramo
        </button>
        <button type="button" id="btn-calc-times"
            class="flex-1 min-w-[120px] min-h-[44px] rounded-lg text-[10px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition">
            Tiempos reales
        </button>
    </div>

    <div id="route-plan-list" class="space-y-2 hidden"></div>
    <p id="route-plan-empty" class="text-[11px] text-slate-500 italic py-4 text-center bg-slate-950/50 rounded-xl border border-dashed border-slate-700">
        Sin tramos. Añade paradas «En ruta» en Destinos y pulsa «+ Tramo» o «Ruta en cadena».
    </p>
</div>

<div class="space-y-4">
    <div class="flex flex-wrap gap-2 text-[9px] font-bold uppercase tracking-wide">
        <span class="inline-flex items-center gap-1 text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-2 py-1 rounded-lg">● Reservado (mapa verde)</span>
        <span class="inline-flex items-center gap-1 text-violet-300 bg-violet-500/10 border border-violet-500/25 px-2 py-1 rounded-lg">€ Precio al añadir · editable en plan</span>
    </div>
    <div id="day-summary-card" class="hidden bg-gradient-to-br from-violet-950/80 to-slate-900/80 border border-violet-500/30 rounded-xl p-3 space-y-3 text-left">
        <div class="flex items-center justify-between gap-2">
            <h4 class="text-[10px] font-black text-violet-300 uppercase tracking-wider">Día activo</h4>
            <select id="active-day-select" class="flex-1 max-w-[180px] bg-slate-950 border border-violet-500/30 rounded-lg px-2 py-1 text-[11px] text-white outline-none"></select>
        </div>
        <div id="day-summary-meta" class="text-[11px] text-slate-400 space-y-1"></div>
        <div id="day-summary-stops" class="space-y-1.5"></div>
        <button type="button" id="btn-day-fit-map" class="w-full py-2.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 text-[11px] font-bold border border-violet-500/30 transition min-h-[44px]">
            Ver todo en mapa
        </button>
    </div>

    <div class="flex items-center justify-between border-b border-slate-800 pb-2">
        <div>
            <h3 class="text-sm font-bold tracking-wider text-violet-400 uppercase flex items-center gap-1.5">
                <x-planner-icon name="clock" class="w-4 h-4" /> Plan por días
            </h3>
            <p class="text-[10px] text-slate-500 mt-1">En cada día usa «Parada sin mapa» para el bar, comida, etc. sin chincheta.</p>
        </div>
        <button type="button" id="btn-add-day" class="text-[10px] font-bold text-violet-400 hover:text-violet-300 flex items-center gap-1 bg-violet-500/10 hover:bg-violet-500/20 px-2.5 py-1.5 rounded-lg border border-violet-500/20 transition shrink-0 min-h-[44px]">
            <x-planner-icon name="plus" class="w-3 h-3" /> Día
        </button>
    </div>
    <div id="itinerary-days-list" class="space-y-3"></div>
    <p id="itinerary-empty" class="hidden text-xs text-slate-500 italic py-6 text-center bg-slate-900/20 rounded-xl border border-slate-800/40">
        Aún no hay días planificados. Pulsa «Día» para crear el primero.
    </p>
</div>

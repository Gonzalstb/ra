<form id="form-add-destination" class="space-y-4">
    <div class="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
        <span class="block text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider">Tipo de parada</span>
        <div class="grid grid-cols-3 gap-2 pt-1">
            <button type="button" data-form-stop-type="route" class="py-2 px-2 text-[10px] font-bold rounded-lg border transition flex flex-col items-center justify-center gap-0.5 min-h-[52px] bg-amber-500/20 text-amber-400 border-amber-500">
                <x-planner-icon name="route" class="w-3.5 h-3.5" /> En ruta
            </button>
            <button type="button" data-form-stop-type="free" class="py-2 px-2 text-[10px] font-bold rounded-lg border transition flex flex-col items-center justify-center gap-0.5 min-h-[52px] bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700">
                <x-planner-icon name="map" class="w-3.5 h-3.5" /> En mapa
            </button>
            <button type="button" data-form-stop-type="text" class="py-2 px-2 text-[10px] font-bold rounded-lg border transition flex flex-col items-center justify-center gap-0.5 min-h-[52px] bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700">
                <span class="text-sm leading-none">📝</span> Sin mapa
            </button>
        </div>
        <p id="form-stop-type-hint" class="text-[10px] text-slate-500 leading-snug">Parada en la ruta del mapa. Necesitas ubicación en el mapa o buscar dirección.</p>
    </div>

    <div id="form-map-fields" class="space-y-4">
        <div id="form-geocode-block" class="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3 shadow-inner text-left">
            <div class="flex items-center gap-1.5 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <x-planner-icon name="compass" class="w-4 h-4" /> Buscar dirección
            </div>
            <div class="flex gap-2">
                <input type="text" id="address-search" placeholder="Ej. Calle Mayor 1, Madrid..." class="flex-1 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition" />
                <button type="button" id="btn-geocode-address" class="bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-600 font-extrabold px-3 py-2.5 rounded-xl text-xs transition shrink-0">Buscar</button>
            </div>
            <p class="text-[10px] text-slate-400 leading-normal">Pega solo la dirección (calle, CP y ciudad). O toca el mapa para fijar coordenadas.</p>
        </div>
        <div id="form-coords-fields" class="grid grid-cols-2 gap-2">
            <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Latitud</label>
                <input type="text" id="form-lat" placeholder="Latitud" class="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition" />
            </div>
            <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Longitud</label>
                <input type="text" id="form-lng" placeholder="Longitud" class="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 outline-none transition" />
            </div>
        </div>
    </div>

    <div>
        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Nombre</label>
        <input type="text" id="form-name" required placeholder="Ej. Bar La Piazza, museo, mirador..." class="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs md:text-sm text-white outline-none transition h-11" />
    </div>
    <div>
        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Descripción o notas</label>
        <textarea id="form-description" rows="3" placeholder="Detalles opcionales..." class="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs md:text-sm text-white outline-none transition resize-none"></textarea>
    </div>
    <div>
        <label class="block text-xs font-bold text-slate-400 uppercase mb-1">URL del sitio <span class="text-slate-600 font-normal normal-case">(opcional)</span></label>
        <input type="text" id="form-site-url" placeholder="https://..." class="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs md:text-sm text-white outline-none transition h-11" />
    </div>
    <div id="form-place-type-field" class="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
        <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo de lugar <span class="text-slate-600 font-normal normal-case">(opcional)</span></span>
        <div data-place-type-picker="form" class="grid grid-cols-2 gap-2" role="group" aria-label="Tipo de lugar">
            <button type="button" data-place-type="" class="place-type-btn py-2.5 px-2 text-[10px] font-bold rounded-xl border transition flex flex-col items-center justify-center gap-1 min-h-[52px] bg-slate-800 text-slate-300 border-slate-600 ring-2 ring-slate-500 ring-offset-1 ring-offset-slate-950" aria-pressed="true">
                <x-planner-icon name="map-pin" class="w-4 h-4 opacity-70" />
                General
            </button>
            <button type="button" data-place-type="winery" class="place-type-btn py-2.5 px-2 text-[10px] font-bold rounded-xl border transition flex flex-col items-center justify-center gap-1 min-h-[52px] bg-slate-950 text-slate-400 border-slate-800 hover:border-purple-500/40" aria-pressed="false">
                <span class="text-base leading-none">🍷</span>
                Bodega
            </button>
            <button type="button" data-place-type="hotel" class="place-type-btn py-2.5 px-2 text-[10px] font-bold rounded-xl border transition flex flex-col items-center justify-center gap-1 min-h-[52px] bg-slate-950 text-slate-400 border-slate-800 hover:border-teal-500/40" aria-pressed="false">
                <x-planner-icon name="bed" class="w-4 h-4" />
                Hotel
            </button>
            <button type="button" data-place-type="bar" class="place-type-btn py-2.5 px-2 text-[10px] font-bold rounded-xl border transition flex flex-col items-center justify-center gap-1 min-h-[52px] bg-slate-950 text-slate-400 border-slate-800 hover:border-orange-500/40" aria-pressed="false">
                <x-planner-icon name="drumstick" class="w-4 h-4" />
                Bar / comida
            </button>
        </div>
        <p class="text-[10px] text-slate-500 leading-snug">En el mapa verás el icono del tipo en lugar de la lupa en puntos libres.</p>
    </div>
    <div id="form-price-field" class="p-3 rounded-xl bg-violet-950/40 border border-violet-500/25 space-y-2">
        <label for="form-price" class="block text-[10px] font-bold text-violet-300 uppercase tracking-wider">Precio (opcional)</label>
        <div class="flex rounded-xl overflow-hidden border border-violet-500/30 bg-slate-950 focus-within:border-violet-400 min-h-[48px]">
            <span class="flex items-center justify-center px-3.5 bg-slate-900 text-violet-300 font-extrabold text-base border-r border-violet-500/20 shrink-0">€</span>
            <input type="number" id="form-price" inputmode="decimal" step="0.01" min="0" placeholder="25"
                class="flex-1 min-w-0 px-3 text-sm text-white placeholder-slate-600 outline-none bg-transparent" />
        </div>
    </div>
    <div id="route-fields" class="space-y-4">
        <label id="form-create-segment-wrap" class="flex items-start gap-3 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/25 cursor-pointer min-h-[48px]">
            <input type="checkbox" id="form-create-segment" checked class="mt-1 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500 shrink-0" />
            <span class="text-[11px] text-slate-300 leading-snug"><strong class="text-emerald-300">Crear tramo</strong> desde el último punto de la ruta.</span>
        </label>
        <div id="form-day-field" class="hidden">
            <label class="block text-[10px] font-bold text-violet-400 uppercase tracking-wider mb-1">Día del plan</label>
            <select id="form-day" class="w-full bg-slate-900 border border-violet-500/30 focus:border-violet-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none min-h-[44px] cursor-pointer">
                <option value="">Sin asignar</option>
            </select>
        </div>
        <div class="grid grid-cols-2 gap-2">
            <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tiempo en coche</label>
                <input type="text" id="form-duration" placeholder="Ej. 1h 30m" class="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none h-11" />
            </div>
            <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Imagen (URL)</label>
                <input type="text" id="form-photo" placeholder="https://..." class="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none h-11" />
            </div>
        </div>
        <div id="form-round-trip" class="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between cursor-pointer min-h-[48px]">
            <div class="flex items-center gap-2 pr-2">
                <span class="text-indigo-400 text-sm shrink-0">↺</span>
                <div>
                    <div class="text-[11px] font-bold text-slate-200">Ida y vuelta (misma vía)</div>
                </div>
            </div>
            <div id="round-trip-toggle" class="w-9 h-5 rounded-full p-0.5 bg-slate-700 transition">
                <div id="round-trip-knob" class="w-4 h-4 bg-white rounded-full transition-transform translate-x-0"></div>
            </div>
        </div>
    </div>
    <div id="free-photo-field" class="hidden">
        <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Foto (URL)</label>
        <input type="text" id="form-photo-alt" placeholder="https://..." class="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none h-11" />
    </div>
    <button type="submit" id="btn-submit-dest" class="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold py-3.5 px-4 rounded-xl shadow-lg active:scale-[0.98] transition flex items-center justify-center gap-2 h-12 text-xs md:text-sm">
        + Registrar Parada y Trazar Ruta
    </button>
</form>

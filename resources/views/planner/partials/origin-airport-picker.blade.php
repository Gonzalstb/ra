{{-- $prefix: edit-start | new-trip | trip-end --}}
@php
    $pickerPrefix = $prefix ?? 'edit-start';
    $pickerTitle = $pickerTitle ?? 'Origen de salida (aeropuerto)';
    $pickerIcon = $pickerIcon ?? '✈️';
@endphp
<div class="origin-airport-picker space-y-3" data-origin-picker="{{ $pickerPrefix }}">
    <div class="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 space-y-3">
        <p class="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            {{ $pickerIcon }} {{ $pickerTitle }}
        </p>
        <div>
            <label for="{{ $pickerPrefix }}-country" class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">1. País</label>
            <select id="{{ $pickerPrefix }}-country" data-origin-country
                class="w-full min-h-[48px] bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-sm text-white outline-none appearance-none cursor-pointer">
                <option value="">Selecciona un país…</option>
            </select>
        </div>
        <div>
            <label for="{{ $pickerPrefix }}-airport" class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">2. Aeropuerto</label>
            <select id="{{ $pickerPrefix }}-airport" data-origin-airport disabled
                class="w-full min-h-[48px] bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-sm text-white outline-none appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                <option value="">Primero elige un país</option>
            </select>
        </div>
        <div id="{{ $pickerPrefix }}-airport-search-wrap" class="hidden">
            <label for="{{ $pickerPrefix }}-airport-search" class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Filtrar aeropuertos</label>
            <input type="search" id="{{ $pickerPrefix }}-airport-search" data-origin-airport-search
                placeholder="Escribe ciudad o código IATA…"
                class="w-full min-h-[44px] bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl px-3 py-2.5 text-sm text-white outline-none" />
        </div>
        <p id="{{ $pickerPrefix }}-airport-hint" class="text-[10px] text-slate-500 hidden"></p>
    </div>
    <details class="group">
        <summary class="text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer list-none flex items-center gap-1 min-h-[44px]">
            <span class="group-open:rotate-90 transition">▶</span> Otras opciones (dirección manual)
        </summary>
        <div class="mt-2 space-y-2 pt-2 border-t border-slate-800/80">
            <div class="flex gap-2">
                <input type="text" id="{{ $pickerPrefix }}-search" data-origin-address-search
                    placeholder="Buscar dirección o ciudad…"
                    class="flex-1 min-h-[44px] bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-white outline-none" />
                <button type="button" data-origin-geocode-btn data-prefix="{{ $pickerPrefix }}"
                    class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-2 rounded-lg text-xs shrink-0 min-h-[44px]">Buscar</button>
            </div>
        </div>
    </details>
</div>

<div id="modal-edit-start" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
    <div class="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-md p-5 md:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 class="font-bold text-base md:text-lg text-white text-emerald-400">📍 Origen de salida</h3>
            <button type="button" data-close-edit-start class="text-slate-400 hover:text-white p-1 min-h-[44px] min-w-[44px]">✕</button>
        </div>

        @include('planner.partials.origin-airport-picker', ['prefix' => 'edit-start'])

        <form id="form-edit-start" class="space-y-3">
            <input type="hidden" id="edit-start-name" />
            <input type="hidden" id="edit-start-lat" />
            <input type="hidden" id="edit-start-lng" />
            <p id="edit-start-summary" class="text-xs text-slate-400 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 min-h-[44px] flex items-center">
                Selecciona país y aeropuerto arriba.
            </p>
            <div class="flex gap-2.5 pt-2 border-t border-slate-800">
                <button type="button" data-close-edit-start class="flex-1 bg-slate-900 text-slate-300 font-bold py-3 rounded-xl text-sm min-h-[48px]">Cancelar</button>
                <button type="submit" class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-sm min-h-[48px]">✓ Guardar</button>
            </div>
        </form>
    </div>
</div>

<div id="modal-delete-dest" class="hidden fixed inset-0 bg-black/85 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
    <div class="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 text-center">
        <h3 class="font-bold text-lg text-white">¿Eliminar localización?</h3>
        <p class="text-xs md:text-sm text-slate-400">Quitarás de forma definitiva a <strong id="delete-dest-name" class="text-slate-200"></strong> de tu mapa e itinerario.</p>
        <div class="flex gap-2.5 pt-3">
            <button type="button" data-close-delete-dest class="flex-1 bg-slate-900 text-slate-300 font-bold py-2.5 rounded-xl text-xs h-11">Cancelar</button>
            <button type="button" id="btn-confirm-delete-dest" class="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl text-xs h-11">Eliminar</button>
        </div>
    </div>
</div>

<div id="modal-new-trip" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
    <div class="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-md p-5 md:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-left">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 class="font-bold text-base md:text-lg text-white text-amber-400">🧭 Crear nuevo viaje</h3>
            <button type="button" data-close-new-trip class="text-slate-400 hover:text-white p-1 min-h-[44px] min-w-[44px]">✕</button>
        </div>
        <form id="form-new-trip" class="space-y-4">
            <div>
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1.5">Nombre del viaje</label>
                <input type="text" id="new-trip-name" required placeholder="Ej. Vacaciones 2026"
                    class="w-full min-h-[48px] bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none" />
            </div>

            @include('planner.partials.origin-airport-picker', ['prefix' => 'new-trip'])

            <p id="new-trip-origin-summary" class="text-xs text-slate-400 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 min-h-[44px] flex items-center">
                Elige el aeropuerto desde el que sales.
            </p>

            <div class="flex gap-2.5 pt-2 border-t border-slate-800">
                <button type="button" data-close-new-trip class="flex-1 bg-slate-900 text-slate-300 font-bold py-3 rounded-xl text-sm min-h-[48px]">Cancelar</button>
                <button type="submit" class="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 rounded-xl text-sm min-h-[48px]">✓ Crear viaje</button>
            </div>
        </form>
    </div>
</div>

<div id="modal-edit-dest" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
    <div class="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-md p-5 md:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-left">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 class="font-bold text-base md:text-lg text-sky-400">✏️ Editar punto</h3>
            <button type="button" data-close-edit-dest class="text-slate-400 hover:text-white p-1">✕</button>
        </div>
        <div class="bg-slate-900/50 p-3 rounded-xl border border-slate-800/80 space-y-2">
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Buscar nueva ubicación</label>
            <div class="flex gap-2">
                <input type="text" id="edit-dest-search" placeholder="Dirección o lugar en cualquier país..." class="flex-1 bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-lg px-3 py-2 text-xs text-white outline-none min-h-[44px]" />
                <button type="button" id="btn-geocode-edit-dest" class="bg-sky-600 hover:bg-sky-500 text-white font-bold px-3 py-2 rounded-lg text-xs shrink-0 min-h-[44px]">Buscar</button>
            </div>
        </div>
        <form id="form-edit-dest" class="space-y-3">
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Latitud</label>
                    <input type="text" id="edit-dest-lat" required class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none min-h-[44px]" />
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Longitud</label>
                    <input type="text" id="edit-dest-lng" required class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none min-h-[44px]" />
                </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <button type="button" data-edit-in-route="true" class="py-2 text-xs font-bold rounded-lg border h-11 min-h-[44px]">En Ruta</button>
                <button type="button" data-edit-in-route="false" class="py-2 text-xs font-bold rounded-lg border h-11 min-h-[44px]">Punto Libre</button>
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Nombre</label>
                <input type="text" id="edit-dest-name" required class="w-full bg-slate-900 border border-slate-800 focus:border-sky-500 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none min-h-[44px]" />
            </div>
            <div>
                <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Descripción</label>
                <textarea id="edit-dest-description" rows="2" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none resize-none"></textarea>
            </div>
            <div id="edit-dest-route-fields" class="grid grid-cols-2 gap-2">
                <div>
                    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tiempo</label>
                    <input type="text" id="edit-dest-duration" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none min-h-[44px]" />
                </div>
                <div>
                    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Foto URL</label>
                    <input type="text" id="edit-dest-photo" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none min-h-[44px]" />
                </div>
            </div>
            <div id="edit-dest-round-trip" class="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between cursor-pointer select-none min-h-[48px]">
                <div>
                    <span class="text-[11px] font-bold text-slate-200">Ida y vuelta (misma vía)</span>
                    <p class="text-[10px] text-slate-500 mt-0.5">Regreso por el mismo camino.</p>
                </div>
                <div id="edit-round-trip-toggle" class="w-9 h-5 rounded-full p-0.5 bg-slate-700 transition">
                    <div id="edit-round-trip-knob" class="w-4 h-4 bg-white rounded-full transition-transform"></div>
                </div>
            </div>
            <div>
                <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Día del itinerario</label>
                <select id="edit-dest-day" class="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer min-h-[44px]">
                    <option value="">Sin asignar</option>
                </select>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <label class="flex items-center gap-2 p-3 bg-slate-900 border border-slate-800 rounded-xl cursor-pointer min-h-[48px] col-span-2">
                    <input type="checkbox" id="edit-dest-reserved" class="w-4 h-4 rounded border-slate-600 text-emerald-600 focus:ring-emerald-500" />
                    <span class="text-[11px] font-bold text-emerald-300">Marcar como reservado</span>
                </label>
                <div class="col-span-2 p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                    <span class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo de lugar</span>
                    <div data-place-type-picker="edit" class="grid grid-cols-2 gap-2" role="group" aria-label="Tipo de lugar">
                        <button type="button" data-place-type="" class="place-type-btn py-2 px-2 text-[10px] font-bold rounded-lg border min-h-[44px] flex flex-col items-center justify-center gap-0.5">General</button>
                        <button type="button" data-place-type="winery" class="place-type-btn py-2 px-2 text-[10px] font-bold rounded-lg border min-h-[44px] flex flex-col items-center justify-center gap-0.5"><span class="text-sm">🍷</span> Bodega</button>
                        <button type="button" data-place-type="hotel" class="place-type-btn py-2 px-2 text-[10px] font-bold rounded-lg border min-h-[44px] flex flex-col items-center justify-center gap-0.5"><x-planner-icon name="bed" class="w-3.5 h-3.5" /> Hotel</button>
                        <button type="button" data-place-type="bar" class="place-type-btn py-2 px-2 text-[10px] font-bold rounded-lg border min-h-[44px] flex flex-col items-center justify-center gap-0.5"><x-planner-icon name="drumstick" class="w-3.5 h-3.5" /> Bar</button>
                    </div>
                </div>
                <div class="col-span-2">
                    <label class="block text-[10px] font-bold text-slate-400 uppercase mb-1">Precio (solo plan)</label>
                    <div class="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 min-h-[44px] focus-within:border-violet-500/50">
                        <span class="text-slate-500 text-sm font-bold">€</span>
                        <input type="number" id="edit-dest-price" inputmode="decimal" step="0.01" min="0" placeholder="Ej. 120"
                            class="w-full bg-transparent text-sm text-white outline-none py-2" />
                    </div>
                </div>
            </div>
            <div class="flex gap-2.5 pt-2 border-t border-slate-800">
                <button type="button" data-close-edit-dest class="flex-1 bg-slate-900 text-slate-300 font-bold py-3 rounded-xl text-sm min-h-[48px]">Cancelar</button>
                <button type="submit" class="flex-1 bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 rounded-xl text-sm min-h-[48px]">✓ Guardar</button>
            </div>
        </form>
    </div>
</div>

<div id="modal-delete-trip" class="hidden fixed inset-0 bg-black/85 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
    <div class="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 text-center">
        <h3 class="font-bold text-lg text-white">¿Eliminar viaje?</h3>
        <p class="text-xs md:text-sm text-slate-400">Se borrará <strong id="delete-trip-name" class="text-slate-200"></strong> y todos sus destinos.</p>
        <div class="flex gap-2.5 pt-3">
            <button type="button" data-close-delete-trip class="flex-1 bg-slate-900 text-slate-300 font-bold py-2.5 rounded-xl text-xs h-11">Cancelar</button>
            <button type="button" id="btn-confirm-delete-trip" class="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl text-xs h-11">Eliminar</button>
        </div>
    </div>
</div>

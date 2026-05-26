<div id="mobile-panel-backdrop" class="hidden lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 bottom-16"></div>

<button type="button" id="mobile-panel-toggle" class="lg:hidden fixed right-4 bottom-20 z-30 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-4 py-3 rounded-full shadow-lg shadow-amber-500/30 flex items-center gap-2 text-xs">
    <x-planner-icon name="route" class="w-4 h-4" />
    Panel
</button>

<aside id="sidebar" class="mobile-panel-closed flex flex-col bg-slate-950 border-slate-800 shadow-2xl shrink-0 z-50 fixed lg:relative inset-x-0 bottom-16 lg:bottom-0 w-full lg:w-[450px] lg:min-w-[450px] max-h-[min(88vh,calc(100dvh-5rem))] lg:max-h-none lg:h-full min-h-0 rounded-t-2xl lg:rounded-none border-t lg:border-t-0 lg:border-r pointer-events-none transition-transform duration-300 ease-out lg:translate-y-0 lg:pointer-events-auto">
    <div class="lg:hidden flex flex-col items-center pt-2 pb-1 shrink-0">
        <div class="w-10 h-1 bg-slate-700 rounded-full"></div>
        <button type="button" id="mobile-panel-close" class="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cerrar panel ▼</button>
    </div>
    <div class="p-4 md:p-6 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 relative shrink-0 text-left">
        <div class="absolute top-2 right-2 flex flex-col items-end gap-1">
            <span class="bg-amber-500/10 text-amber-500 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-500/20 flex items-center gap-1">
                <x-planner-icon name="compass" class="w-3 h-3 animate-spin" /> Viaje Pro <span id="saving-badge"></span>
            </span>
            @auth
                <div class="flex items-center gap-1.5">
                    <span class="text-[10px] text-slate-500 max-w-[120px] truncate" title="{{ auth()->user()->email }}">{{ auth()->user()->name }}</span>
                    <form method="POST" action="{{ route('logout') }}" class="inline">
                        @csrf
                        <button type="submit" class="text-[10px] font-bold text-slate-400 hover:text-rose-400 px-2 py-0.5 rounded border border-slate-700 hover:border-rose-800 transition">Salir</button>
                    </form>
                </div>
            @endauth
        </div>
        <div class="flex items-center gap-2.5 mb-2">
            <div class="p-2 bg-amber-500 text-slate-950 rounded-lg shrink-0">
                <x-planner-icon name="route" class="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
                <h1 class="text-lg md:text-xl font-extrabold tracking-tight text-white lg:bg-gradient-to-r lg:from-white lg:via-amber-200 lg:to-amber-400 lg:bg-clip-text lg:text-transparent">
                    Rutas de Viaje
                </h1>
                <p class="text-[10px] md:text-xs text-slate-400">Diseñador Profesional de Viajes</p>
            </div>
        </div>
    </div>

    <div class="px-4 md:px-6 py-3.5 bg-slate-900 border-b border-slate-800 space-y-3 shrink-0 text-left">
        <div class="flex items-center justify-between">
            <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Viaje Activo</label>
            <div class="flex gap-1.5 flex-wrap justify-end">
                <a href="{{ route('trips.print') }}" id="btn-print-trip" target="_blank" rel="noopener"
                    class="text-[10px] font-bold text-slate-400 hover:text-slate-200 flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded transition min-h-[32px]">
                    🖨 PDF
                </a>
                <button type="button" id="btn-new-trip" class="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1 rounded transition min-h-[32px]">
                    <x-planner-icon name="plus" class="w-3 h-3" /> Nuevo
                </button>
                <button type="button" id="btn-delete-trip" class="hidden text-[10px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-1 rounded transition min-h-[32px]">
                    <x-planner-icon name="trash" class="w-3 h-3" /> Borrar
                </button>
            </div>
        </div>
        <select id="trip-select" class="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm focus:border-amber-500 outline-none cursor-pointer transition"></select>
    </div>

    <div class="px-4 md:px-6 py-3 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
        <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <x-planner-icon name="map-pin" class="w-3.5 h-3.5" />
            </div>
            <div class="min-w-0 text-left">
                <p class="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Origen de Salida:</p>
                <h3 id="origin-name" class="text-xs font-bold text-slate-100 truncate"></h3>
            </div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
            <button type="button" id="btn-edit-origin" title="Modificar origen" class="p-2 bg-slate-800 hover:bg-emerald-950/80 rounded-lg text-slate-300 hover:text-emerald-400 border border-slate-700 hover:border-emerald-800 transition min-h-[38px] min-w-[38px]">
                <x-planner-icon name="edit" class="w-3.5 h-3.5" />
            </button>
            <button type="button" id="btn-focus-origin" title="Centrar en mapa" class="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition min-h-[38px] min-w-[38px]">
                <x-planner-icon name="eye" class="w-3.5 h-3.5" />
            </button>
        </div>
    </div>

    <div class="px-4 md:px-6 py-2.5 bg-slate-900/20 grid grid-cols-3 gap-2 border-b border-slate-800 text-center shrink-0">
        <div class="bg-slate-900/40 p-1.5 rounded-lg border border-slate-800/60">
            <div class="text-[9px] md:text-xs text-slate-400">En Ruta</div>
            <div id="stat-route" class="text-sm md:text-lg font-black text-amber-400">0</div>
        </div>
        <div class="bg-slate-900/40 p-1.5 rounded-lg border border-slate-800/60">
            <div class="text-[9px] md:text-xs text-slate-400">Sugeridos</div>
            <div id="stat-standalone" class="text-sm md:text-lg font-black text-sky-400">0</div>
        </div>
        <div class="bg-slate-900/40 p-1.5 rounded-lg border border-slate-800/60">
            <div class="text-[9px] md:text-xs text-slate-400 font-medium">Puntos</div>
            <div id="stat-total" class="text-sm md:text-lg font-black text-emerald-400">0</div>
        </div>
    </div>

    <div id="desktop-tabs" class="hidden lg:flex border-b border-slate-800 bg-slate-950 shrink-0 overflow-x-auto">
        <button type="button" data-tab-btn="list" data-desktop-tab class="flex-1 min-w-[90px] py-3 text-[10px] font-bold transition flex items-center justify-center gap-1 text-slate-400 hover:text-slate-200">
            <x-planner-icon name="book" class="w-3.5 h-3.5 shrink-0" /> Destinos
        </button>
        <button type="button" data-tab-btn="route" data-desktop-tab role="tab" class="flex-1 min-w-[90px] py-3 text-[10px] font-bold transition flex items-center justify-center gap-1 text-slate-400 hover:text-slate-200">
            <x-planner-icon name="route" class="w-3.5 h-3.5 shrink-0" /> Ruta
        </button>
        <button type="button" data-tab-btn="itinerary" data-desktop-tab class="flex-1 min-w-[90px] py-3 text-[10px] font-bold transition flex items-center justify-center gap-1 text-slate-400 hover:text-slate-200">
            <x-planner-icon name="clock" class="w-3.5 h-3.5 shrink-0" /> Itinerario
        </button>
        <button type="button" data-tab-btn="add" data-desktop-tab class="flex-1 min-w-[90px] py-3 text-[10px] font-bold transition flex items-center justify-center gap-1 text-slate-400 hover:text-slate-200">
            <x-planner-icon name="plus" class="w-3.5 h-3.5 shrink-0" /> + Parada
        </button>
        <button type="button" data-tab-btn="presets" data-desktop-tab class="flex-1 min-w-[90px] py-3 text-[10px] font-bold transition flex items-center justify-center gap-1 text-slate-400 hover:text-slate-200">
            <x-planner-icon name="image" class="w-3.5 h-3.5 shrink-0" /> Galería
        </button>
    </div>

    <div id="sidebar-content" class="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-6">
        <div id="panel-list" class="space-y-6">
            <div class="space-y-3">
                <div class="flex items-center justify-between border-b border-slate-800 pb-1.5 text-left">
                    <h3 class="text-xs font-black tracking-wider text-amber-500 uppercase flex items-center gap-1.5">
                        <x-planner-icon name="route" class="w-4 h-4" /> Ruta de Viaje (<span id="route-count">0</span>)
                    </h3>
                    <span class="text-[10px] text-slate-500 hidden sm:inline">⋮⋮ o ▲▼ · Tramos en pestaña Ruta</span>
                </div>
                <div id="route-list" class="space-y-2.5"></div>
            </div>
            <div class="space-y-3 pt-2">
                <div class="flex items-center justify-between border-b border-slate-800 pb-1.5 text-left">
                    <h3 class="text-xs font-black tracking-wider text-sky-400 uppercase flex items-center gap-1.5">
                        <x-planner-icon name="map" class="w-4 h-4" /> Puntos Libres o Sugeridos (<span id="standalone-count">0</span>)
                    </h3>
                    <span class="text-[10px] text-slate-500">Solo chinchetas</span>
                </div>
                <div id="standalone-list" class="space-y-2.5"></div>
            </div>
        </div>

        <div id="panel-route" role="tabpanel" hidden class="hidden space-y-4 text-left">
            @include('planner.partials.panel-route')
        </div>

        <div id="panel-itinerary" class="hidden space-y-4 text-left">
            @include('planner.partials.panel-itinerary')
        </div>

        <div id="panel-add" class="hidden space-y-4 text-left">
            @include('planner.partials.form-add')
        </div>

        <div id="panel-presets" class="hidden space-y-4 text-left">
            <div>
                <h3 class="text-sm font-bold tracking-wider text-slate-400 uppercase mb-1">Galería de viaje</h3>
                <p class="text-xs text-slate-500">Pulsa sobre una foto representativa para aplicarla automáticamente a tu próximo destino.</p>
            </div>
            <div id="gallery-grid" class="grid grid-cols-2 gap-3"></div>
        </div>
    </div>

    <div class="hidden lg:flex p-4 border-t border-slate-900 bg-slate-950 text-center text-[11px] text-slate-600 items-center justify-center gap-1 shrink-0">
        <span>Rutas de Viaje 2026</span>
        <x-planner-icon name="award" class="w-3.5 h-3.5 text-amber-500" />
    </div>
</aside>

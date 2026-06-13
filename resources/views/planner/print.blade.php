<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Plan de viaje — {{ $trip['name'] ?? 'Rutas de Viaje' }}</title>
    <style>
        :root {
            --bg: #f1f5f9;
            --paper: #ffffff;
            --ink: #0f172a;
            --muted: #64748b;
            --violet: #7c3aed;
            --violet-soft: #ede9fe;
            --amber: #d97706;
            --amber-soft: #fffbeb;
            --emerald: #059669;
            --emerald-soft: #ecfdf5;
            --sky: #0284c7;
            --sky-soft: #e0f2fe;
            --border: #e2e8f0;
            --radius: 12px;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
            font-size: 14px;
            line-height: 1.55;
            color: var(--ink);
            background: var(--bg);
        }
        .no-print {
            position: sticky;
            top: 0;
            z-index: 50;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1.25rem;
            background: #0f172a;
            color: #e2e8f0;
            border-bottom: 1px solid #334155;
        }
        .no-print select, .no-print button {
            font: inherit;
            padding: 0.45rem 0.85rem;
            border-radius: 8px;
            border: 1px solid #475569;
            background: #1e293b;
            color: #f8fafc;
        }
        .no-print button {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            border: none;
            font-weight: 700;
            color: #0f172a;
            cursor: pointer;
        }
        .doc {
            max-width: 920px;
            margin: 0 auto;
            padding: 1.25rem 1.25rem 2.5rem;
        }
        .hero {
            background: linear-gradient(135deg, #1e1b4b 0%, #312e81 45%, #4c1d95 100%);
            color: #f8fafc;
            border-radius: calc(var(--radius) + 4px);
            padding: 1.75rem 1.5rem;
            margin-bottom: 1.25rem;
            box-shadow: 0 12px 40px rgba(49, 46, 129, 0.25);
        }
        .hero__eyebrow {
            font-size: 0.7rem;
            font-weight: 800;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #c4b5fd;
            margin: 0 0 0.35rem;
        }
        .hero h1 {
            margin: 0;
            font-size: 1.75rem;
            font-weight: 800;
            line-height: 1.2;
        }
        .hero__sub {
            margin: 0.5rem 0 0;
            color: #cbd5e1;
            font-size: 0.9rem;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 0.65rem;
            margin-top: 1.25rem;
        }
        .stat {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 10px;
            padding: 0.65rem 0.75rem;
            text-align: center;
        }
        .stat__val {
            display: block;
            font-size: 1.35rem;
            font-weight: 800;
            color: #fde68a;
        }
        .stat__lbl {
            font-size: 0.65rem;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #c4b5fd;
        }
        .section {
            background: var(--paper);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 1.15rem 1.25rem;
            margin-bottom: 1rem;
            box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
            break-inside: avoid;
        }
        .section--plan { border-left: 4px solid var(--violet); }
        .section--route { border-left: 4px solid var(--amber); }
        .section--free { border-left: 4px solid var(--sky); }
        .section--segments { border-left: 4px solid var(--emerald); }
        .section__head {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 0.75rem;
            margin-bottom: 0.85rem;
        }
        .section__title {
            margin: 0;
            font-size: 1.1rem;
            font-weight: 800;
        }
        .section--plan .section__title { color: var(--violet); }
        .section--route .section__title { color: var(--amber); }
        .section--free .section__title { color: var(--sky); }
        .section--segments .section__title { color: var(--emerald); }
        .section__intro {
            margin: 0 0 0.75rem;
            font-size: 0.85rem;
            color: var(--muted);
        }
        .overview-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.75rem;
        }
        @media (max-width: 560px) {
            .overview-grid { grid-template-columns: 1fr; }
        }
        .overview-item {
            background: #f8fafc;
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 0.75rem 0.85rem;
        }
        .overview-item__label {
            font-size: 0.65rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--muted);
            margin: 0 0 0.25rem;
        }
        .overview-item__value {
            margin: 0;
            font-weight: 700;
            font-size: 0.95rem;
        }
        .day-block {
            border: 1px solid var(--border);
            border-radius: 10px;
            overflow: hidden;
            margin-bottom: 0.85rem;
            background: #fafafa;
        }
        .day-block:last-child { margin-bottom: 0; }
        .day-block__head {
            background: linear-gradient(90deg, var(--violet-soft), #f5f3ff);
            padding: 0.75rem 1rem;
            border-bottom: 1px solid var(--border);
        }
        .day-block__title {
            margin: 0;
            font-size: 1rem;
            font-weight: 800;
            color: #5b21b6;
        }
        .day-block__date {
            font-size: 0.8rem;
            color: var(--muted);
            margin-top: 0.15rem;
        }
        .day-block__notes {
            margin: 0.5rem 0 0;
            font-size: 0.85rem;
            color: #475569;
            font-style: italic;
        }
        .day-block__body { padding: 0.65rem 0.85rem; }
        .day-block__total {
            text-align: right;
            font-size: 0.85rem;
            font-weight: 800;
            color: var(--violet);
            padding: 0.5rem 0.85rem 0.75rem;
            border-top: 1px dashed var(--border);
        }
        .segment-list { list-style: none; margin: 0; padding: 0; }
        .segment-item {
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
            padding: 0.65rem 0;
            border-top: 1px solid #f1f5f9;
        }
        .segment-item:first-child { border-top: none; padding-top: 0; }
        .segment-item__num {
            flex-shrink: 0;
            width: 1.75rem;
            height: 1.75rem;
            border-radius: 999px;
            background: var(--emerald-soft);
            color: var(--emerald);
            font-size: 0.75rem;
            font-weight: 800;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .segment-item__path {
            margin: 0;
            font-weight: 600;
            font-size: 0.9rem;
        }
        .segment-item__date {
            margin: 0 0 0.15rem;
            font-size: 0.75rem;
            font-weight: 700;
            color: var(--violet, #7c3aed);
        }
        .segment-item__hint {
            margin: 0.15rem 0 0;
            font-size: 0.75rem;
            color: var(--muted);
        }
        .empty {
            font-size: 0.85rem;
            color: var(--muted);
            font-style: italic;
            margin: 0;
        }
        .stop-card {
            display: flex;
            gap: 0.85rem;
            padding: 0.75rem 0;
            border-top: 1px solid #f1f5f9;
        }
        .stop-card:first-child { border-top: none; padding-top: 0; }
        .stop-card__thumb {
            width: 56px;
            height: 56px;
            object-fit: cover;
            border-radius: 10px;
            flex-shrink: 0;
            border: 2px solid var(--border);
        }
        .stop-card__thumb--note {
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            background: var(--violet-soft);
            border-color: #c4b5fd;
        }
        .stop-card__body { flex: 1; min-width: 0; }
        .stop-card__head { margin-bottom: 0.35rem; }
        .stop-card__title {
            margin: 0;
            font-size: 0.95rem;
            font-weight: 800;
            line-height: 1.3;
        }
        .stop-card__num {
            color: var(--amber);
            margin-right: 0.25rem;
        }
        .stop-card__badges {
            display: flex;
            flex-wrap: wrap;
            gap: 0.3rem;
            margin-top: 0.35rem;
        }
        .badge {
            font-size: 0.62rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            padding: 0.15rem 0.45rem;
            border-radius: 6px;
        }
        .badge--reserved { background: var(--emerald-soft); color: var(--emerald); }
        .badge--favorite { background: var(--amber-soft); color: var(--amber); }
        .badge--free { background: var(--sky-soft); color: var(--sky); }
        .badge--note { background: var(--violet-soft); color: var(--violet); }
        .badge--type { background: #f1f5f9; color: #475569; text-transform: none; letter-spacing: 0; font-size: 0.7rem; }
        .stop-card__meta {
            margin: 0.2rem 0 0;
            font-size: 0.8rem;
            color: var(--muted);
        }
        .stop-card__meta--day { color: var(--violet); font-weight: 700; }
        .stop-card__meta--route { color: var(--amber); font-weight: 600; }
        .stop-card__meta a { color: var(--sky); text-decoration: none; }
        .stop-card__desc {
            margin: 0.35rem 0 0;
            font-size: 0.85rem;
            color: #475569;
        }
        .stop-card__price {
            margin: 0.4rem 0 0;
            font-size: 0.9rem;
            font-weight: 800;
            color: var(--violet);
        }
        .footer-note {
            text-align: center;
            font-size: 0.75rem;
            color: var(--muted);
            margin-top: 1.5rem;
        }
        @media print {
            body { background: #fff; }
            .no-print { display: none !important; }
            .doc { padding: 0; max-width: none; }
            .hero { box-shadow: none; }
            .section { box-shadow: none; }
            a { color: var(--sky); text-decoration: underline; }
        }
    </style>
</head>
<body>
    <div class="no-print">
        @if(count($trips) > 1)
            <form method="get">
                <label>Viaje:</label>
                <select name="trip" onchange="this.form.submit()">
                    @foreach($trips as $t)
                        <option value="{{ $t['id'] }}" @selected(($trip['id'] ?? '') === $t['id'])>{{ $t['name'] }}</option>
                    @endforeach
                </select>
            </form>
        @endif
        <button type="button" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
    </div>

    @if($trip && $print)
        <div class="doc">
            <header class="hero">
                <p class="hero__eyebrow">Planificación completa del viaje</p>
                <h1>{{ $trip['name'] }}</h1>
                <p class="hero__sub">
                    Generado para {{ $user->name }} · {{ now()->translatedFormat('d \d\e F \d\e Y') }}
                </p>
                <div class="stats">
                    <div class="stat">
                        <span class="stat__val">{{ $print['stats']['days'] }}</span>
                        <span class="stat__lbl">Días plan</span>
                    </div>
                    <div class="stat">
                        <span class="stat__val">{{ $print['stats']['destinations'] }}</span>
                        <span class="stat__lbl">Paradas</span>
                    </div>
                    <div class="stat">
                        <span class="stat__val">{{ $print['stats']['routeStops'] }}</span>
                        <span class="stat__lbl">En ruta</span>
                    </div>
                    <div class="stat">
                        <span class="stat__val">{{ $print['stats']['freeStops'] }}</span>
                        <span class="stat__lbl">Libres</span>
                    </div>
                    <div class="stat">
                        <span class="stat__val">{{ $print['stats']['segments'] }}</span>
                        <span class="stat__lbl">Tramos</span>
                    </div>
                    @if($print['stats']['totalBudget'] > 0)
                        <div class="stat">
                            <span class="stat__val">{{ number_format($print['stats']['totalBudget'], 0, ',', '.') }} €</span>
                            <span class="stat__lbl">Presupuesto</span>
                        </div>
                    @endif
                </div>
            </header>

            <section class="section">
                <div class="section__head">
                    <h2 class="section__title" style="color:var(--ink);">Resumen del viaje</h2>
                </div>
                <div class="overview-grid">
                    <div class="overview-item">
                        <p class="overview-item__label">Origen</p>
                        <p class="overview-item__value">🟢 {{ $print['origin']['name'] }}</p>
                    </div>
                    <div class="overview-item">
                        <p class="overview-item__label">Punto final</p>
                        <p class="overview-item__value">🏁 {{ $print['endingLabel'] }}</p>
                    </div>
                </div>
            </section>

            <section class="section section--plan">
                <div class="section__head">
                    <h2 class="section__title">Plan por días</h2>
                </div>
                <p class="section__intro">Itinerario día a día con todas las paradas asignadas, notas y presupuesto.</p>
                @forelse($print['daysPlan'] as $dayPlan)
                    <div class="day-block">
                        <div class="day-block__head">
                            <h3 class="day-block__title">{{ $dayPlan['day']['title'] }}</h3>
                            <div class="day-block__date">{{ $dayPlan['dateLabel'] }}</div>
                            @if($dayPlan['day']['notes'])
                                <p class="day-block__notes">{{ $dayPlan['day']['notes'] }}</p>
                            @endif
                        </div>
                        <div class="day-block__body">
                            @forelse($dayPlan['stops'] as $stop)
                                @include('planner.partials.print-stop', ['stop' => $stop, 'dayTitle' => null])
                            @empty
                                <p class="empty">Sin paradas asignadas a este día.</p>
                            @endforelse
                        </div>
                        @if($dayPlan['total'] > 0)
                            <p class="day-block__total">Total del día: {{ number_format($dayPlan['total'], 2, ',', '.') }} €</p>
                        @endif
                    </div>
                @empty
                    <p class="empty">Aún no hay días en el plan. Crea días en la pestaña Plan por días.</p>
                @endforelse
            </section>

            @if(($print['routePlans'] ?? collect())->count() > 1)
                @foreach($print['routePlans'] as $plan)
                    @if($plan['segments']->isNotEmpty())
                        <section class="section section--segments">
                            <div class="section__head">
                                <h2 class="section__title">{{ $plan['name'] }}{{ $plan['isActive'] ? ' (activa)' : '' }}</h2>
                            </div>
                            <ul class="segment-list">
                                @foreach($plan['segments'] as $seg)
                                    <li class="segment-item">
                                        <span class="segment-item__num">{{ $seg['num'] }}</span>
                                        <div>
                                            @if(!empty($seg['dateLabel']))
                                                <p class="segment-item__date">{{ $seg['dateLabel'] }}</p>
                                            @endif
                                            <p class="segment-item__path">{{ $seg['from'] }} → {{ $seg['to'] }}</p>
                                            @if($seg['sameRoad'])
                                                <p class="segment-item__hint">↺ Misma vía de ida y vuelta</p>
                                            @endif
                                        </div>
                                    </li>
                                @endforeach
                            </ul>
                        </section>
                    @endif
                @endforeach
            @elseif($print['segments']->isNotEmpty())
                <section class="section section--segments">
                    <div class="section__head">
                        <h2 class="section__title">Tramos de la ruta</h2>
                    </div>
                    <p class="section__intro">Recorrido en coche definido tramo a tramo en el planificador.</p>
                    <ul class="segment-list">
                        @foreach($print['segments'] as $seg)
                            <li class="segment-item">
                                <span class="segment-item__num">{{ $seg['num'] }}</span>
                                <div>
                                    @if(!empty($seg['dateLabel']))
                                        <p class="segment-item__date">{{ $seg['dateLabel'] }}</p>
                                    @endif
                                    <p class="segment-item__path">{{ $seg['from'] }} → {{ $seg['to'] }}</p>
                                    @if($seg['sameRoad'])
                                        <p class="segment-item__hint">↺ Misma vía de ida y vuelta</p>
                                    @endif
                                </div>
                            </li>
                        @endforeach
                    </ul>
                </section>
            @endif

            @if($print['routeDests']->isNotEmpty())
                <section class="section section--route">
                    <div class="section__head">
                        <h2 class="section__title">Paradas en la ruta</h2>
                    </div>
                    <p class="section__intro">Puntos conectados al recorrido en coche, en orden.</p>
                    @foreach($print['routeDests'] as $i => $dest)
                        @include('planner.partials.print-stop', [
                            'stop' => $dest,
                            'index' => $i + 1,
                            'dayTitle' => $print['daysById']->get($dest['dayId'] ?? '')['title'] ?? null,
                        ])
                    @endforeach
                </section>
            @endif

            @if($print['freeStops']->isNotEmpty())
                <section class="section section--free">
                    <div class="section__head">
                        <h2 class="section__title">Paradas libres</h2>
                    </div>
                    <p class="section__intro">
                        Puntos fuera de la ruta en coche ({{ $print['freeStops']->count() }}): exploración, POI y notas sin tramo.
                    </p>
                    @foreach($print['freeStops'] as $stop)
                        @include('planner.partials.print-stop', [
                            'stop' => $stop,
                            'dayTitle' => $print['daysById']->get($stop['dayId'] ?? '')['title'] ?? null,
                        ])
                    @endforeach
                </section>
            @endif

            @if($print['unassigned']->isNotEmpty())
                <section class="section">
                    <div class="section__head">
                        <h2 class="section__title" style="color:var(--muted);">Sin día asignado</h2>
                    </div>
                    <p class="section__intro">Paradas que aún no están vinculadas a un día del plan.</p>
                    @foreach($print['unassigned'] as $stop)
                        @include('planner.partials.print-stop', ['stop' => $stop, 'dayTitle' => null])
                    @endforeach
                </section>
            @endif

            <p class="footer-note">Rutas de Viaje · Documento generado automáticamente desde tu planificación</p>
        </div>
    @else
        <div class="doc">
            <p class="empty">No hay viajes para imprimir.</p>
        </div>
    @endif
</body>
</html>

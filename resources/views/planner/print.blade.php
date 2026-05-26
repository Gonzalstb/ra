<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Itinerario — {{ $trip['name'] ?? 'Rutas de Viaje' }}</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: system-ui, sans-serif; color: #1e293b; margin: 0; padding: 1.5rem; line-height: 1.5; }
        h1 { font-size: 1.5rem; margin: 0 0 0.25rem; }
        .meta { color: #64748b; font-size: 0.875rem; margin-bottom: 1.5rem; }
        .trip-select { margin-bottom: 1rem; }
        .day { break-inside: avoid; margin-bottom: 1.5rem; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; }
        .day h2 { font-size: 1.1rem; margin: 0 0 0.5rem; color: #6d28d9; }
        .day-date { font-size: 0.8rem; color: #64748b; }
        .notes { font-size: 0.85rem; color: #475569; margin: 0.5rem 0; font-style: italic; }
        .stop { display: flex; gap: 0.75rem; padding: 0.5rem 0; border-top: 1px solid #f1f5f9; }
        .stop img { width: 48px; height: 48px; object-fit: cover; border-radius: 6px; }
        .stop h3 { margin: 0; font-size: 0.95rem; }
        .stop p { margin: 0.15rem 0 0; font-size: 0.8rem; color: #64748b; }
        .duration { font-size: 0.75rem; color: #b45309; font-weight: 600; }
        .reserved { font-size: 0.7rem; color: #047857; font-weight: 700; }
        .price { font-size: 0.8rem; color: #6d28d9; font-weight: 700; }
        .day-total { font-size: 0.8rem; color: #6d28d9; font-weight: 700; text-align: right; margin-top: 0.5rem; }
        .route-section { margin-top: 2rem; }
        .route-section h2 { font-size: 1.1rem; color: #b45309; }
        .no-print { margin-bottom: 1rem; }
        @media print {
            .no-print { display: none !important; }
            body { padding: 0.5rem; }
        }
    </style>
</head>
<body>
    <div class="no-print">
        @if(count($trips) > 1)
            <form method="get" class="trip-select">
                <label>Viaje: </label>
                <select name="trip" onchange="this.form.submit()">
                    @foreach($trips as $t)
                        <option value="{{ $t['id'] }}" @selected(($trip['id'] ?? '') === $t['id'])>{{ $t['name'] }}</option>
                    @endforeach
                </select>
            </form>
        @endif
        <button type="button" onclick="window.print()">Imprimir / Guardar PDF</button>
    </div>

    @if($trip)
        <h1>{{ $trip['name'] }}</h1>
        <p class="meta">Origen: {{ $trip['startingPoint']['name'] }} · {{ auth()->user()->name }}</p>

        @php
            $routeDests = collect($trip['destinations'])->filter(fn ($d) => $d['inRoute'])->values();
        @endphp

        @foreach($trip['days'] as $dayIndex => $day)
            @php
                $dayStops = collect($trip['destinations'])->filter(fn ($d) => ($d['dayId'] ?? null) === $day['id']);
                $orderedStops = $dayStops->sortBy(fn ($d) => $routeDests->search(fn ($r) => $r['id'] === $d['id']) ?: 999)->values();
            @endphp
            <section class="day">
                <h2>{{ $day['title'] }}</h2>
                @php
                    $dateLabel = $day['date'] ?? '';
                    $dateEnd = $day['dateEnd'] ?? '';
                    if ($dateLabel && $dateEnd && $dateEnd !== $dateLabel) {
                        $dateLabel = $dateLabel . ' – ' . $dateEnd;
                    }
                @endphp
                @if($dateLabel)
                    <div class="day-date">{{ $dateLabel }}</div>
                @else
                    <div class="day-date">Día {{ $dayIndex + 1 }}</div>
                @endif
                @if($day['notes'])
                    <p class="notes">{{ $day['notes'] }}</p>
                @endif
                @forelse($orderedStops as $stop)
                    <div class="stop">
                        @if(!empty($stop['isTextOnly']))
                            <div style="width:48px;height:48px;display:flex;align-items:center;justify-content:center;font-size:1.25rem;background:#f5f3ff;border-radius:6px;">📝</div>
                        @else
                            <img src="{{ $stop['photoUrl'] }}" alt="">
                        @endif
                        <div>
                            <h3>{{ $stop['name'] }}@if(!empty($stop['isTextOnly'])) <span class="reserved" style="color:#6d28d9;">Nota</span>@endif @if(!empty($stop['isReserved'])) <span class="reserved">✓ Reservado</span>@endif</h3>
                            <p>{{ $stop['description'] }}</p>
                            @if($stop['inRoute'])
                                <span class="duration">⏱ {{ $stop['duration'] }}</span>
                            @endif
                            @if(!empty($stop['price']))
                                <span class="price">{{ number_format((float) $stop['price'], 2, ',', '.') }} €</span>
                            @endif
                        </div>
                    </div>
                @empty
                    <p style="font-size:0.85rem;color:#94a3b8;">Sin paradas asignadas.</p>
                @endforelse
                @php $dayTotal = $orderedStops->sum(fn ($s) => (float) ($s['price'] ?? 0)); @endphp
                @if($dayTotal > 0)
                    <p class="day-total">Total día: {{ number_format($dayTotal, 2, ',', '.') }} €</p>
                @endif
            </section>
        @endforeach

        @if($routeDests->isNotEmpty())
            <section class="route-section">
                <h2>Ruta completa</h2>
                <p class="meta">Desde {{ $trip['startingPoint']['name'] }}</p>
                @foreach($routeDests as $i => $dest)
                    <div class="stop">
                        <img src="{{ $dest['photoUrl'] }}" alt="">
                        <div>
                            <h3>#{{ $i + 1 }} {{ $dest['name'] }}</h3>
                            <span class="duration">{{ $dest['duration'] }} · {{ $dest['isRoundTrip'] ? 'Ida/Vuelta' : 'Solo ida' }}</span>
                        </div>
                    </div>
                @endforeach
            </section>
        @endif
    @else
        <p>No hay viajes para imprimir.</p>
    @endif
</body>
</html>

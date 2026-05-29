@php
    $placeType = match (true) {
        ! empty($stop['isWinery']) => '🍷 Bodega',
        ! empty($stop['isHotel']) => '🛏️ Hotel',
        ! empty($stop['isBar']) => '🍖 Bar / comida',
        default => null,
    };
    $description = preg_replace('/^\[(sin-mapa|bodega|hotel|bar)\]\s*/', '', $stop['description'] ?? '');
    $siteUrl = trim($stop['siteUrl'] ?? '');
    if ($siteUrl !== '' && ! preg_match('#^https?://#i', $siteUrl)) {
        $siteUrl = 'https://'.$siteUrl;
    }
    $dayTitle = $dayTitle ?? null;
@endphp
<article class="stop-card">
    @if(!empty($stop['isTextOnly']))
        <div class="stop-card__thumb stop-card__thumb--note">📝</div>
    @else
        <img src="{{ $stop['photoUrl'] }}" alt="" class="stop-card__thumb">
    @endif
    <div class="stop-card__body">
        <header class="stop-card__head">
            <h3 class="stop-card__title">
                @if(!empty($index))
                    <span class="stop-card__num">#{{ $index }}</span>
                @endif
                {{ $stop['name'] }}
            </h3>
            <div class="stop-card__badges">
                @if(!empty($stop['isTextOnly']))
                    <span class="badge badge--note">Sin mapa</span>
                @endif
                @if(!empty($stop['isReserved']))
                    <span class="badge badge--reserved">Reservado</span>
                @endif
                @if(!empty($stop['isFavorite']))
                    <span class="badge badge--favorite">★ Favorito</span>
                @endif
                @if(empty($stop['inRoute']))
                    <span class="badge badge--free">Parada libre</span>
                @endif
                @if($placeType)
                    <span class="badge badge--type">{{ $placeType }}</span>
                @endif
            </div>
        </header>
        @if($dayTitle)
            <p class="stop-card__meta stop-card__meta--day">📅 {{ $dayTitle }}</p>
        @endif
        @if(!empty($stop['isTextOnly']))
            <p class="stop-card__meta">📍 Sin ubicación en el mapa</p>
        @elseif($stop['lat'] !== null && $stop['lng'] !== null)
            <p class="stop-card__meta">
                📍 {{ number_format((float) $stop['lat'], 5, ',', '') }},
                {{ number_format((float) $stop['lng'], 5, ',', '') }}
            </p>
            <p class="stop-card__meta">
                <a href="https://www.google.com/maps?q={{ $stop['lat'] }},{{ $stop['lng'] }}">Abrir en Google Maps</a>
            </p>
        @endif
        @if($description !== '')
            <p class="stop-card__desc">{{ $description }}</p>
        @endif
        @if($siteUrl !== '')
            <p class="stop-card__meta">
                🌐 <a href="{{ $siteUrl }}">{{ $stop['siteUrl'] }}</a>
            </p>
        @endif
        @if(!empty($stop['inRoute']) && !empty($stop['duration']))
            <p class="stop-card__meta stop-card__meta--route">
                🚗 {{ $stop['duration'] }} · {{ !empty($stop['isRoundTrip']) ? 'Ida y vuelta' : 'Solo ida' }}
            </p>
        @endif
        @if(!empty($stop['price']))
            <p class="stop-card__price">{{ number_format((float) $stop['price'], 2, ',', '.') }} €</p>
        @endif
    </div>
</article>

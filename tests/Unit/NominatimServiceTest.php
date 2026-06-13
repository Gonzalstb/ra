<?php

namespace Tests\Unit;

use App\Services\Geocoding\NominatimService;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class NominatimServiceTest extends TestCase
{
    public function test_resolves_rural_address_by_named_place_and_city(): void
    {
        Http::fake([
            'nominatim.openstreetmap.org/search*' => function ($request) {
                $q = $request->data()['q'] ?? '';

                if ($q === 'Localita Racciano 28 Montenidoli, San Gimignano, Italy'
                    || $q === 'Racciano 28 Montenidoli, San Gimignano, Italy') {
                    return Http::response([]);
                }

                if ($q === 'Montenidoli, San Gimignano, Italy') {
                    return Http::response([[
                        'lat' => '43.4665270',
                        'lon' => '11.0157551',
                        'display_name' => 'Montenidoli, Fugnano, San Gimignano, Siena, Toscana, 53037, Italia',
                    ]]);
                }

                return Http::response([]);
            },
        ]);

        $result = app(NominatimService::class)->search(
            'Localita Racciano 28 Montenidoli - San Gimignano - Italy'
        );

        $this->assertNotNull($result);
        $this->assertEqualsWithDelta(43.466527, $result['lat'], 0.0001);
        $this->assertEqualsWithDelta(11.015755, $result['lng'], 0.0001);
        $this->assertSame('Montenidoli', $result['name']);
    }

    public function test_resolves_google_maps_style_address(): void
    {
        Http::fake([
            'nominatim.openstreetmap.org/search*' => function ($request) {
                $q = $request->data()['q'] ?? '';

                if ($q === 'Montenidoli, 53037 San Gimignano, Italy') {
                    return Http::response([[
                        'lat' => '43.4665270',
                        'lon' => '11.0157551',
                        'display_name' => 'Montenidoli, Fugnano, San Gimignano, Siena, Toscana, 53037, Italia',
                    ]]);
                }

                return Http::response([]);
            },
        ]);

        $result = app(NominatimService::class)->search(
            "Localita' Montenidoli, San Gimignano, Si 53037, 53037 San Gimignano SI, Italia"
        );

        $this->assertNotNull($result);
        $this->assertEqualsWithDelta(43.466527, $result['lat'], 0.0001);
        $this->assertSame('Lugar + código postal y ciudad', $result['matchedLabel']);
    }

    public function test_strips_booking_confirmation_text_from_query(): void
    {
        Http::fake([
            'nominatim.openstreetmap.org/search*' => function ($request) {
                $q = $request->data()['q'] ?? '';

                if ($q === 'Via Tuttiventi, 18, 57021 Campiglia Marittima, Italia') {
                    return Http::response([[
                        'lat' => '43.0583000',
                        'lon' => '10.6156000',
                        'display_name' => 'Via Tuttiventi, Campiglia Marittima, Livorno, Toscana, 57021, Italia',
                    ]]);
                }

                return Http::response([]);
            },
        ]);

        $raw = 'Via Tuttiventi, 18, 57021 Campiglia Marittima, ItaliaDespués de reservar, encontrarás todos los datos del alojamiento con el número de teléfono y la dirección en tu confirmación de la reserva y en tu cuenta.';

        $result = app(NominatimService::class)->search($raw);

        $this->assertNotNull($result);
        $this->assertEqualsWithDelta(43.0583, $result['lat'], 0.0001);
    }
}

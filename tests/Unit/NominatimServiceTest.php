<?php

namespace Tests\Unit;

use App\Services\Geocoding\NominatimService;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class NominatimServiceTest extends TestCase
{
    public function test_search_finds_italian_address_with_localita_prefix(): void
    {
        Http::fake([
            'nominatim.openstreetmap.org/*' => Http::sequence()
                ->push([])
                ->push([[
                    'lat' => '43.123456',
                    'lon' => '10.654321',
                    'display_name' => "Strada Vicinale Sant'Uberto, Castagneto Carducci, Livorno, Toscana, 57020, Italia",
                ]]),
        ]);

        $result = app(NominatimService::class)->search(
            "Località Sant'Uberto 164 57022 Castagneto Carducci (LI) Italy"
        );

        $this->assertNotNull($result);
        $this->assertSame(43.123456, $result['lat']);
        $this->assertSame(10.654321, $result['lng']);
        $this->assertSame('Sin prefijo Località', $result['matchedLabel']);
    }

    public function test_search_uses_structured_lookup_when_free_text_fails(): void
    {
        Http::fake([
            'nominatim.openstreetmap.org/*' => Http::sequence()
                ->push([])
                ->push([])
                ->push([[
                    'lat' => '43.123456',
                    'lon' => '10.654321',
                    'display_name' => "Strada Vicinale Sant'Uberto, Castagneto Carducci, Livorno, Toscana, 57020, Italia",
                ]]),
        ]);

        $result = app(NominatimService::class)->search(
            "Località Sant'Uberto 164 57022 Castagneto Carducci Italy"
        );

        $this->assertNotNull($result);
        $this->assertSame('Búsqueda estructurada', $result['matchedLabel']);
    }
}

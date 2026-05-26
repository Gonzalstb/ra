<?php

namespace App\Services\Airports;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;

class AirportCatalog
{
    private ?array $data = null;

    public function countries(): array
    {
        $catalog = $this->load();

        return $catalog['countries'] ?? [];
    }

    public function airportsForCountry(string $countryCode): array
    {
        $code = strtoupper(trim($countryCode));
        $catalog = $this->load();

        return $catalog['byCountry'][$code] ?? [];
    }

    private function load(): array
    {
        if ($this->data !== null) {
            return $this->data;
        }

        $path = database_path('data/airports_catalog.json');

        if (! File::exists($path)) {
            return $this->data = ['countries' => [], 'byCountry' => []];
        }

        $this->data = Cache::rememberForever('airports_catalog', function () use ($path) {
            $json = File::get($path);
            $decoded = json_decode($json, true);

            return is_array($decoded) ? $decoded : ['countries' => [], 'byCountry' => []];
        });

        return $this->data;
    }
}

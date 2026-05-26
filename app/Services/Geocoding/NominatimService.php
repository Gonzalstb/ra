<?php

namespace App\Services\Geocoding;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class NominatimService
{
    public function search(string $rawQuery, bool $includeLocalita = true): ?array
    {
        $attempts = $this->buildSearchAttempts($rawQuery, $includeLocalita);

        foreach ($attempts as $attempt) {
            if (empty($attempt['query'])) {
                continue;
            }

            $cacheKey = 'geocode:'.md5($attempt['query']);

            $result = Cache::remember($cacheKey, now()->addDay(), function () use ($attempt) {
                $response = Http::withHeaders([
                    'User-Agent' => config('app.name', 'RutasDeViaje').'/1.0',
                    'Accept-Language' => 'es,en',
                ])->timeout(8)->get('https://nominatim.openstreetmap.org/search', [
                    'format' => 'json',
                    'q' => $attempt['query'],
                    'limit' => 1,
                ]);

                if (! $response->successful()) {
                    return null;
                }

                $data = $response->json();
                if (empty($data[0])) {
                    return null;
                }

                $place = $data[0];

                return [
                    'lat' => (float) $place['lat'],
                    'lng' => (float) $place['lon'],
                    'name' => explode(',', $place['display_name'])[0] ?? 'Lugar encontrado',
                    'matchedLabel' => $attempt['label'],
                ];
            });

            if ($result) {
                return $result;
            }
        }

        return null;
    }

    private function buildSearchAttempts(string $query, bool $includeLocalita): array
    {
        $query1 = trim(preg_replace('/\s*\([^)]*\)/', '', str_replace(['‘', '’'], "'", $query)));
        $query2 = trim(preg_replace('/\s+/', ' ', preg_replace('/\b\d{5}\b/', '', $query1)));
        $query3 = trim(preg_replace('/\s+/', ' ', preg_replace('/\b\d+\b/', '', $query2)));
        $attempts = [
            ['query' => $query1, 'label' => 'Dirección completa'],
            ['query' => $query2, 'label' => 'Sin código postal'],
            ['query' => $query3, 'label' => 'Por ciudad y calle'],
        ];

        return array_values(array_filter($attempts, fn ($a) => $a['query'] !== ''));
    }
}

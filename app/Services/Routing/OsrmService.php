<?php

namespace App\Services\Routing;

use Illuminate\Support\Facades\Http;

class OsrmService
{
    private string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = config('services.osrm.url', 'https://router.project-osrm.org');
    }

    /**
     * @param  array<int, array{lat: float, lng: float}>  $waypoints
     */
    public function routeTrip(array $waypoints): ?array
    {
        if (count($waypoints) < 2) {
            return null;
        }

        $coordStr = collect($waypoints)
            ->map(fn (array $p) => ((float) $p['lng']).','.((float) $p['lat']))
            ->implode(';');

        $url = sprintf('%s/route/v1/driving/%s', rtrim($this->baseUrl, '/'), $coordStr);

        $response = Http::timeout(20)
            ->retry(2, 300)
            ->get($url, [
                'overview' => 'full',
                'geometries' => 'geojson',
                'steps' => 'false',
            ]);

        if (! $response->successful()) {
            return null;
        }

        $route = $response->json('routes.0');
        if (! $route) {
            return null;
        }

        $legs = $route['legs'] ?? [];

        return [
            'durationMin' => round(($route['duration'] ?? 0) / 60, 1),
            'distanceKm' => round(($route['distance'] ?? 0) / 1000, 1),
            'geometry' => $route['geometry']['coordinates'] ?? [],
            'legs' => array_map(fn (array $leg) => $this->formatLeg($leg), $legs),
        ];
    }

    public function routeLeg(float $fromLat, float $fromLng, float $toLat, float $toLng): ?array
    {
        $result = $this->routeTrip([
            ['lat' => $fromLat, 'lng' => $fromLng],
            ['lat' => $toLat, 'lng' => $toLng],
        ]);

        if (! $result) {
            return null;
        }

        $leg = $result['legs'][0] ?? null;

        return [
            'durationMin' => $leg['durationMin'] ?? $result['durationMin'],
            'durationFormatted' => $leg['durationFormatted'] ?? $this->formatDuration($result['durationMin']),
            'distanceKm' => $leg['distanceKm'] ?? $result['distanceKm'],
            'geometry' => $result['geometry'],
        ];
    }

    private function formatLeg(array $leg): array
    {
        $durationMin = ($leg['duration'] ?? 0) / 60;

        return [
            'durationMin' => round($durationMin, 1),
            'durationFormatted' => $this->formatDuration($durationMin),
            'distanceKm' => round(($leg['distance'] ?? 0) / 1000, 1),
        ];
    }

    private function formatDuration(float $minutes): string
    {
        $m = (int) round($minutes);
        if ($m < 60) {
            return "{$m} min";
        }
        $h = intdiv($m, 60);
        $rest = $m % 60;

        return $rest > 0 ? "{$h}h {$rest}m" : "{$h}h";
    }
}

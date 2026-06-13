<?php

namespace App\Services\Trip;

class RoutePlanHelper
{
    /** @return list<array{id: string, name: string, segments: list<array<string, mixed>>}> */
    public static function normalizeFromTrip(?array $routePlans, ?array $routeSegments, ?string $activeId): array
    {
        if (is_array($routePlans) && $routePlans !== []) {
            return array_values($routePlans);
        }

        $segments = is_array($routeSegments) ? $routeSegments : [];

        return [
            [
                'id' => 'rp-1',
                'name' => 'Ruta 1',
                'segments' => $segments,
            ],
        ];
    }

    public static function activePlanId(array $routePlans, ?string $activeId): string
    {
        if ($activeId && collect($routePlans)->contains(fn (array $plan) => ($plan['id'] ?? null) === $activeId)) {
            return $activeId;
        }

        return (string) ($routePlans[0]['id'] ?? 'rp-1');
    }

    /** @return list<array<string, mixed>> */
    public static function activeSegments(array $routePlans, ?string $activeId): array
    {
        $id = self::activePlanId($routePlans, $activeId);
        $plan = collect($routePlans)->first(fn (array $plan) => ($plan['id'] ?? null) === $id);

        return is_array($plan['segments'] ?? null) ? $plan['segments'] : [];
    }
}

<?php

namespace App\Services\Trip;

class RoutePlanHelper
{
    /** @return list<array{id: string, name: string, segments: list<array<string, mixed>>}> */
    public static function normalizeFromTrip(?array $routePlans, ?array $routeSegments, ?string $activeId): array
    {
        $legacySegments = is_array($routeSegments) ? $routeSegments : [];

        if (is_array($routePlans) && $routePlans !== []) {
            $plans = array_values($routePlans);
            $activePlanId = self::activePlanId($plans, $activeId);
            $activeIndex = null;

            foreach ($plans as $index => $plan) {
                if (($plan['id'] ?? null) === $activePlanId) {
                    $activeIndex = $index;
                    break;
                }
            }

            $anyHasSegments = collect($plans)->contains(
                fn (array $plan) => is_array($plan['segments'] ?? null) && ($plan['segments'] ?? []) !== []
            );

            if (! $anyHasSegments && $legacySegments !== []) {
                $plans[0]['segments'] = $legacySegments;

                return $plans;
            }

            if ($activeIndex !== null && ($plans[$activeIndex]['segments'] ?? []) === [] && $legacySegments !== []) {
                $plans[$activeIndex]['segments'] = $legacySegments;

                return $plans;
            }

            return $plans;
        }

        return [
            [
                'id' => 'rp-1',
                'name' => 'Ruta 1',
                'segments' => $legacySegments,
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

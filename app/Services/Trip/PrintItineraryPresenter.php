<?php

namespace App\Services\Trip;

use Illuminate\Support\Collection;

class PrintItineraryPresenter
{
    public function present(array $trip): array
    {
        $allDests = collect($trip['destinations'] ?? []);
        $days = collect($trip['days'] ?? []);
        $daysById = $days->keyBy('id');
        $destsById = $allDests->keyBy('id');

        $routeDests = $allDests->filter(fn (array $d) => ! empty($d['inRoute']))->values();
        $freeStops = $allDests->filter(fn (array $d) => empty($d['inRoute']))->values();
        $unassigned = $allDests->filter(fn (array $d) => empty($d['dayId']))->values();

        $resolveKey = fn (string $key): string => $this->labelForRouteKey($key, $trip, $destsById);

        $routePlans = RoutePlanHelper::normalizeFromTrip(
            $trip['routePlans'] ?? null,
            $trip['routeSegments'] ?? null,
            $trip['activeRoutePlanId'] ?? null,
        );
        $activeRoutePlanId = RoutePlanHelper::activePlanId($routePlans, $trip['activeRoutePlanId'] ?? null);

        $mapSegments = fn (array $planSegments) => collect($planSegments)->values()->map(function (array $seg, int $i) use ($resolveKey, $daysById) {
            $dayId = $seg['dayId'] ?? null;
            $day = $dayId ? $daysById->get($dayId) : null;
            $travelDate = $seg['travelDate'] ?? ($day['date'] ?? null);

            return [
                'num' => $i + 1,
                'from' => $resolveKey($seg['fromKey'] ?? ''),
                'to' => $resolveKey($seg['toKey'] ?? ''),
                'sameRoad' => ! empty($seg['sameRoadAs']),
                'dateLabel' => $this->formatSegmentDateLabel($travelDate, $day),
            ];
        });

        $segments = $mapSegments(RoutePlanHelper::activeSegments($routePlans, $activeRoutePlanId));

        $allRoutePlans = collect($routePlans)->map(function (array $plan) use ($mapSegments, $activeRoutePlanId) {
            return [
                'id' => $plan['id'] ?? '',
                'name' => $plan['name'] ?? 'Ruta',
                'isActive' => ($plan['id'] ?? '') === $activeRoutePlanId,
                'segments' => $mapSegments($plan['segments'] ?? []),
            ];
        });

        $daysPlan = $days->map(function (array $day, int $index) use ($allDests, $routeDests) {
            $dayStops = $allDests
                ->filter(fn (array $d) => ($d['dayId'] ?? null) === $day['id'])
                ->sortBy(fn (array $d) => $routeDests->search(fn (array $r) => $r['id'] === $d['id']) !== false
                    ? $routeDests->search(fn (array $r) => $r['id'] === $d['id'])
                    : 999)
                ->values();

            return [
                'day' => $day,
                'index' => $index + 1,
                'dateLabel' => $this->formatDayDateLabel($day, $index + 1),
                'stops' => $dayStops,
                'total' => $dayStops->sum(fn (array $s) => (float) ($s['price'] ?? 0)),
            ];
        });

        $endingLabel = ($trip['returnToStart'] ?? true) !== false
            ? 'Vuelta al origen ('.($trip['startingPoint']['name'] ?? 'Origen').')'
            : ($trip['endingPoint']['name'] ?? 'Punto final');

        return [
            'trip' => $trip,
            'stats' => [
                'days' => $days->count(),
                'destinations' => $allDests->count(),
                'routeStops' => $routeDests->count(),
                'freeStops' => $freeStops->count(),
                'segments' => $segments->count(),
                'totalBudget' => $allDests->sum(fn (array $d) => (float) ($d['price'] ?? 0)),
            ],
            'origin' => $trip['startingPoint'],
            'endingLabel' => $endingLabel,
            'segments' => $segments,
            'routePlans' => $allRoutePlans,
            'activeRoutePlanName' => collect($routePlans)->firstWhere('id', $activeRoutePlanId)['name'] ?? 'Ruta 1',
            'daysPlan' => $daysPlan,
            'routeDests' => $routeDests,
            'freeStops' => $freeStops,
            'unassigned' => $unassigned,
            'daysById' => $daysById,
        ];
    }

    private function labelForRouteKey(string $key, array $trip, Collection $destsById): string
    {
        $key = strtolower($key);

        if ($key === '' || $key === 'start') {
            return 'Origen: '.($trip['startingPoint']['name'] ?? 'Punto de partida');
        }

        if ($key === 'end') {
            if (($trip['returnToStart'] ?? true) !== false) {
                return 'Final: '.($trip['startingPoint']['name'] ?? 'Origen').' (mismo origen)';
            }

            return 'Final: '.($trip['endingPoint']['name'] ?? 'Punto final');
        }

        if (str_starts_with($key, 'dest:')) {
            $destId = substr($key, 5);
            $dest = $destsById->get($destId);

            return $dest['name'] ?? 'Parada '.$destId;
        }

        if (str_starts_with($key, 'dest::')) {
            $destId = substr($key, 6);
            $dest = $destsById->get($destId);

            return $dest['name'] ?? 'Parada '.$destId;
        }

        return $key;
    }

    private function formatDayDateLabel(array $day, int $fallbackIndex): string
    {
        $start = $day['date'] ?? '';
        $end = $day['dateEnd'] ?? '';

        if ($start && $end && $end !== $start) {
            return $start.' – '.$end;
        }

        if ($start) {
            return $start;
        }

        return 'Día '.$fallbackIndex;
    }

    private function formatSegmentDateLabel(?string $travelDate, ?array $day): ?string
    {
        if ($travelDate) {
            return $travelDate;
        }

        if ($day && ! empty($day['date'])) {
            return (string) $day['date'];
        }

        return null;
    }
}

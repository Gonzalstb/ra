<?php

namespace App\Services\Trip;

use App\Models\Destination;
use App\Models\ItineraryDay;
use App\Models\Trip;
use App\Models\TripActivityLog;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class TripSyncService
{
    public function sync(User $user, array $payload): void
    {
        DB::transaction(function () use ($user, $payload) {
            $deletedIds = collect($payload['deletedTripIds'] ?? []);

            if ($deletedIds->isNotEmpty()) {
                Trip::query()
                    ->where('user_id', $user->id)
                    ->whereIn('id', $deletedIds)
                    ->each(function (Trip $trip) {
                        $trip->destinations()->delete();
                        $trip->itineraryDays()->delete();
                        $trip->delete();
                    });
            }

            foreach ($payload['trips'] as $tripData) {
                $existingTrip = Trip::query()
                    ->where('id', $tripData['id'])
                    ->first();

                if ($existingTrip && ! $this->canAccessTrip($user, $existingTrip)) {
                    continue;
                }

                $attributes = [
                    'name' => $tripData['name'],
                    'starting_point_name' => $tripData['startingPoint']['name'],
                    'starting_point_lat' => $tripData['startingPoint']['lat'],
                    'starting_point_lng' => $tripData['startingPoint']['lng'],
                    'is_active' => $tripData['id'] === $payload['activeTripId'],
                    'return_to_start' => $tripData['returnToStart'] ?? true,
                    'ending_point_name' => ($tripData['returnToStart'] ?? true) || empty($tripData['endingPoint'])
                        ? null
                        : ($tripData['endingPoint']['name'] ?? null),
                    'ending_point_lat' => ($tripData['returnToStart'] ?? true) || empty($tripData['endingPoint'])
                        ? null
                        : ($tripData['endingPoint']['lat'] ?? null),
                    'ending_point_lng' => ($tripData['returnToStart'] ?? true) || empty($tripData['endingPoint'])
                        ? null
                        : ($tripData['endingPoint']['lng'] ?? null),
                    'route_segments' => $tripData['routeSegments'] ?? [],
                ];

                if ($existingTrip) {
                    $beforeDestinations = $existingTrip->destinations()
                        ->get(['id', 'name'])
                        ->map(fn (Destination $dest) => ['id' => $dest->id, 'name' => $dest->name])
                        ->all();
                    $beforeSegments = $existingTrip->route_segments ?? [];

                    $existingTrip->update($attributes);
                    $trip = $existingTrip;
                } else {
                    $trip = Trip::query()->create([
                        'id' => $tripData['id'],
                        'user_id' => $user->id,
                        ...$attributes,
                    ]);

                    $beforeDestinations = [];
                    $beforeSegments = [];
                }

                $this->syncItineraryDays($trip, $tripData['days'] ?? []);
                $this->syncDestinations($trip, $tripData['destinations'] ?? []);
                $this->logTripActivityChanges(
                    $user,
                    $trip,
                    $tripData,
                    $beforeDestinations,
                    $beforeSegments
                );
            }
        });
    }

    private function syncItineraryDays(Trip $trip, array $days): void
    {
        $incomingDayIds = collect($days)->pluck('id');

        ItineraryDay::query()
            ->where('trip_id', $trip->id)
            ->whereNotIn('id', $incomingDayIds)
            ->each(function (ItineraryDay $day) {
                $day->destinations()->update(['day_id' => null]);
                $day->delete();
            });

        foreach ($days as $index => $dayData) {
            ItineraryDay::updateOrCreate(
                ['id' => $dayData['id']],
                [
                    'trip_id' => $trip->id,
                    'title' => $dayData['title'],
                    'date' => ! empty($dayData['date']) ? $dayData['date'] : null,
                    'date_end' => ! empty($dayData['dateEnd']) ? $dayData['dateEnd'] : null,
                    'notes' => $dayData['notes'] ?? '',
                    'sort_order' => $index,
                ]
            );
        }
    }

    private function syncDestinations(Trip $trip, array $destinations): void
    {
        $destinationIds = collect($destinations)->pluck('id');
        $trip->destinations()->whereNotIn('id', $destinationIds)->delete();

        foreach ($destinations as $destIndex => $dest) {
            $dayId = $dest['dayId'] ?? null;
            if ($dayId && ! ItineraryDay::where('id', $dayId)->where('trip_id', $trip->id)->exists()) {
                $dayId = null;
            }

            $isTextOnly = ! empty($dest['isTextOnly']);
            $hasTextOnlyColumn = Schema::hasColumn('destinations', 'is_text_only');
            $lat = $isTextOnly ? null : ($dest['lat'] ?? null);
            $lng = $isTextOnly ? null : ($dest['lng'] ?? null);

            if ($isTextOnly && ! $hasTextOnlyColumn) {
                $lat = $trip->starting_point_lat;
                $lng = $trip->starting_point_lng;
            }

            $description = $dest['description'] ?? '';
            if ($isTextOnly && ! $hasTextOnlyColumn && ! str_starts_with($description, '[sin-mapa]')) {
                $description = '[sin-mapa] '.$description;
            }

            $isWinery = ! empty($dest['isWinery']);
            $hasWineryColumn = Schema::hasColumn('destinations', 'is_winery');
            if ($isWinery && ! $hasWineryColumn && ! str_starts_with($description, '[bodega]')) {
                $description = '[bodega] '.$description;
            } elseif (! $isWinery && ! $hasWineryColumn) {
                $description = preg_replace('/^\[bodega\]\s*/', '', $description) ?? $description;
            }

            $isHotel = ! empty($dest['isHotel']);
            $hasHotelColumn = Schema::hasColumn('destinations', 'is_hotel');
            if ($isHotel && ! $hasHotelColumn && ! str_starts_with($description, '[hotel]')) {
                $description = '[hotel] '.$description;
            } elseif (! $isHotel && ! $hasHotelColumn) {
                $description = preg_replace('/^\[hotel\]\s*/', '', $description) ?? $description;
            }

            $isBar = ! empty($dest['isBar']);
            $hasBarColumn = Schema::hasColumn('destinations', 'is_bar');
            if ($isBar && ! $hasBarColumn && ! str_starts_with($description, '[bar]')) {
                $description = '[bar] '.$description;
            } elseif (! $isBar && ! $hasBarColumn) {
                $description = preg_replace('/^\[bar\]\s*/', '', $description) ?? $description;
            }

            $payload = [
                'trip_id' => $trip->id,
                'day_id' => $dayId,
                'name' => $dest['name'],
                'description' => $description,
                'photo_url' => ! empty($dest['photoUrl'])
                    ? $dest['photoUrl']
                    : 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=100&auto=format&fit=crop&q=80',
                'duration' => $dest['duration'] ?? '1h',
                'is_round_trip' => $dest['isRoundTrip'] ?? false,
                'in_route' => $isTextOnly ? false : ($dest['inRoute'] ?? true),
                'is_reserved' => $dest['isReserved'] ?? false,
                'price' => isset($dest['price']) && $dest['price'] !== '' ? $dest['price'] : null,
                'lat' => $lat,
                'lng' => $lng,
                'sort_order' => $destIndex,
            ];

            if ($hasTextOnlyColumn) {
                $payload['is_text_only'] = $isTextOnly;
            }

            if (Schema::hasColumn('destinations', 'is_winery')) {
                $payload['is_winery'] = $isWinery;
            }

            if (Schema::hasColumn('destinations', 'is_hotel')) {
                $payload['is_hotel'] = $isHotel;
            }

            if (Schema::hasColumn('destinations', 'is_bar')) {
                $payload['is_bar'] = $isBar;
            }

            Destination::updateOrCreate(['id' => $dest['id']], $payload);
        }
    }

    /** @return Collection<int, Trip> */
    public function tripsForUser(User $user): Collection
    {
        return Trip::query()
            ->where(function ($query) use ($user) {
                $query->where('user_id', $user->id)
                    ->orWhereHas('collaborators', function ($collabQuery) use ($user) {
                        $collabQuery->where('users.id', $user->id);
                    });
            })
            ->with(['destinations', 'itineraryDays', 'activityLogs.user'])
            ->orderBy('created_at')
            ->get();
    }

    private function canAccessTrip(User $user, Trip $trip): bool
    {
        if ((int) $trip->user_id === (int) $user->id) {
            return true;
        }

        return $trip->collaborators()
            ->where('users.id', $user->id)
            ->exists();
    }

    private function logTripActivityChanges(
        User $actor,
        Trip $trip,
        array $tripData,
        array $beforeDestinations,
        array $beforeSegments
    ): void {
        $beforeDestMap = collect($beforeDestinations)->keyBy('id');
        $afterDestinations = collect($tripData['destinations'] ?? [])->map(function (array $dest) {
            return [
                'id' => $dest['id'] ?? null,
                'name' => $dest['name'] ?? 'Punto',
            ];
        })->filter(fn (array $dest) => ! empty($dest['id']));
        $afterDestMap = $afterDestinations->keyBy('id');

        $addedDestinations = $afterDestMap->keys()->diff($beforeDestMap->keys());
        foreach ($addedDestinations as $destId) {
            $dest = $afterDestMap->get($destId);
            $this->createActivityLog($trip, $actor, 'point_added', [
                'pointId' => $destId,
                'pointName' => $dest['name'] ?? 'Punto',
            ]);
        }

        $deletedDestinations = $beforeDestMap->keys()->diff($afterDestMap->keys());
        foreach ($deletedDestinations as $destId) {
            $dest = $beforeDestMap->get($destId);
            $this->createActivityLog($trip, $actor, 'point_deleted', [
                'pointId' => $destId,
                'pointName' => $dest['name'] ?? 'Punto',
            ]);
        }

        $beforeSegMap = collect($beforeSegments)->keyBy('id');
        $afterSegments = collect($tripData['routeSegments'] ?? [])
            ->filter(fn (array $segment) => ! empty($segment['id']));
        $afterSegMap = $afterSegments->keyBy('id');

        $addedSegments = $afterSegMap->keys()->diff($beforeSegMap->keys());
        foreach ($addedSegments as $segId) {
            $segment = $afterSegMap->get($segId);
            $this->createActivityLog($trip, $actor, 'segment_added', [
                'segmentId' => $segId,
                'fromKey' => $segment['fromKey'] ?? '',
                'toKey' => $segment['toKey'] ?? '',
                'fromLabel' => $this->labelForRouteKey($segment['fromKey'] ?? '', $tripData, $beforeDestMap),
                'toLabel' => $this->labelForRouteKey($segment['toKey'] ?? '', $tripData, $beforeDestMap),
            ]);
        }

        $deletedSegments = $beforeSegMap->keys()->diff($afterSegMap->keys());
        foreach ($deletedSegments as $segId) {
            $segment = $beforeSegMap->get($segId);
            $this->createActivityLog($trip, $actor, 'segment_deleted', [
                'segmentId' => $segId,
                'fromKey' => $segment['fromKey'] ?? '',
                'toKey' => $segment['toKey'] ?? '',
                'fromLabel' => $this->labelForRouteKey($segment['fromKey'] ?? '', $tripData, $beforeDestMap),
                'toLabel' => $this->labelForRouteKey($segment['toKey'] ?? '', $tripData, $beforeDestMap),
            ]);
        }
    }

    private function labelForRouteKey(string $key, array $tripData, Collection $beforeDestMap): string
    {
        if ($key === 'START') {
            return $tripData['startingPoint']['name'] ?? 'Origen';
        }

        if ($key === 'END') {
            return ($tripData['endingPoint']['name'] ?? null) ?: (($tripData['startingPoint']['name'] ?? 'Origen').' (fin)');
        }

        if (str_starts_with($key, 'DEST::')) {
            $destId = substr($key, strlen('DEST::'));
            $fromAfter = collect($tripData['destinations'] ?? [])
                ->first(fn (array $dest) => ($dest['id'] ?? null) === $destId);
            if ($fromAfter && ! empty($fromAfter['name'])) {
                return (string) $fromAfter['name'];
            }
            $fromBefore = $beforeDestMap->get($destId);
            if ($fromBefore && ! empty($fromBefore['name'])) {
                return (string) $fromBefore['name'];
            }
            return 'Punto '.$destId;
        }

        return $key;
    }

    private function createActivityLog(Trip $trip, User $actor, string $action, array $payload): void
    {
        TripActivityLog::query()->create([
            'trip_id' => $trip->id,
            'user_id' => $actor->id,
            'action' => $action,
            'payload' => $payload,
        ]);
    }
}

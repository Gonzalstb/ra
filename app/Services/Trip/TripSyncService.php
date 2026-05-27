<?php

namespace App\Services\Trip;

use App\Models\Destination;
use App\Models\ItineraryDay;
use App\Models\Trip;
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
                $trip = Trip::updateOrCreate(
                    [
                        'id' => $tripData['id'],
                        'user_id' => $user->id,
                    ],
                    [
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
                    ]
                );

                $this->syncItineraryDays($trip, $tripData['days'] ?? []);
                $this->syncDestinations($trip, $tripData['destinations'] ?? []);
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
            ->where('user_id', $user->id)
            ->with(['destinations', 'itineraryDays'])
            ->orderBy('created_at')
            ->get();
    }
}

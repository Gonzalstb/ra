<?php

namespace App\Services\Trip;

use App\Models\Trip;
use App\Models\User;
use Illuminate\Support\Collection;

class TripQueryService
{
    public function __construct(
        private readonly TripFormatter $formatter,
    ) {}

    public function allForUser(User $user): Collection
    {
        return Trip::query()
            ->where(function ($query) use ($user) {
                $query->where('user_id', $user->id)
                    ->orWhereHas('collaborators', function ($collabQuery) use ($user) {
                        $collabQuery->where('users.id', $user->id);
                    });
            })
            ->with(['destinations', 'itineraryDays', 'user', 'activityLogs.user'])
            ->orderBy('created_at')
            ->get();
    }

    public function toApiPayload(Collection $trips, ?User $viewer = null): array
    {
        return [
            'trips' => $trips->map(function (Trip $trip) use ($viewer) {
                $formatted = $this->formatter->format($trip);
                $isOwner = $viewer ? (int) $trip->user_id === (int) $viewer->id : false;
                return [
                    ...$formatted,
                    'ownerId' => $trip->user_id,
                    'isOwner' => $isOwner,
                    'canShare' => $isOwner,
                ];
            })->values()->all(),
            'activeTripId' => $trips->firstWhere('is_active', true)?->id ?? $trips->first()?->id,
        ];
    }
}

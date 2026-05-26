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
            ->where('user_id', $user->id)
            ->with(['destinations', 'itineraryDays'])
            ->orderBy('created_at')
            ->get();
    }

    public function toApiPayload(Collection $trips): array
    {
        return [
            'trips' => $trips->map(fn (Trip $trip) => $this->formatter->format($trip))->values()->all(),
            'activeTripId' => $trips->firstWhere('is_active', true)?->id ?? $trips->first()?->id,
        ];
    }
}

<?php

namespace App\Services\Trip;

use App\Models\Destination;
use App\Models\ItineraryDay;
use App\Models\Trip;

class TripFormatter
{
    public function format(Trip $trip): array
    {
        return [
            'id' => $trip->id,
            'name' => $trip->name,
            'startingPoint' => [
                'name' => $trip->starting_point_name,
                'lat' => (float) $trip->starting_point_lat,
                'lng' => (float) $trip->starting_point_lng,
            ],
            'returnToStart' => $trip->return_to_start,
            'endingPoint' => $trip->return_to_start || $trip->ending_point_lat === null
                ? null
                : [
                    'name' => $trip->ending_point_name ?? 'Punto final',
                    'lat' => (float) $trip->ending_point_lat,
                    'lng' => (float) $trip->ending_point_lng,
                ],
            'routeSegments' => $trip->route_segments ?? [],
            'days' => $trip->itineraryDays->map(fn (ItineraryDay $day) => $this->formatDay($day))->values()->all(),
            'destinations' => $trip->destinations->map(fn (Destination $d) => $this->formatDestination($d))->values()->all(),
        ];
    }

    public function formatDay(ItineraryDay $day): array
    {
        return [
            'id' => $day->id,
            'title' => $day->title,
            'date' => $day->date?->format('Y-m-d') ?? '',
            'dateEnd' => $day->date_end?->format('Y-m-d') ?? '',
            'notes' => $day->notes ?? '',
        ];
    }

    public function formatDestination(Destination $destination): array
    {
        return [
            'id' => $destination->id,
            'name' => $destination->name,
            'description' => $destination->description ?? '',
            'photoUrl' => $destination->photo_url,
            'duration' => $destination->duration,
            'isRoundTrip' => $destination->is_round_trip,
            'inRoute' => $destination->in_route,
            'isTextOnly' => (bool) ($destination->is_text_only ?? false)
                || str_starts_with($destination->description ?? '', '[sin-mapa]'),
            'isReserved' => $destination->is_reserved,
            'isWinery' => (bool) ($destination->is_winery ?? false)
                || str_starts_with($destination->description ?? '', '[bodega]'),
            'price' => $destination->price !== null ? (float) $destination->price : null,
            'dayId' => $destination->day_id,
            'lat' => $destination->lat !== null ? (float) $destination->lat : null,
            'lng' => $destination->lng !== null ? (float) $destination->lng : null,
        ];
    }
}

<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SyncTripsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'activeTripId' => 'required|string',
            'deletedTripIds' => 'sometimes|array',
            'deletedTripIds.*' => 'string',
            'trips' => 'required|array|min:1',
            'trips.*.id' => 'required|string',
            'trips.*.name' => 'required|string',
            'trips.*.startingPoint' => 'required|array',
            'trips.*.startingPoint.name' => 'required|string',
            'trips.*.startingPoint.lat' => 'required|numeric',
            'trips.*.startingPoint.lng' => 'required|numeric',
            'trips.*.returnToStart' => 'boolean',
            'trips.*.endingPoint' => 'nullable|array',
            'trips.*.endingPoint.name' => 'nullable|string',
            'trips.*.endingPoint.lat' => 'nullable|numeric',
            'trips.*.endingPoint.lng' => 'nullable|numeric',
            'trips.*.routeSegments' => 'present|array',
            'trips.*.routeSegments.*.id' => 'required|string',
            'trips.*.routeSegments.*.fromKey' => 'required|string',
            'trips.*.routeSegments.*.toKey' => 'required|string',
            'trips.*.routeSegments.*.sameRoadAs' => 'nullable|string',
            'trips.*.days' => 'present|array',
            'trips.*.days.*.id' => 'required|string',
            'trips.*.days.*.title' => 'required|string',
            'trips.*.days.*.date' => 'nullable|date_format:Y-m-d',
            'trips.*.days.*.dateEnd' => 'nullable|date_format:Y-m-d',
            'trips.*.days.*.notes' => 'nullable|string',
            'trips.*.destinations' => 'present|array',
            'trips.*.destinations.*.id' => 'required|string',
            'trips.*.destinations.*.dayId' => 'nullable|string',
            'trips.*.destinations.*.name' => 'required|string',
            'trips.*.destinations.*.description' => 'nullable|string',
            'trips.*.destinations.*.photoUrl' => 'nullable|string',
            'trips.*.destinations.*.duration' => 'nullable|string',
            'trips.*.destinations.*.isRoundTrip' => 'boolean',
            'trips.*.destinations.*.inRoute' => 'boolean',
            'trips.*.destinations.*.isTextOnly' => 'boolean',
            'trips.*.destinations.*.isReserved' => 'boolean',
            'trips.*.destinations.*.isWinery' => 'boolean',
            'trips.*.destinations.*.price' => 'nullable|numeric|min:0',
            'trips.*.destinations.*.lat' => 'nullable|numeric',
            'trips.*.destinations.*.lng' => 'nullable|numeric',
        ];
    }
}

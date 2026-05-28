<?php

namespace App\Http\Controllers;

use App\Services\Trip\TripFormatter;
use App\Services\Trip\TripQueryService;
use Illuminate\Http\Request;
use Illuminate\View\View;

class PrintItineraryController extends Controller
{
    public function __invoke(Request $request, TripQueryService $queryService, TripFormatter $formatter): View
    {
        $trips = $queryService->allForUser($request->user());
        $activeTripId = $request->query('trip', $trips->first()?->id);
        $trip = $trips->firstWhere('id', $activeTripId) ?? $trips->first();

        return view('planner.print', [
            'user' => $request->user(),
            'trip' => $trip ? $formatter->format($trip) : null,
            'trips' => $queryService->toApiPayload($trips, $request->user())['trips'],
        ]);
    }
}

<?php

namespace App\Http\Controllers;

use App\Services\Trip\PrintItineraryPresenter;
use App\Services\Trip\TripFormatter;
use App\Services\Trip\TripQueryService;
use Illuminate\Http\Request;
use Illuminate\View\View;

class PrintItineraryController extends Controller
{
    public function __invoke(
        Request $request,
        TripQueryService $queryService,
        TripFormatter $formatter,
        PrintItineraryPresenter $presenter,
    ): View {
        $trips = $queryService->allForUser($request->user());
        $activeTripId = $request->query('trip', $trips->first()?->id);
        $trip = $trips->firstWhere('id', $activeTripId) ?? $trips->first();
        $formatted = $trip ? $formatter->format($trip) : null;

        return view('planner.print', [
            'user' => $request->user(),
            'trip' => $formatted,
            'print' => $formatted ? $presenter->present($formatted) : null,
            'trips' => $queryService->toApiPayload($trips, $request->user())['trips'],
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SyncTripsRequest;
use App\Services\Trip\TripQueryService;
use App\Services\Trip\TripSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TripController extends Controller
{
    public function __construct(
        private readonly TripQueryService $queryService,
        private readonly TripSyncService $syncService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $trips = $this->queryService->allForUser($request->user());

        return response()->json($this->queryService->toApiPayload($trips));
    }

    public function sync(SyncTripsRequest $request): JsonResponse
    {
        $this->syncService->sync($request->user(), $request->validated());

        $trips = $this->queryService->allForUser($request->user());

        return response()->json($this->queryService->toApiPayload($trips));
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ShareTripRequest;
use App\Http\Requests\SyncTripsRequest;
use App\Models\Trip;
use App\Models\User;
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

        return response()->json($this->queryService->toApiPayload($trips, $request->user()));
    }

    public function sync(SyncTripsRequest $request): JsonResponse
    {
        $this->syncService->sync($request->user(), $request->validated());

        $trips = $this->queryService->allForUser($request->user());

        return response()->json($this->queryService->toApiPayload($trips, $request->user()));
    }

    public function share(ShareTripRequest $request, Trip $trip): JsonResponse
    {
        $owner = $request->user();
        if ($trip->user_id !== $owner->id) {
            return response()->json([
                'message' => 'Solo el propietario puede compartir este viaje.',
            ], 403);
        }

        $email = $request->validated('email');
        $targetUser = User::query()->where('email', $email)->first();
        if (! $targetUser) {
            return response()->json([
                'message' => 'No existe ningún usuario con ese email.',
            ], 422);
        }

        if ($targetUser->id === $owner->id) {
            return response()->json([
                'message' => 'No puedes compartirte el viaje a ti mismo.',
            ], 422);
        }

        $alreadyShared = $trip->collaborators()->where('users.id', $targetUser->id)->exists();
        $trip->collaborators()->syncWithoutDetaching([$targetUser->id]);

        return response()->json([
            'ok' => true,
            'alreadyShared' => $alreadyShared,
            'sharedWith' => [
                'id' => $targetUser->id,
                'name' => $targetUser->name,
                'email' => $targetUser->email,
            ],
            'message' => $alreadyShared
                ? 'Este usuario ya tenía acceso al viaje.'
                : 'Viaje compartido correctamente.',
        ]);
    }
}

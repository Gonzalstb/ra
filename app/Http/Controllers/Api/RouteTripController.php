<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Routing\OsrmService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RouteTripController extends Controller
{
    public function __invoke(Request $request, OsrmService $osrm): JsonResponse
    {
        $validated = $request->validate([
            'points' => ['required', 'string', 'max:8000'],
        ]);

        $waypoints = [];
        foreach (explode('|', $validated['points']) as $pair) {
            $pair = trim($pair);
            if ($pair === '') {
                continue;
            }
            $parts = explode(',', $pair, 2);
            if (count($parts) !== 2) {
                return response()->json(['message' => 'Formato de puntos inválido.'], 422);
            }
            [$lng, $lat] = $parts;
            $waypoints[] = ['lat' => (float) $lat, 'lng' => (float) $lng];
        }

        if (count($waypoints) < 2) {
            return response()->json(['message' => 'Se necesitan al menos dos puntos.'], 422);
        }

        if (count($waypoints) > 25) {
            return response()->json(['message' => 'Demasiados puntos en la ruta (máx. 25).'], 422);
        }

        $result = $osrm->routeTrip($waypoints);

        if (! $result) {
            return response()->json(['message' => 'No se pudo calcular la ruta en coche.'], 502);
        }

        return response()->json($result);
    }
}

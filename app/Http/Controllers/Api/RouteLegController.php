<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Routing\OsrmService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RouteLegController extends Controller
{
    public function __invoke(Request $request, OsrmService $osrm): JsonResponse
    {
        $validated = $request->validate([
            'fromLat' => 'required|numeric|between:-90,90',
            'fromLng' => 'required|numeric|between:-180,180',
            'toLat' => 'required|numeric|between:-90,90',
            'toLng' => 'required|numeric|between:-180,180',
        ]);

        $result = $osrm->routeLeg(
            (float) $validated['fromLat'],
            (float) $validated['fromLng'],
            (float) $validated['toLat'],
            (float) $validated['toLng']
        );

        if (! $result) {
            return response()->json(['message' => 'No se pudo calcular la ruta.'], 502);
        }

        return response()->json($result);
    }
}

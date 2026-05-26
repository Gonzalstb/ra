<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Geocoding\NominatimService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GeocodeController extends Controller
{
    public function __invoke(Request $request, NominatimService $geocoder): JsonResponse
    {
        $validated = $request->validate([
            'q' => 'required|string|min:2|max:500',
            'includeLocalita' => 'sometimes|boolean',
        ]);

        $result = $geocoder->search(
            $validated['q'],
            $validated['includeLocalita'] ?? true
        );

        if (! $result) {
            return response()->json(['message' => 'No se encontró la dirección.'], 404);
        }

        return response()->json($result);
    }
}

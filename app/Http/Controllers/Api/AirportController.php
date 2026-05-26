<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Airports\AirportCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AirportController extends Controller
{
    public function countries(AirportCatalog $catalog): JsonResponse
    {
        return response()->json(['countries' => $catalog->countries()]);
    }

    public function index(Request $request, AirportCatalog $catalog): JsonResponse
    {
        $validated = $request->validate([
            'country' => 'required|string|size:2',
        ]);

        $airports = $catalog->airportsForCountry($validated['country']);

        return response()->json(['airports' => $airports]);
    }
}

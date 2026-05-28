<?php

use App\Http\Controllers\Api\AirportController;
use App\Http\Controllers\Api\GeocodeController;
use App\Http\Controllers\Api\RouteLegController;
use App\Http\Controllers\Api\RouteTripController;
use App\Http\Controllers\Api\TripController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\PrintItineraryController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('login', [AuthenticatedSessionController::class, 'store']);
    Route::get('register', [RegisteredUserController::class, 'create'])->name('register');
    Route::post('register', [RegisteredUserController::class, 'store']);
});

Route::middleware('auth')->group(function () {
    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');

    Route::get('/', function () {
        return view('planner.index', ['user' => auth()->user()]);
    })->name('planner');

    Route::get('trips/print', PrintItineraryController::class)->name('trips.print');
    Route::get('trips', [TripController::class, 'index']);
    Route::put('trips/sync', [TripController::class, 'sync']);
    Route::post('trips/{trip}/share', [TripController::class, 'share']);
    Route::get('airports/countries', [AirportController::class, 'countries']);
    Route::get('airports', [AirportController::class, 'index']);
    Route::get('geocode', GeocodeController::class)->middleware('throttle:30,1');
    Route::get('route-leg', RouteLegController::class)->middleware('throttle:90,1');
    Route::get('route-trip', RouteTripController::class)->middleware('throttle:45,1');
});

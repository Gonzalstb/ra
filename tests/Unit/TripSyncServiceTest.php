<?php

namespace Tests\Unit;

use App\Models\Destination;
use App\Models\ItineraryDay;
use App\Models\Trip;
use App\Models\User;
use App\Services\Trip\TripSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TripSyncServiceTest extends TestCase
{
    use RefreshDatabase;

    private TripSyncService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(TripSyncService::class);
    }

    public function test_sync_preserves_trips_not_in_payload(): void
    {
        $user = User::factory()->create();

        Trip::create([
            'id' => 'trip-keep',
            'user_id' => $user->id,
            'name' => 'Mantener',
            'starting_point_name' => 'Florencia',
            'starting_point_lat' => 43.77,
            'starting_point_lng' => 11.25,
            'is_active' => false,
        ]);

        Trip::create([
            'id' => 'trip-sync',
            'user_id' => $user->id,
            'name' => 'Sincronizar',
            'starting_point_name' => 'Siena',
            'starting_point_lat' => 43.31,
            'starting_point_lng' => 11.33,
            'is_active' => true,
        ]);

        $this->service->sync($user, [
            'activeTripId' => 'trip-sync',
            'deletedTripIds' => [],
            'trips' => [
                [
                    'id' => 'trip-sync',
                    'name' => 'Sincronizar actualizado',
                    'startingPoint' => [
                        'name' => 'Siena Centro',
                        'lat' => 43.31,
                        'lng' => 11.33,
                    ],
                    'days' => [],
                    'destinations' => [],
                    'routeSegments' => [],
                ],
            ],
        ]);

        $this->assertDatabaseHas('trips', ['id' => 'trip-keep', 'name' => 'Mantener']);
        $this->assertDatabaseHas('trips', ['id' => 'trip-sync', 'name' => 'Sincronizar actualizado']);
        $this->assertEquals(2, Trip::where('user_id', $user->id)->count());
    }

    public function test_sync_deletes_only_explicit_trip_ids(): void
    {
        $user = User::factory()->create();

        Trip::create([
            'id' => 'trip-delete',
            'user_id' => $user->id,
            'name' => 'Borrar',
            'starting_point_name' => 'Pisa',
            'starting_point_lat' => 43.71,
            'starting_point_lng' => 10.40,
            'is_active' => false,
        ]);

        Trip::create([
            'id' => 'trip-remain',
            'user_id' => $user->id,
            'name' => 'Quedar',
            'starting_point_name' => 'Lucca',
            'starting_point_lat' => 43.84,
            'starting_point_lng' => 10.50,
            'is_active' => true,
        ]);

        $this->service->sync($user, [
            'activeTripId' => 'trip-remain',
            'deletedTripIds' => ['trip-delete'],
            'trips' => [
                [
                    'id' => 'trip-remain',
                    'name' => 'Quedar',
                    'startingPoint' => [
                        'name' => 'Lucca',
                        'lat' => 43.84,
                        'lng' => 10.50,
                    ],
                    'days' => [],
                    'destinations' => [],
                    'routeSegments' => [],
                ],
            ],
        ]);

        $this->assertDatabaseMissing('trips', ['id' => 'trip-delete']);
        $this->assertDatabaseHas('trips', ['id' => 'trip-remain']);
    }

    public function test_sync_respects_destination_and_day_order(): void
    {
        $user = User::factory()->create();

        Trip::create([
            'id' => 'trip-order',
            'user_id' => $user->id,
            'name' => 'Orden',
            'starting_point_name' => 'Florencia',
            'starting_point_lat' => 43.77,
            'starting_point_lng' => 11.25,
            'is_active' => true,
        ]);

        $this->service->sync($user, [
            'activeTripId' => 'trip-order',
            'deletedTripIds' => [],
            'trips' => [
                [
                    'id' => 'trip-order',
                    'name' => 'Orden',
                    'startingPoint' => [
                        'name' => 'Florencia',
                        'lat' => 43.77,
                        'lng' => 11.25,
                    ],
                    'days' => [
                        ['id' => 'day-2', 'title' => 'Segundo', 'date' => '', 'notes' => ''],
                        ['id' => 'day-1', 'title' => 'Primero', 'date' => '2026-06-01', 'notes' => 'Nota'],
                    ],
                    'destinations' => [
                        [
                            'id' => 'dest-b',
                            'name' => 'B',
                            'description' => '',
                            'photoUrl' => 'https://example.com/b.jpg',
                            'duration' => '1h',
                            'isRoundTrip' => false,
                            'inRoute' => true,
                            'dayId' => 'day-1',
                            'lat' => 43.3,
                            'lng' => 11.3,
                        ],
                        [
                            'id' => 'dest-a',
                            'name' => 'A',
                            'description' => '',
                            'photoUrl' => 'https://example.com/a.jpg',
                            'duration' => '30 min',
                            'isRoundTrip' => false,
                            'inRoute' => true,
                            'dayId' => null,
                            'lat' => 43.4,
                            'lng' => 11.4,
                        ],
                    ],
                    'routeSegments' => [],
                ],
            ],
        ]);

        $this->assertEquals(0, ItineraryDay::where('id', 'day-2')->value('sort_order'));
        $this->assertEquals(1, ItineraryDay::where('id', 'day-1')->value('sort_order'));
        $this->assertEquals(0, Destination::where('id', 'dest-b')->value('sort_order'));
        $this->assertEquals(1, Destination::where('id', 'dest-a')->value('sort_order'));
        $this->assertEquals('day-1', Destination::where('id', 'dest-b')->value('day_id'));
    }
}

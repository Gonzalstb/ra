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

    public function test_sync_persists_favorite_and_site_url(): void
    {
        $user = User::factory()->create();

        Trip::create([
            'id' => 'trip-fav',
            'user_id' => $user->id,
            'name' => 'Toscana',
            'starting_point_name' => 'Pisa',
            'starting_point_lat' => 43.71,
            'starting_point_lng' => 10.40,
            'is_active' => true,
        ]);

        $this->service->sync($user, [
            'activeTripId' => 'trip-fav',
            'deletedTripIds' => [],
            'trips' => [
                [
                    'id' => 'trip-fav',
                    'name' => 'Toscana',
                    'startingPoint' => ['name' => 'Pisa', 'lat' => 43.71, 'lng' => 10.40],
                    'days' => [],
                    'routeSegments' => [],
                    'destinations' => [
                        [
                            'id' => 'dest-san-donato',
                            'name' => 'San Donato',
                            'description' => 'Loc. San Donato, 6',
                            'photoUrl' => 'https://example.com/x.jpg',
                            'duration' => '1h',
                            'isRoundTrip' => false,
                            'inRoute' => true,
                            'isFavorite' => true,
                            'siteUrl' => 'https://example.com',
                            'lat' => 43.468,
                            'lng' => 11.042,
                        ],
                    ],
                ],
            ],
        ]);

        $this->assertDatabaseHas('destinations', [
            'id' => 'dest-san-donato',
            'is_favorite' => true,
            'site_url' => 'https://example.com',
        ]);
    }

    public function test_sync_accepts_long_booking_site_url(): void
    {
        $user = User::factory()->create();
        $longUrl = 'https://www.blastnessbooking.com/sp_risultati_trattamenti.htm?dc=7041&id_albergo=20772&id_affiliazione=&id_profilo_pms=0&codice_pren_esterna=&codice_personale=&date_fisse=&id_stile=17501&lingua_int=eng&tst_prntz=&gg=5&mm=7&aa=2026&notti=1&sconto=&cat_service_0=on&cat_service_24=on';

        Trip::create([
            'id' => 'trip-long-url',
            'user_id' => $user->id,
            'name' => 'Toscana',
            'starting_point_name' => 'Pisa',
            'starting_point_lat' => 43.71,
            'starting_point_lng' => 10.40,
            'is_active' => true,
        ]);

        $this->service->sync($user, [
            'activeTripId' => 'trip-long-url',
            'deletedTripIds' => [],
            'trips' => [
                [
                    'id' => 'trip-long-url',
                    'name' => 'Toscana',
                    'startingPoint' => ['name' => 'Pisa', 'lat' => 43.71, 'lng' => 10.40],
                    'days' => [],
                    'routeSegments' => [],
                    'destinations' => [
                        [
                            'id' => 'dest-long-url',
                            'name' => 'San Donato',
                            'description' => '',
                            'photoUrl' => 'https://example.com/x.jpg',
                            'siteUrl' => $longUrl,
                            'duration' => '1h',
                            'inRoute' => true,
                            'lat' => 43.468,
                            'lng' => 11.042,
                        ],
                    ],
                ],
            ],
        ]);

        $this->assertDatabaseHas('destinations', [
            'id' => 'dest-long-url',
            'site_url' => $longUrl,
        ]);
    }
}

<?php

namespace Tests\Feature;

use App\Models\Trip;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TripAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_only_sees_own_trips(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        Trip::create([
            'id' => 'trip-a',
            'user_id' => $userA->id,
            'name' => 'Viaje A',
            'starting_point_name' => 'Florencia',
            'starting_point_lat' => 43.77,
            'starting_point_lng' => 11.25,
            'is_active' => true,
        ]);

        Trip::create([
            'id' => 'trip-b',
            'user_id' => $userB->id,
            'name' => 'Viaje B',
            'starting_point_name' => 'Siena',
            'starting_point_lat' => 43.31,
            'starting_point_lng' => 11.33,
            'is_active' => true,
        ]);

        $response = $this->actingAs($userA)->getJson('/trips');

        $response->assertOk();
        $response->assertJsonCount(1, 'trips');
        $response->assertJsonPath('trips.0.id', 'trip-a');
        $response->assertJsonPath('trips.0.name', 'Viaje A');
    }

    public function test_guest_cannot_access_trips_api(): void
    {
        $this->getJson('/trips')->assertUnauthorized();
    }
}

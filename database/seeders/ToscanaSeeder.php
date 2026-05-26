<?php

namespace Database\Seeders;

use App\Models\Destination;
use App\Models\ItineraryDay;
use App\Models\Trip;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ToscanaSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $user = User::updateOrCreate(
                ['email' => 'gbr@test.com'],
                [
                    'name' => 'GBR',
                    'password' => 'Test1111',
                ]
            );

            Trip::whereNull('user_id')->update(['user_id' => $user->id]);

            $trip1 = Trip::updateOrCreate(
                ['id' => 'trip-1'],
                [
                    'user_id' => $user->id,
                    'name' => 'Viaje de ejemplo — Europa',
                    'starting_point_name' => 'Florencia Centro',
                    'starting_point_lat' => 43.7696,
                    'starting_point_lng' => 11.2558,
                    'is_active' => true,
                ]
            );

            ItineraryDay::updateOrCreate(
                ['id' => 'day-1'],
                [
                    'trip_id' => $trip1->id,
                    'title' => 'Día 1 — Florencia y Siena',
                    'date' => null,
                    'notes' => 'Llegada y primera visita a Siena.',
                    'sort_order' => 0,
                ]
            );
            ItineraryDay::updateOrCreate(
                ['id' => 'day-2'],
                [
                    'trip_id' => $trip1->id,
                    'title' => "Día 2 — Val d'Orcia",
                    'date' => null,
                    'notes' => 'Ruta escénica por el valle.',
                    'sort_order' => 1,
                ]
            );

            $this->seedDestination($trip1->id, [
                'id' => '1',
                'name' => 'Siena',
                'description' => 'Preciosa ciudad medieval famosa por el Palio y su espectacular catedral gótica de mármol blanco y negro.',
                'photo_url' => 'https://images.unsplash.com/photo-1599818449779-1c6ca1653ff9?w=800&auto=format&fit=crop&q=80',
                'duration' => '1h 15m',
                'is_round_trip' => true,
                'in_route' => true,
                'lat' => 43.3188,
                'lng' => 11.3308,
                'sort_order' => 0,
                'day_id' => 'day-1',
            ]);
            $this->seedDestination($trip1->id, [
                'id' => '2',
                'name' => 'San Gimignano',
                'description' => 'El Manhattan de la Edad Media. Conserva 14 torres de piedra señoriales que dominan el horizonte toscano.',
                'photo_url' => 'https://images.unsplash.com/photo-1541370976299-4d24ebbc9037?w=800&auto=format&fit=crop&q=80',
                'duration' => '55 min',
                'is_round_trip' => false,
                'in_route' => false,
                'lat' => 43.4674,
                'lng' => 11.0429,
                'sort_order' => 1,
                'day_id' => null,
            ]);
            $trip1->update([
                'route_segments' => [
                    ['id' => 'rs-1', 'fromKey' => 'start', 'toKey' => 'dest:1', 'sameRoadAs' => null],
                    ['id' => 'rs-2', 'fromKey' => 'dest:1', 'toKey' => 'dest:3', 'sameRoadAs' => null],
                ],
            ]);

            $this->seedDestination($trip1->id, [
                'id' => '3',
                'name' => "Val d'Orcia",
                'description' => 'Paisaje icónico de colinas doradas, hileras de cipreses perfectas y viñedos de Brunello de Montalcino.',
                'photo_url' => 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
                'duration' => '1h 45m',
                'is_round_trip' => true,
                'in_route' => true,
                'lat' => 43.0761,
                'lng' => 11.6789,
                'sort_order' => 2,
                'day_id' => 'day-2',
            ]);

            $trip2 = Trip::updateOrCreate(
                ['id' => 'trip-2'],
                [
                    'user_id' => $user->id,
                    'name' => 'Segundo viaje de ejemplo',
                    'starting_point_name' => 'Pisa Aeropuerto',
                    'starting_point_lat' => 43.6996,
                    'starting_point_lng' => 10.3984,
                    'is_active' => false,
                ]
            );

            $this->seedDestination($trip2->id, [
                'id' => 'coast-1',
                'name' => 'Lucca Casco Histórico',
                'description' => 'Famosa por sus murallas renacentistas intactas que rodean todo el centro de la ciudad y sus calles adoquinadas.',
                'photo_url' => 'https://images.unsplash.com/photo-1528127269322-539801943592?w=800&auto=format&fit=crop&q=80',
                'duration' => '35 min',
                'is_round_trip' => false,
                'in_route' => true,
                'lat' => 43.8429,
                'lng' => 10.5027,
                'sort_order' => 0,
                'day_id' => null,
            ]);
            $this->seedDestination($trip2->id, [
                'id' => 'coast-2',
                'name' => 'Castagneto Carducci',
                'description' => 'Precioso pueblo medieval situado en una colina de pinos y olivares con vistas increíbles del Mar Tirreno.',
                'photo_url' => 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800',
                'duration' => '1h 10m',
                'is_round_trip' => true,
                'in_route' => true,
                'lat' => 43.1611,
                'lng' => 10.6111,
                'sort_order' => 1,
                'day_id' => null,
            ]);
        });

        $this->command?->info('Usuario: gbr@test.com / Test1111');
    }

    private function seedDestination(string $tripId, array $data): void
    {
        Destination::updateOrCreate(
            ['id' => $data['id']],
            [
                'trip_id' => $tripId,
                'day_id' => $data['day_id'] ?? null,
                'name' => $data['name'],
                'description' => $data['description'],
                'photo_url' => $data['photo_url'],
                'duration' => $data['duration'],
                'is_round_trip' => $data['is_round_trip'],
                'in_route' => $data['in_route'],
                'lat' => $data['lat'],
                'lng' => $data['lng'],
                'sort_order' => $data['sort_order'],
            ]
        );
    }
}

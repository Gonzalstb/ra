<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            if (! Schema::hasColumn('trips', 'route_plans')) {
                $table->json('route_plans')->nullable()->after('route_segments');
            }
            if (! Schema::hasColumn('trips', 'active_route_plan_id')) {
                $table->string('active_route_plan_id')->nullable()->after('route_plans');
            }
        });

        if (! Schema::hasColumn('trips', 'route_plans')) {
            return;
        }

        DB::table('trips')->orderBy('id')->each(function (object $trip) {
            $existing = json_decode($trip->route_plans ?? 'null', true);
            if (is_array($existing) && $existing !== []) {
                return;
            }

            $segments = json_decode($trip->route_segments ?? '[]', true);
            if (! is_array($segments)) {
                $segments = [];
            }

            $planId = 'rp-1';
            DB::table('trips')->where('id', $trip->id)->update([
                'route_plans' => json_encode([
                    [
                        'id' => $planId,
                        'name' => 'Ruta 1',
                        'segments' => $segments,
                    ],
                ]),
                'active_route_plan_id' => $planId,
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            if (Schema::hasColumn('trips', 'active_route_plan_id')) {
                $table->dropColumn('active_route_plan_id');
            }
            if (Schema::hasColumn('trips', 'route_plans')) {
                $table->dropColumn('route_plans');
            }
        });
    }
};

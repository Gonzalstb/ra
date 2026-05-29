<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Repara despliegues donde migraciones anteriores fallaron por orden de columnas.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('destinations')) {
            Schema::table('destinations', function (Blueprint $table) {
                if (! Schema::hasColumn('destinations', 'is_reserved')) {
                    $table->boolean('is_reserved')->default(false);
                }
                if (! Schema::hasColumn('destinations', 'price')) {
                    $table->decimal('price', 10, 2)->nullable();
                }
                if (! Schema::hasColumn('destinations', 'is_winery')) {
                    $table->boolean('is_winery')->default(false);
                }
                if (! Schema::hasColumn('destinations', 'is_hotel')) {
                    $table->boolean('is_hotel')->default(false);
                }
                if (! Schema::hasColumn('destinations', 'is_bar')) {
                    $table->boolean('is_bar')->default(false);
                }
                if (! Schema::hasColumn('destinations', 'is_text_only')) {
                    $table->boolean('is_text_only')->default(false);
                }
                if (! Schema::hasColumn('destinations', 'is_favorite')) {
                    $table->boolean('is_favorite')->default(false);
                }
                if (! Schema::hasColumn('destinations', 'site_url')) {
                    $table->text('site_url')->nullable();
                }
            });
        }

        if (Schema::hasTable('itinerary_days') && ! Schema::hasColumn('itinerary_days', 'date_end')) {
            Schema::table('itinerary_days', function (Blueprint $table) {
                $table->date('date_end')->nullable();
            });
        }

        if (Schema::hasTable('trips')) {
            Schema::table('trips', function (Blueprint $table) {
                if (! Schema::hasColumn('trips', 'return_to_start')) {
                    $table->boolean('return_to_start')->default(true);
                }
                if (! Schema::hasColumn('trips', 'ending_point_name')) {
                    $table->string('ending_point_name')->nullable();
                }
                if (! Schema::hasColumn('trips', 'ending_point_lat')) {
                    $table->decimal('ending_point_lat', 10, 7)->nullable();
                }
                if (! Schema::hasColumn('trips', 'ending_point_lng')) {
                    $table->decimal('ending_point_lng', 10, 7)->nullable();
                }
                if (! Schema::hasColumn('trips', 'route_segments')) {
                    $table->json('route_segments')->nullable();
                }
            });
        }
    }

    public function down(): void
    {
        // No revertir: columnas pueden haber existido antes de esta migración.
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('itinerary_days', function (Blueprint $table) {
            $table->date('date_end')->nullable()->after('date');
        });

        Schema::table('destinations', function (Blueprint $table) {
            $table->boolean('is_text_only')->default(false)->after('in_route');
            $table->decimal('lat', 10, 7)->nullable()->change();
            $table->decimal('lng', 10, 7)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('itinerary_days', function (Blueprint $table) {
            $table->dropColumn('date_end');
        });

        Schema::table('destinations', function (Blueprint $table) {
            $table->dropColumn('is_text_only');
            $table->decimal('lat', 10, 7)->nullable(false)->change();
            $table->decimal('lng', 10, 7)->nullable(false)->change();
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            $table->boolean('return_to_start')->default(true)->after('is_active');
            $table->string('ending_point_name')->nullable()->after('return_to_start');
            $table->decimal('ending_point_lat', 10, 7)->nullable()->after('ending_point_name');
            $table->decimal('ending_point_lng', 10, 7)->nullable()->after('ending_point_lat');
        });
    }

    public function down(): void
    {
        Schema::table('trips', function (Blueprint $table) {
            $table->dropColumn([
                'return_to_start',
                'ending_point_name',
                'ending_point_lat',
                'ending_point_lng',
            ]);
        });
    }
};

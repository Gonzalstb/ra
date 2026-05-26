<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trips', function (Blueprint $table) {
            $table->string('id')->collation('utf8mb4_unicode_ci')->primary();
            $table->string('name');
            $table->string('starting_point_name');
            $table->decimal('starting_point_lat', 10, 7);
            $table->decimal('starting_point_lng', 10, 7);
            $table->boolean('is_active')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trips');
    }
};

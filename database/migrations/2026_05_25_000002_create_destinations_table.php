<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('destinations', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('trip_id');
            $table->foreign('trip_id')->references('id')->on('trips')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('photo_url');
            $table->string('duration')->default('1h');
            $table->boolean('is_round_trip')->default(false);
            $table->boolean('in_route')->default(true);
            $table->decimal('lat', 10, 7);
            $table->decimal('lng', 10, 7);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('destinations');
    }
};

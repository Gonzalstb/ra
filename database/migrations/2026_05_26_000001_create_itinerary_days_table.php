<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('itinerary_days', function (Blueprint $table) {
            $table->string('id')->collation('utf8mb4_unicode_ci')->primary();
            $table->string('trip_id')->collation('utf8mb4_unicode_ci');
            $table->foreign('trip_id')->references('id')->on('trips')->cascadeOnDelete();
            $table->string('title');
            $table->date('date')->nullable();
            $table->text('notes')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('itinerary_days');
    }
};

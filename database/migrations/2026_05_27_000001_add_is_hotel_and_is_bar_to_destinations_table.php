<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('destinations', function (Blueprint $table) {
            $table->boolean('is_hotel')->default(false)->after('is_winery');
            $table->boolean('is_bar')->default(false)->after('is_hotel');
        });
    }

    public function down(): void
    {
        Schema::table('destinations', function (Blueprint $table) {
            $table->dropColumn(['is_hotel', 'is_bar']);
        });
    }
};

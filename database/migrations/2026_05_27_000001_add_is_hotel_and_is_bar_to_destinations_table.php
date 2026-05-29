<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('destinations', function (Blueprint $table) {
            if (! Schema::hasColumn('destinations', 'is_hotel')) {
                $table->boolean('is_hotel')->default(false);
            }
            if (! Schema::hasColumn('destinations', 'is_bar')) {
                $table->boolean('is_bar')->default(false);
            }
        });
    }

    public function down(): void
    {
        Schema::table('destinations', function (Blueprint $table) {
            $table->dropColumn(['is_hotel', 'is_bar']);
        });
    }
};

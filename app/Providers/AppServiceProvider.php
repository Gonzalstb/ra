<?php

namespace App\Providers;

use App\Models\User;
use Database\Seeders\ToscanaSeeder;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if (! $this->app->environment('local') || $this->app->runningInConsole() || $this->app->runningUnitTests()) {
            return;
        }

        try {
            if (Schema::hasTable('users') && User::count() === 0) {
                $this->app->make(ToscanaSeeder::class)->run();
            }
        } catch (\Throwable) {
            // Base de datos aún no disponible (p. ej. durante el despliegue).
        }
    }
}

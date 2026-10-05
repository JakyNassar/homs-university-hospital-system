<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Models\Surgery;
use App\Models\Shift;
use App\Observers\SurgeryObserver;
use App\Observers\ShiftObserver;

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
        Surgery::observe(SurgeryObserver::class);
        Shift::observe(ShiftObserver::class);
    }
}

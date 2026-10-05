<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('backup_settings', function (Blueprint $table) {
            $table->id();
            $table->string('type')->default('interval'); // نوع الإعداد (جدولة دورية)
            $table->string('value')->default('weekly');  // الخيارات المتوفرة: weekly, monthly, none
            $table->timestamps();
        });
        DB::table('backup_settings')->insert([
            'type' => 'interval',
            'value' => 'weekly',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('backup_settings');
    }
};

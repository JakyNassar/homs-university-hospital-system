<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private function indexExists(string $table, string $index): bool
    {
        $indexes = DB::select("SHOW INDEX FROM `{$table}` WHERE Key_name = '{$index}'");
        return count($indexes) > 0;
    }

    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!$this->indexExists('users', 'users_username_index'))
                $table->index('username');
            if (!$this->indexExists('users', 'users_study_year_index'))
                $table->index('study_year');
            if (!$this->indexExists('users', 'users_full_name_index'))
                $table->index('full_name');
        });

        Schema::table('doctors', function (Blueprint $table) {
            if (!$this->indexExists('doctors', 'doctors_department_id_index'))
                $table->index('department_id');
            if (!$this->indexExists('doctors', 'doctors_user_id_index'))
                $table->index('user_id');
        });

        Schema::table('shifts', function (Blueprint $table) {
            if (!$this->indexExists('shifts', 'shifts_user_id_index'))
                $table->index('user_id');
            if (!$this->indexExists('shifts', 'shifts_department_id_index'))
                $table->index('department_id');
            if (!$this->indexExists('shifts', 'shifts_date_index'))
                $table->index('date');
        });

        Schema::table('surgeries', function (Blueprint $table) {
            if (!$this->indexExists('surgeries', 'surgeries_department_id_index'))
                $table->index('department_id');
            if (!$this->indexExists('surgeries', 'surgeries_date_index'))
                $table->index('date');
            if (!$this->indexExists('surgeries', 'surgeries_created_by_index'))
                $table->index('created_by');
        });

        Schema::table('notifications', function (Blueprint $table) {
            if (!$this->indexExists('notifications', 'notifications_notifiable_type_notifiable_id_index'))
                $table->index(['notifiable_id', 'notifiable_type']);
            if (!$this->indexExists('notifications', 'notifications_read_at_index'))
                $table->index('read_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndexIfExists('users_username_index');
            $table->dropIndexIfExists('users_study_year_index');
            $table->dropIndexIfExists('users_full_name_index');
        });
        Schema::table('doctors', function (Blueprint $table) {
            $table->dropIndexIfExists('doctors_department_id_index');
            $table->dropIndexIfExists('doctors_user_id_index');
        });
        Schema::table('shifts', function (Blueprint $table) {
            $table->dropIndexIfExists('shifts_user_id_index');
            $table->dropIndexIfExists('shifts_department_id_index');
            $table->dropIndexIfExists('shifts_date_index');
        });
        Schema::table('surgeries', function (Blueprint $table) {
            $table->dropIndexIfExists('surgeries_department_id_index');
            $table->dropIndexIfExists('surgeries_date_index');
            $table->dropIndexIfExists('surgeries_created_by_index');
        });
        Schema::table('notifications', function (Blueprint $table) {
            $table->dropIndexIfExists('notifications_notifiable_type_notifiable_id_index');
            $table->dropIndexIfExists('notifications_read_at_index');
        });
    }
};
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shifts', function (Blueprint $table) {
            // UID فريد لكل مناوبة — يبقى ثابت عبر التعديلات والإلغاء
            $table->string('ics_uid')->nullable()->unique()->after('end_time');
            // يرتفع بواحد في كل تعديل أو إلغاء حتى يتعرف عليه التقويم
            $table->unsignedSmallInteger('ics_sequence')->default(0)->after('ics_uid');
        });
    }

    public function down(): void
    {
        Schema::table('shifts', function (Blueprint $table) {
            $table->dropColumn(['ics_uid', 'ics_sequence']);
        });
    }
};
 
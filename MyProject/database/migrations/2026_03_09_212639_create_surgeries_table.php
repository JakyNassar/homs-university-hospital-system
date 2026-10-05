<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('surgeries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('created_by')->nullable()->constrained('users')->cascadeOnDelete();
            $table->integer('number')->nullable();
            $table->date('date');
            $table->integer('file_number')->nullable();
            $table->string('surgery_name');
            $table->string('specialist_doctor');
            $table->string('anes_specialist')->nullable();
            $table->string('anes_type')->nullable();
            $table->string('biopsy_number')->nullable();
            $table->text('materials')->nullable();
            $table->string('nurse_name')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('department_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->index('department_id');
            $table->index('date');
           
            $table->string('patient_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('surgeries');
    }
};

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SurgeryDoctor extends Model
{
    /** @use HasFactory<\Database\Factories\SurgeryDoctorFactory> */
    use HasFactory;
        protected $fillable = [
            'doctor_id',
            'surgery_id',
            'role'
        ];
}

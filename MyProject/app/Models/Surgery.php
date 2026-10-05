<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Department;
use App\Models\User;


class Surgery extends Model
{
    protected $fillable = [
        'number', 
        'date', 
        'file_number', 
        'patient_name', 
        'surgery_name', 
        'nurse_name', 
        'specialist_doctor', 
        'anes_specialist', 
        'anes_type', 
        'biopsy_number', 
        'materials', 
        'notes',
        'department_id', 
        'created_by'
    ];

    protected $casts = [
        'date' => 'date:Y-m-d'
    ];
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
    
    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function residents()
    {
        return $this->belongsToMany(Doctor::class, 'surgery_doctors', 'surgery_id', 'doctor_id')
                    ->wherePivot('type', 'resident')
                    ->withPivot('type')
                    ->withTimestamps()
                    ->join('users', 'users.id', '=', 'doctors.user_id')
                    ->join('departments', 'departments.id', '=', 'doctors.department_id')
                    ->select(
                        'doctors.id',
                        'users.full_name as name',
                        'users.study_year',
                        'departments.name as department_name'
                    
                    );

    }

    public function anesResidents()
    {
        return $this->belongsToMany(Doctor::class, 'surgery_doctors', 'surgery_id', 'doctor_id')
                    ->wherePivot('type', 'anesResident')
                    ->withPivot('type')
                    ->withTimestamps()
                    ->join('users', 'users.id', '=', 'doctors.user_id')
                    ->join('departments', 'departments.id', '=', 'doctors.department_id')
                    ->select(
                        'doctors.id',
                        'users.full_name as name',
                        'users.study_year',
                        'departments.name as department_name'

                    
                    );

    }


    
}

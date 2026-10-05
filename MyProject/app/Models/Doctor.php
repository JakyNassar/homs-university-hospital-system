<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\User;
use App\Models\Department;
use App\Models\Surgery;
use App\Models\Shift;

class Doctor extends Model
{
    use SoftDeletes;
    protected $fillable = [
        'user_id',
        'department_id'
        
    ];
    
    public function user(){
        return $this->belongsTo(User::class);

    }

    public function department(){
        return $this->belongsTo(Department::class);

    }

    public function surgeries(){
        return $this->belongsToMany(Surgery::class,
        'surgery_doctors',
        'doctor_id',
        'surgery_id',
        );

    }

    public function shifts(){
        return $this->hasMany(Shift::class);

    }
}

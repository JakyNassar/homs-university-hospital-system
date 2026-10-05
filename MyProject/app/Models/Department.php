<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Doctor;
use App\Models\Shift;
use App\Models\Surgery;
use App\Models\ShiftLocation;


class Department extends Model
{

    protected $fillable = [
        'name',
        
    ];
    public function doctors(){
        return $this->hasMany(Doctor::class);

    }

    public function shifts(){
        return $this->hasMany(Shift::class);

    }

    public function surgeries(){
        return $this->hasMany(Surgery::class);

    }

    public function locations(){
        return $this->hasMany(ShiftLocation::class);

    }
}

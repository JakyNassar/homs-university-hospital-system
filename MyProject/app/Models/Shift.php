<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;
use App\Models\Department;
use App\Models\ShiftLocation;


class Shift extends Model
{
    protected $fillable = [
        'date',
        'user_id',
        'department_id',
        'location_id',
        'start_time',
        'end_time',
        'ics_uid',        // ← جديد: معرّف فريد وثابت للحدث في التقويم
        'ics_sequence',   // ← جديد: يرتفع بواحد عند كل تعديل أو إلغاء
    ];
   
    public function user(){
        return $this->belongsTo(User::class);
    }

    public function department(){
        return $this->belongsTo(Department::class);
    }

    public function location()
    {
        return $this->belongsTo(ShiftLocation::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DoctorLeave extends Model
{
    protected $fillable = [
        'user_id',
        'from_date',
        'to_date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

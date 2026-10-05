<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class Notification extends Model
{

    protected $fillable = [
        'user_id',
        'type',
        'message',
        'date',
        'read_at'
    ];
    public function user(){
        return $this->belongsTo(User::class);

    }
}

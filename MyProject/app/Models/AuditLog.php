<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class AuditLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'action_type',
        'entity_modified',
        'target_id',
        'old_value',
        'new_value',
        'action_time',
    ];

    protected $casts = [
        'action_time' => 'datetime',
        'old_value'   => 'array',
        'new_value'   => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
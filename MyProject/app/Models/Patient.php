<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Surgery;


class Patient extends Model
{
    protected $fillable = [
        'file_number',
        'name',
       
        
        
    ];
    public function surgeries(){
        return $this->hasMany(Surgery::class);

    }
}

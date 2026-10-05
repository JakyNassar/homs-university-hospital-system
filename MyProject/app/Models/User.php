<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Traits\HasRoles;
use App\Models\Doctor;
use App\Models\Shift;
use App\Models\Surgery;


class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
   
    use HasApiTokens, HasFactory, Notifiable, HasRoles;
    protected $table ='users';
    protected $guard_name = 'web';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'full_name',
        'username',
        'study_year',
        'password',
        'previous_study_year',
        'email',
        'notifications_muted',
        'calendar_token',
    ];
    // إزالة appends لتحسين الأداء — role_name و department_name يُحسبان عند الحاجة فقط
    // protected $appends = ['role_name', 'department_name'];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function getRoleNameAttribute()
    {
        return $this->roles->first()?->name;
    }
    public function doctor(){
        return $this->hasOne(Doctor::class);

    }
    public function shifts(){
        return $this->hasMany(Shift::class);
    }

    public function SurgeriesCreated(){
        return $this->hasMany(Surgery::class , 'created_by');
    }

    public function getDepartmentNameAttribute()
    {
        return optional($this->doctor?->department)->name;
    }
    

}

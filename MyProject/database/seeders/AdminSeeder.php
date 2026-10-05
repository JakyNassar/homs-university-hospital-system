<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Doctor;

class AdminSeeder extends Seeder
{
    public function run(): void
    {

        $admin = User::updateOrCreate(
            ['username' => 'admin11'],
            [
                'full_name' => 'حازم الحسامي',
                'password' => 'admin123',
                'study_year' => '1',
                'email' => 'gone.3nasar@gmail.com'
            ]
        );

        $admin->assignRole(['admin', 'doctor']);

        Doctor::firstOrCreate(
            [
                'user_id' => $admin->id
            ],
            [
                'department_id' => 2
            ]
        );
    }
} 

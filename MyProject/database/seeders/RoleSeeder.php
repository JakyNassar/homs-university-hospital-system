<?php

namespace Database\Seeders;


use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        app()
        [PermissionRegistrar::class]->forgetCachedPermissions();
        // تعطيل فحص المفتاح الأجنبي مؤقتاً
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        Role::truncate();
        Permission::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // إنشاء الأدوار
        $roles = ['admin', 'department_manager', 'doctor'];
        foreach ($roles as $roleName) {
            Role::updateOrCreate(['name' => $roleName , 'guard_name'=>'web'],
            ['name'=>$roleName]);
        }

        // إنشاء الصلاحيات
        $permissions = [
            'edit surgery' , 'delete surgery'
            
        ];
        foreach ($permissions as $perm) {
            Permission::updateOrCreate(['name' => $perm , 'guard_name'=>'web'],
            ['name' => $perm ]);
        }

        // منح جميع الصلاحيات للأدمن
        $admin = Role::findByName('admin', 'web');
        $admin->syncPermissions($permissions);
    }
}

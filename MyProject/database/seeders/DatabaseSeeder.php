<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\User;
use App\Models\ShiftLocation;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Database\Seeders\AdminSeeder;


class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        

        Department::updateOrCreate(['name'=>'جراحة عامة']);
        Department::updateOrCreate(['name'=>'جراحة عظمية']);
        Department::updateOrCreate(['name'=>'نسائية']);
        Department::updateOrCreate(['name'=>'داخلية(عامة)']);
        Department::updateOrCreate(['name'=>'داخلية(قلبية)']);
        Department::updateOrCreate(['name'=>'أطفال']);
        Department::updateOrCreate(['name'=>'عينية']);
        Department::updateOrCreate(['name'=>'تخدير']);
        Department::updateOrCreate(['name'=>'مخبر']);
        Department::updateOrCreate(['name'=>'أشعة']);


        $ShiftLocation=[
            ['name' => 'اسعاف' , 'department_id' => '1'],
            ['name' => 'شعبة' , 'department_id' => '1'],
            ['name' => 'عناية' , 'department_id' => '1'],
            ['name' => 'اسعاف' , 'department_id' => '2'],
            ['name' => 'شعبة' , 'department_id' => '2'],
            ['name' => 'اسعاف' , 'department_id' => '4'],
            ['name' => 'شعبة' , 'department_id' => '4'],
            ['name' => 'عناية عامة' , 'department_id' => '4'],
            ['name' => 'عناية قلبية ' , 'department_id' => '5'],
            ['name' => 'اسعاف' , 'department_id' => '6'],
            ['name' => 'شعبة' , 'department_id' => '6'],
            ['name' => 'حواضن' , 'department_id' => '6'],
            ['name' => 'عيادة اسعافية' , 'department_id' => '7'],
            ['name' => 'عمليات ' , 'department_id' => '8'],
            ['name' => 'عناية عامة' , 'department_id' => '8'],
            ['name' => 'مخبر' , 'department_id' => '9'],
            ['name' => 'ايكو اسعافي' , 'department_id' => '10'],
            ['name' => 'طبقي محوري' , 'department_id' => '10'],
            ['name' => 'غرفة 201 مقيمين الذكور' , 'department_id' => '3'],
            ['name' => 'غرفة 211 مقيمين الثالثة' , 'department_id' => '3'],
            ['name'=> 'غرفة 208 مقيمين الرابعة' , 'department_id' => '3'],
            ['name'=> 'غرفة 210 مقيمين الثانية و الخامسة' , 'department_id' => '3']
        ];
        foreach ($ShiftLocation as $location){
            ShiftLocation::firstOrCreate([
                'name' => $location['name'],
                'department_id' => $location['department_id']
            ]);
        }

        Permission::updateOrCreate(['name' => 'edit surgery']);
        Permission::updateOrCreate(['name' => 'delete surgery']);
        
        $this->call([RoleSeeder::class,
        ]);
        $this->call([
    RoleSeeder::class,
    AdminSeeder::class,
]);
}
}


<?php

namespace App\Imports;

use App\Models\User;
use App\Models\Doctor;
use App\Models\Department;
use Illuminate\Support\Facades\Hash;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithCustomValueBinder;
use Maatwebsite\Excel\Concerns\WithStartRow;

/**
 * ملاحظة مهمة:
 * WithHeadingRow يستخدم Str::slug لتحويل العناوين — الأحرف العربية تُحذف كلها
 * لذلك نستخدم WithStartRow (نبدأ من السطر 2) ونتعامل مع الأعمدة كـ array بالـ index
 * وهذا يدعم العربي والإنكليزي تلقائياً
 */
class UserImport implements ToModel, WithStartRow
{
    // cache للـ usernames الموجودة — بدل query لكل صف
    private array $existingUsernames = [];
    private array $existingEmails = [];
    private array $usernameCounter = [];

    public function __construct()
    {
        // جيب كل الـ usernames والإيميلات دفعة وحدة
        $this->existingUsernames = User::pluck('username')->flip()->toArray();
        $this->existingEmails = User::whereNotNull('email')->pluck('email')->flip()->toArray();
    }
    // خريطة الأعمدة بالترتيب (0-based index)
    // يجب أن يطابق ترتيب الأعمدة في ملف الإكسل
    private array $columnOrder = [
        0 => 'full_name',
        1 => 'username',
        2 => 'password',
        3 => 'role',
        4 => 'department',
        5 => 'study_year',
    ];

    // خريطة أسماء الأعمدة النصية (للملفات ذات headers معروفة)
    private array $columnMap = [
        // إنكليزي
        'full_name'          => 'full_name',
        'username'           => 'username',
        'password'           => 'password',
        'role'               => 'role',
        'department'         => 'department',
        'study_year'         => 'study_year',
        // عربي شائع
        'الاسم الكامل'       => 'full_name',
        'اسم المستخدم'       => 'username',
        'كلمة المرور'        => 'password',
        'الدور'              => 'role',
        'القسم'              => 'department',
        'سنة الدراسة'        => 'study_year',
        'الاسم الثلاثي'      => 'full_name',
        'اسم_المستخدم'       => 'username',
        'كلمة_المرور'        => 'password',
        'سنة_الدراسة'        => 'study_year',
        'الدور الوظيفي'     => 'role',
        'السنة الدراسية'     => 'study_year',
        'كلمة السر'          => 'password',
    ];

    // خريطة الأدوار: عربي وإنكليزي -> القيمة الداخلية
    private array $roleMap = [
        'طبيب'               => 'doctor',
        'doctor'             => 'doctor',
        'رئيس مقيمين'        => 'department_manager',
        'رئيس_مقيمين'        => 'department_manager',
        'رئيس قسم'           => 'department_manager',
        'رئيس_قسم'           => 'department_manager',
        'مدير قسم'           => 'department_manager',
        'مدير_قسم'           => 'department_manager',
        'department_manager' => 'department_manager',
        'department manager' => 'department_manager',
        'رئيس مقيمين فرعي' => 'department_manager',
        'رئيس_مقيمين_فرعي' => 'department_manager',
    ];

    // نبدأ من السطر 2 (السطر 1 هو العناوين ونتجاهله)
    public function startRow(): int
    {
        return 2;
    }

    public function model(array $row)
    {
        // الصف يأتي كـ array مرقّمة [0,1,2,...]
        $data = [
            'full_name'  => trim((string)($row[0] ?? '')),
            'username'   => trim((string)($row[1] ?? '')),
            'password'   => trim((string)($row[2] ?? '')),
            'role'       => trim((string)($row[3] ?? '')),
            'department' => trim((string)($row[4] ?? '')),
            'study_year' => isset($row[5]) && $row[5] !== '' ? (int)$row[5] : null,
            'email'      => !empty($row[6]) ? trim((string)$row[6]) : null,
        ];

        if (empty($data['full_name'])) {
                return null;
       }

        if (empty($data['username'])) {
             $data['username'] = $this->generateUsername($data['full_name']);
        }

        // --- توليد username فريد من الـ cache بدل DB query لكل صف ---
        $base = $data['username'];
        $counter = 2;
        while (isset($this->existingUsernames[$data['username']])) {
            $data['username'] = $base . $counter;
            $counter++;
        }
        // أضف للـ cache حتى لا يتكرر بنفس الاستيراد
        $this->existingUsernames[$data['username']] = true;

        // تخطي إذا الإيميل موجود
        if ($data['email'] && isset($this->existingEmails[$data['email']])) {
            $data['email'] = null; // نحتفظ بالمستخدم بدون إيميل
        }
        if ($data['email']) {
            $this->existingEmails[$data['email']] = true;
        }

        // --- تحويل الدور للقيمة الداخلية ---
        $roleRaw = $data['role'];
        $role = $this->roleMap[$roleRaw] ?? null;

        if (empty($role)) {
            // لو ما انطبق — جرّب بدون حساسية للمسافات
            foreach ($this->roleMap as $key => $val) {
                if (mb_strtolower(trim($key)) === mb_strtolower($roleRaw)) {
                    $role = $val;
                    break;
                }
            }
        }

        if (empty($role)) {
            return null; // دور غير معروف — تخطي
        }

        // --- البحث عن القسم ---
        $departmentName = $data['department'];
        $department = Department::where('name', $departmentName)->first()
            ?? Department::where('name', 'LIKE', '%' . $departmentName . '%')->first();

        if (!$department) {
            return null; // القسم غير موجود — تخطي
        }

        // --- إنشاء المستخدم ---
        $password = !empty($data['password']) ? (string)$data['password'] : 'defaultpassword';

        $user = User::create([
            'full_name'  => $data['full_name'],
            'username'   => $data['username'],
            'password'   => Hash::make($password, ['rounds' => 4]),
            'study_year' => $data['study_year'],
            'email'      => $data['email'],
        ]);

        $user->assignRole($role);

        // --- إنشاء سجل الطبيب ---
        if (in_array($role, ['doctor', 'department_manager'])) {
            Doctor::create([
                'user_id'       => $user->id,
                'department_id' => $department->id,
            ]);
        }

        return $user;
    }

private function generateUsername(string $fullName, bool $forceUnique = false): string
{
    $base = explode(' ', $fullName)[0];
    $base = trim($base);

    if ($forceUnique) {
        $counter = 2;
        while (User::where('username', $base . $counter)->exists()) {
            $counter++;
        }
        return $base . $counter;
    }

    if (!isset($this->usernameCounter[$base])) {
        $this->usernameCounter[$base] = 1;
        return $base;
    } else {
        $this->usernameCounter[$base]++;
        return $base . $this->usernameCounter[$base];
    }
} 
}
<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{

  public function login(LoginRequest $request)
    {
        // التحقق من البيانات
        $data = $request->validate([
            'username' => 'required',
            'password' => 'required'
        ]);

        // محاولة تسجيل الدخول
        if (!Auth::attempt([
            'username'=>$data['username'],
            'password'=>$data['password']], true
        ))
        {
            return response()->json([
                'message' => 'الاسم أو كلمة المرور خاطئة'
            ],401);
        }
        
        $user = Auth::user();
        $token = $user->createToken('main')->plainTextToken;

        // تحميل الأدوار والصلاحيات والقسم بـ query واحدة
        $user->load('roles.permissions', 'doctor.department');
        $user->permissions = $user->getAllPermissions()->pluck('name');

        // إضافة اسم القسم يدوياً للـ response
        $departmentName = $user->doctor?->department?->name ?? '';

        return response()->json([
            'message' => 'تم تسجيل الدخول بنجاح',
            'user' => array_merge($user->toArray(), ['department_name' => $departmentName]),
            'token' => $token,
            'role' => $user->getRoleNames()->first() ?? ''
        ],200);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'تم تسجيل الخروج بنجاح'], 200);
    }
}


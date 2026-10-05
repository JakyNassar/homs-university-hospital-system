<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use App\Models\User;

class PermissionController extends Controller
{
    public function assignPermissionsToDoctors(Request $request)
{
       $request->validate([
            'doctors' => 'required|array',
        ]);

        foreach ($request->doctors as $doctorData) {
            $user = User::find($doctorData['doctor_id']);
            $user->syncPermissions($doctorData['permissions']);
        }

        return response()->json([
            'message' => 'تم تحديث الصلاحيات'
        ]);
    }
    public function getDoctorPermissions($id)
{
    $user = User::findOrFail($id);

    return response()->json([
        'permissions' => $user->getPermissionNames()
    ]);
}
    public function getUsersWithPermissions()
{
    $users = User::all()->map(function ($user) {

        $permissions = $user->getAllPermissions();

        if ($permissions->isEmpty()) return null;

        return [
            'id' => $user->id,
            'name' => $user->full_name,
            'permissions' => $permissions->pluck('name')
        ];
    })->filter()->values();

    return response()->json($users);
}
}

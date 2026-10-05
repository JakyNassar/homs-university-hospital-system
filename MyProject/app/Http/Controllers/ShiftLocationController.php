<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ShiftLocation;

class ShiftLocationController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        if (!$user->doctor){
            return response()->json(['message' => 'لا يوجد قسم'], 403);
        }

        $departmentId= $user->doctor->department_id;
        $shiftLocations = ShiftLocation::where('department_id', $departmentId)->get();
        return response()->json($shiftLocations);

    }
}

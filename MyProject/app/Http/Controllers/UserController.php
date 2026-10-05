<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Doctor;
use Spatie\Permission\Models\Role;
use Maatwebsite\Excel\Facades\Excel;
use App\Imports\UserImport;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query= User::withoutRole('admin')->with(['doctor.department', 'roles']);
        if ($request->search){
            $query->where(function ($q) use ($request){
                $q->where('full_name','like','%'.$request->search.'%')
                ->orWhere('username','like','%'.$request->search.'%')
                ->orWhereHas('roles',function($q) use ($request){
                    $q->where('name', 'like','%'.$request->search.'%');

                });
                
            });
        }
        $perPage = min((int)($request->per_page ?? 100), 1000);
        return $query->paginate($perPage);

    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $data=$request->validate([
            'full_name'=>'required|string|max:255',
            'username'=>'required|unique:users,username',
            'study_year'=>'required|in:1,2,3,4,5',
            'email' => 'nullable|email|unique:users,email',
            'password'=>'required|min:8',
            'role'=>'required|in:admin,department_manager,doctor',
    // إذا كان المستخدم طبيب أو رئيس قسم، سنحتاج دوره و قسمه
             
             'department_id' => 'required_if:role,doctor,department_manager|exists:departments,id',//مطلوب للطبيب و المدير ما عدا الأدمن
             
    ]);
    return DB::transaction(function () use ($data){
    
    // 1. إنشاء المستخدم في جدول users
    $user = User::create($data);

    $user->assignRole($data['role']);

    // 2. إذا كان الدور "طبيب"، أنشئ له سجلاً في جدول doctors
    if (in_array($data['role'],['doctor', 'department_manager'])) {
        $user->doctor()->create([
            'department_id' => $data['department_id'],

        ]);}
       return response()->json(['message'=>'تمت إضافة المستخدم بنجاح','user'=>$user->load('doctor.department', 'roles')]);
    });

    
        
    }
    
    /**
     * Display the specified resource.
     */
    public function show(User $user)
    {
        return $user->load('doctor.department');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, User $user)
    {
        $field=$request->validate([
            'full_name'=>'nullable|string|max:255',
            'username'=>'nullable|unique:users,username,'.$user->id,
            'study_year'=>'nullable|in:1,2,3,4,5',
            'email' => 'nullable|email|unique:users,email,' .$user->id,
            'password'=>'nullable|min:8',
            'role'=>'nullable|in:admin,department_manager,doctor',
           'department_id' => 'nullable|exists:departments,id',
        ]);

          return DB::transaction(function () use ($field, $user, $request) {
        if (empty($field['password'])) {
            unset($field['password']);
        } else {
            $field['password'] = bcrypt($field['password']);
        }

        $user->update($field);

        // تحديث بيانات القسم والتخصص في جدول doctors
        if (isset($field['role'])) {
            $user->syncRoles($field['role']);
        }
        $currentRole=$field['role'] ?? $user->roles->first()?->name;

        if ($currentRole !== 'doctor'){
        $field['study_year'] = null;
        }

        if (in_array($currentRole,['doctor', 'department_manager'])) {
        
            
            
            $user->doctor()->updateOrCreate(
                ['user_id' => $user->id],
                [ 'department_id' => $field['department_id']?? optional($user->doctor)->department_id]
                    
            );
        }else{
            if($user->doctor){
                $user->doctor()->delete();
            }
        }
       
    
        return response()->json(['message'=>'تم التحديث بنجاح','user'=>$user->load('doctor.department', 'roles')]);
    });
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(User $user)
    {
        if(auth()->id()=== $user->id){
            return response(['message' => 'لا يمكنك حذف حسابك الحالي'],403);
        }
        $user->delete();
        return response()->json(['message'=>'نجح الحذف']);
    }

    public function destroyAll()
    {
        return DB::transaction(function(){
            $adminId= auth()->id();
            $delete = User::where('id', '!=' , $adminId)->delete();
            return response()->json(['message'=> "تم حذف جميع المستخدمين($delete مستخدم)"]);
        });
    }

    public function getDepartmentDoctors(){
        $user = auth()->user();
        if (!$user->doctor){
            return response()->json(['message'=>'لا يوجد قسم'],400);
        }
        $departmentId= $user->doctor->department_id;
        $doctors = User::whereHas('doctor', function($q) use ($departmentId){
            $q->where('department_id' , $departmentId);
        })->get();

        return response()->json($doctors-> map(function($doc){
            return[
                'id' => $doc->id,
                'name' => $doc->full_name,
                 'study_year'=> $doc->study_year,
               
            ];
        }));

    }

    public function import(Request $request){
        ini_set('max_execution_time', 300);
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls',
        ]);

        try{
            Excel::import(new UserImport, $request->file('file'));
            $count= Doctor::count();
            return response()->json(['message' => 'تم استيراد الأطباء بنجاح', 'count' => $count]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'حدث خطأ أثناء استيراد الأطباء: ' . $e->getMessage()], 500);
        }
        
    }

public function getDoctorsInYear(Request $request)
{
    try {

        $query = Doctor::with([
            'user:id,full_name,study_year',
            'department:id,name'
        ]);

        // فلترة حسب السنة
        if ($request->filled('study_year')) {
            $query->whereHas('user', function ($q) use ($request) {
                $q->where('study_year', $request->study_year);
            });
        }

        // فلترة حسب القسم
        if ($request->filled('department_id')) {
            $query->where('department_id', $request->department_id);
        }

        $doctors = $query->get();

        $result = $doctors->map(function ($doctor) {

            return [
                'id'         => $doctor->user_id,
                'name'       => $doctor->user?->full_name,
                'department' => $doctor->department?->name ?? '',
                'year'       => $doctor->user?->study_year,
            ];

        });

        return response()->json([
            'status' => 'success',
            'data'   => $result
        ], 200);

    } catch (\Exception $e) {

        return response()->json([
            'status'  => 'error',
            'message' => $e->getMessage()
        ], 500);
    }
}

public function getDoctorsInYearByDepartment()
{
    try {
        $user = auth()->user();
        $departmentId = $user->doctor->department_id;

        $doctors = Doctor::with(['user:id,full_name,study_year', 'department:id,name'])
            ->where('department_id', $departmentId)
            ->whereHas('user', fn($q) => $q->whereBetween('study_year', [1, 5]))
            ->get();

        $grouped = [];
        foreach ($doctors as $doctor) {
            $user = $doctor->user;
            if (!$user) continue;
            $year = $user->study_year;
            $grouped[$year][] = [
                'id'         => $doctor->user_id,
                'name'       => $user->full_name,
                'department' => $doctor->department->name ?? '',
                'year'       => $year,
            ];
        }

        return response()->json(['status' => 'success', 'data' => $grouped], 200);
    } catch (\Exception $e) {
        return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
    }
}
}
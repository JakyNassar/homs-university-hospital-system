<?php

namespace App\Http\Controllers;

use App\Models\Doctor;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Notifications\YearPromotedNotification;
use App\Services\NotificationService;

class DoctorController extends Controller
{
    /**
     * الأقسام ذات 5 سنوات دراسية (باقي الأقسام تُعتبر 4 سنوات افتراضياً)
     */
    private const DEPARTMENTS_WITH_5_YEARS = [
        'جراحة عظمية',
        'جراحة عامة',
        'نسائية',
        'داخلية(قلبية)',
    ];

    /**
     * يرجع أقصى سنة دراسية مسموحة لقسم معيّن قبل التخرّج
     */
    private function getMaxYearForDepartment(?string $departmentName): int
    {
        return in_array($departmentName, self::DEPARTMENTS_WITH_5_YEARS, true) ? 5 : 4;
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $doctors = Doctor::with(['user', 'department'])->get();
        $data= $doctors->map(function($doc){
            return [
                'id' => $doc->user_id,
                'name' => $doc->user->full_name,
                'department' => $doc->department->name,
            ];
        });
        return  response()->json($data,200 ,['Content-Type' => 'application/json']);
    }

   
  
// بعد
public function updateStudyYear(Request $request) {
    // دفعات كبيرة (مئات الأطباء) بتاخذ وقت أطول لإرسال كل الإشعارات — نمنع انقطاع الطلب قبل ما يخلص
    ini_set('max_execution_time', 300);

    try {
        $notificationsToSend = [];

        $result = DB::transaction(function () use (&$notificationsToSend) {
            // ارفع سنة كل طبيب بواحد عبر حقل study_year في جدول المستخدمين المرتبطين
            $doctors = Doctor::with(['user', 'department'])->get();

            $promotedCount = 0;
            $graduatedCount = 0;

            foreach ($doctors as $doctor) {
                $user = $doctor->user;
                if (! $user) {
                    continue;
                }

                $maxYear = $this->getMaxYearForDepartment($doctor->department->name ?? null);

                $current = $user->study_year ?? 0;
                $new = $current + 1;

                if ($new > $maxYear) {
                    // احذف المستخدم وسجل الطبيب
                    $doctor->delete();
                    $user->delete();
                    $graduatedCount++;
                } else {
                    $user->previous_study_year = $current;
                    $user->study_year = $new;
                    $user->save();
                    $promotedCount++;

                    // ما منبعت الإشعار هلق — منجمعه ومنبعته بس بعد ما تنجح الـ transaction بالكامل
                    $notificationsToSend[] = [$user, $current, $new];
                }
            }

            return [$promotedCount, $graduatedCount];
        });

        [$promotedCount, $graduatedCount] = $result;

        // الـ transaction نجحت وتثبتت — هلق آمن نبعت الإشعارات
        // كل إشعار بمحاولة مستقلة: فشل إشعار واحد (مثلاً طبيب بدون إيميل) ما لازم يخرب الرد النهائي
        // بما إنه التعديل بقاعدة البيانات أصلاً تم ونجح
        foreach ($notificationsToSend as [$user, $current, $new]) {
            try {
                NotificationService::sendToUser($user, new YearPromotedNotification($current, $new));
                NotificationService::sendToAdmin(new YearPromotedNotification($current, $new));
            } catch (\Throwable $notifyError) {
                \Illuminate\Support\Facades\Log::warning(
                    "فشل إرسال إشعار الترقية للمستخدم #{$user->id}: " . $notifyError->getMessage()
                );
            }
        }

        return response()->json([
            'message' => "تم الترفيع بنجاح ({$promotedCount} طبيب تمت ترقيته, {$graduatedCount} تخرّج/حُذف)",
        ], 200);
    } catch (\Throwable $e) {
        return response()->json([
            'message' => 'حدث خطأ أثناء عملية الترفيع، لم يتم تعديل أي بيانات: ' . $e->getMessage(),
        ], 500);
    }
}

public function rollbackStudyYear()
{
    $users = User::whereNotNull('previous_study_year')->get();

    foreach ($users as $user) {

        $user->update([
        'study_year' => $user->previous_study_year,
        'previous_study_year' => null
       ]);
    }

    return response()->json([
        'message' => 'تم التراجع عن الترفيع'
    ]);
}
   public function getDoctors(Request $request)
{
    $query = Doctor::with(['user', 'department'])->whereHas('department', function($query){
        $query->where('name', '!=', 'تخدير');
    })->get();
     return response()->json($query ->map(function($q){
        return [
            'id' => $q->user_id,
            'name' => $q->user->full_name?? null,
            'study_year' => $q->user->study_year??null,
            'department' => $q->department->name??null,
        ];
    }));;
}
public function getAnesDoctors(Request $request)
{
     $doctor = Doctor::with(['user', 'department'])->whereHas('department', function($query){
        $query->where('name', '=', 'تخدير');
    })->get();
    return response()->json($doctor ->map(function($doc){
        return [
            'id' => $doc->user_id,
            'name' => $doc->user->full_name?? null,
            'study_year' => $doc->user->study_year??null,
            'department' => $doc->department->name??null,
        ];
    }));
}

/**
 * جلب الأطباء حسب سنة دراسية محددة — ضمن قسم المستخدم المسجّل دخول فقط
 * مثال: GET /api/doctors-by-year?study_year=3
 */
public function getDoctorsByYear(Request $request)
{
    $request->validate([
        'study_year' => 'required|integer|min:1|max:5',
    ]);

    $authUser = auth()->user();

    if (!$authUser->doctor) {
        return response()->json([
            'status'  => 'error',
            'message' => 'لا يوجد قسم مرتبط بحسابك',
        ], 403);
    }

    $departmentId = $authUser->doctor->department_id;

    $doctors = Doctor::with(['user', 'department'])
        ->where('department_id', $departmentId)
        ->whereHas('user', function ($q) use ($request) {
            $q->where('study_year', $request->study_year);
        })
        ->get();

    $data = $doctors->map(function ($doc) {
        return [
            'id'         => $doc->user_id,
            'name'       => $doc->user->full_name ?? null,
            'study_year' => $doc->user->study_year ?? null,
            'department' => $doc->department->name ?? null,
        ];
    });

    return response()->json([
        'status' => 'success',
        'data'   => $data,
    ], 200);
}

public function updateStudyYearExclude(Request $request)
{
    // دفعات كبيرة (مئات الأطباء) بتاخذ وقت أطول لإرسال كل الإشعارات — نمنع انقطاع الطلب قبل ما يخلص
    ini_set('max_execution_time', 300);

    // تحقق صريح إنه excluded_ids مصفوفة IDs موجودة فعلاً بجدول users
    $validated = $request->validate([
        'excluded_ids'   => 'nullable|array',
        'excluded_ids.*' => 'integer|exists:users,id',
    ]);

    // تحويل صريح للأرقام حتى تنجح المقارنة بـ in_array بغض النظر شو نوع البيانات الجاي من الفرونت (string/int)
    $excludedIds = array_map('intval', $validated['excluded_ids'] ?? []);

    try {
        $notificationsToSend = [];

        $result = DB::transaction(function () use ($excludedIds, &$notificationsToSend) {
            $doctors = Doctor::with(['user', 'department'])->get();

            $promotedCount = 0;
            $graduatedCount = 0;
            $excludedCount = 0;

            foreach ($doctors as $doctor) {
                $user = $doctor->user;
                if (!$user) continue;

                // إذا الطبيب من الراسبين — تجاهله، ما تعمل شي
                if (in_array((int) $doctor->user_id, $excludedIds, true)) {
                    $excludedCount++;
                    continue;
                }

                $maxYear = $this->getMaxYearForDepartment($doctor->department->name ?? null);

                $current = $user->study_year ?? 0;
                $new = $current + 1;

                if ($new > $maxYear) {
                    $doctor->delete();
                    $user->delete();
                    $graduatedCount++;
                } else {
                    $user->update(['study_year' => $new, 'previous_study_year' => $current]);
                    $promotedCount++;

                    // ما منبعت الإشعار هلق — منجمعه ومنبعته بس بعد ما تنجح الـ transaction بالكامل
                    $notificationsToSend[] = [$user, $current, $new];
                }
            }

            return [$promotedCount, $excludedCount, $graduatedCount];
        });

        [$promotedCount, $excludedCount, $graduatedCount] = $result;

        // الـ transaction نجحت وتثبتت — هلق آمن نبعت الإشعارات
        // كل إشعار بمحاولة مستقلة: فشل إشعار واحد ما لازم يخرب الرد النهائي
        foreach ($notificationsToSend as [$user, $current, $new]) {
            try {
                NotificationService::sendToUser($user, new YearPromotedNotification($current, $new));
                NotificationService::sendToAdmin(new YearPromotedNotification($current, $new));
            } catch (\Throwable $notifyError) {
                \Illuminate\Support\Facades\Log::warning(
                    "فشل إرسال إشعار الترقية للمستخدم #{$user->id}: " . $notifyError->getMessage()
                );
            }
        }

        return response()->json([
            'message' => "تم الترفيع باستثناء الراسبين بنجاح ({$promotedCount} ترقية, {$excludedCount} راسب مستثنى, {$graduatedCount} تخرّج/حُذف)",
        ], 200);
    } catch (\Throwable $e) {
        return response()->json([
            'message' => 'حدث خطأ أثناء عملية الترفيع، لم يتم تعديل أي بيانات: ' . $e->getMessage(),
        ], 500);
    }
}
}
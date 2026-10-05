<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use App\Services\ShiftSchedulerService;
use App\Models\Shift;
use Carbon\Carbon;
use App\Models\DoctorLeave;

class ScheduleController extends Controller
{
    public function generate(Request $request)
    {
        $request->validate([
        'config.from_date'     => 'required|date',
        'config.to_date'       => 'required|date|after:config.from_date',
        'config.periods_per_day' => 'required|integer|min:1|max:5',
        'config.year_daily_quotas'   => 'nullable|array',
        'config.year_daily_quotas.*' => 'nullable|integer|min:0',
    ], [
        'config.from_date.required'    => 'تاريخ البداية مطلوب.',
        'config.from_date.date'        => 'تاريخ البداية غير صحيح.',
        'config.to_date.required'      => 'تاريخ النهاية مطلوب.',
        'config.to_date.date'          => 'تاريخ النهاية غير صحيح.',
        'config.to_date.after'         => 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية.',
        'config.periods_per_day.required' => 'عدد الفترات مطلوب.',
        'config.periods_per_day.integer'  => 'عدد الفترات يجب أن يكون رقماً صحيحاً.',
        'config.periods_per_day.min'      => 'عدد الفترات يجب أن يكون على الأقل 1.',
        'config.periods_per_day.max'      => 'عدد الفترات لا يمكن أن يتجاوز 5.',
    ]);

        $from = Carbon::parse($request->config['from_date']);
        $to = Carbon::parse($request->config['to_date']);
        if ($from->diffInDays($to)>60) {
            return response()->json(['message' => ' لا يمكن توليد جدول لأكثر من 60 يوم'], 422);
        }

         try {
        $service = new ShiftSchedulerService(
            $request->constraints,
            $request->config,
            $request->user()
        );
        $availableDoctors = $service->getDoctorsCount();
    foreach ($request->config['periods'] as $index => $period) {
        if ((int)$period['doctors'] > $availableDoctors) {
            return response()->json([
                'message' => 'الفترة ' . ($index + 1) . ' تطلب ' . $period['doctors'] . ' أطباء لكن المتاح في القسم ' . $availableDoctors . ' فقط.'
            ], 422);
        }
        if (!empty($request->config['study_year_quotas'])) {
        $totalQuota = array_sum($request->config['study_year_quotas']);
        if ($totalQuota > $availableDoctors) {
            return response()->json([
                'message' => 'مجموع الأطباء المطلوبين حسب السنة (' . $totalQuota . ') يتجاوز عدد الأطباء المتاحين (' . $availableDoctors . ').'
            ], 422);
        }
    }
    }

    if (!empty($request->config['year_daily_quotas'])) {
        $dailyQuotas     = $request->config['year_daily_quotas'];
        $totalDailyQuota = array_sum($dailyQuotas);

        // السعة اليومية الكلية = مجموع عدد الأطباء بكل الفترات
        $totalDailyCapacity = array_sum(array_column($request->config['periods'], 'doctors'));
        if ($totalDailyQuota > $totalDailyCapacity) {
            return response()->json([
                'message' => 'مجموع الأطباء المطلوبين يومياً حسب السنة (' . $totalDailyQuota . ') يتجاوز السعة اليومية المتاحة بكل الفترات (' . $totalDailyCapacity . ').'
            ], 422);
        }

        if ($totalDailyQuota > $availableDoctors) {
            return response()->json([
                'message' => 'مجموع الأطباء المطلوبين يومياً حسب السنة (' . $totalDailyQuota . ') يتجاوز عدد الأطباء المتاحين في القسم (' . $availableDoctors . ').'
            ], 422);
        }

        if (!empty($request->config['study_year_quotas'])) {
            foreach ($dailyQuotas as $index => $daily) {
                $totalForYear = (int) ($request->config['study_year_quotas'][$index] ?? 0);
                if ((int) $daily > $totalForYear) {
                    return response()->json([
                        'message' => 'الطلب اليومي للسنة ' . ($index + 1) . ' (' . $daily . ') لا يمكن أن يتجاوز إجمالي الأطباء الموزّعين لتلك السنة (' . $totalForYear . ').'
                    ], 422);
                }
            }
        }
    }
        $result = $service->generate();
        return response()->json($result, empty($result['warnings']) ? 200 : 206);

    } catch (\RuntimeException $e) {
        // أخطاء متوقعة من الـ Service (لا أطباء، لا قسم...)
        return response()->json(['message' => $e->getMessage()], 400);

    } catch (\Exception $e) {
        // أي خطأ تاني غير متوقع
        return response()->json(['message' => 'حدث خطأ غير متوقع أثناء إنشاء الجدول.'], 500);
    }
    }

    
    public function saveSchedule(Request $request)
    {
        $request->validate([

            'schedule'               => 'required|array',
            'schedule.*.user_id'     => 'required|exists:users,id',
            'schedule.*.location_id' => 'required|exists:shift_locations,id',
            'schedule.*.date'        => 'required|date',
            'schedule.*.start_time'  => 'required|date_format:H:i:s',
            'schedule.*.end_time'    => 'required|date_format:H:i:s',
            'schedule.*.period'      => 'nullable|integer|min:1',
        ], [
            'schedule.required'              => 'بيانات الجدول مطلوبة.',
            'schedule.*.user_id.required'    => 'معرّف الطبيب مطلوب.',
            'schedule.*.user_id.exists'      => 'الطبيب المحدد غير موجود.',
            'schedule.*.location_id.exists'  => 'الموقع المحدد غير موجود.',
            'schedule.*.date.required'       => 'تاريخ المناوبة مطلوب.',
            'schedule.*.start_time.required' => 'وقت البدء مطلوب.',
            'schedule.*.end_time.required'   => 'وقت الانتهاء مطلوب.',
            'schedule.*.start_time.date_format' => 'صيغة وقت البدء يجب أن تكون H:i:s.',]);
          $user = auth()->user();

        $userDepartmentId=$user->doctor->department_id;
        DB::beginTransaction();
        try {
             foreach ($request->schedule as $shift) {
                $shift['department_id']= $userDepartmentId;
                Shift::create($shift);
             }
                DB::commit();
                return response()->json(['message' => 'تم الحفظ']);
    } catch (\Exception $e) {
        DB::rollBack();
        return response()->json(['message' => 'حدث خطأ أثناء الحفظ', 'error' => $e->getMessage()], 500);
    }
    }

    function doctorAvailable(Request $request){
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'from_date' => 'required|date',
            'to_date' => 'required|date|after_or_equal:from_date',
        ]);
        
        $exists = DoctorLeave::where('user_id', $request->user_id)
            ->where('from_date', '<=', $request->to_date)
            ->where('to_date',   '>=', $request->from_date)
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'يوجد إجازة مسجلة لهذا الطبيب في نفس الفترة'], 422);
        }

        DoctorLeave::create($request->all());
        return response()->json(['message' => 'تم تسجيل الإجازة']);

        
    }
}
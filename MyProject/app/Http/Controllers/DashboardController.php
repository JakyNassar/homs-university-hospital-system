<?php

namespace App\Http\Controllers;

use App\Models\Surgery;
use App\Models\Shift;
use App\Models\AuditLog;
use App\Models\Department;
use Illuminate\Http\Request;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $today    = $request->has('date') ? Carbon::parse($request->date) : Carbon::today();
        $tomorrow = $today->copy()->addDay();

        // ════════════════════════════════════════════════════════════
        // Summary Cards — الأساسية
        // ════════════════════════════════════════════════════════════
        $surgeriesToday = Surgery::whereDate('date', $today)->count();

        $doctorsToday = Shift::whereDate('date', $today)
            ->distinct('user_id')
            ->count('user_id');

        // ════════════════════════════════════════════════════════════
        // Summary Cards — ساعات المناوبات لكل قسم اليوم
        // ════════════════════════════════════════════════════════════
        $shiftsByDept = Shift::whereDate('date', $today)
            ->with('department')
            ->get()
            ->groupBy('department_id')
            ->map(function ($shifts) {
                // احسب مجموع الساعات لكل مناوبة في هذا القسم
                $totalMinutes = $shifts->sum(function ($shift) {
                    $start = Carbon::parse($shift->start_time);
                    $end   = Carbon::parse($shift->end_time);

                    // لو نهاية المناوبة قبل البداية يعني عابرة لليوم التالي
                    if ($end->lt($start)) {
                        $end->addDay();
                    }

                    return $start->diffInMinutes($end);
                });

                return [
                    'department'   => $shifts->first()->department?->name ?? 'غير محدد',
                    'total_hours'  => round($totalMinutes / 60, 1),
                    'shift_count'  => $shifts->count(),
                ];
            })
            ->values();

        // إجمالي ساعات كل الأقسام
        $totalShiftHours = $shiftsByDept->sum('total_hours');

        // متوسط ساعات القسم الواحد
        $avgHoursPerDept = $shiftsByDept->count() > 0
            ? round($totalShiftHours / $shiftsByDept->count(), 1)
            : 0;

        // ════════════════════════════════════════════════════════════
        // Surgeries Table
        // ════════════════════════════════════════════════════════════
        $surgeriesTable = Surgery::whereDate('date', $today)
            ->with(['department', 'creator'])
            ->orderBy('number')
            ->get()
            ->map(fn($s) => [
                'id'                => $s->id,
                'number'            => $s->number,
                'surgery_name'      => $s->surgery_name,
                'specialist_doctor' => $s->specialist_doctor,
                'patient_name'      => $s->patient_name,
                'department'        => $s->department?->name,
                'date'              => $s->date,
                'status'            => $s->status ?? 'مجدولة',
            ]);

        // ════════════════════════════════════════════════════════════
        // Doctors Table — مناوبات اليوم
        // ════════════════════════════════════════════════════════════
        $doctorsTable = Shift::whereDate('date', $today)
            ->with(['user', 'department', 'location'])
            ->get()
            ->map(fn($s) => [
                'id'         => $s->id,
                'userName'   => $s->user?->full_name,
                'specialty'  => $s->department?->name,
                'location'   => $s->location?->name,
                'study_year' => $s->user?->study_year,
                'start_time' => $s->start_time,
                'end_time'   => $s->end_time,
            ]);

        // ════════════════════════════════════════════════════════════
        // Tomorrow Shifts — مناوبات الغد
        // ════════════════════════════════════════════════════════════
        $tomorrowShifts = Shift::whereDate('date', $tomorrow)
            ->with(['user', 'department', 'location'])
            ->orderBy('start_time')
            ->get()
            ->map(fn($s) => [
                'id'         => $s->id,
                'userName'   => $s->user?->full_name,
                'specialty'  => $s->department?->name,
                'location'   => $s->location?->name,
                'study_year' => $s->user?->study_year,
                'date'       => $s->date,
                'start_time' => $s->start_time,
                'end_time'   => $s->end_time,
            ]);

        // ════════════════════════════════════════════════════════════
        // Audit Logs سجل التعديلات
        // ════════════════════════════════════════════════════════════
        $auditlogs = AuditLog::with(['user.doctor.department', 'user.roles'])
            ->latest('action_time')
            ->take(20)
            ->get()
            ->map(fn($log) => [
                'id'                => $log->id,
                'specialist_doctor' => $log->user?->full_name,
                'role'              => $log->user?->roles->first()?->name ?? 'غير محدد',
                'specialty'         => $log->user?->doctor?->department?->name ?? 'غير محدد',
                'date'              => $log->action_time?->format('Y-m-d'),
                'time'              => $log->action_time?->format('H:i'),
                'action_type'       => $log->action_type,
                'action_label'      => $this->getActionLabel($log->action_type, $log->entity_modified),
                'action_icon'       => $this->getActionIcon($log->action_type),
                'entity'            => $log->entity_modified,
                // تفاصيل العملية — مين المناوبة لمين، أي عملية، شو تغير
                // عند الحذف: new_value دايمًا فاضي '{}'، فالتفاصيل الفعلية (التاريخ، الاسم...) موجودة بس بالـ old_value
                'details'           => $log->action_type === 'delete'
                    ? (json_decode($log->old_value, true) ?: [])
                    : (json_decode($log->new_value, true) ?: []),
                'old_details'       => json_decode($log->old_value, true) ?: [],
                'deleted_by'        => ($log->action_type === 'delete')
                    ? ($log->user?->full_name ?? 'غير معروف')
                    : null,
            ]);

        // ════════════════════════════════════════════════════════════
        // Chart Data — توزيع العمليات حسب القسم
        // ════════════════════════════════════════════════════════════
        $chartData = Surgery::whereDate('date', $today)
            ->with('department')
            ->get()
            ->groupBy('department_id')
            ->map(fn($group) => [
                'department' => $group->first()->department?->name ?? 'غير محدد',
                'count'      => $group->count(),
            ])
            ->values();

        // ════════════════════════════════════════════════════════════
        // Alerts — تنبيهات ذكية
        // ════════════════════════════════════════════════════════════
        $alerts = $this->buildAlerts($today);

        // DEBUG — شيله بعد ما تتأكد
        $weekStart2 = $today->copy()->subDays(6);
        $debugHours = Shift::whereBetween('date', [$weekStart2, $today])
            ->get()
            ->groupBy('user_id')
            ->map(fn($shifts) => [
                'user'  => $shifts->first()->user?->full_name,
                'hours' => round($shifts->sum(function($s) {
                    $start = Carbon::parse($s->start_time);
                    $end   = Carbon::parse($s->end_time);
                    if ($end->lt($start)) $end->addDay();
                    return $start->diffInMinutes($end);
                }) / 60, 1),
            ]);

        return response()->json([
            'summaryCards' => [
                'surgeriesToday'  => $surgeriesToday,
                'doctorsToday'    => $doctorsToday,
                'totalShiftHours' => $totalShiftHours,
                'avgHoursPerDept' => $avgHoursPerDept,
                'alertsCount'     => count($alerts),
            ],
            'shiftsByDept'   => $shiftsByDept,
            'surgeriesTable' => $surgeriesTable,
            'doctorsTable'   => $doctorsTable,
            'tomorrowShifts' => $tomorrowShifts,
            'auditlogs'      => $auditlogs,
            'chartData'      => $chartData,
            'alerts'         => $alerts,
            'debug_hours'    => $debugHours,
        ]);
    }

    // ════════════════════════════════════════════════════════════════
    // Helper — جملة واضحة لكل نوع عملية
    // ════════════════════════════════════════════════════════════════
    private function getActionLabel(string $actionType, string $entity): string
    {
        // ترجمة اسم الجدول للعربي
        $entityNames = [
            'surgeries'  => 'عملية جراحية',
            'shifts'     => 'مناوبة',
            'doctors'    => 'طبيب',
            'users'      => 'مستخدم',
            'departments'=> 'قسم',
        ];

        $entityAr = $entityNames[$entity] ?? $entity;

        return match ($actionType) {
            'create' => "تمت إضافة {$entityAr} جديدة",
            'update' => "تم تعديل بيانات {$entityAr}",
            'delete' => "تم حذف {$entityAr}",
            default  => $actionType,
        };
    }

    // ════════════════════════════════════════════════════════════════
    // Helper — أيقونة لكل نوع عملية (Heroicons / Lucide names)
    // ════════════════════════════════════════════════════════════════
    private function getActionIcon(string $actionType): string
    {
        return match ($actionType) {
            'create' => '➕',
            'update' => '✏️',
            'delete' => '🗑️',
            default  => 'ℹ️',
        };
    }

    // ════════════════════════════════════════════════════════════════
    // Helper — بناء التنبيهات الذكية
    // ════════════════════════════════════════════════════════════════
    private function buildAlerts(Carbon $today): array
    {
        $alerts = [];

        // جلب كل الأقسام
        $allDepartments = Department::all();

        // الأقسام اللي عندها مناوبات اليوم
        $coveredDeptIds = Shift::whereDate('date', $today)
            ->pluck('department_id')
            ->unique();

        // تنبيه: أقسام بدون أي مناوبة اليوم
        foreach ($allDepartments as $dept) {
            if (!$coveredDeptIds->contains($dept->id)) {
                $alerts[] = [
                    'type'    => 'no_coverage',
                    'level'   => 'danger',
                    'icon'    => 'building-hospital',
                    'title'   => 'قسم بدون تغطية',
                    'message' => "قسم {$dept->name} لا يوجد له أي مناوبة اليوم",
                ];
            }
        }

        // آخر 7 أيام
        $weekStart = $today->copy()->subDays(6);
        $overworked = Shift::whereBetween('date', [$weekStart, $today])
            ->with('user')
            ->get()
            ->groupBy('user_id')
            ->filter(function ($shifts) {
                $totalMinutes = $shifts->sum(function ($shift) {
                    $start = Carbon::parse($shift->start_time);
                    $end   = Carbon::parse($shift->end_time);
                    if ($end->lt($start)) $end->addDay();
                    return $start->diffInMinutes($end);
                });
                return ($totalMinutes / 60) > 48;
            });

        foreach ($overworked as $userId => $shifts) {
            $name         = $shifts->first()->user?->full_name ?? 'غير معروف';
            $totalHours   = round($shifts->sum(function ($shift) {
                $start = Carbon::parse($shift->start_time);
                $end   = Carbon::parse($shift->end_time);
                if ($end->lt($start)) $end->addDay();
                return $start->diffInMinutes($end);
            }) / 60, 1);

            $alerts[] = [
                'type'    => 'overwork',
                'level'   => 'warning',
                'icon'    => 'clock-alert',
                'title'   => 'تجاوز حد الساعات',
                'message' => "{$name} اشتغل {$totalHours} ساعة هذا الأسبوع (الحد 48 ساعة)",
            ];
        }

        // تنبيه: تعارض مناوبات (نفس المقيم لديه مناوبتين متداخلتين باليوم نفسه)
        $todayShifts = Shift::whereDate('date', $today)
            ->orderBy('user_id')
            ->orderBy('start_time')
            ->get()
            ->groupBy('user_id');

        // تنبيه: مقيم عنده أكثر من مناوبة بنفس اليوم
        foreach ($todayShifts as $userId => $userShifts) {
            if ($userShifts->count() >= 2) {
                $name     = $userShifts->first()->user?->full_name ?? 'غير معروف';
                $count    = $userShifts->count();
                $date     = Carbon::parse($userShifts->first()->date)->format('Y-m-d');
                $alerts[] = [
                    'type'    => 'multiple_shifts',
                    'level'   => 'warning',
                    'icon'    => 'calendar-x',
                    'title'   => 'مناوبات متعددة',
                    'message' => "{$name} لديه {$count} مناوبات في يوم {$date}",
                ];
            }
        }

        return $alerts;
    }
}
<?php

namespace App\Http\Controllers;


use Illuminate\Http\Request;
use App\Models\Shift;
use App\Models\User;
use Carbon\Carbon;
use App\Models\Department;
use Mpdf\Mpdf;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\SimpleType\JcTable;
use PhpOffice\PhpWord\Shared\Html;
use PhpOffice\PhpWord\IOFactory as WordIOFactory;
use App\Notifications\ShiftAddedNotification;
use App\Notifications\ShiftUpdatedNotification;
use App\Notifications\ShiftDeletedNotification;
use App\Services\NotificationService;


class ShiftController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $authUser = auth()->user();
        $query = Shift::query()->with(['user:id,full_name,study_year', 'location:id,name', 'department:id,name']);

        $deptId = $request->input('department_id');
        if ($authUser->hasRole('department_manager') && !$request->filled('department_id')) {
            $deptId = $authUser->doctor->department_id ?? null;
        }

        $query->when($deptId, fn($q) => $q->where('department_id', $deptId));
        $query->when($request->boolean('only_mine'), fn($q) => $q->where('user_id', $authUser->id));

        // فلتر الشهر — افتراضياً الشهر الحالي، أو الشهر المطلوب من الفرونت
        if ($request->filled('year') && $request->filled('month')) {
            $start = Carbon::createFromDate($request->year, $request->month, 1)->startOfMonth();
            $end   = $start->copy()->endOfMonth();
        } else {
            $start = Carbon::now()->startOfMonth();
            $end   = Carbon::now()->endOfMonth();
        }
        $query->whereBetween('date', [$start->format('Y-m-d'), $end->format('Y-m-d')]);

        if ($request->boolean('only_mine')) {
            $departmentName = "مناوباتي";
        } elseif ($request->filled('department_id')) {
            $departmentName = optional(Department::find($deptId))->name ?? 'غير محدد';
        } else {
            $departmentName = "جميع المناوبات";
        }

        $shifts = $query->get();

        if ($shifts->isEmpty()) {
            return response()->json(['message' => 'لا توجد مناوبات', 'shifts' => [], 'department_name' => $departmentName], 200);
        }

        return response()->json([
            'department_name' => $departmentName,
            'shifts' => $shifts->map(fn($shift) => [
                'id'         => $shift->id,
                'doctor'     => $shift->user->full_name,
                'year'       => $shift->user->study_year,
                'place'      => $shift->location->name,
                'department' => $shift->department->name ?? 'غير محدد',
                'date'       => $shift->date,
                'startTime'  => Carbon::parse($shift->start_time)->format('H:i'),
                'endTime'    => Carbon::parse($shift->end_time)->format('H:i'),
            ])
        ]);
        
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $data=$request->validate([
            'date'=>'required|date',
            'user_id'=>'required|exists:users,id',
            'location_id'=>'required|exists:shift_locations,id',
            'start_time'=>'required',
            'end_time'=>'required', // إزالة after:start_time لدعم المناوبات الليلية

        ]);
        $data['start_time'] = Carbon::parse($data['start_time'])->format('H:i');
        $data['end_time'] = Carbon::parse($data['end_time'])->format('H:i');

        $shiftDateTime = Carbon::parse($data['date'] . ' ' . $data['start_time']);
        $currentDateTime = Carbon::now();
          if ($shiftDateTime->isBefore($currentDateTime)) {
          return response()->json([ 'message' => 'عذراً! لا يمكن حجز مناوبة بتاريخ أو وقت قديم. يجب أن تكون المناوبة في الوقت الحالي أو مستقبلاً '  ], 400); }
        $authUser= auth()->user();
        

        //تأكد أن المستخدم لديه قسم
        
        if (!$authUser->doctor){
            return response()->json(['message'=>'لا يوجد قسم'],400);
        }
        
        //تحديد القسم تلقائياً
        $data ['department_id'] = $authUser->doctor->department_id;
        $doctor=User::with('doctor')->findOrFail($data['user_id']);
            
        //صلاحيات الطبيب
        if ($authUser->hasRole('doctor')&& !$authUser->can('create_shifts'))
            {
               
                return response()->json(['message'=>'ليس لديك صلاحية'],403);

            }

        //الطبيب لازم يكون من نفس القسم
        if(!$doctor->doctor || $doctor->doctor->department_id!= $data['department_id']){
            return response()->json(['message'=>'الطبيب لا ينتمي لهذا القسم'],400);
        }

        
    

        $shift = Shift::create($data);

        // ── تعيين UID ثابت وفريد للمناوبة الجديدة للاستخدام في التقويم ─────────
        // نستخدم الـ id بعد الإنشاء لضمان التفرد، وهيك يكون مقروءاً عند التتبع
        $shift->update([
            'ics_uid'      => 'shift-' . $shift->id . '@hospital',
            'ics_sequence' => 0,
        ]);
        // ────────────────────────────────────────────────────────────────────────

        // إرسال إشعار لكل أطباء القسم (الطبيب المعين يستلم دعوة تقويم، الباقون إشعار عادي)
        $shift->load(['user', 'department', 'location']);

        // إشعار للطبيب المعين فقط — الأدمن يأخذ نسخة تلقائياً
        $assignedDoctor = User::find($data['user_id']);
        // إرسال الإشعار بعد الـ response مباشرة — بدون تأخير للمستخدم
        app()->terminating(function () use ($assignedDoctor, $shift) {
            NotificationService::sendToUser($assignedDoctor, new ShiftAddedNotification($shift));
        });

        return response()->json([
            'message'=> 'تمت الإضافة بنجاح' , 
            'shift' => $shift]);
    }


    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $shift = Shift::findOrFail($id);

    $data = $request->validate([
        'user_id' => 'nullable|exists:users,id',
        'location_id' => 'nullable|exists:shift_locations,id',
        'date' => 'nullable|date_format:Y-m-d',
        'start_time' => 'nullable',
        'end_time' => 'nullable',
    ]);

    // تحويل الوقت إلى صيغة 24 ساعة
    if ($request->has('start_time') && $data['start_time']) {
        $data['start_time'] = Carbon::parse($data['start_time'])->format('H:i');
    }
    if ($request->has('end_time') && $data['end_time']) {
        $data['end_time'] = Carbon::parse($data['end_time'])->format('H:i');
    }

    // تنظيف البيانات من القيم الفارغة
    $updateData = array_filter($data);

    $authUser = auth()->user();

    // تأكد أن المستخدم لديه قسم مرتبط
    if (!$authUser->doctor){
        return response()->json(['message'=>'لا يوجد قسم للمستخدم الحالي'], 400);
    }

    $department_id = $authUser->doctor->department_id;
    $userId = $updateData['user_id'] ?? $shift->user_id;
    $locationId = $updateData['location_id'] ?? $shift->location_id;
    $date = $updateData['date'] ?? $shift->date;
    $startTime = $updateData['start_time'] ?? $shift->start_time;
    $endTime = $updateData['end_time'] ?? $shift->end_time;
    $targetDateTime = Carbon::parse($date . ' ' . $startTime);
    if ($targetDateTime->isBefore(Carbon::now())) {
        return response()->json([ 'message' => 'عذراً! لا يمكن تعديل المناوبة إلى تاريخ أو وقت قديم '], 400); }
    $doctor = User::with('doctor')->findOrFail($userId);

    // صلاحيات الطبيب
    if ($authUser->hasRole('doctor') && !$authUser->can('update_shifts')) {
        return response()->json(['message'=>'ليس لديك صلاحية'], 403);
    }

    // نفس القسم
    if (!$doctor->doctor || $doctor->doctor->department_id != $department_id) {
        return response()->json(['message'=>'الطبيب لا ينتمي لهذا القسم'], 400);
    }

    // --- فحص التعارض الذكي ---
    $conflict = Shift::where('user_id', $userId)
        ->where('date', $date)
        ->where('id', '!=', $shift->id)
        ->where(function ($q) use ($startTime, $endTime) {
            if ($startTime < $endTime) {
                $q->where(function ($query) use ($startTime, $endTime) {
                    $query->where('start_time', '<', $endTime)
                          ->where('end_time', '>', $startTime);
                });
            } else {
                $q->where(function ($query) use ($startTime, $endTime) {
                    $query->where('start_time', '>=', $startTime)
                          ->orWhere('end_time', '<=', $endTime)
                          ->orWhere(function ($sub) use ($startTime, $endTime) {
                              $sub->where('start_time', '<', $endTime)
                                  ->where('end_time', '>', $startTime);
                          });
                });
            }
        })
        ->exists();

    if ($conflict) {
        return response()->json(['message'=>'يوجد تعارض في مناوبات هذا الطبيب في نفس اليوم'], 400);
    }

    // ── رفع SEQUENCE بواحد حتى يتعرف التقويم أن هذا تحديث وليس حدثاً جديداً ─
    $updateData['ics_sequence'] = ($shift->ics_sequence ?? 0) + 1;
    // ────────────────────────────────────────────────────────────────────────

    $shift->update($updateData);

    // إرسال إشعار تعديل للطبيب المعني (يتضمن دعوة تقويم محدّثة)
    $shift->load(['user', 'department', 'location']); // ← أضفنا location
    if ($shift->user) {
        app()->terminating(function () use ($shift) {
        NotificationService::sendToUser($shift->user, new ShiftUpdatedNotification($shift));
    });
    }

    return response()->json([
        'message' => 'تم التعديل بنجاح',
        'shift' => $shift
    ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $shift = Shift::findOrFail($id);
        $authUser = auth()->user();

        //تأكد أن المستخدم لديه قسم
        
        if (!$authUser->doctor){
            return response()->json(['message'=>'لا يوجد قسم'],400);
        }

        if ($authUser->hasRole('department_manager')) {
            if ($shift->department_id != $authUser->doctor->department_id) {
                return response()->json(['message'=>'لا يمكنك الحذف خارج قسمك'],403);
            }
        }
        //صلاحيات الطبيب
        if ($authUser->hasRole('doctor')&& !$authUser->can('delete_shifts'))
            {
               
                return response()->json(['message'=>'ليس لديك صلاحية'],403);

            }

        // ── نجمع كل البيانات اللازمة لـ ICS Cancel قبل الحذف ────────────────
        // (بعد الحذف ما رح نقدر نوصل للـ relations)
        $shift->loadMissing(['user', 'location']);
        $shiftInfo = [
            'id'            => $shift->id,
            'date'          => $shift->date,
            'start_time'    => $shift->start_time,
            'end_time'      => $shift->end_time,
            'department_id' => $shift->department_id,
            'ics_uid'       => $shift->ics_uid,
            // SEQUENCE يرتفع بواحد في الإلغاء أيضاً
            'ics_sequence'  => ($shift->ics_sequence ?? 0) + 1,
            'location_name' => optional($shift->location)->name ?? '',
        ];
        $shiftOwner = $shift->user;
        // ────────────────────────────────────────────────────────────────────

        $shift->delete();

        // إرسال إشعار إلغاء للطبيب (يتضمن METHOD:CANCEL لحذفه من تقويمه)
        if ($shiftOwner) {
            app()->terminating(function () use ($shiftOwner, $shiftInfo) {
            NotificationService::sendToUser($shiftOwner, new ShiftDeletedNotification($shiftInfo));
        });
        }

        return response()->json([
            'message' => 'تم الحذف'
        ]);
    }

    public function getDoctorShifts($userId)
    {
        $shifts = Shift::where('user_id', $userId)
            ->where('date', '>=', now()->format('Y-m-d'))
            ->with('location')
            ->orderBy('date', 'asc')
            ->get();

        return response()->json($shifts);
    }

    public function departmentShifts(Request $request)
    {
        $user = auth()->user();

        if (!$user->doctor) {
            return response()->json(['message' => 'لا يوجد قسم'], 400);
        }

        $department = $user->doctor->department;

        // فلتر الشهر
        if ($request->filled('year') && $request->filled('month')) {
            $start = Carbon::createFromDate($request->year, $request->month, 1)->startOfMonth();
            $end   = $start->copy()->endOfMonth();
        } else {
            $start = Carbon::now()->startOfMonth();
            $end   = Carbon::now()->endOfMonth();
        }

        $shifts = Shift::with(['user:id,full_name,study_year', 'location:id,name', 'department:id,name'])
            ->where('department_id', $department->id)
            ->whereBetween('date', [$start->format('Y-m-d'), $end->format('Y-m-d')])
            ->orderBy('date')
            ->get();

        return response()->json([
            'department_name' => $department->name,
            'shifts' => $shifts->map(fn($shift) => [
                'id'         => $shift->id,
                'user_id'    => $shift->user_id,
                'doctor'     => $shift->user->full_name,
                'place'      => $shift->location->name,
                'location_id'=> $shift->location_id,
                'department' => $shift->department->name ?? '',
                'year'       => $shift->user->study_year,
                'date'       => $shift->date,
                'startTime'  => Carbon::parse($shift->start_time)->format('H:i'),
                'endTime'    => Carbon::parse($shift->end_time)->format('H:i'),
            ])
        ]);
    }


    public function deleteAllshifts(Request $request)
    {
        try {
            $departmentId = auth()->user()->doctor->department_id;
            $fromDate = $request->input('from_date'); 
            $toDate = $request->input('to_date');     

            if (!$fromDate || !$toDate) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'لم يتم استقبال نطاق تاريخ الشهر بشكل صحيح من الواجهة'
                ], 400);
            }

            $deletedCount = Shift::where('department_id', $departmentId)
                                 ->whereBetween('date', [$fromDate, $toDate]) 
                                 ->delete();

            if ($deletedCount > 0) {
                return response()->json([
                    'status' => 'success',
                    'message' => 'تم حذف مناوبات الشهر الحالي بنجاح',
                    'deleted_count' => $deletedCount
                ], 200);
            }

            return response()->json([
                'status' => 'info',
                'message' => 'لا توجد مناوبات مسجلة في هذا الشهر لحذفها'
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'حدث خطأ أثناء حذف المناوبات: ' . $e->getMessage()
            ], 500);
        }
    }

    // public function exportPdf()
    // { try{
    //     $authUser = auth()->user();

    //     // تأكد أن المستخدم لديه قسم
    //     if (!$authUser->doctor) {
    //         return response()->json(['message' => 'لا يوجد قسم'], 400);
    //     }

    //     $departmentId = $authUser->doctor->department_id;
    //     $department = Department::find($departmentId);
    //     if (!$department) {
    //         return response()->json(['message' => 'القسم غير موجود'], 404);
    //     }

    //     $startOfMonth = Carbon::now()->startOfMonth();
    //     $endOfMonth   = Carbon::now()->endOfMonth();

    //     $shifts = Shift::with([
    //         'user:id,full_name,study_year',
    //         'location:id,name',
    //         'department:id,name',
    //     ])
    //     ->where('department_id', $departmentId)
    //     ->whereBetween('date', [$startOfMonth->format('Y-m-d'), $endOfMonth->format('Y-m-d')])
    //     ->orderBy('date')
    //     ->get();

    //     $departmentName = $department->name . ' — ' . $startOfMonth->locale('ar')->translatedFormat('F Y');

    //     // تجميع حسب التاريخ (قسم واحد فقط)
    //     $groupedShifts = $shifts->groupBy(fn($shift) => $shift->date);

    //     $html = view('shifts', compact('groupedShifts', 'departmentName'))->render();

    //     $mpdf = new Mpdf([
    //         'mode'            => 'utf-8',
    //         'format'          => 'A4',
    //         'autoScriptToLang'=> true,
    //         'autoLangToFont'  => true,
    //         'tempDir'         => storage_path('app/public'),
    //     ]);

    //     if (ob_get_contents()) {
    //         ob_end_clean();
    //     }
    //     $mpdf->WriteHtml($html);

    //     $fileName = 'shifts_' . Carbon::now()->format('Y_m') . '.pdf';
    //     return response($mpdf->Output($fileName, 'S'), 200)
    //         ->header('Content-Type', 'application/pdf')
    //         ->header('Content-Disposition', 'attachment; filename="' . $fileName . '"');

    // }catch (\Exception $e) {
    //     return response()->json(['message' => $e->getMessage(), 'line'=>$e->getLine()], 500);
    // }
    // }

    /**
     * تصدير المناوبات إلى ملف Word، مجمّعة كل سنة دراسية بجدول مستقل.
     * إذا انبعت study_year بالطلب، بيتصدّر بس جدول هاي السنة (نفس فلتر الواجهة).
     */
    public function exportWord(Request $request)
    { try{
        $authUser = auth()->user();

        // تأكد أن المستخدم لديه قسم
        if (!$authUser->doctor) {
            return response()->json(['message' => 'لا يوجد قسم'], 400);
        }

        $departmentId = $authUser->doctor->department_id;
        $department = Department::find($departmentId);
        if (!$department) {
            return response()->json(['message' => 'القسم غير موجود'], 404);
        }

        $startOfMonth = Carbon::now()->startOfMonth();
        $endOfMonth   = Carbon::now()->endOfMonth();

        $query = Shift::with([
            'user:id,full_name,study_year',
            'location:id,name',
            'department:id,name',
        ])
        ->where('department_id', $departmentId)
        ->whereBetween('date', [$startOfMonth->format('Y-m-d'), $endOfMonth->format('Y-m-d')]);

        // احترام فلتر السنة الدراسية إذا كان محدد بالواجهة
        $studyYearFilter = $request->input('study_year');
        if ($studyYearFilter !== null && $studyYearFilter !== '') {
            $query->whereHas('user', function ($q) use ($studyYearFilter) {
                $q->where('study_year', $studyYearFilter);
            });
        }

        $shifts = $query->orderBy('date')->get();

        // تجميع المناوبات حسب السنة الدراسية للطبيب (كل سنة = جدول مستقل)
        $groupedByYear = $shifts->groupBy(fn($shift) => $shift->user->study_year ?? 'غير محدد')
            ->sortKeys();

        $phpWord = new PhpWord();
        $phpWord->getSettings()->setThemeFontLang(new \PhpOffice\PhpWord\Style\Language('ar-SA'));

        $section = $phpWord->addSection([
            'orientation' => 'portrait',
            'rtl'         => true,
        ]);

        $titleStyle = ['bold' => true, 'size' => 16, 'rtl' => true];
        $yearHeadingStyle = ['bold' => true, 'size' => 13, 'rtl' => true, 'color' => 'FFFFFF'];
        $yearHeadingShading = ['fill' => '1A4D8C'];
        $cellFontStyle = ['size' => 11, 'rtl' => true];
        $headerCellFontStyle = ['size' => 11, 'bold' => true, 'rtl' => true];

        $monthLabel = $department->name . ' — ' . $startOfMonth->locale('ar')->translatedFormat('F Y');
        $section->addText('جدول المناوبات — ' . $monthLabel, $titleStyle, ['alignment' => JcTable::CENTER, 'bidi' => true]);
        $section->addTextBreak(1);

        $tableStyle = [
            'borderSize'  => 6,
            'borderColor' => 'CCCCCC',
            'cellMargin'  => 80,
            'alignment'   => JcTable::CENTER,
        ];
        $columnWidths = [1800, 1800, 2600, 3200, 2200]; // إلى، من، المكان، الطبيب، التاريخ — بترتيب الإضافة من اليمين لليسار

        if ($groupedByYear->isEmpty()) {
            $section->addText('لا يوجد مناوبات لهذا الشهر' . ($studyYearFilter ? ' لهذه السنة الدراسية' : ''), ['rtl' => true], ['alignment' => JcTable::CENTER]);
        }

        foreach ($groupedByYear as $studyYear => $yearShifts) {
            $section->addText(
                'السنة الدراسية: ' . $studyYear,
                $yearHeadingStyle,
                ['alignment' => JcTable::CENTER, 'shading' => $yearHeadingShading, 'bidi' => true, 'spaceAfter' => 100, 'spaceBefore' => 200],
            );

            $table = $section->addTable($tableStyle);

            $table->addRow();
            $headers = ['إلى', 'من', 'المكان', 'الطبيب', 'التاريخ'];
            foreach ($headers as $i => $label) {
                $cell = $table->addCell($columnWidths[$i], ['shading' => ['fill' => 'EFEFEF']]);
                $cell->addText($label, $headerCellFontStyle, ['alignment' => JcTable::CENTER, 'bidi' => true]);
            }

            foreach ($yearShifts->sortBy('date') as $shift) {
                $table->addRow();
                $rowValues = [
                    Carbon::parse($shift->end_time)->format('H:i'),
                    Carbon::parse($shift->start_time)->format('H:i'),
                    $shift->location->name ?? '—',
                    $shift->user->full_name ?? '—',
                    Carbon::parse($shift->date)->format('Y-m-d'),
                ];
                foreach ($rowValues as $i => $value) {
                    $cell = $table->addCell($columnWidths[$i]);
                    $cell->addText($value, $cellFontStyle, ['alignment' => JcTable::CENTER, 'bidi' => true]);
                }
            }

            $section->addTextBreak(1);
        }

        $fileName = 'shifts_' . Carbon::now()->format('Y_m') . ($studyYearFilter ? '_year' . $studyYearFilter : '') . '.docx';
        $tempPath = storage_path('app/public/' . $fileName);

        $writer = WordIOFactory::createWriter($phpWord, 'Word2007');
        $writer->save($tempPath);

        return response()->download($tempPath, $fileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ])->deleteFileAfterSend(true);

    }catch (\Exception $e) {
        return response()->json(['message' => $e->getMessage(), 'line'=>$e->getLine()], 500);
    }
    }
}

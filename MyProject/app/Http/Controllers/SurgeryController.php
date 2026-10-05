<?php

namespace App\Http\Controllers;

use App\Models\Surgery;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Patient;
use App\Models\User;
use App\Notifications\SurgeryAddedNotification;
use App\Notifications\SurgeryUpdatedNotification;
use App\Notifications\SurgeryDeletedNotification;
use App\Services\NotificationService;
class SurgeryController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
         
        $query = Surgery::with(['residents', 'anesResidents', 'department', 'creator']);

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where('file_number', 'like', "%{$search}%")
                  ->orWhere('patient_name', 'like', "%{$search}%");
        }

        $surgeries = $query->orderBy('date', 'desc')->get();

        return response()->json($surgeries, 200);
    
        
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
          
        // 1. التحقق من صحة البيانات القادمة من الواجهة وشروطها
        $data = $request->validate([
            'date'              => 'required|date',
            'file_number'       => 'required|integer',
            'patient_name'      => 'required|string',
            'surgery_name'      => 'required|string',
            'nurse_name'        => 'nullable|string',
            'specialist_doctor' => 'required|string',
            'anes_specialist'   => 'nullable|string',
            'anes_type'         => 'nullable|string',
            'biopsy_number'     => 'nullable|string',
            'materials'         => 'nullable|string',
            'notes'             => 'nullable|string',
            'department_id'     => 'required|exists:departments,id',
            
            // شروط مصفوفات الأطباء المقيمين (يجب أن تكون IDs موجودة بجدول الأطباء عبر user_id، لأنه هذا الـ ID اللي بيوصل من الفرونت)
            'resident_ids'      => 'nullable|array', 
            'resident_ids.*'    => 'exists:doctors,user_id',
            'anes_resident_ids'   => 'nullable|array',
            'anes_resident_ids.*' => 'exists:doctors,user_id',
        ]);


        $patientWithSameFile = \App\Models\Patient::where('file_number', $request->file_number)->first();

            if ($patientWithSameFile && $patientWithSameFile->name !== $request->patient_name) {
                return response()->json([
                 'errors' => [ 'file_number' => ['رقم الإضبارة هذا مستخدم مسبقاً لمريض آخر باسم (' . $patientWithSameFile->name . ')!'] ]
                  ], 422);
            }

        \App\Models\Patient::firstOrCreate(
        ['file_number' => $request->file_number], // يبحث عن المريض برقم إضبارته
        [
            'name'         => $request->patient_name,      // إذا لم يجده، ينشئ مريض جديد بهذا الاسم
        ]);

        $exists = \Illuminate\Support\Facades\DB::table('surgeries')
            ->where('patient_name', $request->patient_name)
            ->where('date', $request->date)
            ->exists();

        if ($exists) {
            return response()->json([
              'errors' => ['date' => ['لا يمكن تسجيل أكثر من عمل جراحي للمريض نفسه في نفس اليوم!'] ] ], 422); // كود 422 يعني خطأ في شروط البيانات (Unprocessable Entity)
}

        $nextSurgeryNumber = \Illuminate\Support\Facades\DB::table('surgeries')->max('number') + 1;
        $data['number'] = $nextSurgeryNumber ? $nextSurgeryNumber : 1; // إذا كانت الداتابيز فاضية يبدأ من 1

        // 2. تسجيل معرف المستخدم (User ID) الذي قام بإدخال السجل الحالي
        if (auth()->check()) {
            $data['created_by'] = auth()->id();
        }

        // 3. سحب مصفوفات الـ IDs للأطباء المقيمين وتخزينها بمتغيرات مستقلة
        $residentIds = $request->input('resident_ids', []);
        $anesResidentIds = $request->input('anes_resident_ids', []);

        // هاي الحقول مش أعمدة بجدول surgeries — لازم تنشال قبل create()
        // وإلا بيصير خطأ SQL (500) لأنه بيحاول يخزن مصفوفات بأعمدة غير موجودة
        unset($data['resident_ids'], $data['anes_resident_ids']);

        // 4. إنشاء سجل العملية الجراحية الأساسي في جدول surgeries
        $surgery = Surgery::create($data);

        // 5. ربط مقيمي الجراحة بالجدول الوسيط مع تحديد النوع resident
        if (!empty($residentIds)) {
            $attachResidents = [];
            foreach ($residentIds as $id) {
                $attachResidents[$id] = ['type' => 'resident'];
            }
            $surgery->residents()->attach($attachResidents);
        }

        // 6. ربط مقيمي التخدير بالجدول الوسيط مع تحديد النوع anesResident
        if (!empty($anesResidentIds)) {
            $attachAnesResidents = [];
            foreach ($anesResidentIds as $id) {
                $attachAnesResidents[$id] = ['type' => 'anesResident'];
            }
            $surgery->anesResidents()->attach($attachAnesResidents);
        }

        // 7. إعادة السجل كاملاً مع علاقاته الجديدة للـ Frontend بكود 201
        $surgery->load(['residents', 'anesResidents', 'department']);

        // إرسال إشعار لكل أطباء القسم بإضافة عملية جديدة
        $departmentDoctors = User::whereHas('doctor', function ($q) use ($data) {
            $q->where('department_id', $data['department_id']);
        })->get();
        NotificationService::sendToUsersAndAdmin($departmentDoctors, new SurgeryAddedNotification($surgery));

        return response()->json([
            'message' => 'تم حفظ سجل العمل الجراحي بنجاح مع الأطباء المقيمين',
            'surgery' => $surgery
        ], 201);
    
        
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $surgery = Surgery::with(['residents', 'anesResidents', 'department', 'creator'])->findOrFail($id);
        
        return response()->json($surgery, 200);
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        if (!auth()->user()->hasRole('admin') && !auth()->user()->hasPermissionTo('edit surgery')) {
        return response()->json(['message' => 'عذراً، لا تملك الصلاحية لتعديل بيانات العمليات.'], 403);
}
       
        // 1. العثور على سجل العملية الجراحية المطلوب تعديلها بواسطة الـ id
        $surgery = Surgery::findOrFail($id);

        // 2. التحقق من صحة البيانات الجديدة القادمة من واجهة التعديل
        $data = $request->validate([
            'date'              => 'required|date',
            'file_number'       => 'required|integer',
            'patient_name'      => 'required|string',
            'surgery_name'      => 'required|string',
            'nurse_name'        => 'nullable|string',
            'specialist_doctor' => 'required|string',
            'anes_specialist'   => 'nullable|string',
            'anes_type'         => 'nullable|string',
            'biopsy_number'     => 'nullable|string',
            'materials'         => 'nullable|string',
            'notes'             => 'nullable|string',
            'department_id'     => 'required|exists:departments,id',
            
            'resident_ids'      => 'nullable|array', 
            'resident_ids.*'    => 'exists:doctors,user_id',
            'anes_resident_ids'   => 'nullable|array',
            'anes_resident_ids.*' => 'exists:doctors,user_id',
        ]);

        $patientWithSameFile = \App\Models\Patient::where('file_number', $request->file_number)->first();

            if ($patientWithSameFile && $patientWithSameFile->name !== $request->patient_name) {
                return response()->json([
                 'errors' => [ 'file_number' => ['رقم الإضبارة هذا مستخدم مسبقاً لمريض آخر باسم (' . $patientWithSameFile->name . ')!'] ]
                  ], 422);
            }

        // منستدعي موديل المريض Patient (تأكدي من عمل use App\Models\Patient فوق)
        \App\Models\Patient::firstOrCreate(
        ['file_number' => $request->file_number], // يبحث عن المريض برقم إضبارته
        [
            'name'         => $request->patient_name,      // إذا لم يجده، ينشئ مريض جديد بهذا الاسم
        ]);

        // 3. سحب مصفوفات الأطباء المقيمين الجديدة لتحديث الجدول الوسيط
        $residentIds = $request->input('resident_ids', []);
        $anesResidentIds = $request->input('anes_resident_ids', []);

        // هاي الحقول مش أعمدة بجدول surgeries — لازم تنشال قبل update()
        // وإلا بيصير خطأ SQL (500) لأنه بيحاول يخزن مصفوفات بأعمدة غير موجودة
        unset($data['resident_ids'], $data['anes_resident_ids']);

        // 4. تحديث البيانات الأساسية للعملية في جدول surgeries
        $surgery->update($data);

        // 5. تحديث مقيّمّي الجراحة بالجدول الوسيط باستخدام sync (حذف القديم ومزامنة الجديد)
        $syncResidents = [];
        foreach ($residentIds as $id) {
            $syncResidents[$id] = ['type' => 'resident'];
        }
        $surgery->residents()->sync($syncResidents);

        // 6. تحديث مقيّمّي التخدير بالجدول الوسيط بنفس الطريقة الذكية
        $syncAnesResidents = [];
        foreach ($anesResidentIds as $id) {
            $syncAnesResidents[$id] = ['type' => 'anesResident'];
        }
        $surgery->anesResidents()->sync($syncAnesResidents);

        // 7. إعادة السجل المعدل كاملاً مع علاقاته المحدثة للـ Frontend بكود 200
        $surgery->load(['residents', 'anesResidents', 'department']);

        // إرسال إشعار لكل أطباء القسم بتعديل العملية
        $updatedById = auth()->id();
        $departmentDoctors = User::whereHas('doctor', function ($q) use ($data) {
            $q->where('department_id', $data['department_id']);
        })->get();
        NotificationService::sendToUsersAndAdmin($departmentDoctors, new SurgeryUpdatedNotification($surgery, $updatedById));

        return response()->json([
            'message' => 'تم تحديث سجل العمل الجراحي بنجاح',
            'surgery' => $surgery
        ], 200);
        //
    }
    public function searchPatients(Request $request)
    {
        $query = $request->input('query');
    
        if (empty($query)) {
             return response()->json([],200);
        }

    
        $patients = DB::table('patients')
            ->select('id', 'name', 'file_number') 
            ->where('name', 'LIKE', '%' . $query . '%')
            ->orWhere('file_number', 'LIKE', '%'. $query . '%')
            ->limit(10) 
            ->get();

         return response()->json($patients,200);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        if (!auth()->user()->hasRole('admin') && !auth()->user()->hasPermissionTo('delete surgery')) {
        return response()->json(['message' => 'عذراً، لا تملك الصلاحية لحذف العمليات.'], 403);
}
       
        $surgery = Surgery::with('department')->findOrFail($id);

        // --- إرسال إشعار للأدمن قبل الحذف الفعلي ---
        $surgeryInfo = [
            'id'              => $surgery->id,
            'patient_name'    => $surgery->patient_name,
            'department_id'   => $surgery->department_id,
            'department_name' => $surgery->department->name ?? 'غير محدد',
            'date'            => $surgery->date,
        ];

        $surgery->delete();

        // NotificationService::notifyAdmin محمية (protected) لذلك نرسل عبر sendToUsers بمصفوفة فارغة
        // فيوصل فقط للأدمن تلقائياً
        NotificationService::sendToAdmin(new SurgeryDeletedNotification($surgeryInfo));

        return response()->json([
            'message' => 'تم حذف سجل العمل الجراحي بنجاح من النظام'
        ], 200);
        //
    }
    public function bulkDestroy(Request $request)
    {
        if (!auth()->user()->hasRole('admin') && !auth()->user()->hasPermissionTo('delete surgery')) {
        return response()->json(['message' => 'عذراً، لا تملك الصلاحية لحذف العمليات.'], 403);
}
       
        $request->validate([
            'ids'   => 'required|array',
            'ids.*' => 'exists:surgeries,id'
        ]);

        $surgeryIds = $request->input('ids');

        Surgery::whereIn('id', $surgeryIds)->delete();

        return response()->json([
            'message' => 'تم حذف العمليات الجراحية المحددة بنجاح'
        ], 200);
    }
    /**
     * يستبدل الأقواس بفاصل محايد (شرطة) خاص بملف Word المُصدَّر فقط —
     * بدون أي لمس للبيانات المخزّنة فعلياً بقاعدة البيانات.
     * السبب: القوسين من فئة "Mirrored Characters" بمعيار Unicode، وسلوك
     * عرضهم غير موثوق عبر محركات RTL المختلفة (Word/LibreOffice) — فبدل
     * ما نراهن على انعكاسهم صح، نتفاداهم نهائياً بهالمكان بس.
     */
    private function fixParens(?string $text): string
    {
        if (empty($text)) {
            return $text ?? '';
        }
        // "داخلية(عامة)" → "داخلية - عامة"
        $text = str_replace('(', ' - ', $text);
        $text = str_replace(')', '', $text);
        return trim($text);
    }

    public function exportToWord(Request $request)
    {
        $request->validate([
            'ids'   => 'required|array',
            'ids.*' => 'exists:surgeries,id'
        ]);

        $surgeryIds = $request->input('ids');

        // 2. جلب العمليات المحددة فقط مع أطبائها المقيمين والأقسام (منعاً لمشكلة N+1)
        $surgeries = Surgery::with(['residents', 'anesResidents', 'department', 'creator'])
                            ->whereIn('id', $surgeryIds)
                            ->orderBy('date', 'desc')
                            ->get();

        // 3. إنشاء مستند Word جديد وتجهيز الصفحة لتوجه أفقياً (Landscape)
        $phpWord = new \PhpOffice\PhpWord\PhpWord();

        $section = $phpWord->addSection([
            'orientation'  => 'landscape',
            'marginTop'    => 1200,
            'marginBottom' => 1200,
            'marginLeft'   => 1200,
            'marginRight'  => 1200,
        ]);

        // 4. إضافة وتنسيق عنوان التقرير الرئيسي في منتصف الصفحة
        $section->addText("تقرير العمليات الجراحية المؤرشفة", 
            ['name' => 'Arial', 'size' => 18, 'bold' => true, 'color' => '1F497D'], 
            ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER, 'spaceAfter' => 200]
        );
        
        $section->addText(date('Y-m-d'), 
            ['name' => 'Arial', 'size' => 10, 'italic' => true], 
            ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER, 'spaceAfter' => 400]
        );

        // 5. بناء هيكل الجدول وتحديد تنسيق الإطارات والهوامش
        $tableStyle = [
            'borderSize'  => 6, 
            'borderColor' => 'D3D3D3', 
            'cellMargin'  => 80,
            'alignment'   => \PhpOffice\PhpWord\SimpleType\Jc::CENTER
        ];
        $phpWord->addTableStyle('SurgeriesTable', $tableStyle);
        $table = $section->addTable('SurgeriesTable');

        // إضافة سطر العناوين الرئيسي للجدول (Table Headers) وتلوينه بخلفية كحلية
        $headerStyle = ['bold' => true, 'color' => 'FFFFFF', 'name' => 'Arial', 'size' => 10];
        $headerBg    = ['bgColor' => '1F497D', 'alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER];
        
        $table->addRow();
        // ملاحظة: الأعمدة مضافة هون بترتيب معكوس (من اليمين للشمال منطقياً)
        // لأن PHPWord يرسم الجدول دايماً من اليسار بغض النظر عن اتجاه اللغة
        $table->addCell(1600, $headerBg)->addText("تقرير العملية والملاحظات", $headerStyle, ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER, 'bidi' => true]);
        $table->addCell(1600, $headerBg)->addText("تفاصيل إضافية", $headerStyle, ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER, 'bidi' => true]);
        $table->addCell(1800, $headerBg)->addText("مُقيمي التخدير", $headerStyle, ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER, 'bidi' => true]);
        $table->addCell(1800, $headerBg)->addText("المقيمين المشاركين", $headerStyle, ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER, 'bidi' => true]);
        $table->addCell(1500, $headerBg)->addText("أخصائي التخدير/نوع التخدير", $headerStyle, ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER, 'bidi' => true]);
        $table->addCell(1600, $headerBg)->addText("الطبيب الأخصائي", $headerStyle, ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER, 'bidi' => true]);
        $table->addCell(1600, $headerBg)->addText("العملية الجراحية", $headerStyle, ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER, 'bidi' => true]);
        $table->addCell(1600, $headerBg)->addText("اسم المريض", $headerStyle, ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER, 'bidi' => true]);
        $table->addCell(1000, $headerBg)->addText("رقم الإضبارة", $headerStyle, ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER, 'bidi' => true]);
        $table->addCell(1200, $headerBg)->addText("القسم", $headerStyle, ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER, 'bidi' => true]);
        $table->addCell(1800, $headerBg)->addText("التاريخ", $headerStyle, ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER, 'bidi' => true]);
        $table->addCell(800, $headerBg)->addText("رقم العملية", $headerStyle, ['alignment' => \PhpOffice\PhpWord\SimpleType\Jc::CENTER, 'bidi' => true]);

        // 6. تكرار تفاصيل العمليات المحددة وتعبئة أسطر الجدول ديناميكياً
        // نفس ترتيب الأعمدة المعكوس المستخدم بسطر العناوين بالضبط
        foreach ($surgeries as $surgery) {
            $table->addRow();

            $operationNotes = $surgery->notes ?? '-';
            $table->addCell(1600)->addText($operationNotes, null, ['bidi' => true]);

            $extraInfo = "الممرض: " . ($surgery->nurse_name ?? '-') . "\nرقم العينة " . ($surgery->biopsy_number ?? '-');
            $table->addCell(1400)->addText($extraInfo, null, ['bidi' => true]);

            $anesResidentsName = $surgery->anesResidents->isNotEmpty() ? $surgery->anesResidents->pluck('name')->implode('، ') : 'لا يوجد';
            $table->addCell(1800)->addText($anesResidentsName, null, ['bidi' => true]);

            $residentsName = $surgery->residents->isNotEmpty() ? $surgery->residents->pluck('name')->implode('، ') : 'لا يوجد';
            $table->addCell(1800)->addText($residentsName, null, ['bidi' => true]);

            $anesInfo = ($surgery->anes_specialist ?? '-') . ' / ' . ($surgery->anes_type ?? '-');
            $table->addCell(1500)->addText($anesInfo, null, ['bidi' => true]);

            $table->addCell(1600)->addText($surgery->specialist_doctor, null, ['bidi' => true]);
            $table->addCell(1600)->addText($surgery->surgery_name, null, ['bidi' => true]);
            $table->addCell(1600)->addText($surgery->patient_name, null, ['bidi' => true]);
            $table->addCell(1100)->addText($surgery->file_number, null, ['bidi' => true]);
            $table->addCell(1200)->addText($this->fixParens($surgery->department ? $surgery->department->name : 'غير محدد'), null, ['bidi' => true]);
            $table->addCell(1000)->addText($surgery->date, null, ['bidi' => true]);
            $table->addCell(800)->addText($surgery->number, null, ['bidi' => true]);
        }

        // 7. حفظ التقرير كملف Word مؤقت، إرساله للمتصفح للتحميل، ثم حذفه فوراً من السيرفر
        $filename = "Surgeries_Report_" . time() . ".docx";
        $objectWriter = \PhpOffice\PhpWord\IOFactory::createWriter($phpWord, 'Word2007');
        
        $path = storage_path($filename);
        $objectWriter->save($path);

        return response()->download($path)->deleteFileAfterSend(true);
    }

}
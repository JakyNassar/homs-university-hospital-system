<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Models\BackupSetting;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;
use Carbon\Carbon;

class BackupSettingController extends Controller
{
    
     /**
     * تحديث جدولة أرشفة العمليات الجراحية
     */
    public function updateSchedule(Request $request)
    {
        // التحقق الصارم من المدخلات القادمة من الواجهة
        $request->validate([
            'backup_interval' => 'required|in:weekly,monthly'
        ]);

        // تحديث خيار الجدولة أو إنشاؤه في حال عدم وجوده عبر الـ Eloquent ORM
        BackupSetting::updateOrCreate(
            ['type' => 'interval'],       // شرط البحث عن السطر
            ['value' => $request->backup_interval] // القيمة الجديدة المراد حفظها
        );
        return response()->json([
            'status' => 'success',
            'message' => 'تم تحديث خيار جدولة النسخ الاحتياطي بنجاح كـ ' . ($request->backup_interval == 'weekly' ? 'أسبوعي' : 'شهري')
        ], 200);
        
    }
    public function getSchedule()
{
    // جلب أول سطر من جدول إعدادات النسخ الاحتياطي (أو الجدول يلي مخزنة فيه القيمة)
        $setting = DB::table('backup_settings')->first(); 

    // إذا الجدول لسا فاضي وما فيه إعدادات، منرجع قيمة افتراضية (مثلاً: يومي)
        if (!$setting) {
            return response()->json([
            'backup_interval' => 'weekly' 
        ], 200);
    }

    
        return response()->json([
        'backup_interval' => $setting->value 
    ], 200);
}
    public function createBackup($type = 'يدوي')
    {
        try {
            // إنشاء مجلد للنسخ الاحتياطية داخل الـ storage إذا لم يكن موجوداً
            if (!file_exists(storage_path('app/backups'))) {
                mkdir(storage_path('app/backups'), 0755, true);
            }

            // توليد اسم ملف فريد للنسخة الاحتياطية بالتاريخ والساعة
            $filename = "backup_" . Carbon::now()->format('Y_m_d_His') . ".sql";
            $filePath = storage_path("app/backups/" . $filename);

            // جلب الإعدادات تلقائياً من ملف الـ .env
            $dbUser = env('DB_USERNAME','root');
            $dbPass = env('DB_PASSWORD','');
            $dbName = env('DB_DATABASE');
            $dbHost = env('DB_HOST','127.0.0.1');

            // أمر الـ mysqldump السحري لأخذ نسخة كاملة من قاعدة البيانات
            $mysqldump = 'C:\\xampp\\mysql\\bin\\mysqldump.exe';

            if(empty($dbPass)){
                $command = sprintf(
                    '"%s" --user=%s --host=%s --single-transaction --add-drop-table %s > %s',
                    $mysqldump,
                    escapeshellarg($dbUser),
                    escapeshellarg($dbHost),
                    escapeshellarg($dbName),
                    escapeshellarg($filePath)
                );
            } else {
                $command = sprintf(
                    '"%s" --user=%s --password=%s --host=%s --single-transaction --add-drop-table %s > %s',
                    $mysqldump,
                    escapeshellarg($dbUser),
                    escapeshellarg($dbPass),
                    escapeshellarg($dbHost),
                    escapeshellarg($dbName),
                    escapeshellarg($filePath)
                );
            }

            exec($command, $output, $returnVar);

            // تشييك نجاح التنفيذ بالنظام (0 تعني نجاح قطعي)
            if ($returnVar === 0) {
                // حساب حجم الملف بالميغابايت وعرضه بشكل لائق (مثال: MB 1.5)
                $fileSizeBytes = filesize($filePath);
                if ($fileSizeBytes >= 1024 * 1024) {
                    $fileSizeReadable = round($fileSizeBytes / (1024 * 1024), 2) . " MB";
                } else {
                    $fileSizeReadable = round($fileSizeBytes / 1024, 1) . " KB";
                }

                // حشو السجل في جدول الـ backup_logs (بدون حقل الـ status وباسم الحقل الصح)
                DB::table('backup_logs')->insert([
                    'file_name'   => $filename,
                    'backup_type' => $type,
                    'file_size'   => $fileSizeReadable,
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ]);

                return response()->json([
                    'message' => 'تم إنشاء النسخة الاحتياطية بنجاح وتسجيلها بالسجل',
                    'file_name' => $filename
                ], 201);
            }

            throw new \Exception("أمر الـ mysqldump فشل في التنفيذ.");

        } catch (\Throwable $e) {
    return response()->json([
        'error_pure' => $e->getMessage(),
        'line' => $e->getLine()
    ], 500);
}
    }

    public function downloadSqlBackup($id)
    {
    $backup = DB::table('backup_logs')->where('id', $id)->first();

    // 2. إذا لم يجد السجل في قاعدة البيانات
    if (!$backup) {
        return response()->json([
            'message' => 'عذراً، ملف النسخة الاحتياطية هذا غير موجود.'
        ], 404);
    }

    // 3. تحديد المسار الكامل للملف على السيرفر
    $filePath = storage_path('app/backups/' . $backup->file_name);

    // 4. التحقق من أن الملف الفعلي موجود داخل المجلد ولم يتم حذفه يدوياً
    if (!file_exists($filePath)) {
        return response()->json([
            'message' => 'عذراً، الملف الفعلي غير موجود على السيرفر.'
        ], 404);
    }

    // 5. أمر لارافيل السحري لتحميل الملف مباشرة للمستخدم
    return response()->download($filePath, $backup->file_name);
}

    public function deleteBackup($id)
    {
        $backup = DB::table('backup_logs')->where('id', $id)->first();

    // 2. إذا لم يجد السجل، يعيد رسالة خطأ للفرونت
    if (!$backup) {
        return response()->json([
            'message' => 'عذراً، ملف النسخة الاحتياطية هذا غير موجود أو تم حذفه مسبقاً.'
        ], 404);
    }
        $filePath = storage_path("app/backups/" . $backup->file_name);

        if (file_exists($filePath)) {
            unlink($filePath); // حذف الملف من السيرفر نهائياً

    }
    DB::table('backup_logs')->where('id', $id)->delete();
    return response()->json(['message' => 'تم حذف ملف النسخة الاحتياطية بنجاح']);
    }

    public function restoreBackupFromFile(Request $request)
{
    // 1. التحقق من أن المستخدم رفع ملفاً وبامتداد sql
        $request->validate([
           'backup_file' => 'required|file'
    ]);

        if (!$request->hasFile('backup_file')) {
            return response()->json(['message' => 'لم يتم رفع أي ملف!'], 400);
    }

        $file = $request->file('backup_file');
    
    // 2. تخزين الملف مؤقتاً لتنفيذه
        $tempPath = $file->getRealPath();

    // 3. جلب إعدادات الداتابيز من ملف الـ .env
        $dbUser = env('DB_USERNAME');
        $dbPass = env('DB_PASSWORD');
        $dbName = env('DB_DATABASE');
        $dbHost = env('DB_HOST');

    // 4. أمر الـ SQL السحري لتفريغ الملف المرفوع داخل قاعدة البيانات
        $mysql = 'C:\\xampp\\mysql\\bin\\mysql.exe';
        $command = sprintf(
            '"%s" --user=%s --password=%s --host=%s %s < %s',
            $mysql,
            escapeshellarg($dbUser),
            escapeshellarg($dbPass),
            escapeshellarg($dbHost),
            escapeshellarg($dbName),
            escapeshellarg($tempPath)
    );

    // 5. تنفيذ الأمر بالنظام
        exec($command, $output, $returnVar);

        if ($returnVar === 0) {
            return response()->json(['message' => 'تمت استعادة قاعدة البيانات من الملف المرفوع بنجاح وعاد النظام للعمل بالكامل!'], 200);
    }

        return response()->json(['message' => 'فشلت عملية الاستعادة، تأكدي من صحة ملف الـ SQL المرفوع'], 500);
}

    public function getBackupLogs()
    {
        // تحقق إذا حان وقت النسخ التلقائي
        $this->checkAndRunAutoBackup();

        // جلب السجلات مرتبة من الأحدث إلى الأقدم
        $logs = \Illuminate\Support\Facades\DB::table('backup_logs')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function($log) {
                return [
                    'id' => $log->id,
                    'date' => \Carbon\Carbon::parse($log->created_at)->format('Y-m-d H:i:s'),
                    'backup_type' => $log->backup_type == 'weekly' ? 'أسبوعي' : ($log->backup_type == 'monthly' ? 'شهري' : 'يدوي'),
                    'file_size' => $log->file_size,
                ];
            });

        return response()->json(['data' => $logs], 200);
    }

    /**
     * يتحقق إذا حان وقت النسخ التلقائي ويشغله تلقائياً
     */
    private function checkAndRunAutoBackup(): void
    {
        try {
            $setting = DB::table('backup_settings')->where('type', 'interval')->first();
            if (!$setting) return;

            $interval = $setting->value; // weekly أو monthly

            // آخر نسخة تلقائية
            $lastAuto = DB::table('backup_logs')
                ->whereIn('backup_type', ['أسبوعي', 'شهري'])
                ->orderBy('created_at', 'desc')
                ->first();

            $now = Carbon::now();
            $shouldBackup = false;

            if (!$lastAuto) {
                $shouldBackup = true;
            } elseif ($interval === 'weekly') {
                $shouldBackup = Carbon::parse($lastAuto->created_at)->diffInDays($now) >= 7;
            } elseif ($interval === 'monthly') {
                $shouldBackup = Carbon::parse($lastAuto->created_at)->diffInDays($now) >= 30;
            }

            if ($shouldBackup) {
                $type = $interval === 'weekly' ? 'أسبوعي' : 'شهري';
                $this->createBackup($type);
            }
        } catch (\Throwable $e) {
            // ما نوقف الـ response إذا فشل النسخ التلقائي
        }
    }
}
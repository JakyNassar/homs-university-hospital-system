<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote'); 


// 🚀 1. أمر خارق مخصص للاختبار الفوري عبر الـ Terminal
Artisan::command('backup:test', function () {
    $this->info('جاري بدء اختبار النسخ الاحتياطي فوراً...');
    
    try {
        $setting = DB::table('backup_settings')->where('type', 'interval')->first();
        $currentInterval = $setting ? $setting->value : 'weekly';
    } catch (\Throwable $e) {
        $currentInterval = 'weekly'; 
    }

    if (!file_exists(storage_path('app/backups'))) {
        mkdir(storage_path('app/backups'), 0755, true);
    }

    $fileName = 'backup_test_' . Carbon::now()->format('Y_m_d_His') . '.sql';
    $filePath = storage_path('app/backups/' . $fileName);

    $dbUser = env('DB_USERNAME', 'root');
    $dbPass = env('DB_PASSWORD', '');
    $dbName = env('DB_DATABASE');
    $dbHost = env('DB_HOST', '127.0.0.1');

    $mysqldump = 'C:\\xampp\\mysql\\bin\\mysqldump.exe';
    $passwordParam = !empty($dbPass) ? '--password=' . escapeshellarg($dbPass) : '';

    $command = sprintf(
        '"%s" --user=%s %s --host=%s %s > %s',
        $mysqldump,
        escapeshellarg($dbUser),
        $passwordParam,
        escapeshellarg($dbHost),
        escapeshellarg($dbName),
        escapeshellarg($filePath)
    );

    exec($command . ' 2>&1', $output, $returnVar);

    if ($returnVar === 0 && file_exists($filePath)) {
        $fileSizeBytes = filesize($filePath);
        $fileSizeReadable = "MB " . round($fileSizeBytes / (1024 * 1024), 1);

        DB::table('backup_logs')->insert([
            'file_name'   => $fileName,         
            'backup_type' => $currentInterval,  
            'file_size'   => $fileSizeReadable, 
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);
        
        $this->info('✅ نجاح باهر! تم إنشاء الملف وتسجيل السجل بنجاح.');
    } else {
        $errorMessage = isset($output[0]) ? implode("\n", $output) : 'Unknown error';
        $this->error('🚨 فشل الأمر الحقيقي! السبب القادم من النظام هو:');
        $this->line($errorMessage);
    }
})->purpose('اختبار ميكانيكية النسخ الاحتياطي السريعة');


// 🎯 2. كود الجدولة التلقائية الأصلي (سيعمل بالخلفية بشكل طبيعي)
try {
    $setting = DB::table('backup_settings')->where('type', 'interval')->first();
    $currentInterval = $setting ? $setting->value : 'weekly';
} catch (\Throwable $e) {
    $currentInterval = 'weekly'; 
}

$backupTask = Schedule::call(function () use ($currentInterval) {
    // استدعاء نفس الأمر المكتوب بالأعلى عند حلول وقت الجدولة لمنع تكرار الكود
    Artisan::call('backup:test');
})->name('run-hospital-database-backup');

if ($currentInterval === 'weekly') {
    $backupTask->weeklyOn(6, '00:00'); 
} else {
    $backupTask->monthlyOn(1, '00:00'); 
}


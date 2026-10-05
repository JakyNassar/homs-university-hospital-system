<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\DoctorController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\ShiftController;
use App\Http\Controllers\ShiftLocationController;
use App\Http\Controllers\ScheduleController;
use App\Http\Controllers\SurgeryController; 
use App\Http\Controllers\BackupSettingController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\CalendarController;

Route::post('/login', [AuthController::class, 'login']);

// رابط ICS بدون auth (الـ token هو المصادقة)
Route::get('/calendar/feed/{token}', [CalendarController::class, 'feed']);

Route::middleware('auth:sanctum')->group(function(){
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', function (Request $request) {
    return $request->user()->load('doctor.department');
    });
    Route::get('/surgeries/search-patients', [SurgeryController::class, 'searchPatients']);
    Route::post('/surgeries/bulk-delete', [SurgeryController::class, 'bulkDestroy']);
    Route::post('/surgeries/export-word', [SurgeryController::class, 'exportToWord']);
    Route::post('/surgeries/backup-schedule', [BackupSettingController::class, 'updateSchedule']);
    Route::get('/surgeries/backup-schedule', [BackupSettingController::class, 'getSchedule']);
    Route::get('/surgeries/backup-logs', [BackupSettingController::class, 'getBackupLogs']);
    Route::get('/surgeries', [SurgeryController::class, 'index']);
    Route::post('/surgeries', [SurgeryController::class, 'store']);
    Route::get('/surgeries/{id}', [SurgeryController::class, 'show']);
    Route::put('/surgeries/{id}', [SurgeryController::class, 'update']);
    Route::delete('/surgeries/{id}', [SurgeryController::class, 'destroy']);
    Route::get('/department',[DepartmentController::class,'index']);
    Route::get('/department_doctors', [UserController::class , 'getDepartmentDoctors']);
    Route::get('/locations', [ShiftLocationController::class , 'index']);
    Route::get('/shifts', [ShiftController::class , 'index']);
    Route::post('/shifts', [ShiftController::class , 'store']);
    Route::get('/doctor-shifts/{userId}', [ShiftController::class, 'getDoctorShifts']);
    Route::put('/shifts/{id}', [ShiftController::class , 'update']);
    Route::delete('/shifts/delete-all', [ShiftController::class , 'deleteAllshifts']);
    Route::delete('/shifts/{id}', [ShiftController::class , 'destroy']);
    Route::get('/department-shifts', [ShiftController::class , 'departmentShifts']);
    Route::get('/export_pdf', [ShiftController::class , 'exportPdf']);
    Route::post('/schedule/generate' ,[ScheduleController::class , 'generate']);
    Route::post('/schedule/save' ,[ScheduleController::class , 'saveSchedule']);
    Route::post('/doctor-leave', [ScheduleController::class , 'doctorAvailable']);
    Route::get('/doctor-list' , [DoctorController::class , 'index']);
    Route::get('/doctor-in-year', [UserController::class , 'getDoctorsInYear']);
    Route::get('/doctors-by-year', [DoctorController::class , 'getDoctorsByYear']);
    Route::get('/doctors_without_anes' , [DoctorController::class , 'getDoctors']);
    Route::get('/anes' , [DoctorController::class , 'getAnesDoctors']);
    Route::post('/backups-create', [BackupSettingController::class, 'createBackup']);
    Route::post('/backups/restore-file', [BackupSettingController::class, 'restoreBackupFromFile']);
    Route::get('/backups/download/{id}', [BackupSettingController::class, 'downloadSqlBackup']);
    Route::delete('/backups/{id}', [BackupSettingController::class, 'deleteBackup']);
    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::post('/update-study-year-exclude', [DoctorController::class, 'updateStudyYearExclude']);
    Route::get('/doctor-in-year-department', [UserController::class, 'getDoctorsInYearByDepartment']);
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread', [NotificationController::class, 'unread']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);
    Route::post('/notifications/toggle-mute', [NotificationController::class, 'toggleMute']);
    Route::post('/import' , [UserController::class, 'import']);
    Route::get('/export_word', [ShiftController::class, 'exportWord']);
    // Calendar
    Route::get('/calendar/link', [CalendarController::class, 'getCalendarLink']);
    Route::post('/calendar/regenerate', [CalendarController::class, 'regenerateToken']);

    
});

Route::get('/calendar/feed/{token}', [CalendarController::class, 'feed']);

Route::middleware(['auth:sanctum','admin'])->group(function(){
    Route::delete('/users/delete-all',[UserController::class , 'destroyAll']);
    Route::get('/users',[ UserController::class , 'index']);
    Route::post('/users', [UserController::class , 'store']);
    Route::get('/users/{user}',[UserController::class , 'show']);
    Route::put('/users/{user}', [UserController::class , 'update']);
    Route::delete('/users/{user}', [UserController::class , 'destroy']);
    Route::post('/users/import', [UserController::class , 'import']);
    Route::post('/assign-permissions', [PermissionController::class , 'assignPermissionsToDoctors']);
    Route::get('/doctor-permissions/{id}', [PermissionController::class , 'getDoctorPermissions']);
    Route::get('/users-with-permissions', [PermissionController::class , 'getUsersWithPermissions']);
    Route::post('/update-study-year', [DoctorController::class , 'updateStudyYear']);
    Route::post('/rollback-study-year', [DoctorController::class , 'rollbackStudyYear']);
});

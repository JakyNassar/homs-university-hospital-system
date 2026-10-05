<?php

namespace App\Observers;

use App\Models\Shift;
use App\Models\AuditLog;

class ShiftObserver
{
    public function created(Shift $shift): void
    {
        // لود العلاقات لحتى نجيب الأسماء
        $shift->load(['user', 'department', 'location']);

        AuditLog::create([
            'user_id'         => auth()->id(),
            'action_type'     => 'create',
            'entity_modified' => 'shifts',
            'target_id'       => $shift->id,
            'old_value'       => '{}',
            'new_value'       => json_encode([
                'shift_for_user_id'   => $shift->user_id,
                'shift_for_user_name' => $shift->user?->full_name,    // المناوبة لمين
                'department'          => $shift->department?->name,    // أي قسم
                'location'            => $shift->location?->name,      // أي موقع
                'date'                => $shift->date,
                'start_time'          => $shift->start_time,
                'end_time'            => $shift->end_time,
            ]),
            'action_time' => now(),
        ]);
    }

    public function updated(Shift $shift): void
    {
        $shift->load(['user', 'department', 'location']);

        // حقول تقنية/داخلية ما إلها معنى للمستخدم — لا تُعرض كـ"تغييرات"
        $ignoredFields = [
            'updated_at', 'created_at', 'ics_uid', 'ics_sequence',
        ];

        // ترجمة أسماء الحقول للعربي
        $fieldLabels = [
            'user_id'       => 'الطبيب',
            'department_id' => 'القسم',
            'location_id'   => 'المكان',
            'date'          => 'التاريخ',
            'start_time'    => 'وقت البداية',
            'end_time'      => 'وقت النهاية',
        ];

        $dirty = collect($shift->getDirty())
            ->except($ignoredFields)
            ->toArray();

        // تطبيع صيغة start_time و end_time قبل المقارنة — لأنه أحياناً القيمة الجديدة
        // تكون نفس الوقت الفعلي بس بصيغة نصية مختلفة (مثلاً "08:00" بدل "08:00:00")
        // فتنحسب كـ"تغيير" وهمي رغم إنه الوقت ما تغيّر فعليًا
        foreach (['start_time', 'end_time'] as $timeField) {
            if (array_key_exists($timeField, $dirty)) {
                $originalNormalized = $shift->getOriginal($timeField)
                    ? \Carbon\Carbon::parse($shift->getOriginal($timeField))->format('H:i:s')
                    : null;
                $newNormalized = $dirty[$timeField]
                    ? \Carbon\Carbon::parse($dirty[$timeField])->format('H:i:s')
                    : null;

                if ($originalNormalized === $newNormalized) {
                    unset($dirty[$timeField]);
                }
            }
        }

        $changedFields = [];
        foreach ($dirty as $field => $newVal) {
            $from = $shift->getOriginal($field);
            $to   = $newVal;

            // تحويل الـ foreign keys لأسماء مقروءة
            // بنستخدم كلاس العلاقة المعرّف فعليًا بالموديل (getRelated) بدل تخمين اسم الموديل يدويًا،
            // حتى ما نطلع بخطأ "Class not found" لو اسم الموديل مختلف عما هو متوقع
            if ($field === 'user_id') {
                $userModel = get_class($shift->user()->getRelated());
                $from = $from ? $userModel::find($from)?->full_name : '—';
                $to   = $to   ? $userModel::find($to)?->full_name   : '—';
            } elseif ($field === 'department_id') {
                $deptModel = get_class($shift->department()->getRelated());
                $from = $from ? $deptModel::find($from)?->name : '—';
                $to   = $to   ? $deptModel::find($to)?->name   : '—';
            } elseif ($field === 'location_id') {
                $locationModel = get_class($shift->location()->getRelated());
                $from = $from ? $locationModel::find($from)?->name : '—';
                $to   = $to   ? $locationModel::find($to)?->name   : '—';
            } elseif ($field === 'date' && $to) {
                $from = $from ? \Carbon\Carbon::parse($from)->format('Y-m-d') : '—';
                $to   = $to   ? \Carbon\Carbon::parse($to)->format('Y-m-d')   : '—';
            }

            $label = $fieldLabels[$field] ?? $field;
            $changedFields[$label] = [
                'from' => $from,
                'to'   => $to,
            ];
        }

        // إذا كل الحقول اللي تغيرت كانت تقنية بحتة (متل مزامنة التقويم)، ما في داعي نسجل شي
        if (empty($changedFields)) {
            return;
        }

        AuditLog::create([
            'user_id'         => auth()->id(),
            'action_type'     => 'update',
            'entity_modified' => 'shifts',
            'target_id'       => $shift->id,
            'old_value'       => json_encode([
                'shift_for_user_name' => $shift->getOriginal('user_id')
                    ? get_class($shift->user()->getRelated())::find($shift->getOriginal('user_id'))?->full_name
                    : null,
                'department'  => $shift->department?->name,
                'date'        => $shift->getOriginal('date'),
                'start_time'  => $shift->getOriginal('start_time'),
                'end_time'    => $shift->getOriginal('end_time'),
            ]),
            'new_value'       => json_encode([
                'shift_for_user_name' => $shift->user?->full_name,
                'department'          => $shift->department?->name,
                'date'                => $shift->date,
                'start_time'          => $shift->start_time,
                'end_time'            => $shift->end_time,
                'changed_fields'      => $changedFields,   // الحقول اللي تغيرت بالتحديد (بدون حقول تقنية)
            ]),
            'action_time' => now(),
        ]);
    }

    public function deleted(Shift $shift): void
    {
        $shift->load(['user', 'department', 'location']);

        AuditLog::create([
            'user_id'         => auth()->id(),
            'action_type'     => 'delete',
            'entity_modified' => 'shifts',
            'target_id'       => $shift->id,
            'old_value'       => json_encode([
                'shift_for_user_name' => $shift->user?->full_name,
                'department'          => $shift->department?->name,
                'date'                => $shift->date,
                'start_time'          => $shift->start_time,
                'end_time'            => $shift->end_time,
            ]),
            'new_value'       => '{}',
            'action_time'     => now(),
        ]);
    }
}

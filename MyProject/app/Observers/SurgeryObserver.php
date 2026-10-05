<?php

namespace App\Observers;

use App\Models\Surgery;
use App\Models\AuditLog;

class SurgeryObserver
{
    public function created(Surgery $surgery): void
    {
        $surgery->load(['department', 'creator']);

        AuditLog::create([
            'user_id'         => auth()->id(),
            'action_type'     => 'create',
            'entity_modified' => 'surgeries',
            'target_id'       => $surgery->id,
            'old_value'       => '{}',
            'new_value'       => json_encode([
                'surgery_name'      => $surgery->surgery_name,         // اسم العملية
                'patient_name'      => $surgery->patient_name,         // اسم المريض
                'specialist_doctor' => $surgery->specialist_doctor,    // الدكتور المختص
                'department'        => $surgery->department?->name,    // القسم
                'date'              => $surgery->date ? \Carbon\Carbon::parse($surgery->date)->format('Y-m-d') : null,
            ]),
            'action_time' => now(),
        ]);
    }

    public function updated(Surgery $surgery): void
    {
        $surgery->load(['department', 'creator']);

        $dirty = collect($surgery->getDirty())
            ->except(['updated_at', 'created_at'])
            ->toArray();

        $changedFields = [];
        foreach ($dirty as $field => $newVal) {
            $from = $surgery->getOriginal($field);
            $to   = $newVal;

            // حول department_id لاسم القسم
            if ($field === 'department_id') {
                $from = \App\Models\Department::find($from)?->name ?? $from;
                $to   = \App\Models\Department::find($to)?->name ?? $to;
                $field = 'القسم';
            }

            // حول التاريخ لصيغة مقروءة
            if (in_array($field, ['date']) && $to) {
                $from = $from ? \Carbon\Carbon::parse($from)->format('Y-m-d') : '—';
                $to   = $to   ? \Carbon\Carbon::parse($to)->format('Y-m-d')   : '—';
            }

            $changedFields[$field] = [
                'from' => $from,
                'to'   => $to,
            ];
        }

        AuditLog::create([
            'user_id'         => auth()->id(),
            'action_type'     => 'update',
            'entity_modified' => 'surgeries',
            'target_id'       => $surgery->id,
            'old_value'       => json_encode([
                'surgery_name'      => $surgery->getOriginal('surgery_name'),
                'patient_name'      => $surgery->getOriginal('patient_name'),
                'specialist_doctor' => $surgery->getOriginal('specialist_doctor'),
                'date'              => $surgery->getOriginal('date') ? \Carbon\Carbon::parse($surgery->getOriginal('date'))->format('Y-m-d') : null,
            ]),
            'new_value'       => json_encode([
                'surgery_name'      => $surgery->surgery_name,
                'patient_name'      => $surgery->patient_name,
                'specialist_doctor' => $surgery->specialist_doctor,
                'department'        => $surgery->department?->name,
                'date'              => $surgery->date ? \Carbon\Carbon::parse($surgery->date)->format('Y-m-d') : null,
                'changed_fields'    => $changedFields,  // الحقول اللي تغيرت
            ]),
            'action_time' => now(),
        ]);
    }

    public function deleted(Surgery $surgery): void
    {
        $surgery->load(['department']);

        AuditLog::create([
            'user_id'         => auth()->id(),
            'action_type'     => 'delete',
            'entity_modified' => 'surgeries',
            'target_id'       => $surgery->id,
            'old_value'       => json_encode([
                'surgery_name'      => $surgery->surgery_name,
                'patient_name'      => $surgery->patient_name,
                'specialist_doctor' => $surgery->specialist_doctor,
                'department'        => $surgery->department?->name,
                'date'              => $surgery->date ? \Carbon\Carbon::parse($surgery->date)->format('Y-m-d') : null,
            ]),
            'new_value'       => '{}',
            'action_time'     => now(),
        ]);
    }
}
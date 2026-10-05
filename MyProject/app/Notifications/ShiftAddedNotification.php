<?php

namespace App\Notifications;

use App\Mail\ShiftCalendarMail;
use App\Models\Shift;
use App\Services\ICSService;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class ShiftAddedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected Shift $shift;

    public function __construct(Shift $shift)
    {
        $this->shift = $shift;
    }

    public function via($notifiable)
    {
        $channels = ['database'];
        if ($notifiable->email && !$notifiable->notifications_muted) {
            $channels[] = 'mail';
        }
        return $channels;
    }

    public function toDatabase($notifiable)
    {
        $departmentName = $this->shift->department->name ?? 'غير محدد';
        $doctorName = $this->shift->user->full_name ?? '';

        return [
            'type'          => 'shift_added',
            'message'       => "تمت إضافة مناوبة جديدة في قسم {$departmentName} للطبيب {$doctorName}",
            'shift_id'      => $this->shift->id,
            'department_id' => $this->shift->department_id,
            'date'          => $this->shift->date,
        ];
    }

    public function toMail($notifiable)
    {
        $departmentName = $this->shift->department->name ?? 'غير محدد';
        $doctorName     = $this->shift->user->full_name ?? '';

        // ── دعوة تقويم: فقط للطبيب المعين على المناوبة ──────────────────────
        if ($notifiable->id === $this->shift->user_id) {
            $icsContent = ICSService::generate([
                'method'         => 'REQUEST',
                'uid'            => $this->shift->ics_uid ?? ('shift-' . $this->shift->id . '@hospital'),
                'sequence'       => $this->shift->ics_sequence ?? 0,
                'summary'        => 'مناوبة: ' . $departmentName,
                'date'           => $this->shift->date,
                'start_time'     => $this->shift->start_time,
                'end_time'       => $this->shift->end_time,
                'location'       => optional($this->shift->location)->name ?? '',
                'attendee_email' => $notifiable->email,
                'attendee_name'  => $notifiable->full_name,
            ]);

            $startFormatted = Carbon::parse($this->shift->start_time)->format('H:i');
            $endFormatted   = Carbon::parse($this->shift->end_time)->format('H:i');

            return (new ShiftCalendarMail(
                icsContent:   $icsContent,
                emailSubject: "مناوبة جديدة — {$departmentName}",
                greeting:     'مرحباً ' . $notifiable->full_name,
                bodyLine:     "تمت إضافة مناوبة جديدة لك في قسم {$departmentName}.",
                dateInfo:     "التاريخ: {$this->shift->date} | من {$startFormatted} إلى {$endFormatted}",
            ))->to($notifiable->email, $notifiable->full_name);
        }

        // ── إشعار عادي: لبقية أطباء القسم ───────────────────────────────────
        return (new MailMessage)
            ->subject('مناوبة جديدة — ' . $departmentName)
            ->greeting('مرحباً ' . $notifiable->full_name)
            ->line("تمت إضافة مناوبة جديدة في قسم {$departmentName} للطبيب {$doctorName}")
            ->line('التاريخ: ' . $this->shift->date)
            ->salutation('فريق المستشفى');
    }
}


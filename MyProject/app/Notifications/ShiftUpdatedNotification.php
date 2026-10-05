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

class ShiftUpdatedNotification extends Notification implements ShouldQueue
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
        return [
            'type'          => 'shift_updated',
            'message'       => 'تم تعديل مناوبتك بتاريخ ' . $this->shift->date,
            'shift_id'      => $this->shift->id,
            'department_id' => $this->shift->department_id,
            'date'          => $this->shift->date,
        ];
    }

    public function toMail($notifiable)
    {
        // نفس الـ UID لكن SEQUENCE أعلى → التقويم يُحدّث نفس الحدث بدل أن يضيف حدثاً جديداً
        $icsContent = ICSService::generate([
            'method'         => 'REQUEST',
            'uid'            => $this->shift->ics_uid ?? ('shift-' . $this->shift->id . '@hospital'),
            'sequence'       => $this->shift->ics_sequence ?? 0,
            'summary'        => 'مناوبة: ' . ($this->shift->department->name ?? 'غير محدد'),
            'date'           => $this->shift->date,
            'start_time'     => $this->shift->start_time,
            'end_time'       => $this->shift->end_time,
            'location'       => optional($this->shift->location)->name ?? '',
            'attendee_email' => $notifiable->email,
            'attendee_name'  => $notifiable->full_name,
        ]);

        $startFormatted = Carbon::parse($this->shift->start_time)->format('H:i');
        $endFormatted   = Carbon::parse($this->shift->end_time)->format('H:i');
        $departmentName = $this->shift->department->name ?? 'غير محدد';

        return (new ShiftCalendarMail(
            icsContent:   $icsContent,
            emailSubject: "تعديل مناوبة — {$departmentName}",
            greeting:     'مرحباً ' . $notifiable->full_name,
            bodyLine:     "تم تعديل مناوبتك في قسم {$departmentName}. تحقق من التفاصيل الجديدة في تقويمك.",
            dateInfo:     "التاريخ الجديد: {$this->shift->date} | من {$startFormatted} إلى {$endFormatted}",
        ))->to($notifiable->email, $notifiable->full_name);
    }
}

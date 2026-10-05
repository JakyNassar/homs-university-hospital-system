<?php

namespace App\Notifications;

use App\Mail\ShiftCalendarMail;
use App\Services\ICSService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class ShiftDeletedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected array $shiftInfo;

    public function __construct(array $shiftInfo)
    {
        // نمرر بيانات بسيطة بدل الموديل لأنه ممكن يكون انحذف فعلياً قبل الإرسال
        $this->shiftInfo = $shiftInfo;
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
            'type'          => 'shift_deleted',
            'message'       => "تم حذف مناوبتك بتاريخ {$this->shiftInfo['date']}",
            'shift_id'      => $this->shiftInfo['id'],
            'department_id' => $this->shiftInfo['department_id'] ?? null,
            'date'          => $this->shiftInfo['date'] ?? null,
        ];
    }

    public function toMail($notifiable)
    {
        // إذا المناوبة ما كان لها ics_uid (قديمة قبل الميزة) → إشعار نصي عادي
        if (empty($this->shiftInfo['ics_uid'])) {
            return (new MailMessage)
                ->subject('حذف مناوبة')
                ->greeting('مرحباً ' . $notifiable->full_name)
                ->line('تم حذف مناوبتك بتاريخ ' . $this->shiftInfo['date'])
                ->salutation('فريق المستشفى');
        }

        // METHOD:CANCEL + نفس الـ UID → التقويم يحذف الحدث تلقائياً
        $icsContent = ICSService::generate([
            'method'         => 'CANCEL',
            'uid'            => $this->shiftInfo['ics_uid'],
            'sequence'       => $this->shiftInfo['ics_sequence'] ?? 1,
            'summary'        => 'مناوبة ملغاة',
            'date'           => $this->shiftInfo['date'],
            'start_time'     => $this->shiftInfo['start_time'],
            'end_time'       => $this->shiftInfo['end_time'],
            'location'       => $this->shiftInfo['location_name'] ?? '',
            'attendee_email' => $notifiable->email,
            'attendee_name'  => $notifiable->full_name,
        ]);

        return (new ShiftCalendarMail(
            icsContent:   $icsContent,
            emailSubject: 'تم إلغاء مناوبتك',
            greeting:     'مرحباً ' . $notifiable->full_name,
            bodyLine:     'تم حذف مناوبتك بتاريخ ' . $this->shiftInfo['date'] . '. سيتم إزالتها من تقويمك تلقائياً.',
            dateInfo:     'من ' . ($this->shiftInfo['start_time'] ?? '') . ' إلى ' . ($this->shiftInfo['end_time'] ?? ''),
        ))->to($notifiable->email, $notifiable->full_name);
    }
}

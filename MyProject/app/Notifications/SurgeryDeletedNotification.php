<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class SurgeryDeletedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected array $surgeryInfo;

    public function __construct(array $surgeryInfo)
    {
        // نمرر بيانات بسيطة بدل الموديل لأنه ممكن يكون انحذف فعلياً قبل الإرسال
        $this->surgeryInfo = $surgeryInfo;
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
            'type'          => 'surgery_deleted',
            'message'       => "تم حذف عملية المريض {$this->surgeryInfo['patient_name']} من قسم {$this->surgeryInfo['department_name']}",
            'surgery_id'    => $this->surgeryInfo['id'],
            'department_id' => $this->surgeryInfo['department_id'] ?? null,
            'date'          => $this->surgeryInfo['date'] ?? null,
        ];
    }

    public function toMail($notifiable)
    {
        return (new MailMessage)
            ->subject('حذف عملية')
            ->greeting('مرحباً ' . $notifiable->full_name)
            ->line("تم حذف عملية المريض {$this->surgeryInfo['patient_name']} من قسم {$this->surgeryInfo['department_name']}")
            ->salutation('فريق المستشفى');
    }
}

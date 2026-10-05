<?php

namespace App\Notifications;

use App\Models\Surgery;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class SurgeryAddedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected Surgery $surgery;

    public function __construct(Surgery $surgery)
    {
        $this->surgery = $surgery;
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
        $departmentName = $this->surgery->department->name ?? 'غير محدد';
        $addedBy = $this->surgery->creator->full_name ?? 'غير معروف';

        return [
            'type'          => 'surgery_added',
            'message'       => "أضاف {$addedBy} عملية جديدة للمريض {$this->surgery->patient_name} في قسم {$departmentName}",
            'surgery_id'    => $this->surgery->id,
            'department_id' => $this->surgery->department_id,
            'date'          => $this->surgery->date,
        ];
    }

    public function toMail($notifiable)
    {
        $departmentName = $this->surgery->department->name ?? 'غير محدد';
        $addedBy = $this->surgery->creator->full_name ?? 'غير معروف';
        return (new MailMessage)
            ->subject('عملية جديدة — ' . $departmentName)
            ->greeting('مرحباً ' . $notifiable->full_name)
            ->line("أضاف {$addedBy} عملية جديدة للمريض {$this->surgery->patient_name} في قسم {$departmentName}")
            ->line('التاريخ: ' . $this->surgery->date)
            ->salutation('فريق المستشفى');
    }
}

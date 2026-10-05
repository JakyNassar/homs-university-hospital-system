<?php

namespace App\Notifications;

use App\Models\Surgery;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class SurgeryUpdatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected Surgery $surgery;
    protected string $updatedByName;

    public function __construct(Surgery $surgery, ?int $updatedById = null)
    {
        $this->surgery = $surgery;
        $updatedBy = $updatedById ? User::find($updatedById) : null;
        $this->updatedByName = $updatedBy?->full_name ?? 'غير معروف';
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

        return [
            'type'          => 'surgery_updated',
            'message'       => "عدّل {$this->updatedByName} عملية المريض {$this->surgery->patient_name} في قسم {$departmentName}",
            'surgery_id'    => $this->surgery->id,
            'department_id' => $this->surgery->department_id,
            'date'          => $this->surgery->date,
        ];
    }

    public function toMail($notifiable)
    {
        $departmentName = $this->surgery->department->name ?? 'غير محدد';
        return (new MailMessage)
            ->subject('تعديل عملية — ' . $departmentName)
            ->greeting('مرحباً ' . $notifiable->full_name)
            ->line("عدّل {$this->updatedByName} عملية المريض {$this->surgery->patient_name} في قسم {$departmentName}")
            ->salutation('فريق المستشفى');
    }
}

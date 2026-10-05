<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class YearPromotedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected int $previousYear;
    protected int $newYear;

    public function __construct(int $previousYear, int $newYear)
    {
        $this->previousYear = $previousYear;
        $this->newYear = $newYear;
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
            'type'          => 'year_promoted',
            'message'       => "تمت ترقيتك من السنة {$this->previousYear} إلى السنة {$this->newYear}",
            'previous_year' => $this->previousYear,
            'new_year'      => $this->newYear,
        ];
    }

    public function toMail($notifiable)
    {
        return (new MailMessage)
            ->subject('تمت ترقيتك إلى السنة ' . $this->newYear)
            ->greeting('مرحباً ' . $notifiable->full_name)
            ->line("تمت ترقيتك من السنة {$this->previousYear} إلى السنة {$this->newYear}")
            ->salutation('فريق المستشفى');
    }
}

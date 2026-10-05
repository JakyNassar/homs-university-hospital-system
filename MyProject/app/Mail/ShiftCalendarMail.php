<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

/**
 * Mailable مخصص لإرسال دعوات تقويم مع مرفق .ics.
 *
 * يُستخدم من داخل الـ Notifications بدلاً من MailMessage العادي
 * حين نريد إرفاق ملف تقويم قابل للإضافة مباشرة لتقويم الموبايل.
 */
class ShiftCalendarMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        private readonly string $icsContent,
        private readonly string $emailSubject,
        private readonly string $greeting,
        private readonly string $bodyLine,
        private readonly string $dateInfo,
    ) {}

    public function build(): static
    {
        return $this
            ->subject($this->emailSubject)
            ->view('mail.shift_calendar', [
                'greeting' => $this->greeting,
                'bodyLine' => $this->bodyLine,
                'dateInfo' => $this->dateInfo,
            ])
            // المرفق بـ Content-Type: text/calendar; method=REQUEST
            // Gmail وتطبيقات الموبايل تتعرف عليه وتعرض زر "إضافة للتقويم"
            ->attachData(
                $this->icsContent,
                'invite.ics',
                ['mime' => 'text/calendar; method=REQUEST; charset=UTF-8']
            );
    }
}

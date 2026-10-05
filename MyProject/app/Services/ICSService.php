<?php

namespace App\Services;

use Carbon\Carbon;

/**
 * يولّد محتوى ملف .ics بصيغة دعوة تقويم (iCalendar).
 *
 * الاستخدام:
 *   $ics = ICSService::generate([...]);     // METHOD:REQUEST (إضافة / تعديل)
 *   $ics = ICSService::generate(['method' => 'CANCEL', ...]); // إلغاء
 */
class ICSService
{
    /**
     * @param array{
     *   method?: string,          REQUEST | CANCEL  (افتراضي: REQUEST)
     *   uid: string,              معرّف فريد وثابت للمناوبة (shift-{id}@hospital)
     *   sequence?: int,           يرتفع بواحد في كل تعديل / إلغاء
     *   summary: string,          عنوان الحدث في التقويم
     *   date: string,             Y-m-d
     *   start_time: string,       H:i
     *   end_time: string,         H:i
     *   location?: string,        مكان المناوبة
     *   attendee_email: string,   إيميل الطبيب
     *   attendee_name: string,    اسم الطبيب
     * } $params
     */
    public static function generate(array $params): string
    {
        $method        = $params['method']          ?? 'REQUEST';
        $uid           = $params['uid'];
        $sequence      = (int) ($params['sequence'] ?? 0);
        $summary       = self::escapeText($params['summary']);
        $date          = $params['date'];
        $startTime     = $params['start_time'];
        $endTime       = $params['end_time'];
        $location      = self::escapeText($params['location'] ?? '');
        $attendeeEmail = $params['attendee_email'];
        $attendeeName  = self::escapeText($params['attendee_name']);

        $organizerEmail = config('mail.from.address', 'noreply@hospital.system');
        $organizerName  = self::escapeText(config('app.name', 'Hospital Shift System'));

        // DTSTAMP: وقت توليد الملف بتوقيت UTC
        $dtNow = Carbon::now()->format('Ymd\THis\Z');

        // DTSTART: وقت بدء المناوبة (floating time — بدون Z — لتُعامَل كتوقيت محلي)
        $startDt = Carbon::parse("{$date} {$startTime}");
        $dtStart  = $startDt->format('Ymd\THis');

        // DTEND: إذا وقت النهاية أصغر من البداية → مناوبة ليلية تتجاوز منتصف الليل
        $endDt = Carbon::parse("{$date} {$endTime}");
        if ($endTime < $startTime) {
            $endDt->addDay();
        }
        $dtEnd = $endDt->format('Ymd\THis');

        $status = $method === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED';

        // ICS يستخدم CRLF (\r\n) كفاصل أسطر حسب المعيار RFC 5545
        $lines = [
            'BEGIN:VCALENDAR',
            'PRODID:-//Hospital Shift System//AR',
            'VERSION:2.0',
            "METHOD:{$method}",
            'BEGIN:VEVENT',
            "UID:{$uid}",
            "SEQUENCE:{$sequence}",
            "DTSTAMP:{$dtNow}",
            "DTSTART:{$dtStart}",
            "DTEND:{$dtEnd}",
            "SUMMARY:{$summary}",
            "LOCATION:{$location}",
            "ORGANIZER;CN=\"{$organizerName}\":mailto:{$organizerEmail}",
            "ATTENDEE;CN=\"{$attendeeName}\";RSVP=TRUE:mailto:{$attendeeEmail}",
            "STATUS:{$status}",
            'END:VEVENT',
            'END:VCALENDAR',
        ];

        return implode("\r\n", $lines);
    }

    /** تهريب الأحرف الخاصة في قيم ICS */
    private static function escapeText(string $text): string
    {
        return str_replace(
            ['\\', ';', ',', "\n"],
            ['\\\\', '\;', '\,', '\n'],
            $text
        );
    }
}

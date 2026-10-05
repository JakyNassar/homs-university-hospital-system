<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Shift;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CalendarController extends Controller
{
    /**
     * GET /api/calendar/link  (requires auth:sanctum)
     *
     * يُرجع رابط الاشتراك الشخصي للطبيب بصيغة webcal://
     * موبايل iPhone/Android يفتح التقويم مباشرة عند الضغط على الرابط.
     */
    public function getLink(Request $request)
    {
        $user = auth()->user();

        // نولّد token عشوائي إذا لم يكن موجوداً بعد
        if (!$user->calendar_token) {
            $user->calendar_token = Str::random(48);
            $user->save();
        }

        // بناء الرابط: https://... → webcal://...
        $httpUrl  = config('app.url') . '/calendar/' . $user->calendar_token;
        $webcalUrl = preg_replace('#^https?://#', 'webcal://', $httpUrl);

        return response()->json([
            'calendar_link' => $webcalUrl,
        ]);
    }

    /**
     * GET /calendar/{token}  (public — بدون auth)
     *
     * تقويم ICS حي يُحدَّث تلقائياً — يُضاف مرة واحدة بتطبيق الكاليندر
     * وبيجيب المناوبات الجديدة بشكل دوري (كل ساعة حسب X-PUBLISHED-TTL).
     *
     * لا يحتاج Blade view — يُرجع النص مباشرة.
     */
    public function feed(string $token)
    {
        $user = User::where('calendar_token', $token)->first();

        if (!$user) {
            abort(404, 'رابط التقويم غير صالح');
        }

        // نجيب المناوبات من شهر ماضي وكل المستقبل
        $shifts = Shift::where('user_id', $user->id)
            ->where('date', '>=', now()->subMonth()->format('Y-m-d'))
            ->with(['location', 'department'])
            ->orderBy('date')
            ->orderBy('start_time')
            ->get();

        $dtNow   = Carbon::now()->format('Ymd\THis\Z');
        $appName = config('app.name', 'Hospital Shift System');

        // ── رأس التقويم ─────────────────────────────────────────────────────
        $lines = [
            'BEGIN:VCALENDAR',
            'PRODID:-//Hospital Shift System//AR',
            'VERSION:2.0',
            'METHOD:PUBLISH',
            'CALSCALE:GREGORIAN',
            // اسم التقويم كما يظهر بتطبيق الموبايل
            "X-WR-CALNAME:مناوبات {$user->full_name}",
            // التحديث التلقائي كل ساعة
            'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
            'X-PUBLISHED-TTL:PT1H',
        ];

        // ── حدث لكل مناوبة ──────────────────────────────────────────────────
        foreach ($shifts as $shift) {
            $startDt = Carbon::parse($shift->date . ' ' . $shift->start_time);
            $endDt   = Carbon::parse($shift->date . ' ' . $shift->end_time);

            // مناوبة ليلية تعبر منتصف الليل
            if ($shift->end_time < $shift->start_time) {
                $endDt->addDay();
            }

            $uid      = $shift->ics_uid ?? ('shift-' . $shift->id . '@hospital');
            $sequence = $shift->ics_sequence ?? 0;
            $summary  = 'مناوبة: ' . ($shift->department->name ?? 'غير محدد');
            $location = optional($shift->location)->name ?? '';

            $lines[] = 'BEGIN:VEVENT';
            $lines[] = "UID:{$uid}";
            $lines[] = "SEQUENCE:{$sequence}";
            $lines[] = "DTSTAMP:{$dtNow}";
            $lines[] = 'DTSTART:' . $startDt->format('Ymd\THis');
            $lines[] = 'DTEND:' . $endDt->format('Ymd\THis');
            $lines[] = "SUMMARY:{$summary}";
            $lines[] = "LOCATION:{$location}";
            $lines[] = 'STATUS:CONFIRMED';
            $lines[] = 'END:VEVENT';
        }

        $lines[] = 'END:VCALENDAR';

        // ICS يستخدم CRLF حسب RFC 5545
        $icsContent = implode("\r\n", $lines);

        return response($icsContent, 200)
            ->header('Content-Type', 'text/calendar; charset=UTF-8')
            ->header('Content-Disposition', 'inline; filename="my-shifts.ics"')
            ->header('Cache-Control', 'no-cache, must-revalidate');
    }
}

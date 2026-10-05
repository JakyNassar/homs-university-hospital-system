<?php

namespace App\Services;

use App\Models\Doctor;
use App\Models\Shift;
use App\Models\ShiftLocation;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use App\Models\DoctorLeave;

class ShiftSchedulerService
{
    private const PERIOD_TIMES = [
        1 => ['00:00:00', '08:00:00'],
        2 => ['08:00:00', '16:00:00'],
        3 => ['16:00:00', '23:59:59'],
        4 => ['06:00:00', '14:00:00'],
        5 => ['14:00:00', '22:00:00'],
    ];

    private array      $constraints;
    private array      $config;
    private array      $assignedShifts = [];
    private $user;
    private ?Collection $doctors = null;
    private Collection $locations;
    private array      $shiftCount    = [];
    private array      $assignedDates = [];
    /** تتبع آخر نقطة وقف في دورة السنوات لضمان تغطية كل السنوات قبل التكرار */
    private array      $yearRotationState = []; // [ periodKey => [ 'order'=>[], 'index'=>0 ] ]
    /**
     * توزيع "المطلوب يومياً" من كل سنة على فترات اليوم (نفس التوزيع لكل الأيام).
     * [ period => [ year => count, ... ], ... ]
     * فارغ إذا لم يتم تفعيل year_daily_quotas.
     */
    private array      $dailyYearAllocation = [];

    public function __construct(array $constraints, array $config, $user)
    {
        $this->constraints = array_flip($constraints);
        $this->config      = $config;
        $this->user        = $user;
        $this->doctors = $this->loadDoctors();
        if ($this->doctors->isEmpty()) {
        throw new \RuntimeException('لا يوجد أطباء في هذا القسم.');
        }
        
        $departmentId      = $this->user->doctor->department_id;
        
        $this->locations   = ShiftLocation::where('department_id', $departmentId)->get();
        

        foreach ($this->doctors as $doctor) {
            $this->shiftCount[$doctor->user_id]     = 0;
            $this->assignedDates[$doctor->user_id]  = [];
            $this->assignedShifts[$doctor->user_id] = [];
        }

        $this->dailyYearAllocation = $this->buildDailyYearAllocation();
    }

    // =========================================================================
    // PUBLIC
    // =========================================================================
    public function getDoctorsCount(): int
    {
        return $this->doctors->count();
    }
    public function generate(): array
    {
        $schedule        = [];
        $totalShifts     = 0;
        $unassignedSlots = 0;
        $scheduleData    = [];

        $current = Carbon::parse($this->config['from_date'] ?? null);
        $end     = Carbon::parse($this->config['to_date'] ?? null);

        if (!$current->isValid() || !$end->isValid()) {

            throw new \InvalidArgumentException('التواريخ المدخلة غير صحيحة.');
        }

        if ($current->gt($end)) {
            throw new \InvalidArgumentException('تاريخ البداية يجب أن يكون قبل تاريخ النهاية.');
        }

        if ($end->diffInDays($current) > 366) {
            throw new \InvalidArgumentException('النطاق الزمني لا يجب أن يتجاوز سنة كاملة.');
        }

        while ($current->lte($end)) {
            $dateStr  = $current->toDateString();
            $daySlots = [];

            // أطباء تم تعيينهم اليوم عبر كل الفترات — لمنع تكرار نفس الطبيب
            $assignedTodayUserIds = [];

            foreach ($this->config['periods'] as $periodConfig) {
                $period    = $periodConfig['period'];
                $startTime = $this->normalizeTime(
                    $periodConfig['start_time'] ?? self::PERIOD_TIMES[$period][0]
                );
                $endTime = $this->normalizeTime(
                    $periodConfig['end_time'] ?? self::PERIOD_TIMES[$period][1]
                );

                $assignedUserIdsForThisPeriod = [];
                $maxDoctorsForThisPeriod      = (int) ($periodConfig['doctors'] ?? 1);
                $currentPeriodCount           = 0;

                if (!empty($periodConfig['year_quotas'])) {
                    // تخصيص صريح لهذه الفترة بالذات — أولوية قصوى
                    $yearQuotas       = $this->buildYearQuotas($periodConfig);
                    $periodKey        = 'period_' . $period;
                    $orderedYearSlots = $this->buildPairedYearSlots($yearQuotas, $maxDoctorsForThisPeriod, $periodKey);
                } elseif ($this->hasDailyYearQuotas()) {
                    // توزيع دقيق: "المطلوب يومياً" من كل سنة، مُوزَّع مسبقاً على فترات اليوم
                    // بحيث يظهر أطباء من كل السنوات المطلوبة كل يوم بالأعداد المحددة تماماً
                    $yearQuotas       = $this->dailyYearAllocation[$period] ?? [];
                    $orderedYearSlots = $this->buildExactYearSlots($yearQuotas, $maxDoctorsForThisPeriod);
                } else {
                    $yearQuotas = $this->buildYearQuotas($periodConfig);

                    // مفتاح فريد لكل فترة عبر الأيام — يحفظ نقطة الوقف في دورة السنوات
                    $periodKey        = 'period_' . $period;
                    $orderedYearSlots = $this->buildPairedYearSlots($yearQuotas, $maxDoctorsForThisPeriod, $periodKey);
                }

                // ── [تغيير 2] ترتيب عشوائي داخل كل مجموعة (دنيا / عليا) ──────
                // shuffle يصير داخل buildPairedYearSlots — انظر التعليق هناك.

                $yearCounters = array_fill_keys(array_keys($yearQuotas), 0);
                $madeProgress = true;

                // ── [تغيير 3] نمشي على orderedYearSlots بدل foreach($yearKeys) ─
                // كل عنصر في القائمة = "طلب" لطبيب من سنة معينة
                $slotIndex = 0;

                while ($currentPeriodCount < $maxDoctorsForThisPeriod && $madeProgress) {
                    $madeProgress      = false;
                    $slotsThisRound    = array_slice($orderedYearSlots, $slotIndex);

                    foreach ($slotsThisRound as $i => $year) {
                        if ($currentPeriodCount >= $maxDoctorsForThisPeriod) {
                            break;
                        }

                        $yearFilter = ($year === 'any') ? null : (int) $year;

                        $excludedForThisSlot = array_unique(
                            array_merge($assignedUserIdsForThisPeriod, $assignedTodayUserIds)
                        );

                        $doctor = $this->pickDoctor(
                            $dateStr, $period, $excludedForThisSlot,
                            $yearFilter, $startTime, $endTime
                        );

                        // Fallback: لا يوجد من هاي السنة → أي طبيب متاح
                        if ($doctor === null && $yearFilter !== null) {
                            $doctor = $this->pickDoctor(
                                $dateStr, $period, $excludedForThisSlot,
                                null, $startTime, $endTime
                            );
                        }

                        if ($doctor !== null) {
                            $uid = $doctor->user_id;

                            $assignedUserIdsForThisPeriod[] = $uid;
                            $assignedTodayUserIds[]         = $uid;
                            $this->assignedDates[$uid][]    = $dateStr;
                            $this->shiftCount[$uid]++;
                            $totalShifts++;
                            $currentPeriodCount++;
                            $madeProgress = true;

                            if (isset($yearCounters[$year])) {
                                $yearCounters[$year]++;
                            }

                            $this->assignedShifts[$uid][$dateStr][] = [
                                'start_time' => $startTime,
                                'end_time'   => $endTime,
                            ];

                            $slotIndex += ($i + 1);
                            break; // انتقل لأول slot في الجولة القادمة
                        }
                    }
                }

                $unassignedSlots += max(0, $maxDoctorsForThisPeriod - $currentPeriodCount);

                // ── توزيع المواقع ─────────────────────────────────────────────
                $locationsIndexed      = $this->locations->values();
                $locationsCount        = $locationsIndexed->count();
                $tempPeriodAssignments = [];

                if ($locationsCount > 0 && !empty($assignedUserIdsForThisPeriod)) {
                    foreach (array_values($assignedUserIdsForThisPeriod) as $index => $uid) {
                        $location   = $locationsIndexed[$index % $locationsCount];
                        $assignment = [
                            'date'        => $dateStr,
                            'user_id'     => $uid,
                            'department_id'=> $this->user->doctor->department_id,
                            'location_id' => $location->id,
                            'period'      => $period,
                            'start_time'  => $startTime,
                            'end_time'    => $endTime,
                        ];
                        $scheduleData[]          = $assignment;
                        $tempPeriodAssignments[] = $assignment;
                    }
                }

                foreach ($this->locations as $location) {
                    $daySlots[] = [
                        'period'        => $period,
                        'location'      => $location->name,
                        'doctors_count' => collect($tempPeriodAssignments)
                                            ->where('location_id', $location->id)->count(),
                        'start_time'    => $startTime,
                        'end_time'      => $endTime,
                    ];
                }
            }

            $schedule[] = ['date' => $dateStr, 'slots' => $daySlots];
            $current->addDay();
        }
        $warnings = [];
        if ($unassignedSlots > 0) {
            $warnings[] = "تعذّر تعيين طبيب لـ {$unassignedSlots} فترة بسبب عدم توفر أطباء مؤهلين.";
        }
        if ($totalShifts === 0) {
            $warnings[] = 'لم يتم توليد أي مناوبة. تحقق من إعدادات الجدول وإجازات الأطباء.';
        }

        return [
            'total_shifts'     => $totalShifts,
            'unassigned_slots' => $unassignedSlots,
            'schedule'         => $schedule,
            'raw'              => $scheduleData,
            'warnings'         => $warnings,
        ];
    }

    // =========================================================================
    // PRIVATE — بناء قائمة الـ slots بنظام الأزواج دنيا/عليا
    // =========================================================================

    /**
     * يبني قائمة مرتبة من السنوات لكل slot في الفترة.
     *
     * المبدأ:
     * - نقسم السنوات الفعّالة لنصفين: دنيا (junior) وعليا (senior)
     * - نرتبهم: junior[0], senior[0], junior[1], senior[1], ...
     * - داخل كل مجموعة الترتيب عشوائي ← يتغير بكل استدعاء
     * - النتيجة: طالب دنيا دايماً بجانب طالب عليا
     *
     * مثال: سنوات فعّالة = [2, 3, 4], maxDoctors = 4
     *   junior = [2, 3] (مخلوط عشوائياً مثلاً [3, 2])
     *   senior = [4]
     *   slots  = [3, 4, 2, 4]  ← junior[0]=3, senior[0]=4, junior[1]=2, senior[0]=4 مكرر
     *
     * @param  array<int|string, int> $yearQuotas  [ year => count ]
     * @param  int                    $maxDoctors  عدد الأطباء المطلوب
     * @return array<int, int|string> قائمة من keys السنوات بالترتيب المطلوب
     */
    /**
     * يبني قائمة السنوات للفترة مع ضمان تغطية كل السنوات قبل التكرار.
     *
     * المشكلة السابقة: slots = [2,4,3,5,2,4,...] بالتكرار العشوائي
     * كان ممكن سنة تتكرر قبل ما تُغطى كل السنوات.
     *
     * الحل: نحفظ "نقطة الوقف" ($yearRotationState) لكل فترة.
     * - دورة 1: [2,4,3,5] ← كل السنوات مغطاة ✓
     * - دورة 2: [2,4,3,5] ← نفس الدورة، ترتيب مختلف عشوائياً
     *
     * مع مراعاة pairing: دنيا/عليا متجاورين دايماً.
     *
     * @param  string $periodKey  مفتاح فريد للفترة (date + period)
     */
    private function buildPairedYearSlots(array $yearQuotas, int $maxDoctors, string $periodKey): array
    {
        if (array_keys($yearQuotas) === ['any']) {
            return array_fill(0, $maxDoctors, 'any');
        }

        $activeYears = array_keys(array_filter($yearQuotas, fn($c) => $c > 0));
        sort($activeYears);
        $totalYears = count($activeYears);

        // إذا هاي أول مرة نشوف هاي الفترة → ابنِ الترتيب الأولي
        if (!isset($this->yearRotationState[$periodKey])) {
            $this->yearRotationState[$periodKey] = [
                'order' => $this->buildInterleavedOrder($activeYears),
                'index' => 0,
            ];
        }

        $state  = &$this->yearRotationState[$periodKey];
        $slots  = [];

        for ($i = 0; $i < $maxDoctors; $i++) {
            // إذا أكملنا دورة كاملة → ابنِ ترتيب عشوائي جديد وابدأ من الأول
            if ($state['index'] >= $totalYears) {
                $state['order'] = $this->buildInterleavedOrder($activeYears);
                $state['index'] = 0;
            }

            $slots[] = $state['order'][$state['index']];
            $state['index']++;
        }

        return $slots;
    }

    /**
     * يبني ترتيب interleaved عشوائي: junior[0], senior[0], junior[1], senior[1]...
     * بحيث كل سنة دنيا بجانب سنة عليا.
     *
     * @param  int[] $activeYears مرتبة تصاعدياً
     * @return int[]
     */
    private function buildInterleavedOrder(array $activeYears): array
    {
        $mid     = (int) ceil(count($activeYears) / 2);
        $juniors = array_slice($activeYears, 0, $mid);
        $seniors = array_slice($activeYears, $mid);

        shuffle($juniors);
        shuffle($seniors);

        $result = [];
        $max    = max(count($juniors), count($seniors));

        for ($i = 0; $i < $max; $i++) {
            if (isset($juniors[$i])) $result[] = $juniors[$i];
            if (isset($seniors[$i])) $result[] = $seniors[$i];
        }

        return $result;
    }

    // =========================================================================
    // PRIVATE — اختيار الطبيب
    // =========================================================================

    private function pickDoctor(
        string  $date,
        int     $period,
        array   $alreadyAssigned,
        ?int    $requiredYear = null,
        string  $startTime    = '00:00:00',
        string  $endTime      = '08:00:00'
    ): ?Doctor {

        $candidates = $this->doctors->filter(
            function (Doctor $doctor) use (
                $date, $alreadyAssigned, $requiredYear, $startTime, $endTime
            ): bool {
                $uid = $doctor->user_id;

                if (in_array($uid, $alreadyAssigned, true)) {
                    return false;
                }

                if ($requiredYear !== null &&
                    (int) ($doctor->user->study_year ?? 0) !== $requiredYear
                ) {
                    return false;
                }

                if (isset($this->constraints['no_consecutive_days'])) {
                    if ($this->hasConsecutiveDayConflict($uid, $date)) {
                        return false;
                    }
                }

                foreach ($this->assignedShifts[$uid][$date] ?? [] as $shift) {
                    if ($shift['start_time'] < $endTime && $shift['end_time'] > $startTime) {
                        return false;
                    }
                }

                if (Shift::where('user_id', $uid)
                    ->where('date', $date)
                    ->where(function ($q) use ($startTime, $endTime) {
                        $q->where('start_time', '<', $endTime)
                          ->where('end_time',   '>', $startTime);
                    })->exists()
                ) {
                    return false;
                }

                if (DoctorLeave::where('user_id', $uid)
                    ->where('from_date', '<=', $date)
                    ->where('to_date',   '>=', $date)
                    ->exists()
                ) {
                    return false;
                }

                if (isset($this->constraints['no_same_day_shift'])) {
                    if (Shift::where('user_id', $uid)->where('date', $date)->exists()) {
                        return false;
                    }
                }

                return true;
            }
        );

        if ($candidates->isEmpty()) {
            return null;
        }

        // Rotation: أعطِ الأولوية للطبيب الأقل مناوبات
        if (isset($this->constraints['rotation'])) {
            $globalMin    = min($this->shiftCount);
            $minCandidates = $candidates->filter(
                fn(Doctor $d) => $this->shiftCount[$d->user_id] === $globalMin
            );
            if ($minCandidates->isNotEmpty()) {
                $candidates = $minCandidates;
            }
        } elseif ($requiredYear !== null) {
            // حتى لو خيار "مناوبات دورية" غير مفعّل: لما نختار طبيب حسب سنة دراسية محددة
            // (توزيع حسب السنة)، لازم نضمن عدالة التوزيع بين أطباء نفس السنة، وإلا ممكن
            // يتكرر نفس الطبيب أو الاثنين ويبقى طبيب من نفس السنة بدون أي مناوبة بالكامل.
            $minForYear    = $candidates->min(fn(Doctor $d) => $this->shiftCount[$d->user_id]);
            $minCandidates = $candidates->filter(
                fn(Doctor $d) => $this->shiftCount[$d->user_id] === $minForYear
            );
            if ($minCandidates->isNotEmpty()) {
                $candidates = $minCandidates;
            }
        }

        // random() يضمن العشوائية بين الأطباء المتعادلين بعدد المناوبات
        return $candidates->random();
    }

    // =========================================================================
    // PRIVATE — التوزيع الدقيق "يومياً" حسب السنة (year_daily_quotas)
    // =========================================================================

    private function hasDailyYearQuotas(): bool
    {
        return !empty($this->dailyYearAllocation);
    }

    /**
     * يحوّل "المطلوب يومياً" من كل سنة (رقم واحد ثابت لكل الأيام) إلى توزيع
     * على فترات اليوم، بحيث مجموع ما يُخصَّص من كل سنة عبر كل الفترات = القيمة المطلوبة يومياً.
     * نفس التوزيع يُستخدم لكل أيام النطاق الزمني (لأن الفترات وأعدادها لا تتغيّر يومياً).
     *
     * @return array<int, array<int, int>>  [ period => [ year => count ] ]
     */
    private function buildDailyYearAllocation(): array
    {
        $dailyQuotas = $this->config['year_daily_quotas'] ?? [];

        $yearNeeds = [];
        foreach ($dailyQuotas as $i => $count) {
            $count = (int) $count;
            if ($count > 0) {
                $yearNeeds[$i + 1] = $count;
            }
        }
        if (empty($yearNeeds)) {
            return [];
        }

        $periods = $this->config['periods'] ?? [];
        if (empty($periods)) {
            return [];
        }

        $remainingCapacity = [];
        foreach ($periods as $p) {
            $remainingCapacity[$p['period']] = (int) ($p['doctors'] ?? 1);
        }

        $years = array_keys($yearNeeds);
        sort($years);
        $order = $this->buildInterleavedOrder($years);

        $allocation = array_fill_keys(array_keys($remainingCapacity), []);

        while (array_sum($yearNeeds) > 0 && array_sum($remainingCapacity) > 0) {
            $madeProgress = false;

            foreach ($order as $year) {
                if (($yearNeeds[$year] ?? 0) <= 0) {
                    continue;
                }

                // أول فترة ما زال فيها سعة متبقية
                $chosenPeriod = null;
                foreach ($remainingCapacity as $period => $cap) {
                    if ($cap > 0) {
                        $chosenPeriod = $period;
                        break;
                    }
                }
                if ($chosenPeriod === null) {
                    break 2;
                }

                $allocation[$chosenPeriod][$year] = ($allocation[$chosenPeriod][$year] ?? 0) + 1;
                $remainingCapacity[$chosenPeriod]--;
                $yearNeeds[$year]--;
                $madeProgress = true;
            }

            if (!$madeProgress) {
                break;
            }
        }

        return $allocation;
    }

    /**
     * يبني قائمة slots لفترة معيّنة تحتوي كل سنة مكررة بالضبط بعدد المطلوب منها
     * (على عكس buildPairedYearSlots التي تكتفي بترتيب "وجود" السنة دون التقيّد بعددها).
     * ما تبقى من سعة الفترة بعد استيفاء كل السنوات يُملأ بـ 'any'.
     *
     * @param  array<int, int> $yearQuotas  [ year => count ]
     */
    private function buildExactYearSlots(array $yearQuotas, int $maxDoctors): array
    {
        $slots = [];
        foreach ($yearQuotas as $year => $count) {
            for ($i = 0; $i < $count; $i++) {
                $slots[] = $year;
            }
        }

        shuffle($slots);

        while (count($slots) < $maxDoctors) {
            $slots[] = 'any';
        }

        return array_slice($slots, 0, $maxDoctors);
    }

    // =========================================================================
    // PRIVATE — بناء كوتا السنوات
    // =========================================================================

    private function buildYearQuotas(array $periodConfig): array
    {
        $periodYearQuotas = $periodConfig['year_quotas'] ?? [];
        if (!empty($periodYearQuotas)) {
            $quotas = [];
            foreach ($periodYearQuotas as $year => $count) {
                if ((int) $count > 0) {
                    $quotas[(int) $year] = (int) $count;
                }
            }
            if (!empty($quotas)) {
                return $quotas;
            }
        }

        $globalQuotas = $this->config['study_year_quotas'] ?? [];
        if (!empty($globalQuotas)) {
            $quotas = [];
            foreach ($globalQuotas as $i => $count) {
                if ((int) $count > 0) {
                    $quotas[$i + 1] = (int) $count;
                }
            }
            if (!empty($quotas)) {
                return $quotas;
            }
        }

        $total = (int) ($periodConfig['doctors'] ?? 1);
        return ['any' => max(1, $total)];
    }

    // =========================================================================
    // PRIVATE — helpers
    // =========================================================================

    private function normalizeTime(string|int $time): string
    {
        if (is_int($time)) {
            return sprintf('%02d:%02d:%02d',
                intdiv($time, 3600) % 24,
                intdiv($time % 3600, 60),
                $time % 60
            );
        }

        $time = trim((string) $time);

        if (str_contains($time, ' ')) {
            $time = explode(' ', $time)[1];
        }

        if (!str_contains($time, ':')) {
            $time = match (strlen($time)) {
                4 => substr($time, 0, 2) . ':' . substr($time, 2, 2) . ':00',
                6 => substr($time, 0, 2) . ':' . substr($time, 2, 2) . ':' . substr($time, 4, 2),
                default => $time,
            };
        }

        $parts = explode(':', $time);
        return sprintf('%02d:%02d:%02d',
            (int) ($parts[0] ?? 0),
            (int) ($parts[1] ?? 0),
            (int) ($parts[2] ?? 0)
        );
    }

    private function hasConsecutiveDayConflict(int $userId, string $date): bool
    {
        $target    = Carbon::parse($date);
        $dayBefore = $target->copy()->subDay()->toDateString();
        $dayAfter  = $target->copy()->addDay()->toDateString();

        foreach ($this->assignedDates[$userId] as $assigned) {
            if ($assigned === $dayBefore || $assigned === $dayAfter) {
                return true;
            }
        }
        return false;
    }

    private function loadDoctors(): Collection
    {
        $departmentId = $this->user->doctor->department_id;
        $query = Doctor::with('user')->where('department_id', $departmentId);

        if ($this->config['distribute_by_study_year'] ?? false) {
            $query->join('users', 'users.id', '=', 'doctors.user_id')
                  ->orderByRaw('CAST(users.study_year AS UNSIGNED) ASC')
                  ->select('doctors.*');
        }

        return $query->get();
    }
}
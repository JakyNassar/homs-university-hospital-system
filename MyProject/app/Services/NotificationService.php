<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Notification as NotificationFacade;

class NotificationService
{
    /**
     * إشعار لمجموعة مستخدمين — بدون نسخة للأدمن تلقائياً
     * (الأدمن يستلم فقط إذا كان ضمن القائمة أو مضافة مناوبة له)
     */
    public static function sendToUsers(Collection|array $users, Notification $notification): void
    {
        $users = collect($users);
        $recipients = $users->filter(fn ($u) => $u && !$u->notifications_muted);
        if ($recipients->isNotEmpty()) {
            NotificationFacade::send($recipients, $notification);
        }
    }

    /**
     * إشعار لمستخدم واحد — بدون نسخة للأدمن تلقائياً
     * (الأدمن يستلم فقط إذا كان هو المستخدم المحدد)
     */
    public static function sendToUser(?User $user, Notification $notification): void
    {
        if ($user && !$user->notifications_muted) {
            $user->notify($notification);
        }
    }

    /**
     * إشعار للأدمن فقط — يُستخدم للعمليات والترقية
     */
    public static function sendToAdmin(Notification $notification): void
    {
        $admin = User::role('admin')->first();
        if (!$admin || $admin->notifications_muted) {
            return;
        }
        $admin->notify($notification);
    }

    /**
     * إشعار لمجموعة مستخدمين + الأدمن دائماً
     * يُستخدم للعمليات (إضافة/تعديل/حذف)
     */
    public static function sendToUsersAndAdmin(Collection|array $users, Notification $notification): void
    {
        $users = collect($users);
        $recipients = $users->filter(fn ($u) => $u && !$u->notifications_muted);
        if ($recipients->isNotEmpty()) {
            NotificationFacade::send($recipients, $notification);
        }

        $admin = User::role('admin')->first();
        if (!$admin || $admin->notifications_muted) {
            return;
        }
        // لا ترسل مرتين للأدمن إذا كان ضمن القائمة
        if (!$recipients->pluck('id')->contains($admin->id)) {
            $admin->notify($notification);
        }
    }
}

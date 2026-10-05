<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * كل إشعارات المستخدم الحالي (مقروءة وغير مقروءة)
     */
    public function index()
    {
        $user = auth()->user();

        return response()->json([
            'unread_count' => $user->unreadNotifications->count(),
            'notifications' => $user->notifications()->latest()->limit(50)->get(),
        ]);
    }

    /**
     * الإشعارات الغير مقروءة فقط
     */
    public function unread()
    {
        $user = auth()->user();

        return response()->json([
            'unread_count' => $user->unreadNotifications->count(),
            'notifications' => $user->unreadNotifications,
        ]);
    }

    /**
     * تعليم إشعار واحد كمقروء
     */
    public function markAsRead($id)
    {
        $user = auth()->user();
        $notification = $user->notifications()->where('id', $id)->first();

        if (!$notification) {
            return response()->json(['message' => 'الإشعار غير موجود'], 404);
        }

        $notification->markAsRead();

        return response()->json(['message' => 'تم تعليم الإشعار كمقروء']);
    }

    /**
     * تعليم كل الإشعارات كمقروءة
     */
    public function markAllAsRead()
    {
        $user = auth()->user();
        $user->unreadNotifications->markAsRead();

        return response()->json(['message' => 'تم تعليم كل الإشعارات كمقروءة']);
    }

    /**
     * حذف إشعار
     */
    public function destroy($id)
    {
        $user = auth()->user();
        $notification = $user->notifications()->where('id', $id)->first();

        if (!$notification) {
            return response()->json(['message' => 'الإشعار غير موجود'], 404);
        }

        $notification->delete();

        return response()->json(['message' => 'تم حذف الإشعار']);
    }

    /**
     * تبديل حالة كتم الإشعارات للمستخدم الحالي
     */
    public function toggleMute(Request $request)
    {
        $user = auth()->user();
        $user->notifications_muted = !$user->notifications_muted;
        $user->save();

        return response()->json([
            'message' => $user->notifications_muted
                ? 'تم كتم الإشعارات'
                : 'تم تفعيل الإشعارات',
            'notifications_muted' => $user->notifications_muted,
        ]);
    }
}

import { useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import axios from "axios";

function Header() {
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // جلب الإشعارات غير المقروءة
  const fetchNotifications = async () => {
    const token = localStorage.getItem("token");
    if (!token) return; // لا تطلب إذا ما في token
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch (err) {
      if (err.response?.status === 401) {
        // token منتهي أو غير صالح — وقف الطلبات
        setNotifications([]);
        setUnreadCount(0);
      }
    }
  };

  // تعليم إشعار كمقروء
  const markAsRead = async (id) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await axios.post(
        `http://127.0.0.1:8000/api/notifications/${id}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("خطأ في تعليم الإشعار:", err);
    }
  };

  // تعليم الكل كمقروء
  const markAllAsRead = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      await axios.post(
        "http://127.0.0.1:8000/api/notifications/read-all",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (err) {
      console.error("خطأ:", err);
    }
  };

  // جلب عند التحميل وكل 60 ثانية بس (مش 30)
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // إغلاق القائمة عند الضغط خارجها
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (location.pathname === "/") return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-[70px] 
                  bg-white/75 backdrop-blur-md 
                 bg-gradient-to-l from-white/95 via-blue-50/30 to-white/95
                 border-b border-primary 
                 shadow-[0_4px_30px_rgba(74,144,226,0.06)] flex justify-between items-center px-4 md:px-8"
      dir="rtl"
    >
      {/* الشعار */}
      <div className="flex items-center">
        <img
          className="h-27 w-auto object-contain transition-transform duration-300 hover:scale-105"
          src="/logo.png"
          alt="شعار المشفى"
        />
      </div>

      {/* العنوان + الجرس */}
      <div className="flex items-center gap-4">
        <p className="text-[11px] md:text-[15px] font-black tracking-wide
                      bg-gradient-to-r from-[#1a4d8c] to-[#4a90e2] bg-clip-text text-transparent 
                      drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.05)] bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 transition-all duration-300 ease-in-out cursor-default
                      hover:-translate-y-0.5 
                      hover:shadow-[0_8px_20px_-4px_rgba(74,144,226,0.2)] 
                      hover:border-blue-200/80">
          نظام إدارة المناوبات وسجل العمليات الجراحية
        </p>

        {/* زر الجرس */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => {
              const opening = !showDropdown;
              setShowDropdown(opening);
              if (opening) {
                fetchNotifications();
                // تعليم الكل مقروء تلقائياً عند فتح القائمة
                if (unreadCount > 0) markAllAsRead();
              }
            }}
            className="relative p-2 rounded-full hover:bg-blue-50 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -left-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* قائمة الإشعارات */}
          {showDropdown && (
            <div className="absolute left-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
              {/* رأس القائمة */}
              <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100 bg-blue-50/50">
                <span className="font-bold text-blue-800 text-sm">الإشعارات</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    تعليم الكل كمقروء
                  </button>
                )}
              </div>

              {/* قائمة الإشعارات */}
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm">
                    لا توجد إشعارات
                  </div>
                ) : (
                  notifications.map((n) => {
                    const data = typeof n.data === "string" ? JSON.parse(n.data) : n.data;
                    const isUnread = !n.read_at;
                    return (
                      <div
                        key={n.id}
                        onClick={() => isUnread && markAsRead(n.id)}
                        className={`px-4 py-3 cursor-pointer transition hover:bg-blue-50/50 ${
                          isUnread ? "bg-blue-50/30" : ""
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {isUnread && (
                            <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                          <div className={isUnread ? "" : "mr-4"}>
                            <p className="text-sm text-slate-700 leading-relaxed">
                              {data?.message || "إشعار جديد"}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              {new Date(n.created_at).toLocaleDateString("ar-SY", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Header;

import React from "react";
import {
  FiDownload,
  FiShield,
  FiCalendar,
  FiClock,
  FiTrash2,
  FiList,
} from "react-icons/fi";
import { HiOutlineDatabase } from "react-icons/hi";
import { MdOutlineVerified } from "react-icons/md";
import {
  CloudUpload,
  CalendarDays,
  FileText,
  ShieldCheck,
  History,
  TableProperties,
  SlidersHorizontal,
  Info,
  CheckCircle2,
} from "lucide-react";
import { useState, useEffect } from "react";
import axios from "axios";

import { motion } from "framer-motion";

// ✅ FIX: دالة مساعدة للتعامل مع خطأ 401
// 👇 غيّر "/login" لمسار صفحة تسجيل الدخول عندك (مثال: "/Login" أو "/auth/login")
const handleAuthError = (error) => {
  if (error.response && error.response.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/";
  }
};

export default function BackUp() {
  const [backupType, setBackupType] = useState("weekly");
  const [showAll, setShowAll] = useState(false);
  const [backupLogs, setBackupLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [createBackup, setCreateBackup] = useState(false);

  // create backup now (backup button)
  const handleCreateBackup = async () => {
    try {
      setCreateBackup(true);
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://127.0.0.1:8000/api/backups-create",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );
      console.log("Create backup response:", response.data);
      alert(response.data.message || "تم إنشاء النسخة الاحتياطية بنجاح!");
      fetchBackupLogs();
    } catch (error) {
      console.error("حدث خطأ أثناء إنشاء نسخة احتياطية فورية:", error);
      // ✅ FIX: معالجة خطأ 401
      handleAuthError(error);
      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        alert(`فشلت العملية: ${error.response.data.message}`);
      } else if (error.response?.status !== 401) {
        alert(
          "عذراً، حدث خطأ داخلي في السيرفر أثناء محاولة إنشاء النسخة الاحتياطية.",
        );
      }
    } finally {
      setCreateBackup(false);
    }
  };

  // restore sql file
  const handleRestoring = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    console.log("the file :", file.name);
    const formData = new FormData();
    formData.append("backup_file", file);
    try {
      setRestoring(true);
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://127.0.0.1:8000/api/backups/restore-file",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
            Accept: "application/json",
          },
        },
      );
      console.log("restoring data : ", response.data);
      alert(response.data.message || "the backup done");
    } catch (error) {
      console.error("حدث خطأ اثناء استعادة النسخة الاحتياطية", error);
      // ✅ FIX: معالجة خطأ 401
      handleAuthError(error);
    } finally {
      setRestoring(false);
      fetchBackupLogs();
      // ✅ FIX: مسح قيمة الـ input لإتاحة رفع نفس الملف مرة ثانية
      e.target.value = null;
    }
  };

  // Download backup file (SQL)
  const handleDownload = async (logId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://127.0.0.1:8000/api/backups/download/${logId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          responseType: "blob",
        },
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const contentDisposition = response.headers["content-disposition"];
      const fileName = contentDisposition
        ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
        : `backup_${logId}.sql`;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("خطأ أثناء تحميل الملف:", error);
      // ✅ FIX: معالجة خطأ 401
      handleAuthError(error);
      if (error.response?.status !== 401) {
        alert("عذراً، فشل تحميل الملف.");
      }
    }
  };

  // Delete backup log
  const handleDelete = async (logId) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه النسخة الاحتياطية؟")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://127.0.0.1:8000/api/backups/${logId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      alert("تم حذف النسخة الاحتياطية بنجاح.");
      fetchBackupLogs();
    } catch (error) {
      console.error("خطأ أثناء الحذف:", error);
      // ✅ FIX: معالجة خطأ 401
      handleAuthError(error);
      if (error.response?.status !== 401) {
        alert("عذراً، فشل حذف النسخة الاحتياطية.");
      }
    }
  };

  // toggle weekly / monthly
  const handleToggleChange = async (selectedType) => {
    if (backupType === selectedType) return;
    const previousType = backupType;
    setBackupType(selectedType);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://127.0.0.1:8000/api/surgeries/backup-schedule",
        { backup_interval: selectedType },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );
      console.log("تم التحديث بنجاح الى :", selectedType);
    } catch (error) {
      setBackupType(previousType);
      // ✅ FIX: معالجة خطأ 401
      handleAuthError(error);
      if (error.response?.status !== 401) {
        alert("عذرا حدث فشل في تحديث الاعدادات حاول مجددا");
      }
    }
  };

  // Get Backup Logs
  const fetchBackupLogs = async () => {
    try {
      const token = localStorage.getItem("token");
      setLoading(true);
      const response = await axios.get(
        "http://127.0.0.1:8000/api/surgeries/backup-logs",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );
      setBackupLogs(response.data.data || []);
      console.log("fetchBackupLogs response:", response.data);
    } catch (error) {
      console.error("حدث خطأ اثناء جلب سجلات النسخ الاحتياطية", error);
      // ✅ FIX: معالجة خطأ 401
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackupLogs();
  }, []);

  const displayedLogs = showAll ? backupLogs : backupLogs.slice(0, 3);

  return (
    <motion.div
      className="w-full overflow-x-hidden"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div dir="rtl" className=" w-full min-h-screen p-4 md:p-8  ">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-5 rounded-[30px] p-3 border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl ">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FiDownload className="text-xl text-blue-400" />
                <h1 className="text-xl md:text-2xl font-black">
                  النسخ الاحتياطي
                </h1>
              </div>
              <p className="text-slate-800 font-bold text-xs md:text-sm">
                {" "}
                إدارة النسخ الاحتياطي للبيانات وحماية معلومات النظام
              </p>
            </div>
            <button
              onClick={handleCreateBackup}
              disabled={createBackup}
              className={`flex items-center gap-2 px-3 py-2 md:px-5 md:py-3 rounded-xl font-bold text-xs md:text-sm text-white shadow-lg shadow-blue-500/10 transition-all duration-300 ${
                createBackup
                  ? "bg-blue-400/50 cursor-not-allowed opacity-75"
                  : "bg-blue-500 hover:bg-blue-600 active:scale-[0.98] cursor-pointer"
              }`}
            >
              <CloudUpload
                className={`text-base ${createBackup ? "animate-bounce" : ""}`}
              />
              <span>
                {createBackup
                  ? "جاري إنشاء النسخة الاحتياطية..."
                  : "إنشاء نسخة احتياطية الآن"}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2  gap-6 p-4">
            {/* Schedule backup card */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 shadow-2xl flex flex-col justify-between">
              <div className="absolute bottom-0 right-0 w-40 h-40 bg-violet-500/10 blur-3xl rounded-full"></div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                {/* header  */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center shrink-0">
                    <FiCalendar className="text-xl text-violet-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold ">
                      جدولة النسخ الاحتياطي
                    </h2>
                    <p className="text-slate-600 font-bold text-xs mt-0.5">
                      اختر تفعيل النسخ الاحتياطي التلقائي بشكل دوري.
                    </p>
                  </div>
                </div>
                {/* Options */}
                <div className="space-y-3">
                  {/* Weekly Backup*/}
                  <div className="bg-white/5 border border-white/2 rounded-xl p-3 flex items-center justify-between transition-all">
                    <div className="flex items-center gap-3 ">
                      <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                        <FiClock className="text-lg text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">
                          أسبوعياً
                        </h3>
                        <p className="text-slate-600 text-xs mt-0.5 font-bold">
                          إجراء نسخة احتياطية كل يوم سبت الساعة 12:00 منتصف
                          الليل
                        </p>
                      </div>
                    </div>
                    <button
                      className={`w-12 h-7 rounded-full bg-blue-300 relative shrink-0 transition-colors duration-300 ease-in-out focus:outline-none ${backupType === "weekly" ? "bg-blue-500" : "bg-slate-700"}`}
                      onClick={() => {
                        handleToggleChange("weekly");
                      }}
                    >
                      <span
                        className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform duration-300 shadow-sm ease-in-out ${backupType === "weekly" ? "translate-x-5" : "translate-x-0"}`}
                      ></span>
                    </button>
                  </div>

                  {/* Monthly backup */}
                  <div className=" border border-white/5 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                        <FiCalendar className="text-lg text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">
                          شهرياً
                        </h3>
                        <p className="text-slate-600 text-xs mt-0.5 font-bold">
                          إجراء نسخة احتياطية في اليوم الأول من كل شهر
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        handleToggleChange("monthly");
                      }}
                      className={`w-12 h-7 rounded-full  relative shrink-0 transition-colors 
                                duration-300 ease-in-out focus:outline-none ${backupType === "monthly" ? "bg-violet-400" : "bg-slate-700"}`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform duration-300 shadow-sm ease-in-out ${backupType === "monthly" ? "translate-x-5" : "translate-x-0"}`}
                      ></span>
                    </button>
                  </div>
                </div>
                <div className="mt-4 rounded-xl border border-blue-500/10 bg-blue-500/5 px-4 py-2.5 text-slate-500 text-xs font-bold">
                  سيتم حفظ النسخ الاحتياطية تلقائياً في النظام.
                </div>
              </div>
            </div>

            {/* Export Card */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 shadow-2xl flex flex-col justify-between">
              <div className="absolute -top-16 -left-10 w-40 h-40 bg-emerald-500/10 blur-3xl rounded-full"></div>
              <div className="relative z-10 flex flex-col h-full justify-between asset-container">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <HiOutlineDatabase className="text-2xl text-emerald-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">استعادة البيانات</h2>
                    {/* ✅ FIX: أزلنا font-bold المكررة */}
                    <p className="text-slate-600 font-bold text-xs mt-0.5">
                      {" "}
                      قم باختيار ملف لاسترجاع قاعدة البيانات
                    </p>
                  </div>
                </div>
                {/* ex Button in middle*/}
                <div className="my-auto py-2 relative">
                  <label className="cursor-pointer group">
                    <input
                      type="file"
                      className="hidden"
                      accept=".sql,.zip"
                      disabled={restoring}
                      onChange={handleRestoring}
                    />
                    {/* ✅ FIX: bg-linear-to-r → bg-gradient-to-r (كلاس Tailwind الصحيح) */}
                    <div className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-400 group-hover:scale-[1.01] group-active:scale-[0.99] transition-all duration-300 text-sm font-bold text-white shadow-lg shadow-emerald-500/15 flex items-center justify-center gap-2">
                      <FiDownload className="text-base" />
                      <span>
                        {" "}
                        {restoring
                          ? "جاري استعادة البيانات..."
                          : "استعادة البيانات الآن"}
                      </span>
                    </div>
                  </label>
                </div>
                <div className="mt-4 rounded-xl border border-blue-500/10 bg-blue-500/5 px-4 py-2.5 text-slate-500 text-xs font-bold">
                  سيتم استبدال جميع البيانات الحالية في النظام
                </div>
              </div>
            </div>
          </div>

          {/* Protection Card */}
          <div className="rounded-[30px] border border-white/10 bg-white/5 backdrop-blur-xl p-2 shadow-2xl flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-xl font-black text-emerald-400 mb-3 pr-2">
                حماية بياناتك أولوية لدينا
              </h2>
              <p className="text-slate-400 text-lg pr-3 font-black">
                جميع البيانات يتم نسخها بشكل آمن ويمكن استعادتها في أي وقت عند
                الحاجة.
              </p>
            </div>
            <div className="w-12 h-12 rounded-full border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center">
              <MdOutlineVerified className="text-3xl text-emerald-400" />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 sm:p-6 shadow-2xl overflow-hidden max-w-7xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold mb-1 ">
                  سجل النسخ الاحتياطي
                </h2>
                <p className="text-slate-500 text-sm sm:text-sm ">
                  آخر عمليات النسخ الاحتياطي الناجحة.
                </p>
              </div>
              <button
                onClick={() => setShowAll(!showAll)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 border ${
                  showAll
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20"
                    : "bg-white/3 text-slate-500 border-blue-500/30 hover:bg-white/8 hover:text-slate-200"
                }`}
              >
                <FiList className="text-sm" />
                {showAll ? "عرض الأحدث فقط" : "كل السجلات"}
              </button>
            </div>
            <div className="w-full overflow-x-auto max-h-[450px] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 rounded-xl border border-white/10">
              <table
                className="w-full min-w-[700px] border-collapse text-right"
                dir="rtl"
              >
                <thead>
                  <tr className="bg-blue-400 text-white border-b border-white/10 sticky top-0 z-10">
                    <th className="py-3 px-4 text-sm text-center font-medium">
                      #
                    </th>
                    <th className="py-3 px-4 text-sm text-center font-medium">
                      تاريخ ووقت النسخ
                    </th>
                    <th className="py-3 px-4 text-sm text-center font-medium">
                      نوع النسخة
                    </th>
                    <th className="py-3 px-4 text-sm text-center font-medium">
                      حجم الملف
                    </th>
                    <th className="py-3 px-4 text-sm text-center font-medium">
                      الحالة
                    </th>
                    <th className="py-3 px-4 text-sm text-center font-medium">
                      الإجراءات
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5 ">
                  {loading ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="py-8 text-center text-slate-600"
                      >
                        جار تحميل السجلات
                      </td>
                    </tr>
                  ) : displayedLogs.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="py-8 text-center text-slate-600"
                      >
                        لايوجد سجلات نسخ احتياطية حاليا
                      </td>
                    </tr>
                  ) : (
                    displayedLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-white/20 transition-all duration-300"
                      >
                        <td className="py-3 px-4 text-sm text-center text-slate-400 font-mono ">
                          {log.id}
                        </td>
                        <td className="py-3 px-4 text-sm text-center text-slate-700">
                          {log.date}
                        </td>
                        <td className="py-3 px-4 text-sm text-center">
                          <div className="flex items-center justify-center gap-1.5 ">
                            {/* ✅ FIX: القيم الآن تأتي بالعربي مباشرةً من الـ API */}
                            <span
                              className={`text-sm text-white px-3 py-1 rounded-2xl ${
                                log.backup_type === "أسبوعي"
                                  ? "bg-blue-300"
                                  : log.backup_type === "شهري"
                                    ? "bg-violet-300"
                                    : "bg-green-300"
                              }`}
                            >
                              {log.backup_type}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-center text-slate-700 font-mono">
                          {log.file_size}
                        </td>
                        <td className="py-3 px-4 text-sm text-center">
                          {/* أيقونة فقط بدون نص */}
                          <span className="inline-flex items-center justify-center text-emerald-400 bg-emerald-500/10 p-1.5 rounded-md">
                            <MdOutlineVerified className="text-lg" />
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleDownload(log.id)}
                              className="w-8 h-8 rounded-lg bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/20 transition-all duration-300 flex items-center justify-center"
                              title="تحميل النسخة الاحتياطية"
                            >
                              <FiDownload className="text-sm" />
                            </button>
                            <button
                              onClick={() => handleDelete(log.id)}
                              className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 transition-all duration-300 flex items-center justify-center"
                              title="حذف"
                            >
                              <FiTrash2 className="text-sm" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex items-center justify-center gap-2 text-slate-400 text-xs sm:text-sm border-t border-white/5 pt-4 font-bold">
              <FiShield className="text-base" />
              <span>جميع النسخ الاحتياطية مشفرة ومخزنة بأمان</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

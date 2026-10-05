import axios from "axios";
import { color } from "framer-motion";
import React, { useEffect, useState } from "react";
import { IoMdArrowUp } from "react-icons/io";
import { MdCheckCircle, MdPeople } from "react-icons/md";
import { GoClock } from "react-icons/go";
import { LuAlarmClockCheck } from "react-icons/lu";
import { motion } from "framer-motion";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { FaPlus } from "react-icons/fa";
import { Link as LucideLink } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";

function Dashboard() {
  const [doctorsTable, setDoctorsTable] = useState([]);
  const [CommingShifts, setCommingShifts] = useState([]);
  const [doctorsToday, setDoctorsToday] = useState();
  const [surgeriesToday, setSurgeriesToday] = useState();
  const [totalShiftHours, setTotalShiftHours] = useState(null);
  const [avgHoursPerDept, setAvgHoursPerDept] = useState(null);
  const [surgeriesTable, setSurgeriesTable] = useState([]);
  const [surgeriesPercent, setSurgeriesPercent] = useState([]);
  const [auditlogs, setAuditlogs] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [openModal,setOpenModal]=useState(false)
    const [showAddModal, setShowAddModal] = useState(false);

  const items=[
    {
      label:"الأطباء المناوبون اليوم",
      value:doctorsToday,
      icon:<MdPeople size={35} />,
      color: "text-blue-200",
       bg:"bg-blue-200",
       border: "border-blue-200",
    },
    {
        label:" العمليات المنجزة اليوم",
      value:surgeriesToday,
      icon: <IoMdArrowUp size={35} />,
      color: "text-green-200",
         bg:"bg-green-200",
         border: "border-green-200",

    },{
        label:" عدد ساعات  المناوبات في كل الأقسام",
       value:totalShiftHours,
      icon:<GoClock size={35} />,
      color: "text-yellow-200",
       bg:"bg-yellow-200",
       border: "border-yellow-200",

    },{
      label:" متوسط عدد ساعات المناوبات للقسم الواحد   ",
       value:avgHoursPerDept,
      icon: <LuAlarmClockCheck size={35} />,
      color: "text-red-200",
          bg:"bg-red-200",
        border: "border-red-200",

    }
  ]

  // عملية جديدة 
   const resetForm = () => {
    setFormData({
      date: "",
      patient_name: "",
      file_number: "",
      surgery_name: "",
      specialist_doctor: "",
      residents: "",
      anes_specialist: "",
      anes_residents: "",
      anes_type: "",
      biopsy_number: "",
      materials: "",
      nurse_name: "",
      notes: "",
    });
    setSelectedResidentObjects([]);
    setSelectedAnesResidentObjects([]);
    setSelectedYear("");
    setSelectedDept("");
    setSelectedYearAnes("");
    setEditId(null);
    setIsEditing(false);
    setFormErrors({});
    setIsSaving(false);
    setAnesTypeSelected("");
    setAnesTypeCustom("");
    setPatientSuggestions([]);
    setShowSuggestions(false);
  };
  const doctorsOnDuty=async()=> {
    const token = localStorage.getItem("token");
  try{
    const response=await axios.get("http://127.0.0.1:8000/api/dashboard",{
      headers:{
        Authorization: `Bearer ${token}`,
      Accept: "application/json",
      }
      
    })
    console.log("response =", response);
    console.log("response.data =", response.data);
     setDoctorsTable(response.data.doctorsTable || [])
     setDoctorsToday(response.data.summaryCards.doctorsToday || [])
     setSurgeriesToday(response.data.summaryCards.surgeriesToday || [])
     setTotalShiftHours(response.data.summaryCards.totalShiftHours ?? null)
     setAvgHoursPerDept(response.data.summaryCards.avgHoursPerDept ?? null)
     setSurgeriesTable(response.data.surgeriesTable || [])
     setSurgeriesPercent(response.data.chartData || [])
     setCommingShifts(response.data.tomorrowShifts || [])
    setAuditlogs(response.data.auditlogs || [])
    setAlerts(response.data.alerts || [])
    
    
   }catch(err){
    console.log(err)
  }
}
 useEffect(()=>{
  console.log(localStorage.getItem("token"));

  doctorsOnDuty()
  // console.log(doctorsTable)
  //  console.log(surgeriesToday)
  console.log(surgeriesPercent)
   console.log(auditlogs)
},[])

useEffect(() => {
  const onKey = (e) => {
    if (e.key === "Escape") setOpenModal(false);
  };
  if (openModal) window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, [openModal]);

const COLORS = [
  "#BAE6FD",
  "#cda2f7", 
  "#A7F3D0",
  "#FCE7F3", 
  "#FDA4AF",
  "#f7e59e",
  "#E9D5FF",
  "#aaf8c6",  
  "#FFCAD4",
  "#CCFBF1",
  "#E8E8E4",
  "#CFFAFE",
  "#FFEDD5",
  "#FFAAA6",
];

console.log(doctorsToday)
 console.log(surgeriesToday)
const today=new Date().toISOString().split("T")[0]
console.log(today)

  return (
   <motion.div
        className="w-full overflow-x-hidden"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
  <div
    className="w-full min-h-screen p-4 md:p-8 flex flex-col gap-[20px]"
    dir="rtl"
  >
    {/* Header */}
    <div className="mb-10 text-center lg:text-right">
      <h1 className="text-3xl font-bold  text-primary">
        أهلاً بك مسؤول النظام  
      </h1>
      <p className="text-slate-900 mt-2 font-bold">
    دعنا نلقي نظرة على نشاط المستشفى اليوم <span className="py-[10px] px-[10px] rounded-2xl bg-[#eee] hover:bg-[#c1bdbd]">  {today} </span>
      </p>
    </div>

    {/* Statistics Cards */}
   <div className="flex flex-col md:flex-row md:flex-wrap  justify-around   gap-[10px] md:gap-[1%]">
      {items?.map((item, index) => (
       <div key={index}
         className={`
    relative
    group
    overflow-hidden
    rounded-3xl
    border-4
    ${item.border}
    w-[95%]
    md:w-[48%]
    lg:w-[23%]
    bg-white
    md:mb-[10px]
    p-6
    shadow-[0_15px_35px_-15px_rgba(0,0,0,0.25)]
    hover:shadow-[0_25px_50px_-12px_rgba(59,130,246,0.35)]
    hover:-translate-y-1
    
    duration-300
        `}
        >
    {/* card summary */}
      <div className="absolute inset-0 bg-gradient-to-right from-blue-500/5 via-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

      <div className="relative flex items-center justify-around">
        <div>
          <h2 className="text-sm font-semibold text-slate-500 mb-2">
            {item.label}
          </h2>

          <p className={`text-3xl ${item.color} font-bold  mt-[10px]`}>
            {item.value ?? "--"}
          </p>
        </div>

        <div
          className={`
              flex
            h-10
            w-10
            items-center
            justify-center
            rounded-2xl
            border
            ${item.border}
           ${item.bg}
           
            shadow-md
            
            `

          }          
        >
          {item.icon}
        </div>
      </div>

    
    </div>
  ))}
</div>

    {/* Doctors Table */}
    <div className="bg-white max-h-[300px] rounded-3xl shadow-lg overflow-y-auto">
      <div className="bg-gradient-to-l from-blue-700 to-cyan-600 p-5 flex justify-between items-center">
        <h3 className="text-white font-bold text-lg">
          قائمة الأطباء المناوبين اليوم
        </h3>

        <button className="bg-white/20 text-white px-4 py-2 rounded-xl text-sm hover:bg-white/30 transition cursor-pointer" onClick={()=>setOpenModal(true)}>
          عرض الكل
        </button>
      </div>
      {openModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setOpenModal(false)}
        >
          <div className="absolute inset-0 bg-black/50" />

          <div
            className="relative bg-white rounded-3xl shadow-lg w-[95%] max-w-4xl max-h-[100vh] overflow-auto p-6 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">جميع الأطباء المناوبين</h3>
              <button
                onClick={() => setOpenModal(false)}
                className="text-slate-600 hover:text-slate-900 rounded-full p-2"
                aria-label="Close modal"
              >
                ✖
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead >
                  <tr className="bg-slate-100  text-slate-700">
                    <th className="p-4 text-center">اسم الطبيب</th>
                    <th className="p-4 text-center">القسم</th>
                    <th className="p-4 text-center">مكان المناوبة</th>
                    <th className="p-4 text-center">السنة الدراسية</th>
                    <th className="p-4 text-center">بداية المناوبة</th>
                    <th className="p-4 text-center">نهاية المناوبة</th>
                  </tr>
                </thead>

                <tbody>
                  {doctorsTable?.map((doctor, index) => (
                    <tr
                      key={index}
                      className="border-b even:bg-slate-50 hover:bg-blue-50 transition-colors"
                    >
                      <td className="p-4 text-center font-semibold text-slate-700">
                        {doctor.userName}
                      </td>

                      <td className="p-4 text-center">
                        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                          {doctor.specialty}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                          {doctor.location}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                          {doctor.study_year ?? "—"}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <span className="px-3 py-1 rounded-lg bg-green-100 text-green-700 text-sm font-bold">
                          {doctor.start_time}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <span className="px-3 py-1 rounded-lg bg-red-100 text-red-700 text-sm font-bold">
                          {doctor.end_time}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-100 text-slate-700">
              <th className="p-4 text-center">اسم الطبيب</th>
              <th className="p-4 text-center">القسم</th>
              <th className="p-4 text-center">مكان المناوبة</th>
              <th className="p-4 text-center">السنة الدراسية</th>
              <th className="p-4 text-center">بداية المناوبة</th>
              <th className="p-4 text-center">نهاية المناوبة</th>
            </tr>
          </thead>

          <tbody>
            {doctorsTable?.map((doctor, index) => (
              <tr
                key={index}
                className="
                border-b
                even:bg-slate-50
                hover:bg-blue-50
                transition-colors
              "
              >
                <td className="p-4 text-center font-semibold text-slate-700">
                  {doctor.userName}
                </td>

                <td className="p-4 text-center">
                  <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                    {doctor.specialty}
                  </span>
                </td>

                <td className="p-4 text-center">
                  <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                    {doctor.location}
                  </span>
                </td>

                <td className="p-4 text-center">
                  <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                    {doctor.study_year ?? "—"}
                  </span>
                </td>

                <td className="p-4 text-center">
                  <span className="px-3 py-1 rounded-lg bg-green-100 text-green-700 text-sm font-bold">
                    {doctor.start_time}
                  </span>
                </td>

                <td className="p-4 text-center">
                  <span className="px-3 py-1 rounded-lg bg-red-100 text-red-700 text-sm font-bold">
                    {doctor.end_time}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

  
  </div>
  
<div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

  {/* surgeries */}
  <div className="rounded-3xl max-h-[400px] border border-slate-200 bg-white p-6 shadow-lg ">
    
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-slate-800">
          العمليات الجراحية المنجزة اليوم
        </h1>
        <p className="text-sm text-slate-500">
          قائمة العمليات المنفذة خلال اليوم
        </p>
      </div>

      <div className="rounded-2xl bg-blue-100 p-3">
        🏥
      </div>
    </div>

    <div className="max-h-[300px] space-y-4 overflow-y-auto pr-2">

      {surgeriesTable?.map((surgery, index) => (
        <div
          key={index}
          className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
        >
        <div className="flex justify-between">
              <h2 className="mb-3 font-semibold text-slate-800">
            {surgery.surgery_name}
          </h2>
           <span className="mb-3  text-slate-800">
           🏢  {surgery.department}
          </span>
           </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              👨‍⚕️ {surgery.specialist_doctor}
            </p>

            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
             المريض/ة : {surgery.patient_name}
            </span>
          </div>
        </div>
                

      ))}
      

    </div>
  </div>

  {/* آخر التعديلات */}
  <div className="rounded-3xl max-h-[400px] border  border-slate-200 bg-white p-6 shadow-lg">

    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-slate-800">
          آخر التعديلات
        </h1>

        <p className="text-sm text-slate-500">
          نشاط المستخدمين داخل النظام
        </p>
      </div>

      <div className="rounded-2xl bg-orange-100 p-3">
        📋
      </div>
    </div>

    <div className="max-h-[300px] space-y-4 overflow-y-auto pr-2">

      {auditlogs?.map((log, index) => (
        <div
          key={index}
          className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
        >
          {/* الأيقونة + الجملة الواضحة */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">
              {log.action_icon}
            </span>
            <h2 className="font-semibold text-slate-800">
              {log.action_label}
            </h2>
          </div>

          <div className="space-y-2 ">
            <div className="flex justify-between"> 
              <p className="text-sm text-slate-600">
              👨‍⚕️ {log.specialist_doctor}
            </p>

            <p className="text-sm text-slate-600">
              🏢 {log.specialty}
            </p>
            </div>

            {/* تفاصيل العملية — مناوبة لمين / اسم العملية */}
            {log.entity === "shifts" && log.details?.shift_for_user_name && (
              <p className="text-sm text-blue-600">
                👤 المناوبة لـ: {log.details.shift_for_user_name}
              </p>
            )}

            {log.entity === "shifts" && log.details?.date && (
              <p className="text-sm text-slate-500">
                📅 تاريخ ووقت المناوبة: {log.details.date} | {log.details.start_time} ← {log.details.end_time}
              </p>
            )}

            {log.entity === "surgeries" && log.details?.surgery_name && (
              <p className="text-sm text-blue-600">
                🏥  {log.details.surgery_name}
              </p>
            )}

            {log.entity === "surgeries" && log.details?.patient_name && (
              <p className="text-sm text-slate-500">
                🧑 {log.details.patient_name}
              </p>
            )}

            {log.entity === "surgeries" && log.details?.date && (
              <p className="text-sm text-slate-500">
                📅 تاريخ العملية: <span dir="ltr">{log.details.date}</span>
              </p>
            )}

            {/* التغييرات عند التعديل */}
            {log.action_type === "update" && log.details?.changed_fields && 
              Object.keys(log.details.changed_fields).length > 0 && (
              <div className="bg-white rounded-xl p-2 border border-slate-200 mt-1">
                <p className="text-xs text-slate-400 mb-1">التغييرات:</p>
                {Object.entries(log.details.changed_fields)
                  .filter(([field]) => !['updated_at','created_at'].includes(field))
                  .map(([field, val], i) => {
                    const from = String(val.from ?? '').substring(0, 30);
                    const to   = String(val.to   ?? '').substring(0, 30);
                    const fieldNames = {
                      surgery_name: 'اسم العملية',
                      patient_name: 'اسم المريض',
                      specialist_doctor: 'الطبيب',
                      anes_specialist: 'طبيب التخدير',
                      anes_type: 'نوع التخدير',
                      nurse_name: 'الممرضة',
                      date: 'التاريخ',
                      materials: 'المواد',
                      notes: 'الملاحظات',
                      biopsy_number: 'رقم العينة',
                      start_time: 'وقت البداية',
                      end_time: 'وقت النهاية',
                      department_id: 'القسم',
                    };
                    const formatVal = (v) => {
                      if (!v && v !== 0) return '—';
                      const s = String(v);
                      // لو صيغة ISO حولها لتاريخ بسيط
                      if (s.match(/^\d{4}-\d{2}-\d{2}T/)) {
                        return s.substring(0, 10);
                      }
                      return s.substring(0, 40);
                    };
                    return (
                      <p key={i} className="text-xs text-slate-600">
                        • {fieldNames[field] ?? field}:{" "}
                        <span className="text-red-400">{formatVal(val.from)}</span>
                        {" ← "}
                        <span className="text-green-500">{formatVal(val.to)}</span>
                      </p>
                    );
                  })}
              </div>
            )}

            <div className="flex justify-between border-t pt-3">
              <span className="text-xs text-slate-500">
                📅 {log.date}
              </span>
              <span className="text-xs text-slate-500">
                🕐 {log.time}
              </span>
            </div>
          </div>
        </div>
      ))}

    </div>
  </div>

</div>  
    <div className="flex  flex-col justify-between lg:flex-row gap-[1%] ">
    {/* Pie Chart */}
       <div className="bg-white rounded-3xl shadow-lg p-6 mb-8  lg:mt-[10px] lg:w-[48%]">
        <h3 className="text-xl font-bold text-slate-700 mb-6">
    توزيع أنواع العمليات اليوم  
        </h3>

     <div className="h-[350px]">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={surgeriesPercent}
          cx="50%"
          cy="50%"
          outerRadius={120}
          dataKey="count"
           nameKey="department"
          label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
        >
          {surgeriesPercent.map((entry, index) => (
            <Cell
              key={index}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </Pie>

        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
      </div>
      </div>
      {/* المناوبات القادمة */}
      <div className="bg-white rounded-3xl shadow-lg p-6 mb-8  lg:mt-[10px] lg:w-[48%] ">

        <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-slate-800">
          المناوبات القادمة لليوم التالي 
        </h1>

        <p className="text-sm text-slate-500">
         الاطلاع على المناوبات القادمة
        </p>
      </div>

      <div className="rounded-2xl bg-orange-100 p-3">
        ⏩
      </div>
        </div>
     
         <div className="max-h-[300px] space-y-4 overflow-y-auto pr-2">

       {CommingShifts?.map((shift, index) => (
        <div
          key={index}
          className="rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
        >
          <div className="space-y-2">
            {/* اسم الطبيب + القسم */}
            <div className="flex justify-between">
              <p className="text-sm text-slate-600">
                👨‍⚕️ {shift.userName}
              </p>
              <p className="text-sm text-slate-600">
                🏢 {shift.specialty}
              </p>
            </div>

            {/* الموقع + السنة الدراسية */}
            <div className="flex justify-between">
              <p className="text-sm text-slate-500">
                📍 {shift.location ?? "—"}
              </p>
              <p className="text-sm text-slate-500">
                السنة: {shift.study_year ?? "—"}
              </p>
            </div>

            {/* التاريخ + الوقت */}
            <div className="flex justify-between border-t pt-3">
              <span className="text-xs text-slate-500">
                {shift.date}
              </span>
              <div className="flex gap-[10px]">
                <span className="text-xs text-slate-500">{shift.start_time}</span>
                <span className="text-xs text-slate-500">→</span>
                <span className="text-xs text-slate-500">{shift.end_time}</span>
              </div>
            </div>
          </div>
        </div>
      ))}

        </div>
    </div>
   </div>
   {/* تنبيهات */}
   <div className="w-full bg-white p-5 rounded-3xl shadow-lg" > 

     <div className="mb-6 flex items-center justify-between">
       <div>
         <h1 className="text-xl font-bold text-slate-800">
           التنبيهات
         </h1>
         <p className="text-sm text-slate-500">
           معلومات قد تهمك
         </p>
       </div>
       <div className="flex items-center gap-2">
         <span className="rounded-full bg-red-100 text-red-700 text-xs font-bold px-3 py-1">
           {alerts.length} تنبيه
         </span>
         <div className="rounded-2xl bg-red-100 p-3">
           🔔
         </div>
       </div>
     </div>

     {alerts.length === 0 ? (
       <div className="text-center py-8 text-slate-400">
         <span className="text-4xl block mb-2">✅</span>
         لا توجد تنبيهات حالياً
       </div>
     ) : (
       <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
         {alerts.map((alert, index) => (
           <div
             key={index}
             className={`
               rounded-2xl
               border-2
               p-4
               transition-all
               duration-300
               hover:-translate-y-1
               hover:shadow-md
               ${alert.level === "danger"
                 ? "border-red-200 bg-red-50"
                 : "border-amber-200 bg-amber-50"
               }
             `}
           >
             <div className="flex items-start gap-3">
               <span className="text-2xl flex-shrink-0">
                 {alert.level === "danger" ? "🚨" : "⚠️"}
               </span>
               <div className="flex-1 min-w-0">
                 <div className="flex items-center justify-between mb-1">
                   <h3 className="font-semibold text-slate-800 text-sm">
                     {alert.title}
                   </h3>
                   <span
                     className={`
                       text-[10px]
                       px-2
                       py-0.5
                       rounded-full
                       font-bold
                       ${alert.level === "danger"
                         ? "bg-red-100 text-red-700"
                         : "bg-amber-100 text-amber-700"
                       }
                     `}
                   >
                     {alert.level === "danger" ? "عاجل" : "تحذير"}
                   </span>
                 </div>
                 <p className="text-sm text-slate-600">
                   {alert.message}
                 </p>
               </div>
             </div>
           </div>
         ))}
       </div>
     )}

   </div>
   <div className="bg-white p-6 rounded-3xl text-center shadow-md"> 
    <h1 className="font-bold text-2xl mb-4">إجراءات سريعة</h1>
    <div className="flex flex-col lg:flex-row justify-center items-center gap-4"> 
       <RouterLink to="/adminDash/users" className="flex items-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-xl shadow hover:bg-blue-700 transition-transform transform hover:-translate-y-0.5">
         <FaPlus />
         <span className="font-medium">إضافة مستخدم جديد</span>
       </RouterLink>

       <RouterLink to="/adminDash/operations" className="flex items-center gap-3 px-4 py-3 bg-green-600 text-white rounded-xl shadow hover:bg-green-700 transition-transform transform hover:-translate-y-0.5">
         <FaPlus />
         <span className="font-medium">إنشاء عملية جراحية جديدة</span>
       </RouterLink>
     </div>
   </div>
</div>

 </motion.div>
);
}

export default Dashboard;
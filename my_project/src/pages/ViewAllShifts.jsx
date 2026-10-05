/* eslint-disable react-hooks/refs */
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import arLocale from "@fullcalendar/core/locales/ar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { User, Clock, MapPin, Building2 } from "lucide-react";
import axios from "axios";
import { motion } from "framer-motion";

const colors = [
  "#3b82f6",
  "#10b981",
  "#0ea5e9",
  "#F5BCBA",
  "#93c5fd",
  "#64748b",
  "#14b8a6",
  "#6366f1",
  "#f87171",
];

export default function ViewAllShifts() {
  const [shifts, setShifts] = useState([]);
  const [selectedShift, setSelectedShift] = useState(null);
  const [currentCalenderDate, setCurrentCalenderDate] = useState(new Date());
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState("my_shifts");
  const [selectedYear, setSelectedYear] = useState("");
  const [hoverInfo, setHoverInfo] = useState(null);
  const doctorColors = useRef({});

  const studyYears = [
    { id: "1", label: "سنة اولى" },
    { id: "2", label: "سنة ثانية" },
    { id: "3", label: "سنة ثالثة" },
    { id: "4", label: "سنة رابعة" },
    { id: "5", label: "سنة خامسة" },
  ];

  const normalizeYearValue = (value) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    if (/^[1-9]\d*$/u.test(raw)) return raw;
    if (/اولى|1/u.test(raw)) return "1";
    if (/ثانية|2/u.test(raw)) return "2";
    if (/ثالثة|3/u.test(raw)) return "3";
    if (/رابعة|4/u.test(raw)) return "4";
    return raw;
  };

  // get shifts
  const fetchShifts = useCallback(
    (selection, date = new Date(), yearFilter = selectedYear) => {
      const token = localStorage.getItem("token");
      let params = {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
      };
    if (selection === "my_shifts") {
      params.only_mine = "true";
    } else {
      params.department_id = selection;
    }
    if (yearFilter) {
      params.study_year = normalizeYearValue(yearFilter);
    }
    axios
      .get("http://127.0.0.1:8000/api/shifts", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "Application/json",
        },
        params: params,
      })
      .then((res) => {
        let actualShifts = res.data.shifts || [];
        if (yearFilter) {
          const normalizedYearFilter = normalizeYearValue(yearFilter);
          actualShifts = actualShifts.filter((shift) => {
            const shiftYear = normalizeYearValue(shift.study_year ?? shift.year);
            return shiftYear && shiftYear === normalizedYearFilter;
          });
        }
        setShifts(actualShifts);
      })
      .catch((err) => console.log("خطأ في جلب المناوبات", err));
    },
    [selectedYear]
  );

  // get department
  const fetchDepartment = () => {
    const token = localStorage.getItem("token");
    axios
      .get("http://127.0.0.1:8000/api/department", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "Application/json",
        },
      })
      .then((res) => setDepartments(res.data))
      .catch((err) => console.log("خطأ في جلب الأقسام", err));
  };

  useEffect(() => {
    fetchDepartment();
  }, []);

  useEffect(() => {
    if (selectedDeptId) {
      fetchShifts(selectedDeptId, currentCalenderDate, selectedYear);
    }
  }, [selectedDeptId, currentCalenderDate, selectedYear, fetchShifts]);

  const events = useMemo(() => {
    if (!Array.isArray(shifts) || shifts.length === 0) return [];
    return shifts.map((shift) => {
      const deptName = shift.department || "قسم غير معروف";
      if (!doctorColors.current[deptName]) {
        doctorColors.current[deptName] =
          colors[Object.keys(doctorColors.current).length % colors.length];
      }
      return {
        title: shift.doctor,
        start: shift.date,
        backgroundColor: doctorColors.current[deptName],
        textColor: "white",
        allDay: true,
        extendedProps: { shiftData: shift },
      };
    });
  }, [shifts]);

  const handleEventClick = (info) => {
    setSelectedShift(info.event.extendedProps.shiftData);
  };

  const handleDatesSet = useCallback((arg) => {
    const newDate = arg.view.currentStart.getTime();
    setCurrentCalenderDate((prev) => {
      if (prev && prev.getTime() === newDate) return prev;
      return arg.view.currentStart;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedShift(null);
      }
    };
    if (selectedShift) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedShift]);

  return (
    <motion.div
      className="w-full z-40 flex"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="w-[95%] mx-auto mt-10 md:mt-15" dir="rtl">
        <div className="mb-8 p-6 bg-white rounded-2xl shadow-mb border border-gray-100 flex flex-col lg:flex-row items-center justify-around gap-6">
          <div className=" flex items-center gap-4 w-full lg:w-auto justify-center lg:justify-start">
            <div className="flex flex-col lg:flex-row items-center gap-3 cursor-default transition-all duration-300 ease-in-out hover:-translate-y-0.5 group">
              <div
                className="p-3 bg-blue-100 rounded-xl shrink-0 transition-all duration-300 
                  group-hover:scale-105 group-hover:bg-blue-500 group-hover:text-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-blue-600 group-hover:text-white transition-colors duration-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>

              <h2
                className="text-xl font-black lg:whitespace-nowrap text-center lg:text-right text-slate-800 
                 hover:bg-gradient-to-r hover:from-[#1a4d8c] hover:to-[#4a90e2] hover:bg-clip-text hover:text-transparent"
              >
                إدارة مناوبات الأقسام
              </h2>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch gap-3 w-full lg:w-auto">
            <div className="flex items-center  gap-3 flex-1">
              <p className="text-base sm:text-lg md:text-md font-black text-slate-700 tracking-wide">
                اختر القسم :
              </p>
              <div className="relative w-full md:w-72">
                <select
                  className=" w-full appearance-none bg-gray-100 text-gray-700 py-3 px-5 pr-10 rounded-xl font-medium focus:outline-none focus:border-primary focus:bg-white transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md "
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                >
                  <option value="my_shifts">مناوباتي</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-primary">
                  <svg
                    className="fill-current h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-1">
              <p className="text-base sm:text-lg md:text-md font-black text-slate-700 tracking-wide">
                اختر السنة :
              </p>
              <div className="relative w-full md:w-72">
                <select
                  className=" w-full appearance-none bg-gray-100 text-gray-700 py-3 px-5 pr-10 rounded-xl font-medium focus:outline-none focus:border-primary focus:bg-white transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md "
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  <option value="">كل السنوات</option>
                  {studyYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-primary">
                  <svg
                    className="fill-current h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="overflow-hidden shadow-lg rounded-lg border border-gray-200">
          <FullCalendar
            plugins={[
              dayGridPlugin,
              timeGridPlugin,
              listPlugin,
              interactionPlugin,
            ]}
            direction="rtl"
            locales={[arLocale]}
            locale="ar"
            initialView="dayGridMonth"
            datesSet={handleDatesSet}
            events={events}
            displayEventTime={false}
            eventClick={handleEventClick}
            dayMaxEvents={false}
            eventDisplay="block"
            height="auto"
            eventMouseEnter={(info) => {
              const data = info.event.extendedProps?.shiftData;
              if (!data) return;
              const clientX = info.jsEvent?.clientX || 0;
              const clientY = info.jsEvent?.clientY || 0;
              const wHeight = window.innerHeight || 800;
              const wWidth = window.innerWidth || 1200;
              setHoverInfo({
                data: data,
                x: clientX,
                y: clientY,
                windowHeight: wHeight,
                windowWidth: wWidth,
              });
            }}
            eventMouseLeave={() => {
              setHoverInfo(null);
            }}
          />
        </div>

        {selectedShift && (
          <div
            className="fixed inset-0 flex justify-center items-center z-50 backdrop-blur-sm bg-black/30"
            onClick={() => {
              setSelectedShift(null);
            }}
          >
            <div
              className="bg-white p-6 rounded-xl w-[300px] shadow-2xl relative text-right"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-red-600 text-2xl font-bold"
                onClick={() => setSelectedShift(null)}
              >
                ×
              </button>
              <h2 className="text-xl font-bold mb-4 text-primary border-b pb-2">
                👨‍⚕️ {selectedShift.doctor}
              </h2>
              <div className="space-y-3">
                <p className="font-bold ">📅 التاريخ : {selectedShift.date}</p>
                <p className="font-bold ">
                  🕒 الوقت : {selectedShift.startTime} {"->"}{" "}
                  {selectedShift.endTime}
                </p>
                <p className="font-bold ">🏥 المكان : {selectedShift.place}</p>
                <p className="font-bold ">📆 السنة : {selectedShift.year}</p>
              </div>
              <button
                className="w-full mt-6 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-red-700"
                onClick={() => setSelectedShift(null)}
              >
                إغلاق
              </button>
            </div>
          </div>
        )}
        
        {hoverInfo &&
          (() => {
            const tooltipHeight = 200; 
            const tooltipWidth = 240;  
            const x = hoverInfo.x ?? 0;
            const y = hoverInfo.y ?? 0;
            const winH = hoverInfo.windowHeight ?? window.innerHeight;
            const winW = hoverInfo.windowWidth ?? window.innerWidth;
            
            let topPos = y + 10;
            if (y + tooltipHeight > winH) {
              topPos = y - tooltipHeight - 10;
            }
            
            let leftPos = x + 10;
            if (x + tooltipWidth > winW) {
              leftPos = x - tooltipWidth - 10;
            }

            return (
              <div
                className="fixed z-[100] pointer-events-none bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-xl border border-blue-50 animate-tooltip w-60 text-right"
                style={{
                  top: `${topPos}px`,
                  left: `${leftPos}px`,
                  direction: "rtl",
                }}
              >
                <div className="flex items-center gap-3 mb-3 border-b border-gray-50 pb-3">
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-500 shrink-0">
                    <User size={18} />
                  </div>
                  <p className="font-bold text-gray-800 text-sm tracking-wide truncate">
                    {hoverInfo.data.doctor}
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-gray-600">
                    <Clock size={16} className="text-blue-400 shrink-0" />
                    <span className="text-xs font-medium" style={{ direction: 'ltr' }}>
                      {hoverInfo.data.startTime} {"->"} {hoverInfo.data.endTime}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <MapPin size={16} className="text-blue-400 shrink-0" />
                    <span className="text-xs font-medium truncate">
                      {hoverInfo.data.place}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <Building2 size={16} className="text-blue-400 shrink-0" />
                    <span className="text-xs font-medium">
                      {hoverInfo.data.year || "السنة"}
                    </span>
                  </div>
                </div>
                <div className="absolute top-0 right-0 h-full w-1.5 bg-blue-500 rounded-r-2xl"></div>
              </div>
            );
          })()}
      </div>
    </motion.div>
  );
}

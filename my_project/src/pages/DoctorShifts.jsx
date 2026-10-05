import FullCalendar from "@fullcalendar/react";
import Handsontable from "handsontable";
import { HotTable } from "@handsontable/react";
import "handsontable/styles/handsontable.css";
import "handsontable/styles/ht-theme-main.css";
import { registerAllModules } from "handsontable/registry";
import { DropdownCellType } from "handsontable/cellTypes";
import { BaseEditor } from "handsontable/editors";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import arLocale from "@fullcalendar/core/locales/ar";
import { FaEdit, FaTrashAlt, FaSearch, FaFilePdf, FaFileWord } from "react-icons/fa";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TiGroup } from "react-icons/ti"; 
import { GiAutomaticSas } from "react-icons/gi";
import { User, Clock, MapPin, Building2 } from "lucide-react";
import axios from "axios";
import { Link } from "react-router";
import { motion } from "framer-motion";

registerAllModules()

// محرر الوقت المخصص
class TimeEditor extends BaseEditor {
  constructor(hotInstance) {
    super(hotInstance);
    this.inputElement = null;
  }

  prepare() {
    BaseEditor.prototype.prepare.call(this);
    if (!this.inputElement) {
      this.inputElement = document.createElement('input');
      this.inputElement.setAttribute('type', 'time');
      this.inputElement.style.width = '100%';
      this.inputElement.style.height = '100%';
      this.inputElement.style.border = 'none';
      this.inputElement.style.padding = '4px';
      this.inputElement.style.boxSizing = 'border-box';
    }
  }

  getValue() {
    return this.inputElement.value;
  }

  setValue(value) {
    this.inputElement.value = value || '00:00';
  }

  open() {
    this.getEditedCell().appendChild(this.inputElement);
    this.inputElement.focus();
    this.inputElement.click();
  }

  close() {
    if (this.inputElement && this.inputElement.parentNode) {
      this.inputElement.parentNode.removeChild(this.inputElement);
    }
  }

  focus() {
    this.inputElement.focus();
  }
}

export default function DoctorShifts() {
  const hotRef = useRef(null);
  const colors = useMemo(
    () => [
      "#3b82f6",
      "#10b981",
      "#0ea5e9",
      "#F5BCBA",
      "#93c5fd",
      "#64748b",
      "#14b8a6",
      "#6366f1",
      "#f87171",
    ],
    [],
  );
  const doctorColors = useRef({});

  const academicYears = [
    { id: "1", label: "سنة اولى" },
    { id: "2", label: "سنة ثانية" },
    { id: "3", label: "سنة ثالثة" },
    { id: "4", label: "سنة رابعة" },
    { id: "5", label: "سنة خامسة" },
  ];

  const [selectedStudyYear, setSelectedStudyYear] = useState("");
  const [view, setView] = useState("dayGridMonth");
  const [openForm, setOpenForm] = useState(false);
  const [openGrid, setOpenGrid] = useState(false);
  const [showGridYearSelect, setShowGridYearSelect] = useState(false);
  const [gridYearChoice, setGridYearChoice] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [currentCalenderDate, setCurrentCalenderDate] = useState(new Date());
  const [hoverInfo, setHoverInfo] = useState(null);
  const [doctors, setDoctors] = useState([]);   
  const [doctorSearch, setDoctorSearch] = useState("");
  const [doctorDropdownOpen, setDoctorDropdownOpen] = useState(false);
  const [loadingDoctors,setLoadingDoctors]=useState(false);
   const [departmentName, setDepartmentName] = useState("");
  const [departmentId, setDepartmentId] = useState(null);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("token"));
  const [timeModalOpen, setTimeModalOpen] = useState(false);
 const [selectedTime, setSelectedTime] = useState("");
 const [selectedCell, setSelectedCell] = useState({
  row: null,
  col: null,
});
 const [gridData, setGridData] = useState([]);
    const [locations, setLocations] = useState([]);

   
const getGridStorageKey = useCallback(() => {
  return `shift-grid-${departmentId}-${selectedStudyYear}`;
}, [departmentId, selectedStudyYear]);

const normalizeYearValue = useCallback((value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/^[1-9]\d*$/u.test(raw)) return raw;
  if (/اولى|1/u.test(raw)) return "1";
  if (/ثانية|2/u.test(raw)) return "2";
  if (/ثالثة|3/u.test(raw)) return "3";
  if (/رابعة|4/u.test(raw)) return "4";
  return raw;
}, []);

const fetchDoctors = useCallback(async (year = null) => {

  const token = authToken;

  if (!token || !departmentId) {
    setDoctors([]);
    return;
  }

  setLoadingDoctors(true);

  try {

    const params = {
      department_id: departmentId,
    };

    if (year) {
      params.study_year = normalizeYearValue(year);
    }

    console.log("Sending params:", params);

    const res = await axios.get(
      "http://127.0.0.1:8000/api/doctor-in-year",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        params,
      }
    );

    console.log("API response:", res.data);

    const doctorsData = res.data?.data ?? res.data ?? [];
    // Normalize year fields so code can rely on either `study_year` or `year`
    const normalizedDoctors = doctorsData.map((d) => {
      const studyYearRaw = d.study_year ?? d.studyYear ?? d.studyyear ?? d.year ?? "";
      const studyYear = String(studyYearRaw ?? "").trim();
      // Prefer study_year as source of truth; force year to match if study_year exists
      const finalYear = studyYear || String(d.year ?? "").trim() || "";
      return {
        ...d,
        study_year: studyYear,
        year: finalYear,
      };
    });

    setDoctors(normalizedDoctors);

    // If grid is open, populate gridData immediately from the fetched doctors
    try {
      if (openGrid) {
        const newGridData = normalizedDoctors.map((doctor) => [
          doctor.name,
          doctor.study_year || doctor.year,
          departmentName,
          "",
          "",
          "09:00",
          "09:00",
        ]);

        setGridData(newGridData);

        // persist to sessionStorage under the same key the grid uses
        try {
          const storageKey = getGridStorageKey();
          sessionStorage.setItem(storageKey, JSON.stringify(newGridData));
        } catch (e) {
          // ignore storage errors
          console.warn("Unable to save gridData to sessionStorage:", e);
        }
      }
    } catch (e) {
      console.warn("Error populating gridData after fetch:", e);
    }

  } catch (err) {

    console.error(
      "خطأ في جلب الأطباء:",
      err.response?.data || err
    );

    setDoctors([]);

  } finally {

    setLoadingDoctors(false);

  }

}, [authToken, departmentId, openGrid, departmentName, getGridStorageKey]);

useEffect(() => {

  if (openGrid && departmentId) {
    fetchDoctors(selectedStudyYear);
  }

}, [openGrid, selectedStudyYear, departmentId, fetchDoctors]);

// إنشاء صف جديد للطبيب
const createDoctorRow = (doctor) => [
  doctor.name,          // اسم الطبيب
  doctor.study_year || doctor.year,          // السنة الدراسية
  departmentName,      // القسم
  "",                   // مكان المناوبة
  "",                   // تاريخ المناوبة
  "",                   // وقت البداية
  "",                   // وقت النهاية
  "",                   // الإجراء
];
const addShiftRow = (row) => {
  const hot = hotRef.current?.hotInstance;

  if (!hot) return;

  // الحصول على بيانات الصف الحالي
  const currentRow = hot.getDataAtRow(row);

  console.log("Current row:", currentRow);

  // إنشاء الصف الجديد
  const newRow = [
    currentRow[0], // اسم الطبيب
    currentRow[1], // السنة
    currentRow[2], // القسم
    "",            // المكان
    "",            // التاريخ
    "",            // وقت البداية
    "",            // وقت النهاية
    "",            // الإجراء
  ];

  // إضافة صف جديد
  hot.alter("insert_row_below", row);

  // كتابة كل خلايا الصف الجديد
  for (let col = 0; col < newRow.length; col++) {
    hot.setDataAtCell(row + 1, col, newRow[col]);
  }
};
const actionRenderer = (
  instance,
  td,
  row,
  col,
  prop,
  value,
  cellProperties
) => {
  td.innerHTML = "";

  const button = document.createElement("button");

  button.innerText = "+ إضافة مناوبة جديدة";

  button.className =
    " text-black px-3 py-1 rounded-lg border-1 text-sm cursor-pointer hover:bg-gray-200";

  button.addEventListener("click", () => {
    addShiftRow(row);
  });

  td.appendChild(button);

  return td;
};

// إنشاء بيانات الـ Grid عند فتح النافذة
useEffect(() => {
  if (!openGrid) return;

  if (!doctors.length) {
    setGridData([]);
    return;
  }

  const storageKey = getGridStorageKey();
  const savedData = sessionStorage.getItem(storageKey);

  if (savedData) {
    try {
      const parsedData = JSON.parse(savedData);

      setGridData(parsedData);

      console.log("تم استرجاع البيانات:", parsedData);

      return;
    } catch (error) {
      console.error("خطأ في قراءة sessionStorage:", error);
    }
  }

  // لا توجد بيانات محفوظة → أنشئ Grid جديد
  const newGridData = doctors.map((doctor) => [
    doctor.name,
    doctor.study_year,
    departmentName,
    "",
    "",
    "",
    "",
  ]);

  setGridData(newGridData);

}, [
  openGrid,
  doctors,
  departmentName,
  getGridStorageKey
]);

console.log("Doctors:", doctors);
console.log("Grid Data:", gridData);

// حفظ gridData في sessionStorage
useEffect(() => {
  if (!openGrid || !gridData.length) return;

  const storageKey = getGridStorageKey();

  sessionStorage.setItem(
    storageKey,
    JSON.stringify(gridData)
  );

  console.log("تم حفظ Grid:", gridData);

}, [
  gridData,
  openGrid,
  getGridStorageKey
]);

   const locationsOptions=locations.map(location=>location.name)
  console.log(locationsOptions)

  const filteredDoctors = useMemo(() => {
    if (!doctorSearch.trim()) return doctors;
    const term = doctorSearch.trim().toLowerCase();
    return doctors.filter((doc) => {
      return (
        doc.name?.toLowerCase().includes(term) ||
        String(doc.id).includes(term) ||
        String(doc.year ?? doc.study_year ?? "").includes(term) ||
        String(doc.study_year ?? doc.year ?? "").includes(term)
      );
    });
  }, [doctorSearch, doctors]);

  // form states
  const [formData, setFormData] = useState({
    doctor: "",
    year: "",
    place: "",
    date: 1,
    startTime: "09:00",
    endTime: "09:00",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // show shift details state
  const [selectedShift, setSelectedShift] = useState(null);
  const [shifts, setShifts] = useState([]);
  const calenderRef = useRef(null);

  const handleEventClick = (info) => {
    const shift = info.event.extendedProps.shiftData;
    setSelectedShift(shift);
  };
  const handleGroupSubmit = async () => {
    if (!gridData || gridData.length === 0) {
      alert("لا توجد بيانات لإرسالها");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      alert("يرجى تسجيل الدخول أولا");
      return;
    }

    const payloads = [];

    for (let rowIndex = 0; rowIndex < gridData.length; rowIndex += 1) {
      const row = gridData[rowIndex];
      const [doctorName, studyYear, , locationName, date, startTime, endTime] = row;

      if (
        !doctorName ||
        !studyYear ||
        !locationName ||
        !date ||
        !startTime ||
        !endTime
      ) {
        alert(`الرجاء ملء جميع الحقول في الصف رقم ${rowIndex + 1}`);
        return;
      }

      // تحقق من أن وقت النهاية أكبر من وقت البداية
      if (startTime > endTime) {
        alert(`وقت النهاية يجب أن يكون أكبر أو يساوي من وقت البداية في الصف رقم ${rowIndex + 1}`);
        return;
      }

      // تحقق من صحة صيغة التاريخ
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        alert(`صيغة التاريخ غير صحيحة في الصف رقم ${rowIndex + 1}. استخدم الصيغة YYYY-MM-DD`);
        return;
      }

      const doctor = doctors.find((doc) => doc.name === doctorName);
      if (!doctor) {
        alert(`لم يتم العثور على الطبيب "${doctorName}" في الصف رقم ${rowIndex + 1}`);
        return;
      }

      const location = locations.find((loc) => loc.name === locationName);
      if (!location) {
        console.error("Available locations:", locations.map(l => l.name));
        alert(`لم يتم العثور على مكان المناوبة "${locationName}" في الصف رقم ${rowIndex + 1}. الأماكن المتاحة: ${locations.map(l => l.name).join(", ")}`);
        return;
      }

      payloads.push({
        user_id: doctor.id,
        study_year: studyYear,
        location_id: location.id,
        date,
        start_time: startTime,
        end_time: endTime,
      });
    }

    try {
      // Use allSettled so we can rollback any created shifts if any request fails
      const results = await Promise.allSettled(
        payloads.map((payload) =>
          axios.post("http://127.0.0.1:8000/api/shifts", payload, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }),
        ),
      );

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      // If any request failed, attempt to rollback (delete) any successfully created shifts
      if (rejected.length > 0) {
        console.error("بعض الطلبات فشلت أثناء الإدخال الجماعي:", rejected);

        // collect created shift ids (if available) to delete them
        const createdShiftIds = fulfilled
          .map((r) => r.value?.data?.shift?.id)
          .filter(Boolean);

        if (createdShiftIds.length > 0) {
          try {
            await Promise.all(
              createdShiftIds.map((id) =>
                axios.delete(`http://127.0.0.1:8000/api/shifts/${id}`, {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                  },
                }),
              ),
            );
            console.warn("تم التراجع عن المناوبات التي تم إنشاؤها بسبب خطأ في عملية الحفظ.");
          } catch (rollbackErr) {
            console.error("فشل التراجع عن المناوبات المنشأة:", rollbackErr.response?.data || rollbackErr);
          }
        }

        // Build a useful error message to show the user
        const firstError = rejected[0];
        const errResp = firstError.reason?.response?.data;
        const message = errResp?.message || "حدث خطأ أثناء إرسال البيانات";
        const errors = errResp?.errors;

        let detailMessage = message;
        if (errors) {
          if (typeof errors === 'object') {
            detailMessage = Object.values(errors).flat().join('\n');
          } else if (Array.isArray(errors)) {
            detailMessage = errors.join('\n');
          }
        }

        alert(`فشل حفظ البيانات:\n${detailMessage}\n\nلم يتم حفظ أي مناوبات (تم التراجع عن أي عمليات جزئية).`);
        return;
      }

      // All succeeded
      const createdShifts = fulfilled.map((r) => r.value?.data?.shift).filter(Boolean);
      if (createdShifts.length > 0) {
        alert("تم حفظ جميع المناوبات بنجاح");
        setOpenGrid(false);
        if (typeof fetchShifts === "function") {
          fetchShifts(currentCalenderDate, selectedStudyYear);
        }
      } else {
        alert("لم يتم إنشاء أي مناوبات. يرجى مراجعة البيانات.");
      }
    } catch (err) {
      console.error("خطأ غير متوقع أثناء حفظ المناوبات الجماعية:", err);
      alert("حدث خطأ غير متوقع أثناء حفظ المناوبات. لم يتم تنفيذ أي تغييرات.");
    }
  }
  // {..department name in header.. }
 
  const fetchCurrentUser = useCallback(
    async (token = authToken) => {
      if (!token) {
        setDepartmentName("لا يوجد قسم مرتبط بهذا الحساب");
        setDepartmentId(null);
        return;
      }
      try {
        const res = await axios.get("http://127.0.0.1:8000/api/user", {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        const dept = res.data.doctor?.department;
        if (dept) {
          console.log(dept);
          setDepartmentName(dept.name);
          setDepartmentId(dept.id);
        } else {
          setDepartmentName("لا يوجد قسم مرتبط بهذا الحساب");
          setDepartmentId(null);
        }
      } catch (err) {
        console.error("خطأ اثناء جلب بيانات القسم", err);
        setDepartmentName("خطأ في تحميل القسم");
        setDepartmentId(null);
      }
    },
    [authToken],
  );

  // fetch on mount and when token changes
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // also re-fetch when modals open (in case token/department changed without remount)
  useEffect(() => {
    if (openGrid || openForm) {
      fetchCurrentUser();
    }
  }, [openGrid, openForm, fetchCurrentUser]);

  // listen for token changes from other tabs/windows
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "token") {
        setAuthToken(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // detect token changes inside same tab
  useEffect(() => {
    const interval = window.setInterval(() => {
      const token = localStorage.getItem("token");
      if (token !== authToken) {
        setAuthToken(token);
      }
    }, 2000);
    return () => window.clearInterval(interval);
  }, [authToken]);

  // {...get places...}
  useEffect(() => {
    const token = localStorage.getItem("token");
    axios
      .get("http://127.0.0.1:8000/api/locations", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      })
      .then((res) => setLocations(res.data))
    
      .catch((err) => console.error("خطأ في جلب الأماكن", err));
  }, []);

  const handleDateSelect = (newYear, newMonth) => {
    if (calenderRef.current) {
      const calendarApi = calenderRef.current.getApi();
      const targetDate = `${newYear}-${String(newMonth + 1).padStart(2, "0")}-01`;
      calendarApi.gotoDate(targetDate);
      setCurrentCalenderDate(new Date(targetDate));
    }
  };

  // {..add new shift..}
  const handleSubmit = async () => {
    // test the input
    if (
      !formData.doctor ||
      !formData.place ||
      !formData.year ||
      !formData.startTime ||
      !formData.endTime
    ) {
      alert("يرجى تعبئة جميع الحقول");
      return;
    }
    // date
    const yearr = currentCalenderDate.getFullYear();
    const monthh = String(currentCalenderDate.getMonth() + 1).padStart(2, "0");
    const dayy = String(formData.date).padStart(2, "0");
    // const formattedDate = new Date(fullDate).toLocaleDateString().split('T')[0];
    const formattedDate = `${yearr}-${monthh}-${dayy}`;

    const shiftPayload = {
      user_id: formData.doctor,
      date: formattedDate,
      study_year: formData.year,
      location_id: formData.place,
      start_time: formData.startTime,
      end_time: formData.endTime,
    };
    try {
      const token = localStorage.getItem("token");
      if (isEditing && editingId) {
        await axios.put(
          `http://127.0.0.1:8000/api/shifts/${editingId}`,
          shiftPayload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          },
        );
        setShifts((prev) =>
          prev.map((shift) =>
            shift.id === editingId
              ? {
                  ...shift,
                  ...shiftPayload,
                  doctor: doctors.find((doc) => doc.id == formData.doctor)
                    ? doctors.find((doc) => doc.id == formData.doctor).name
                    : "طبيب غير معروف",
                  date: formattedDate, //formatted
                  startTime: formData.startTime,
                  endTime: formData.endTime,
                  place: locations.find((loc) => loc.id == formData.place)
                    ? locations.find((loc) => loc.id == formData.place).name
                    : "مكان غير معروف",
                  year: formData.year,
                }
              : shift,
          ),
        );
        setSelectedShift(null);
        alert("تم تعديل المناوبة بنجاح");
        setOpenForm(false);
        setIsEditing(false);
        setEditingId(null);
      } else {
        // {...send post request..}
        const response = await axios.post(
          "http://127.0.0.1:8000/api/shifts",
          shiftPayload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          },
        );
        const newShift = {
          id: response.data.shift?.id || Date.now(),
          doctor: doctors.find((doc) => doc.id == formData.doctor)
            ? doctors.find((doc) => doc.id == formData.doctor).name
            : "طبيب غير معروف",
          date: formattedDate, //formatted
          startTime: formData.startTime,
          endTime: formData.endTime,
          place: locations.find((loc) => loc.id == formData.place)
            ? locations.find((loc) => loc.id == formData.place).name
            : "مكان غير معروف",
          year: formData.year,
        };
        setShifts((prev) => [...prev, newShift]);
        alert("تمت اضافة المناوبة بنجاح");
        setOpenForm(false);
      }
      // setOpenForm(false);
    } catch (err) {
      console.error("تفاصيل الخطأ :", err.response?.data);
      const errorMessage =
        err.response?.data?.message || "حدث خطأ اثناء الاتصال بالسيرفر";
      alert("فشل الحفظ : " + errorMessage);
    }
  };

  // delete shift
  const handleDelete = async (id) => {
    // console.log(id)
    if (!window.confirm("هل تريد حذف هذه المناوبة نهائيا ؟")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://127.0.0.1:8000/api/shifts/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      setShifts((prev) => prev.filter((shift) => shift.id != id));
      setSelectedShift(null);
      alert("تم حذف المناوبة بنجاح");
    } catch (err) {
      console.error("حدث خطأ اثناء الحذف :", err.response?.data);
      alert("فشل حذف المناوبة");
    }
  };

  // delete All Shifts
  const handleDeleteAll = async () => {
    const confirmDelete = window.confirm(
      "هل أنت متأكد من حذف مناوبات هذا الشهر فقط؟",
    );
    if (!confirmDelete) return;
    const token = localStorage.getItem("token");
    const yearr = currentCalenderDate.getFullYear();
    const monthh = currentCalenderDate.getMonth();
    const fromDate = `${yearr}-${String(monthh + 1).padStart(2, "0")}-01`;
    const toDate = `${yearr}-${String(monthh + 1).padStart(2, "0")}-${new Date(yearr, monthh + 1, 0).getDate()}`;
    try {
      await axios.delete("http://127.0.0.1:8000/api/shifts/delete-all", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        data: {
          from_date: fromDate,
          to_date: toDate,
        },
      });
      setShifts((prev) =>
        prev.filter((shift) => {
          const shiftDate = new Date(shift.date);
          return !(
            shiftDate.getFullYear() === yearr && shiftDate.getMonth() === monthh
          );
        }),
      );
      alert("تم حذف مناوبات هذا الشهر بنجاح ");
    } catch (error) {
      console.error("حدث خطأ أثناء الحذف:", error.response?.data);
      alert("حدث خطأ أثناء الحذف أو لا توجد مناوبات لحذفها ❌");
    }
  };

  // edit shift
  const handleEdit = (shift) => {
    // search in original list for docName and place
    const selectedDoctor = doctors.find((d) => d.name === shift.doctor);
    const selectedPlace = locations.find(
      (l) => l.name === shift.place || l.id === shift.location_id,
    );

    setFormData({
      doctor: selectedDoctor ? selectedDoctor.id : shift.user_id || "",
      year: shift.year || (selectedDoctor ? selectedDoctor.study_year : ""),
      place: selectedPlace ? selectedPlace.id : "",
      date: new Date(shift.date).getDate(),
      startTime: shift.startTime,
      endTime: shift.endTime,
    });
    setEditingId(shift.id);
    setIsEditing(true);
    setOpenForm(true);
  };

  const fetchShifts = useCallback(
    (date = currentCalenderDate, yearFilter = selectedStudyYear) => {
      const token = localStorage.getItem("token");
      const params = {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
      };
      if (yearFilter) {
        params.study_year = normalizeYearValue(yearFilter);
      }
      axios
        .get("http://127.0.0.1:8000/api/department-shifts", {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          params,
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
    [currentCalenderDate, selectedStudyYear, normalizeYearValue],
  );

  // get shifts to show in calender
  useEffect(() => {
    fetchShifts(currentCalenderDate, selectedStudyYear);
  }, [currentCalenderDate, selectedStudyYear, fetchShifts]);
  // the date
  const year = currentCalenderDate.getFullYear();
  const month = currentCalenderDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const filteredShifts = useMemo(() => {
    if (!selectedStudyYear) return shifts;
    const normalizedYearFilter = normalizeYearValue(selectedStudyYear);
    return shifts.filter((shift) => {
      const shiftYear = normalizeYearValue(shift.study_year ?? shift.year);
      return shiftYear && shiftYear === normalizedYearFilter;
    });
  }, [shifts, selectedStudyYear, normalizeYearValue]);

  const events = useMemo(() => {
    if (!Array.isArray(filteredShifts) || filteredShifts.length === 0) return [];
    const doctorColorsMap = {};
    return filteredShifts.map((shift, index) => {
      const doctorYear = shift.doctor || "طبيب غير معروف";
      if (!doctorColorsMap[doctorYear]) {
        doctorColorsMap[doctorYear] = colors[index % colors.length];
      }
      return {
        // id: String(shift.id),
        title: shift.doctor,
        start: shift.date,
        backgroundColor: doctorColorsMap[doctorYear],
        textColor: "white",
        allDay: true,
        extendedProps: {
          shiftData: shift, //has all info
        },
      };
    });
  }, [filteredShifts, colors]);

  // show doctor shifts
  const [doctorPreviewShifts, setDoctorPreviewShifts] = useState([]);
  const selectedDoctorShifts = useMemo(() => {
    if (!formData.doctor) return [];
    const currentDoc = doctors.find(
      (d) => String(d.id) === String(formData.doctor),
    );
    if (!currentDoc) return [];
    const currentDocName = currentDoc.name;
    return filteredShifts.filter((s) => {
      return s.doctor === currentDocName;
    });
  }, [formData.doctor, filteredShifts, doctors]);

  const generateWord = async () => {
    const token = localStorage.getItem("token");
    const params = {};
    if (selectedStudyYear) {
      params.study_year = normalizeYearValue(selectedStudyYear);
    }
    const response = await axios.get("http://127.0.0.1:8000/api/export_word", {
      responseType: "blob",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      params,
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "shifts.docx");
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
  };
  // console.log(shifts);
  const handleCloseAll = () => {
    setOpenForm(null);
    setSelectedShift(false);
    setOpenGrid(false);
    setShowGridYearSelect(false);
  };

  // escape button
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" || event.keyCode === 27) {
        handleCloseAll();
      }
    };
    if (openForm || selectedShift || openGrid || showGridYearSelect ) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openForm, selectedShift, openGrid, showGridYearSelect]);

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      handleCloseAll();
    }
    if (event.key === "Enter") {
      event.preventDefault();
      handleSubmit();
    }
  };

  const updateView = () => {
    const width = window.innerWidth;
    if (width < 640) {
      setView("listWeek");
    } else if (width < 1024) {
      setView("timeGridWeek");
    } else {
      setView("dayGridMonth");
    }
  };

  useEffect(() => {
    updateView();
    window.addEventListener("resize", updateView);
    return () => window.removeEventListener("resize", updateView);
  }, []);
  // console.log("now depart :" , departmentId , "all doctors: " ,doctors);

  const handleDatesSet = useCallback((arg) => {
    const newDate = arg.view.currentStart.getTime();
    setCurrentCalenderDate((prev) => {
      if (prev && prev.getTime() === newDate) return prev;
      return arg.view.currentStart;
    });
  }, []);
  const handleYearChange = (selectedYear) => {
    if (calenderRef.current) {
      const calendarApi = calenderRef.current.getApi();
      const currentDate = calendarApi.getDate();
      const currentMonth = String(currentDate.getMonth() + 1).padStart(2, "0");
      const newDateString = `${selectedYear}-${currentMonth}-01`;

      calendarApi.gotoDate(newDateString);
      setCurrentCalenderDate(new Date(newDateString));
    }
  };

  return (
    <motion.div
      className="w-full z-40 flex"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
        <div className="w-full text-[15px] p-4 md:p-6  pt-6 md:pt-15 ">
        {/* Title  */}
        <div className="flex flex-row justify-between items-start md:items-center border-b-2 border-gray-300 pb-3 mb-6 gap-4">
          <h2 className="text-2xl font-bold border-r-4 border-primary pr-3 ">
            {departmentName
              ? `  القسم : ${departmentName}`
              : "جاري التحميل ..."}{" "}
          </h2>
          <div className=" flex  gap-2 md:w-auto md:flex-row items-end ">
            <button
              onClick={() => {
                setFormData({
                  doctor: "",
                  year: "",
                  place: "",
                  date: new Date().getDate(),
                  startTime: "09:00",
                  endTime: "09:00",
                });
                setDoctorSearch("");
                setDoctorDropdownOpen(false);
                setIsEditing(false);
                setEditingId(null);
                setOpenForm(true);
              }}
              className="text-lg bg-primary text-[12px] lg:text-[15px] text-white  px-4 py-2 rounded hover:bg-blue-400 cursor-pointer"
            >
              إضافة مناوبة +
            </button>
             <button
              onClick={() => {
               setGridYearChoice(selectedStudyYear || "");
               setShowGridYearSelect(true);
              }}
              className="text-lg flex items-center bg-emerald-600 text-[12px] lg:text-[15px] text-white  px-4 py-2 rounded hover:bg-emerald-400 cursor-pointer"
            >
                الإدخال الجماعي<TiGroup />
        </button>
            
            <button className="text-lg flex items-center bg-[#d71414] text-[12px] lg:text-[15px] text-white px-2 py-2  rounded hover:bg-red-400 cursor-pointer">
              <Link to="../autoSchedule">الجدولة التلقائية</Link>
                     <GiAutomaticSas />

            </button>
          </div>
        </div>
        {/* Calender  */}
        <div className="overflow-x-auto lg:mt-[4%] ">
          {/* قائمة اختيار السنوات الديناميكية */}
          <div className="flex flex-col md:flex-row md:justify-around mb-3 gap-2 items-center" dir="rtl">
            <div className="flex items-center gap-2">
              <label className="font-bold text-gray-700 text-sm">
              اختر السنة:
            </label>
            <select
              onChange={(e) => handleYearChange(e.target.value)}
              value={
                currentCalenderDate
                  ? currentCalenderDate.getFullYear()
                  : new Date().getFullYear()
              }
              className="border border-gray-300 p-1.5 rounded-lg bg-white shadow-sm font-semibold text-primary outline-none focus:border-primary"
            >
              {(() => {
                const currentYear = new Date().getFullYear();
                const startYear = 2026;
                const endYear = Math.max(currentYear, startYear) + 10;
                const years = [];
                for (let y = startYear; y <= endYear; y++) {
                  years.push(y);
                }
                return years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ));
              })()}
            </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="font-bold text-gray-700 text-sm">
                   السنة الدراسية للطلاب:
              </label>
              <select
                className="border border-gray-300 p-1.5 rounded-lg bg-white shadow-sm font-semibold text-primary outline-none focus:border-primary"
                value={selectedStudyYear}
                onChange={(e) => setSelectedStudyYear(e.target.value)}
              >
                <option value="">كل السنوات </option>
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="md:min-w-full">
            {/* min-w-900px */}
            <FullCalendar
              ref={calenderRef}
              plugins={[
                dayGridPlugin,
                timeGridPlugin,
                listPlugin,
                interactionPlugin,
              ]}
              direction="rtl"
              locales={[arLocale]}
              locale="ar"
              initialView={view}
              viewDidMount={(arg) => {
                if (arg.view.type !== view) {
                  arg.view.calendar.changeView(view);
                }
              }}
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
        </div>
        <div className="mt-8 flex justify-between items-center w-full">
          <button
            onClick={handleDeleteAll}
            className="text-gray-600 hover:text-red-700 text-xs font-semibold flex items-center gap-2 transition-all duration-200 border-b border-transparent hover:border-red-700 pb-1"
          >
            <FaTrashAlt className="text-xs" />
            <span>حذف جميع المناوبات</span>
          </button>
          <button
            onClick={generateWord}
            className="flex items-center gap-2 bg-blue-50 text-blue-500 px-4 py-2 rounded-xl font-medium hover:bg-blue-100 shadow-sm"
          >
            <FaFileWord/>
            تحميل Word
          </button>
        </div>

        {/* show shift details popup */}
        {selectedShift && (
          <div
            className="fixed inset-0 flex justify-center items-center mt-2  rounded-xl  z-50 backdrop-blur-sm bg-opacity-30 shadow-2xl"
            onClick={() => {
              setSelectedShift(null);
            }}
          >
            <div
              className="bg-white p-6 rounded-xl w-[300px] border border-gray-300 shadow-lg relative text-right "
              dir="rtl"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <button
                className=" absolute top-2 right-2 w-8 h-8 flex z-20 text-gray-400 items-center justify-center rounded hover:text-red-800 text-2xl font-bold"
                onClick={() => setSelectedShift(null)}
              >
                ×
              </button>
              <h2 className="text-xl font-bold mb-4 pb-2 pr-8 text-primary ">
                👨‍⚕️{selectedShift.doctor}
              </h2>
              <div className="space-y-2 mb-6">
                <p className="font-bold">
                  📅 تاريخ اليوم : {new Date(selectedShift.date).getDate()}
                </p>
                <p className="font-bold">
                  🕒 الوقت : {selectedShift.startTime} {"->"}{" "}
                  {selectedShift.endTime}
                </p>
                <p className="font-bold">
                  🏥 مكان المناوبة : {selectedShift.place}
                </p>
                <p className="font-bold">
                  📆 السنة الدراسية : {selectedShift.year}
                </p>
              </div>
              <div className="flex gap-2 border-t pt-4">
                <button
                  onClick={() => {
                    handleDelete(selectedShift.id);
                  }}
                  className="flex-1 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  حذف
                </button>
                <button
                  onClick={() => {
                    handleEdit(selectedShift);
                  }}
                  className="flex-1 px-3 py-2 bg-primary text-white rounded hover:bg-blue-500"
                >
                  تعديل
                </button>
              </div>
            </div>
          </div>
        )}

        {/* add shift form  */}
        {openForm && (
          <div
            className="fixed inset-0 flex justify-center items-center p-4 rounded-xl shadow-lg z-50 border-primary shadow-primary backdrop-blur-sm"
            onClick={() => {
              setOpenForm(false);
              setDoctorDropdownOpen(false);
            }}
            onKeyDown={handleKeyDown}
          >
            <div
              className="bg-white p-6 rounded-xl shadow-lg flex flex-col md:flex-row  max-h-[90vh] w-full max-w-4xl overflow-hidden "
              dir="rtl"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <div className="flex-1 p-6 overflow-y-auto border-b md:border-b-0  md:border-l border-gray-100">
                <h2 className="text-xl font-bold text-primary mb-4 text-center ">
                  {isEditing ? " تعديل المناوبة" : "اضافة مناوبة جديدة"}
                </h2>
                {/*  choose doctor */}
                <div className="mb-3 relative">
                  <label className="block mb-1 font-bold">اسم الطبيب</label>
                  <button
                    type="button"
                    onClick={() => setDoctorDropdownOpen((prev) => !prev)}
                    className="w-full text-right border p-2 rounded-lg flex justify-between items-center outline-none border-primary inset-shadow-primary/30 bg-white"
                  >
                    <span>
                      {formData.doctor
                        ? doctors.find((doc) => String(doc.id) === String(formData.doctor))?.name || "طبيب غير معروف"
                        : "... اختر طبيب"}
                    </span>
                    <span className="text-gray-500">▼</span>
                  </button>
                  {doctorDropdownOpen && (
                    <div
                      className="absolute z-50 mt-2 w-full max-h-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="p-2 border-b border-gray-200">
                        <input
                          type="text"
                          value={doctorSearch}
                          onChange={(e) => setDoctorSearch(e.target.value)}
                          placeholder="ابحث عن اسم الطبيب    "
                          className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:border-primary"
                        />
                      </div>
                      <div className="max-h-56 overflow-y-auto">
                        {filteredDoctors.length > 0 ? (
                          filteredDoctors.map((doc) => (
                            <button
                              key={doc.id}
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  doctor: String(doc.id),
                                  year: doc.study_year || "",
                                });
                                setDoctorDropdownOpen(false);
                                setDoctorSearch("");
                              }}
                              className="w-full text-right px-3 py-2 hover:bg-blue-50 focus:bg-blue-50"
                            >
                              {doc.name}
                            </button>
                          ))
                        ) : (
                          <div className="p-3 text-sm text-gray-500">
                            لا يوجد أطباء مطابقين
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {/*  choose year */}
                <div className="mb-3">
                  <label className="block mb-1 font-bold ">
                    {" "}
                    السنة الدراسية
                  </label>
                  <input
                    type="text"
                    className="w-full border p-2 rounded-lg bg-gray-100"
                    value={
                      formData.year == 1 || formData.year == "1"
                        ? "الأولى"
                        : formData.year == 2 || formData.year == "2"
                          ? "الثانية"
                          : formData.year == 3 || formData.year == "3"
                            ? "الثالثة"
                            : formData.year == 4 || formData.year == "4"
                              ? "الرابعة"
                              : formData.year == 5 || formData.year == "5"
                                ? "الخامسة"
                                : ""
                    }
                    readOnly
                  />
                </div>
                {/*  choose place */}
                <div className="mb-3">
                  <label className="block mb-1 font-bold"> مكان المناوبة</label>
                  <select
                    value={formData.place}
                    onChange={(e) => {
                      setFormData({ ...formData, place: e.target.value });
                    }}
                    className="w-full border p-2 rounded-lg  outline-none border-primary inset-shadow-primary/30  inset-shadow-sm"
                  >
                    <option value="" disabled>
                      اختر مكان المناوبة ...
                    </option>
                    {locations &&
                      locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                  </select>
                </div>
                {/*  choose date */}
                <div className="mb-3">
                  <label className="block mb-1 font-bold">
                    {" "}
                    تاريخ المناوبة
                  </label>
                  <select
                    value={formData.date}
                    onChange={(e) => {
                      setFormData({ ...formData, date: e.target.value });
                    }}
                    className="w-full border p-2 rounded-lg outline-none border-primary inset-shadow-primary/30  inset-shadow-sm"
                  >
                    {[...Array(daysInMonth)].map((_, index) => (
                      <option key={index} value={index + 1}>
                        {index + 1}
                      </option>
                    ))}
                  </select>
                </div>

                {/* choose time  */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="blocl mb-1 font-bold">وقت البدء</label>
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => {
                        setFormData({ ...formData, startTime: e.target.value });
                      }}
                      className="w-full border p-2 rounded-lg outline-none
                    border-primary inset-shadow-primary/30  inset-shadow-sm "
                    ></input>
                  </div>
                  <div className="mb-3">
                    <label className="blocl mb-1 font-bold">وقت النهاية</label>
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => {
                        setFormData({ ...formData, endTime: e.target.value });
                      }}
                      className="w-full border p-2 rounded-lg 
                outline-none border-primary inset-shadow-primary/30  inset-shadow-sm"
                    ></input>
                  </div>
                </div>

                {/* buttons */}
                <div className="flex justify-between">
                  <button
                    onClick={() => setOpenForm(false)}
                    className="px-4 py-2 bg-gray-300 rounded"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="px-4 py-2 bg-primary text-white rounded"
                  >
                    {isEditing ? "تعديل" : "حفظ"}
                  </button>
                </div>
              </div>
              <div className="w-full md:w-[320px] bg-blue-50/50 p-6 overflow-y-auto border-t md:border-t-0 md:border-r border-blue-100">
                <h3 className="font-bold text-primary mb-4 flex items-center gap-2 border-b border-blue-200 pb-2">
                  <span className="text-xl">📅</span>
                  مناوبات الطبيب الحالية
                </h3>

                {!formData.doctor ? (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                    <p className="text-sm">يرجى اختيار طبيب</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDoctorShifts.length > 0 ? (
                      selectedDoctorShifts.map((shift, index) => (
                        <div
                          key={index}
                          className="bg-white p-3 rounded-lg shadow-sm border-r-4 border-primary"
                        >
                          <p className="font-bold text-sm text-gray-800">
                            يوم {shift.date}
                          </p>
                          <div className="text-xs text-gray-500 mt-1 space-y-1">
                            <p>📍 {shift.place}</p>
                            <p>
                              ⏰ {shift.startTime} {"->"} {shift.endTime}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 text-sm mt-10 italic">
                        لا يوجد مناوبات مسجلة لهذا الطبيب
                      </p>
                    )}
                  </div>
                )}
              </div>
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
          
          {showGridYearSelect && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
              onClick={() => setShowGridYearSelect(false)}
            >
              <div
                className="bg-white rounded-2xl p-6 w-full max-w-md"
                dir="rtl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-bold text-primary mb-4">اختر السنة الدراسية للإدخال الجماعي</h3>
                <div className="mb-4">
                  <select
                    value={gridYearChoice}
                    onChange={(e) => setGridYearChoice(e.target.value)}
                    className="w-full border p-2 rounded-lg"
                  >
                    <option value="">كل السنوات</option>
                    {academicYears.map((y) => (
                      <option key={y.id} value={y.id}>{y.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowGridYearSelect(false)}
                    className="px-4 py-2 rounded bg-gray-200"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => {
                      setSelectedStudyYear(gridYearChoice || "");
                      setShowGridYearSelect(false);
                      setOpenGrid(true);
                    }}
                    className="px-4 py-2 rounded bg-primary text-white"
                  >
                    متابعة
                  </button>
                </div>
              </div>
            </div>
          )}
          {openGrid && (
  <div
    className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4"
    onClick={() => setOpenGrid(false)}
  >
<div
  onClick={(e) => e.stopPropagation()}
  className="bg-white w-full sm:w-[95%] md:w-[90%] lg:w-[85%] max-w-6xl h-[90vh] sm:h-[85vh] md:h-[80vh] rounded-2xl shadow-xl p-3 sm:p-4 md:p-6 flex flex-col"
>
      <div className="flex justify-between items-center border-b pb-3 sm:pb-4">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-primary">
          الإدخال الجماعي للمناوبات
        </h2>

        <button
          onClick={() => setOpenGrid(false)}
          className="text-red-500 text-lg sm:text-xl cursor-pointer hover:text-red-700"
        >
          ✕
        </button>
      </div>
 
   <div className="flex-1 mt-3 sm:mt-4 overflow-y-auto overflow-x-hidden">
        {loadingDoctors &&(
       <h1 className="text-sm sm:text-base text-center py-4">جار تحميل الأطباء ... </h1>
     )}
  
 <HotTable
  key={departmentId}
 ref={hotRef}
  data={gridData}
afterChange={(changes, source) => {
  // تجاهل التغييرات الناتجة عن تحميل البيانات
  if (source === "loadData" || !changes) return;

  setGridData((prev) => {
    const newData = prev.map((row) => [...row]);

    changes.forEach(([row, col, oldValue, newValue]) => {
      if (newData[row]) {
        newData[row][col] = newValue;
      }
    });

    return newData;
  });
}}
afterOnCellMouseDown={(event, coords) => {
    if (coords.row < 0) return;

    // العمود 5 = وقت البداية
    // العمود 6 = وقت النهاية
    if (coords.col === 5 || coords.col === 6) {
      
      const hot = hotRef.current?.hotInstance;

      if (!hot) return;

      const value = hot.getDataAtCell(
        coords.row,
        coords.col
      ) || "";

      setSelectedTime(value || "09:00");

      setSelectedCell({
        row: coords.row,
        col: coords.col,
      });

      setTimeModalOpen(true);
    }
  }}
  colHeaders={[
    "الطبيب",
    "السنة الدراسية",
    "القسم",
    "مكان المناوبة",
    "تاريخ المناوبة",
    "وقت البداية ",
    "وقت النهاية",
    "الإجراء"
  ]}
 columns={[
  {
    type: "text",
    readOnly: true
  },
  {
    type: DropdownCellType,
    source: ["1", "2", "3", "4", "5"]
  },
  {
    type: DropdownCellType,
    source: []
  },
  {
    type: DropdownCellType,
    source: locationsOptions
  },
  {
    type: "date",
    dateFormat: "YYYY-MM-DD",
    correctFormat: true
  },
  {
    type: "text",
    editor: TimeEditor,
    placeholder: "00:00"
  },
  {
    type: "text",
    editor: TimeEditor,
    placeholder: "00:00"
  },
  {
  renderer: actionRenderer,
  readOnly: true,
}
]}
  rowHeaders={true}
  stretchH="all"
  height="auto"
  licenseKey="non-commercial-and-evaluation"
/>
   </div>
   <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 mt-4 sm:mt-6 pt-3 sm:pt-4 md:pt-6 border-t border-gray-200">
     <button
       onClick={() => {
         if (window.confirm("هل تريد مسح كل البيانات المحفوظة وإعادة تعيينها؟")) {
            try {
              const storageKeyToRemove = getGridStorageKey();
              sessionStorage.removeItem(storageKeyToRemove);
            } catch (e) {
              console.warn("Failed to remove grid session key:", e);
            }
            setGridData(
              doctors.map((doctor) => [
                doctor.name,
                doctor.study_year,
                departmentName,
                "",
                "",
                "",
                "",
              ]),
            );
          }
       }}
       className="w-full sm:w-auto px-3 sm:px-4 py-2 bg-yellow-100 text-yellow-700 text-sm sm:text-base rounded-lg font-semibold hover:bg-yellow-200 transition-all duration-200"
     >
       🔄 مسح البيانات
     </button>
     <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
       <button
         onClick={() => setOpenGrid(false)}
         className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-3 bg-gray-200 text-gray-700 text-sm sm:text-base rounded-lg font-semibold hover:bg-gray-300 transition-all duration-200 flex items-center justify-center gap-2"
       >
         ✕ إلغاء
       </button>
       <button onClick={handleGroupSubmit}
         className="flex-1 sm:flex-none px-4 sm:px-8 py-2 sm:py-3 bg-primary text-white text-sm sm:text-base rounded-lg font-semibold hover:bg-blue-600 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
       >
         💾 حفظ البيانات
       </button>
     </div>
   </div>
    </div>
  </div>
     )}
     {timeModalOpen && (
  <div
    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
    onClick={() => setTimeModalOpen(false)}
  >
    <div
      className="bg-white rounded-2xl shadow-2xl w-[380px] p-6"
      dir="rtl"
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="text-2xl font-bold text-primary text-center mb-6">
        اختيار الوقت
      </h2>

      <div className="space-y-2">
        <label className="font-semibold text-gray-700">
          {selectedCell.col === 5
            ? "وقت البداية"
            : "وقت النهاية"}
        </label>

        <input
          type="time"
          value={selectedTime}
          onChange={(e) => setSelectedTime(e.target.value)}
          className="
            w-full
            border-2
            border-gray-300
            rounded-xl
            p-3
            text-lg
            outline-none
            focus:border-primary
            focus:ring-2
            focus:ring-primary/20
          "
        />
      </div>

      <div className="flex justify-end gap-3 mt-8">

        <button
          onClick={() => setTimeModalOpen(false)}
          className="
            px-5
            py-2
            rounded-xl
            bg-gray-200
            hover:bg-gray-300
            transition
          "
        >
          إلغاء
        </button>

        <button
          onClick={() => {
            const hot = hotRef.current?.hotInstance;
            if (!hot || selectedCell.row === null || selectedCell.col === null) {
              setTimeModalOpen(false);
              return;
            }

            hot.setDataAtCell(
              selectedCell.row,
              selectedCell.col,
              selectedTime,
            );

            setGridData((prev) => {
              const next = prev.map((row) => [...row]);
              if (selectedCell.row >= 0 && selectedCell.row < next.length) {
                next[selectedCell.row][selectedCell.col] = selectedTime;
              }
              return next;
            });

            setTimeModalOpen(false);
          }}
          className="
            px-6
            py-2
            rounded-xl
            bg-primary
            text-white
            hover:bg-blue-600
            transition
          "
        >
          حفظ
        </button>

      </div>
    </div>
  </div>
)}
    </div>
    </motion.div>
  );
}

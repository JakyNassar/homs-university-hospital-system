import React, { useState, useEffect, useRef, useCallback } from "react";
import Select from "react-select";
import axios from "axios";
import {
  FaPlus,
  FaRegEye,
  FaSearch,
  FaSave,
  FaTimes,
  FaTrashAlt,
  FaEdit,
  FaRegFileWord,
  FaCheckSquare,
  FaSpinner,
  FaUserMd,
  FaSyringe,
  FaFileAlt,
  FaNotesMedical,
  FaFilter,
} from "react-icons/fa";
import { MdOutlineMedicalServices } from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";

const REQUIRED_FIELDS = [
  { key: "date", label: "التاريخ" },
  { key: "file_number", label: "رقم الإضبارة" },
  { key: "patient_name", label: "اسم المريض" },
  { key: "surgery_name", label: "اسم العمل الجراحي" },
  { key: "specialist_doctor", label: "الطبيب الأخصائي" },
  // { key: "nurse_name", label: "اسم الممرض" },
  { key: "anes_specialist", label: "طبيب التخدير" },
  { key: "anes_type", label: "نوع التخدير" },
];

// ✅ خريطة الأقسام (نفس القيم المستخدمة عند الحفظ) — تُستخدم أيضاً للفلترة وعرض القسم بالجدول
const DEPT_NAME_MAP = {
  "جراحة عامة": "1",
  "جراحة عظمية": "2",
  نسائية: "3",
  "داخلية(عامة)": "4",
  "داخلية(قلبية)": "5",
  أطفال: "6",
  عينية: "7",
  تخدير: "8",
  مخبر: "9",
  أشعة: "10",
};
const DEPT_ID_TO_NAME = Object.fromEntries(
  Object.entries(DEPT_NAME_MAP).map(([name, id]) => [id, name]),
);

const MONTHS_AR = [
  "كانون الثاني",
  "شباط",
  "آذار",
  "نيسان",
  "أيار",
  "حزيران",
  "تموز",
  "آب",
  "أيلول",
  "تشرين الأول",
  "تشرين الثاني",
  "كانون الأول",
];

// ✅  نوع التخدير
const ANES_OPTIONS = ["عام", "قطني", "موضعي", "غير ذلك"];

const hasPermission = (perm) => {
  if (localStorage.getItem("user_role") === "admin") return true;
  try {
    const perms = JSON.parse(localStorage.getItem("user_permissions") || "[]");
    return Array.isArray(perms) && perms.includes(perm);
  } catch {
    return false;
  }
};

function Operations() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewData, setViewData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [operationsData, setOperationsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedYearAnes, setSelectedYearAnes] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [allResidents, setAllResidents] = useState([]);
  const [anesResidents, setAnesResidents] = useState([]);
  const [selectedResidentObjects, setSelectedResidentObjects] = useState([]);
  const [selectedAnesResidentObjects, setSelectedAnesResidentObjects] =
    useState([]);

  // ✅ Patient autocomplete
  const [patientSuggestions, setPatientSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const patientRef = useRef(null);

  const [anesTypeSelected, setAnesTypeSelected] = useState("");
  const [anesTypeCustom, setAnesTypeCustom] = useState("");

  const [formData, setFormData] = useState({
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
    nurse_name: "",
    notes: "",
  });

  // refs للتنقل بالأسهم
  // 0=date 1=file_number 2=patient_name 3=surgery_name
  // 4=specialist_doctor 5=nurse_name 6=anes_specialist
  // 7=anes_type_custom 8=biopsy_number
  const fieldRefs = useRef([]);

  const handleFieldKey = (e, index) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      fieldRefs.current[index + 1]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      fieldRefs.current[index - 1]?.focus();
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };
  // ─── Fetch ────────────────────────────────────────────────
  const fetchOperations = async (forceRefresh = false) => {
    const token = localStorage.getItem("token");
    const cacheKey = "operations_cache";
    // اعرض البيانات المحفوظة فورا اذا موجودة
    if (!forceRefresh) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setOperationsData(JSON.parse(cached));
        setIsLoading(false);
        return;
      }
    }
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/surgeries", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 200) {
        setOperationsData(res.data);
        sessionStorage.setItem(cacheKey, JSON.stringify(res.data));
      }
    } catch (e) {
      console.error("خطأ في جلب العمليات:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllResidents = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(
        "http://127.0.0.1:8000/api/doctors_without_anes",
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.status === 200)
        setAllResidents(
          res.data.map((doc) => ({
            value: doc.id,
            label: `د. ${doc.name}`,
            year: String(doc.study_year),
            dept: String(doc.department),
          })),
        );
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAnesResidents = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/anes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 200)
        setAnesResidents(
          res.data.map((doc) => ({
            value: doc.id,
            label: `د. ${doc.name}`,
            year: String(doc.study_year),
            dept: String(doc.department),
          })),
        );
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchOperations();
    fetchAllResidents();
    fetchAnesResidents();
  }, []);

  // ✅ Patient search autocomplete
  const searchPatients = async (query) => {
    if (!query || String(query).trim() === "") {
      setPatientSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const res = await axios.get(
        `http://127.0.0.1:8000/api/surgeries/search-patients?query=${query}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (res.data && Array.isArray(res.data)) {
        setPatientSuggestions(res.data);
        setShowSuggestions(res.data.length > 0);
      } else {
        setPatientSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (err) {
      console.error("خطأ أثناء جلب اقتراحات المرضى:", err);
      setPatientSuggestions([]);
      setShowSuggestions(false);
    }
  };
  // ─── Reset ────────────────────────────────────────────────
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

  const getAnesTypeValue = () => {
    if (anesTypeSelected === "غير ذلك") return anesTypeCustom;
    return anesTypeSelected;
  };
  const validate = () => {
    const dataToCheck = { ...formData, anes_type: getAnesTypeValue() };

    const fieldsToCheck = REQUIRED_FIELDS.filter(
      ({ key }) => key !== "date" && key !== "file_number",
    );
    const hasEmpty = fieldsToCheck.some(
      ({ key }) => !dataToCheck[key] || String(dataToCheck[key]).trim() === "",
    );

    // تحقق اسم ثلاثي
    const nameWords = (formData.patient_name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (nameWords.length > 0 && nameWords.length < 3) {
      setFormErrors((p) => ({
        ...p,
        patient_name: "يرجى إدخال الاسم الثلاثي كاملاً",
      }));
      alert("⚠️ يرجى إدخال اسم المريض الثلاثي كاملاً!");
      return false;
    }

    if (hasEmpty || !formData.date || !formData.file_number) {
      alert("⚠️ يرجى تعبئة جميع الحقول المطلوبة قبل الحفظ!");
      return false;
    }

    return true;
  };
  // ─── Edit Modal — يفتح فوراً ──────────────────────────────
  const openEditModal = async (op) => {
    setIsEditing(true);
    setEditId(op.id);
    setFormErrors({});
    setIsSaving(false);
    setShowAddModal(true);
    setFormData({
      date: op.date || "",
      patient_name: op.patient_name || "",
      file_number: op.file_number || "",
      surgery_name: op.surgery_name || "",
      specialist_doctor: op.specialist_doctor || "",
      nurse_name: op.nurse_name || "",
      anes_type: op.anes_type || "",
      anes_specialist: op.anes_specialist || "",
      biopsy_number: op.biopsy_number || "",
      notes: op.notes || "",
      residents: (op.residents || []).map((r) => r.id).join(", "),
      anes_residents: (op.anes_residents || []).map((r) => r.id).join(", "),
    });

    // ✅ ضبط نوع التخدير
    const anesVal = op.anes_type || "";
    if (ANES_OPTIONS.includes(anesVal)) {
      setAnesTypeSelected(anesVal);
      setAnesTypeCustom("");
    } else if (anesVal) {
      setAnesTypeSelected("غير ذلك");
      setAnesTypeCustom(anesVal);
    } else {
      setAnesTypeSelected("");
      setAnesTypeCustom("");
    }

    const residentObjs = (op.residents || []).map((r) => {
      const match = allResidents.find((d) => d.value === r.id);
      return (
        match || {
          value: r.id,
          label: `د. ${r.name || r.user?.full_name || ""}`,
          year: String(r.study_year || ""),
          dept: String(r.department || ""),
        }
      );
    });
    const anesObjs = (op.anes_residents || []).map((r) => {
      const match = anesResidents.find((d) => d.value === r.id);
      return (
        match || {
          value: r.id,
          label: `د. ${r.name || r.user?.full_name || ""}`,
          year: String(r.study_year || ""),
          dept: String(r.department || ""),
        }
      );
    });
    setSelectedResidentObjects(residentObjs);
    setSelectedAnesResidentObjects(anesObjs);
    if (residentObjs.length > 0 && residentObjs[0].year) {
      setSelectedYear(residentObjs[0].year);
      setSelectedDept(residentObjs[0].dept || "");
    }
    if (anesObjs.length > 0 && anesObjs[0].year)
      setSelectedYearAnes(anesObjs[0].year);

    const token = localStorage.getItem("token");
    try {
      setIsLoadingEdit(true);
      const [surgRes, allRes, anesRes] = await Promise.all([
        axios.get(`http://127.0.0.1:8000/api/surgeries/${op.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get("http://127.0.0.1:8000/api/doctors_without_anes", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get("http://127.0.0.1:8000/api/anes", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const data = surgRes.data;
      const allDocs = allRes.data.map((d) => ({
        value: d.id,
        label: `د. ${d.name}`,
        year: String(d.study_year),
        dept: String(d.department),
      }));
      const anesDocs = anesRes.data.map((d) => ({
        value: d.id,
        label: `د. ${d.name}`,
        year: String(d.study_year),
        dept: String(d.department),
      }));
      setAllResidents(allDocs);
      setAnesResidents(anesDocs);
      const updRes = (data.residents || []).map(
        (r) =>
          allDocs.find((d) => d.value === r.id) || {
            value: r.id,
            label: `د. ${r.name || ""}`,
            year: "",
            dept: "",
          },
      );
      const updAnes = (data.anes_residents || []).map(
        (r) =>
          anesDocs.find((d) => d.value === r.id) || {
            value: r.id,
            label: `د. ${r.name || ""}`,
            year: "",
            dept: "",
          },
      );
      setSelectedResidentObjects(updRes);
      setSelectedAnesResidentObjects(updAnes);
      setFormData((prev) => ({
        ...prev,
        residents: updRes.map((r) => r.value).join(", "),
        anes_residents: updAnes.map((r) => r.value).join(", "),
      }));
      if (updRes.length > 0 && updRes[0].year) {
        setSelectedYear(updRes[0].year);
        setSelectedDept(updRes[0].dept || "");
      }
      if (updAnes.length > 0 && updAnes[0].year)
        setSelectedYearAnes(updAnes[0].year);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingEdit(false);
    }
  };

  // ─── Save  \\  ──────────────────────────────────
  const handleSave = useCallback(async () => {
    if (isSaving) return;
    const finalAnesType = getAnesTypeValue();
    if (!validate()) return;
    setIsSaving(true);

    const token = localStorage.getItem("token");
    // console.log("الأطباء المختارين بداخل الأوبجكت:", selectedResidentObjects);
    const chosenResidentsObjects = selectedResidentObjects || [];
    const deptName =
      chosenResidentsObjects.length > 0 ? chosenResidentsObjects[0].dept : "";
    const autoDepartmentId = DEPT_NAME_MAP[deptName] || 1;

    const payload = {
      date: formData.date,
      patient_name: formData.patient_name,
      file_number: Number(formData.file_number),
      surgery_name: formData.surgery_name,
      nurse_name: formData.nurse_name || null,
      specialist_doctor: formData.specialist_doctor,
      anes_specialist: formData.anes_specialist || null,
      anes_type: finalAnesType || null,
      biopsy_number: formData.biopsy_number || null,
      notes: formData.notes || null,
      department_id: autoDepartmentId,
      resident_ids: formData.residents
        ? formData.residents.split(", ").map(Number).filter(Boolean)
        : [],
      anes_resident_ids: formData.anes_residents
        ? formData.anes_residents.split(", ").map(Number).filter(Boolean)
        : [],
    };
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    };
    // console.log("البيانات الذاهبة للسيرفر وقيمة القسم المستنتجة هي:", payload);
    try {
      let savedSurgery;
      if (isEditing && editId) {
        const res = await axios.put(
          `http://127.0.0.1:8000/api/surgeries/${editId}`,
          payload,
          config,
        );
        savedSurgery = res.data?.surgery || res.data;
        // ✅ تحديث فوري بالواجهة بدون انتظار إعادة جلب كامل
        setOperationsData((prev) =>
          prev.map((op) =>
            op.id === editId ? { ...op, ...savedSurgery } : op,
          ),
        );
      } else {
        const res = await axios.post(
          "http://127.0.0.1:8000/api/surgeries",
          payload,
          config,
        );
        savedSurgery = res.data?.surgery || res.data;
        // ✅ إضافة فورية بالواجهة
        setOperationsData((prev) => [savedSurgery, ...prev]);
      }
      alert(
        isEditing
          ? "✅ تم تعديل السجل بنجاح!"
          : "✅ تم إضافة سجل العملية بنجاح!",
      );
      setShowAddModal(false);
      resetForm();
      // ✅ مزامنة هادئة بالخلفية لضمان دقة البيانات لاحقاً
      fetchOperations(true);
    } catch (error) {
      console.error("خطأ:", error);
      const errors = error.response?.data?.errors;
      if (errors) {
        const newErrors = {};
        if (errors.file_number) {
          newErrors.file_number = errors.file_number[0];
          // alert(`⚠️ ${errors.file_number[0]}`);
        }
        if (errors.date) {
          newErrors.date = errors.date[0];
          // alert(`⚠️ ${errors.date[0]}`);
        }
        setFormErrors(newErrors);
      } else if (error.response?.status === 422) {
        alert("⚠️ يرجى تعبئة جميع الحقول المطلوبة بشكل صحيح.");
      } else if (error.response?.status === 403) {
        alert("🚫 ليس لديك صلاحية لتنفيذ هذا الإجراء.");
      } else {
        alert("❌ حدث خطأ من السيرفر، يرجى المحاولة لاحقاً.");
      }
      setIsSaving(false);
    }
  }, [isSaving, formData, isEditing, editId, anesTypeSelected, anesTypeCustom]);

  // ─── Delete ───────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا السجل نهائياً؟")) return;
    const token = localStorage.getItem("token");
    try {
      const res = await axios.delete(
        `http://127.0.0.1:8000/api/surgeries/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );
      if (res.status === 200) {
        // امسح الـ cache وحدّث الـ state محلياً بدون إعادة fetch
        sessionStorage.removeItem("operations_cache");
        setOperationsData((prev) => prev.filter((op) => op.id !== id));
        alert("✅ تم حذف سجل العملية بنجاح.");
      }
    } catch (error) {
      if (error.response?.status === 403)
        alert("🚫 ليس لديك صلاحية لحذف هذا السجل.");
      else
        alert(
          `❌ فشل الحذف: ${error.response?.data?.message || "خطأ من السيرفر"}`,
        );
    }
  };

  const handleBulkDelete = async () => {
    if (
      !window.confirm(
        `هل أنت متأكد من حذف (${selectedIds.length}) عملية نهائياً؟`,
      )
    )
      return;
    const token = localStorage.getItem("token");
    setIsBulkDeleting(true);
    try {
      const res = await fetch(
        "http://127.0.0.1:8000/api/surgeries/bulk-delete",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ids: selectedIds }),
        },
      );
      if (res.ok) {
        setOperationsData((prev) =>
          prev.filter((op) => !selectedIds.includes(op.id)),
        );
        setSelectedIds([]);
        alert(`✅ تم حذف ${selectedIds.length} عمليات بنجاح.`);
      } else {
        alert("❌ فشل في حذف العمليات المحددة.");
      }
    } catch {
      alert("❌ خطأ في الاتصال بالشبكة.");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleExportWord = async () => {
    const token = localStorage.getItem("token");
    setIsExporting(true);
    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/surgeries/export-word",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ids: selectedIds }),
        },
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          `تقرير_العمليات_${new Date().toLocaleDateString("ar")}.docx`,
        );
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        alert("❌ فشل في تصدير ملف Word.");
      }
    } catch {
      alert("❌ خطأ في الاتصال بالشبكة.");
    } finally {
      setIsExporting(false);
    }
  };

  // ─── Filter + Search ──────────────────────────────────────
  const filteredOps = operationsData.filter((op) => {
    if (filterMonth || filterYear) {
      const date = op.date ? new Date(op.date) : null;
      if (!date) return false;
      if (filterMonth && String(date.getMonth() + 1) !== filterMonth)
        return false;
      if (filterYear && String(date.getFullYear()) !== filterYear) return false;
    }
    if (filterDept) {
      const opDeptId = op.department_id ?? op.department?.id ?? null;
      if (String(opDeptId) !== String(DEPT_NAME_MAP[filterDept] || ""))
        return false;
    }
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    const residentsText = (op.residents || [])
      .map((r) => (r.name || r.user?.full_name || "").toLowerCase())
      .join(" ");
    const anesResidentsText = (op.anes_residents || [])
      .map((r) => (r.name || r.user?.full_name || "").toLowerCase())
      .join(" ");
    return (
      (op.patient_name || "").toLowerCase().includes(term) ||
      String(op.file_number || "").includes(term) ||
      (op.surgery_name || "").toLowerCase().includes(term) ||
      (op.specialist_doctor || "").toLowerCase().includes(term) ||
      (op.anes_specialist || "").toLowerCase().includes(term) ||
      (op.nurse_name || "").toLowerCase().includes(term) ||
      String(op.number || "").includes(term) ||
      residentsText.includes(term) ||
      anesResidentsText.includes(term)
    );
  });

  const uniqueYears = [
    ...new Set(
      operationsData
        .map((op) => {
          if (!op.date) return null;
          const y = parseInt(op.date.substring(0, 4), 10);
          return y >= 2000 ? y : null;
        })
        .filter(Boolean),
    ),
  ].sort((a, b) => b - a);
  const handleSelect = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  const handleSelectAll = () =>
    setSelectedIds(
      selectedIds.length === filteredOps.length
        ? []
        : filteredOps.map((op) => op.id),
    );

  const customStyles = {
    control: (base, state) => ({
      ...base,
      borderRadius: "0.5rem",
      borderColor: state.isFocused ? "#3b82f6" : "#e2e8f0",
      padding: "2px",
      fontSize: "0.875rem",
      boxShadow: "none",
    }),
    menu: (base) => ({ ...base, zIndex: 9999 }),
  };

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === "Escape") {
        setViewData(null);
        setShowAddModal(false);
        resetForm();
      }
    };
    if (showAddModal || viewData) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [showAddModal, viewData]);

  const renderDoctors = (list, fallback) => {
    if (!Array.isArray(list) || list.length === 0)
      return <span className="text-slate-400 italic text-xs">{fallback}</span>;
    return (
      <div className="flex flex-wrap gap-1.5 mt-1">
        {list.map((d, i) => {
          const name = d.name || d.user?.full_name || d.label || "طبيب";
          const year = d.study_year || d.year || "";
          return (
            <span
              key={i}
              className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full text-xs font-semibold"
            >
              <FaUserMd size={10} /> {name}
              {year ? ` — س${year}` : ""}
            </span>
          );
        })}
      </div>
    );
  };

  const inp = (key, label, index, colSpan = "") => {
    return (
      <div className={`space-y-1 ${colSpan}`}>
        <label className="text-sm font-bold text-slate-600">{label} *</label>
        <input
          type="text"
          value={formData[key] || ""}
          ref={(el) => (fieldRefs.current[index] = el)}
          onKeyDown={(e) => handleFieldKey(e, index)}
          onChange={(e) => {
            setFormData((p) => ({ ...p, [key]: e.target.value }));
          }}
          className="w-full p-2.5 bg-white border border-slate-200 focus:border-blue-500 focus:ring-blue-500/10 rounded-lg outline-none focus:ring-2 transition-all text-sm"
        />
      </div>
    );
  };

  return (
    <motion.div
      className="w-full overflow-x-hidden"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="min-h-screen text-slate-800 w-full">
        <main className="w-full p-3 md:p-6 overflow-hidden">
          {/* Header */}
          <div className="bg-white mt-5 mb-6 p-4 md:p-6 rounded-xl border border-slate-200 shadow-sm shadow-blue-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h1
              className="text-xl md:text-2xl font-black flex items-center gap-3 text-slate-800 [&:hover]:text-[#1a4d8c]
               cursor-default transition-all duration-300 ease-in-out group
               
               hover:bg-gradient-to-r hover:from-[#1a4d8c] hover:to-[#4a90e2] hover:bg-clip-text hover:text-transparent"
            >
              <div className="p-2 bg-blue-100 rounded-lg transition-transform duration-300 group-hover:rotate-6">
                <MdOutlineMedicalServices className="text-blue-600 text-xl animate-pulse" />
              </div>

              <span>إدارة العمليات الجراحية</span>
            </h1>
            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-blue-700 shadow-md transition-all text-sm"
            >
              <FaPlus /> عملية جراحية جديدة
            </button>
          </div>

          {/* Search + Filters */}
          <div className="mb-4 flex flex-col md:flex-row gap-3 items-start md:items-center">
            <div className="relative w-full md:max-w-sm">
              <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث بالاسم، الطبيب، المقيم..."
                className="w-full pr-12 pl-10 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <FaTimes size={13} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <FaFilter className="text-slate-400 text-sm flex-shrink-0" />
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="p-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 shadow-sm min-w-[120px]"
              >
                <option value="">كل الأشهر</option>
                {MONTHS_AR.map((m, i) => (
                  <option key={i + 1} value={String(i + 1)}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="p-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 shadow-sm min-w-[100px]"
              >
                <option value="">كل السنوات</option>
                {uniqueYears.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="p-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 shadow-sm min-w-[130px]"
              >
                <option value="">كل الأقسام</option>
                {Object.keys(DEPT_NAME_MAP).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {(filterMonth || filterYear || filterDept) && (
                <button
                  onClick={() => {
                    setFilterMonth("");
                    setFilterYear("");
                    setFilterDept("");
                  }}
                  className="text-xs text-red-500 hover:text-red-700 underline whitespace-nowrap transition-colors"
                >
                  مسح الفلتر
                </button>
              )}
            </div>
          </div>

          {/* شريط الإجراءات الجماعية */}
          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
                  <FaCheckSquare className="text-blue-500" />
                  تم تحديد{" "}
                  <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs">
                    {selectedIds.length}
                  </span>{" "}
                  عملية
                  <button
                    onClick={() => setSelectedIds([])}
                    className="text-slate-400 hover:text-red-500 text-xs font-normal underline mr-2 transition-colors"
                  >
                    إلغاء التحديد
                  </button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={handleExportWord}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-60"
                  >
                    {isExporting ? (
                      <FaSpinner className="animate-spin" />
                    ) : (
                      <FaRegFileWord />
                    )}
                    {isExporting ? "جارٍ التصدير..." : "تصدير Word"}
                  </button>
                  {hasPermission("delete surgery") && (
                    <button
                      onClick={handleBulkDelete}
                      disabled={isBulkDeleting}
                      className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700 transition-all shadow-sm disabled:opacity-60"
                    >
                      {isBulkDeleting ? (
                        <FaSpinner className="animate-spin" />
                      ) : (
                        <FaTrashAlt />
                      )}
                      {isBulkDeleting ? "جارٍ الحذف..." : "حذف المحدد"}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-x-auto">
              <table className="w-full text-right min-w-[700px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm uppercase tracking-wide">
                  <tr>
                    <th className="p-4 text-center w-10">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                        checked={
                          filteredOps.length > 0 &&
                          selectedIds.length === filteredOps.length
                        }
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="p-4">الرقم</th>
                    <th className="p-4">التاريخ</th>
                    <th className="p-4">اسم المريض</th>
                    <th className="p-4">رقم الإضبارة</th>
                    <th className="p-4">العمل الجراحي</th>
                    <th className="p-4">الطبيب الأخصائي</th>
                    <th className="p-4">القسم</th>
                    <th className="p-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="p-12 text-center text-slate-400"
                      >
                        <div className="flex flex-col items-center gap-3">
                          <FaSpinner className="text-3xl text-blue-400 animate-spin" />
                          <span>جارٍ تحميل العمليات...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredOps.length === 0 ? (
                    <tr>
                      <td
                        colSpan={9}
                        className="p-12 text-center text-slate-400"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <MdOutlineMedicalServices className="text-4xl text-slate-300" />
                          <span>
                            {searchTerm ||
                            filterMonth ||
                            filterYear ||
                            filterDept
                              ? "لا توجد نتائج مطابقة"
                              : "لا توجد عمليات مسجلة"}
                          </span>
                          {(filterMonth || filterYear || filterDept) && (
                            <button
                              onClick={() => {
                                setFilterMonth("");
                                setFilterYear("");
                                setFilterDept("");
                              }}
                              className="text-xs text-blue-500 underline mt-1"
                            >
                              مسح الفلتر
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredOps.map((op) => (
                      <tr
                        key={op.id}
                        className={`transition-colors ${selectedIds.includes(op.id) ? "bg-blue-50/70" : "hover:bg-slate-50/70"}`}
                      >
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                            checked={selectedIds.includes(op.id)}
                            onChange={() => handleSelect(op.id)}
                          />
                        </td>
                        <td className="p-4 font-mono text-blue-600 font-bold text-sm">
                          #{op.number}
                        </td>
                        <td className="p-4 text-slate-500 text-xs">
                          {op.date}
                        </td>
                        <td className="p-4 font-medium text-sm">
                          {op.patient_name}
                        </td>
                        <td className="p-4 text-slate-500 text-sm">
                          {op.file_number}
                        </td>
                        <td className="p-4">
                          <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                            {op.surgery_name}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600 text-sm">
                          {op.specialist_doctor || "—"}
                        </td>
                        <td className="p-4 text-slate-600 text-sm">
                          {DEPT_ID_TO_NAME[
                            op.department_id ?? op.department?.id
                          ] ||
                            op.department?.name ||
                            "—"}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => setViewData(op)}
                              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                              title="عرض"
                            >
                              <FaRegEye size={15} />
                            </button>
                            {hasPermission("edit surgery") && (
                              <button
                                onClick={() => openEditModal(op)}
                                className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors"
                                title="تعديل"
                              >
                                <FaEdit size={15} />
                              </button>
                            )}
                            {hasPermission("delete surgery") && (
                              <button
                                onClick={() => handleDelete(op.id)}
                                className="p-2 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
                                title="حذف"
                              >
                                <FaTrashAlt size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {filteredOps.length > 0 && (
                <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400 text-right flex items-center justify-between">
                  <span>
                    إجمالي:{" "}
                    <span className="font-bold text-slate-600">
                      {filteredOps.length}
                    </span>{" "}
                    عملية
                    {(searchTerm ||
                      filterMonth ||
                      filterYear ||
                      filterDept) && (
                      <span className="mr-2 text-blue-400">
                        من أصل {operationsData.length}
                      </span>
                    )}
                  </span>
                  {(filterMonth || filterYear || filterDept) && (
                    <span className="text-blue-500 font-medium">
                      {filterMonth ? MONTHS_AR[Number(filterMonth) - 1] : ""}{" "}
                      {filterYear} {filterDept}
                    </span>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* ── Add/Edit Modal ────────────────────────────────── */}
          {showAddModal && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex justify-center items-center p-2 md:p-4 overflow-y-auto">
              <motion.form
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave();
                }}
                className="bg-white w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col"
              >
                <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-white flex-shrink-0">
                  <h2 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
                    <div className="p-2 bg-blue-600 text-white rounded-lg">
                      <FaPlus size={13} />
                    </div>
                    {isEditing
                      ? "تعديل سجل العملية الجراحية"
                      : "إضافة سجل عملية جراحية"}
                    {isLoadingEdit && (
                      <FaSpinner
                        className="animate-spin text-blue-400 mr-2"
                        size={14}
                      />
                    )}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                  >
                    <FaTimes size={18} />
                  </button>
                </div>

                <div className="p-4 md:p-6 overflow-y-auto bg-slate-50/50 flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* 0 — التاريخ */}
                    <div className="space-y-1">
                      <label className="text-sm font-bold text-slate-600">
                        التاريخ *
                      </label>
                      <input
                        type="date"
                        value={formData.date}
                        ref={(el) => (fieldRefs.current[0] = el)}
                        onKeyDown={(e) => handleFieldKey(e, 0)}
                        onChange={(e) => {
                          setFormData((p) => ({ ...p, date: e.target.value }));
                          if (formErrors.date)
                            setFormErrors((p) => ({ ...p, date: "" }));
                        }}
                        className={`w-full p-2.5 bg-white border rounded-lg outline-none focus:ring-2 transition-all text-sm ${
                          formErrors.date
                            ? "border-red-500 bg-red-50 focus:ring-red-500/10"
                            : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/10"
                        }`}
                      />
                      {formErrors.date &&
                        typeof formErrors.date === "string" && (
                          <p className="text-xs text-red-500 mt-0.5">
                            {formErrors.date}
                          </p>
                        )}
                    </div>
                    {/* 2 — اسم المريض الكامل */}
                    <div
                      className="md:col-span-2 space-y-1 relative"
                      ref={patientRef}
                    >
                      <label className="text-sm font-bold text-slate-600">
                        اسم المريض الكامل *
                      </label>
                      <input
                        type="text"
                        value={formData.patient_name}
                        ref={(el) => (fieldRefs.current[2] = el)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSave();
                            return;
                          }
                          if (e.key !== "ArrowDown" && e.key !== "ArrowUp")
                            handleFieldKey(e, 2);
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData((p) => ({ ...p, patient_name: val }));
                          const words = val.trim().split(/\s+/).filter(Boolean);
                          if (!val.trim()) {
                            setFormErrors((p) => ({
                              ...p,
                              patient_name: "",
                            }));
                          } else if (words.length < 3) {
                            setFormErrors((p) => ({
                              ...p,
                              patient_name: "يرجى إدخال الاسم الثلاثي كاملاً",
                            }));
                          } else {
                            setFormErrors((p) => ({ ...p, patient_name: "" }));
                          }
                          searchPatients(val);
                        }}
                        onFocus={() => {
                          if (patientSuggestions.length > 0)
                            setShowSuggestions(true);
                        }}
                        placeholder="اسم المريض الثلاثي"
                        className={`w-full p-2.5 bg-white border rounded-lg outline-none focus:ring-2 transition-all text-sm ${
                          formErrors.patient_name
                            ? "border-red-500 bg-red-50 focus:ring-red-500/10"
                            : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/10"
                        }`}
                      />

                      {showSuggestions &&
                        Array.isArray(patientSuggestions) &&
                        patientSuggestions.length > 0 && (
                          <div className="absolute top-full right-0 left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                            {patientSuggestions.map((p, i) => (
                              <button
                                key={i}
                                type="button"
                                onMouseDown={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    patient_name: p.name,
                                    file_number: String(
                                      p.file_number ||
                                        p.medical_record_number ||
                                        "",
                                    ),
                                  }));
                                  setShowSuggestions(false);
                                }}
                                className="w-full text-right px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors flex items-center justify-between border-b border-slate-50 last:border-0"
                              >
                                <span className="text-slate-500 text-xs font-mono">
                                  إضبارة:{" "}
                                  {p.file_number || p.medical_record_number}
                                </span>
                                <span className="font-semibold text-slate-800">
                                  {p.name}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      {formErrors.patient_name && (
                        <p className="text-xs text-red-500 mt-0.5">
                          {formErrors.patient_name}
                        </p>
                      )}
                    </div>
                    {/* 1 — رقم الإضبارة */}
                    <div className="space-y-1">
                      <label className="text-sm font-bold text-slate-600">
                        رقم الإضبارة *
                      </label>
                      <input
                        type="text"
                        value={formData.file_number}
                        ref={(el) => (fieldRefs.current[1] = el)}
                        onKeyDown={(e) => handleFieldKey(e, 1)}
                        onChange={(e) => {
                          setFormData((p) => ({
                            ...p,
                            file_number: e.target.value,
                          }));
                          if (formErrors.file_number)
                            setFormErrors((p) => ({ ...p, file_number: "" }));
                        }}
                        className={`w-full p-2.5 bg-white border rounded-lg outline-none focus:ring-2 transition-all text-sm ${
                          formErrors.file_number
                            ? "border-red-500 bg-red-50 focus:ring-red-500/10"
                            : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/10"
                        }`}
                      />
                      {formErrors.file_number &&
                        typeof formErrors.file_number === "string" && (
                          <p className="text-xs text-red-500 mt-0.5">
                            {formErrors.file_number}
                          </p>
                        )}
                    </div>

                    {/* 3 — اسم العمل الجراحي */}
                    {inp(
                      "surgery_name",
                      "اسم العمل الجراحي",
                      3,
                      "md:col-span-2",
                    )}
                    {/* Doctors */}
                    <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50/60 rounded-xl border border-blue-100">
                      {/* 4 — الطبيب الأخصائي */}
                      <div className="space-y-1">
                        <label className="text-sm font-bold text-blue-700">
                          الطبيب الأخصائي *
                        </label>
                        <input
                          type="text"
                          value={formData.specialist_doctor}
                          ref={(el) => (fieldRefs.current[4] = el)}
                          onKeyDown={(e) => handleFieldKey(e, 4)}
                          onChange={(e) => {
                            setFormData((p) => ({
                              ...p,
                              specialist_doctor: e.target.value,
                            }));
                            if (formErrors.specialist_doctor)
                              setFormErrors((p) => ({
                                ...p,
                                specialist_doctor: "",
                              }));
                          }}
                          className="w-full p-2.5 bg-white border border-blue-200 rounded-lg outline-none focus:border-blue-500 text-sm"
                        />
                      </div>
                      {/* 5 — ممرضة */}
                      <div className="space-y-1">
                        <label className="text-sm font-bold text-blue-700">
                          ممرضة العمليات
                        </label>
                        <input
                          type="text"
                          value={formData.nurse_name}
                          ref={(el) => (fieldRefs.current[5] = el)}
                          onKeyDown={(e) => handleFieldKey(e, 5)}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              nurse_name: e.target.value,
                            }))
                          }
                          className="w-full p-2.5 bg-white border border-blue-200 rounded-lg outline-none focus:border-blue-500 text-sm"
                        />
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <label className="text-sm font-bold text-blue-700">
                          الأطباء المقيمين المشاركين *
                        </label>
                        <div className="flex flex-col md:flex-row gap-2">
                          <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="w-full md:w-1/4 p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                          >
                            <option value="">اختر السنة...</option>
                            {[1, 2, 3, 4, 5].map((y) => (
                              <option key={y} value={String(y)}>
                                السنة{" "}
                                {
                                  [
                                    "الأولى",
                                    "الثانية",
                                    "الثالثة",
                                    "الرابعة",
                                    "الخامسة",
                                  ][y - 1]
                                }
                              </option>
                            ))}
                          </select>
                          <select
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                            className="w-full md:w-1/4 p-2.5 bg-white border border-blue-200 rounded-lg text-sm outline-none"
                          >
                            <option value="">اختر القسم...</option>
                            {[
                              "جراحة عامة",
                              "جراحة عظمية",
                              "نسائية",
                              "داخلية(عامة)",
                              "داخلية(قلبية)",
                              "أطفال",
                              "عينية",
                              "مخبر",
                              "أشعة",
                            ].map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                          <div className="w-full md:w-1/2">
                            <Select
                              isMulti
                              isSearchable
                              placeholder="ابحث عن طبيب..."
                              noOptionsMessage={() => " No option"}
                              styles={customStyles}
                              options={allResidents.filter(
                                (d) =>
                                  String(d.year) === String(selectedYear) &&
                                  String(d.dept) === String(selectedDept),
                              )}
                              value={selectedResidentObjects}
                              onChange={(opts) => {
                                setSelectedResidentObjects(opts || []);
                                setFormData((p) => ({
                                  ...p,
                                  residents: (opts || [])
                                    .map((o) => o.value)
                                    .join(", "),
                                }));
                              }}
                              className="text-right text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white/60 rounded-xl border border-slate-200">
                        {/* 6 — أخصائي التخدير */}
                        <div className="space-y-1">
                          <label className="text-sm font-bold text-slate-600">
                            أخصائي التخدير *
                          </label>
                          <input
                            type="text"
                            value={formData.anes_specialist}
                            ref={(el) => (fieldRefs.current[6] = el)}
                            onKeyDown={(e) => handleFieldKey(e, 6)}
                            onChange={(e) =>
                              setFormData((p) => ({
                                ...p,
                                anes_specialist: e.target.value,
                              }))
                            }
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
                          />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-sm font-bold text-slate-600">
                            مقيمين التخدير *
                          </label>
                          <div className="flex flex-col md:flex-row gap-2">
                            <select
                              value={selectedYearAnes}
                              onChange={(e) =>
                                setSelectedYearAnes(e.target.value)
                              }
                              className="w-full md:w-1/3 p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none"
                            >
                              <option value="">اختر السنة...</option>

                              {[
                                { value: "1", label: "السنة الأولى" },
                                { value: "2", label: "السنة الثانية" },
                                { value: "3", label: "السنة الثالثة" },
                                { value: "4", label: "السنة الرابعة" },
                                { value: "5", label: "السنة الخامسة" },
                              ].map((y) => (
                                <option key={y.value} value={y.value}>
                                  {y.label}
                                </option>
                              ))}
                            </select>
                            <div className="w-full md:w-2/3">
                              <Select
                                isMulti
                                isSearchable
                                placeholder="اختر مقيم التخدير..."
                                styles={customStyles}
                                options={anesResidents.filter(
                                  (d) =>
                                    String(d.year) === String(selectedYearAnes),
                                )}
                                value={selectedAnesResidentObjects}
                                onChange={(opts) => {
                                  setSelectedAnesResidentObjects(opts || []);
                                  setFormData((p) => ({
                                    ...p,
                                    anes_residents: (opts || [])
                                      .map((o) => o.value)
                                      .join(", "),
                                  }));
                                }}
                                className="text-right text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:col-span-3">
                        <div className="space-y-1">
                          <label className="text-sm font-bold text-slate-600">
                            نوع التخدير *
                          </label>
                          <select
                            value={anesTypeSelected}
                            onChange={(e) => {
                              setAnesTypeSelected(e.target.value);
                              setAnesTypeCustom("");
                            }}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                          >
                            <option value="">اختر نوع التخدير...</option>
                            {ANES_OPTIONS.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                          {anesTypeSelected === "غير ذلك" && (
                            <input
                              type="text"
                              value={anesTypeCustom}
                              ref={(el) => (fieldRefs.current[7] = el)}
                              onKeyDown={(e) => handleFieldKey(e, 7)}
                              onChange={(e) =>
                                setAnesTypeCustom(e.target.value)
                              }
                              placeholder="اكتب نوع التخدير..."
                              className="w-full mt-1 p-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-sm"
                            />
                          )}
                        </div>
                        {/* 8 — رقم العينة */}
                        <div className="space-y-1">
                          <label className="text-sm font-bold text-slate-600">
                            رقم العينة
                          </label>
                          <input
                            type="text"
                            value={formData.biopsy_number}
                            ref={(el) => (fieldRefs.current[8] = el)}
                            onKeyDown={(e) => handleFieldKey(e, 8)}
                            onChange={(e) =>
                              setFormData((p) => ({
                                ...p,
                                biopsy_number: e.target.value,
                              }))
                            }
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:border-blue-500 outline-none text-sm"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-3 space-y-1">
                      <label className="text-sm font-bold text-slate-600">
                        تقرير العملية والملاحظات
                      </label>
                      <textarea
                        value={formData.notes || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, notes: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSave();
                          }
                        }}
                        placeholder="أدخل ملاحظات العملية هنا..."
                        className="w-full border border-slate-200 rounded-lg p-2 text-sm text-right outline-none h-24 resize-none focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 md:p-5 border-t border-slate-100 flex justify-end gap-3 bg-white flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className="px-5 py-2.5 text-slate-500 font-semibold hover:bg-slate-50 rounded-lg transition-all text-sm border border-slate-200"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-all flex items-center gap-2 text-sm disabled:opacity-60"
                  >
                    {isSaving ? (
                      <FaSpinner className="animate-spin" />
                    ) : (
                      <FaSave size={13} />
                    )}
                    {isSaving
                      ? "جارٍ الحفظ..."
                      : isEditing
                        ? "حفظ التعديلات"
                        : "حفظ العملية"}
                  </button>
                </div>
              </motion.form>
            </div>
          )}

          {/* ── View Modal ────────────────────────────────────── */}
          {viewData && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex justify-center items-center p-2 md:p-4 overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col"
              >
                <div className="bg-gradient-to-l from-blue-400 to-blue-700 px-5 py-4 flex justify-between items-center flex-shrink-0">
                  <p className="text-blue-200 text-lg font-bold" dir="rtl">
                    سجل العملية الجراحية
                  </p>
                  <button
                    onClick={() => setViewData(null)}
                    className="p-1.5 hover:bg-white/20 text-white/80 hover:text-white rounded-lg transition-colors"
                  >
                    <FaTimes size={16} />
                  </button>
                </div>

                <div className="overflow-y-auto flex-1" dir="rtl">
                  <div className="p-4 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-400 uppercase mb-3 flex items-center gap-1.5">
                      <FaFileAlt size={10} /> معلومات أساسية
                    </p>
                    <div className="space-y-3">
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                        <p className="text-sm text-slate-400 mb-1 font-bold">
                          التاريخ
                        </p>
                        <p className="text-slate-800 font-medium text-sm">
                          {viewData.date || "—"}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2 bg-blue-50 rounded-lg p-3 border border-blue-100">
                          <p className="text-sm text-blue-500 font-bold mb-1">
                            اسم المريض
                          </p>
                          <p className="text-slate-900 font-medium text-sm">
                            {viewData.patient_name || "—"}
                          </p>
                        </div>

                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                          <p className="text-sm text-slate-400 mb-1 font-bold">
                            رقم الإضبارة
                          </p>
                          <p className="text-slate-800 font-medium text-sm">
                            {viewData.file_number || "—"}
                          </p>
                        </div>
                      </div>

                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                        <p className="text-sm text-blue-500 font-bold mb-1">
                          اسم العمل الجراحي
                        </p>
                        <p className="text-slate-900 font-medium text-sm">
                          {viewData.surgery_name || "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-b border-slate-100">
                    <p className="text-sm font-bold text-blue-600 uppercase mb-3 flex items-center gap-1.5">
                      <FaUserMd size={10} /> الفريق الجراحي
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      {[
                        {
                          label: "الطبيب الأخصائي",
                          value: viewData.specialist_doctor,
                          icon: (
                            <FaUserMd className="text-blue-600" size={13} />
                          ),
                          bg: "bg-blue-100",
                        },
                        {
                          label: "ممرضة العمليات",
                          value: viewData.nurse_name,
                          icon: (
                            <FaNotesMedical
                              className="text-pink-500"
                              size={13}
                            />
                          ),
                          bg: "bg-pink-100",
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex items-start gap-3 bg-slate-50 rounded-lg p-3 border border-slate-100"
                        >
                          <div
                            className={`w-8 h-8 ${item.bg} rounded-lg flex items-center justify-center flex-shrink-0`}
                          >
                            {item.icon}
                          </div>
                          <div>
                            <p className="text-sm text-slate-400 mb-0.5 font-bold">
                              {item.label}
                            </p>
                            <p className="text-slate-800 font-medium text-sm">
                              {item.value || "—"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <p className="text-sm text-slate-400 font-bold mb-2">
                        الأطباء المقيمين المشاركين
                      </p>
                      {renderDoctors(
                        viewData.residents,
                        "لا يوجد أطباء مقيمين",
                      )}
                    </div>
                  </div>

                  <div className="p-4 border-b border-slate-100">
                    <p className="text-sm font-bold text-purple-600 uppercase mb-3 flex items-center gap-1.5">
                      <FaSyringe size={10} /> التخدير
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      {[
                        {
                          label: "أخصائي التخدير",
                          value: viewData.anes_specialist,
                          icon: (
                            <FaUserMd className="text-purple-600" size={13} />
                          ),
                          bg: "bg-purple-100",
                        },
                        {
                          label: "نوع التخدير",
                          value: viewData.anes_type,
                          icon: (
                            <FaSyringe className="text-purple-600" size={13} />
                          ),
                          bg: "bg-purple-100",
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex items-start gap-3 bg-slate-50 rounded-lg p-3 border border-slate-100"
                        >
                          <div
                            className={`w-8 h-8 ${item.bg} rounded-lg flex items-center justify-center flex-shrink-0`}
                          >
                            {item.icon}
                          </div>
                          <div>
                            <p className="text-sm text-slate-400 mb-0.5 font-bold">
                              {item.label}
                            </p>
                            <p className="text-slate-800 font-medium text-sm">
                              {item.value || "—"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <p className="text-sm text-slate-400 font-bold mb-2">
                        مقيمين التخدير
                      </p>
                      {renderDoctors(
                        viewData.anes_residents,
                        "لا يوجد مقيمين تخدير",
                      )}
                    </div>
                  </div>

                  <div className="p-4 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-400 uppercase mb-3 flex items-center gap-1.5">
                      <FaNotesMedical size={10} /> تفاصيل إضافية
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { label: "رقم العينة", value: viewData.biopsy_number },
                        {
                          label: "القسم",
                          value:
                            DEPT_ID_TO_NAME[
                              viewData.department_id ?? viewData.department?.id
                            ] || viewData.department?.name,
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="bg-slate-50 rounded-lg p-3 border border-slate-100"
                        >
                          <p className="text-sm text-slate-400 mb-1 font-bold">
                            {item.label}
                          </p>
                          <p className="text-slate-800 font-medium text-sm">
                            {item.value || "—"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4">
                    <p className="text-sm font-bold text-amber-600 uppercase mb-2 flex items-center gap-1.5">
                      <FaNotesMedical size={10} /> تقرير العملية والملاحظات
                    </p>
                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 min-h-[56px]">
                      <p className="text-slate-700 leading-relaxed text-xs font-medium whitespace-pre-line">
                        {viewData.notes || (
                          <span className="text-slate-400 italic">
                            لا توجد ملاحظات
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3 border-t border-slate-100 flex justify-between items-center flex-shrink-0 bg-white">
                  {hasPermission("edit surgery") && (
                    <button
                      onClick={() => {
                        setViewData(null);
                        openEditModal(viewData);
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-amber-600 hover:bg-amber-50 border border-amber-200 rounded-lg text-sm font-semibold transition-all"
                    >
                      <FaEdit size={13} /> تعديل
                    </button>
                  )}
                  <button
                    onClick={() => setViewData(null)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-md mr-auto"
                  >
                    إغلاق
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </main>
      </div>
    </motion.div>
  );
}
[];
export default Operations;

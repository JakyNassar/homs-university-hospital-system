import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  FaEdit,
  FaTrashAlt,
  FaSearch,
  FaFileExcel,
  FaArrowDown,
} from "react-icons/fa";
import { IoEyeSharp } from "react-icons/io5";
import { motion } from "framer-motion";
import { IoIosArrowRoundDown, IoMdArrowUp } from "react-icons/io";
import { MdManageAccounts } from "react-icons/md";
import { VscChatSparkleWarning } from "react-icons/vsc";
import { FcCancel } from "react-icons/fc";
import { IoCheckmarkDoneCircleOutline } from "react-icons/io5";

function CrudUsers() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDoctor, setSearchDoctor] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showConfirmRaise, setShowConfirmRaise] = useState(false);
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [showConfirmFailedModal, setShowConfirmFailedModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedFailedDoctors, setSelectedFailedDoctors] = useState([]);

  const [allUsers, setAllUsers] = useState([]);
  const [doctors, setDoctors] = useState({});
  const [doctorsInYear, setDoctorsInYear] = useState([]);
  const [showDoctorFaildModal, setShowDoctorFaildModal] = useState(false);
  const [nameError, setNameError] = useState("");

  const [newUser, setNewUser] = useState({
    fullName: "",
    username: "",
    password: "",
    role: "",
    dept: "",
    study_year: "",
    email: "",
  });

  const openAddModal = () => {
    setNewUser({
      fullName: "",
      username: "",
      password: "",
      role: "",
      dept: "",
      study_year: "",
      email: "",
    });
    setShowModal(true);
  };
  const years = [
    { id: 1, label: "السنة الأولى" },
    { id: 2, label: "السنة الثانية" },
    { id: 3, label: "السنة الثالثة" },
    { id: 4, label: "السنة الرابعة" },
    { id: 5, label: "السنة الخامسة" },
  ];

  // ─── refs خارج الفورم (بحث + استيراد) ───────────────────
  const inputsRef = useRef([]);

  // ─── refs حقول الفورم داخل المودال ───────────────────────
  // 0=fullName  1=username  2=password  3=role  4=dept  5=study_year
  const formInputsRef = useRef([]);

  // ✅ تنقل خارج الفورم (بحث)
  const handleKeyDown = (e, index) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = inputsRef.current[index + 1];
      if (next) next.focus();
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = inputsRef.current[index - 1];
      if (prev) prev.focus();
    }
  };

  // ✅ تنقل داخل الفورم بالأسهم وEnter مرن يحفظ عند التعديل فوراً
  const handleFormKeyDown = (e, index) => {
    const LAST_INDEX = 6; // email هو آخر حقل

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = formInputsRef.current[index + 1];
      if (next) next.focus();
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = formInputsRef.current[index - 1];
      if (prev) prev.focus();
    }

    if (e.key === "Enter") {
      e.preventDefault(); // 🌟 منع نزول سطر جديد نهائياً

      // 🌟 التعديل الجوهري: إذا كنا بوضع التعديل أو وصلنا لآخر حقل بالإخراج -> احفظ فوراً
      if (isEditing || index === LAST_INDEX) {
        handleSave(e);
      } else {
        // ✅ إذا كانت إضافة جديدة، انتقل بسلاسة للحقل التالي
        const next = formInputsRef.current[index + 1];
        if (next) next.focus();
      }
    }
  };
  //  جلب اقسام الأطباء
  const departments = [
    ...new Set(doctorsInYear.map((doctor) => doctor.department)),
  ];
  //  ارسال الأطباء الراسبين لمنع ترفيعهم
  const handleFiledDoctors = async () => {
    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/api/update-study-year-exclude",
        {
          excluded_ids: selectedFailedDoctors,
          year_id: selectedYear,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        },
      );
      console.log(response.data);
      const result = response.data;
      alert(result.message);
      setShowConfirmFailedModal(false);
      setShowFailedModal(false);
    } catch (err) {
      console.log(err);
      alert("حدث خطأ أثناء الإرسال");
    }
  };
  // ─── Fetch ────────────────────────────────────────────────
  const fetchUsers = async () => {
    const token = localStorage.getItem("token");
    try {
      // جيب كل الصفحات دفعة وحدة بـ per_page كبير
      const response = await axios.get("http://127.0.0.1:8000/api/users", {
        params: { per_page: 1000 },
        headers: { Authorization: `Bearer ${token}` },
      });

      // الـ backend بيرجع paginated response فيه data array
      const rawData =
        response.data.data || response.data.doctors || response.data;

      const dataFromDB = (Array.isArray(rawData) ? rawData : []).map((item) => {
        const roleName = item.roles?.[0]?.name || item.role_name || "";
        const isDoctor = roleName.toLowerCase().includes("doctor");
        return {
          id: item.id,
          name: item.full_name,
          username: item.username,
          email: item.email || "",
          role: isDoctor ? "طبيب" : "رئيس مقيمين فرعي",
          dept: item.doctor?.department?.name || item.department_name || "",
          study_year: item.study_year,
        };
      });

      setAllUsers(dataFromDB);
      setUsers(dataFromDB);
    } catch (error) {
      console.error("خطأ في جلب البيانات:", error);
    }
  };
  // جلب الأطباء حسب السنة
  const getDoctorInYear = async (yearId) => {
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get(
        "http://127.0.0.1:8000/api/doctor-in-year",
        {
          params: { study_year: yearId }, // ← كان ناقص: يرسل السنة فعلياً للباك اند
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const result = response.data;
      console.log(result);

      // الباك اند هلق بيرجّع array مسطّحة جاهزة (مفلترة بنفس السنة)
      // مو Object مجمّع حسب السنة — فما في داعي doctors[selectedYear] بعد اليوم
      const doctorsArray = Array.isArray(result.data) ? result.data : [];
      setDoctors(doctorsArray);
      setDoctorsInYear(doctorsArray);

      console.log(doctorsArray);
    } catch (error) {
      console.error("خطأ في جلب الأطباء حسب السنة:", error);
      setDoctors([]);
      setDoctorsInYear([]);
      return [];
    }
  };
  useEffect(() => {
    // getDoctorInYear هلق بترجّع array جاهزة مفلترة، فبس منحدّث لما يتغير selectedYear
    if (selectedYear) {
      getDoctorInYear(selectedYear);
    } else {
      setDoctorsInYear([]);
    }
    console.log("selectedYear", selectedYear);
  }, [selectedYear]);

  //   const yearId = e.target.value;
  //   setSelectedYear(yearId);
  //   setSelectedDoctor("");
  //   if (yearId) {
  //     await getDoctorInYear(yearId);
  //   } else {
  //     setDoctorsInYear([]);
  //   }
  // };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ESC لإغلاق المودال
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setShowModal(false);
        setIsEditing(false);
        setIsOpen(false);
        setShowConfirmRaise(false);
        setShowFailedModal(false);
        setShowConfirmFailedModal(false);
        setShowDoctorFaildModal(false);
      }
    };
    if (
      showModal ||
      showConfirmRaise ||
      showFailedModal ||
      showConfirmFailedModal ||
      showDoctorFaildModal
    ) {
      document.addEventListener("keydown", handleEsc);
    }
    return () => document.removeEventListener("keydown", handleEsc);
  }, [
    showModal,
    showConfirmRaise,
    showFailedModal,
    showConfirmFailedModal,
    showDoctorFaildModal,
  ]);
  // ─── Delete ───────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (window.confirm("هل متأكدة من حذف هذا المستخدم نهائياً؟")) {
      const token = localStorage.getItem("token");
      try {
        await axios.delete(`http://127.0.0.1:8000/api/users/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAllUsers((prev) => prev.filter((u) => u.id !== id));
        setUsers((prev) => prev.filter((u) => u.id !== id));
        alert("تم حذف المستخدم بنجاح");
      } catch (error) {
        console.error("خطأ في الحذف:", error);
        alert("فشل في حذف المستخدم");
      }
    }
  };

  const handleDeleteAll = async () => {
    if (window.confirm("سيتم مسح كافة سجلات النظام! هل أنت متأكد؟")) {
      const token = localStorage.getItem("token");
      try {
        await axios.delete("http://127.0.0.1:8000/api/users/delete-all", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAllUsers([]);
        setUsers([]);
        alert("تم مسح كافة السجلات بنجاح");
      } catch (error) {
        alert("فشل في مسح السجلات، تأكد من صلاحيات الآدمن");
      }
    }
  };

  // ─── Save ─────────────────────────────────────────────────
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (
      !newUser.fullName.trim() ||
      !newUser.username.trim() ||
      !newUser.dept.toString().trim()
    ) {
      alert("يرجى تعبئة كافة الحقول");
      return;
    }
    const nameWords = newUser.fullName.trim().split(/\s+/).filter(Boolean);
    if (nameWords.length < 3) {
      setNameError("يرجى إدخال الاسم الثلاثي كاملاً");
      alert("يرجى إدخال الاسم الثلاثي كاملاً");
      return;
    }
    const token = localStorage.getItem("token");
    try {
      // ... داخل دالة handleSave ...

      if (isEditing) {
        await axios.put(
          `http://127.0.0.1:8000/api/users/${isEditing}`,
          {
            full_name: newUser.fullName,
            username: newUser.username,
            password: newUser.password,
            role: newUser.role,
            department_id: newUser.dept,
            study_year:
              newUser.study_year === "" ? null : Number(newUser.study_year),
            email: newUser.email || null,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        const updatedUser = {
          id: isEditing,
          name: newUser.fullName,
          username: newUser.username,
          // 🌟 الحل هنا: أضفنا حقل الإيميل ليتم تحديثه في الجدول فوراً عند التعديل
          email: newUser.email || "",
          role: newUser.role === "doctor" ? "طبيب" : "رئيس مقيمين فرعي",
          dept: newUser.deptName || "",
          study_year: newUser.study_year || null,
        };

        setAllUsers((prev) =>
          prev.map((u) => (u.id === isEditing ? updatedUser : u)),
        );
        setUsers((prev) =>
          prev.map((u) => (u.id === isEditing ? updatedUser : u)),
        );
        alert("تم التعديل بنجاح");
        setIsEditing(false);
      } else {
        const response = await axios.post(
          "http://127.0.0.1:8000/api/users",
          {
            full_name: newUser.fullName,
            username: newUser.username,
            password: newUser.password,
            role: newUser.role,
            department_id: newUser.dept,
            study_year: newUser.study_year,
            email: newUser.email || null,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );

        const serverUser = response.data.user;
        const newUserObj = {
          id: serverUser.id,
          name: serverUser.full_name,
          username: serverUser.username,
          // 🌟 الحل هنا: أخذ الإيميل العائد من السيرفر أو المكتوب بالفورم ليظهر بالجدول فوراً
          email: serverUser.email || newUser.email || "",
          role:
            serverUser.roles?.[0]?.name === "doctor"
              ? "طبيب"
              : "رئيس مقيمين فرعي",
          dept: serverUser.doctor?.department?.name || "",
          study_year: serverUser.study_year,
        };

        setAllUsers((prev) => [...prev, newUserObj]);
        setUsers((prev) => [...prev, newUserObj]);
        alert("تمت إضافة المستخدم بنجاح!");
      }
      setShowModal(false);
    } catch (error) {
      console.error("خطأ في العملية:", error.response);
      alert(error.response?.data?.message || "فشل في تنفيذ العملية");
    }
  };

  const handleEdit = (user) => {
    setIsEditing(user.id);
    const departmentMap = {
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
    setNewUser({
      fullName: user.name,
      username: user.username,
      password: "",
      role: user.role === "طبيب" ? "doctor" : "department_manager",
      dept: departmentMap[user.dept] || "",
      deptName: user.dept || "",
      study_year: user.study_year || "",
      email: user.email || "",
    });
    setShowModal(true);
  };

  // ─── Search ───────────────────────────────────────────────
  const handleSearch = (query) => {
    setSearchTerm(query);
    if (!query.trim()) {
      setUsers(allUsers);
      return;
    }
    const filtered = allUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(query.toLowerCase()) ||
        u.username.toLowerCase().includes(query.toLowerCase()) ||
        u.role.toLowerCase().includes(query.toLowerCase()) ||
        (u.dept && u.dept.toLowerCase().includes(query.toLowerCase())),
    );
    setUsers(filtered);
  };
  //  دمج الفلترة مع البحث
  const filteredDoctors = doctorsInYear.filter((doctor) => {
    const matchName = doctor.name
      .toLowerCase()
      .includes(searchDoctor.toLowerCase());

    const matchDepartment =
      !selectedDepartment || doctor.department === selectedDepartment;

    return matchName && matchDepartment;
  });
  const handleSaveResult = () => {
    setShowDoctorFaildModal(false);
    setShowConfirmFailedModal(true);
  };

  // ─── Import ───────────────────────────────────────────────
  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (ext !== "xlsx" && ext !== "xls") {
      alert("يرجى اختيار ملف Excel صحيح فقط (.xlsx أو .xls)");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    try {
      setIsImporting(true);
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://127.0.0.1:8000/api/users/import",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (response.status === 200) {
        alert(response.data.message);
        fetchUsers();
      }
    } catch (error) {
      alert("فشل الاستيراد، تأكد من صياغة ملف الاكسل.");
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

  // ─── Raise/Cancel Year ────────────────────────────────────
  const raiseYear = async () => {
    try {
      const res = await axios.post(
        "http://127.0.0.1:8000/api/update-study-year",
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        },
      );
      await fetchUsers();
      alert(res.data.message || "تم رفع السنة بنجاح");
    } catch (error) {
      console.log(error.response?.data || error.message);
    }
  };

  const cancelRaise = async () => {
    try {
      const res = await axios.post(
        "http://127.0.0.1:8000/api/rollback-study-year",
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        },
      );
      await fetchUsers();
      alert(res.data.message || "تم التراجع عن الرفع بنجاح");
    } catch (error) {
      console.log(error);
    }
  };
  const totalDoctorsCount = Object.values(doctors).flat().length;

  // ─── Render ───────────────────────────────────────────────
  return (
    <motion.div
      className="w-full z-40 flex"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="p-4 md:pt-13 md:p-6 w-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 shadow-2xl p-[2%] rounded-xl ">
          <div className="flex items-center gap-3 border-r-4 border-blue-600 pr-4 ">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight hover:bg-gradient-to-r hover:from-[#1a4d8c] hover:to-[#4a90e2] hover:bg-clip-text hover:text-transparent">
              إدارة مستخدمي النظام
            </h1>
          </div>
        </div>

        <div className="mb-6 flex flex-col-reverse gap-[15px] lg:flex-row justify-between items-center ">
          <div className="space-y-4 w-full lg:w-[50%] ">
            <div className="relative w-full">
              <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                <FaSearch className="w-4 h-4" />
              </span>
              <input
                type="text"
                ref={(el) => (inputsRef.current[0] = el)}
                placeholder="ابحث عن اسم الطبيب، القسم..."
                className="w-full bg-slate-50 border border-slate-200 rounded-3xl py-3 pr-12 pl-4 text-sm text-slate-700 outline-none transition-all focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm placeholder:text-slate-400"
                value={searchTerm}
                onKeyDown={(e) => handleKeyDown(e, 0)}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2"></div>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-2xl cursor-pointer transition-all shadow-md text-sm">
                <FaFileExcel size={18} />
                <span className="font-semibold">استيراد الاطباء</span>
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx, .xls"
                  onChange={handleImport}
                />
              </label>
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700"
              >
                <span className="text-lg font-bold">+</span>
                <span>إضافة مستخدم</span>
              </button>
            </div>
          </div>

          <div className="rounded-3xl border-2 border-blue-500 bg-blue-100 p-4 shadow-[0_20px_60px_-30px_rgba(59,130,246,0.7)] w-full lg:w-[45%]">
            <div className="flex flex-col md:flex-row items-start gap-4">
              <div className="flex p-[2] items-center justify-center bg-blue-500 text-white shadow-sm">
                <IoMdArrowUp className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-slate-900">
                  رفع الأطباء سنة
                </h1>
                <p className="text-sm leading-6 text-slate-600">
                  يرفع جميع الأطباء سنة واحدة (1 إلى 2، 2 إلى 3...) ويحذف
                  الأطباء فوق السنة الخامسة.
                </p>
              </div>
            </div>
            <div className="flex  gap-3 mt-2">
              <button
                onClick={() => setShowConfirmRaise(true)}
                className="mt-1 flex gap-1 rounded-2xl bg-blue-600 px-2 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 cursor-pointer"
              >
                <IoMdArrowUp className="w-6 h-5" /> رفع جميع الأطباء
              </button>
              <button
                onClick={() => {
                  setShowFailedModal(true);
                  getDoctorInYear(selectedYear);
                }}
                className="rounded-2xl flex items-center bg-amber-500 px-2 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition cursor-pointer"
              >
                <MdManageAccounts className="w-6 h-5" />
                الرفع باستثناء الراسبين
              </button>
              {/* <button
                onClick={cancelRaise}
                className="mt-1 flex gap-1 rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 cursor-pointer"
              >
                <IoIosArrowRoundDown className="w-6 h-5" /> التراجع عن الرفع
              </button> */}
            </div>
          </div>
        </div>

        {/* Table */}
        <motion.div
          className="w-full z-40 flex flex-col md:gap-[80px] shadow-lg overflow-auto h-[500px] overflow-scroll"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <table className="w-full border-collapse lg:table-auto text-xs lg:text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr>
                {[
                  "الاسم",
                  "اسم المستخدم",
                  "الإيميل",
                  "الدور الوظيفي",
                  "القسم",
                  "السنة",
                  "العمليات",
                ].map((h, i) => (
                  <th
                    key={i}
                    className={`p-3 text-slate-600 font-bold text-xs ${i === 6 ? "text-center" : "text-right"}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-black text-sm">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-gray-100 hover:bg-gray-100 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                        {user.name.charAt(0)}
                      </div>
                      <span className="font-bold text-slate-800">
                        {user.name}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-right text-[10px] md:text-sm border-b border-gray-100 font-semibold">
                    {user.username}
                  </td>
                  <td className="p-4 text-right text-[10px] md:text-sm border-b border-gray-100 text-gray-500">
                    {user.email || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="p-4 border-b whitespace-nowrap border-slate-50">
                    <span
                      className={`px-3 py-1 rounded-full text-s font-bold border ${
                        user.role === "طبيب"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : "bg-amber-50 text-amber-600 border-amber-100"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 text-right text-[10px] md:text-sm border-b border-gray-100 text-gray-700 font-semibold">
                    {user.dept}
                  </td>
                  <td className="p-4 text-right text-[10px] md:text-sm border-b border-gray-100 text-gray-700 font-semibold">
                    {user.study_year}
                  </td>
                  <td className="p-4 border-b border-slate-50">
                    <div className="flex justify-center gap-3">
                      <button
                        onClick={() => handleEdit(user)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <FaEdit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <FaTrashAlt size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* ── Modal الإضافة/التعديل ─────────────────────────── */}
        {showModal && (
          <form
            onSubmit={handleSave}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 p-6"
          >
            <div
              dir="rtl"
              className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 relative"
            >
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setIsEditing(false);
                  setIsOpen(false);
                }}
                className="absolute top-3 left-3 text-gray-400 hover:text-gray-700 transition-colors text-2xl"
              >
                ×
              </button>
              <h2 className="text-slate-800 font-semibold text-lg mb-3">
                {isEditing ? "تعديل بيانات المستخدم" : "إضافة مستخدم جديد"}
              </h2>

              <div className="grid grid-cols-1 gap-2 text-right mb-3">
                {/* 0 — الاسم الثلاثي */}
                <div>
                  <label className="block font-bold mb-1 lg:text-sm text-xs">
                    الاسم الثلاثي
                  </label>

                  <input
                    ref={(el) => (formInputsRef.current[0] = el)}
                    type="text"
                    value={newUser.fullName}
                    onKeyDown={(e) => handleFormKeyDown(e, 0)}
                    onChange={(e) => {
                      setNewUser({ ...newUser, fullName: e.target.value });
                      const words = e.target.value
                        .trim()
                        .split(/\s+/)
                        .filter(Boolean);
                      if (e.target.value.trim() && words.length < 3) {
                        setNameError("يرجى إدخال الاسم الثلاثي كاملاً");
                      } else {
                        setNameError("");
                      }
                    }}
                    className={`w-full border inset-shadow-sm rounded-lg p-1.5 outline-none ${
                      nameError
                        ? "border-red-500 bg-red-50"
                        : "border-primary inset-shadow-primary/30"
                    }`}
                    placeholder="مثلاً: د. نور سامر درويش"
                  />
                  {nameError && (
                    <p className="text-xs text-red-500 mt-0.5">{nameError}</p>
                  )}
                </div>

                {/* 1 — اسم المستخدم */}
                <div>
                  <label className="block font-bold mb-1 lg:text-sm text-xs">
                    اسم المستخدم
                  </label>
                  <input
                    ref={(el) => (formInputsRef.current[1] = el)}
                    type="text"
                    value={newUser.username}
                    onKeyDown={(e) => handleFormKeyDown(e, 1)}
                    onChange={(e) =>
                      setNewUser({ ...newUser, username: e.target.value })
                    }
                    className="w-full border border-primary inset-shadow-primary/30 inset-shadow-sm rounded-lg p-1.5 outline-none"
                    placeholder="nourdarwish"
                  />
                </div>

                {/* 2 — كلمة المرور */}
                <div>
                  <label className="block font-bold mb-1 lg:text-sm text-xs">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <input
                      ref={(el) => (formInputsRef.current[2] = el)}
                      type={showPassword ? "text" : "password"}
                      value={newUser.password}
                      onKeyDown={(e) => handleFormKeyDown(e, 2)}
                      onChange={(e) =>
                        setNewUser({ ...newUser, password: e.target.value })
                      }
                      className="w-full border border-primary inset-shadow-primary/30 inset-shadow-sm rounded-lg p-1.5 outline-none"
                      placeholder="******"
                    />
                    <div className="absolute inset-y-0 left-3 flex items-center cursor-pointer text-gray-500">
                      <IoEyeSharp
                        onClick={() => setShowPassword(!showPassword)}
                      />
                    </div>
                  </div>
                </div>

                {/* 3 — الدور الوظيفي */}
                <div>
                  <label className="block font-bold mb-1 lg:text-sm text-xs">
                    الدور الوظيفي
                  </label>
                  <select
                    ref={(el) => (formInputsRef.current[3] = el)}
                    value={newUser.role}
                    onKeyDown={(e) => handleFormKeyDown(e, 3)}
                    onChange={(e) =>
                      setNewUser({ ...newUser, role: e.target.value })
                    }
                    className="w-full border rounded-lg p-1.5 outline-none border-primary inset-shadow-primary/30 inset-shadow-sm bg-white text-right"
                  >
                    <option value="" disabled>
                      اختر الدور...
                    </option>
                    <option value="doctor">طبيب</option>
                    <option value="department_manager">رئيس مقيمين فرعي</option>
                  </select>
                </div>

                {/* 4 — القسم */}
                <div>
                  <label className="block font-bold mb-1 lg:text-sm text-xs">
                    القسم
                  </label>
                  <select
                    ref={(el) => (formInputsRef.current[4] = el)}
                    value={newUser.dept}
                    onKeyDown={(e) => handleFormKeyDown(e, 4)}
                    onChange={(e) =>
                      setNewUser({ ...newUser, dept: e.target.value })
                    }
                    className="w-full border rounded-lg p-1.5 outline-none border-primary inset-shadow-primary/30 inset-shadow-sm bg-white text-right"
                  >
                    <option value="" disabled>
                      اختر القسم...
                    </option>
                    <option value="1">جراحة عامة</option>
                    <option value="2">جراحة عظمية</option>
                    <option value="3">نسائية</option>
                    <option value="4">داخلية(عامة)</option>
                    <option value="5">داخلية(قلبية)</option>
                    <option value="6">أطفال</option>
                    <option value="7">عينية</option>
                    <option value="8">تخدير</option>
                    <option value="9">مخبر</option>
                    <option value="10">أشعة</option>
                  </select>
                </div>

                {/* 5 — السنة الدراسية (آخر حقل → Enter يحفظ) */}
                <div>
                  <label className="block font-bold mb-1 lg:text-sm text-xs text-right">
                    السنة الدراسية
                  </label>
                  <select
                    ref={(el) => (formInputsRef.current[5] = el)}
                    value={newUser.study_year}
                    onKeyDown={(e) => handleFormKeyDown(e, 5)}
                    onChange={(e) =>
                      setNewUser({ ...newUser, study_year: e.target.value })
                    }
                    className="w-full border rounded-lg p-1.5 outline-none border-primary bg-white text-right"
                  >
                    <option value="" disabled>
                      اختر السنة...
                    </option>
                    <option value="1">السنة الأولى</option>
                    <option value="2">السنة الثانية</option>
                    <option value="3">السنة الثالثة</option>
                    <option value="4">السنة الرابعة</option>
                    <option value="5">السنة الخامسة</option>
                  </select>
                </div>

                {/* 6 — الإيميل */}
                <div>
                  <label className="block font-bold mb-1 lg:text-sm text-xs text-right">
                    الإيميل{" "}
                    <span className="text-gray-400 font-normal">(اختياري)</span>
                  </label>
                  <input
                    type="email"
                    ref={(el) => (formInputsRef.current[6] = el)}
                    value={newUser.email}
                    onKeyDown={(e) => handleFormKeyDown(e, 6)}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    placeholder="example@gmail.com"
                    className="w-full border rounded-lg p-1.5 outline-none border-primary text-right"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-2 rounded-lg font-bold text-sm hover:from-blue-700 transition-shadow shadow-md"
              >
                {isEditing ? "تحديث البيانات" : "حفظ بيانات المستخدم"}
              </button>
            </div>
          </form>
        )}

        {/* ── مودال تأكيد الرفع ─────────────────────────────── */}
        {showConfirmRaise && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div
              dir="rtl"
              className="bg-white p-6 rounded-2xl max-w-md w-full text-right shadow-2xl border border-gray-100"
            >
              <h3 className="font-semibold text-xl mb-2 text-slate-800">
                هل تريد تأكيد الرفع؟
              </h3>
              <p className="text-sm text-slate-500 mb-5">
                سيتم ترقية{" "}
                <span className="text-blue-600 font-bold text-[20px]">
                  {" "}
                  جميع
                </span>{" "}
                الأطباء سنة واحدة, مع{" "}
                <span className="text-red-500 font-bold text-[20px]">
                  {" "}
                  حذف
                </span>{" "}
                الأطباء الذين تجاوزوا السنة الخامسة
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmRaise(false)}
                  className="flex-1 border cursor-pointer border-gray-200 bg-red-500 py-2 rounded-lg text-white hover:bg-red-700 transition"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setShowConfirmRaise(false);
                    await raiseYear();
                  }}
                  className="flex-1 bg-gradient-to-r cursor-pointer from-blue-600 hover:bg-blue-700 to-blue-500 text-white py-2 rounded-lg hover:from-blue-700 transition"
                >
                  تأكيد
                </button>
              </div>
            </div>
          </div>
        )}
        {showFailedModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div
              dir="rtl"
              className="bg-white p-6 rounded-2xl max-w-md w-full text-right shadow-2xl border border-gray-100"
            >
              <h3 className="font-semibold text-xl mb-2 text-amber-500 flex  items-center justify-start gap-2">
                <VscChatSparkleWarning />
                إدارة الراسبين
              </h3>
              <p className="text-sm text-slate-500 mb-5">
                اختر الأطباء الذين لم يترقوا
              </p>
              <div className="flex justify-around">
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    setShowDoctorFaildModal(true);
                  }}
                >
                  <option value=""> اختر السنة </option>
                  {years?.map((year) => (
                    <option key={year.id} value={year.id}>
                      {" "}
                      {year.label}{" "}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowFailedModal(false);
                  }}
                  className="flex-1 border cursor-pointer border-gray-200 bg-amber-500 py-2 rounded-lg text-white hover:bg-amber-600 transition"
                >
                  إلغاء
                </button>
              </div>

              {showConfirmFailedModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                  <div
                    dir="rtl"
                    className="bg-white p-6 rounded-2xl max-w-md w-full text-right shadow-2xl border border-gray-100"
                  >
                    <h3 className="font-semibold text-xl mb-2 text-slate-800">
                      هل تريد المتابعة؟
                    </h3>
                    <p className="text-sm text-red-500 mb-5 flex items-center">
                      <FcCancel />
                      عدد الأطباء الراسبين : {selectedFailedDoctors.length}
                    </p>
                    <p className="text-sm text-green-500 mb-5 flex items-center">
                      <IoCheckmarkDoneCircleOutline />
                      عدد الأطباء الذين سيتم ترقيتهم :{" "}
                      {totalDoctorsCount - selectedFailedDoctors.length}
                    </p>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleFiledDoctors}
                        className="flex-1 bg-gradient-to-r cursor-pointer from-blue-600 hover:bg-blue-700 to-blue-500 text-white py-2 rounded-lg hover:from-blue-700 transition"
                      >
                        تأكيد الرفع
                      </button>
                      <button
                        onClick={() => {
                          setShowConfirmFailedModal(false);
                        }}
                        className="flex-1 border cursor-pointer border-gray-200 bg-red-500 py-2 rounded-lg text-white hover:bg-red-700 transition"
                      >
                        تراجع
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* مودال اختيار الأطباء الراسبين */}
        {showDoctorFaildModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white p-5 h-[500px] w-2/3 rounded-xl shadow-lg flex flex-col">
              <div className="flex  flex-col gap-[10px] md:flex-row justify-between items-center mb-[5px]">
                <p className="font-bold text-[25px] text-primary mb-4">
                  أطباء السنة {selectedYear}
                </p>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className=" bg-slate-50 border border-slate-200 rounded-[20px] py-1  px-3 text-sm text-slate-700 outline-none transition-all focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm placeholder:text-slate-400 flex items-center"
                >
                  <option value=""> كل الأقسام</option>
                  {departments?.map((department) => (
                    <option key={department} value={department}>
                      {" "}
                      {department}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="ابحث عن طبيب ...  "
                  value={searchDoctor}
                  onChange={(e) => setSearchDoctor(e.target.value)}
                  className=" bg-slate-50 border border-slate-200 rounded-2xl py-1 px-3 text-sm text-slate-700 outline-none transition-all focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm placeholder:text-slate-400 flex items-center"
                />
              </div>

              <div className="flex-1 overflow-y-auto relative">
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 ">
                  {filteredDoctors.length === 0 ? (
                    <p className="text-slate-500 text-[20px] absolute top-[50%] left-[3%] transform translate-x-[50%]  translate-y-[50%] md:top-[40%] md:left-[30%] md:transform md:translate-x-[50%] md:translate-y-[50%]">
                      {" "}
                      لا يوجد طبيب بهذا الاسم....
                    </p>
                  ) : (
                    filteredDoctors.map((doctor) => (
                      <label
                        key={doctor.id}
                        className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          value={doctor.id}
                          checked={selectedFailedDoctors.includes(doctor.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFailedDoctors([
                                ...selectedFailedDoctors,
                                doctor.id,
                              ]);
                            } else {
                              setSelectedFailedDoctors(
                                selectedFailedDoctors.filter(
                                  (id) => id !== doctor.id,
                                ),
                              );
                            }
                          }}
                          className="w-4 h-4"
                        />

                        <div>
                          <p className="font-medium">{doctor.name}</p>
                          <p className="text-sm text-blue-500">
                            {doctor.department}
                          </p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div className="flex justify-center mt-[5px]">
                <button
                  onClick={handleSaveResult}
                  className=" w-1/3 border cursor-pointer border-gray-200 bg-blue-500  py-2  rounded-lg text-white hover:bg-blue-600 transition"
                >
                  حفظ النتيجة
                </button>
                <button
                  onClick={() => setShowDoctorFaildModal(false)}
                  className=" w-1/3 border cursor-pointer border-gray-200 bg-red-500  py-2  rounded-lg text-white hover:bg-red-600 transition"
                >
                  رجوع
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-start"></div>
        <div className="flex justify-between">
          <button
            onClick={handleDeleteAll}
            className="text-gray-600 hover:text-red-700 text-xs font-semibold flex items-center gap-2 transition-all border-b border-transparent hover:border-red-700 pb-1"
          >
            <FaTrashAlt className="text-xs" />
            <span> حذف جميع المستخدمين </span>
          </button>
          <button
            onClick={cancelRaise}
            className="text-gray-600 hover:text-red-700 text-xs font-semibold flex items-center gap-2 transition-all border-b border-transparent hover:border-red-700 pb-1"
          >
            <FaArrowDown />
            <span> التراجع عن الرفع </span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default CrudUsers;

import axios from "axios";
import { useRef, useState } from "react";
import { SiGnuprivacyguard } from "react-icons/si";
import { useNavigate } from "react-router";
import { IoEyeSharp } from "react-icons/io5";
import { motion } from "framer-motion";

function LogIn() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [data, setData] = useState({ username: "", password: "" });
  const formInputsRef = useRef([]);

  const changeHandle = async (e) => {
    e.preventDefault();
    const response = await fetch("http://127.0.0.1:8000/api/login", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    // console.log("رد السيرفر بالكامل:", result);
    if (response.ok && result.token) {
      localStorage.setItem("token", `${result.token}`);
      localStorage.setItem("user_role", result.role || "");
      // ✅ خزن اسم المستخدم للهيدر
      localStorage.setItem(
        "user_name",
        result.user?.full_name || result.user?.name || "",
      );
      //  السطر الصحيح والمضمون الحين
      const deptName = result.user?.department_name || "";
      localStorage.setItem("department", deptName);
      let allPermissions = [];
      try {
        if (
          result.user?.permissions &&
          Array.isArray(result.user.permissions)
        ) {
          allPermissions = result.user.permissions.map((p) =>
            typeof p === "object" ? p.name : p,
          );
        } else if (result.user?.roles && Array.isArray(result.user.roles)) {
          result.user.roles.forEach((role) => {
            (role.permissions || []).forEach((perm) => {
              const permName = typeof perm === "object" ? perm.name : perm;
              if (permName) allPermissions.push(permName);
            });
          });
        }
      } catch (e) {
        allPermissions = [];
      }

      localStorage.setItem("user_permissions", JSON.stringify(allPermissions));

      if (result.role === "admin") navigate("/adminDash");
      else if (result.role === "department_manager") navigate("/adminUserDash");
      else if (result.role === "doctor") navigate("/doctorDash");
    } else {
      alert(result.message);
    }
  };

  const handleFormKeyDown = (e, index) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      formInputsRef.current[index + 1]?.focus();
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      formInputsRef.current[index - 1]?.focus();
    }
    if (e.key === "Enter" && index === 1) {
      e.preventDefault();
      changeHandle(e);
    }
  };

  return (
    <motion.div
      className="w-full z-40 flex flex-col"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 1, ease: "easeOut" }}
    >
      <div className="relative min-h-screen w-full overflow-hidden bg-[url('/doctors.jpg')] bg-no-repeat bg-cover bg-center flex flex-col items-center justify-center">
        <div className="absolute inset-0 bg-white/10 backdrop-blur-sm z-0"></div>
        <div className="relative z-10">
          <h1 className="text-[20px] mb-[40px] text-center text-primary shadow-lg shadow-primary font-bold sm:text-[25px] lg:text-[30px]">
            نظام إدارة المناوبات وسجل العمليات الجراحية
          </h1>
        </div>
        <div className="border-1 relative flex flex-col items-center pt-[30px] w-[90%] pb-[20px] sm:w-[50%] xl:w-[35%] z-10 bg-transparent border-primary inset-shadow-sm inset-shadow-indigo-500/50 text-white rounded-2xl shadow-xl/75 shadow-black">
          <h1 className="text-primary font-bold mb-[10px] text-[20px] sm:text-[30px]">
            تسجيل الدخول
          </h1>
          <SiGnuprivacyguard className="text-primary text-[25px] sm:text-[30px]" />
          <form
            onSubmit={changeHandle}
            className="flex flex-col items-center pt-[5px] text-[15px] gap-1 xl:w-[70%]"
          >
            <div className="flex flex-col items-center mt-[20px] gap-2 sm:text-[20px] xl:w-full">
              <label className="font-semibold text-primary">
                اسم المستخدم :
              </label>
              <input
                className="border border-primary w-full px-2 py-1 bg-transparent text-gray-800 placeholder-gray-400 outline-none"
                type="text"
                placeholder="اسم المستخدم"
                name="username"
                ref={(el) => (formInputsRef.current[0] = el)}
                onKeyDown={(e) => handleFormKeyDown(e, 0)}
                value={data.username}
                onChange={(e) => setData({ ...data, username: e.target.value })}
              />
            </div>
            <div className="relative flex flex-col items-center mt-[20px] gap-2 sm:text-[20px] xl:w-full">
              <label className="font-semibold text-primary">كلمة السر :</label>
              <input
                className="border border-primary w-full px-2 py-1 bg-transparent text-gray-800 placeholder-gray-400 outline-none"
                type={showPassword ? "text" : "password"}
                placeholder="********"
                name="password"
                ref={(el) => (formInputsRef.current[1] = el)}
                onKeyDown={(e) => handleFormKeyDown(e, 1)}
                value={data.password}
                onChange={(e) => setData({ ...data, password: e.target.value })}
              />
              <div className="absolute inset-y-11 sm:inset-y-14 left-3 flex items-center cursor-pointer text-gray-500">
                <IoEyeSharp onClick={() => setShowPassword(!showPassword)} />
              </div>
            </div>
            <input
              className="bg-primary text-white w-[80%] rounded-sm mt-[20px] cursor-pointer py-[3px] sm:text-[20px] bg-gradient-to-b from-[#7bb9e8] via-[#4a90e2] to-[#1a4d8c] border-white hover:bg-gradient-to-t hover:brightness-110"
              type="submit"
              value="تسجيل دخول"
            />
          </form>
        </div>
      </div>
    </motion.div>
  );
}

export default LogIn;

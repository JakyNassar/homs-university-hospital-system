import React, { useState } from "react";
import { GiHamburgerMenu } from "react-icons/gi";
import { IoMdLogOut } from "react-icons/io";
import { NavLink, useLocation, useNavigate } from "react-router";
import { motion } from "framer-motion";
import axios from "axios";
import { LuActivity } from "react-icons/lu";
function SideBar({ items }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  const userName = localStorage.getItem("user_name") || "";
  const userRole = localStorage.getItem("user_role") || "";
  const userDept = localStorage.getItem("department") || "";
  const roleLabel =
    { admin: "مدير النظام", department_manager: "رئيس مقيمين", doctor: "طبيب" }[
      userRole
    ] || "";

  const formatDepartment = (dept) => {
    if (!dept) return "";
    const trimmedDept = dept.trim();
    if (trimmedDept === "جراحة عامة") return "الجراحة العامة";
    if (trimmedDept === "جراحة عظمية") return "الجراحة العظمية";
    if (!trimmedDept.startsWith("ال")) return "ال" + trimmedDept;
    return trimmedDept;
  };

  const welcomeRole = (() => {
    if (userRole === "department_manager" && userDept)
      return  `رئيس مقيمين فرعي قسم(${formatDepartment(userDept)})`;
    if (userRole === "doctor" && userDept)
      return `طبيب في قسم (${formatDepartment(userDept)})`;
    return roleLabel;
  })();

  const logOut = () => {
    const token = localStorage.getItem("token");
    axios
      .post("http://127.0.0.1:8000/api/logout", null, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
      .catch((err) => console.log("خروج محلي:", err))
      .finally(() => {
        localStorage.clear();
        navigate("/");
      });
  };

  const NavItem = ({ item, onClose }) => {
    const isActive =
      location.pathname === item.path ||
      item.paths?.some((p) => location.pathname.startsWith(p));
    return (
      <NavLink
        to={item.path}
        end
        onClick={onClose}
        className={`flex items-center gap-3 w-full px-3 py-3.5 rounded-xl font-semibold transition-all duration-200 group
          ${
            isActive
              ? "bg-gradient-to-l from-[#1a4d8c] via-[#4a90e2] to-[#7bb9e8] text-white shadow-md shadow-blue-200"
              : "text-slate-700 hover:bg-blue-50 hover:text-[#1a4d8c]"
          }`}
      >
        <span
          className={`text-xl flex-shrink-0 ${isActive ? "text-white" : "text-[#4a90e2] group-hover:text-[#1a4d8c]"}`}
        >
          {item.icon}
        </span>
        <span className="flex-1 text-right text-[15px]">{item.page}</span>
        {isActive && (
          <span className="w-2 h-2 rounded-full bg-white/70 flex-shrink-0" />
        )}
      </NavLink>
    );
  };

  return (
    <motion.div
      className="w-full z-40"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* ── Desktop ── */}
      <div className="hidden lg:flex flex-col h-[calc(100vh-70px)] mt-[70px] bg-white border-l border-primary">
        <div
          className="mx-3 mt-1 mb-2 p-2 rounded-2xl relative overflow-hidden cursor-default
               bg-gradient-to-br from-[#7ab3f0] via-[#4a90e2] to-[#2b6cb0]
               border border-white/30 shadow-[0_8px_20px_rgba(26,77,140,0.15)]
               transition-all duration-500 ease-out
               hover:-translate-y-1
               hover:shadow-[0_16px_32px_rgba(26,77,140,0.3)]
               hover:border-white/50
               group"
        >
          <div className="absolute -top-6 -left-6 w-24 h-24 bg-white/15 rounded-full blur-xl pointer-events-none transition-all duration-700 group-hover:scale-150 group-hover:bg-white/25" />
          <div className="absolute -bottom-10 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none transition-all duration-700 group-hover:scale-125" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-6 h-6 rounded-xl bg-white/25 flex items-center justify-center text-white mb-2 border border-white/40 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
              <LuActivity size={18} className="animate-pulse" />
            </div>

            <p className="text-white/70 text-center text-[9px] font-black tracking-widest uppercase mb-0.5">
              أهلا بك
            </p>

            <p className="text-white font-black text-center text-[13px] tracking-wide leading-tight mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]">
              {userName ? `د. ${userName}` : "أهلاً بك"}
            </p>

            <div className="w-full flex justify-center px-0.5">
              <span className="w-full bg-white/25 text-white font-black text-center backdrop-blur-md text-[11px] leading-relaxed px-1.5 py-1.5 rounded-lg border border-white/30 whitespace-normal break-words max-w-full block transition-all duration-500 group-hover:bg-white group-hover:text-[#1a4d8c] group-hover:shadow-lg group-hover:border-transparent">
                {welcomeRole}
              </span>
            </div>
          </div>
        </div>

        <div className="mx-4 mb-2">
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest text-right">
            القائمة الرئيسية
          </p>
        </div>

        <nav className="flex-1 px-3 flex flex-col gap-1.5 overflow-y-auto">
          {items?.map((item, i) => (
            <NavItem key={i} item={item} />
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-slate-100">
          <button
            onClick={logOut}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-[15px] font-semibold text-red-700 hover:bg-red-50 hover:text-red-700 transition-all duration-200"
          >
            <IoMdLogOut className="text-xl flex-shrink-0" />
            <span className="flex-1 text-right">تسجيل خروج</span>
          </button>
        </div>
      </div>

      {/* ── Mobile ── */}
      <button
        className="mt-[70px] mr-3 lg:hidden text-[32px] cursor-pointer bg-slate-50 p-1.5 rounded-xl text-[#1a4d8c] hover:text-[#4a90e2] hover:bg-blue-50/60 active:scale-95 transition-all duration-200 focus:outline-none"
        onClick={() => setVisible(!visible)}
      >
        <GiHamburgerMenu />
      </button>

      {visible && (
        <div className="lg:hidden bg-white border border-slate-200 rounded-xl mx-2 mt-1 shadow-lg overflow-hidden">
          <div className="p-4 bg-gradient-to-b from-[#4a90e2] to-[#7ab3f0] text-center">
            <p className="text-white font-bold text-base">
              {userName ? `د. ${userName}` : "أهلاً بك"}
            </p>
            <p className="text-white/80 text-xs">{welcomeRole}</p>
          </div>
          <nav className="p-2 flex flex-col gap-1">
            {items?.map((item, i) => (
              <NavItem key={i} item={item} onClose={() => setVisible(false)} />
            ))}
          </nav>
          <div className="p-2 border-t border-slate-100">
            <button
              onClick={logOut}
              className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-all"
            >
              <IoMdLogOut className="text-lg" />
              <span className="text-right flex-1">تسجيل خروج</span>
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default SideBar;

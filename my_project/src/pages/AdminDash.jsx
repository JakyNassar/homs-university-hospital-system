import React from "react";
import SideBar from "../components/SideBar/SideBar";
import { Outlet } from "react-router";
import { MdOutlineBrowserUpdated } from "react-icons/md";
import { LuCopyCheck } from "react-icons/lu";
import { FaUsersGear } from "react-icons/fa6";
import { SiWebauthn } from "react-icons/si";
import { FaTable } from "react-icons/fa";
import { FaFileArchive } from "react-icons/fa";
import { VscSourceControl } from "react-icons/vsc";

function AdminDash() {
  const items = [
    {
      path: "/adminDash/dashboard",
      page: "لوحة التحكم ",
      icon: <VscSourceControl />,
    },
    {
      path: "/adminDash/users",
      page: "إدارة بيانات المستخدمين ",
      icon: <FaUsersGear />,
    },
    {
      path: "/adminDash/permission",
      page: " إدارة صلاحيات المستخدمين",
      icon: <SiWebauthn />,
    },
    {
      path: "/adminDash/shifts",
      page: "  الإطلاع على سجل المناوبات   ",
      icon: <FaTable />,
    },
    

    {
      path: "/adminDash/operations",
      page: " سجل العمليات الجراحية",
      icon: <FaFileArchive />,
    },
    {
      path: "/adminDash/copy",
      page: " النسخ الاحتياطي",
      icon: <LuCopyCheck />,
    },
  ];
return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* السايدبار */}
      <div className="lg:fixed lg:right-0 lg:top-0 lg:w-64 lg:h-screen lg:border-l lg:border-primary z-30">
        <SideBar items={items} />
      </div>
      {/* المحتوى */}
      <div className="w-full lg:mr-64 pt-[70px]">
        <Outlet />
      </div>
    </div>
  );
}

export default AdminDash;

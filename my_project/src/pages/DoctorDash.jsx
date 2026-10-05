import React from "react";
import SideBar from "../components/SideBar/SideBar";
import { Outlet } from "react-router";
import { FaTable, FaFileArchive } from "react-icons/fa";

function DoctorDash() {
  const items = [
    {
      path: "/DoctorDash/shifts",
      page: "  الإطلاع على سجل المناوبات   ",
      icon: <FaTable />,
    },
    {
      path: "/DoctorDash/operations",
      page: " سجل العمليات الجراحية",
      icon: <FaFileArchive />,
    },
  ];
 
  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <div className="lg:fixed lg:right-0 lg:top-0 lg:w-64 lg:h-screen lg:border-l lg:border-primary z-30">
        <SideBar items={items} />
      </div>
      <div className="w-full lg:mr-64 pt-[70px]">
        <Outlet />
      </div>
    </div>
  );
}

export default DoctorDash;

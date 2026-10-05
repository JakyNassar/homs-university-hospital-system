import React, { useState } from "react";
import { FaFileArchive } from "react-icons/fa";
import { TbTiltShift } from "react-icons/tb";
import { VscSourceControl } from "react-icons/vsc";
import SideBar from "../components/SideBar/SideBar";
import { MdOutlineBrowserUpdated } from "react-icons/md";
import { Outlet } from "react-router";
import { FaTable } from "react-icons/fa";

function AdminUserDash() {
  const items = [
    {
      path: "/adminUserDash/view",
      paths: ["/adminUserDash/view", "/adminUserDash/autoSchedule"],
      page: " مناوبات الأطباء",
      icon: <TbTiltShift />,
    },

    {
      path: "/adminUserDash/shifts",
      page: "  الإطلاع على سجل المناوبات   ",
      icon: <FaTable />,
    },

    {
      path: "/adminUserDash/operations",
      page: " سجل العمليات الجراحية",
      icon: <FaFileArchive />,
    },
  ];
  const [scheduleData, setScheduleData] = useState([]);
  const [rawSchedule, setRawSchedule] = useState([]);
  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <div className="lg:fixed lg:right-0 lg:top-0 lg:w-64 lg:h-screen lg:border-l lg:border-primary z-30">
        <SideBar items={items} />
      </div>
      <div className="w-full lg:mr-64 pt-[70px]">
        <Outlet
          context={{
            scheduleData,
            setScheduleData,
            rawSchedule,
            setRawSchedule,
          }}
        />
      </div>
    </div>
  );
}

export default AdminUserDash;

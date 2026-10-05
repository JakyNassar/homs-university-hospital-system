import React from "react";
import { MdEventAvailable, MdMedicalInformation } from "react-icons/md";
import { RiBarChart2Fill } from "react-icons/ri";

function ShiftsCard({ totalDoctors, totalShifts, totalDays }) {
  const items = [
    {
      id: 1,
      cardTitle: "عدد المناوبات",
      cardNumber: totalShifts * totalDays,
      cardIcon: <MdEventAvailable />,
    },
    {
      id: 2,
      cardTitle: "عدد الأطباء المناوبين",
      cardNumber: totalDoctors,
      cardIcon: <MdMedicalInformation />,
    },
  ];
  return (
    <div className=" flex flex-col  sm:flex sm:flex-wrap sm:flex-row sm:justify-between  lg:justify-center  xl:justify-around  ">
      {items?.map((item, index) => (
        <div
          key={index}
          className={`flex text-center justify-around  items-center md:w-[40%] w-full justify-center mt-[20px] cursor-pointer rounded-[20px]  border-r-4  p-[5px] md:p-[30px] border-primary bg-white`}
        >
          <div className="ml-[10px] ">
            <h2 className=" sm:text-[20px] md:text-[15px] lg:text-[20px] font-bold">
              {item.cardTitle}
            </h2>
            <p className="text-[25px] text-primary font-bold ">
              {item.cardNumber}
            </p>
          </div>
          <div className="text-[20px] bg-primary border-2 rounded-[50%] p-[10px] text-white">
            {item.cardIcon}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ShiftsCard;

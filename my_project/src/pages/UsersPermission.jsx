import { Switch } from "@headlessui/react";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { FaRegEdit } from "react-icons/fa";
import { MdDeleteForever } from "react-icons/md";
import { TiDeleteOutline } from "react-icons/ti";
import { motion } from "framer-motion";

function UsersPermission() {
  const [editEnabled, setEditEnabled] = useState(true);
  const [deleteEnabled, setDeleteEnabled] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [filteredDoctors, setFilteredDoctors] = useState([]);
  const [filteredDelDoctors, setFilteredDelDoctors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDelTerm, setSearchDelTerm] = useState("");
  const [selectedEditDoctors, setSelectedEditDoctors] = useState([]);
  const [selectedDeleteDoctors, setSelectedDeleteDoctors] = useState([]);

  // إضافة event listener لـ ESC لإغلاق المودال
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setShowModal(false);
      }
    };

    if (showModal) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showModal]);


  const addEditArray = (doctor) => {
    setSelectedEditDoctors((prevSelected) =>
      prevSelected.some((item) => item.id === doctor.id)
        ? prevSelected
        : [...prevSelected, doctor],
    );
  };
  const addDeleteArray = (doctor) => {
    setSelectedDeleteDoctors((prevSelected) =>
      prevSelected.some((item) => item.id === doctor.id)
        ? prevSelected
        : [...prevSelected, doctor],
    );
  };
  const deleteFrmEdSel = (id) => {
    let newSelectedEdit = selectedEditDoctors.filter((item) => item.id !== id);
    setSelectedEditDoctors(newSelectedEdit);
  };
  const deleteFrmDelSel = (id) => {
    let newSelectedDelete = selectedDeleteDoctors.filter(
      (item) => item.id !== id,
    );
    // console.log(newSelectedDelete)
    setSelectedDeleteDoctors(newSelectedDelete);
  };
  // دوال البحث عن اسم طبيب معين في قائمة الأطباء
  const handleSearch = (query) => {
    setSearchTerm(query);
    console.log(query);
    if (!query.trim()) {
      setFilteredDoctors(doctors);
      return;
    }
    const filtered = doctors.filter((doctor) =>
      doctor.name.toLowerCase().includes(query.toLowerCase()),
    );

    setFilteredDoctors(filtered);
  };
  const handleDeleteSearch = (query) => {
    setSearchDelTerm(query);
    console.log(query);
    if (!query.trim()) {
      setFilteredDelDoctors(doctors);
      return;
    }
    const filteredDel = doctors.filter((doctor) =>
      doctor.name.toLowerCase().includes(query.toLowerCase()),
    );

    setFilteredDelDoctors(filteredDel);
  };
  const [permissions, setPermissions] = useState([]);
  // إرسال الصلاحيات إلى السيرفر
  const sendPermissions = async () => {
    const editIds = selectedEditDoctors.map((doctor) => doctor.id);
    const deleteIds = selectedDeleteDoctors.map((doctor) => doctor.id);

    const dataPerm = doctors.map((doctor) => ({
      doctor_id: doctor.id,
      permissions: [
        ...(selectedEditDoctors.some((d) => d.id == doctor.id)
          ? ["edit surgery"]
          : []),
        ...(selectedDeleteDoctors.some((d) => d.id == doctor.id)
          ? ["delete surgery"]
          : []),
      ],
    }));
    // إغلاف الموديل عند النقر على esc

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/api/assign-permissions",
        { doctors: dataPerm },
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      await fetchPermissions();
      if (response.status === 200) {
        setShowModal(true);
      }
    } catch (err) {
      console.log(err);
    }
  };
  // جلب الصلاحيات من السرفر
  const fetchPermissions = async () => {
    try {
      const response = await axios.get(
        "http://127.0.0.1:8000/api/users-with-permissions",
        {
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      console.log("fetch permissions:", response.data);
      setPermissions(response.data);
      const editList = response.data.filter((item) =>
        item.permissions.includes("edit surgery"),
      );
      const deleteList = response.data.filter((item) =>
        item.permissions.includes("delete surgery"),
      );
      setSelectedEditDoctors(editList);
      setSelectedDeleteDoctors(deleteList);

      const hasEdit = editList.length > 0;
      const hasDelete = deleteList.length > 0;
      setEditEnabled(hasEdit);
      setDeleteEnabled(hasDelete);

      if (hasEdit || hasDelete) {
        await fetchDoctors();
      }
    } catch (err) {
      console.log(err);
    }
  };
  // جلب الأطباء من السرفر

  const fetchDoctors = async () => {
    try {
      const response = await axios.get(
        "http://127.0.0.1:8000/api/doctor-list",
        {
          headers: {
            Accept: "application/json",

            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      console.log("full response:", response);
      setDoctors(response.data);
      setFilteredDoctors(response.data);
      setFilteredDelDoctors(response.data);
    } catch (err) {
      console.log(err.response);
    }
  };
  // Load permissions (and doctors if any permission exists) on mount
  useEffect(() => {
    fetchPermissions();
  }, []);
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
      if (showModal) {
        document.addEventListener("keyDown", handleKeyDown);
      }
      return () => {
        document.removeEventListener("keyDown", handleKeyDown);
      };
    };
  }, [showModal]);
  return (
    <motion.div
      className="w-full flex flex-col items-center overflow-x-hidden p-4 md:p-6"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      
        <div className="text-center">
          <h1 className="text-primary font-bold text-[35px]">
            إدارة الصلاحيات
          </h1>
          <p className="text-[#898080] mt-[2px]">
            عدل الصلاحيات بما يتناسب مع احتياجات النظام
          </p>
        </div>
        {/* all */}
        <div className="flex flex-col mt-[30px] gap-[20px] lg:flex-row lg:justify-around w-full">
          {/* right */}
          <div className="relative flex flex-col lg:w-[45%]">
            <div className="flex justify-between items-center p-[10px] w-full lg:gap-[5PX] border-1 border-blue-300 rounded-2xl">
              <FaRegEdit className="text-primary text-[25px]" />
              <div>
                <h3 className="text-primary font-semibold">
                  تعديل عملية جراحية
                </h3>
                <p>السماح ل طبيب محدد أو اكثر تعديل عملية جراحية</p>
              </div>
              <Switch
                checked={editEnabled}
                onChange={setEditEnabled}
                className={`${
                  editEnabled ? "bg-blue-500" : "bg-gray-300"
                } relative inline-flex h-6 w-11 items-center rounded-full transition cursor-pointer`}
              >
                <span
                  className={`${
                    editEnabled ? "translate-x-[-22px]" : "translate-x-0"
                  } inline-block h-4 w-4 transform bg-white rounded-full transition `}
                />
              </Switch>
            </div>
            {/* doctors */}
            {editEnabled && (
              <div className="mt-[20px] flex-col">
                <div className="flex flex-col h-[250px] overflow-y-auto overflow-x-hidden bg-[#eee] w-full">
                  <input
                    type="text"
                    placeholder=" ابحث عن طبيب....."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="border-1 border-black/50 rounded-2xl p-[5px] "
                  />
                  <ul className="">
                    {filteredDoctors.map((doctor) => (
                      <li
                        key={doctor.id}
                        className="cursor-pointer flex min-w-0 break-words gap-[20PX] bg-[#7d7070] text-white rounded-2xl p-[10px] mt-[2px] hover:bg-[#453b3b]"
                        onClick={() => addEditArray(doctor)}
                      >
                        {doctor.name}
                        <span className="border-b-1"> {doctor.department}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {selectedEditDoctors.length > 0 && (
                  <div className="mt-[15px] w-full max-w-full relative overflow-x-hidden">
                    <h4 className="font-bold text-primary text-[20px]">
                      الأطباء المختارين:
                    </h4>
                    <ul className="flex w-full gap-[5px] flex-wrap mt-[10px] overflow-x-hidden">
                      {selectedEditDoctors.map((doctor) => (
                        <li
                          key={doctor.id}
                          className="cursor-pointer flex items-center min-w-0 gap-[5px] text-[12px] p-[3px] bg-[#7d7070] text-white rounded-2xl mt-[2px] hover:bg-[#453b3b]"
                        >
                          {doctor.name}{" "}
                          <span
                            className=" border-b
                  "
                          >
                            {" "}
                            {doctor.department}
                          </span>{" "}
                          <span
                            className=""
                            onClick={() => deleteFrmEdSel(doctor.id)}
                          >
                            {" "}
                            <TiDeleteOutline />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* left */}
          <div className="flex flex-col lg:w-[45%] mt-[100px] lg:mt-[0]">
            <div
              className="flex relative justify-between items-center p-[10px] w-full 
         lg:gap-[5PX] border-1 border-blue-300 rounded-2xl mt-[10px] sm:mt-[0]"
            >
              <MdDeleteForever className="text-primary text-[25px]" />
              <div>
                <h3 className="text-primary font-semibold">حذف عملية جراحية</h3>
                <p>السماح ل طبيب محدد أو اكثر حذف عملية جراحية</p>
              </div>
              <Switch
                checked={deleteEnabled}
                onChange={setDeleteEnabled}
                className={`${
                  deleteEnabled ? "bg-blue-500" : "bg-gray-300"
                } relative inline-flex h-6 w-11  items-center rounded-full transition cursor-pointer`}
              >
                <span
                  className={`${
                    deleteEnabled ? "translate-x-[-22px]" : "translate-x-0"
                  } inline-block h-4 w-4  transform bg-white rounded-full transition`}
                />
              </Switch>
            </div>
            {/* doctors */}
            {deleteEnabled && (
              <div className="mt-[20px] flex-col">
                <div className="flex flex-col h-[250px] overflow-y-auto overflow-x-hidden bg-[#eee] w-full">
                  <input
                    type="text"
                    value={searchDelTerm}
                    onChange={(e) => handleDeleteSearch(e.target.value)}
                    placeholder=" ابحث عن طبيب....."
                    className="border-1 border-black/50 rounded-2xl p-[5px] "
                  />

                  <ul>
                    {filteredDelDoctors.map((doctor) => (
                      <li
                        key={doctor.id}
                        className="cursor-pointer flex min-w-0 break-words gap-[20px] bg-[#7d7070] text-white rounded-2xl p-[10px] mt-[2px] hover:bg-[#453b3b]"
                        onClick={() => addDeleteArray(doctor)}
                      >
                        {doctor.name}{" "}
                        <span className="border-b"> {doctor.department}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {selectedDeleteDoctors.length > 0 && (
                  <div className="mt-[15px] w-full max-w-full relative overflow-x-hidden">
                    <h4 className="font-bold text-primary text-[20px]">
                      الأطباء المختارين:
                    </h4>
                    <ul className="flex w-full gap-[5px]  mt-[10px] flex-wrap overflow-hidden">
                      {selectedDeleteDoctors.map((doctor) => (
                        <li
                          key={doctor.id}
                          className="cursor-pointer flex items-center min-w-0 gap-[5px] text-[12px] p-[3px] bg-[#7d7070] text-white rounded-2xl mt-[2px] hover:bg-[#453b3b]"
                        >
                          {doctor.name}{" "}
                          <span className=" border-b ">
                            {" "}
                            {doctor.department}
                          </span>{" "}
                          <span
                            className=""
                            onClick={() => deleteFrmDelSel(doctor.id)}
                          >
                            {" "}
                            <TiDeleteOutline />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {(editEnabled || deleteEnabled) && (
          <div className="w-full flex justify-center mt-[100px] lg:mt-[35px]">
            <button
              className="font-bold text-white bg-primary border-1 border-primary p-[5px] cursor-pointer hover:bg-[#4aa0f5] hover:text-white rounded-[5px]"
              onClick={() => sendPermissions()}
            >
              {" "}
              حفظ التغيرات
            </button>
          </div>
        )}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-[60]">
            <div className="bg-white p-[30px] rounded-2xl flex flex-col w-[30%]  items-center gap-[20px]">
              <h2 className="text-[25px] font-bold text-primary">
                تم حفظ الصلاحيات ✅
              </h2>

              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-[#d93535] text-white rounded-lg cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}
    </motion.div>
  );
}

export default UsersPermission;

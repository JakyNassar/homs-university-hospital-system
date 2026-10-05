import React, { useEffect, useState } from 'react'
import ShiftsCard from '../components/ShiftsCard/ShiftsCard'
import { MdDateRange, MdRule } from 'react-icons/md'
import { BsStars } from "react-icons/bs";
import { IoIosStarOutline, IoMdClose } from "react-icons/io";
import { Link, Navigate, useNavigate, useOutletContext } from 'react-router';
import { motion } from "framer-motion"
import { FaArrowRightLong } from 'react-icons/fa6';


function AutoSchedule() {

  const rules = [
    { ruleName: " منع مناوبة الأيام المتتالية ", title: "يمنع مناوبة الطبيب يومين متتاليين", translate: "no_consecutive_days" },
    // {"name":"منع تداخل المناوبات ",title:" تجنّب تعيين الطبيب في مناوبات متزامنة أو متداخلة زمنياً  "},
    // {"name":"توزيع عادل بين الأطباء",title:" أن يكون للأطباء نفس عدد المناوبات"},
    { ruleName: "منع المناوبات في نفس اليوم", title: " ألا يكون للطبيب أكثر من مناوبة بنفس اليوم", translate: "no_same_day_shift" },
    // {"name":"السماح باختلاف عدد الأطباء بين الفترات",title:"مثلا: صباحي: عدد الأطباء 5 , مسائي :عدد الأطباء :7"},
    { ruleName: "مناوبات دورية", title: "تعيين الأطباء في مناوبات دورية (مثلا: كل طبيب يعمل مناوبة واحدة في الأسبوع)", translate: "rotation" },
  ]
  const years = [
    { yearName: "السنة الأولى" },
    { yearName: "السنة الثانية" },
    { yearName: "السنة الثالثة" },
    { yearName: "السنة الرابعة" },
    { yearName: "السنة الخامسة" },
  ]



  const [shiftsCount, setShiftsCount] = useState(1)

  // الفترات
  const [shifts, setShifts] = useState([
    {
      doctors: 1,
      start_time: "",
      end_time: "",
      location: ""
    },
  ])
  const [distribute_by_study_year, set_distribute_by_study_year] = useState(false)
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [yearDistribution, setYearDistribution] = useState([0, 0, 0, 0, 0])
  // العدد الإجمالي المطلوب من هذه السنة "يومياً" (موزّع تلقائياً على كل فترات اليوم)
  const [yearDailyQuota, setYearDailyQuota] = useState([0, 0, 0, 0, 0])
  const [rulesChange, setRulesChange] = useState([false, false, false, false])
  const [showModal, setShowModal] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [status, setStatus] = useState("")
  const [errMessage, setErrMessage] = useState("")
  // تخزين عدد الأطباء المتاحين الفعليين من السيرفر لكل سنة (الافتراضي أصفار)
  const [dbDoctorsCount, setDbDoctorsCount] = useState([0, 0, 0, 0, 0]);

  // استرجاع البيانات عند تحميل الصفحة
  useEffect(() => {
    const saved = sessionStorage.getItem('autoScheduleForm');
    if (saved) {
      const s = JSON.parse(saved);
      if (s.fromDate) setFromDate(s.fromDate);
      if (s.toDate) setToDate(s.toDate);
      if (s.shifts) setShifts(s.shifts);
      if (s.shiftsCount) setShiftsCount(s.shiftsCount);
      if (s.rulesChange) setRulesChange(s.rulesChange);
      if (s.distribute_by_study_year !== undefined)
        set_distribute_by_study_year(s.distribute_by_study_year);
      if (s.yearDistribution) setYearDistribution(s.yearDistribution);
      if (s.yearDailyQuota) setYearDailyQuota(s.yearDailyQuota);
    }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return; // ← لا تحفظ إذا لسا ما استرجعنا
    sessionStorage.setItem('autoScheduleForm', JSON.stringify({
      fromDate, toDate, shifts, shiftsCount,
      rulesChange, distribute_by_study_year, yearDistribution, yearDailyQuota
    }));
  }, [fromDate, toDate, shifts, shiftsCount, rulesChange, distribute_by_study_year, yearDistribution, yearDailyQuota, hydrated]);


  //  الخروج باستخدام esc
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setShowModal(false)

      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [showModal])

  // جلب البيانات من السيرفر فور تفعيل خيار "توزيع حسب السنة الدراسية"
  React.useEffect(() => {
    if (distribute_by_study_year) {
      const fetchAvailableDoctors = async () => {
        try {
          const res = await fetch("http://127.0.0.1:8000/api/doctor-in-year-department", {
            method: "GET",
            headers: {
              "Accept": "application/json",
              "Authorization": `Bearer ${localStorage.getItem("token")}`,
            }
          });
          if (res.ok) {
            const data = await res.json();
            console.log("كامل الريسبونس:", JSON.stringify(data));
            const counts = [1, 2, 3, 4, 5].map(year =>
              (data.data[String(year)] || []).length
            );
            setDbDoctorsCount(counts);
          }
        } catch (err) {
          console.error("Error fetching doctors count:", err);
        }
      };

      fetchAvailableDoctors();
    }
  }, [distribute_by_study_year]);
  const handleYearChange = (index, value) => {
    // إذا حاول المستخدم إدخال عدد أكبر من المتاح في قاعدة البيانات لتلك السنة
    if (value > dbDoctorsCount[index]) {
      alert(`عذراً، العدد المتاح في هذه السنة هو ${dbDoctorsCount[index]} أطباء فقط!`);
      value = dbDoctorsCount[index]; // إجبار الحقل على الوقوف عند الحد الأقصى المتاح
    }

    setYearDistribution(prev => {
      const next = [...prev]
      next[index] = value
      return next
    })

    // إذا صار العدد الإجمالي أقل من العدد اليومي المطلوب لنفس السنة، نخفّض اليومي معه
    setYearDailyQuota(prev => {
      if (prev[index] > value) {
        const next = [...prev]
        next[index] = value
        return next
      }
      return prev
    })
  }

  const handleYearDailyChange = (index, value) => {
    // لا يمكن أن يتجاوز اليومي إجمالي عدد الأطباء المخصصين لهذه السنة
    if (value > yearDistribution[index]) {
      alert(`عذراً، لا يمكن أن يتجاوز العدد اليومي إجمالي الأطباء المخصصين لهذه السنة (${yearDistribution[index]})!`);
      value = yearDistribution[index];
    }
    if (value > dbDoctorsCount[index]) {
      value = dbDoctorsCount[index];
    }

    setYearDailyQuota(prev => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }
  const handleRulesChange = (index, value) => {
    setRulesChange(prev => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }
  const totalDoctors = yearDistribution.reduce((acc, curr) => acc + Number(curr))
  // إجمالي عدد الأطباء المطلوبين يومياً حسب السنوات (كل الفترات)
  const totalDailyYearQuota = yearDailyQuota.reduce((acc, curr) => acc + Number(curr), 0)
  // إجمالي السعة اليومية المتاحة من كل الفترات مجتمعة
  const totalDailyCapacity = shifts.reduce((acc, shift) => acc + Number(shift.doctors || 0), 0)
  const dailyQuotaExceedsCapacity = distribute_by_study_year && totalDailyYearQuota > totalDailyCapacity
  const isFormValid = fromDate && toDate && shifts.every(shift => shift.start_time && shift.end_time && shift.doctors) && !dailyQuotaExceedsCapacity
  const { setScheduleData, scheduleData } = useOutletContext();
  const { setRawSchedule, rawSchedule } = useOutletContext();
  const navigate = useNavigate();
  // request body
  const buildPayload = () => {
    return {

      constraints: rules.filter((_, index) => rulesChange[index]).map(rule => rule.translate),

      config: {
        from_date: fromDate,
        to_date: toDate,
        periods_per_day: shiftsCount,
        periods: shifts.map((shift, index) => ({
          period: index + 1,
          doctors: shift.doctors,
          start_time: shift.start_time + ":00",
          end_time: shift.end_time + ":00",


        })),
        distribute_by_study_year: distribute_by_study_year,
        study_year_quotas: yearDistribution,
        // العدد الإجمالي المطلوب من كل سنة "يومياً"، يتم توزيعه تلقائياً على فترات اليوم
        year_daily_quotas: yearDailyQuota,
      },


    }

  }

  // إرسال البيانات إلى السيرفر
  // const [loading,setLoading]=useState(false)
  const generateSchedule = async () => {
    const payLoad = buildPayload()
    try {
      setShowModal(true)
      setStatus("loading")
      // console.log(payLoad.constraints)

      const res = await fetch("http://127.0.0.1:8000/api/schedule/generate", {
        method: "post",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,


        },
        body: JSON.stringify(payLoad)

      })
      const result = await res.json()
      // console.log(res)
      // console.log(result)
      if (res.ok) {
        setScheduleData(result.schedule)
        setRawSchedule(result.raw)
        setStatus("success")
        if (result.warnings?.length > 0) {
          setErrMessage(result.warnings.join('|'));
        }

      } else {
        setStatus("error")
        if (result.errors) {
          const firstError = Object.values(result.errors)[0][0];
          setErrMessage(firstError);
        } else {
          setErrMessage(result.message || "حدث خطأ غير معروف");
        }
      }

    }

    catch (err) {
      setStatus("error");
      setErrMessage("تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.");
    }

  }
  const sendSchedule = async () => {



    try {

      const res = await fetch("http://127.0.0.1:8000/api/schedule/save", {
        method: "post",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,

        },
        body: JSON.stringify({ schedule: rawSchedule || [] })
      })
      if (res.ok) {

        console.log("Schedule saved successfully");
        navigate('/adminUserDash/view');
        sessionStorage.removeItem('autoScheduleForm');

      } else {
        const result = await res.json();
        alert(result.message || "فشل حفظ الجدول");
      }


    } catch (err) {
      alert("تعذّر الاتصال بالخادم أثناء الحفظ.");
    }
  }

  const getDaysCount = (start, end) => {
    const startDate = new Date(start)
    const endDate = new Date(end)

    const diffTime = endDate - startDate
    const diffDays = diffTime / Math.ceil((1000 * 60 * 60 * 24))

    return diffDays + 1 // لأن التاريخ شامل
  }
  const totalDays = getDaysCount(fromDate, toDate)

  return (
    <motion.div
      className=" w-full z-40   flex  md:gap-[80px] "
      initial={{ opacity: 0, x: 50 }} // الحالة الابتدائية: مخفي وإزاحة لليمين
      animate={{ opacity: 1, x: 0 }}   // الحالة النهائية: ظاهر ومقره الأصلي
      transition={{ duration: 1, ease: "easeOut" }} // وقت الحركة ونوعها
    >

      <div className='w-[95%] flex flex-col mr-[10px] md:mr-[5%] lg:mr-[10px]'>
        <div>
          <h1 className=' sm:mt-[100px] text-primary font-bold text-[30px] text-center shadow-lg shadow-blue-200 hover:shadow-md mb-[30px]'>الجدولة التلقائية</h1>
        </div>
        <div className='flex flex-col justify-center'>
          <ShiftsCard totalDoctors={totalDoctors} totalShifts={shiftsCount} totalDays={totalDays} />
          <div className='flex flex-col lg:flex-row lg:mr-[5%] lg:w-[98%] xl:mr-[1%] mt-[40px] md:gap-[20px] '>
            <div className=' w-[95%] lg:w-[60%]  '>
              <div className='  text-[20px] bg-white p-[25px] rounded-2xl '>
                <div className='flex items-center gap-[10px] text-primary'>
                  <MdRule />
                  <h2 className='font-bold '>تكوين قواعد الجدولة</h2>

                </div>
                <div className='list-none flex flex-col md:flex-row md:flex-wrap   mt-[30px] gap-[10px]  '>
                  {rules?.map((rule, index) => {
                    return (
                      <div key={index} className=' w-[90%] md:w-[40%]  text-[15px] shadow-lg shadow-blue-200 hover:shadow-md  '>
                        <li className='flex gap-[10PX] p-[20px]  border-2 border-gray-100 rounded-[10px] md:text-[20px]  '>
                          <input id={`rule-${index}`} type="checkbox"
                            className=" border-2  border-blue-500 accent-blue-500"
                            checked={rulesChange[index]}
                            onChange={(e) => handleRulesChange(index, e.target.checked)}
                          />
                          <label htmlFor={`rule-${index}`} title={rule.title} style={{ cursor: "pointer" }}> {rule.ruleName}</label>
                        </li>
                      </div>



                    )
                  })}
                  {/* {console.log(rulesChange)} */}
                  <div className=' text-[15px] '>


                  </div>
                  <div>
                    {/* <input type="range" name="" id="" /> */}
                  </div>
                </div>

                <div className='mt-[15px] border-2 border-gray-100 rounded-[10px] p-[20px] shadow-lg shadow-blue-200 hover:shadow-md'>
                  <div className='flex items-center gap-[10px]'>
                    <input id='study' type="checkbox"
                      className=" border-2  border-blue-500 accent-blue-500"
                      checked={distribute_by_study_year}
                      onChange={(e) => set_distribute_by_study_year(e.target.checked)} />
                    <label htmlFor='study' className='cursor-pointer md:text-[20px]' > توزيع حسب السنة الدراسية</label>
                  </div>
                </div>

                {distribute_by_study_year && (
                  <div className='mt-[25px]'>
                    <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[15px]'>
                      {years?.map((year, index) => (
                        <div key={index} className='flex flex-col bg-slate-50 border border-slate-200 p-[15px] rounded-2xl shadow-sm gap-[10px]'>
                          <div className='text-right'>
                            <span className='font-semibold text-gray-800 block'>{year.yearName}</span>
                            {/* إظهار العدد المتاح الفعلي القادم من السيرفر */}
                            <span className='text-[12px] text-gray-400'>(المتاح بالنظام: {dbDoctorsCount[index]} أطباء)</span>
                          </div>
                          <div className='grid grid-cols-2 gap-[10px]'>
                            <label className='flex flex-col items-center text-[12px] text-gray-500 bg-white rounded-lg px-[8px] py-[8px] border border-slate-200'>
                              <span className='min-h-[32px] flex items-center justify-center text-center'>عدد الأطباء الموزّعين</span>
                              <input
                                type="number"
                                min="0"
                                max={dbDoctorsCount[index]} // يمنع تخطي الحد الأقصى عبر الأسهم أيضاً
                                className='border-2 border-primary w-full rounded-[10px] p-[6px] text-center mt-[5px]'
                                value={yearDistribution[index]}
                                onChange={(e) => handleYearChange(index, Number(e.target.value))}
                              />
                            </label>
                            <label
                              className='flex flex-col items-center text-[12px] text-gray-500 bg-white rounded-lg px-[8px] py-[8px] border border-slate-200'
                              title='عدد الأطباء المطلوب تواجدهم من هذه السنة كل يوم، سيتم توزيعه تلقائياً على فترات ذلك اليوم'
                            >
                              <span className='min-h-[32px] flex items-center justify-center text-center'>المطلوب يومياً (كل الفترات)</span>
                              <input
                                type="number"
                                min="0"
                                max={Math.min(yearDistribution[index], dbDoctorsCount[index])}
                                disabled={!yearDistribution[index]}
                                className='border-2 border-primary w-full rounded-[10px] p-[6px] text-center mt-[5px] disabled:opacity-40 disabled:cursor-not-allowed'
                                value={yearDailyQuota[index]}
                                onChange={(e) => handleYearDailyChange(index, Number(e.target.value))}
                              />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className='px-[5px] mt-[15px]'>
                      <p className={`text-[13px] font-semibold ${dailyQuotaExceedsCapacity ? 'text-red-500' : 'text-gray-500'}`}>
                        إجمالي المطلوب يومياً حسب السنوات: {totalDailyYearQuota} / السعة اليومية المتاحة (كل الفترات): {totalDailyCapacity}
                      </p>
                      {dailyQuotaExceedsCapacity && (
                        <p className='text-[12px] text-red-500'>
                          مجموع الأطباء المطلوبين يومياً حسب السنوات أكبر من عدد الأطباء الذي حددته بالفترات. يرجى تخفيض الأعداد أو زيادة عدد الأطباء بالفترات.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className='flex flex-col mt-[50px]'>
                  <div className='flex justify-between text-[15px] '>
                    <label className='font-semibold md:text-[20px]' title="حدد عدد الفترات المسموح بها لكل يوم (1-5)." style={{ cursor: "pointer" }}> عدد الفترات في اليوم الواحد
                    </label>
                    <span className='  p-[5px] rounded-[15px] text-primary bg-[#8fb9e3] font-semibold'><span className='text-white text-[23px]'> {shiftsCount}</span>  /   5 </span>

                  </div>
                  <input type="range" min="1" max="5" value={shiftsCount} onChange={(e) => {
                    const value = Number(e.target.value)
                    setShiftsCount(value)
                    // console.log(shiftsCount)

                    setShifts((prev) => {
                      let newShifts = [...prev];

                      if (value > newShifts.length) {
                        // إضافة فترات
                        for (let i = newShifts.length; i < value; i++) {
                          newShifts.push({ doctors: 1, start_time: "", end_time: "" });

                        }
                      } else {
                        // حذف فترات
                        newShifts = newShifts.slice(0, value);
                      }
                      return newShifts
                    })


                  }} />
                  {/* <ul className='grid grid-cols-1 md:grid-cols-2 gap-4 mt-[20px]'>
                          {list?.map((item,index)=>(
                            <li key={index} className='bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-sm text-right text-[15px] font-medium text-slate-700 transition hover:shadow-md'>
                              <span className='block'>{item.name}</span>
                            </li>
                          ))}
                        </ul> */}
                  <div className='grid gap-4 mt-[30px]'>
                    {shifts?.map((shift, index) => (
                      <div key={index} className='bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-lg shadow-blue-200 hover:shadow-md'>
                        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4'>
                          <div className='text-right'>
                            <p className='font-semibold text-primary'>الفترة {index + 1}</p>
                            <p className='text-sm text-slate-500'>اختر بيانات الفترة قبل إنشاء الجدول</p>
                          </div>
                        </div>
                        <div className='grid grid-cols-1 lg:grid-cols-3 gap-3'>
                          <label className='flex flex-col text-right text-sm text-slate-700'>
                            <span className='mb-2 font-medium'>عدد الأطباء</span>
                            <input type="number"
                              value={shift.doctors}
                              min="1"
                              className='border border-slate-300 rounded-2xl px-3 py-2 text-right'
                              onChange={(e) => {
                                const value = Number(e.target.value)
                                setShifts((prev) => {
                                  const updated = [...prev];
                                  updated[index] = { ...updated[index], doctors: value };
                                  return updated;
                                });
                              }}
                            />
                          </label>
                          <label className='flex flex-col text-right text-sm text-slate-700'>
                            <span className='mb-2 font-medium'>وقت البدء</span>
                            <input type="time"
                              value="09:00"
                              className='border border-slate-300 rounded-2xl px-3 py-2'
                              onChange={(e) => {
                                const value = e.target.value
                                setShifts((prev) => {
                                  const updated = [...prev]
                                  updated[index] = { ...updated[index], start_time: value }
                                  return updated
                                })
                              }}
                            />
                          </label>
                          <label className='flex flex-col text-right text-sm text-slate-700'>
                            <span className='mb-2 font-medium'>وقت الانتهاء</span>
                            <input type="time"
                              value="09:00"
                              className='border border-slate-300 rounded-2xl px-3 py-2'
                              onChange={(e) => {
                                const value = e.target.value
                                setShifts((prev) => {
                                  const updated = [...prev]
                                  updated[index] = { ...updated[index], end_time: value }
                                  return updated
                                })
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>



                </div>

              </div>
            </div>
            <div className='flex flex-col w-[95%] lg:w-[40%]'>
              <div className=' bg-white flex flex-col  p-[25px] rounded-2xl '>
                <div className='flex gap-[10px] items-center justify-center font-bold text-[20px] mb-[20px] text-primary '>
                  <MdDateRange />
                  <label title="اختر فترة لتطبيق الجدولة: حدد تاريخ البداية والنهاية (التواريخ شاملة). ستُطبق الخوارزمية فقط داخل هذا النطاق." style={{ cursor: "pointer" }}>نطاق التاريخ</label>

                </div>
                <div>
                  <div className='flex flex-col    '>
                    <label htmlFor="" className='text-[gray] font-bold text-[20px] mb-[10px] '>من تاريخ</label>
                    <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className=' bg-[#eee] rounded-[20px] p-[12px] my-[10px] mx-[auto] md:my-0 md:mx-0 md:flex md:justify-end shadow-lg shadow-gray-400 hover:shadow-md ' />
                  </div>
                  <div className='flex flex-col '>
                    <label htmlFor="" className='text-[gray] font-bold text-[20px] mb-[10px] ' >إلى تاريخ</label>
                    <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className=' bg-[#eee] rounded-[20px] p-[12px] my-[10px] mx-[auto] md:my-0 md:mx-0  md:flex md:justify-end shadow-lg shadow-gray-400  hover:shadow-md ' />
                  </div>
                  {/* {console.log(fromDate, toDate)} */}
                </div>
              </div>
              <div className='  bg-primary rounded-2xl p-[30px] flex flex-col text-[20px] text-white gap-[30PX] items-center'>
                <BsStars className='text-[40px]' />
                <h2 className='text-[20px]'>خوارزمية الجدولة جاهزة</h2>
                <button disabled={!isFormValid}
                  onClick={generateSchedule}
                  className={`bg-white  p-[10px] font-bold rounded-[10px] ${isFormValid ? 'cursor-pointer  text-primary hover:bg-blue-400  hover:text-white' : 'cursor-not-allowed opacity-50 text-primary'}`} >بدء الجدولة التلقائية</button>
                {!isFormValid && (
                  <div className='text-sm text-red-400 flex flex-col gap-1 items-center'>
                    {(!fromDate || !toDate) && <p>يرجى تحديد نطاق التاريخ</p>}
                    {!shifts.every(s => s.start_time && s.end_time) &&
                      <p> يرجى تحديد أوقات جميع الفترات</p>}
                    {dailyQuotaExceedsCapacity &&
                      <p>عدد الأطباء المطلوب يومياً حسب السنوات يتجاوز السعة اليومية المتاحة</p>}
                  </div>
                )}

              </div>
              <div className="text-gray-600 text-s cursor-pointer w-[60%] mt-[3%] mr-[25%]
                   font-semibold flex items-center gap-2  duration-200 border-b border-transparent hover:border-primary hover:text-primary pb-1">
                <FaArrowRightLong />
                <Link to="/adminUserDash/view">الرجوع إلى الجدولة اليدوية</Link>

              </div>
            </div>
          </div>
        </div>
        {showModal && (
          <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-[60]">
            <div className='bg-white relative p-[30px] rounded-2xl flex flex-col items-center gap-[20px]'>
              {status === "loading" ? (
                <div className='flex '>
                  <h2 className='text-[20px] font-bold text-primary'>  جار إنشاء الجدولة...    </h2>
                  <div className='w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin'></div>

                </div>

              ) : status === "success" ? (
                <div>
                  <h2 className='text-[20px] font-bold text-primary'> تم إنشاء الجدول بنجاح ✅  </h2>
                  <div className='flex gap-[10px] justify-center mt-[20px]'>
                    <button className='text-[red] border-1 border-[#eee] p-[10px] cursor-pointer' onClick={sendSchedule} >عرض</button>
                    <button className=' border-1 border-[#eee] p-[10px] cursor-pointer' onClick={() => setShowModal(false)}>إلغاء</button>

                  </div>

                </div>
              ) : status === "error" && errMessage && (

                <div >

                  <IoMdClose
                    className='absolute top-[3px] right-[5PX]  cursor-pointer'
                    onClick={() => setShowModal(false)} />
                  <p className='text-[red]'>حدث خطأ أثناء إنشاء الجدول</p>
                  <p> {errMessage}</p>

                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default AutoSchedule

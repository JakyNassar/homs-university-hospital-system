import { useState } from "react"


function PermissionForm() {
   const permission={
    shifts:{
      view:false,
      create:false,
      update:false,
      delete:false,
    },
    surgeries:{
      view:false,
      create:false,
      update:false,
      delete:false,
    }
   }
   const moduleName={
    "shifts":"المناوبات",
    "surgeries":"العمليات الجراحية"
   }
   const actionsTran={
    "view":"عرض",
    "create":"إنشاء",
    "update":"تعديل",
    "delete":"حذف"
   }
   const [permissions,setPermissions]=useState(permission)
  const handleChange = (module, action) => {
  setPermissions(prev => ({
    ...prev,
    [module]: {
      ...prev[module],
      [action]: !prev[module][action]
    }
  }));
};
 
  return (
  //   <div className="w-full flex flex-col items-center ">
  //     <table className=" w-[80%]  border-r-2-primary  rounded-lg overflow-hidden text-right">
  //       <thead className="bg-primary ">
        
  //       </thead>
  //       <tbody className="bg-white ">
          
  //     {
  //       Object.entries(permissions).map(([module,actions])=>(
  //         <tr key={module}>
  //         <td key={module}  className="py-4 px-4  border-2 border-primary md:font-bold">{moduleName[module]}</td>
  //         {Object.entries(actions).map(([action,value])=>(
  //           <td  className="py-4 px-4   md:font-bold border-2 border-primary"> <input type="checkbox" name={action} id="" checked={value} onChange={()=>handleChange(module,action)} />{actionsTran[action]}</td>
  //         ))}
          
  //         </tr>
  //       ))
  //     }
      
    
  //  </tbody>
  //  </table>
  //  <div className=" flex flex-col gap-5 mt-[40px] md:flex-row ">
  //   <button className="bg-primary text-white py-[10px] px-[30px] cursor-pointer rounded-[5px] "> حفظ التغييرات</button>
  //   <button className="bg-[#eee] py-[10px] px-[30px] cursor-pointer rounded-[5px]"> إلغاء</button>
  //  </div>
  //   </div>
  <div>
    
  </div>
  )
}

export default PermissionForm


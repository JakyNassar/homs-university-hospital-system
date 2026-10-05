import { Outlet } from "react-router"
import Header from "../components/Header/Header"


function Root() {
  return (
    <div className="bg-gray-50 min-h-screen overflow-hidden">
        
        <Header/>
      <Outlet/>
    </div>
  )
}

export default Root

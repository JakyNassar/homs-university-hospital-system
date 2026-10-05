import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { createBrowserRouter, RouterProvider } from "react-router";
import Auth from "./pages/Auth.jsx";
import LogIn from "./pages/LogIn.jsx";
import Root from "./pages/Root.jsx";
import AdminDash from "./pages/AdminDash.jsx";
import ViewAllShifts from "./pages/ViewAllShifts.jsx";

import CrudUsers from "./pages/CrudUsers.jsx";
import UsersPermission from "./pages/UsersPermission.jsx";

import AdminUserDash from "./pages/AdminUserDash.jsx";
import DoctorShifts from "./pages/DoctorShifts.jsx";
import AutoSchedule from "./pages/AutoSchedule.jsx";
import Dashboard from "./pages/Dashboard.jsx";

import DoctorDash from "./pages/DoctorDash.jsx";

import Operations from "./pages/Operations.jsx";
import BackUp from "./pages/BackUp.jsx";
const routs = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      {
        path: "",
        element: <Auth />,
        children: [
          {
            path: "",
            element: <LogIn />,
          },
        ],
      },
      {
        path: "adminDash",
        element: <AdminDash />,
        children: [
          {
            path: "dashboard",
            element: <Dashboard />,
          },
          {
            path: "users",
            element: <CrudUsers />,
          },
          {
            path: "permission",
            element: <UsersPermission />,
          },
          {
            path: "shifts",
            element: <ViewAllShifts />,
          },
          {
            path: "operations",
            element: <Operations />,
          },
          {
            path: "copy",
            element: <BackUp />,
          },
        ],
      },
      {
        path: "adminUserDash",
        element: <AdminUserDash />,
        children: [
          {
            path: "shifts",
            element: <ViewAllShifts />,
          },
          {
            path: "view",
            element: <DoctorShifts />,
          },
          {
            path: "autoSchedule",
            element: <AutoSchedule />,
          },
          {
            path: "operations",
            element: <Operations />,
          },
          
        ],
      },
      {
        path: "doctorDash",
        element: <DoctorDash />,
        children: [
          {
            path: "shifts",
            element: <ViewAllShifts />,
          },
          {
            path: "operations",
            element: <Operations />,
          },
        
        ],
      },
    ],
  },
]);
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={routs}></RouterProvider>
  </StrictMode>,
);

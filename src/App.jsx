import React, { useEffect } from "react";
import { HashRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import Login from "./pages/Login.jsx";
import EmployeeDashboard from "./pages/EmployeeDashboard.jsx";
import AdminDashboard from "./pages/Admindashboard.jsx";
import FaceCapture from "./pages/FaceCapture.jsx";
import EmployeeTracking from "./pages/EmployeeTracking.jsx";
import AddEmployee from "./component/AddEmployee.jsx";
import EditViewEmployee from "./component/EditViewEmployee.jsx";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="mx-0 scroll-smooth my-0 w-full">
        <Toaster position="top-right" />
        <div className="overflow-x-hidden">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/employee-dashboard" element={<EmployeeDashboard />} />
            <Route path="/add-employee" element={<AddEmployee />} />
            <Route path="/edit-employee/:id" element={<EditViewEmployee />} />
            <Route path="/view-employee/:id" element={<EditViewEmployee />} />
            <Route path="/face-capture/:id" element={<FaceCapture />} />
            <Route path="/employee-tracking/:id/:employeeId" element={<EmployeeTracking />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;

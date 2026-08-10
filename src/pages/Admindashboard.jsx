import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  ChevronRight,
  Calendar,
  FileSpreadsheet,
  TrendingUp,
  BarChart2,
  ArrowRight,
  Search,
  Plus,
  Edit3,
  CheckCircle2,
  Clock,
  AlertCircle,
  Upload,
  Eye,
  Camera,
  User,
  X,
  ScanFace,
  Trash2,
  Edit
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Sidebar from '../layouts/Sidebar';
import Navbar from '../layouts/Navbar';
import AxiosInstance from '../utilities/AxiosInstance';
import EmployeeList from '../component/EmployeeList';
import Attendance from '../component/Attendance';

const calculateAge = (dobString) => {
  if (!dobString) return '';
  const dobDate = new Date(dobString);
  if (isNaN(dobDate.getTime())) return '';
  const diff = Date.now() - dobDate.getTime();
  const calculatedAge = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  return calculatedAge >= 0 ? `${calculatedAge} years` : '';
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('adminActiveTab') || 'Employees';
  });

  useEffect(() => {
    localStorage.setItem('adminActiveTab', activeTab);
  }, [activeTab]);


  // Admin Page stats
  const stats = [
    { label: 'Page Views', val: '1,493', change: '+12.4%', theme: 'text-lime-600 bg-lime-50 border-lime-200' },
    { label: 'Enquiries Sent', val: '28', change: '+3.1%', theme: 'text-violet-650 bg-violet-50 border-violet-200' },
    { label: 'Open Job Applications', val: '5', change: 'New', theme: 'text-cyan-650 bg-cyan-50 border-cyan-200' }
  ];

  // Employee Directory state
  const [employees, setEmployees] = useState([]);

  // Attendance Log state
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]); // Default to today: YYYY-MM-DD
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState('All');
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);
  const [attendanceFormData, setAttendanceFormData] = useState({
    employee_ID: '',
    date: new Date().toISOString().split('T')[0],
    checkInTime: '09:00',
    checkOutTime: '17:00',
    status: 'Present'
  });

  // Leaves management state
  const [leaves, setLeaves] = useState([]);
  const [isApplyingLeave, setIsApplyingLeave] = useState(false);
  const [adminLeaveFormData, setAdminLeaveFormData] = useState({
    employeeId: '',
    type: 'Paid Annual Leave',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const fetchAllLeaves = async () => {
    try {
      const res = await AxiosInstance.get('/leaves');
      setLeaves(res.data || []);
    } catch (err) {
      console.error("Error fetching leaves:", err);
    }
  };

  useEffect(() => {
    if (activeTab === 'Leaves') {
      fetchAllLeaves();
    }
  }, [activeTab]);

  const handleUpdateLeaveStatus = async (id, status) => {
    try {
      const res = await AxiosInstance.put(`/leaves/${id}`, { status });
      setLeaves(prev => prev.map(l => l._id === id ? res.data : l));
      toast.success(`Leave request status updated to ${status}`);
    } catch (err) {
      toast.error("Failed to update leave status.");
    }
  };

  const handleAdminApplyLeave = async (e) => {
    e.preventDefault();
    if (!adminLeaveFormData.employeeId) {
      toast.error("Please select an employee.");
      return;
    }
    if (!adminLeaveFormData.startDate) {
      toast.error("Please select a start date.");
      return;
    }
    try {
      const res = await AxiosInstance.post('/leaves', {
        employeeId: adminLeaveFormData.employeeId,
        type: adminLeaveFormData.type,
        startDate: adminLeaveFormData.startDate,
        endDate: adminLeaveFormData.endDate || adminLeaveFormData.startDate,
        reason: adminLeaveFormData.reason
      });
      setLeaves([res.data, ...leaves]);
      toast.success("Leave applied successfully!");
      setIsApplyingLeave(false);
      setAdminLeaveFormData({ employeeId: '', type: 'Paid Annual Leave', startDate: '', endDate: '', reason: '' });
    } catch (err) {
      toast.error("Failed to apply leave.");
    }
  };

  // Forms / Sub-views inside Employees
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All'); // 'All' | 'Physiotherapists' | 'Admin' | 'New Joinees'

  // Delete Modal state
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, employee: null, confirmId: '' });
  const [isDeleting, setIsDeleting] = useState(false);

  const executeDelete = async () => {
    if (deleteModal.confirmId !== deleteModal.employee.id) {
      toast.error('Employee ID does not match. Deletion cancelled.');
      return;
    }
    try {
      setIsDeleting(true);
      // Ensure we use the MongoDB _id for the backend call if available
      await AxiosInstance.delete(`/employees/${deleteModal.employee._id}`);
      setEmployees(prev => prev.filter(emp => emp.id !== deleteModal.employee.id));
      toast.success(`Successfully deleted employee: ${deleteModal.employee.name}`);
      setDeleteModal({ isOpen: false, employee: null, confirmId: '' });
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete employee.');
    } finally {
      setIsDeleting(false);
    }
  };

  // New Employee fields (Add Employee.png layout)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    gender: 'Male',
    dob: '12-Jul-2000',
    emergencyContact: '',
    emergencyNumber: '',
    salary: '',
    joiningDate: '13-Jul-2026',
    status: 'Active',
    street: '',
    city: '',
    state: '',
    zip: '',
    employeeType: 'Onboarding',
    probationEndDate: '',
    noticePeriodEndDate: ''
  });

  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handlePhotoFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    handlePhotoFile(e.dataTransfer.files[0]);
  };

  useEffect(() => {

    // Load dynamic updates from backend database
    AxiosInstance.get('/employees')
      .then(res => {
        if (res.data && res.data.length > 0) {
          const formatted = res.data.map(emp => {
            const dateFormatted = emp.dateOfJoining
              ? new Date(emp.dateOfJoining).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')
              : '';
            return {
              _id: emp._id,
              id: emp.employeeId || emp._id,
              name: `${emp.firstName} ${emp.lastName}`.trim(),
              designation: emp.designation,
              department: 'Clinical',
              dateOfJoining: dateFormatted,
              status: emp.status === 'Active' ? 'Active' : 'Deactivated',
              avatar: emp.profilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
              email: emp.email,
              phone: emp.personalPhoneNumber || emp.workPhoneNumber || '',
              employeeType: emp.employeeType || 'Onboarding'
            };
          });

          setEmployees(formatted);
          localStorage.setItem('employees', JSON.stringify(formatted));
        }
      })
      .catch(err => {
        console.warn('Backend server unavailable, running in local database fallback:', err.message);
      });
  }, []);

  const calculateHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut || checkIn === 'N/A' || checkOut === 'N/A') return 'N/A';
    const parseTime = (timeStr) => {
      const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)?$/i);
      if (!match) {
        const parts = timeStr.split(':').map(Number);
        return parts[0] * 60 + (parts[1] || 0);
      }
      let [_, hrs, mins, meridiem] = match;
      hrs = Number(hrs);
      mins = Number(mins);
      if (meridiem) {
        if (meridiem.toUpperCase() === 'PM' && hrs !== 12) hrs += 12;
        if (meridiem.toUpperCase() === 'AM' && hrs === 12) hrs = 0;
      }
      return hrs * 60 + mins;
    };
    try {
      const startMins = parseTime(checkIn);
      const endMins = parseTime(checkOut);
      let diff = endMins - startMins;
      if (diff < 0) diff += 24 * 60;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      return `${h}h ${m}m`;
    } catch (e) {
      return 'N/A';
    }
  };

  useEffect(() => {
    if (activeTab === 'Attendance Logs') {
      AxiosInstance.get(`/attendance/find-date/${attendanceDate}`)
        .then(res => {
          if (res.data) {
            const formatted = res.data.map(log => {
              // Find matching employee to get their designation/avatar
              const emp = employees.find(e => e.id === log.employee_ID || e._id === log.employee_ID);
              return {
                id: log.employee_ID,
                name: log.name || (emp ? emp.name : log.employee_ID),
                designation: emp ? emp.designation : 'Staff',
                date: log.date
                  ? new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')
                  : '',
                checkIn: log.checkInTime || 'N/A',
                checkOut: log.checkOutTime || 'N/A',
                hours: log.checkInTime && log.checkOutTime ? calculateHours(log.checkInTime, log.checkOutTime) : 'N/A',
                status: log.status || 'Present',
                avatar: emp ? emp.avatar : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
              };
            });
            setAttendanceLogs(formatted);
          }
        })
        .catch(err => {
          console.warn('Attendance logs not found or empty for this date:', err.message);
          setAttendanceLogs([]);
        });
    }
  }, [activeTab, attendanceDate, employees]);

  const handleLogout = () => {
    toast.info('Logged out successfully.');
    navigate('/');
  };

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    if (!attendanceFormData.employee_ID) {
      toast.error('Please select an employee');
      return;
    }
    setIsSubmittingAttendance(true);
    try {
      const selectedEmp = employees.find(emp => emp.id === attendanceFormData.employee_ID || emp._id === attendanceFormData.employee_ID);
      const name = selectedEmp ? selectedEmp.name : 'Unknown';

      // 1. Mark Check-In / Create Attendance record
      await AxiosInstance.post('/multi-attendance/mark', {
        employee_ID: attendanceFormData.employee_ID,
        name: name,
        date: attendanceFormData.date,
        time: attendanceFormData.checkInTime,
        status: attendanceFormData.status
      });

      // 2. If status is Present/Late and checkOutTime is provided, record Check-Out
      if (
        (attendanceFormData.status === 'Present' || attendanceFormData.status === 'Late') &&
        attendanceFormData.checkOutTime
      ) {
        await AxiosInstance.patch('/attendance/check-out', {
          employee_ID: attendanceFormData.employee_ID,
          date: attendanceFormData.date,
          checkOutTime: attendanceFormData.checkOutTime
        });
      }

      toast.success('Attendance recorded successfully!');
      setIsMarkingAttendance(false);
      
      // Refresh logs for current active attendanceDate
      if (activeTab === 'Attendance Logs') {
        const res = await AxiosInstance.get(`/attendance/find-date/${attendanceDate}`);
        if (res.data) {
          const formatted = res.data.map(log => {
            const emp = employees.find(e => e.id === log.employee_ID || e._id === log.employee_ID);
            return {
              id: log.employee_ID,
              name: log.name || (emp ? emp.name : log.employee_ID),
              designation: emp ? emp.designation : 'Staff',
              date: log.date
                ? new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')
                : '',
              checkIn: log.checkInTime || 'N/A',
              checkOut: log.checkOutTime || 'N/A',
              hours: log.checkInTime && log.checkOutTime ? calculateHours(log.checkInTime, log.checkOutTime) : 'N/A',
              status: log.status || 'Present',
              avatar: emp ? emp.avatar : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
            };
          });
          setAttendanceLogs(formatted);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to record attendance');
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.mobile) {
      toast.error('Please fill in all required fields marked with *');
      return;
    }

    const nextNum = employees.length + 1;
    const newId = `EID-${String(nextNum).padStart(3, '0')}`;

    const dateFormatted = formData.joiningDate
      ? new Date(formData.joiningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')
      : '';

    const newRecord = {
      id: newId,
      name: formData.fullName,
      designation: 'Physiotherapist',
      department: 'Clinical',
      dateOfJoining: dateFormatted,
      status: formData.status === 'Active' ? 'Active' : 'Deactivated',
      avatar: photoPreview || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      email: formData.email,
      phone: formData.mobile,
      employeeType: formData.employeeType || 'Onboarding'
    };

    const nameParts = formData.fullName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const employeeData = {
      firstName,
      lastName,
      email: formData.email,
      personalPhoneNumber: formData.mobile,
      dob: formData.dob,
      gender: formData.gender,
      employeeId: newId,
      designation: 'Physiotherapist',
      dateOfJoining: formData.joiningDate,
      salary: parseFloat(formData.salary) || 0,
      employeeType: formData.employeeType || 'Onboarding',
      probationEndDate: formData.probationEndDate,
      noticePeriodEndDate: formData.noticePeriodEndDate,
      status: formData.status,
      emergencyContact: formData.emergencyContact,
      emergencyNumber: formData.emergencyNumber,
      presentAddress: formData.street,
      city: formData.city,
      state: formData.state,
      zip: formData.zip,
      profilePhoto: photoPreview,
    };

    try {
      await AxiosInstance.post('/employees', employeeData);

      const updatedEmployees = [...employees, newRecord];
      setEmployees(updatedEmployees);
      localStorage.setItem('employees', JSON.stringify(updatedEmployees));

      toast.success(`Successfully saved employee profile: ${formData.fullName}`);
      setIsAddingEmployee(false);
      setPhotoPreview(null);

      setFormData({
        fullName: '',
        email: '',
        mobile: '',
        gender: 'Male',
        dob: '',
        emergencyContact: '',
        emergencyNumber: '',
        salary: '',
        joiningDate: '2026-07-30',
        status: 'Active',
        street: '',
        city: '',
        state: '',
        zip: '',
        employeeType: 'Onboarding',
        probationEndDate: '',
        noticePeriodEndDate: ''
      });
    } catch (err) {
      console.error('Backend save failed:', err);
      toast.error(err.response?.data?.error || 'Failed to save employee profile. Please try again.');
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.designation.toLowerCase().includes(searchTerm.toLowerCase());

    if (roleFilter === 'All') return matchesSearch;
    if (roleFilter === 'Physiotherapists') {
      return matchesSearch && emp.designation.toLowerCase().includes('physiotherapist');
    }
    if (roleFilter === 'Admin') {
      return matchesSearch && emp.department.toLowerCase() === 'admin';
    }
    if (roleFilter === 'New Joinees') {
      return matchesSearch && emp.dateOfJoining.includes('2024');
    }
    return matchesSearch;
  });



  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-800 lg:pl-56">

      {/* Shared Admin Sidebar */}
      <Sidebar
        variant="admin"
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setIsAddingEmployee(false);
        }}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Navbar */}
      <Navbar title={activeTab} onMobileMenuOpen={() => setMobileMenuOpen(true)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pt-[60px]">

        {/* Client Area subviews depending on activeTab */}

        <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto">

          {/* Active Tab: Dashboard (Standard Performance stats) */}
          {activeTab === 'Dashboard' && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Configuration Dashboard</h2>
                  <p className="text-xs text-slate-500 mt-1">Core platform performance figures and submission metrics</p>
                </div>
                <Link
                  to="/Webadmin"
                  className="px-4.5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-md hover:bg-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  Advanced Settings
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {stats.map((s, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <span>{s.label}</span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${s.theme}`}>{s.change}</span>
                    </div>
                    <p className="text-3xl font-extrabold text-slate-900">{s.val}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2.5">
                  <BarChart2 className="w-5 h-5 text-[#588b12]" />
                  System Log Status
                </h3>
                <div className="border border-slate-200 bg-slate-50/50 p-5 rounded-xl font-mono text-xs text-slate-650 space-y-3 shadow-inner">
                  <div className="flex items-start gap-2">
                    <span className="text-[#588b12] font-semibold shrink-0">[DATABASE]</span>
                    <span>LOG [09:12:35] - Database connected successfully. Running Mongoose schemas.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-violet-650 font-semibold shrink-0">[ Vite HMR ]</span>
                    <span>LOG [09:15:10] - Host connected via Vite endpoint port 5173.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-slate-500 font-semibold shrink-0">[   Diag   ]</span>
                    <span>LOG [09:20:00] - Diagnostics check complete. System: HEAP HEALTHY.</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Active Tab: Employees */}
          {activeTab === 'Employees' && (
            <EmployeeList
              employees={employees}
              navigate={navigate}
              setDeleteModal={setDeleteModal}
            />
          )}

          {/* Active Tab: Attendance Logs */}
          {activeTab === 'Attendance Logs' && (
            <Attendance employees={employees} />
          )}

          {/* Active Tab: Leaves */}
          {activeTab === 'Leaves' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Leaves Management</h2>
                  <p className="text-xs text-slate-500 mt-1">Review and manage leave requests or apply leaves for staff</p>
                </div>
                <button
                  onClick={() => setIsApplyingLeave(true)}
                  className="bg-[#588b12] hover:bg-[#4a750f] text-white px-4.5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer animate-fade-in"
                >
                  <Plus className="w-4 h-4" />
                  Apply Leave (On Behalf)
                </button>
              </div>

              {/* Leaves Table */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-base">All Leave Requests</h3>
                  <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded-full">
                    Total: {leaves.length}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <th className="px-6 py-4">Employee</th>
                        <th className="px-6 py-4">Leave Type</th>
                        <th className="px-6 py-4">Dates</th>
                        <th className="px-6 py-4">Reason</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150/80 text-sm">
                      {leaves.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="text-center py-8 text-slate-400 font-medium">
                            No leave requests found.
                          </td>
                        </tr>
                      ) : (
                        leaves.map((l) => {
                          const startStr = new Date(l.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                          const endStr = new Date(l.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                          const datesFormatted = l.startDate === l.endDate ? startStr : `${startStr} – ${endStr}`;
                          return (
                            <tr key={l._id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-bold text-slate-800">{l.employeeName}</div>
                                <div className="text-xs text-slate-450 font-medium">{l.employeeEID}</div>
                              </td>
                              <td className="px-6 py-4 font-semibold text-slate-700">{l.type}</td>
                              <td className="px-6 py-4 text-slate-650 font-semibold">{datesFormatted}</td>
                              <td className="px-6 py-4 text-slate-500 font-medium max-w-[200px] truncate" title={l.reason}>
                                {l.reason || "—"}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${
                                  l.status === 'Approved' ? 'bg-lime-50 text-lime-700 border-lime-200' :
                                  l.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                  'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {l.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                {l.status === "Pending HR" ? (
                                  <div className="flex justify-end gap-2">
                                    <button
                                      onClick={() => handleUpdateLeaveStatus(l._id, "Approved")}
                                      className="px-3 py-1.5 bg-lime-600 hover:bg-lime-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleUpdateLeaveStatus(l._id, "Rejected")}
                                      className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl cursor-pointer"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400 font-semibold italic">Processed</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Admin Leave Application Modal (On Behalf) */}
              {isApplyingLeave && (
                <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
                    <div className="px-6 py-4.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                      <h3 className="font-extrabold text-slate-900 text-base">Apply Leave on Behalf</h3>
                      <button
                        onClick={() => setIsApplyingLeave(false)}
                        className="text-slate-400 hover:text-slate-700"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleAdminApplyLeave} className="p-6 space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Select Employee *</label>
                        <select
                          required
                          value={adminLeaveFormData.employeeId}
                          onChange={(e) => setAdminLeaveFormData({ ...adminLeaveFormData, employeeId: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#588b12] focus:bg-white transition-all font-semibold text-slate-750"
                        >
                          <option value="">— Select Employee —</option>
                          {employees.map(emp => (
                            <option key={emp._id} value={emp._id}>{emp.name} ({emp.id})</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Leave Type</label>
                        <select
                          value={adminLeaveFormData.type}
                          onChange={(e) => setAdminLeaveFormData({ ...adminLeaveFormData, type: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#588b12] focus:bg-white transition-all font-semibold text-slate-750"
                        >
                          <option value="Paid Annual Leave">Paid Annual Leave</option>
                          <option value="Sick Leave">Sick Leave</option>
                          <option value="Casual Leave">Casual Leave</option>
                          <option value="Unpaid Sick Leave">Unpaid Sick Leave</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Start Date *</label>
                          <input
                            type="date"
                            required
                            value={adminLeaveFormData.startDate}
                            onChange={(e) => setAdminLeaveFormData({ ...adminLeaveFormData, startDate: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#588b12] focus:bg-white transition-all font-medium"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">End Date</label>
                          <input
                            type="date"
                            value={adminLeaveFormData.endDate}
                            onChange={(e) => setAdminLeaveFormData({ ...adminLeaveFormData, endDate: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#588b12] focus:bg-white transition-all font-medium"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Reason for Leave</label>
                        <textarea
                          value={adminLeaveFormData.reason}
                          onChange={(e) => setAdminLeaveFormData({ ...adminLeaveFormData, reason: e.target.value })}
                          rows="3"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#588b12] focus:bg-white transition-all font-medium"
                          placeholder="Enter reason..."
                        />
                      </div>

                      <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setIsApplyingLeave(false)}
                          className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-650 hover:bg-slate-100 text-sm font-bold transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-[#588b12] hover:bg-[#4a750f] text-white rounded-xl text-sm font-bold transition-all cursor-pointer"
                        >
                          Submit
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-6 md:p-8 space-y-6">
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-rose-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Delete Employee?</h3>
                <p className="text-sm text-slate-500 mt-2">
                  You are about to permanently delete <span className="font-bold text-slate-700">{deleteModal.employee?.name}</span>. This action cannot be undone.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Type <span className="text-rose-500">{deleteModal.employee?.id}</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteModal.confirmId}
                  onChange={(e) => setDeleteModal(prev => ({ ...prev, confirmId: e.target.value }))}
                  placeholder={deleteModal.employee?.id}
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-50 transition-all duration-200"
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModal({ isOpen: false, employee: null, confirmId: '' })}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeDelete}
                  disabled={deleteModal.confirmId !== deleteModal.employee?.id || isDeleting}
                  className="flex-1 px-4 py-3 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

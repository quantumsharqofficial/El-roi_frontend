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

  // Shortlisted Candidates state
  const [shortlisted, setShortlisted] = useState([]);
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [candidateForm, setCandidateForm] = useState({
    name: '',
    positionApplied: '',
    mobileNumber: '',
    interviewDate: '',
    proposedDateOfJoining: '',
    remarks: ''
  });

  const fetchShortlisted = async () => {
    try {
      const res = await AxiosInstance.get('/shortlisted');
      setShortlisted(res.data || []);
    } catch (err) {
      console.error("Error fetching shortlisted candidates:", err);
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    try {
      const res = await AxiosInstance.post('/shortlisted', candidateForm);
      setShortlisted([...shortlisted, res.data]);
      toast.success("Candidate shortlisted successfully!");
      setIsAddingCandidate(false);
      setCandidateForm({ name: '', positionApplied: '', mobileNumber: '', interviewDate: '', proposedDateOfJoining: '', remarks: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to shortlist candidate.");
    }
  };

  const handleRemoveCandidate = async (id) => {
    try {
      await AxiosInstance.delete(`/shortlisted/${id}`);
      setShortlisted(prev => prev.filter(c => c._id !== id));
      toast.success("Candidate removed successfully.");
    } catch (err) {
      toast.error("Failed to remove candidate.");
    }
  };

  // Alerts & Notifications state
  const [alerts, setAlerts] = useState({
    probationAlerts: [],
    noticeAlerts: [],
    birthdayAlerts: [],
    pendingLeaves: [],
    missingAttendance: []
  });

  const fetchAlerts = async () => {
    try {
      const res = await AxiosInstance.get('/alerts');
      setAlerts(res.data || {
        probationAlerts: [],
        noticeAlerts: [],
        birthdayAlerts: [],
        pendingLeaves: [],
        missingAttendance: []
      });
    } catch (err) {
      console.error("Error fetching alerts:", err);
    }
  };

  // Payroll automation state
  const [payrollMonth, setPayrollMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedPayrollEmployee, setSelectedPayrollEmployee] = useState('');
  const [payrollData, setPayrollData] = useState(null);
  const [payrollOverride, setPayrollOverride] = useState({
    basicSalary: 0,
    unpaidLeavesCount: 0,
    paidLeavesCount: 0,
    leaveDeductions: 0,
    overtimeHours: 0,
    incentives: 0,
    performanceBonus: 0,
    specialAllowances: 0,
    travelAllowance: 0,
    otherAdditionalPayments: 0,
    payableSalary: 0
  });

  const fetchPayrollCalculation = async (empId, monthVal) => {
    if (!empId || !monthVal) return;
    try {
      const res = await AxiosInstance.get(`/payroll/calculate?employeeId=${empId}&month=${monthVal}`);
      const data = res.data;
      setPayrollData(data);
      
      const dailyRate = data.basicSalary / (data.totalWorkingDays || 30);
      const leaveDeductionsVal = 0; // Default leaves count as paid leaves
      const netVal = data.basicSalary + (data.overtimeHours * (dailyRate / 8 || 150));

      setPayrollOverride({
        basicSalary: data.basicSalary || 0,
        unpaidLeavesCount: 0,
        paidLeavesCount: data.approvedLeaveDays || 0,
        leaveDeductions: leaveDeductionsVal,
        overtimeHours: data.overtimeHours || 0,
        incentives: 0,
        performanceBonus: 0,
        specialAllowances: 0,
        travelAllowance: 0,
        otherAdditionalPayments: 0,
        payableSalary: Math.round(netVal)
      });
    } catch (err) {
      toast.error("Failed to load payroll calculations.");
    }
  };

  const handleSavePayroll = async (statusVal = "Draft") => {
    try {
      const payload = {
        employeeId: payrollData.employeeId,
        employeeEID: payrollData.employeeEID,
        employeeName: payrollData.employeeName,
        month: payrollMonth,
        status: statusVal,
        ...payrollOverride
      };
      await AxiosInstance.post("/payroll", payload);
      toast.success(`Payslip successfully saved as ${statusVal}!`);
    } catch (err) {
      toast.error("Failed to save payslip.");
    }
  };

  // Fetch functions triggered by activeTab changes
  useEffect(() => {
    if (activeTab === 'Shortlisted') {
      fetchShortlisted();
    }
    if (activeTab === 'Payroll') {
      // Fetch calculation if employee is selected
      if (selectedPayrollEmployee) {
        fetchPayrollCalculation(selectedPayrollEmployee, payrollMonth);
      }
    }
    fetchAlerts(); // Load alerts dynamically on any tab change
  }, [activeTab, selectedPayrollEmployee, payrollMonth]);

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
              rawDateOfJoining: emp.dateOfJoining,
              status: emp.status === 'Active' ? 'Active' : 'Deactivated',
              avatar: emp.profilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
              email: emp.email,
              phone: emp.personalPhoneNumber || emp.workPhoneNumber || '',
              employeeType: emp.employeeType || 'Onboarding',
              noticeStartDate: emp.noticeStartDate,
              probationStartDate: emp.probationStartDate,
              faceVector: emp.faceVector,
              faceCaptureStatus: emp.faceCaptureStatus,
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

              {/* SYSTEM ALERTS & ACTION ITEMS */}
              {(alerts.probationAlerts?.length > 0 || alerts.noticeAlerts?.length > 0 || alerts.birthdayAlerts?.length > 0 || alerts.pendingLeaves?.length > 0 || alerts.missingAttendance?.length > 0) && (
                <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-200/80 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    <h3 className="font-extrabold text-amber-800 text-base uppercase tracking-wider">System Action Items & Notifications</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {/* Probation Alerts */}
                    {alerts.probationAlerts?.length > 0 && (
                      <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm space-y-2">
                        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest block">🟡 Probation Ending Soon</span>
                        <ul className="space-y-1 text-xs font-semibold text-slate-700">
                          {alerts.probationAlerts.map((al, idx) => (
                            <li key={idx} className="flex justify-between border-b border-slate-50 pb-1">
                              <span>{al.name}</span>
                              <span className="text-amber-600 font-bold">{al.remaining} working days left</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Notice Period Alerts */}
                    {alerts.noticeAlerts?.length > 0 && (
                      <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm space-y-2">
                        <span className="text-[10px] font-bold text-rose-700 uppercase tracking-widest block">🔴 Notice Period Warning</span>
                        <ul className="space-y-1 text-xs font-semibold text-slate-700">
                          {alerts.noticeAlerts.map((al, idx) => (
                            <li key={idx} className="flex justify-between border-b border-slate-50 pb-1">
                              <span>{al.name}</span>
                              <span className="text-rose-600 font-bold">{al.remaining} days left</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Birthday Reminders */}
                    {alerts.birthdayAlerts?.length > 0 && (
                      <div className="bg-white p-4 rounded-xl border border-violet-200 shadow-sm space-y-2">
                        <span className="text-[10px] font-bold text-violet-700 uppercase tracking-widest block">🎂 Birthday Reminders</span>
                        <ul className="space-y-1 text-xs font-semibold text-slate-700">
                          {alerts.birthdayAlerts.map((al, idx) => (
                            <li key={idx} className="flex justify-between border-b border-slate-50 pb-1">
                              <span>{al.name}</span>
                              <span className="text-violet-600 font-bold">{al.daysRemaining === 0 ? "Today!" : `in ${al.daysRemaining} days`}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Pending Leaves */}
                    {alerts.pendingLeaves?.length > 0 && (
                      <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm space-y-2">
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest block">📝 Pending Leaves ({alerts.pendingLeaves.length})</span>
                        <ul className="space-y-1 text-xs font-semibold text-slate-700">
                          {alerts.pendingLeaves.slice(0, 3).map((al, idx) => (
                            <li key={idx} className="flex justify-between border-b border-slate-50 pb-1">
                              <span>{al.employeeName}</span>
                              <span className="text-blue-500 italic">Pending Approval</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Missing Attendance today */}
                    {alerts.missingAttendance?.length > 0 && (
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 col-span-1 md:col-span-2 xl:col-span-3">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">❓ Missing Attendance Today</span>
                        <div className="max-h-24 overflow-y-auto pt-1">
                          {alerts.missingAttendance.map((al, idx) => (
                            <span key={idx} className="inline-block bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-lg mr-2 mb-2">
                              {al.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

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

          {/* Active Tab: Shortlisted Candidates */}
          {activeTab === 'Shortlisted' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Shortlisted Candidates (Pre-Joining)</h2>
                  <p className="text-xs text-slate-500 mt-1">Manage selected candidates prior to onboarding. Capacity limit: 6 active candidates.</p>
                </div>
                <button
                  onClick={() => {
                    if (shortlisted.length >= 6) {
                      toast.error("Maximum capacity of 6 active shortlisted candidates reached.");
                      return;
                    }
                    setIsAddingCandidate(true);
                  }}
                  className="bg-[#588b12] hover:bg-[#4a750f] text-white px-4.5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer animate-fade-in"
                >
                  <Plus className="w-4 h-4" />
                  Shortlist Candidate
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <th className="px-6 py-4">Candidate Name</th>
                        <th className="px-6 py-4">Position Applied</th>
                        <th className="px-6 py-4">Mobile Number</th>
                        <th className="px-6 py-4">Interview Date</th>
                        <th className="px-6 py-4">Proposed Joining Date</th>
                        <th className="px-6 py-4">Remarks</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150/80 text-sm">
                      {shortlisted.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center py-8 text-slate-400 font-medium">
                            No shortlisted candidates found.
                          </td>
                        </tr>
                      ) : (
                        shortlisted.map((c) => (
                          <tr key={c._id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-800">{c.name}</td>
                            <td className="px-6 py-4 font-semibold text-slate-700">{c.positionApplied}</td>
                            <td className="px-6 py-4 text-slate-650 font-medium">{c.mobileNumber}</td>
                            <td className="px-6 py-4 text-slate-500">{c.interviewDate ? new Date(c.interviewDate).toLocaleDateString('en-GB') : '—'}</td>
                            <td className="px-6 py-4 text-slate-500">{c.proposedDateOfJoining ? new Date(c.proposedDateOfJoining).toLocaleDateString('en-GB') : '—'}</td>
                            <td className="px-6 py-4 text-slate-500 max-w-[200px] truncate" title={c.remarks}>{c.remarks || '—'}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => navigate("/add-employee", { state: { candidate: c } })}
                                  className="px-3 py-1.5 bg-lime-600 hover:bg-lime-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                                >
                                  Convert to Employee
                                </button>
                                <button
                                  onClick={() => handleRemoveCandidate(c._id)}
                                  className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl cursor-pointer"
                                >
                                  Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add Candidate Modal */}
              {isAddingCandidate && (
                <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-scale-up">
                    <div className="px-6 py-4.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                      <h3 className="font-extrabold text-slate-900 text-base">Shortlist New Candidate</h3>
                      <button onClick={() => setIsAddingCandidate(false)} className="text-slate-400 hover:text-slate-700">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <form onSubmit={handleAddCandidate} className="p-6 space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 uppercase">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={candidateForm.name}
                          onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                          placeholder="e.g. John Doe"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 uppercase">Position Applied *</label>
                        <input
                          type="text"
                          required
                          value={candidateForm.positionApplied}
                          onChange={(e) => setCandidateForm({ ...candidateForm, positionApplied: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                          placeholder="e.g. Physiotherapist"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 uppercase">Mobile Number *</label>
                        <input
                          type="tel"
                          required
                          value={candidateForm.mobileNumber}
                          onChange={(e) => setCandidateForm({ ...candidateForm, mobileNumber: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                          placeholder="+91 98765 43210"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 uppercase">Interview Date *</label>
                          <input
                            type="date"
                            required
                            value={candidateForm.interviewDate}
                            onChange={(e) => setCandidateForm({ ...candidateForm, interviewDate: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 uppercase">Proposed Joining Date *</label>
                          <input
                            type="date"
                            required
                            value={candidateForm.proposedDateOfJoining}
                            onChange={(e) => setCandidateForm({ ...candidateForm, proposedDateOfJoining: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 uppercase">Remarks</label>
                        <textarea
                          value={candidateForm.remarks}
                          onChange={(e) => setCandidateForm({ ...candidateForm, remarks: e.target.value })}
                          rows="3"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"
                          placeholder="Remarks..."
                        />
                      </div>
                      <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                        <button type="button" onClick={() => setIsAddingCandidate(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold">Cancel</button>
                        <button type="submit" className="px-5 py-2.5 bg-[#588b12] text-white rounded-xl text-sm font-bold">Save</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Active Tab: Payroll */}
          {activeTab === 'Payroll' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Payroll Automation & Compensation</h2>
                <p className="text-xs text-slate-500 mt-1">Review monthly logs, calculate compensation, add incentives, allowances and process salary slips.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
                {/* Selector Card */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 h-fit">
                  <h3 className="font-extrabold text-slate-900 text-base">Select Month & Employee</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Select Month</label>
                      <input
                        type="month"
                        value={payrollMonth}
                        onChange={(e) => setPayrollMonth(e.target.value)}
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#588b12] focus:bg-white transition-all font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Select Employee</label>
                      <select
                        value={selectedPayrollEmployee}
                        onChange={(e) => setSelectedPayrollEmployee(e.target.value)}
                        className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#588b12] focus:bg-white transition-all font-semibold"
                      >
                        <option value="">— Choose Employee —</option>
                        {employees.map(emp => (
                          <option key={emp._id} value={emp._id}>{emp.name} ({emp.id})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Calculation & Adjustments Panel */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                  {!payrollData ? (
                    <div className="text-center py-16 text-slate-400 font-semibold">
                      Please select an employee and month to load payroll details.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="border-b border-slate-100 pb-4">
                        <h3 className="text-lg font-black text-[#588b12]">{payrollData.employeeName}</h3>
                        <p className="text-xs text-slate-500">Employee ID: {payrollData.employeeEID} • Month: {payrollMonth}</p>
                      </div>

                      {/* Log Analytics */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Working Days</span>
                          <span className="text-xl font-extrabold text-slate-800">{payrollData.totalWorkingDays} Days</span>
                        </div>
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Actual Days Present</span>
                          <span className="text-xl font-extrabold text-slate-800">{payrollData.actualWorkingDays} Days</span>
                        </div>
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Actual Working Hours</span>
                          <span className="text-xl font-extrabold text-slate-800">{payrollData.actualWorkingHours} hrs</span>
                        </div>
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Approved Leaves</span>
                          <span className="text-xl font-extrabold text-slate-800">{payrollData.approvedLeaveDays} Days</span>
                        </div>
                      </div>

                      {/* Pay Structure & Overrides */}
                      <div className="space-y-4">
                        <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider border-b border-slate-100 pb-1">Earnings & Deductions (Manual Override Enabled)</h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          {/* Basic Salary */}
                          <div>
                            <label className="text-xs font-bold text-slate-700 uppercase">Basic Salary (&#8377;)</label>
                            <input
                              type="number"
                              value={payrollOverride.basicSalary}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setPayrollOverride(prev => {
                                  const net = val - prev.leaveDeductions + (prev.overtimeHours * (val / (payrollData.totalWorkingDays || 30) / 8 || 150)) + prev.incentives + prev.performanceBonus + prev.specialAllowances + prev.travelAllowance + prev.otherAdditionalPayments;
                                  return { ...prev, basicSalary: val, payableSalary: Math.round(net) };
                                });
                              }}
                              className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm"
                            />
                          </div>

                          {/* Overtime Hours */}
                          <div>
                            <label className="text-xs font-bold text-slate-700 uppercase">Overtime Hours</label>
                            <input
                              type="number"
                              step="0.5"
                              value={payrollOverride.overtimeHours}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setPayrollOverride(prev => {
                                  const dailyRate = prev.basicSalary / (payrollData.totalWorkingDays || 30);
                                  const net = prev.basicSalary - prev.leaveDeductions + (val * (dailyRate / 8 || 150)) + prev.incentives + prev.performanceBonus + prev.specialAllowances + prev.travelAllowance + prev.otherAdditionalPayments;
                                  return { ...prev, overtimeHours: val, payableSalary: Math.round(net) };
                                });
                              }}
                              className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm"
                            />
                          </div>

                          {/* Leave Deductions */}
                          <div>
                            <label className="text-xs font-bold text-slate-700 uppercase">Leave Deductions (&#8377;)</label>
                            <input
                              type="number"
                              value={payrollOverride.leaveDeductions}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setPayrollOverride(prev => {
                                  const dailyRate = prev.basicSalary / (payrollData.totalWorkingDays || 30);
                                  const net = prev.basicSalary - val + (prev.overtimeHours * (dailyRate / 8 || 150)) + prev.incentives + prev.performanceBonus + prev.specialAllowances + prev.travelAllowance + prev.otherAdditionalPayments;
                                  return { ...prev, leaveDeductions: val, payableSalary: Math.round(net) };
                                });
                              }}
                              className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-rose-600"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <label className="text-xs font-bold text-slate-700 uppercase">Paid Leaves Count</label>
                            <input
                              type="number"
                              value={payrollOverride.paidLeavesCount}
                              onChange={(e) => setPayrollOverride({ ...payrollOverride, paidLeavesCount: parseInt(e.target.value) || 0 })}
                              className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-700 uppercase">Unpaid Leaves Count</label>
                            <input
                              type="number"
                              value={payrollOverride.unpaidLeavesCount}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                const dailyRate = payrollOverride.basicSalary / (payrollData.totalWorkingDays || 30);
                                const ded = Math.round(val * dailyRate);
                                setPayrollOverride(prev => {
                                  const net = prev.basicSalary - ded + (prev.overtimeHours * (dailyRate / 8 || 150)) + prev.incentives + prev.performanceBonus + prev.specialAllowances + prev.travelAllowance + prev.otherAdditionalPayments;
                                  return { ...prev, unpaidLeavesCount: val, leaveDeductions: ded, payableSalary: Math.round(net) };
                                });
                              }}
                              className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-rose-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-2">
                          <div>
                            <label className="text-xs font-bold text-slate-700 uppercase">Incentives</label>
                            <input
                              type="number"
                              value={payrollOverride.incentives}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setPayrollOverride(prev => {
                                  const dailyRate = prev.basicSalary / (payrollData.totalWorkingDays || 30);
                                  const net = prev.basicSalary - prev.leaveDeductions + (prev.overtimeHours * (dailyRate / 8 || 150)) + val + prev.performanceBonus + prev.specialAllowances + prev.travelAllowance + prev.otherAdditionalPayments;
                                  return { ...prev, incentives: val, payableSalary: Math.round(net) };
                                });
                              }}
                              className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-lime-700"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-700 uppercase">Bonus</label>
                            <input
                              type="number"
                              value={payrollOverride.performanceBonus}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setPayrollOverride(prev => {
                                  const dailyRate = prev.basicSalary / (payrollData.totalWorkingDays || 30);
                                  const net = prev.basicSalary - prev.leaveDeductions + (prev.overtimeHours * (dailyRate / 8 || 150)) + prev.incentives + val + prev.specialAllowances + prev.travelAllowance + prev.otherAdditionalPayments;
                                  return { ...prev, performanceBonus: val, payableSalary: Math.round(net) };
                                });
                              }}
                              className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-lime-700"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-700 uppercase">Special Allow.</label>
                            <input
                              type="number"
                              value={payrollOverride.specialAllowances}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setPayrollOverride(prev => {
                                  const dailyRate = prev.basicSalary / (payrollData.totalWorkingDays || 30);
                                  const net = prev.basicSalary - prev.leaveDeductions + (prev.overtimeHours * (dailyRate / 8 || 150)) + prev.incentives + prev.performanceBonus + val + prev.travelAllowance + prev.otherAdditionalPayments;
                                  return { ...prev, specialAllowances: val, payableSalary: Math.round(net) };
                                });
                              }}
                              className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-lime-700"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-700 uppercase">Travel Allow.</label>
                            <input
                              type="number"
                              value={payrollOverride.travelAllowance}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setPayrollOverride(prev => {
                                  const dailyRate = prev.basicSalary / (payrollData.totalWorkingDays || 30);
                                  const net = prev.basicSalary - prev.leaveDeductions + (prev.overtimeHours * (dailyRate / 8 || 150)) + prev.incentives + prev.performanceBonus + prev.specialAllowances + val + prev.otherAdditionalPayments;
                                  return { ...prev, travelAllowance: val, payableSalary: Math.round(net) };
                                });
                              }}
                              className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-lime-700"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-700 uppercase">Other Payments</label>
                            <input
                              type="number"
                              value={payrollOverride.otherAdditionalPayments}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setPayrollOverride(prev => {
                                  const dailyRate = prev.basicSalary / (payrollData.totalWorkingDays || 30);
                                  const net = prev.basicSalary - prev.leaveDeductions + (prev.overtimeHours * (dailyRate / 8 || 150)) + prev.incentives + prev.performanceBonus + prev.specialAllowances + prev.travelAllowance + val;
                                  return { ...prev, otherAdditionalPayments: val, payableSalary: Math.round(net) };
                                });
                              }}
                              className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-lime-700"
                            />
                          </div>
                        </div>

                        {/* Net Payable Salary */}
                        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Net Payable Salary (Manual Override Allowed)</span>
                            <input
                              type="number"
                              value={payrollOverride.payableSalary}
                              onChange={(e) => setPayrollOverride({ ...payrollOverride, payableSalary: Math.round(parseFloat(e.target.value) || 0) })}
                              className="text-2xl font-black text-[#588b12] bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mt-1 focus:outline-none focus:bg-white"
                            />
                          </div>

                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => handleSavePayroll("Draft")}
                              className="px-5 py-3 rounded-xl border border-slate-200 font-bold hover:bg-slate-100 text-slate-700 text-sm transition-all"
                            >
                              Save Draft
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSavePayroll("Paid")}
                              className="px-5 py-3 rounded-xl bg-[#588b12] hover:bg-[#4a750f] text-white font-bold text-sm shadow-md transition-all animate-pulse"
                            >
                              Generate & Pay
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
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

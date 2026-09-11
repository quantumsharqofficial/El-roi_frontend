import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Edit,
  Cake,
  RotateCcw,
  DollarSign,
  Check,
  CreditCard,
  Calculator,
  FileText
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Sidebar from '../layouts/Sidebar';
import Navbar from '../layouts/Navbar';
import AxiosInstance from '../utilities/AxiosInstance';
import EmployeeList from '../component/EmployeeList';
import Attendance from '../component/Attendance';
import PayslipModal from '../component/PayslipModal';

const calculateAge = (dobString) => {
  if (!dobString) return '';
  const dobDate = new Date(dobString);
  if (isNaN(dobDate.getTime())) return '';
  const diff = Date.now() - dobDate.getTime();
  const calculatedAge = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  return calculatedAge >= 0 ? `${calculatedAge} years` : '';
};

const getUpcomingBirthdays = (employeeList) => {
  if (!employeeList || employeeList.length === 0) return [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return employeeList
    .filter(emp => emp.dob)
    .map(emp => {
      const dobDate = new Date(emp.dob);
      const nextBirthday = new Date(today.getFullYear(), dobDate.getMonth(), dobDate.getDate());
      if (nextBirthday < today && !(today.getMonth() === dobDate.getMonth() && today.getDate() === dobDate.getDate())) {
        nextBirthday.setFullYear(today.getFullYear() + 1);
      }
      const diffTime = nextBirthday - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const isToday = today.getMonth() === dobDate.getMonth() && today.getDate() === dobDate.getDate();
      return {
        ...emp,
        daysUntil: isToday ? 0 : diffDays,
        formattedDob: dobDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
        age: today.getFullYear() - dobDate.getFullYear()
      };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil);
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('adminActiveTab') || 'Employees';
  });
  const [dashboardSubTab, setDashboardSubTab] = useState('Birthdays');
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);

  // Employee Directory state
  const [employees, setEmployees] = useState([]);

  // Alerts & Notifications state
  const [alerts, setAlerts] = useState({
    probationAlerts: [],
    noticeAlerts: [],
    birthdayAlerts: [],
    pendingLeaves: [],
    missingAttendance: []
  });

  useEffect(() => {
    localStorage.setItem('adminActiveTab', activeTab);
  }, [activeTab]);


  // Compute dynamic stats
  const totalEmployeesCount = employees ? employees.length : 0;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayPresentCount = todayAttendance && Array.isArray(todayAttendance)
    ? todayAttendance.filter(log => log && (log.status === 'Present' || log.status === 'Late')).length
    : 0;
  const todayLeaveCount = leaves && Array.isArray(leaves)
    ? leaves.filter(l => {
      if (!l || !l.startDate || !l.endDate) return false;
      try {
        const start = new Date(l.startDate).toISOString().split('T')[0];
        const end = new Date(l.endDate).toISOString().split('T')[0];
        return todayStr >= start && todayStr <= end;
      } catch (e) {
        return false;
      }
    }).length
    : 0;

  const thisMonthBirthdays = getUpcomingBirthdays(employees).filter(emp => {
    if (!emp || !emp.dob) return false;
    try {
      return new Date(emp.dob).getMonth() === new Date().getMonth();
    } catch (e) {
      return false;
    }
  });

  const pendingLeaves = leaves && Array.isArray(leaves)
    ? leaves.filter(l => l && l.status === 'Pending HR')
    : [];

  // Admin Page stats
  const stats = [
    { label: 'Total Employees', val: totalEmployeesCount, change: 'Active Profiles', theme: 'text-lime-600 bg-lime-50 border-lime-200' },
    { label: 'Today Present', val: todayPresentCount, change: 'Checked In', theme: 'text-emerald-650 bg-emerald-50 border-emerald-200' },
    { label: 'Today Leave', val: todayLeaveCount, change: 'On Leave Today', theme: 'text-rose-650 bg-rose-50 border-rose-200' }
  ];

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
  const [isApplyingLeave, setIsApplyingLeave] = useState(false);
  const [leaveSearchQuery, setLeaveSearchQuery] = useState('');
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('All');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('All');
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

  const fetchTodayAttendance = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const res = await AxiosInstance.get(`/attendance/find-date/${todayStr}`);
      setTodayAttendance(res.data || []);
    } catch (err) {
      console.error("Error fetching today's attendance:", err);
    }
  };

  useEffect(() => {
    fetchAllLeaves();
  }, []);

  useEffect(() => {
    if (activeTab === 'Leaves' || activeTab === 'Dashboard') {
      fetchAllLeaves();
    }
    if (activeTab === 'Dashboard') {
      fetchTodayAttendance();
    }
  }, [activeTab]);

  const formatEmployeeList = (list) => {
    if (!Array.isArray(list)) return [];
    return list.map(emp => {
      const dateFormatted = emp.dateOfJoining
        ? new Date(emp.dateOfJoining).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')
        : '';
      const fullName = (emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`).trim() || emp.employeeId || 'Employee';
      return {
        ...emp,
        _id: emp._id,
        id: emp.employeeId || emp._id || '',
        employeeId: emp.employeeId || emp.id || '',
        name: fullName,
        designation: emp.designation || 'Staff',
        department: emp.department || 'Clinical',
        dateOfJoining: dateFormatted,
        rawDateOfJoining: emp.dateOfJoining,
        status: emp.status === 'Active' ? 'Active' : 'Deactivated',
        avatar: emp.profilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        email: emp.email || '',
        phone: emp.personalPhoneNumber || emp.workPhoneNumber || '',
        employeeType: emp.employeeType || 'Onboarding',
        noticeStartDate: emp.noticeStartDate,
        probationStartDate: emp.probationStartDate,
        faceVector: emp.faceVector,
        faceCaptureStatus: emp.faceCaptureStatus,
        dob: emp.dob,
        leaveBalances: emp.leaveBalances || [],
      };
    });
  };

  const handleUpdateLeaveStatus = async (id, status) => {
    try {
      const res = await AxiosInstance.put(`/leaves/${id}`, { status });
      setLeaves(prev => prev.map(l => l._id === id ? res.data : l));
      toast.success(`Leave request status updated to ${status}`);
      // Refresh employees list so leave balance changes reflect immediately
      AxiosInstance.get('/employees').then(r => setEmployees(formatEmployeeList(r.data || []))).catch(() => {});
    } catch (err) {
      toast.error("Failed to update leave status.");
    }
  };

  const handleDeleteLeave = async (id) => {
    if (!window.confirm("Are you sure you want to delete this leave request?")) return;
    try {
      await AxiosInstance.delete(`/leaves/${id}`);
      setLeaves(prev => prev.filter(l => l._id !== id));
      toast.success("Leave request deleted successfully.");
      AxiosInstance.get('/employees').then(r => setEmployees(formatEmployeeList(r.data || []))).catch(() => {});
    } catch (err) {
      toast.error("Failed to delete leave request.");
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

  const filteredLeaves = useMemo(() => {
    return leaves.filter((l) => {
      const matchesSearch =
        !leaveSearchQuery ||
        (l.employeeName || '').toLowerCase().includes(leaveSearchQuery.toLowerCase()) ||
        (l.employeeEID || '').toLowerCase().includes(leaveSearchQuery.toLowerCase()) ||
        (l.reason || '').toLowerCase().includes(leaveSearchQuery.toLowerCase());
      const matchesStatus =
        leaveStatusFilter === 'All' || l.status === leaveStatusFilter;
      const matchesType =
        leaveTypeFilter === 'All' || l.type === leaveTypeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [leaves, leaveSearchQuery, leaveStatusFilter, leaveTypeFilter]);

  const pendingCount = useMemo(() => leaves.filter(l => l.status === 'Pending HR').length, [leaves]);
  const approvedCount = useMemo(() => leaves.filter(l => l.status === 'Approved').length, [leaves]);
  const rejectedCount = useMemo(() => leaves.filter(l => l.status === 'Rejected').length, [leaves]);

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

  // Payroll automation & monthly directory state
  const [payrollMonth, setPayrollMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [payrollSubTab, setPayrollSubTab] = useState('list'); // 'list' | 'calculator'
  const [monthlyPayrolls, setMonthlyPayrolls] = useState([]);
  const [loadingMonthlyPayrolls, setLoadingMonthlyPayrolls] = useState(false);
  const [payrollSearch, setPayrollSearch] = useState('');
  const [payrollStatusFilter, setPayrollStatusFilter] = useState('All');

  // Modals state
  const [viewingPayslip, setViewingPayslip] = useState(null);
  const [editingPayroll, setEditingPayroll] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Single calculator state
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

  const fetchMonthlyPayrolls = async (monthVal) => {
    if (!monthVal) return;
    setLoadingMonthlyPayrolls(true);
    try {
      const res = await AxiosInstance.get(`/payroll/month/${monthVal}`);
      setMonthlyPayrolls(res.data || []);
    } catch (err) {
      console.error("Error fetching monthly payrolls:", err);
      toast.error("Failed to load monthly payroll list.");
    } finally {
      setLoadingMonthlyPayrolls(false);
    }
  };

  const fetchPayrollCalculation = async (empId, monthVal) => {
    if (!empId || !monthVal) return;
    try {
      const res = await AxiosInstance.get(`/payroll/calculate?employeeId=${empId}&month=${monthVal}`);
      const data = res.data;
      setPayrollData(data);

      const dailyRate = data.basicSalary / (data.totalWorkingDays || 26);
      const leaveDeductionsVal = 0;
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
        totalWorkingDays: payrollData.totalWorkingDays,
        actualWorkingDays: payrollData.actualWorkingDays,
        actualWorkingHours: payrollData.actualWorkingHours,
        status: statusVal,
        ...payrollOverride
      };
      await AxiosInstance.post("/payroll", payload);
      toast.success(`Payslip successfully saved as ${statusVal}!`);
      fetchMonthlyPayrolls(payrollMonth);
      setPayrollSubTab('list');
    } catch (err) {
      toast.error("Failed to save payslip.");
    }
  };

  const handleOpenEdit = (item) => {
    setEditingPayroll(item);
    setEditForm({
      employeeId: item.employeeId,
      employeeEID: item.employeeEID,
      employeeName: item.employeeName,
      month: item.month || payrollMonth,
      basicSalary: Number(item.basicSalary) || 0,
      totalWorkingDays: Number(item.totalWorkingDays) || 26,
      actualWorkingDays: Number(item.actualWorkingDays) || 0,
      actualWorkingHours: Number(item.actualWorkingHours) || 0,
      overtimeHours: Number(item.overtimeHours) || 0,
      paidLeavesCount: Number(item.paidLeavesCount) || 0,
      unpaidLeavesCount: Number(item.unpaidLeavesCount) || 0,
      leaveDeductions: Number(item.leaveDeductions) || 0,
      incentives: Number(item.incentives) || 0,
      performanceBonus: Number(item.performanceBonus) || 0,
      specialAllowances: Number(item.specialAllowances) || 0,
      travelAllowance: Number(item.travelAllowance) || 0,
      otherAdditionalPayments: Number(item.otherAdditionalPayments) || 0,
      payableSalary: Number(item.payableSalary) || 0,
      status: item.status === 'Paid' ? 'Paid' : 'Draft',
    });
  };

  const handleEditInputChange = (field, value) => {
    setEditForm((prev) => {
      if (!prev) return null;
      const updated = { ...prev, [field]: value };

      const basic = parseFloat(field === 'basicSalary' ? value : updated.basicSalary) || 0;
      const days = parseFloat(field === 'totalWorkingDays' ? value : updated.totalWorkingDays) || 26;
      const dailyRate = days > 0 ? basic / days : 0;
      const hourlyRate = dailyRate / 8 || 150;

      let leaveDed = parseFloat(field === 'leaveDeductions' ? value : updated.leaveDeductions) || 0;
      if (field === 'unpaidLeavesCount') {
        const unpaidCount = parseFloat(value) || 0;
        leaveDed = Math.round(unpaidCount * dailyRate);
        updated.leaveDeductions = leaveDed;
      }

      const otHours = parseFloat(field === 'overtimeHours' ? value : updated.overtimeHours) || 0;
      const otPay = Math.round(otHours * hourlyRate);

      const incentives = parseFloat(field === 'incentives' ? value : updated.incentives) || 0;
      const bonus = parseFloat(field === 'performanceBonus' ? value : updated.performanceBonus) || 0;
      const special = parseFloat(field === 'specialAllowances' ? value : updated.specialAllowances) || 0;
      const travel = parseFloat(field === 'travelAllowance' ? value : updated.travelAllowance) || 0;
      const other = parseFloat(field === 'otherAdditionalPayments' ? value : updated.otherAdditionalPayments) || 0;

      if (field !== 'payableSalary') {
        const net = Math.round(basic - leaveDed + otPay + incentives + bonus + special + travel + other);
        updated.payableSalary = Math.max(0, net);
      }

      return updated;
    });
  };

  const handleSaveEditPayroll = async (statusOverride = null) => {
    if (!editForm) return;
    setIsSavingEdit(true);
    try {
      const payload = {
        ...editForm,
        status: statusOverride || editForm.status || 'Draft',
      };
      await AxiosInstance.post('/payroll', payload);
      toast.success(`Payslip for ${editForm.employeeName} saved as ${payload.status}!`);
      setEditingPayroll(null);
      setEditForm(null);
      fetchMonthlyPayrolls(payrollMonth);
    } catch (err) {
      console.error("Error saving payroll:", err);
      toast.error(err.response?.data?.message || "Failed to save payroll.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleQuickMarkPaid = async (item) => {
    try {
      const payload = {
        employeeId: item.employeeId,
        employeeEID: item.employeeEID,
        employeeName: item.employeeName,
        month: item.month || payrollMonth,
        basicSalary: item.basicSalary,
        totalWorkingDays: item.totalWorkingDays,
        actualWorkingDays: item.actualWorkingDays,
        actualWorkingHours: item.actualWorkingHours,
        overtimeHours: item.overtimeHours,
        paidLeavesCount: item.paidLeavesCount,
        unpaidLeavesCount: item.unpaidLeavesCount,
        leaveDeductions: item.leaveDeductions,
        incentives: item.incentives,
        performanceBonus: item.performanceBonus,
        specialAllowances: item.specialAllowances,
        travelAllowance: item.travelAllowance,
        otherAdditionalPayments: item.otherAdditionalPayments,
        payableSalary: item.payableSalary,
        status: 'Paid',
      };
      await AxiosInstance.post('/payroll', payload);
      toast.success(`Payslip for ${item.employeeName} marked as Paid!`);
      fetchMonthlyPayrolls(payrollMonth);
    } catch (err) {
      console.error("Error marking as paid:", err);
      toast.error("Failed to update status to Paid.");
    }
  };

  const filteredMonthlyPayrolls = useMemo(() => {
    return monthlyPayrolls.filter((p) => {
      const q = payrollSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        (p.employeeName || '').toLowerCase().includes(q) ||
        (p.employeeEID || '').toLowerCase().includes(q) ||
        (p.employeeDesignation || '').toLowerCase().includes(q) ||
        (p.employeeDepartment || '').toLowerCase().includes(q);

      const matchStatus =
        payrollStatusFilter === 'All' || p.status === payrollStatusFilter;

      return matchSearch && matchStatus;
    });
  }, [monthlyPayrolls, payrollSearch, payrollStatusFilter]);

  const payrollMonthlySummary = useMemo(() => {
    let totalExpense = 0;
    let paidTotal = 0;
    let paidCount = 0;
    let draftTotal = 0;
    let draftCount = 0;
    let unprocessedCount = 0;
    let workingDays = 26;

    monthlyPayrolls.forEach((p) => {
      const net = p.payableSalary || 0;
      totalExpense += net;
      if (p.totalWorkingDays) workingDays = p.totalWorkingDays;

      if (p.status === 'Paid') {
        paidTotal += net;
        paidCount++;
      } else if (p.status === 'Draft') {
        draftTotal += net;
        draftCount++;
      } else {
        unprocessedCount++;
      }
    });

    return {
      totalEmployees: monthlyPayrolls.length,
      totalExpense,
      paidTotal,
      paidCount,
      draftTotal,
      draftCount,
      unprocessedCount,
      workingDays,
    };
  }, [monthlyPayrolls]);

  // Fetch functions triggered by activeTab changes
  useEffect(() => {
    if (activeTab === 'Shortlisted') {
      fetchShortlisted();
    }
    if (activeTab === 'Payroll') {
      fetchMonthlyPayrolls(payrollMonth);
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
          const formatted = formatEmployeeList(res.data);
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
    if (!emp) return false;
    const name = String(emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`).toLowerCase();
    const id = String(emp.id || emp.employeeId || '').toLowerCase();
    const desig = String(emp.designation || '').toLowerCase();
    const dept = String(emp.department || '').toLowerCase();
    const search = String(searchTerm || '').toLowerCase();

    const matchesSearch = !search || name.includes(search) || id.includes(search) || desig.includes(search);

    if (roleFilter === 'All') return matchesSearch;
    if (roleFilter === 'Physiotherapists') {
      return matchesSearch && desig.includes('physiotherapist');
    }
    if (roleFilter === 'Admin') {
      return matchesSearch && dept === 'admin';
    }
    if (roleFilter === 'New Joinees') {
      return matchesSearch && (String(emp.dateOfJoining || emp.rawDateOfJoining || '').includes('2024'));
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

          {/* Active Tab: Dashboard */}
          {activeTab === 'Dashboard' && (
            <>
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
                  <p className="text-xs text-slate-500 mt-1">Welcome back! Here's your daily overview.</p>
                </div>
                <Link
                  to="/Webadmin"
                  className="px-4.5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-md hover:bg-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  Advanced Settings
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Total Employees */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-lime-100/40 rounded-full -translate-y-6 translate-x-6" />
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-10 h-10 rounded-xl bg-lime-100 flex items-center justify-center">
                      <User className="w-5 h-5 text-lime-700" />
                    </span>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">All Employees</span>
                  </div>
                  <p className="text-3xl font-extrabold text-slate-900">{totalEmployeesCount}</p>
                  <p className="text-xs text-lime-600 font-semibold mt-1">Active Profiles</p>
                </div>

                {/* Today Present */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-100/40 rounded-full -translate-y-6 translate-x-6" />
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                    </span>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today Present</span>
                  </div>
                  <p className="text-3xl font-extrabold text-slate-900">{todayPresentCount}</p>
                  <p className="text-xs text-emerald-600 font-semibold mt-1">Checked In Today</p>
                </div>

                {/* Today Leave */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-rose-100/40 rounded-full -translate-y-6 translate-x-6" />
                  <div className="flex items-center gap-3 mb-3">
                    <span className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-rose-700" />
                    </span>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today Leave</span>
                  </div>
                  <p className="text-3xl font-extrabold text-slate-900">{todayLeaveCount}</p>
                  <p className="text-xs text-rose-600 font-semibold mt-1">On Leave Today</p>
                </div>
              </div>

              {/* SYSTEM ALERTS & ACTION ITEMS */}
              {(alerts.probationAlerts?.length > 0 || alerts.noticeAlerts?.length > 0 || alerts.missingAttendance?.length > 0) && (
                <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-200/80 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    <h3 className="font-extrabold text-amber-800 text-base uppercase tracking-wider">System Alerts</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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

                    {alerts.missingAttendance?.length > 0 && (
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
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

              {/* Two-column layout: Birthdays + Pending Leaves */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* This Month Birthdays */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cake className="w-5 h-5 text-violet-600" />
                      <h3 className="font-bold text-slate-900 text-base">This Month Birthdays</h3>
                    </div>
                    <span className="text-xs text-violet-600 font-bold bg-violet-50 px-3 py-1 rounded-full border border-violet-200">
                      {thisMonthBirthdays.length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto max-h-[380px]">
                    {thisMonthBirthdays.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <Cake className="w-10 h-10 mb-3 opacity-30" />
                        <p className="text-sm font-medium">No birthdays this month</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {thisMonthBirthdays.map((emp) => (
                          <div key={emp._id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                            <img src={emp.avatar} alt={emp.name} className="w-10 h-10 rounded-full object-cover border-2 border-violet-100 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-slate-800 text-sm truncate">{emp.name}</p>
                              <p className="text-xs text-slate-500 font-medium">{emp.designation} • {emp.formattedDob}</p>
                            </div>
                            {emp.daysUntil === 0 ? (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-violet-100 text-violet-700 border border-violet-200 shrink-0">
                                🎉 Today!
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                in {emp.daysUntil}d
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Pending Leave Requests */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-600" />
                      <h3 className="font-bold text-slate-900 text-base">Pending Leave Requests</h3>
                    </div>
                    <span className="text-xs text-amber-600 font-bold bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                      {pendingLeaves.length}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto max-h-[380px]">
                    {pendingLeaves.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <CheckCircle2 className="w-10 h-10 mb-3 opacity-30" />
                        <p className="text-sm font-medium">All caught up! No pending requests.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {pendingLeaves.map((l) => {
                          const startStr = new Date(l.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
                          const endStr = new Date(l.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
                          const dateStr = l.startDate === l.endDate ? startStr : `${startStr} – ${endStr}`;
                          return (
                            <div key={l._id} className="px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                              <div className="flex items-center justify-between mb-2">
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-800 text-sm truncate">{l.employeeName}</p>
                                  <p className="text-xs text-slate-500 font-medium">{l.type} • {dateStr}</p>
                                </div>
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                  Pending
                                </span>
                              </div>
                              {l.reason && (
                                <p className="text-xs text-slate-500 italic mb-2 truncate" title={l.reason}>"{l.reason}"</p>
                              )}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleUpdateLeaveStatus(l._id, "Approved")}
                                  className="px-3 py-1.5 bg-lime-600 hover:bg-lime-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleUpdateLeaveStatus(l._id, "Rejected")}
                                  className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
              {/* Header & Controls */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Monthly Payroll Management</h2>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#588b12]/10 text-[#588b12] border border-[#588b12]/20">
                      Working Days: {payrollMonthlySummary.workingDays} Days (Excl. Sundays)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Complete monthly compensation directory with all filled attendance and leave logs. Working days accurately exclude Sundays only.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Month Picker */}
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <input
                      type="month"
                      value={payrollMonth}
                      onChange={(e) => setPayrollMonth(e.target.value)}
                      className="text-xs font-bold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
                    />
                  </div>

                  {/* Refresh Button */}
                  <button
                    type="button"
                    onClick={() => fetchMonthlyPayrolls(payrollMonth)}
                    disabled={loadingMonthlyPayrolls}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    title="Refresh Payroll Data"
                  >
                    <RotateCcw className={`w-4 h-4 ${loadingMonthlyPayrolls ? 'animate-spin text-[#588b12]' : ''}`} />
                  </button>

                  {/* Sub-tab view toggle */}
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => setPayrollSubTab('list')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        payrollSubTab === 'list'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Monthly Directory ({monthlyPayrolls.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayrollSubTab('calculator')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        payrollSubTab === 'calculator'
                          ? 'bg-white text-[#588b12] shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      Individual Calculator
                    </button>
                  </div>
                </div>
              </div>

              {/* Monthly KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Monthly Net</span>
                    <span className="text-2xl font-black text-slate-900 mt-1 block">
                      ₹{payrollMonthlySummary.totalExpense?.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[11px] text-slate-500 font-semibold mt-0.5 block">
                      {payrollMonthlySummary.totalEmployees} Active Staff
                    </span>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Disbursed / Paid</span>
                    <span className="text-2xl font-black text-emerald-600 mt-1 block">
                      ₹{payrollMonthlySummary.paidTotal?.toLocaleString('en-IN')}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {payrollMonthlySummary.paidCount} Employees Paid
                    </span>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                    <CreditCard className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Draft / Pending</span>
                    <span className="text-2xl font-black text-amber-600 mt-1 block">
                      ₹{payrollMonthlySummary.draftTotal?.toLocaleString('en-IN')}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md mt-1">
                      <Clock className="w-3 h-3" />
                      {payrollMonthlySummary.draftCount} In Draft
                    </span>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Unprocessed</span>
                    <span className="text-2xl font-black text-slate-700 mt-1 block">
                      {payrollMonthlySummary.unprocessedCount}
                    </span>
                    <span className="text-[11px] text-slate-400 font-semibold mt-0.5 block">
                      Auto-computed from logs
                    </span>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* VIEW 1: MONTHLY DIRECTORY LIST */}
              {payrollSubTab === 'list' && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                  {/* Search and Filters Bar */}
                  <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search employee by name, ID, designation..."
                        value={payrollSearch}
                        onChange={(e) => setPayrollSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#588b12] focus:bg-white transition-all"
                      />
                    </div>

                    {/* Status Filter Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                      {['All', 'Paid', 'Draft', 'Unprocessed'].map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setPayrollStatusFilter(st)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                            payrollStatusFilter === st
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                          }`}
                        >
                          {st}
                          {st === 'All' && ` (${monthlyPayrolls.length})`}
                          {st === 'Paid' && ` (${payrollMonthlySummary.paidCount})`}
                          {st === 'Draft' && ` (${payrollMonthlySummary.draftCount})`}
                          {st === 'Unprocessed' && ` (${payrollMonthlySummary.unprocessedCount})`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                          <th className="py-3.5 px-4">Employee</th>
                          <th className="py-3.5 px-3">Working Days (Excl. Sun)</th>
                          <th className="py-3.5 px-3">Basic Pay</th>
                          <th className="py-3.5 px-3">Overtime</th>
                          <th className="py-3.5 px-3">Leaves & Deductions</th>
                          <th className="py-3.5 px-3">Additions</th>
                          <th className="py-3.5 px-3">Net Payable</th>
                          <th className="py-3.5 px-3">Status</th>
                          <th className="py-3.5 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                        {loadingMonthlyPayrolls ? (
                          <tr>
                            <td colSpan="9" className="text-center py-14 text-slate-400">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <RotateCcw className="w-6 h-6 animate-spin text-[#588b12]" />
                                <span className="font-bold">Loading monthly payroll data...</span>
                              </div>
                            </td>
                          </tr>
                        ) : filteredMonthlyPayrolls.length === 0 ? (
                          <tr>
                            <td colSpan="9" className="text-center py-14 text-slate-400">
                              No employees found matching the filters for {payrollMonth}.
                            </td>
                          </tr>
                        ) : (
                          filteredMonthlyPayrolls.map((item) => {
                            const additionsTotal =
                              (item.incentives || 0) +
                              (item.performanceBonus || 0) +
                              (item.specialAllowances || 0) +
                              (item.travelAllowance || 0) +
                              (item.otherAdditionalPayments || 0);

                            const dailyRate = item.basicSalary / (item.totalWorkingDays || 26);
                            const otAmount = Math.round((item.overtimeHours || 0) * (dailyRate / 8 || 150));

                            return (
                              <tr
                                key={item.employeeId || item.employeeEID}
                                className="hover:bg-slate-50/70 transition-colors"
                              >
                                {/* Employee Info */}
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-3">
                                    {item.employeeAvatar ? (
                                      <img
                                        src={item.employeeAvatar}
                                        alt={item.employeeName}
                                        className="w-9 h-9 rounded-full object-cover border border-slate-200"
                                      />
                                    ) : (
                                      <div className="w-9 h-9 rounded-full bg-[#588b12]/10 text-[#588b12] font-black text-xs flex items-center justify-center border border-[#588b12]/20">
                                        {item.employeeName?.slice(0, 2).toUpperCase() || 'EM'}
                                      </div>
                                    )}
                                    <div>
                                      <span className="font-bold text-slate-900 block">{item.employeeName}</span>
                                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                        <span className="font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                          {item.employeeEID}
                                        </span>
                                        <span>•</span>
                                        <span>{item.employeeDesignation || 'Staff'}</span>
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Working Days (Excluding Sundays) */}
                                <td className="py-3.5 px-3">
                                  <div className="space-y-0.5">
                                    <span className="font-black text-slate-800 font-sans block">
                                      {item.actualWorkingDays} / {item.totalWorkingDays} days
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-medium block">
                                      {item.actualWorkingHours} hrs worked
                                    </span>
                                  </div>
                                </td>

                                {/* Basic Salary */}
                                <td className="py-3.5 px-3 font-extrabold text-slate-800 font-sans">
                                  ₹{item.basicSalary?.toLocaleString('en-IN')}
                                </td>

                                {/* Overtime */}
                                <td className="py-3.5 px-3">
                                  {item.overtimeHours > 0 ? (
                                    <div>
                                      <span className="font-bold text-lime-700 block font-sans">
                                        +{item.overtimeHours} hrs
                                      </span>
                                      <span className="text-[10px] text-lime-600 font-semibold block">
                                        +₹{otAmount?.toLocaleString('en-IN')}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 font-normal">0 hrs</span>
                                  )}
                                </td>

                                {/* Leaves & Deductions */}
                                <td className="py-3.5 px-3">
                                  <div className="space-y-0.5">
                                    <span className="text-[11px] text-slate-600 block">
                                      {item.paidLeavesCount || 0} Paid • {item.unpaidLeavesCount || 0} Unpaid
                                    </span>
                                    {item.leaveDeductions > 0 ? (
                                      <span className="text-[11px] font-bold text-rose-600 font-sans block">
                                        -₹{item.leaveDeductions?.toLocaleString('en-IN')}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400">₹0 Ded.</span>
                                    )}
                                  </div>
                                </td>

                                {/* Additions */}
                                <td className="py-3.5 px-3">
                                  {additionsTotal > 0 ? (
                                    <span className="font-bold text-lime-700 font-sans">
                                      +₹{additionsTotal?.toLocaleString('en-IN')}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">₹0</span>
                                  )}
                                </td>

                                {/* Net Payable */}
                                <td className="py-3.5 px-3">
                                  <span className="text-sm font-black text-[#588b12] font-sans block">
                                    ₹{item.payableSalary?.toLocaleString('en-IN')}
                                  </span>
                                </td>

                                {/* Status */}
                                <td className="py-3.5 px-3">
                                  {item.status === 'Paid' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      <CheckCircle2 className="w-3 h-3" /> Paid
                                    </span>
                                  ) : item.status === 'Draft' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                                      <Clock className="w-3 h-3" /> Draft
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                                      <AlertCircle className="w-3 h-3" /> Unprocessed
                                    </span>
                                  )}
                                </td>

                                {/* Action Buttons: Edit, View Slip, Mark Paid */}
                                <td className="py-3.5 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {/* Edit Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEdit(item)}
                                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-all cursor-pointer"
                                      title="Edit All Details"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>

                                    {/* View Payslip Modal */}
                                    <button
                                      type="button"
                                      onClick={() => setViewingPayslip(item)}
                                      className="p-1.5 rounded-lg border border-[#588b12]/30 bg-[#588b12]/5 hover:bg-[#588b12]/15 text-[#588b12] transition-all cursor-pointer"
                                      title="View & Print Payslip"
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Quick Mark Paid */}
                                    {item.status !== 'Paid' && (
                                      <button
                                        type="button"
                                        onClick={() => handleQuickMarkPaid(item)}
                                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                                        title="Mark as Paid"
                                      >
                                        <Check className="w-3 h-3" />
                                        Pay
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* VIEW 2: INDIVIDUAL CALCULATOR & OVERRIDES PANEL */}
              {payrollSubTab === 'calculator' && (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
                  {/* Selector Card */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 h-fit">
                    <h3 className="font-extrabold text-slate-900 text-base">Select Employee to Calculate</h3>
                    <div className="space-y-3">
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
                        Please select an employee to load calculation details.
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
                            <span className="text-xl font-extrabold text-slate-800">{payrollData.totalWorkingDays} Days (Excl. Sun)</span>
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
                          <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider border-b border-slate-100 pb-1">Earnings & Deductions</h4>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className="text-xs font-bold text-slate-700 uppercase">Basic Salary (₹)</label>
                              <input
                                type="number"
                                value={payrollOverride.basicSalary}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setPayrollOverride(prev => {
                                    const net = val - prev.leaveDeductions + (prev.overtimeHours * (val / (payrollData.totalWorkingDays || 26) / 8 || 150)) + prev.incentives + prev.performanceBonus + prev.specialAllowances + prev.travelAllowance + prev.otherAdditionalPayments;
                                    return { ...prev, basicSalary: val, payableSalary: Math.round(net) };
                                  });
                                }}
                                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-bold text-slate-700 uppercase">Overtime Hours</label>
                              <input
                                type="number"
                                step="0.5"
                                value={payrollOverride.overtimeHours}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setPayrollOverride(prev => {
                                    const dailyRate = prev.basicSalary / (payrollData.totalWorkingDays || 26);
                                    const net = prev.basicSalary - prev.leaveDeductions + (val * (dailyRate / 8 || 150)) + prev.incentives + prev.performanceBonus + prev.specialAllowances + prev.travelAllowance + prev.otherAdditionalPayments;
                                    return { ...prev, overtimeHours: val, payableSalary: Math.round(net) };
                                  });
                                }}
                                className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-lime-700"
                              />
                            </div>

                            <div>
                              <label className="text-xs font-bold text-slate-700 uppercase">Leave Deductions (₹)</label>
                              <input
                                type="number"
                                value={payrollOverride.leaveDeductions}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setPayrollOverride(prev => {
                                    const dailyRate = prev.basicSalary / (payrollData.totalWorkingDays || 26);
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
                                  const dailyRate = payrollOverride.basicSalary / (payrollData.totalWorkingDays || 26);
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
                                    const dailyRate = prev.basicSalary / (payrollData.totalWorkingDays || 26);
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
                                    const dailyRate = prev.basicSalary / (payrollData.totalWorkingDays || 26);
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
                                    const dailyRate = prev.basicSalary / (payrollData.totalWorkingDays || 26);
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
                                    const dailyRate = prev.basicSalary / (payrollData.totalWorkingDays || 26);
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
                                    const dailyRate = prev.basicSalary / (payrollData.totalWorkingDays || 26);
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
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Net Payable Salary</span>
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
              )}

              {/* EDIT PAYROLL MODAL (All Filled Data + Live Recalculation + Full Edit Support) */}
              {editingPayroll && editForm && (
                <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
                  <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden max-h-[92vh] flex flex-col">
                    {/* Modal Header */}
                    <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 flex items-center justify-between text-white">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-lg text-white">Edit Employee Payroll</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/20 text-white">
                            {editForm.month}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {editForm.employeeName} ({editForm.employeeEID}) • Working Days (Excl. Sundays): {editForm.totalWorkingDays} Days
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPayroll(null);
                          setEditForm(null);
                        }}
                        className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
                      {/* Attendance Summary Banner */}
                      <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl grid grid-cols-3 gap-3 text-center">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Working Days</span>
                          <span className="text-base font-black text-slate-800">{editForm.totalWorkingDays} Days</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Actual Days Present</span>
                          <span className="text-base font-black text-slate-800">{editForm.actualWorkingDays} Days</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Hours</span>
                          <span className="text-base font-black text-slate-800">{editForm.actualWorkingHours} hrs</span>
                        </div>
                      </div>

                      {/* Primary Earnings & Deductions Inputs */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Basic Salary (₹) *</label>
                          <input
                            type="number"
                            value={editForm.basicSalary}
                            onChange={(e) => handleEditInputChange('basicSalary', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-sm text-slate-900 focus:outline-none focus:border-[#588b12] focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Overtime Hours</label>
                          <input
                            type="number"
                            step="0.5"
                            value={editForm.overtimeHours}
                            onChange={(e) => handleEditInputChange('overtimeHours', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-sm text-lime-700 focus:outline-none focus:border-[#588b12] focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Leave Deductions (₹)</label>
                          <input
                            type="number"
                            value={editForm.leaveDeductions}
                            onChange={(e) => handleEditInputChange('leaveDeductions', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-sm text-rose-600 focus:outline-none focus:border-rose-400 focus:bg-white"
                          />
                        </div>
                      </div>

                      {/* Leaves Breakdown */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Paid Leaves Count</label>
                          <input
                            type="number"
                            value={editForm.paidLeavesCount}
                            onChange={(e) => handleEditInputChange('paidLeavesCount', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-800"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700 uppercase block mb-1">Unpaid Leaves Count</label>
                          <input
                            type="number"
                            value={editForm.unpaidLeavesCount}
                            onChange={(e) => handleEditInputChange('unpaidLeavesCount', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-rose-600"
                          />
                          <span className="text-[10px] text-slate-400 mt-0.5 block">Auto-recalculates leave deduction based on daily rate</span>
                        </div>
                      </div>

                      {/* Incentives, Bonuses & Allowances */}
                      <div className="space-y-2 pt-1">
                        <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] block border-b border-slate-100 pb-1">
                          Incentives & Allowances (Auto-adds to Net Salary)
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">Incentives (₹)</label>
                            <input
                              type="number"
                              value={editForm.incentives}
                              onChange={(e) => handleEditInputChange('incentives', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-lime-700"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">Bonus (₹)</label>
                            <input
                              type="number"
                              value={editForm.performanceBonus}
                              onChange={(e) => handleEditInputChange('performanceBonus', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-lime-700"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">Special (₹)</label>
                            <input
                              type="number"
                              value={editForm.specialAllowances}
                              onChange={(e) => handleEditInputChange('specialAllowances', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-lime-700"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">Travel (₹)</label>
                            <input
                              type="number"
                              value={editForm.travelAllowance}
                              onChange={(e) => handleEditInputChange('travelAllowance', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-lime-700"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">Other (₹)</label>
                            <input
                              type="number"
                              value={editForm.otherAdditionalPayments}
                              onChange={(e) => handleEditInputChange('otherAdditionalPayments', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-lime-700"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Status & Net Payable Salary Box */}
                      <div className="bg-[#f7fee7] border border-[#588b12]/30 p-4.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4">
                        <div>
                          <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                            Net Take Home Salary (₹)
                          </span>
                          <input
                            type="number"
                            value={editForm.payableSalary}
                            onChange={(e) => handleEditInputChange('payableSalary', e.target.value)}
                            className="text-2xl font-black text-[#588b12] bg-white border border-[#588b12]/40 rounded-xl px-3.5 py-1.5 mt-1 w-44 font-sans focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-500 mt-1 block">Recalculates automatically or override directly</span>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">Payment Status</label>
                          <select
                            value={editForm.status}
                            onChange={(e) => handleEditInputChange('status', e.target.value)}
                            className="bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold text-xs text-slate-800"
                          >
                            <option value="Draft">Draft</option>
                            <option value="Paid">Paid</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPayroll(null);
                          setEditForm(null);
                        }}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isSavingEdit}
                        onClick={() => handleSaveEditPayroll('Draft')}
                        className="px-4.5 py-2.5 rounded-xl border border-slate-300 text-slate-800 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                      >
                        Save as Draft
                      </button>
                      <button
                        type="button"
                        disabled={isSavingEdit}
                        onClick={() => handleSaveEditPayroll('Paid')}
                        className="px-5 py-2.5 bg-[#588b12] hover:bg-[#4a750f] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        Save & Mark as Paid
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* PAYSLIP VIEW & PRINT MODAL */}
              {viewingPayslip && (
                <PayslipModal
                  selectedPayslip={viewingPayslip}
                  employeeDetails={
                    employees.find(
                      (e) =>
                        String(e._id) === String(viewingPayslip.employeeId) ||
                        e.employeeId === viewingPayslip.employeeEID ||
                        e.id === viewingPayslip.employeeEID
                    ) || {
                      designation: viewingPayslip.employeeDesignation,
                      department: viewingPayslip.employeeDepartment,
                      email: viewingPayslip.employeeEmail,
                    }
                  }
                  onClose={() => setViewingPayslip(null)}
                />
              )}
            </div>
          )}

          {/* Active Tab: Leaves */}
          {activeTab === 'Leaves' && (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Employee Leaves Management</h2>
                    <p className="text-xs text-slate-500 mt-1">Review employee leave applications, balances, approvals, and history</p>
                  </div>
                  <button
                    onClick={() => setIsApplyingLeave(true)}
                    className="bg-[#588b12] hover:bg-[#4a750f] text-white px-4.5 py-2.5 rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer animate-fade-in"
                  >
                    <Plus className="w-4 h-4" />
                    Apply Leave (On Behalf)
                  </button>
                </div>

                {/* KPI Cards Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Applications</p>
                      <h4 className="text-xl font-extrabold text-slate-900 mt-0.5">{leaves.length}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">All historical requests</p>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Pending Approval</p>
                      <h4 className="text-xl font-extrabold text-amber-700 mt-0.5">{pendingCount}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Requires HR action</p>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-lime-50 text-lime-700 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-lime-700">Approved Leaves</p>
                      <h4 className="text-xl font-extrabold text-lime-700 mt-0.5">{approvedCount}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Deducted from balance</p>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Rejected</p>
                      <h4 className="text-xl font-extrabold text-rose-700 mt-0.5">{rejectedCount}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Declined applications</p>
                    </div>
                  </div>
                </div>

                {/* Filters Row */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Search</label>
                    <div className="relative">
                      <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search employee name, ID, reason..."
                        value={leaveSearchQuery}
                        onChange={(e) => setLeaveSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:border-[#588b12] font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Status</label>
                    <select
                      value={leaveStatusFilter}
                      onChange={(e) => setLeaveStatusFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#588b12] font-semibold text-slate-700"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Pending HR">Pending HR</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Leave Type</label>
                    <select
                      value={leaveTypeFilter}
                      onChange={(e) => setLeaveTypeFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#588b12] font-semibold text-slate-700"
                    >
                      <option value="All">All Leave Types</option>
                      <option value="Casual Leave">Casual Leave</option>
                      <option value="Sick Leave">Sick Leave</option>
                      <option value="Paid Annual Leave">Paid Annual Leave</option>
                      <option value="Unpaid Sick Leave">Unpaid Sick Leave</option>
                    </select>
                  </div>
                </div>

                {/* Leaves Table */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 text-base">Employee Leave Applications</h3>
                    <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-3 py-1 rounded-full">
                      Showing: {filteredLeaves.length} of {leaves.length}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                          <th className="px-6 py-4">Employee</th>
                          <th className="px-6 py-4">Leave Type</th>
                          <th className="px-6 py-4">Dates & Duration</th>
                          <th className="px-6 py-4">Reason</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150/80 text-sm">
                        {filteredLeaves.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="text-center py-10 text-slate-400 font-medium">
                              No leave applications match the selected filters.
                            </td>
                          </tr>
                        ) : (
                          filteredLeaves.map((l) => {
                            const emp = employees.find(
                              (e) =>
                                e.employeeId === l.employeeEID ||
                                e.id === l.employeeEID ||
                                e._id === l.employeeId
                            );
                            const startStr = new Date(l.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                            const endStr = new Date(l.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                            const datesFormatted = l.startDate === l.endDate ? startStr : `${startStr} – ${endStr}`;
                            
                            const diffDays = Math.ceil(Math.abs(new Date(l.endDate || l.startDate) - new Date(l.startDate)) / (1000 * 60 * 60 * 24)) + 1;

                            return (
                              <tr key={l._id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs shrink-0 overflow-hidden">
                                      {emp?.profilePhoto ? (
                                        <img src={emp.profilePhoto} alt={l.employeeName} className="w-full h-full object-cover" />
                                      ) : (
                                        (l.employeeName || 'E').charAt(0).toUpperCase()
                                      )}
                                    </div>
                                    <div>
                                      <div className="font-bold text-slate-900">{l.employeeName}</div>
                                      <div className="text-xs text-slate-400 font-mono">{l.employeeEID} • {emp?.designation || 'Staff'}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold border ${
                                    l.type === 'Casual Leave' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    l.type === 'Sick Leave' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                    'bg-blue-50 text-blue-700 border-blue-200'
                                  }`}>
                                    {l.type}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="font-semibold text-slate-800">{datesFormatted}</div>
                                  <span className="inline-block mt-0.5 text-[11px] font-extrabold text-[#588b12] bg-lime-50 px-2 py-0.5 rounded border border-lime-200">
                                    {diffDays} {diffDays === 1 ? 'Day' : 'Days'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-slate-600 font-medium max-w-[220px] truncate" title={l.reason}>
                                  {l.reason || "—"}
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                                    l.status === 'Approved' ? 'bg-lime-50 text-lime-700 border-lime-200' :
                                    l.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                    'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                      l.status === 'Approved' ? 'bg-lime-500' :
                                      l.status === 'Rejected' ? 'bg-rose-500' : 'bg-amber-500'
                                    }`} />
                                    {l.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {l.status === "Pending HR" && (
                                      <>
                                        <button
                                          onClick={() => handleUpdateLeaveStatus(l._id, "Approved")}
                                          className="px-3 py-1.5 bg-[#588b12] hover:bg-[#4a750f] text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm transition-all"
                                        >
                                          Approve
                                        </button>
                                        <button
                                          onClick={() => handleUpdateLeaveStatus(l._id, "Rejected")}
                                          className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-xl cursor-pointer shadow-sm transition-all"
                                        >
                                          Reject
                                        </button>
                                      </>
                                    )}
                                    {l.status === "Approved" && (
                                      <button
                                        onClick={() => handleUpdateLeaveStatus(l._id, "Rejected")}
                                        className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 cursor-pointer"
                                      >
                                        Revoke
                                      </button>
                                    )}
                                    {l.status === "Rejected" && (
                                      <button
                                        onClick={() => handleUpdateLeaveStatus(l._id, "Approved")}
                                        className="px-2.5 py-1 text-xs font-semibold text-[#588b12] hover:bg-lime-50 rounded-lg border border-lime-200 cursor-pointer"
                                      >
                                        Approve
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDeleteLeave(l._id)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                      title="Delete Request"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
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

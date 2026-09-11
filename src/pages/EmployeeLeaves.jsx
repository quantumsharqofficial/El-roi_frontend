import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  CalendarDays,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Mail,
  Phone,
  Briefcase,
  Filter,
  Plus,
  RefreshCw,
  Sparkles,
  FileText,
  Building2,
  Check,
  X,
  HeartPulse,
  Coffee
} from 'lucide-react';
import AxiosInstance from '../utilities/AxiosInstance';
import Sidebar from '../layouts/Sidebar';
import Navbar from '../layouts/Navbar';
import { toast } from 'sonner';

// Format UTC / IST date to readable string
const formatDisplayDate = (dateVal) => {
  if (!dateVal) return 'N/A';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

// Format month string YYYY-MM to Month Name Year (e.g., "September 2026")
const formatMonthTitle = (monthStr) => {
  if (!monthStr || !monthStr.includes('-')) return monthStr;
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

// Calculate days between two dates inclusive
const calculateDays = (startDate, endDate) => {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : start;
  const d1 = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const d2 = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  const diff = Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diff);
};

export default function EmployeeLeaves() {
  const { id, employeeId } = useParams();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [employeeInfo, setEmployeeInfo] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  // Month & View Filters
  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'all'
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Approved' | 'Pending HR' | 'Rejected'
  const [typeFilter, setTypeFilter] = useState('All');

  // Quick Apply Leave Modal
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyForm, setApplyForm] = useState({
    type: 'Paid Annual Leave',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // 1. Fetch Employee Details
  const fetchEmployee = async () => {
    try {
      const res = await AxiosInstance.get(`/employees/${id}`);
      setEmployeeInfo(res.data);
    } catch (err) {
      console.error('Error fetching employee:', err);
      toast.error('Failed to load employee info.');
    }
  };

  // 2. Fetch Employee Leaves
  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const empIdParam = employeeId || employeeInfo?.employeeId || id;
      // Fetch directly for this employee
      const res = await AxiosInstance.get(`/leaves/employee/${empIdParam}`);
      let empLeaves = Array.isArray(res.data) ? res.data : [];

      // Fallback: if leaves endpoint returned empty, check all leaves for safety
      if (empLeaves.length === 0) {
        const allRes = await AxiosInstance.get('/leaves');
        if (Array.isArray(allRes.data)) {
          empLeaves = allRes.data.filter(
            (l) =>
              l.employeeId === id ||
              l.employeeEID === empIdParam ||
              l.employeeId === empIdParam
          );
        }
      }

      setLeaves(empLeaves);
    } catch (err) {
      console.error('Error fetching leaves:', err);
      toast.error('Failed to load leave records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchEmployee();
  }, [id]);

  useEffect(() => {
    if (id || employeeId) fetchLeaves();
  }, [id, employeeId]);

  // Navigate month
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    const newMonthStr = prevDate.toISOString().slice(0, 7);
    setSelectedMonth(newMonthStr);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(year, month, 1);
    const newMonthStr = nextDate.toISOString().slice(0, 7);
    setSelectedMonth(newMonthStr);
  };

  // Update Leave Status (Approve / Reject)
  const handleUpdateStatus = async (leaveId, newStatus) => {
    try {
      await AxiosInstance.put(`/leaves/${leaveId}`, { status: newStatus });
      toast.success(`Leave request marked as ${newStatus}`);
      fetchLeaves();
      fetchEmployee(); // update balances
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update leave status.');
    }
  };

  // Submit Apply Leave
  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!applyForm.startDate) {
      toast.error('Please select start date.');
      return;
    }

    const empIdParam = employeeId || employeeInfo?.employeeId || id;
    setSubmittingLeave(true);
    try {
      await AxiosInstance.post('/leaves', {
        employeeId: id || empIdParam,
        type: applyForm.type,
        startDate: applyForm.startDate,
        endDate: applyForm.endDate || applyForm.startDate,
        reason: applyForm.reason
      });
      toast.success('Leave applied successfully!');
      setShowApplyModal(false);
      setApplyForm({
        type: 'Paid Annual Leave',
        startDate: '',
        endDate: '',
        reason: ''
      });
      fetchLeaves();
      fetchEmployee();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply leave.');
    } finally {
      setSubmittingLeave(false);
    }
  };

  // Compute Accurate Balances
  const getLeaveStats = (typeName) => {
    const DEFAULT_TOTAL = 12;
    const normalized = (typeName || '').toLowerCase().trim();

    const balanceObj = (employeeInfo?.leaveBalances || []).find((b) => {
      const bType = (b.leaveType || '').toLowerCase().trim();
      if (bType === normalized) return true;
      if (normalized.includes('casual') && bType.includes('casual')) return true;
      if ((normalized.includes('sick') || normalized.includes('medical')) && (bType.includes('sick') || bType.includes('medical'))) return true;
      if ((normalized.includes('annual') || normalized.includes('paid')) && (bType.includes('annual') || bType.includes('paid'))) return true;
      return false;
    });

    const totalAllowed = balanceObj?.allowedDays && balanceObj.allowedDays > 0 ? balanceObj.allowedDays : DEFAULT_TOTAL;
    const backendTaken = Number(balanceObj?.takenLeaves) || 0;

    const approvedFromLeaves = leaves
      .filter((l) => {
        if (l.status !== 'Approved') return false;
        const lType = (l.type || '').toLowerCase().trim();
        if (normalized.includes('casual')) return lType.includes('casual');
        if (normalized.includes('sick') || normalized.includes('medical')) return lType.includes('sick') || lType.includes('medical');
        if (normalized.includes('annual') || normalized.includes('paid')) return lType.includes('annual') || lType.includes('paid');
        return lType === normalized;
      })
      .reduce((acc, l) => acc + calculateDays(l.startDate, l.endDate), 0);

    const taken = Math.max(backendTaken, approvedFromLeaves);
    const available = Math.max(0, totalAllowed - taken);

    return { totalAllowed, taken, available };
  };

  const annualStats = getLeaveStats('Paid Annual Leave');
  const sickStats = getLeaveStats('Sick Leave');
  const casualStats = getLeaveStats('Casual Leave');

  // Filter leaves based on selected month & filters
  const filteredLeaves = useMemo(() => {
    return leaves.filter((l) => {
      // Month match (either start or end date matches selected month, or starts in month)
      if (viewMode === 'month') {
        const sMonth = l.startDate ? new Date(l.startDate).toISOString().slice(0, 7) : '';
        const eMonth = l.endDate ? new Date(l.endDate).toISOString().slice(0, 7) : sMonth;
        const matchesMonth = sMonth === selectedMonth || eMonth === selectedMonth;
        if (!matchesMonth) return false;
      }

      // Status filter
      if (statusFilter !== 'All' && l.status !== statusFilter) return false;

      // Type filter
      if (typeFilter !== 'All') {
        const lType = (l.type || '').toLowerCase();
        const tFilter = typeFilter.toLowerCase();
        if (!lType.includes(tFilter) && !tFilter.includes(lType)) return false;
      }

      return true;
    });
  }, [leaves, selectedMonth, viewMode, statusFilter, typeFilter]);

  // Monthly stats for the selected month
  const monthApprovedDays = useMemo(() => {
    return leaves
      .filter((l) => {
        if (l.status !== 'Approved') return false;
        const sMonth = l.startDate ? new Date(l.startDate).toISOString().slice(0, 7) : '';
        return sMonth === selectedMonth;
      })
      .reduce((acc, l) => acc + calculateDays(l.startDate, l.endDate), 0);
  }, [leaves, selectedMonth]);

  const monthPendingCount = useMemo(() => {
    return leaves.filter((l) => {
      if (l.status !== 'Pending HR') return false;
      const sMonth = l.startDate ? new Date(l.startDate).toISOString().slice(0, 7) : '';
      return sMonth === selectedMonth;
    }).length;
  }, [leaves, selectedMonth]);

  // Group leaves by Month for "all" view
  const groupedByMonth = useMemo(() => {
    if (viewMode !== 'all') return [];
    const map = {};

    filteredLeaves.forEach((l) => {
      const mKey = l.startDate ? new Date(l.startDate).toISOString().slice(0, 7) : 'Unknown';
      if (!map[mKey]) {
        map[mKey] = {
          monthKey: mKey,
          title: formatMonthTitle(mKey),
          leaves: [],
          totalApprovedDays: 0,
        };
      }
      map[mKey].leaves.push(l);
      if (l.status === 'Approved') {
        map[mKey].totalApprovedDays += calculateDays(l.startDate, l.endDate);
      }
    });

    return Object.values(map).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [filteredLeaves, viewMode]);

  const empFullName = employeeInfo
    ? [employeeInfo.firstName, employeeInfo.lastName].filter(Boolean).join(' ')
    : 'Employee';

  const profilePhotoUrl = employeeInfo?.profilePhoto
    ? employeeInfo.profilePhoto.startsWith('http')
      ? employeeInfo.profilePhoto
      : `${AxiosInstance.defaults.baseURL?.replace('/api', '')}${employeeInfo.profilePhoto}`
    : null;

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-800 lg:pl-56">
      {/* Admin Sidebar */}
      <Sidebar
        variant="admin"
        activeTab="Employees"
        onTabChange={(tab) => {
          localStorage.setItem('adminActiveTab', tab);
          navigate('/admin-dashboard');
        }}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Navbar */}
      <Navbar title="Employee Leave History" onMobileMenuOpen={() => setMobileMenuOpen(true)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 pt-[60px]">
        <main className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">

          {/* Top Breadcrumbs & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/admin-dashboard')}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer bg-white shadow-sm"
                title="Back to Employees"
              >
                <ArrowLeft className="w-4 h-4 text-slate-600" />
              </button>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Employee Leave History
                </h1>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {empFullName} • <span className="font-mono font-bold text-slate-700">{employeeInfo?.employeeId || employeeId}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  fetchEmployee();
                  fetchLeaves();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-sm cursor-pointer transition-all"
                title="Refresh Leaves"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                Refresh
              </button>
              <button
                onClick={() => setShowApplyModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#588b12] hover:bg-[#4a750f] text-white text-xs font-bold shadow-md shadow-lime-900/10 cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Apply Leave
              </button>
            </div>
          </div>

          {/* Employee Header Overview Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#588b12] to-[#76b81d] p-0.5 shadow-md shrink-0">
                <div className="w-full h-full rounded-[14px] bg-white overflow-hidden flex items-center justify-center font-black text-[#588b12] text-xl">
                  {profilePhotoUrl ? (
                    <img src={profilePhotoUrl} alt={empFullName} className="w-full h-full object-cover" />
                  ) : (
                    empFullName.charAt(0).toUpperCase()
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg font-black text-slate-900">{empFullName}</h2>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                    {employeeInfo?.employeeType || 'Full-time'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1 flex flex-wrap items-center gap-3">
                  <span>{employeeInfo?.designation || 'Staff'}</span>
                  <span>•</span>
                  <span>{employeeInfo?.department || 'Department'}</span>
                  {employeeInfo?.email && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{employeeInfo.email}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Total Annual Stats Chips */}
            <div className="flex items-center gap-3 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100 flex-wrap">
              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl min-w-[110px]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Annual Leave</div>
                <div className="text-base font-black text-slate-900 mt-0.5">
                  {annualStats.available} <span className="text-xs font-semibold text-slate-400">/ {annualStats.totalAllowed}</span>
                </div>
              </div>
              <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-2xl min-w-[110px]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Sick Leave</div>
                <div className="text-base font-black text-slate-900 mt-0.5">
                  {sickStats.available} <span className="text-xs font-semibold text-slate-400">/ {sickStats.totalAllowed}</span>
                </div>
              </div>
              <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-2xl min-w-[110px]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Casual Leave</div>
                <div className="text-base font-black text-slate-900 mt-0.5">
                  {casualStats.available} <span className="text-xs font-semibold text-slate-400">/ {casualStats.totalAllowed}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Month Selector Bar & View Mode Switcher */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* View Mode Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'month'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Monthly Filter
              </button>
              <button
                onClick={() => setViewMode('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'all'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All Months Grouped
              </button>
            </div>

            {/* Month Navigation (Active in 'month' mode) */}
            {viewMode === 'month' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevMonth}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200">
                  <Calendar className="w-4 h-4 text-[#588b12]" />
                  <span className="text-sm font-bold text-slate-900">
                    {formatMonthTitle(selectedMonth)}
                  </span>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
                    className="opacity-0 w-4 h-4 absolute cursor-pointer"
                    title="Change Month"
                  />
                </div>

                <button
                  onClick={handleNextMonth}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {selectedMonth !== currentMonthStr && (
                  <button
                    onClick={() => setSelectedMonth(currentMonthStr)}
                    className="text-xs font-bold text-[#588b12] hover:underline ml-1 cursor-pointer"
                  >
                    Current Month
                  </button>
                )}
              </div>
            )}

            {/* Quick Filters: Type & Status */}
            <div className="flex items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:border-[#588b12]"
              >
                <option value="All">All Types</option>
                <option value="Paid Annual Leave">Annual</option>
                <option value="Sick Leave">Sick</option>
                <option value="Casual Leave">Casual</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:border-[#588b12]"
              >
                <option value="All">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Pending HR">Pending HR</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Month Overview Metrics (When in 'month' mode) */}
          {viewMode === 'month' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Approved Leaves in {formatMonthTitle(selectedMonth)}
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {monthApprovedDays} <span className="text-sm font-semibold text-slate-500">Days</span>
                  </div>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Pending Requests in {formatMonthTitle(selectedMonth)}
                  </div>
                  <div className="text-2xl font-black text-amber-600 mt-1">
                    {monthPendingCount} <span className="text-sm font-semibold text-slate-500">Requests</span>
                  </div>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Leave Records Found
                  </div>
                  <div className="text-2xl font-black text-slate-800 mt-1">
                    {filteredLeaves.length} <span className="text-sm font-semibold text-slate-500">Total</span>
                  </div>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <CalendarDays className="w-5 h-5" />
                </div>
              </div>
            </div>
          )}

          {/* Leave Records List Section */}
          <div className="space-y-4">
            {loading ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#588b12]" />
                <p className="text-xs font-bold">Loading leave records...</p>
              </div>
            ) : viewMode === 'month' ? (
              /* Single Month View Table */
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-[#588b12]" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Leave Records for {formatMonthTitle(selectedMonth)}
                    </h3>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-600">
                    {filteredLeaves.length} {filteredLeaves.length === 1 ? 'Record' : 'Records'}
                  </span>
                </div>

                {filteredLeaves.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 text-xs">
                    <CalendarDays className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No leave records found for {formatMonthTitle(selectedMonth)}.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-3.5">Leave Type</th>
                          <th className="px-6 py-3.5">Date Range</th>
                          <th className="px-6 py-3.5">Duration</th>
                          <th className="px-6 py-3.5">Reason</th>
                          <th className="px-6 py-3.5">Status</th>
                          <th className="px-6 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredLeaves.map((leave) => {
                          const days = calculateDays(leave.startDate, leave.endDate);
                          const isAnnual = (leave.type || '').toLowerCase().includes('annual');
                          const isSick = (leave.type || '').toLowerCase().includes('sick');
                          const isCasual = (leave.type || '').toLowerCase().includes('casual');

                          return (
                            <tr key={leave._id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-6 py-4">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                                    isAnnual
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : isSick
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : isCasual
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-blue-50 text-blue-700 border-blue-200'
                                  }`}
                                >
                                  {isAnnual && <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />}
                                  {isSick && <HeartPulse className="w-3.5 h-3.5 text-rose-600" />}
                                  {isCasual && <Coffee className="w-3.5 h-3.5 text-amber-600" />}
                                  {leave.type || 'Leave'}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-semibold text-slate-800">
                                {formatDisplayDate(leave.startDate)}
                                {leave.endDate && leave.endDate !== leave.startDate && ` – ${formatDisplayDate(leave.endDate)}`}
                              </td>
                              <td className="px-6 py-4 font-black text-slate-900">
                                <span className="inline-block bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold text-slate-700 border border-slate-200">
                                  {days} {days === 1 ? 'Day' : 'Days'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={leave.reason}>
                                {leave.reason || '—'}
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                                    leave.status === 'Approved'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : leave.status === 'Pending HR'
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-red-50 text-red-700 border border-red-200'
                                  }`}
                                >
                                  {leave.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {leave.status === 'Pending HR' && (
                                    <>
                                      <button
                                        onClick={() => handleUpdateStatus(leave._id, 'Approved')}
                                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => handleUpdateStatus(leave._id, 'Rejected')}
                                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}
                                  {leave.status === 'Approved' && (
                                    <button
                                      onClick={() => handleUpdateStatus(leave._id, 'Rejected')}
                                      className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold border border-rose-200 cursor-pointer"
                                    >
                                      Revoke
                                    </button>
                                  )}
                                  {leave.status === 'Rejected' && (
                                    <button
                                      onClick={() => handleUpdateStatus(leave._id, 'Approved')}
                                      className="px-2.5 py-1 text-emerald-600 hover:bg-emerald-50 rounded-lg text-xs font-semibold border border-emerald-200 cursor-pointer"
                                    >
                                      Approve
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              /* All Months Grouped View */
              <div className="space-y-6">
                {groupedByMonth.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
                    No leave records found matching filters.
                  </div>
                ) : (
                  groupedByMonth.map((group) => (
                    <div key={group.monthKey} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                      {/* Month Header Banner */}
                      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#588b12] font-black text-sm">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-slate-900">{group.title}</h3>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {group.leaves.length} {group.leaves.length === 1 ? 'Application' : 'Applications'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {group.totalApprovedDays} {group.totalApprovedDays === 1 ? 'Day Approved' : 'Days Approved'}
                          </span>
                        </div>
                      </div>

                      {/* Leaves in this month */}
                      <div className="divide-y divide-slate-100">
                        {group.leaves.map((leave) => {
                          const days = calculateDays(leave.startDate, leave.endDate);
                          const isAnnual = (leave.type || '').toLowerCase().includes('annual');
                          const isSick = (leave.type || '').toLowerCase().includes('sick');
                          const isCasual = (leave.type || '').toLowerCase().includes('casual');

                          return (
                            <div key={leave._id} className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="flex items-start gap-3">
                                <span
                                  className={`mt-0.5 inline-flex items-center justify-center w-8 h-8 rounded-xl shrink-0 ${
                                    isAnnual
                                      ? 'bg-emerald-50 text-emerald-600'
                                      : isSick
                                      ? 'bg-rose-50 text-rose-600'
                                      : 'bg-amber-50 text-amber-600'
                                  }`}
                                >
                                  {isAnnual && <CalendarDays className="w-4 h-4" />}
                                  {isSick && <HeartPulse className="w-4 h-4" />}
                                  {isCasual && <Coffee className="w-4 h-4" />}
                                </span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-900">{leave.type}</span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                      {days} {days === 1 ? 'Day' : 'Days'}
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-600 font-semibold mt-1">
                                    {formatDisplayDate(leave.startDate)}
                                    {leave.endDate && leave.endDate !== leave.startDate && ` – ${formatDisplayDate(leave.endDate)}`}
                                  </div>
                                  {leave.reason && (
                                    <p className="text-[11px] text-slate-500 italic mt-0.5">
                                      "{leave.reason}"
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 self-end sm:self-auto">
                                <span
                                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                                    leave.status === 'Approved'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : leave.status === 'Pending HR'
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-red-50 text-red-700 border border-red-200'
                                  }`}
                                >
                                  {leave.status}
                                </span>

                                <div className="flex items-center gap-1">
                                  {leave.status === 'Pending HR' && (
                                    <>
                                      <button
                                        onClick={() => handleUpdateStatus(leave._id, 'Approved')}
                                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => handleUpdateStatus(leave._id, 'Rejected')}
                                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}
                                  {leave.status === 'Approved' && (
                                    <button
                                      onClick={() => handleUpdateStatus(leave._id, 'Rejected')}
                                      className="px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 cursor-pointer"
                                    >
                                      Revoke
                                    </button>
                                  )}
                                  {leave.status === 'Rejected' && (
                                    <button
                                      onClick={() => handleUpdateStatus(leave._id, 'Approved')}
                                      className="px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50 rounded-lg border border-emerald-200 cursor-pointer"
                                    >
                                      Approve
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Quick Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#588b12]" />
                <h3 className="font-black text-slate-900 text-base">Apply Leave on Behalf</h3>
              </div>
              <button
                onClick={() => setShowApplyModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Employee</label>
                <div className="mt-1 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800">
                  {empFullName} ({employeeInfo?.employeeId || employeeId})
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Leave Type</label>
                <select
                  value={applyForm.type}
                  onChange={(e) => setApplyForm({ ...applyForm, type: e.target.value })}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#588b12]"
                >
                  <option value="Paid Annual Leave">Paid Annual Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Unpaid Sick Leave">Unpaid Sick Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={applyForm.startDate}
                    onChange={(e) => setApplyForm({ ...applyForm, startDate: e.target.value })}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#588b12]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">End Date</label>
                  <input
                    type="date"
                    value={applyForm.endDate}
                    onChange={(e) => setApplyForm({ ...applyForm, endDate: e.target.value })}
                    className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#588b12]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Reason / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional reason for leave..."
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-medium focus:outline-none focus:border-[#588b12]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLeave}
                  className="px-5 py-2 rounded-xl bg-[#588b12] hover:bg-[#4a750f] text-white text-xs font-bold shadow-md shadow-lime-900/10 transition-all cursor-pointer"
                >
                  {submittingLeave ? 'Submitting...' : 'Submit Leave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

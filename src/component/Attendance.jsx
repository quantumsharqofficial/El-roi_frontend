import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  X,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  TrendingUp,
  BarChart2,
  User,
  Eye,
  CalendarDays
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AxiosInstance from '../utilities/AxiosInstance';

// Helper to format time to 12-hour IST (AM/PM)
const formatToIST12Hour = (timeVal) => {
  if (!timeVal || timeVal === 'N/A' || timeVal === 'Present') return timeVal || 'N/A';
  if (typeof timeVal === 'string' && (timeVal.toUpperCase() === 'IN PROGRESS...' || timeVal === '--:--')) return timeVal;

  if (timeVal instanceof Date || (typeof timeVal === 'string' && (timeVal.includes('T') || timeVal.includes('Z')))) {
    const d = new Date(timeVal);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    }
  }

  if (typeof timeVal === 'string') {
    const trimmed = timeVal.trim();
    if (/am|pm/i.test(trimmed)) return trimmed;

    const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (match) {
      let hrs = parseInt(match[1], 10);
      const mins = match[2];
      const period = hrs >= 12 ? 'PM' : 'AM';
      hrs = hrs % 12;
      if (hrs === 0) hrs = 12;
      return `${hrs.toString().padStart(2, '0')}:${mins} ${period}`;
    }
  }

  return timeVal;
};

// Calculate duration between two time strings
const calculateHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut || checkIn === 'N/A' || checkOut === 'N/A' || checkOut === 'Present') return 'N/A';
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
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  } catch (e) {
    return 'N/A';
  }
};

export default function Attendance({ employees = [] }) {
  const navigate = useNavigate();

  // Mode state: 'daily' | 'monthly'
  const [viewMode, setViewMode] = useState('daily');

  // Daily Attendance Log State
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState('All');
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);
  
  // Daily Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);

  // Monthly Summary State
  const [summaryMonth, setSummaryMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [monthlyData, setMonthlyData] = useState(null);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [monthlySearch, setMonthlySearch] = useState('');
  const [selectedBreakdownEmp, setSelectedBreakdownEmp] = useState(null);
  const [breakdownTab, setBreakdownTab] = useState('daily'); // 'daily' | 'home'

  const [attendanceFormData, setAttendanceFormData] = useState({
    employee_ID: '',
    date: new Date().toISOString().split('T')[0],
    checkInTime: '09:00',
    checkOutTime: '17:00',
    status: 'Present'
  });

  // Fetch Daily Logs using the new Attendance API
  const fetchLogs = () => {
    AxiosInstance.get(`/new-attendance/finddate/${attendanceDate}`)
      .then(res => {
        const rawList = Array.isArray(res.data) 
          ? res.data 
          : (res.data?.data || []);

        const formatted = rawList.map(log => {
          const emp = employees.find(e => 
            e.id === log.employee_ID || 
            e._id === log.employee_ID || 
            e.employeeId === log.employee_ID
          ) || log.employeeDetails;

          const empDbId = emp?._id || emp?.id;
          const empBusinessId = emp?.employeeId || emp?.id || log.employee_ID;

          const firstIn = formatToIST12Hour(log.firstinTime || log.checkInTime);
          const firstOut = log.firstoutTime 
            ? formatToIST12Hour(log.firstoutTime) 
            : (log.checkOutTime ? formatToIST12Hour(log.checkOutTime) : (log.firstinTime && !log.secondinTime ? 'In Progress...' : '--:--'));

          const secondIn = log.secondinTime 
            ? formatToIST12Hour(log.secondinTime) 
            : '--:--';
          const secondOut = log.secondoutTime 
            ? formatToIST12Hour(log.secondoutTime) 
            : (log.secondinTime ? 'In Progress...' : '--:--');

          let hoursDisplay = 'N/A';
          if (log.workingHours !== undefined && log.workingHours !== null) {
            const wh = Number(log.workingHours);
            if (!isNaN(wh)) {
              hoursDisplay = `${wh} hrs`;
            }
          } else if (log.firstinTime && log.firstoutTime) {
            hoursDisplay = calculateHours(firstIn, firstOut);
          } else if (log.checkInTime && log.checkOutTime) {
            hoursDisplay = calculateHours(log.checkInTime, log.checkOutTime);
          } else if (log.firstinTime || log.secondinTime) {
            hoursDisplay = 'In Progress...';
          }

          return {
            id: log.employee_ID,
            empDbId,
            empBusinessId,
            name: log.employeeName || log.name || (emp ? [emp.firstName, emp.lastName].filter(Boolean).join(' ') || emp.name : log.employee_ID),
            designation: log.designation || emp?.designation || 'Staff',
            department: log.department || emp?.department || 'General',
            date: log.date
              ? new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')
              : '',
            firstIn,
            firstOut,
            secondIn,
            secondOut,
            firstinTime: log.firstinTime,
            firstoutTime: log.firstoutTime,
            secondinTime: log.secondinTime,
            secondoutTime: log.secondoutTime,
            checkIn: firstIn,
            checkOut: log.secondoutTime ? secondOut : firstOut,
            firstworkingHours: log.firstworkingHours,
            secondworkingHours: log.secondworkingHours,
            hours: hoursDisplay,
            workingHours:
              log.workingHours !== undefined && log.workingHours !== null
                ? log.workingHours
                : ((log.firstworkingHours || 0) + (log.secondworkingHours || 0)),
            status: log.status || 'Present',
            place: log.place || log.address || '',
            avatar: emp?.profilePhoto || log.employeeDetails?.profilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
          };
        });
        setAttendanceLogs(formatted);
      })
      .catch(err => {
        console.warn('Attendance logs not found or empty for this date:', err.message);
        setAttendanceLogs([]);
      });
  };

  useEffect(() => {
    if (viewMode === 'daily') {
      fetchLogs();
    }
  }, [attendanceDate, employees, viewMode]);

  // Fetch Monthly Summary using the New Attendance API
  const fetchMonthlySummary = () => {
    setLoadingMonthly(true);
    AxiosInstance.get(`/new-attendance/monthly-summary?month=${summaryMonth}`)
      .then(res => {
        if (res.data && res.data.success) {
          setMonthlyData(res.data);
        }
      })
      .catch(err => {
        console.warn('New attendance monthly-summary request error, falling back to legacy route:', err?.message);
        AxiosInstance.get(`/attendance/monthly-summary?month=${summaryMonth}`)
          .then(res => {
            if (res.data && res.data.success) {
              setMonthlyData(res.data);
            }
          })
          .catch(fallbackErr => {
            console.error('Error fetching monthly summary:', fallbackErr);
            setMonthlyData(null);
          });
      })
      .finally(() => {
        setLoadingMonthly(false);
      });
  };

  useEffect(() => {
    if (viewMode === 'monthly') {
      fetchMonthlySummary();
    }
  }, [summaryMonth, viewMode]);

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    if (!attendanceFormData.employee_ID) {
      toast.error('Please select an employee');
      return;
    }
    setIsSubmittingAttendance(true);
    try {
      const selectedEmp = employees.find(emp => emp.id === attendanceFormData.employee_ID || emp._id === attendanceFormData.employee_ID || emp.employeeId === attendanceFormData.employee_ID);
      const name = selectedEmp ? [selectedEmp.firstName, selectedEmp.lastName].filter(Boolean).join(' ') || selectedEmp.name : 'Unknown';

      // 1. Mark Check-In
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
      fetchLogs();
      if (viewMode === 'monthly') fetchMonthlySummary();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to record attendance');
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  const filteredLogs = attendanceLogs.filter(log => {
    const matchesSearch =
      log.name.toLowerCase().includes(attendanceSearch.toLowerCase()) || 
      log.id.toLowerCase().includes(attendanceSearch.toLowerCase()) ||
      (log.designation && log.designation.toLowerCase().includes(attendanceSearch.toLowerCase()));

    let matchesStatus = attendanceStatusFilter === 'All';
    if (!matchesStatus) {
      const s = (log.status || '').toLowerCase();
      const filter = attendanceStatusFilter.toLowerCase();
      if (filter === 'late' || filter === 'late arrival') {
        matchesStatus = s.includes('late');
      } else {
        matchesStatus = s === filter;
      }
    }
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [attendanceSearch, attendanceStatusFilter, attendanceDate]);

  // Pagination calculations for daily
  const totalEntries = filteredLogs.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage) || 1;
  const activePage = Math.min(currentPage, totalPages);
  
  const indexOfLastLog = activePage * entriesPerPage;
  const indexOfFirstLog = indexOfLastLog - entriesPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);

  // Month navigation helpers
  const goToPreviousMonth = () => {
    const [y, m] = summaryMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    const newMonth = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    setSummaryMonth(newMonth);
  };

  const goToNextMonth = () => {
    const [y, m] = summaryMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    const newMonth = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    setSummaryMonth(newMonth);
  };

  // Filtered monthly summaries
  const filteredMonthlySummaries = (monthlyData?.summaries || []).filter(item => {
    if (!monthlySearch) return true;
    const term = monthlySearch.toLowerCase();
    return (
      item.name.toLowerCase().includes(term) ||
      item.employeeId.toLowerCase().includes(term) ||
      item.designation.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {viewMode === 'daily' ? 'Daily Attendance Log' : 'Monthly Attendance Summary'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {viewMode === 'daily'
              ? 'Review check-in status, Indian Standard Time (IST) timestamps and diagnostic hours'
              : 'Comprehensive month-wise attendance metrics, total hours worked, and overtime (OT) tracking'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Segmented View Switcher */}
          <div className="flex bg-slate-200/80 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'daily'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daily Log
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'monthly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Summary
            </button>
          </div>

          <button
            onClick={() => setIsMarkingAttendance(true)}
            className="bg-[#588b12] hover:bg-[#4a750f] text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Attendance
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODE 1: DAILY ATTENDANCE LOG
      ───────────────────────────────────────────────────────────── */}
      {viewMode === 'daily' && (
        <>
          {/* Filters grid */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Date</label>
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#588b12] font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Status</label>
              <select
                value={attendanceStatusFilter}
                onChange={(e) => setAttendanceStatusFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#588b12] font-semibold text-slate-750"
              >
                <option value="All">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Checked In">Checked In</option>
                <option value="Late Arrival">Late Arrival</option>
                <option value="Early Exit">Early Exit</option>
                <option value="Absent">Absent</option>
                <option value="On Leave">On Leave</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Search</label>
              <div className="relative">
                <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by employee name, ID..."
                  value={attendanceSearch}
                  onChange={(e) => setAttendanceSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:border-[#588b12] font-medium"
                />
              </div>
            </div>
          </div>

          {/* Daily Table for New Attendance */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="px-5 py-4">Employee ID</th>
                    <th className="px-5 py-4">Full Name</th>
                    <th className="px-4 py-4">Designation</th>
                    <th className="px-4 py-4">Session 1 (IST)</th>
                    <th className="px-4 py-4 text-center">1st Work Hours</th>
                    <th className="px-4 py-4">Session 2 (IST)</th>
                    <th className="px-4 py-4 text-center">2nd Work Hours</th>
                    <th className="px-4 py-4 text-center">Total Hours</th>
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150/80 text-sm">
                  {currentLogs.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-8 text-center text-slate-400 font-medium">
                        No attendance records found for this selection.
                      </td>
                    </tr>
                  ) : (
                    currentLogs.map((log) => (
                      <tr key={log.id + (log.date || '')} className="hover:bg-slate-50/40 transition-colors">
                        {/* Employee ID */}
                        <td className="px-5 py-4 font-mono font-bold text-slate-600">
                          {log.id}
                        </td>

                        {/* Full Name & Avatar */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={log.avatar}
                              alt={log.name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0 shadow-xs"
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                              }}
                            />
                            <div>
                              <span className="font-semibold text-slate-900 block leading-tight">{log.name}</span>
                            </div>
                          </div>
                        </td>
                        {/* Designation & Department */}
                        <td className="px-4 py-4 text-slate-600 font-medium">
                          <span>{log.designation}</span>
                          <span className="block text-[11px] text-slate-400 font-normal">{log.department}</span>
                        </td>

                        {/* Session 1 (In / Out) */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1 text-xs">
                            <span className="inline-flex items-center gap-1.5 text-slate-750 font-medium">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                              <span className="text-slate-400 text-[10px] uppercase font-bold w-7">In:</span>
                              <span className="font-semibold text-slate-800">{log.firstIn}</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-slate-750 font-medium">
                              <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0"></span>
                              <span className="text-slate-400 text-[10px] uppercase font-bold w-7">Out:</span>
                              <span className="font-semibold text-slate-800">{log.firstOut}</span>
                            </span>
                          </div>
                        </td>

                        {/* First Work Hours */}
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          {log.firstworkingHours !== undefined && log.firstworkingHours !== null && (log.firstoutTime || log.firstworkingHours > 0 || log.firstworkingHours < 0) ? (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                              Number(log.firstworkingHours) < 0
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              <Clock className="w-3 h-3 text-emerald-600" />
                              {log.firstworkingHours} hrs
                            </span>
                          ) : log.firstinTime && !log.firstoutTime ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              In Progress
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs font-semibold">--</span>
                          )}
                        </td>

                        {/* Session 2 (In / Out) */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1 text-xs">
                            <span className="inline-flex items-center gap-1.5 text-slate-750 font-medium">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                              <span className="text-slate-400 text-[10px] uppercase font-bold w-7">In:</span>
                              <span className="font-semibold text-slate-800">{log.secondIn}</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-slate-750 font-medium">
                              <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0"></span>
                              <span className="text-slate-400 text-[10px] uppercase font-bold w-7">Out:</span>
                              <span className="font-semibold text-slate-800">{log.secondOut}</span>
                            </span>
                          </div>
                        </td>

                        {/* Second Work Hours */}
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          {log.secondworkingHours !== undefined && log.secondworkingHours !== null && (log.secondoutTime || log.secondworkingHours > 0 || log.secondworkingHours < 0) ? (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                              Number(log.secondworkingHours) < 0
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              <Clock className="w-3 h-3 text-emerald-600" />
                              {log.secondworkingHours} hrs
                            </span>
                          ) : log.secondinTime && !log.secondoutTime ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              In Progress
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs font-semibold">--</span>
                          )}
                        </td>

                        {/* Total Working Hours */}
                        <td className="px-4 py-4 text-center font-bold text-slate-800 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                            Number(log.workingHours) < 0 
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}>
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {log.hours}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {log.status === 'Present' && (
                            <span className="px-2.5 py-1 rounded-full bg-lime-100 text-lime-800 text-xs font-bold uppercase inline-flex items-center gap-1">
                              ● Present
                            </span>
                          )}
                          {log.status === 'Checked In' && (
                            <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase inline-flex items-center gap-1">
                              ● Checked In
                            </span>
                          )}
                          {(log.status === 'Late' || log.status === 'Late Arrival') && (
                            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase inline-flex items-center gap-1">
                              ● Late Arrival
                            </span>
                          )}
                          {log.status === 'Early Exit' && (
                            <span className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-bold uppercase inline-flex items-center gap-1">
                              ● Early Exit
                            </span>
                          )}
                          {log.status === 'Absent' && (
                            <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold uppercase inline-flex items-center gap-1">
                              ● Absent
                            </span>
                          )}
                          {log.status === 'On Leave' && (
                            <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold uppercase inline-flex items-center gap-1">
                              ● On Leave
                            </span>
                          )}
                          {!['Present', 'Checked In', 'Late', 'Late Arrival', 'Early Exit', 'Absent', 'On Leave'].includes(log.status) && (
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold uppercase">
                              {log.status}
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        {/* <td className="px-6 py-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => {
                              const emp = employees.find(e => e.id === log.id || e.employeeId === log.id || e._id === log.id);
                              const targetDbId = emp?._id || log.empDbId || log.id;
                              const targetBizId = emp?.employeeId || log.empBusinessId || log.id;
                              navigate(`/employee-tracking/${targetDbId}/${targetBizId}`);
                            }}
                            className="text-[#588b12] hover:text-[#456e0e] text-xs font-bold inline-flex items-center gap-1 cursor-pointer bg-lime-50 hover:bg-lime-100 px-3 py-1.5 rounded-lg border border-lime-200 transition-colors"
                          >
                            Tracking <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </td> */}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-slate-50/60 px-6 py-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {totalEntries === 0 ? 0 : indexOfFirstLog + 1} to {Math.min(indexOfLastLog, totalEntries)} of {totalEntries} entries
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={activePage === 1}
                  className="px-2 py-1 rounded border border-slate-200/60 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white cursor-pointer"
                >
                  &lt;
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 rounded font-bold cursor-pointer transition-all ${
                      activePage === pageNum
                        ? 'bg-[#588b12] text-white'
                        : 'border border-slate-200/60 bg-white text-slate-650 hover:bg-slate-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={activePage === totalPages}
                  className="px-2 py-1 rounded border border-slate-200/60 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white cursor-pointer"
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODE 2: MONTHLY ATTENDANCE SUMMARY
      ───────────────────────────────────────────────────────────── */}
      {viewMode === 'monthly' && (
        <>
          {/* Month Selector Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={goToPreviousMonth}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4.5 h-4.5 text-slate-600" />
              </button>

              <div className="flex items-center gap-2">
                <Calendar className="w-4.5 h-4.5 text-[#588b12]" />
                <span className="font-extrabold text-slate-900 text-base">
                  {monthlyData?.monthName || summaryMonth}
                </span>
              </div>

              <button
                onClick={goToNextMonth}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4.5 h-4.5 text-slate-600" />
              </button>

              <input
                type="month"
                value={summaryMonth}
                onChange={(e) => setSummaryMonth(e.target.value)}
                className="ml-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#588b12]"
              />
            </div>

            <div className="relative w-full md:w-72">
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Filter employee or ID..."
                value={monthlySearch}
                onChange={(e) => setMonthlySearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2 text-xs focus:outline-none focus:border-[#588b12] font-medium"
              />
            </div>
          </div>

          {/* Monthly KPI Stats Cards */}
          {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Working Days</p>
                <h4 className="text-xl font-extrabold text-slate-900 mt-0.5">
                  {monthlyData?.workingDays || 0} <span className="text-xs font-medium text-slate-400">Days</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Excludes Sundays</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-lime-50 text-lime-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Present Logged</p>
                <h4 className="text-xl font-extrabold text-slate-900 mt-0.5">
                  {monthlyData?.overallPresentCount || 0} <span className="text-xs font-medium text-slate-400">Total</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Across all staff</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Overtime (OT)</p>
                <h4 className="text-xl font-extrabold text-amber-600 mt-0.5">
                  {monthlyData?.overallOtFormatted || '0m'}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">{monthlyData?.overallOtHours || 0} hrs logged</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <BarChart2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Avg Attendance Rate</p>
                <h4 className="text-xl font-extrabold text-slate-900 mt-0.5">
                  {monthlyData?.overallAttendanceRate || 0}%
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Monthly Team Average</p>
              </div>
            </div>
          </div> */}

          {/* Monthly Summary Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {loadingMonthly ? (
              <div className="p-12 text-center">
                <div className="w-8 h-8 border-3 border-slate-200 border-t-[#588b12] rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-500 font-medium">Generating Monthly Attendance Summary...</p>
              </div>
            ) : filteredMonthlySummaries.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-base font-bold text-slate-600">No attendance data found for {monthlyData?.monthName || summaryMonth}</p>
                <p className="text-xs text-slate-400 mt-1">Try selecting another month or adjust search filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-4 py-4">Designation</th>
                      <th className="px-3 py-4 text-center">Working Day</th>
                      <th className="px-3 py-4 text-center">Present</th>
                      <th className="px-3 py-4 text-center">Morning Late</th>
                      <th className="px-3 py-4 text-center">Early Check Out</th>
                      <th className="px-3 py-4 text-center">Absent</th>
                      <th className="px-3 py-4 text-center">Leave</th>
                      <th className="px-3 py-4 text-center">Home Visit Count</th>
                      <th className="px-4 py-4 text-center">
                        <span className="inline-flex items-center gap-1">
                          Home <Eye className="w-3.5 h-3.5 text-slate-400" />
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150/80 text-sm">
                    {filteredMonthlySummaries.map((emp) => (
                      <tr key={emp.employeeId} className="hover:bg-slate-50/50 transition-colors">
                        {/* Employee */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs shrink-0 overflow-hidden shadow-xs">
                              {emp.profilePhoto ? (
                                <img
                                  src={emp.profilePhoto}
                                  alt={emp.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                emp.name.charAt(0)
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 leading-tight">{emp.name}</p>
                              <p className="text-[11px] font-mono text-slate-400 mt-0.5">{emp.employeeId}</p>
                            </div>
                          </div>
                        </td>

                        {/* Designation */}
                        <td className="px-4 py-4 text-slate-600 font-medium text-xs">
                          {emp.designation}
                        </td>

                        {/* Working Day */}
                        <td className="px-3 py-4 text-center font-bold text-slate-800">
                          {emp.workingDays}
                        </td>

                        {/* Present */}
                        <td className="px-3 py-4 text-center">
                          <span className="inline-block px-3 py-1 rounded-md bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 shadow-xs">
                            {emp.presentDays}
                          </span>
                        </td>

                        {/* Morning Late */}
                        <td className="px-3 py-4 text-center">
                          <span className={`inline-block px-3 py-1 rounded-md font-bold text-xs shadow-xs ${
                            (emp.morningLateDays || emp.lateDays) > 0
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-amber-50/60 text-amber-600/80 border border-amber-100'
                          }`}>
                            {emp.morningLateDays ?? emp.lateDays ?? 0}
                          </span>
                        </td>

                        {/* Early Check Out */}
                        <td className="px-3 py-4 text-center">
                          <span className={`inline-block px-3 py-1 rounded-md font-bold text-xs shadow-xs ${
                            (emp.earlyCheckOutDays || emp.halfDays) > 0
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-rose-50/60 text-rose-600/80 border border-rose-100'
                          }`}>
                            {emp.earlyCheckOutDays ?? emp.halfDays ?? 0}
                          </span>
                        </td>

                        {/* Absent */}
                        <td className="px-3 py-4 text-center">
                          <span className={`inline-block px-3 py-1 rounded-md font-bold text-xs shadow-xs ${
                            emp.absentDays > 0
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-rose-50/60 text-rose-600/80 border border-rose-100'
                          }`}>
                            {emp.absentDays ?? 0}
                          </span>
                        </td>

                        {/* Leave */}
                        <td className="px-3 py-4 text-center">
                          <span className={`inline-block px-3 py-1 rounded-md font-bold text-xs shadow-xs ${
                            emp.onLeaveDays > 0
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-amber-50/60 text-amber-600/80 border border-amber-100'
                          }`}>
                            {emp.onLeaveDays ?? 0}
                          </span>
                        </td>

                        {/* Home Visit Count */}
                        <td className="px-3 py-4 text-center">
                          <span className="inline-block px-3 py-1 rounded-md bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 shadow-xs">
                            {emp.homeVisitCount ?? 0}
                          </span>
                        </td>

                        {/* Home Eye Action */}
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => {
                              setSelectedBreakdownEmp(emp);
                              setBreakdownTab('daily');
                            }}
                            title="View Attendance & Home Visits"
                            className="w-8 h-8 mx-auto rounded-full border border-slate-200 hover:border-[#588b12] hover:bg-lime-50 text-slate-500 hover:text-[#588b12] transition-colors flex items-center justify-center cursor-pointer shadow-xs"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Day-by-Day Breakdown Modal for Selected Employee in Monthly View */}
      {selectedBreakdownEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-700 text-sm overflow-hidden shrink-0">
                  {selectedBreakdownEmp.profilePhoto ? (
                    <img
                      src={selectedBreakdownEmp.profilePhoto}
                      alt={selectedBreakdownEmp.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    selectedBreakdownEmp.name.charAt(0)
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                    {selectedBreakdownEmp.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedBreakdownEmp.employeeId} • {selectedBreakdownEmp.designation} • {monthlyData?.monthName || summaryMonth}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBreakdownEmp(null)}
                className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Metric Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-center">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Working Days</p>
                  <p className="text-base font-extrabold text-slate-900 mt-0.5">{selectedBreakdownEmp.workingDays}</p>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200/60">
                  <p className="text-[10px] uppercase font-bold text-emerald-700">Present</p>
                  <p className="text-base font-extrabold text-emerald-800 mt-0.5">{selectedBreakdownEmp.presentDays}</p>
                </div>
                <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200/60">
                  <p className="text-[10px] uppercase font-bold text-amber-700">Morning Late</p>
                  <p className="text-base font-extrabold text-amber-800 mt-0.5">{selectedBreakdownEmp.morningLateDays ?? selectedBreakdownEmp.lateDays ?? 0}</p>
                </div>
                <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200/60">
                  <p className="text-[10px] uppercase font-bold text-rose-700">Early Check Out</p>
                  <p className="text-base font-extrabold text-rose-800 mt-0.5">{selectedBreakdownEmp.earlyCheckOutDays ?? selectedBreakdownEmp.halfDays ?? 0}</p>
                </div>
                <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200/60">
                  <p className="text-[10px] uppercase font-bold text-rose-700">Absent</p>
                  <p className="text-base font-extrabold text-rose-800 mt-0.5">{selectedBreakdownEmp.absentDays ?? 0}</p>
                </div>
                <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-200/60">
                  <p className="text-[10px] uppercase font-bold text-purple-700">Leave</p>
                  <p className="text-base font-extrabold text-purple-800 mt-0.5">{selectedBreakdownEmp.onLeaveDays ?? 0}</p>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200/60">
                  <p className="text-[10px] uppercase font-bold text-emerald-700">Home Visits</p>
                  <p className="text-base font-extrabold text-emerald-800 mt-0.5">{selectedBreakdownEmp.homeVisitCount ?? 0}</p>
                </div>
              </div>

              {/* Sub-Tabs: Daily Breakdown vs Home Visits */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  onClick={() => setBreakdownTab('daily')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    breakdownTab === 'daily'
                      ? 'bg-[#588b12] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Daily Breakdown (Multi-Shift)
                </button>
                <button
                  onClick={() => setBreakdownTab('home')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    breakdownTab === 'home'
                      ? 'bg-[#588b12] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>Home Visits</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    breakdownTab === 'home' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {selectedBreakdownEmp.homeVisitCount || 0}
                  </span>
                </button>
              </div>

              {/* TAB 1: Daily Breakdown Table */}
              {breakdownTab === 'daily' && (
                <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-3.5 py-2.5">Date</th>
                        <th className="px-2.5 py-2.5">Day</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3.5 py-2.5">Session 1 (IST)</th>
                        <th className="px-3 py-2.5 text-center">1st Work Hours</th>
                        <th className="px-3.5 py-2.5">Session 2 (IST)</th>
                        <th className="px-3 py-2.5 text-center">2nd Work Hours</th>
                        <th className="px-3 py-2.5 text-center">Total Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedBreakdownEmp.dailyBreakdown.map((row) => (
                        <tr key={row.date} className="hover:bg-slate-50/60">
                          <td className="px-3.5 py-2.5 font-mono font-medium text-slate-700">{row.date}</td>
                          <td className="px-2.5 py-2.5 font-medium text-slate-500">{row.day}</td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap ${
                                row.status === 'Present'
                                  ? 'bg-lime-100 text-lime-800'
                                  : row.status === 'Morning Late' || row.status === 'Late'
                                  ? 'bg-amber-100 text-amber-800'
                                  : row.status === 'Early Check Out' || row.status === 'Early Exit'
                                  ? 'bg-rose-100 text-rose-800'
                                  : row.status === 'Half Day'
                                  ? 'bg-blue-100 text-blue-800'
                                  : row.status === 'Absent'
                                  ? 'bg-rose-100 text-rose-800'
                                  : row.status === 'On Leave'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>

                          {/* Session 1 */}
                          <td className="px-3.5 py-2.5 font-medium text-slate-700 whitespace-nowrap">
                            {row.firstIn !== '--:--' || row.firstOut !== '--:--' ? (
                              <div className="flex flex-col text-[11px]">
                                <span>In: <strong className="text-slate-800">{row.firstIn}</strong></span>
                                <span>Out: <strong className="text-slate-800">{row.firstOut}</strong></span>
                              </div>
                            ) : (
                              <span className="text-slate-400">--:--</span>
                            )}
                          </td>

                          {/* 1st Work Hours */}
                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            {row.firstworkingHours !== undefined && row.firstworkingHours !== null && (row.firstOut !== '--:--' || row.firstworkingHours > 0 || row.firstworkingHours < 0) ? (
                              <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                Number(row.firstworkingHours) < 0
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {row.firstworkingHours} hrs
                              </span>
                            ) : (
                              <span className="text-slate-400">--</span>
                            )}
                          </td>

                          {/* Session 2 */}
                          <td className="px-3.5 py-2.5 font-medium text-slate-700 whitespace-nowrap">
                            {row.secondIn !== '--:--' || row.secondOut !== '--:--' ? (
                              <div className="flex flex-col text-[11px]">
                                <span>In: <strong className="text-slate-800">{row.secondIn}</strong></span>
                                <span>Out: <strong className="text-slate-800">{row.secondOut}</strong></span>
                              </div>
                            ) : (
                              <span className="text-slate-400">--:--</span>
                            )}
                          </td>

                          {/* 2nd Work Hours */}
                          <td className="px-3 py-2.5 text-center whitespace-nowrap">
                            {row.secondworkingHours !== undefined && row.secondworkingHours !== null && (row.secondOut !== '--:--' || row.secondworkingHours > 0 || row.secondworkingHours < 0) ? (
                              <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                Number(row.secondworkingHours) < 0
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {row.secondworkingHours} hrs
                              </span>
                            ) : (
                              <span className="text-slate-400">--</span>
                            )}
                          </td>

                          {/* Total Hours */}
                          <td className="px-3 py-2.5 text-center font-bold text-slate-800 whitespace-nowrap">
                            {row.workingHours !== undefined && row.workingHours > 0 ? (
                              <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                                {row.workingHours} hrs
                              </span>
                            ) : row.durationFormatted && row.durationFormatted !== '0m' ? (
                              <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                                {row.durationFormatted}
                              </span>
                            ) : (
                              <span className="text-slate-400">0m</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 2: Home Visits List */}
              {breakdownTab === 'home' && (
                <div className="space-y-3">
                  {!selectedBreakdownEmp.homeVisits || selectedBreakdownEmp.homeVisits.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/70">
                      <p className="text-sm font-bold text-slate-700">No Home Visits Recorded</p>
                      <p className="text-xs text-slate-400 mt-1">This employee has no home visit sessions recorded for {monthlyData?.monthName || summaryMonth}.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-2.5">Date</th>
                            <th className="px-3 py-2.5">Day</th>
                            <th className="px-4 py-2.5">Place</th>
                            <th className="px-4 py-2.5">Address</th>
                            <th className="px-4 py-2.5">Timings</th>
                            <th className="px-3 py-2.5 text-right">Hours</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedBreakdownEmp.homeVisits.map((hv, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/60">
                              <td className="px-4 py-2.5 font-mono font-medium text-slate-800">{hv.date}</td>
                              <td className="px-3 py-2.5 text-slate-500">{hv.day}</td>
                              <td className="px-4 py-2.5 font-semibold text-slate-800">{hv.place || 'Home Visit'}</td>
                              <td className="px-4 py-2.5 text-slate-600">{hv.address || '—'}</td>
                              <td className="px-4 py-2.5 text-slate-700">
                                {hv.checkIn && hv.checkIn !== '--:--' ? `${hv.checkIn} - ${hv.checkOut || 'In Progress'}` : '—'}
                              </td>
                              <td className="px-3 py-2.5 text-right font-bold text-emerald-700">
                                {hv.hours ? `${hv.hours} hrs` : (hv.durationFormatted || '—')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                onClick={() => {
                  const realEmp = employees.find(e => e.employeeId === selectedBreakdownEmp.employeeId || e.id === selectedBreakdownEmp.employeeId || e._id === selectedBreakdownEmp._id);
                  const targetDbId = realEmp?._id || selectedBreakdownEmp._id;
                  navigate(`/employee-tracking/${targetDbId}/${selectedBreakdownEmp.employeeId}`);
                }}
                className="px-3 py-2 rounded-xl bg-[#588b12]/10 hover:bg-[#588b12]/20 text-[#588b12] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                Open Daily Tracking Timeline <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setSelectedBreakdownEmp(null)}
                className="px-4.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Attendance Modal */}
      {isMarkingAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base">Add Attendance Record</h3>
              <button
                onClick={() => setIsMarkingAttendance(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMarkAttendance} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Employee *
                </label>
                <select
                  required
                  value={attendanceFormData.employee_ID}
                  onChange={(e) => setAttendanceFormData(prev => ({ ...prev, employee_ID: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#588b12] focus:bg-white transition-all font-semibold text-slate-750"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id || emp._id} value={emp.employeeId || emp.id || emp._id}>
                      {[emp.firstName, emp.lastName].filter(Boolean).join(' ') || emp.name} ({emp.employeeId || emp.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={attendanceFormData.date}
                  onChange={(e) => setAttendanceFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#588b12] focus:bg-white transition-all font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Status *
                </label>
                <select
                  value={attendanceFormData.status}
                  onChange={(e) => setAttendanceFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#588b12] focus:bg-white transition-all font-semibold text-slate-750"
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>

              {(attendanceFormData.status === 'Present' || attendanceFormData.status === 'Late') && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Check-In Time (IST)
                    </label>
                    <input
                      type="text"
                      placeholder="09:00"
                      value={attendanceFormData.checkInTime}
                      onChange={(e) => setAttendanceFormData(prev => ({ ...prev, checkInTime: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#588b12] focus:bg-white transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Check-Out Time (IST)
                    </label>
                    <input
                      type="text"
                      placeholder="17:00"
                      value={attendanceFormData.checkOutTime}
                      onChange={(e) => setAttendanceFormData(prev => ({ ...prev, checkOutTime: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#588b12] focus:bg-white transition-all font-medium"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsMarkingAttendance(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-650 hover:bg-slate-100 text-sm font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAttendance}
                  className="px-5 py-2.5 bg-[#588b12] hover:bg-[#4a750f] text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingAttendance ? 'Saving...' : 'Save Attendance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

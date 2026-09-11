import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  Building2,
  Car,
  Home,
  ArrowLeft,
  User,
  Mail,
  Phone,
  Briefcase,
  TrendingUp,
  Award,
  CheckCircle2,
  CalendarDays,
  Flame,
  ArrowRight
} from 'lucide-react';
import AxiosInstance from '../utilities/AxiosInstance';
import Sidebar from '../layouts/Sidebar';
import Navbar from '../layouts/Navbar';

// Format minutes into "Xh Ym"
const formatDuration = (minutes) => {
  if (!minutes || minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
};

// Format any time input (ISO string, 24-hr HH:mm, or Date) to IST 12-hour AM/PM
const formatToIST12Hour = (timeVal) => {
  if (!timeVal || timeVal === 'N/A' || timeVal === 'Present') return timeVal || 'N/A';
  if (typeof timeVal === 'string' && (timeVal.toUpperCase() === 'IN PROGRESS...' || timeVal === '--:--')) return timeVal;

  if (typeof timeVal === 'string' && (timeVal.includes('T') || timeVal.includes('Z'))) {
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

  if (timeVal instanceof Date && !isNaN(timeVal.getTime())) {
    return timeVal.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
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

// Parse time into minutes from midnight (0 - 1440) in IST
const parseTimeToMinutes = (timeVal) => {
  if (!timeVal || timeVal === 'N/A' || timeVal === 'Present') return null;

  if (typeof timeVal === 'string' && (timeVal.includes('T') || timeVal.includes('Z'))) {
    const d = new Date(timeVal);
    if (!isNaN(d.getTime())) {
      const istDateStr = d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
      const istDate = new Date(istDateStr);
      return istDate.getHours() * 60 + istDate.getMinutes();
    }
  }

  if (timeVal instanceof Date && !isNaN(timeVal.getTime())) {
    const istDateStr = timeVal.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const istDate = new Date(istDateStr);
    return istDate.getHours() * 60 + istDate.getMinutes();
  }

  if (typeof timeVal === 'string') {
    const trimmed = timeVal.trim();
    const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (ampmMatch) {
      let hrs = parseInt(ampmMatch[1], 10);
      const mins = parseInt(ampmMatch[2], 10);
      const period = ampmMatch[3].toUpperCase();
      if (period === 'PM' && hrs !== 12) hrs += 12;
      if (period === 'AM' && hrs === 12) hrs = 0;
      return hrs * 60 + mins;
    }

    const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      const hrs = parseInt(match[1], 10);
      const mins = parseInt(match[2], 10);
      return hrs * 60 + mins;
    }
  }

  return null;
};

const getDayName = (date) => {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

const formatDate = (date) => {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function EmployeeTracking() {
  const { id, employeeId } = useParams();
  const navigate = useNavigate();

  // Tab: 'daily' | 'monthly'
  const [activeTrackingTab, setActiveTrackingTab] = useState('daily');

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [records, setRecords] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [employeeInfo, setEmployeeInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Monthly summary for this employee
  const [summaryMonth, setSummaryMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [monthlySummaryData, setMonthlySummaryData] = useState(null);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  // Fetch employee info
  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const res = await AxiosInstance.get(`/employees/${id}`);
        setEmployeeInfo(res.data);
      } catch (err) {
        console.error('Error fetching employee:', err);
      }
    };
    if (id) fetchEmployee();
  }, [id]);

  // Fetch all attendance records for this employee
  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      try {
        const empId = employeeId || employeeInfo?.employeeId;
        if (!empId) return;
        const res = await AxiosInstance.get(`/attendance/${empId}`);
        const data = Array.isArray(res.data) ? res.data : [];
        setAllRecords(data);
      } catch (err) {
        console.error('Error fetching attendance:', err);
        setAllRecords([]);
      } finally {
        setLoading(false);
      }
    };
    if (employeeId || employeeInfo?.employeeId) fetchRecords();
  }, [employeeId, employeeInfo]);

  // Filter records for the selected date in IST
  useEffect(() => {
    const dateStr = selectedDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const filtered = allRecords.filter((r) => {
      const rawDate = r.date || r.createdAt;
      if (!rawDate) return false;
      let recDateStr = '';
      if (typeof rawDate === 'string' && (rawDate.includes('T') || rawDate.includes('Z'))) {
        const d = new Date(rawDate);
        recDateStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      } else {
        recDateStr = new Date(rawDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      }
      return recDateStr === dateStr;
    });

    filtered.sort((a, b) => {
      const aTime = parseTimeToMinutes(a.checkInTime || a.time || a.createdAt) || 0;
      const bTime = parseTimeToMinutes(b.checkInTime || b.time || b.createdAt) || 0;
      return aTime - bTime;
    });

    setRecords(filtered);
  }, [selectedDate, allRecords]);

  // Fetch Monthly Summary for this employee
  useEffect(() => {
    const empId = employeeId || employeeInfo?.employeeId;
    if (!empId || activeTrackingTab !== 'monthly') return;

    const fetchMonthly = async () => {
      setLoadingMonthly(true);
      try {
        const res = await AxiosInstance.get(`/attendance/monthly-summary?month=${summaryMonth}&employeeId=${empId}`);
        if (res.data?.success && res.data.summaries?.length > 0) {
          setMonthlySummaryData({
            ...res.data,
            employee: res.data.summaries[0],
          });
        } else {
          setMonthlySummaryData(null);
        }
      } catch (err) {
        console.error('Error fetching employee monthly summary:', err);
        setMonthlySummaryData(null);
      } finally {
        setLoadingMonthly(false);
      }
    };

    fetchMonthly();
  }, [summaryMonth, employeeId, employeeInfo, activeTrackingTab]);

  const goToPreviousDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const goToNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const nextIST = next.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    if (nextIST <= todayIST) {
      setSelectedDate(next);
    }
  };

  // Month navigation helpers
  const goToPreviousMonth = () => {
    const [y, m] = summaryMonth.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    setSummaryMonth(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
  };

  const goToNextMonth = () => {
    const [y, m] = summaryMonth.split('-').map(Number);
    const d = new Date(y, m, 1);
    setSummaryMonth(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`);
  };

  // Build timeline entries from records
  const buildTimeline = () => {
    if (records.length === 0) return [];
    const entries = [];
    records.forEach((record, idx) => {
      const checkInVal = record.checkInTime || record.time || record.createdAt;
      const checkOutVal = record.checkOutTime;

      const checkIn = parseTimeToMinutes(checkInVal);
      const checkOut = parseTimeToMinutes(checkOutVal);
      const duration = (checkIn !== null && checkOut !== null) ? checkOut - checkIn : null;
      const place = record.place || 'EL ROI Physio Care Center';
      const address = record.address || 'EL ROI Physio Care Center, Anna Nagar, Chennai';

      let entryType = 'office';
      const placeLower = (place || '').toLowerCase();
      if (placeLower.includes('home visit') || placeLower.includes('home')) {
        entryType = 'home-visit';
      } else if (placeLower.includes('travel')) {
        entryType = 'travel';
      }

      const formattedCheckIn = formatToIST12Hour(checkInVal);
      const formattedCheckOut = checkOutVal ? formatToIST12Hour(checkOutVal) : (record.status === 'Checked In' ? 'In Progress...' : 'Present');

      entries.push({
        type: entryType,
        title: entryType === 'office' ? 'In-Office Hours' : entryType === 'home-visit' ? 'Home Visit' : 'Travel Time',
        subtitle: place,
        duration: duration !== null ? formatDuration(duration) : checkOutVal ? '' : 'In Progress...',
        durationMinutes: duration || 0,
        location: address,
        timeRange: `${formattedCheckIn || '--:--'} – ${formattedCheckOut}`,
        status: record.status,
      });

      if (idx < records.length - 1) {
        const nextRecord = records[idx + 1];
        const nextCheckInVal = nextRecord.checkInTime || nextRecord.time || nextRecord.createdAt;
        const nextCheckIn = parseTimeToMinutes(nextCheckInVal);
        if (checkOut !== null && nextCheckIn !== null && nextCheckIn > checkOut) {
          const travelDuration = nextCheckIn - checkOut;
          if (travelDuration > 0) {
            const fromPlace = place.split(',')[0] || place;
            const toPlace = (nextRecord.place || 'Office').split(',')[0] || nextRecord.place;
            entries.push({
              type: 'travel',
              title: 'Travel Time',
              subtitle: `${fromPlace} → ${toPlace}`,
              duration: formatDuration(travelDuration),
              durationMinutes: travelDuration,
              location: toPlace,
              timeRange: `${formattedCheckOut} – ${formatToIST12Hour(nextCheckInVal)}`,
            });
          }
        }
      }
    });
    return entries;
  };

  const timeline = buildTimeline();

  // ─── Daily Overtime (OT) Duration Calculation ───────────────────────────
  const SHIFT_MINUTES = 480; // 8 hours standard shift (480 minutes)

  const totalMinutes = records.reduce((sum, r) => {
    const checkIn = parseTimeToMinutes(r.checkInTime || r.time || r.createdAt);
    const checkOut = parseTimeToMinutes(r.checkOutTime);
    if (checkIn !== null && checkOut !== null) return sum + (checkOut - checkIn);
    return sum;
  }, 0);

  const regularMinutes = Math.min(totalMinutes, SHIFT_MINUTES);
  const dailyOvertimeMinutes = Math.max(0, totalMinutes - SHIFT_MINUTES);

  const hasUnfinishedRecord = records.some((r) => !r.checkOutTime && (r.status === 'Checked In' || r.status === 'Present'));

  const getEntryIcon = (type) => {
    switch (type) {
      case 'office':
        return <Building2 className="w-5 h-5 text-white" />;
      case 'home-visit':
        return <Home className="w-5 h-5 text-white" />;
      case 'travel':
        return <Car className="w-5 h-5 text-white" />;
      default:
        return <Clock className="w-5 h-5 text-white" />;
    }
  };

  const getEntryColor = (type) => {
    switch (type) {
      case 'office':
        return 'bg-[#588b12]';
      case 'home-visit':
        return 'bg-[#588b12]';
      case 'travel':
        return 'bg-slate-500';
      default:
        return 'bg-slate-400';
    }
  };

  const empName = employeeInfo
    ? [employeeInfo.firstName, employeeInfo.lastName].filter(Boolean).join(' ')
    : '';

  const profilePhotoUrl = employeeInfo?.profilePhoto
    ? (employeeInfo.profilePhoto.startsWith('http') ? employeeInfo.profilePhoto : `${AxiosInstance.defaults.baseURL?.replace('/api', '')}${employeeInfo.profilePhoto}`)
    : null;

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-800 lg:pl-56">

      {/* Shared Admin Sidebar */}
      <Sidebar
        variant="admin"
        activeTab="Employees"
        onTabChange={(tab) => {
          if (tab === 'Employees') navigate('/admin-dashboard');
          else navigate('/admin-dashboard');
        }}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Navbar */}
      <Navbar title="Employee Tracking" onMobileMenuOpen={() => setMobileMenuOpen(true)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pt-[60px]">
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4.5 h-4.5 text-slate-600" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Employee Tracking</h2>
                {empName && (
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{empName} • {employeeInfo?.employeeId}</p>
                )}
              </div>
            </div>

            {/* Sub-Tab Navigation Switcher */}
            <div className="flex bg-slate-200/80 p-1 rounded-xl self-start sm:self-auto">
              <button
                onClick={() => setActiveTrackingTab('daily')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTrackingTab === 'daily'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Daily Timeline & OT
              </button>
              <button
                onClick={() => setActiveTrackingTab('monthly')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTrackingTab === 'monthly'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly Summary
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">

            {/* LEFT SIDEBAR — Employee Details */}
            <div className="lg:w-[320px] shrink-0 space-y-5">
              {/* Employee Profile Card */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="h-20 bg-gradient-to-r from-[#588b12] to-[#6fa520] relative">
                  <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                    {profilePhotoUrl ? (
                      <img
                        src={profilePhotoUrl}
                        alt={empName}
                        className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-slate-200 border-4 border-white shadow-md flex items-center justify-center">
                        <User className="w-8 h-8 text-slate-400" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-12 pb-5 px-5 text-center">
                  <h2 className="text-lg font-bold text-slate-900">{empName || '—'}</h2>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">{employeeInfo?.designation || '—'}</p>
                  {employeeInfo?.status && (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold mt-2 ${
                      employeeInfo.status === 'Active'
                        ? 'bg-lime-50 text-lime-700 border border-lime-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {employeeInfo.status}
                    </span>
                  )}
                </div>
              </div>

              {/* Employee Info List */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Employee Details</h3>

                <div className="space-y-3.5">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <Briefcase className="w-4 h-4 text-slate-500" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Employee ID</p>
                      <p className="text-sm font-bold text-slate-800 truncate">{employeeInfo?.employeeId || '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-slate-500" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</p>
                      <p className="text-sm font-bold text-slate-800 truncate">{empName || '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-emerald-600" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</p>
                      <p className="text-sm font-bold text-slate-800 truncate">
                        {employeeInfo?.workPhoneNumber || employeeInfo?.personalPhoneNumber || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-blue-600" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</p>
                      <p className="text-sm font-bold text-slate-800 truncate">{employeeInfo?.email || '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                      <Briefcase className="w-4 h-4 text-violet-600" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Designation</p>
                      <p className="text-sm font-bold text-slate-800 truncate">{employeeInfo?.designation || '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-amber-600" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date of Joining</p>
                      <p className="text-sm font-bold text-slate-800 truncate">
                        {employeeInfo?.dateOfJoining
                          ? new Date(employeeInfo.dateOfJoining).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT MAIN PANEL */}
            <div className="flex-1 min-w-0 space-y-5">

              {/* ───────────────────────────────────────────────────────
                  VIEW 1: DAILY TIMELINE & OVERTIME (OT)
              ─────────────────────────────────────────────────────── */}
              {activeTrackingTab === 'daily' && (
                <>
                  {/* Date Navigation & Overtime Stats Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-2xl border border-slate-200/80 shadow-sm px-5 py-4 gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={goToPreviousDay}
                        className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
                      >
                        <ChevronLeft className="w-4.5 h-4.5 text-slate-600" />
                      </button>

                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="font-bold text-slate-900 text-sm">
                          {formatDate(selectedDate)}, {getDayName(selectedDate)}
                        </span>
                      </div>

                      <button
                        onClick={goToNextDay}
                        disabled={selectedDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })}
                        className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                      >
                        <ChevronRight className="w-4.5 h-4.5 text-slate-600" />
                      </button>
                    </div>

                    {/* Quick OT and Duration indicators */}
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <div className="text-right">
                        <span className="text-xs font-semibold text-slate-400 block">Daily Total</span>
                        <span className="text-sm font-extrabold text-[#588b12]">
                          {formatDuration(totalMinutes)}
                        </span>
                      </div>

                      {dailyOvertimeMinutes > 0 ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-extrabold shadow-sm">
                          <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          OT: +{formatDuration(dailyOvertimeMinutes)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-500 text-xs font-semibold">
                          OT: 0m
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Daily Shift & OT Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                      <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Total Duration</span>
                        <Clock className="w-4 h-4 text-[#588b12]" />
                      </div>
                      <p className="text-lg font-extrabold text-slate-900">{formatDuration(totalMinutes)}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">All visits combined</p>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                      <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Regular Hours</span>
                        <Building2 className="w-4 h-4 text-blue-500" />
                      </div>
                      <p className="text-lg font-extrabold text-slate-900">{formatDuration(regularMinutes)}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Standard: 8h 00m</p>
                    </div>

                    <div className={`p-4 rounded-2xl border shadow-sm transition-all ${
                      dailyOvertimeMinutes > 0
                        ? 'bg-amber-50/70 border-amber-200/80'
                        : 'bg-white border-slate-200/80'
                    }`}>
                      <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          dailyOvertimeMinutes > 0 ? 'text-amber-700' : 'text-slate-400'
                        }`}>
                          Daily Overtime (OT)
                        </span>
                        <Flame className={`w-4 h-4 ${dailyOvertimeMinutes > 0 ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                      </div>
                      <p className={`text-lg font-extrabold ${dailyOvertimeMinutes > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                        {dailyOvertimeMinutes > 0 ? `+${formatDuration(dailyOvertimeMinutes)}` : '0m'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {dailyOvertimeMinutes > 0 ? 'Duration beyond 8h' : 'Within 8h shift'}
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                      <div className="flex items-center justify-between text-slate-400 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Shift Status</span>
                        <Award className="w-4 h-4 text-violet-500" />
                      </div>
                      <p className="text-sm font-extrabold text-slate-900 truncate">
                        {records.length === 0
                          ? 'No Records'
                          : hasUnfinishedRecord
                          ? 'In Progress...'
                          : dailyOvertimeMinutes > 0
                          ? 'Full Day + OT'
                          : totalMinutes >= 480
                          ? 'Full Day (8h)'
                          : 'Partial Shift'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {records.length} {records.length === 1 ? 'log' : 'logs'} recorded
                      </p>
                    </div>
                  </div>

                  {/* Timeline */}
                  {loading ? (
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-12 text-center">
                      <div className="w-8 h-8 border-3 border-slate-200 border-t-[#588b12] rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-sm text-slate-500 font-medium">Loading attendance data...</p>
                    </div>
                  ) : timeline.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-12 text-center">
                      <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-base font-bold text-slate-500 mb-1">No records found</p>
                      <p className="text-xs text-slate-400">No attendance data available for {formatDate(selectedDate)}.</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                      <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                          Daily Activity Timeline (IST Timestamps)
                        </h3>
                        <span className="text-[11px] font-bold text-slate-400">
                          {timeline.length} {timeline.length === 1 ? 'Event' : 'Events'}
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {timeline.map((entry, idx) => (
                          <div key={idx} className="flex gap-4 px-5 py-5 hover:bg-slate-50/40 transition-colors">
                            {/* Timeline icon */}
                            <div className="flex flex-col items-center">
                              <div className={`w-10 h-10 rounded-full ${getEntryColor(entry.type)} flex items-center justify-center shrink-0 shadow-sm`}>
                                {getEntryIcon(entry.type)}
                              </div>
                              {idx < timeline.length - 1 && (
                                <div className="w-0.5 flex-1 bg-slate-200 mt-2 min-h-[24px]" />
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 pt-1">
                              <div className="flex items-center justify-between gap-2">
                                <h3 className="font-bold text-slate-900 text-[15px] leading-tight">{entry.title}</h3>
                                {entry.status && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
                                    {entry.status}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-600 font-medium mt-0.5">{entry.subtitle}</p>
                              
                              <div className="flex items-center gap-3 mt-2">
                                <p className="text-base font-extrabold text-slate-900">{entry.duration}</p>
                                {entry.durationMinutes > 480 && (
                                  <span className="text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md">
                                    Overtime Event
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 font-medium">
                                <MapPin className="w-3.5 h-3.5 text-[#588b12] shrink-0" />
                                <span className="truncate">{entry.location}</span>
                              </div>
                              {entry.timeRange && (
                                <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 font-semibold">
                                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>{entry.timeRange} (IST)</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ───────────────────────────────────────────────────────
                  VIEW 2: MONTHLY ATTENDANCE SUMMARY FOR THIS EMPLOYEE
              ─────────────────────────────────────────────────────── */}
              {activeTrackingTab === 'monthly' && (
                <div className="space-y-5">
                  {/* Month Selector */}
                  <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200/80 shadow-sm px-5 py-4">
                    <button
                      onClick={goToPreviousMonth}
                      className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4.5 h-4.5 text-slate-600" />
                    </button>

                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#588b12]" />
                      <span className="font-extrabold text-slate-900 text-base">
                        {monthlySummaryData?.monthName || summaryMonth}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="month"
                        value={summaryMonth}
                        onChange={(e) => setSummaryMonth(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#588b12]"
                      />
                      <button
                        onClick={goToNextMonth}
                        className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <ChevronRight className="w-4.5 h-4.5 text-slate-600" />
                      </button>
                    </div>
                  </div>

                  {loadingMonthly ? (
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-12 text-center">
                      <div className="w-8 h-8 border-3 border-slate-200 border-t-[#588b12] rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-sm text-slate-500 font-medium">Loading monthly attendance summary...</p>
                    </div>
                  ) : !monthlySummaryData?.employee ? (
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-12 text-center">
                      <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-base font-bold text-slate-500 mb-1">No monthly attendance records found</p>
                      <p className="text-xs text-slate-400">No records found for this employee in {summaryMonth}.</p>
                    </div>
                  ) : (
                    <>
                      {/* Employee Monthly Stats Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Working Days</p>
                          <h4 className="text-xl font-extrabold text-slate-900 mt-1">
                            {monthlySummaryData.employee.workingDays} <span className="text-xs font-medium text-slate-400">Days</span>
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">Excludes Sundays</p>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Present Logged</p>
                          <h4 className="text-xl font-extrabold text-lime-700 mt-1">
                            {monthlySummaryData.employee.presentDays} <span className="text-xs font-medium text-slate-400">Days</span>
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {monthlySummaryData.employee.lateDays > 0 ? `${monthlySummaryData.employee.lateDays} late entries` : '0 late'}
                          </p>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Worked</p>
                          <h4 className="text-xl font-extrabold text-slate-900 mt-1">
                            {monthlySummaryData.employee.totalWorkedFormatted}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {monthlySummaryData.employee.totalWorkedHours} hours total
                          </p>
                        </div>

                        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200/80 shadow-sm">
                          <div className="flex items-center justify-between text-amber-700">
                            <p className="text-[10px] font-bold uppercase tracking-wider">Total Overtime (OT)</p>
                            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                          </div>
                          <h4 className="text-xl font-extrabold text-amber-800 mt-1">
                            +{monthlySummaryData.employee.totalOtFormatted}
                          </h4>
                          <p className="text-[11px] text-amber-700/80 mt-0.5">
                            {monthlySummaryData.employee.totalOtHours} OT hours logged
                          </p>
                        </div>
                      </div>

                      {/* Day-by-Day Table */}
                      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
                          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Daily Breakdown — {monthlySummaryData.monthName}
                          </h3>
                          <span className="text-xs font-extrabold text-[#588b12]">
                            Attendance Rate: {monthlySummaryData.employee.attendanceRate}%
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                                <th className="px-5 py-3">Date</th>
                                <th className="px-3 py-3">Day</th>
                                <th className="px-3 py-3">Status</th>
                                <th className="px-4 py-3">Check-In (IST)</th>
                                <th className="px-4 py-3">Check-Out (IST)</th>
                                <th className="px-4 py-3 text-right">Hours Worked</th>
                                <th className="px-4 py-3 text-right">Overtime (OT)</th>
                                <th className="px-5 py-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {monthlySummaryData.employee.dailyBreakdown.map((dayRow) => (
                                <tr key={dayRow.date} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="px-5 py-3 font-mono font-medium text-slate-700">{dayRow.date}</td>
                                  <td className="px-3 py-3 font-semibold text-slate-500">{dayRow.day}</td>
                                  <td className="px-3 py-3">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                        dayRow.status === 'Present'
                                          ? 'bg-lime-100 text-lime-800'
                                          : dayRow.status === 'Late'
                                          ? 'bg-amber-100 text-amber-800'
                                          : dayRow.status === 'Half Day'
                                          ? 'bg-blue-100 text-blue-800'
                                          : dayRow.status === 'Absent'
                                          ? 'bg-rose-100 text-rose-800'
                                          : dayRow.status === 'On Leave'
                                          ? 'bg-purple-100 text-purple-800'
                                          : 'bg-slate-100 text-slate-500'
                                      }`}
                                    >
                                      {dayRow.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 font-medium text-slate-700">
                                    {formatToIST12Hour(dayRow.checkIn)}
                                  </td>
                                  <td className="px-4 py-3 font-medium text-slate-700">
                                    {formatToIST12Hour(dayRow.checkOut)}
                                  </td>
                                  <td className="px-4 py-3 text-right font-extrabold text-slate-900">
                                    {dayRow.durationFormatted}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    {dayRow.otMinutes > 0 ? (
                                      <span className="inline-block px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-extrabold border border-amber-200 text-xs">
                                        +{dayRow.otFormatted}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 text-xs font-semibold">0m</span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3 text-right">
                                    <button
                                      onClick={() => {
                                        setSelectedDate(new Date(dayRow.date));
                                        setActiveTrackingTab('daily');
                                      }}
                                      className="text-xs font-bold text-[#588b12] hover:text-[#456e0e] inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      View Day <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

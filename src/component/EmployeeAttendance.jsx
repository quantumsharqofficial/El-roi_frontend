import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Clock,
  Calendar,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Search,
  Filter,
  RefreshCw,
  CalendarDays,
  Timer,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import AxiosInstance from "../utilities/AxiosInstance";

// Helper: Format any ISO date or time string to 12-Hour IST (AM/PM)
export const formatToIST12Hour = (timeVal) => {
  if (!timeVal || timeVal === "N/A" || timeVal === "Present") return timeVal || "N/A";
  if (typeof timeVal === "string" && (timeVal.toUpperCase() === "IN PROGRESS..." || timeVal === "--:--")) return timeVal;

  if (typeof timeVal === "string" && (timeVal.includes("T") || timeVal.includes("Z"))) {
    const d = new Date(timeVal);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString("en-US", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }
  }

  if (typeof timeVal === "string") {
    const trimmed = timeVal.trim();
    if (/am|pm/i.test(trimmed)) return trimmed;

    const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (match) {
      let hrs = parseInt(match[1], 10);
      const mins = match[2];
      const period = hrs >= 12 ? "PM" : "AM";
      hrs = hrs % 12;
      if (hrs === 0) hrs = 12;
      return `${hrs.toString().padStart(2, "0")}:${mins} ${period}`;
    }
  }

  return timeVal;
};

// Calculate duration in minutes from two time strings
export const getDurationMinutes = (checkIn, checkOut) => {
  if (!checkIn || !checkOut || checkIn === "N/A" || checkOut === "N/A" || checkOut === "Present") return 0;
  const parseTime = (timeStr) => {
    const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)?$/i);
    if (!match) {
      const parts = timeStr.split(":").map(Number);
      return parts[0] * 60 + (parts[1] || 0);
    }
    let [, hrs, mins, meridiem] = match;
    hrs = Number(hrs);
    mins = Number(mins);
    if (meridiem) {
      if (meridiem.toUpperCase() === "PM" && hrs !== 12) hrs += 12;
      if (meridiem.toUpperCase() === "AM" && hrs === 12) hrs = 0;
    }
    return hrs * 60 + mins;
  };
  try {
    const startMins = parseTime(checkIn);
    const endMins = parseTime(checkOut);
    let diff = endMins - startMins;
    if (diff < 0) diff += 24 * 60;
    return diff;
  } catch (e) {
    return 0;
  }
};

// Format minutes to "Xh Ym"
export const formatMinutesToDuration = (minutes) => {
  if (!minutes || minutes <= 0) return "0h 00m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
};

// Get today's date in YYYY-MM-DD (IST)
export const getTodayISTDateString = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${d}`;
};

export const formatToISTDateString = (dateInput) => {
  if (!dateInput) return "";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(d);

    const y = parts.find((p) => p.type === "year")?.value;
    const m = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    return `${y}-${m}-${day}`;
  } catch (e) {
    return "";
  }
};

export default function EmployeeAttendance({ employeeDetails }) {
  const employeeId = employeeDetails?.employeeId || employeeDetails?.id;
  const employeeName = [employeeDetails?.firstName, employeeDetails?.lastName].filter(Boolean).join(" ") || "Employee";

  const [activeSubTab, setActiveSubTab] = useState("monthly"); // Default to monthly view as requested
  const [currentTime, setCurrentTime] = useState("");
  const [currentDateString, setCurrentDateString] = useState("");

  // Today's attendance state
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [punchLoading, setPunchLoading] = useState(false);

  // History & logs
  const [allRecords, setAllRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Monthly summary
  const [selectedMonth, setSelectedMonth] = useState(() => getTodayISTDateString().slice(0, 7));
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  // Live IST Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
      setCurrentDateString(
        now.toLocaleDateString("en-GB", {
          timeZone: "Asia/Kolkata",
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Attendance Records for this employee
  const fetchEmployeeRecords = useCallback(async () => {
    if (!employeeId) return;
    setLoadingRecords(true);
    try {
      const res = await AxiosInstance.get(`/attendance/${employeeId}`);
      const raw = Array.isArray(res.data) ? res.data : [];

      // Sort descending by date
      const sorted = [...raw].sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
      setAllRecords(sorted);

      // Check today's record (using IST date string)
      const todayStr = getTodayISTDateString();
      const sortedDesc = [...raw].sort(
        (a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)
      );

      // Look for today's record - priority to active check-in (checked in but not checked out)
      const activeRec = sortedDesc.find((r) => {
        const dStr = formatToISTDateString(r.date || r.createdAt);
        const hasCheckIn = Boolean(r.checkInTime && r.checkInTime !== "--:--");
        const noCheckOut =
          !r.checkOutTime ||
          r.checkOutTime === "--:--" ||
          r.checkOutTime === "In Progress...";
        return dStr === todayStr && hasCheckIn && noCheckOut;
      });

      const todayRec =
        activeRec ||
        sortedDesc.find((r) => {
          const dStr = formatToISTDateString(r.date || r.createdAt);
          return dStr === todayStr;
        });

      setTodayAttendance(todayRec || null);
    } catch (err) {
      console.error("Error fetching employee attendance:", err);
    } finally {
      setLoadingRecords(false);
    }
  }, [employeeId]);

  // Fetch Monthly Summary
  const fetchMonthlySummary = useCallback(async () => {
    if (!employeeId) return;
    setLoadingMonthly(true);
    try {
      const res = await AxiosInstance.get(
        `/attendance/monthly-summary?month=${selectedMonth}&employeeId=${employeeId}`
      );
      const summaries = res.data?.summaries || res.data?.summary || [];
      const mySummary =
        summaries.find(
          (s) =>
            s.employeeId === employeeId ||
            s.employeeId === employeeDetails?._id ||
            s._id === employeeDetails?._id
        ) || (summaries.length === 1 ? summaries[0] : null);
      setMonthlySummary(mySummary || null);
    } catch (err) {
      console.error("Error fetching monthly summary:", err);
    } finally {
      setLoadingMonthly(false);
    }
  }, [employeeId, employeeDetails?._id, selectedMonth]);

  useEffect(() => {
    if (employeeId) {
      fetchEmployeeRecords();
      fetchMonthlySummary();
    }
  }, [employeeId, fetchEmployeeRecords, fetchMonthlySummary]);

  useEffect(() => {
    if (employeeId) {
      fetchMonthlySummary();
    }
  }, [employeeId, selectedMonth, fetchMonthlySummary]);

  // Handle Punch In (Check-in)
  const handleCheckIn = async () => {
    if (!employeeId) {
      toast.error("Employee details not found.");
      return;
    }
    setPunchLoading(true);
    try {
      const todayStr = getTodayISTDateString();
      const res = await AxiosInstance.post("/attendance/check-in", {
        employee_ID: employeeId,
        name: employeeName,
        date: todayStr,
        place: "Home Visit",
        address: "Home Visit",
      });

      toast.success("Home visit check-in successful!");
      if (res.data?.attendance) {
        setTodayAttendance(res.data.attendance);
      }
      fetchEmployeeRecords();
      fetchMonthlySummary();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || "Check-in failed.";
      toast.error(msg);
    } finally {
      setPunchLoading(false);
    }
  };

  // Handle Punch Out (Check-out)
  const handleCheckOut = async () => {
    if (!employeeId) {
      toast.error("Employee details not found.");
      return;
    }
    setPunchLoading(true);
    try {
      const todayStr = getTodayISTDateString();
      const res = await AxiosInstance.patch("/attendance/check-out", {
        employee_ID: employeeId,
        date: todayStr,
        attendanceId: todayAttendance?._id,
      });

      toast.success("Home visit checked out successfully!");
      if (res.data?.attendance) {
        setTodayAttendance(res.data.attendance);
      }
      fetchEmployeeRecords();
      fetchMonthlySummary();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || "Check-out failed.";
      toast.error(msg);
    } finally {
      setPunchLoading(false);
    }
  };

  // Determine punch card status
  const isCheckedIn = Boolean(
    todayAttendance?.checkInTime &&
    todayAttendance?.checkInTime !== "--:--" &&
    (!todayAttendance?.checkOutTime ||
      todayAttendance?.checkOutTime === "--:--" ||
      todayAttendance?.checkOutTime === "In Progress...")
  );
  const isCompleted = Boolean(
    todayAttendance?.checkInTime &&
    todayAttendance?.checkInTime !== "--:--" &&
    todayAttendance?.checkOutTime &&
    todayAttendance?.checkOutTime !== "--:--" &&
    todayAttendance?.checkOutTime !== "In Progress..."
  );
  const notCheckedIn = !todayAttendance?.checkInTime || todayAttendance?.checkInTime === "--:--";

  // Process Daily Logs with IST display and daily OT
  const processedLogs = useMemo(() => {
    return allRecords.map((r) => {
      const checkInFormatted = formatToIST12Hour(r.checkInTime);
      const checkOutFormatted = r.checkOutTime
        ? formatToIST12Hour(r.checkOutTime)
        : r.status === "Checked In"
        ? "In Progress..."
        : "--:--";

      const durationMins = getDurationMinutes(r.checkInTime, r.checkOutTime);
      const durationFormatted =
        r.checkInTime && r.checkOutTime
          ? formatMinutesToDuration(durationMins)
          : r.status === "Checked In"
          ? "In Progress..."
          : "N/A";

      // Daily OT: Standard shift = 8 hours (480 mins)
      const otMins = Math.max(0, durationMins - 480);
      const otFormatted = otMins > 0 ? formatMinutesToDuration(otMins) : "--";

      const dateObj = r.date || r.createdAt ? new Date(r.date || r.createdAt) : null;
      const dateDisplay = dateObj
        ? dateObj.toLocaleDateString("en-GB", {
            timeZone: "Asia/Kolkata",
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "N/A";
      const dayDisplay = dateObj
        ? dateObj.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", weekday: "short" })
        : "";

      return {
        ...r,
        dateDisplay,
        dayDisplay,
        checkInFormatted,
        checkOutFormatted,
        durationFormatted,
        durationMins,
        otMins,
        otFormatted,
        isOvertime: otMins > 0,
      };
    });
  }, [allRecords]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return processedLogs.filter((log) => {
      const matchesSearch =
        searchQuery === "" ||
        log.dateDisplay.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.dayDisplay.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.status && log.status.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === "All" ||
        log.status === statusFilter ||
        (statusFilter === "Overtime" && log.isOvertime);

      return matchesSearch && matchesStatus;
    });
  }, [processedLogs, searchQuery, statusFilter]);

  // Calculate quick summary metrics for current month from logs
  const currentMonthMetrics = useMemo(() => {
    const currentPrefix = getTodayISTDateString().slice(0, 7);
    const monthLogs = processedLogs.filter((l) => {
      if (!l.date) return false;
      return new Date(l.date).toISOString().slice(0, 7) === currentPrefix;
    });

    const presentCount = monthLogs.filter((l) => l.status === "Present" || l.status === "Checked In").length;
    let totalMinutes = 0;
    let totalOtMins = 0;

    monthLogs.forEach((l) => {
      totalMinutes += l.durationMins || 0;
      totalOtMins += l.otMins || 0;
    });

    return {
      presentCount,
      totalHours: formatMinutesToDuration(totalMinutes),
      totalOt: formatMinutesToDuration(totalOtMins),
      daysLogged: monthLogs.length,
    };
  }, [processedLogs]);

  return (
    <div className="space-y-6">
      {/* ── Page Header & IST Clock ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-[#132213] to-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#588b12]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#96c93d]">
            <Sparkles className="w-4 h-4 text-[#96c93d]" />
            Employee Self Service
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            Attendance & Work Logs
          </h1>
          <p className="text-sm text-slate-300">
            Real-time Indian Standard Time (IST) tracking & Daily Overtime records.
          </p>
        </div>

        {/* Live Clock Widget */}
        <div className="relative z-10 flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-white/15">
          <div className="w-10 h-10 rounded-xl bg-[#588b12] flex items-center justify-center text-white shadow-lg">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
              Current IST Time
            </div>
            <div className="text-xl md:text-2xl font-black font-mono tracking-tight text-white">
              {currentTime || "00:00:00 AM"}
            </div>
            <div className="text-[11px] text-[#96c93d] font-medium">
              {currentDateString || "Today"}
            </div>
          </div>
        </div>
      </div>

      {/* ── Today's Punch & Status Card ───────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Punch Status Indicator */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Today's Punch Status
              </span>
              {notCheckedIn && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  Not Checked In
                </span>
              )}
              {isCheckedIn && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Currently Checked In (Active)
                </span>
              )}
              {isCompleted && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  Shift Completed
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] font-bold uppercase text-slate-400">First Check In</div>
                <div className="text-base font-bold text-slate-800 mt-0.5">
                  {todayAttendance?.checkInTime ? formatToIST12Hour(todayAttendance.checkInTime) : "--:--"}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] font-bold uppercase text-slate-400">Last Check Out</div>
                <div className="text-base font-bold text-slate-800 mt-0.5">
                  {todayAttendance?.checkOutTime ? formatToIST12Hour(todayAttendance.checkOutTime) : isCheckedIn ? "In Progress..." : "--:--"}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] font-bold uppercase text-slate-400">Hours Logged</div>
                <div className="text-base font-bold text-slate-800 mt-0.5">
                  {todayAttendance?.checkInTime && todayAttendance?.checkOutTime
                    ? formatMinutesToDuration(getDurationMinutes(todayAttendance.checkInTime, todayAttendance.checkOutTime))
                    : isCheckedIn
                    ? "In Progress"
                    : "0h 00m"}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="text-[10px] font-bold uppercase text-slate-400">Today's OT</div>
                <div className="text-base font-bold text-[#588b12] mt-0.5">
                  {todayAttendance?.checkInTime && todayAttendance?.checkOutTime
                    ? Math.max(0, getDurationMinutes(todayAttendance.checkInTime, todayAttendance.checkOutTime) - 480) > 0
                      ? formatMinutesToDuration(Math.max(0, getDurationMinutes(todayAttendance.checkInTime, todayAttendance.checkOutTime) - 480))
                      : "0h 00m"
                    : "--"}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Check-In & Check-Out Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={handleCheckIn}
              disabled={punchLoading || isCheckedIn}
              className={`flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-md ${
                isCheckedIn
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                  : "bg-gradient-to-r from-[#588b12] to-[#76b81d] text-white hover:opacity-95 hover:shadow-lg active:scale-95"
              }`}
            >
              <LogIn className="w-4 h-4" />
              {punchLoading ? "Processing..." : isCompleted ? "Home Visit Start" : "Home Visit Start"}
            </button>

            <button
              onClick={handleCheckOut}
              disabled={punchLoading || !isCheckedIn}
              className={`flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-md ${
                !isCheckedIn
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                  : "bg-red-600 hover:bg-red-700 text-white hover:shadow-lg active:scale-95"
              }`}
            >
              <LogOut className="w-4 h-4" />
              {punchLoading ? "Processing..." : "Home Visit End"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Monthly Quick Metric Badges ───────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#588b12] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase text-slate-400">Present This Month</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {currentMonthMetrics.presentCount} <span className="text-sm font-semibold text-slate-400">Days</span>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Timer className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase text-slate-400">Total Hours</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {currentMonthMetrics.totalHours}
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase text-slate-400">Overtime (OT)</div>
            <div className="text-2xl font-black text-amber-600 mt-0.5">
              {currentMonthMetrics.totalOt}
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase text-slate-400">Total Entries</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {currentMonthMetrics.daysLogged}
            </div>
          </div>
        </div>
      </div>

      {/* ── Sub Navigation Tabs ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab("daily")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeSubTab === "daily"
                ? "bg-[#588b12] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Daily Attendance Logs
          </button>
          <button
            onClick={() => setActiveSubTab("monthly")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeSubTab === "monthly"
                ? "bg-[#588b12] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Monthly Summary & Breakdown
          </button>
        </div>

        <button
          onClick={() => {
            fetchEmployeeRecords();
            if (activeSubTab === "monthly") fetchMonthlySummary();
            toast.info("Refreshed attendance records.");
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* ── TAB 1: Daily Attendance History Table ─────────────────────────── */}
      {activeSubTab === "daily" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Controls bar */}
          <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by date or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-[#588b12] focus:ring-1 focus:ring-[#588b12]"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#588b12]"
              >
                <option value="All">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Checked In">Checked In</option>
                <option value="Late">Late</option>
                <option value="Half Day">Half Day</option>
                <option value="Overtime">With Overtime (OT)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Date</th>
                  <th className="px-6 py-3.5">Day</th>
                  <th className="px-6 py-3.5">Check In (IST)</th>
                  <th className="px-6 py-3.5">Check Out (IST)</th>
                  <th className="px-6 py-3.5">Duration</th>
                  <th className="px-6 py-3.5">Daily Overtime (OT)</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingRecords ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-[#588b12]" />
                        <span>Loading attendance records...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Calendar className="w-8 h-8 text-slate-300" />
                        <span className="font-semibold text-slate-500">No attendance logs found</span>
                        <span className="text-xs">Punch in to create your first attendance record today.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, idx) => (
                    <tr key={log._id || idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {log.dateDisplay}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        {log.dayDisplay}
                      </td>
                      <td className="px-6 py-4 font-mono font-semibold text-slate-700">
                        {log.checkInFormatted}
                      </td>
                      <td className="px-6 py-4 font-mono font-semibold text-slate-700">
                        {log.checkOutFormatted}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {log.durationFormatted}
                      </td>
                      <td className="px-6 py-4">
                        {log.isOvertime ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <TrendingUp className="w-3 h-3 text-amber-600" />
                            {log.otFormatted} OT
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono">--</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            log.status === "Present"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : log.status === "Checked In"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : log.status === "Late"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : log.status === "Half Day"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {log.status || "Present"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: Monthly Summary & Breakdown ────────────────────────────── */}
      {activeSubTab === "monthly" && (
        <div className="space-y-6">
          {/* Month Selector Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-base font-bold text-slate-800">Monthly Attendance Summary</h3>
              <p className="text-xs text-slate-500">
                View complete breakdown of working days, leaves, and overtime for the selected month.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase">Select Month:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#588b12]"
              />
            </div>
          </div>

          {/* Monthly KPI Cards */}
          {monthlySummary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Days Present
                </div>
                <div className="text-xl font-black text-[#588b12] mt-1">
                  {monthlySummary.presentDays || 0}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Working Days
                </div>
                <div className="text-xl font-black text-slate-800 mt-1">
                  {monthlySummary.workingDays || 0}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Approved Leaves
                </div>
                <div className="text-xl font-black text-blue-600 mt-1">
                  {monthlySummary.onLeaveDays || 0}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Hours Worked
                </div>
                <div className="text-xl font-black text-slate-800 mt-1">
                  {monthlySummary.totalWorkedFormatted || "0h 00m"}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Overtime (OT)
                </div>
                <div className="text-xl font-black text-amber-600 mt-1">
                  {monthlySummary.totalOtFormatted || "0h 00m"}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Attendance Rate
                </div>
                <div className="text-xl font-black text-purple-600 mt-1">
                  {monthlySummary.attendanceRate || 0}%
                </div>
              </div>
            </div>
          )}

          {/* Daily Breakdown Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800">
                Daily Breakdown ({selectedMonth})
              </h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Day</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Check In (IST)</th>
                    <th className="px-6 py-3.5">Check Out (IST)</th>
                    <th className="px-6 py-3.5">Hours</th>
                    <th className="px-6 py-3.5">Overtime (OT)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingMonthly ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <RefreshCw className="w-6 h-6 animate-spin text-[#588b12]" />
                          <span>Loading monthly breakdown...</span>
                        </div>
                      </td>
                    </tr>
                  ) : !monthlySummary?.dailyBreakdown || monthlySummary.dailyBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                        No monthly records available for {selectedMonth}
                      </td>
                    </tr>
                  ) : (
                    monthlySummary.dailyBreakdown.map((day, idx) => (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          day.status === "Sunday" ? "bg-slate-50/40 text-slate-400" : ""
                        }`}
                      >
                        <td className="px-6 py-3.5 font-bold text-slate-800">
                          {day.date}
                        </td>
                        <td className="px-6 py-3.5 text-slate-500 font-medium">
                          {day.day}
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              day.status === "Present"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : day.status === "Checked In"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : day.status === "On Leave"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : day.status === "Late"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : day.status === "Half Day"
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : day.status === "Sunday"
                                ? "bg-slate-100 text-slate-500"
                                : "bg-red-50 text-red-600 border border-red-200"
                            }`}
                          >
                            {day.status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 font-mono text-slate-700">
                          {day.checkIn && day.checkIn !== "--:--" ? formatToIST12Hour(day.checkIn) : "--:--"}
                        </td>
                        <td className="px-6 py-3.5 font-mono text-slate-700">
                          {day.status === "Checked In" && (!day.checkOut || day.checkOut === "--:--") ? (
                            <span className="text-blue-600 font-semibold italic">In Progress...</span>
                          ) : day.checkOut && day.checkOut !== "--:--" ? (
                            formatToIST12Hour(day.checkOut)
                          ) : (
                            "--:--"
                          )}
                        </td>
                        <td className="px-6 py-3.5 font-semibold text-slate-800">
                          {day.status === "Checked In" && (!day.checkOut || day.durationMinutes === 0) ? (
                            <span className="text-blue-600 font-semibold italic">In Progress</span>
                          ) : (
                            day.durationFormatted || "--"
                          )}
                        </td>
                        <td className="px-6 py-3.5">
                          {day.isOvertime ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <TrendingUp className="w-3 h-3 text-amber-600" />
                              {day.otFormatted}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">--</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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

// Calculate duration between two time strings like admin panel
export const calculateHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut || checkIn === "N/A" || checkOut === "N/A" || checkOut === "Present") return "N/A";
  const parseTime = (timeStr) => {
    const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)?$/i);
    if (!match) {
      const parts = timeStr.split(":").map(Number);
      return parts[0] * 60 + (parts[1] || 0);
    }
    let [_, hrs, mins, meridiem] = match;
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
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h}h ${m.toString().padStart(2, "0")}m`;
  } catch (e) {
    return "N/A";
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
  const employeeId = employeeDetails?.employeeId || employeeDetails?.id || employeeDetails?._id;
  const employeeName = [employeeDetails?.firstName, employeeDetails?.lastName].filter(Boolean).join(" ") || "Employee";

  // Mode state: 'daily' | 'monthly' - default to daily like admin panel
  const [activeSubTab, setActiveSubTab] = useState("daily");
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

  // Pagination State for Daily Table
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);

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

  // Fetch Attendance Records using the new Attendance API (like Admin Panel)
  const fetchEmployeeRecords = useCallback(async () => {
    if (!employeeId) return;
    setLoadingRecords(true);
    try {
      const res = await AxiosInstance.get(`/new-attendance/findbyemployeeid/${employeeId}`);
      const rawList = Array.isArray(res.data)
        ? res.data
        : (Array.isArray(res.data?.data) ? res.data.data : []);

      // Sort descending by date
      const sorted = [...rawList].sort(
        (a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
      );
      setAllRecords(sorted);

      // Check today's record (using IST date string)
      const todayStr = getTodayISTDateString();
      const todayRec = sorted.find((r) => {
        const dStr = formatToISTDateString(r.date || r.createdAt);
        return dStr === todayStr;
      });

      setTodayAttendance(todayRec || null);
    } catch (err) {
      console.warn("New attendance API lookup error, falling back:", err?.message);
      try {
        const fallbackRes = await AxiosInstance.get(`/attendance/${employeeId}`);
        const fallbackList = Array.isArray(fallbackRes.data) ? fallbackRes.data : [];
        setAllRecords(fallbackList);
      } catch (e) {
        setAllRecords([]);
      }
    } finally {
      setLoadingRecords(false);
    }
  }, [employeeId]);

  // Fetch Monthly Summary
  const fetchMonthlySummary = useCallback(async () => {
    if (!employeeId) return;
    setLoadingMonthly(true);
    try {
      let res;
      try {
        res = await AxiosInstance.get(
          `/new-attendance/monthly-summary?month=${selectedMonth}&employeeId=${employeeId}`
        );
      } catch (newApiErr) {
        res = await AxiosInstance.get(
          `/attendance/monthly-summary?month=${selectedMonth}&employeeId=${employeeId}`
        );
      }
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

  // Handle Punch In / Punch Out with new Attendance system
  const handleNewCheckIn = async () => {
    if (!employeeId) {
      toast.error("Employee details not found.");
      return;
    }
    setPunchLoading(true);
    try {
      const res = await AxiosInstance.post("/multi-attendance/test", {
        employee_ID: employeeId,
      });
      toast.success(res.data?.message || "Check In recorded successfully!");
      await fetchEmployeeRecords();
      await fetchMonthlySummary();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to record check in");
    } finally {
      setPunchLoading(false);
    }
  };

  const handleNewCheckOut = async () => {
    if (!employeeId) {
      toast.error("Employee details not found.");
      return;
    }
    setPunchLoading(true);
    try {
      const res = await AxiosInstance.post("/multi-attendance/test", {
        employee_ID: employeeId,
      });
      toast.success(res.data?.message || "Check Out recorded successfully!");
      await fetchEmployeeRecords();
      await fetchMonthlySummary();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to record check out");
    } finally {
      setPunchLoading(false);
    }
  };

  // Process Daily Logs from the new Attendance model (multi-session with firstIn, firstOut, secondIn, secondOut, workingHours)
  const processedLogs = useMemo(() => {
    return allRecords.map((r) => {
      const firstIn = formatToIST12Hour(r.firstinTime || r.checkInTime);
      const firstOut = r.firstoutTime
        ? formatToIST12Hour(r.firstoutTime)
        : r.checkOutTime
        ? formatToIST12Hour(r.checkOutTime)
        : r.firstinTime && !r.secondinTime
        ? "In Progress..."
        : "--:--";

      const secondIn = r.secondinTime ? formatToIST12Hour(r.secondinTime) : "--:--";
      const secondOut = r.secondoutTime
        ? formatToIST12Hour(r.secondoutTime)
        : r.secondinTime
        ? "In Progress..."
        : "--:--";

      let hoursDisplay = "N/A";
      if (r.workingHours !== undefined && r.workingHours !== null) {
        const wh = Number(r.workingHours);
        if (!isNaN(wh)) {
          hoursDisplay = `${wh} hrs`;
        }
      } else if (r.firstinTime && r.firstoutTime) {
        hoursDisplay = calculateHours(firstIn, firstOut);
      } else if (r.checkInTime && r.checkOutTime) {
        hoursDisplay = calculateHours(r.checkInTime, r.checkOutTime);
      } else if (r.firstinTime || r.secondinTime) {
        hoursDisplay = "In Progress...";
      }

      const dateObj = r.date || r.createdAt ? new Date(r.date || r.createdAt) : null;
      const dateDisplay = dateObj
        ? dateObj
            .toLocaleDateString("en-GB", {
              timeZone: "Asia/Kolkata",
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
            .replace(/ /g, "-")
        : "N/A";
      const dayDisplay = dateObj
        ? dateObj.toLocaleDateString("en-US", { timeZone: "Asia/Kolkata", weekday: "short" })
        : "";

      return {
        ...r,
        id: r.employee_ID || employeeId,
        dateDisplay,
        dayDisplay,
        firstIn,
        firstOut,
        secondIn,
        secondOut,
        firstworkingHours: r.firstworkingHours,
        secondworkingHours: r.secondworkingHours,
        hours: hoursDisplay,
        workingHours:
          r.workingHours !== undefined && r.workingHours !== null
            ? r.workingHours
            : ((r.firstworkingHours || 0) + (r.secondworkingHours || 0)),
        status: r.status || "Present",
        place: r.place || r.address || "",
      };
    });
  }, [allRecords, employeeId]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return processedLogs.filter((log) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        log.dateDisplay.toLowerCase().includes(q) ||
        log.dayDisplay.toLowerCase().includes(q) ||
        (log.status && log.status.toLowerCase().includes(q)) ||
        (log.place && log.place.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "All" ||
        (log.status && log.status.toLowerCase() === statusFilter.toLowerCase());

      return matchesSearch && matchesStatus;
    });
  }, [processedLogs, searchQuery, statusFilter]);

  // Pagination Calculation
  const totalEntries = filteredLogs.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const indexOfLastLog = activePage * entriesPerPage;
  const indexOfFirstLog = indexOfLastLog - entriesPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);

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
            Real-time Indian Standard Time (IST) multi-session attendance logs.
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
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-lime-50 border border-lime-200 text-[#588b12] flex items-center justify-center font-bold shadow-xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Today's Attendance Status
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-lg font-black text-slate-800">
                {todayAttendance?.status || "Not Checked In Today"}
              </span>
              {todayAttendance && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {todayAttendance.workingHours !== undefined ? `${todayAttendance.workingHours} hrs` : ""}
                </span>
              )}
            </div>
            {todayAttendance && (
              <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                <span>
                  S1: {formatToIST12Hour(todayAttendance.firstinTime) || "--"} - {formatToIST12Hour(todayAttendance.firstoutTime) || "--"}
                </span>
                <span>•</span>
                <span>
                  S2: {formatToIST12Hour(todayAttendance.secondinTime) || "--"} - {formatToIST12Hour(todayAttendance.secondoutTime) || "--"}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleNewCheckIn()}
            disabled={punchLoading}
            className="flex items-center gap-2 rounded-xl bg-[#588b12] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#47700e] transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
          >
            {punchLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            Check In
          </button>

          <button
            onClick={() => handleNewCheckOut()}
            disabled={punchLoading}
            className="flex items-center gap-2 rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-rose-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
          >
            {punchLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            Check Out
          </button>
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

      {/* ── TAB 1: Daily Attendance History Table (Admin Panel Style) ─────────────────────────── */}
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
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-[#588b12] focus:ring-1 focus:ring-[#588b12]"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#588b12]"
              >
                <option value="All">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Checked In">Checked In</option>
                <option value="Late Arrival">Late Arrival</option>
                <option value="Late">Late</option>
                <option value="Early Exit">Early Exit</option>
                <option value="Absent">Absent</option>
                <option value="On Leave">On Leave</option>
              </select>
            </div>
          </div>

          {/* Table matching Admin Panel design */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Day</th>
                  <th className="px-6 py-4">Session 1 (IST)</th>
                  <th className="px-6 py-4">Session 2 (IST)</th>
                  <th className="px-6 py-4">Total Hours</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150/80">
                {loadingRecords ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-[#588b12]" />
                        <span>Loading attendance records...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Calendar className="w-8 h-8 text-slate-300" />
                        <span className="font-semibold text-slate-500">No attendance logs found</span>
                        <span className="text-xs">Punch in to create your attendance record.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentLogs.map((log, idx) => (
                    <tr key={log._id || idx} className="hover:bg-slate-50/50 transition-colors">
                      {/* Date */}
                      <td className="px-6 py-4 font-bold text-slate-800 whitespace-nowrap">
                        {log.dateDisplay}
                      </td>

                      {/* Day */}
                      <td className="px-6 py-4 text-slate-500 font-semibold">
                        {log.dayDisplay}
                      </td>

                      {/* Session 1 (In / Out) */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 text-xs">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                            <span className="text-slate-400 text-[10px] uppercase font-bold w-7">In:</span>
                            <span className="font-semibold text-slate-800">{log.firstIn}</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0"></span>
                            <span className="text-slate-400 text-[10px] uppercase font-bold w-7">Out:</span>
                            <span className="font-semibold text-slate-800">{log.firstOut}</span>
                          </span>
                          {log.firstworkingHours !== undefined && log.firstworkingHours !== null && log.firstoutTime && (
                            <span className="text-[11px] font-semibold text-slate-500">
                              Hrs: <span className={Number(log.firstworkingHours) < 0 ? "text-rose-600 font-bold" : "text-slate-700"}>{log.firstworkingHours} hrs</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Session 2 (In / Out) */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 text-xs">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                            <span className="text-slate-400 text-[10px] uppercase font-bold w-7">In:</span>
                            <span className="font-semibold text-slate-800">{log.secondIn}</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0"></span>
                            <span className="text-slate-400 text-[10px] uppercase font-bold w-7">Out:</span>
                            <span className="font-semibold text-slate-800">{log.secondOut}</span>
                          </span>
                          {log.secondworkingHours !== undefined && log.secondworkingHours !== null && log.secondoutTime && (
                            <span className="text-[11px] font-semibold text-slate-500">
                              Hrs: <span className={Number(log.secondworkingHours) < 0 ? "text-rose-600 font-bold" : "text-slate-700"}>{log.secondworkingHours} hrs</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total Working Hours */}
                      <td className="px-6 py-4 font-bold text-slate-800">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                            Number(log.workingHours) < 0
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {log.hours}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.status === "Present" && (
                          <span className="px-2.5 py-1 rounded-full bg-lime-100 text-lime-800 text-xs font-bold uppercase inline-flex items-center gap-1">
                            ● Present
                          </span>
                        )}
                        {log.status === "Checked In" && (
                          <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase inline-flex items-center gap-1">
                            ● Checked In
                          </span>
                        )}
                        {(log.status === "Late" || log.status === "Late Arrival") && (
                          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase inline-flex items-center gap-1">
                            ● Late Arrival
                          </span>
                        )}
                        {log.status === "Early Exit" && (
                          <span className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-bold uppercase inline-flex items-center gap-1">
                            ● Early Exit
                          </span>
                        )}
                        {log.status === "Absent" && (
                          <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold uppercase inline-flex items-center gap-1">
                            ● Absent
                          </span>
                        )}
                        {log.status === "On Leave" && (
                          <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold uppercase inline-flex items-center gap-1">
                            ● On Leave
                          </span>
                        )}
                        {![
                          "Present",
                          "Checked In",
                          "Late",
                          "Late Arrival",
                          "Early Exit",
                          "Absent",
                          "On Leave",
                        ].includes(log.status) && (
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold uppercase">
                            {log.status}
                          </span>
                        )}
                      </td>
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
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={activePage === 1}
                className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white cursor-pointer"
              >
                &lt;
              </button>
              <span className="px-2 font-semibold text-slate-700">
                {activePage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={activePage === totalPages}
                className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white cursor-pointer"
              >
                &gt;
              </button>
            </div>
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
                        <td className="px-6 py-4 font-bold text-slate-800">{day.date}</td>
                        <td className="px-6 py-4 text-slate-500 font-medium">{day.day}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              day.status === "Present"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : day.status === "Late"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : day.status === "Half Day"
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : day.status === "On Leave"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : day.status === "Absent"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {day.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-semibold text-slate-700">
                          {day.checkInTime}
                        </td>
                        <td className="px-6 py-4 font-mono font-semibold text-slate-700">
                          {day.checkOutTime}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-800">
                          {day.workedHoursFormatted}
                        </td>
                        <td className="px-6 py-4">
                          {day.isOvertime ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
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
  
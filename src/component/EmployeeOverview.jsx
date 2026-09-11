import React, { useState, useEffect } from "react";
import {
  Clock,
  CalendarCheck,
  CalendarDays,
  FileText,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  HeartPulse,
  Coffee,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import AxiosInstance from "../utilities/AxiosInstance";
import {
  formatToIST12Hour,
  getTodayISTDateString,
  formatToISTDateString,
  getDurationMinutes,
  formatMinutesToDuration,
} from "./EmployeeAttendance";

export default function EmployeeOverview({
  employeeDetails,
  leaves = [],
  payslips = [],
  onNavigateTab,
  onOpenApplyLeave,
}) {
  const employeeId = employeeDetails?.employeeId || employeeDetails?.id;
  const firstName = employeeDetails?.firstName || "Employee";
  const fullName = [employeeDetails?.firstName, employeeDetails?.lastName].filter(Boolean).join(" ");

  // Greeting based on IST hour
  const [greeting, setGreeting] = useState("Welcome");
  const [istTime, setIstTime] = useState("");
  const [istDate, setIstDate] = useState("");

  // Today's attendance state
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loadingToday, setLoadingToday] = useState(true);
  const [punchLoading, setPunchLoading] = useState(false);

  // Recent attendance logs
  const [recentLogs, setRecentLogs] = useState([]);

  // Live IST Clock and Greeting
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const currentHour = parseInt(
        now.toLocaleTimeString("en-US", {
          timeZone: "Asia/Kolkata",
          hour: "numeric",
          hour12: false,
        }),
        10
      );

      if (currentHour >= 4 && currentHour < 12) {
        setGreeting("Good Morning");
      } else if (currentHour >= 12 && currentHour < 17) {
        setGreeting("Good Afternoon");
      } else {
        setGreeting("Good Evening");
      }

      setIstTime(
        now.toLocaleTimeString("en-US", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );

      setIstDate(
        now.toLocaleDateString("en-GB", {
          timeZone: "Asia/Kolkata",
          weekday: "long",
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Monthly Attendance Summary
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [attendanceViewMode, setAttendanceViewMode] = useState("monthly"); // "monthly" | "recent"

  const fetchMonthlySummary = async () => {
    if (!employeeId) return;
    setLoadingMonthly(true);
    try {
      const currentMonth = getTodayISTDateString().slice(0, 7);
      const res = await AxiosInstance.get(
        `/attendance/monthly-summary?month=${currentMonth}&employeeId=${employeeId}`
      );
      const list = res.data?.summaries || res.data?.summary || [];
      const mySummary =
        list.find(
          (s) =>
            s.employeeId === employeeId ||
            s.employeeId === employeeDetails?._id ||
            s._id === employeeDetails?._id
        ) || (list.length === 1 ? list[0] : null);
      setMonthlySummary(mySummary || null);
    } catch (err) {
      console.error("Error fetching overview monthly summary:", err);
    } finally {
      setLoadingMonthly(false);
    }
  };

  // Fetch Attendance records for dashboard
  const fetchAttendance = async () => {
    if (!employeeId) return;
    try {
      setLoadingToday(true);
      const res = await AxiosInstance.get(`/attendance/${employeeId}`);
      const raw = Array.isArray(res.data) ? res.data : [];

      const todayStr = getTodayISTDateString();
      const sortedDesc = [...raw].sort(
        (a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)
      );
      setRecentLogs(sortedDesc.slice(0, 10));

      // Look for today's active check-in or latest record for today
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
      console.error("Error fetching dashboard attendance:", err);
    } finally {
      setLoadingToday(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      fetchAttendance();
      fetchMonthlySummary();
    }
  }, [employeeId]);

  // Handle Quick Punch
  const handleQuickPunch = async () => {
    if (!employeeId) return;
    setPunchLoading(true);
    const todayStr = getTodayISTDateString();

    const isCheckedIn = Boolean(
      todayAttendance?.checkInTime &&
      todayAttendance?.checkInTime !== "--:--" &&
      (!todayAttendance?.checkOutTime ||
        todayAttendance?.checkOutTime === "--:--" ||
        todayAttendance?.checkOutTime === "In Progress...")
    );

    try {
      if (isCheckedIn) {
        // Perform Check-Out
        const res = await AxiosInstance.patch("/attendance/check-out", {
          employee_ID: employeeId,
          date: todayStr,
          attendanceId: todayAttendance?._id,
        });
        toast.success("Home visit checked out successfully!");
        if (res.data?.attendance) setTodayAttendance(res.data.attendance);
      } else {
        // Perform Check-In
        const res = await AxiosInstance.post("/attendance/check-in", {
          employee_ID: employeeId,
          name: fullName,
          date: todayStr,
          place: "Home Visit",
          address: "Home Visit",
        });
        toast.success("Home visit check-in successful!");
        if (res.data?.attendance) setTodayAttendance(res.data.attendance);
      }
      fetchAttendance();
      fetchMonthlySummary();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || "Action failed.";
      toast.error(msg);
    } finally {
      setPunchLoading(false);
    }
  };

  // Compute Leave Balances accurately
  const getLeaveStats = (type) => {
    const DEFAULT_TOTAL = 12;
    const normalizedType = (type || "").toLowerCase().trim();

    // 1. Find configured balance from employee profile
    const balanceObj = (employeeDetails?.leaveBalances || []).find((b) => {
      const bType = (b.leaveType || "").toLowerCase().trim();
      if (bType === normalizedType) return true;
      if (normalizedType.includes("casual") && bType.includes("casual")) return true;
      if ((normalizedType.includes("sick") || normalizedType.includes("medical")) && (bType.includes("sick") || bType.includes("medical"))) return true;
      if ((normalizedType.includes("annual") || normalizedType.includes("paid")) && (bType.includes("annual") || bType.includes("paid"))) return true;
      return false;
    });

    const totalAllowed = balanceObj?.allowedDays && balanceObj.allowedDays > 0 ? balanceObj.allowedDays : DEFAULT_TOTAL;
    const backendTaken = Number(balanceObj?.takenLeaves) || 0;

    // 2. Compute approved days dynamically from leaves list
    const approvedDaysFromLeaves = (leaves || [])
      .filter((l) => {
        if (l.status !== "Approved") return false;
        const lType = (l.type || "").toLowerCase().trim();
        if (normalizedType.includes("casual")) return lType.includes("casual");
        if (normalizedType.includes("sick") || normalizedType.includes("medical")) return lType.includes("sick") || lType.includes("medical");
        if (normalizedType.includes("annual") || normalizedType.includes("paid")) return lType.includes("annual") || lType.includes("paid");
        return lType === normalizedType;
      })
      .reduce((acc, l) => {
        const start = new Date(l.startDate);
        const end = l.endDate ? new Date(l.endDate) : start;
        const d1 = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
        const d2 = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
        const diff = Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
        return acc + Math.max(1, diff);
      }, 0);

    const takenDays = Math.max(backendTaken, approvedDaysFromLeaves);
    const available = Math.max(0, totalAllowed - takenDays);

    return { totalAllowed, takenDays, available };
  };

  const annualLeave = getLeaveStats("Paid Annual Leave");
  const sickLeave = getLeaveStats("Sick Leave");
  const casualLeave = getLeaveStats("Casual Leave");

  // Punch status flags
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

  // Monthly stats
  const currentMonthStr = getTodayISTDateString().slice(0, 7);
  const monthLogs = recentLogs.filter((l) => {
    if (!l.date) return false;
    return new Date(l.date).toISOString().slice(0, 7) === currentMonthStr;
  });

  let totalMonthWorkedMins = 0;
  let totalMonthOtMins = 0;
  recentLogs.forEach((l) => {
    if (l.date && new Date(l.date).toISOString().slice(0, 7) === currentMonthStr) {
      const dur = getDurationMinutes(l.checkInTime, l.checkOutTime);
      totalMonthWorkedMins += dur;
      totalMonthOtMins += Math.max(0, dur - 480);
    }
  });

  return (
    <div className="space-y-6">
      {/* ── Welcome Banner ───────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#142312] to-slate-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#588b12]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-bold uppercase tracking-wider text-[#96c93d] border border-white/10">
              <Sparkles className="w-3.5 h-3.5" />
              Employee Dashboard
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {greeting}, {firstName}!
            </h1>
            <p className="text-sm text-slate-300 max-w-xl">
              Welcome back to your workspace. Here is a quick snapshot of your attendance, leaves, and recent activity.
            </p>
          </div>

          {/* Quick Action buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigateTab?.("Attendance")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/20 backdrop-blur-sm transition-all"
            >
              <CalendarCheck className="w-4 h-4 text-[#96c93d]" />
              Attendance Hub
            </button>
            <button
              onClick={onOpenApplyLeave}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#588b12] to-[#76b81d] hover:opacity-95 text-white text-xs font-bold shadow-lg transition-all"
            >
              <CalendarDays className="w-4 h-4" />
              Apply Leave
            </button>
          </div>
        </div>
      </div>

      {/* ── Metric Cards Grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* 1. Today's Attendance Widget */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Clock className="w-4 h-4 text-[#588b12]" />
              Today's Attendance
            </div>
            {isCheckedIn && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            )}
          </div>

          <div>
            <div className="text-xl font-black text-slate-800">
              {notCheckedIn ? (
                <span className="text-amber-600">Not Checked In</span>
              ) : isCheckedIn ? (
                <span className="text-emerald-600">Checked In</span>
              ) : (
                <span className="text-blue-600">Completed</span>
              )}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>In: {todayAttendance?.checkInTime ? formatToIST12Hour(todayAttendance.checkInTime) : "--:--"}</span>
              <span>Out: {todayAttendance?.checkOutTime ? formatToIST12Hour(todayAttendance.checkOutTime) : "--:--"}</span>
            </div>
          </div>

          <button
            onClick={handleQuickPunch}
            disabled={punchLoading}
            className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
              isCheckedIn
                ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
            }`}
          >
            {isCheckedIn ? <LogOut className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
            {punchLoading
              ? "Processing..."
              : isCheckedIn
              ? "Check Out Now"
              : isCompleted
              ? "Punch In Again"
              : "Check In Now"}
          </button>
        </div>

        {/* 2. Paid Annual Leave Card */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <CalendarDays className="w-4 h-4 text-emerald-600" />
              Paid Annual Leave
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Annual Quota
            </span>
          </div>

          <div>
            <div className="text-2xl font-black text-slate-900">
              {annualLeave.available}{" "}
              <span className="text-sm font-semibold text-slate-400">
                / {annualLeave.totalAllowed} Days Left
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-[#588b12] h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (annualLeave.available / (annualLeave.totalAllowed || 1)) * 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>Used: {annualLeave.takenDays} Days</span>
            <button
              onClick={() => onNavigateTab?.("Leave Requests")}
              className="text-[#588b12] hover:underline font-bold text-[11px]"
            >
              View Details
            </button>
          </div>
        </div>

        {/* 3. Sick Leave Card */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <HeartPulse className="w-4 h-4 text-rose-500" />
              Sick Leave
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Medical
            </span>
          </div>

          <div>
            <div className="text-2xl font-black text-slate-900">
              {sickLeave.available}{" "}
              <span className="text-sm font-semibold text-slate-400">
                / {sickLeave.totalAllowed} Days Left
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-rose-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (sickLeave.available / (sickLeave.totalAllowed || 1)) * 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>Used: {sickLeave.takenDays} Days</span>
            <button
              onClick={() => onNavigateTab?.("Leave Requests")}
              className="text-[#588b12] hover:underline font-bold text-[11px]"
            >
              View Details
            </button>
          </div>
        </div>

        {/* 4. Casual Leave Card */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Coffee className="w-4 h-4 text-amber-600" />
              Casual Leave
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Casual
            </span>
          </div>

          <div>
            <div className="text-2xl font-black text-slate-900">
              {casualLeave.available}{" "}
              <span className="text-sm font-semibold text-slate-400">
                / {casualLeave.totalAllowed} Days Left
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (casualLeave.available / (casualLeave.totalAllowed || 1)) * 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>Used: {casualLeave.takenDays} Days</span>
            <button
              onClick={() => onNavigateTab?.("Leave Requests")}
              className="text-[#588b12] hover:underline font-bold text-[11px]"
            >
              View Details
            </button>
          </div>
        </div>

        {/* 5. Monthly Attendance Summary Card */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <TrendingUp className="w-4 h-4 text-[#588b12]" />
              This Month's Attendance
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {monthlySummary?.attendanceRate || 0}% Rate
            </span>
          </div>

          <div>
            <div className="text-2xl font-black text-slate-900">
              {monthlySummary?.presentDays || 0}{" "}
              <span className="text-sm font-semibold text-slate-400">
                / {monthlySummary?.workingDays || 26} Days Present
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>Worked: {monthlySummary?.totalWorkedFormatted || "0h 00m"}</span>
              <span className="text-amber-600 font-semibold">OT: {monthlySummary?.totalOtFormatted || "0h 00m"}</span>
            </div>
          </div>

          <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>{monthlySummary?.onLeaveDays || 0} Leaves</span>
            <button
              onClick={() => onNavigateTab?.("Attendance")}
              className="text-[#588b12] hover:underline font-bold text-[11px]"
            >
              Monthly Hub →
            </button>
          </div>
        </div>
      </div>

      {/* ── Two Column Activity Overview ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Attendance Activity (Monthly & Recent) */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-[#588b12]" />
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl">
                <button
                  onClick={() => setAttendanceViewMode("monthly")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    attendanceViewMode === "monthly"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Monthly Log ({currentMonthStr})
                </button>
                <button
                  onClick={() => setAttendanceViewMode("recent")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    attendanceViewMode === "recent"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Recent Punches
                </button>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab?.("Attendance")}
              className="flex items-center gap-1 text-xs font-bold text-[#588b12] hover:underline shrink-0"
            >
              Full Calendar <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {attendanceViewMode === "monthly" ? (
            <div className="p-4 divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[380px]">
              {loadingMonthly ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Loading monthly attendance...
                </div>
              ) : !monthlySummary?.dailyBreakdown || monthlySummary.dailyBreakdown.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No monthly attendance records for {currentMonthStr}.
                </div>
              ) : (
                monthlySummary.dailyBreakdown
                  .filter((d) => d.status !== "Upcoming")
                  .slice(-8)
                  .reverse()
                  .map((d, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          {d.date} <span className="text-slate-400 font-normal">({d.day})</span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          {d.checkIn && d.checkIn !== "--:--" ? formatToIST12Hour(d.checkIn) : "--:--"}
                          {" - "}
                          {d.status === "Checked In" ? (
                            <span className="text-blue-600 font-semibold italic">In Progress</span>
                          ) : d.checkOut && d.checkOut !== "--:--" ? (
                            formatToIST12Hour(d.checkOut)
                          ) : (
                            "--:--"
                          )}
                          {d.durationFormatted && d.durationFormatted !== "0m" && (
                            <span className="ml-2 font-sans font-semibold text-slate-700">
                              ({d.durationFormatted})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {d.isOvertime && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            +{d.otFormatted} OT
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            d.status === "Present"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : d.status === "Checked In"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : d.status === "On Leave"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : d.status === "Late"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : d.status === "Sunday"
                              ? "bg-slate-100 text-slate-500"
                              : "bg-red-50 text-red-600 border border-red-200"
                          }`}
                        >
                          {d.status}
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[380px]">
              {recentLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No attendance records yet. Punch in to get started!
                </div>
              ) : (
                recentLogs.map((log, idx) => {
                  const dur = getDurationMinutes(log.checkInTime, log.checkOutTime);
                  const ot = Math.max(0, dur - 480);
                  const dateStr = log.date
                    ? new Date(log.date).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "N/A";

                  return (
                    <div key={log._id || idx} className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-slate-800">{dateStr}</div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          {formatToIST12Hour(log.checkInTime)} - {log.checkOutTime ? formatToIST12Hour(log.checkOutTime) : "In Progress"}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {ot > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            +{formatMinutesToDuration(ot)} OT
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            log.status === "Present"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : log.status === "Checked In"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {log.status || "Present"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Right: Recent Leave Requests */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#588b12]" />
              <h3 className="text-sm font-bold text-slate-800">My Leave Requests</h3>
            </div>
            <button
              onClick={() => onNavigateTab?.("Leave Requests")}
              className="flex items-center gap-1 text-xs font-bold text-[#588b12] hover:underline"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {leaves.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No leave requests found. Click "Apply Leave" if you need time off.
              </div>
            ) : (
              leaves.slice(0, 5).map((l, idx) => {
                const start = l.startDate ? new Date(l.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "";
                const end = l.endDate ? new Date(l.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "";

                return (
                  <div key={l._id || idx} className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">{l.type || "Leave"}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {start === end ? start : `${start} - ${end}`}
                        {l.reason && ` • ${l.reason}`}
                      </div>
                    </div>

                    <div>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          l.status === "Approved"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : l.status === "Pending HR"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {l.status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

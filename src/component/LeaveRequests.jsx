import React from "react";
import { Plus } from "lucide-react";

export default function LeaveRequests({
  leaves,
  employeeDetails,
  onApplyClick,
  onCancelClick,
  onViewDetailsClick,
}) {
  const getStatusColor = (status) => {
    if (status === "Approved") return "bg-lime-50 text-lime-700 border-lime-200";
    if (status === "Rejected") return "bg-rose-50 text-rose-700 border-rose-200";
    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  const formatLeaveDates = (start, end) => {
    if (!start) return "";
    const startDateStr = new Date(start).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    if (!end || end === start) return startDateStr;
    const endDateStr = new Date(end).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    return `${startDateStr} – ${endDateStr}`;
  };

  const calculateDays = (start, end) => {
    if (!start) return "0 Days";
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : startDate;
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return `${diffDays} ${diffDays === 1 ? "Day" : "Days"}`;
  };

  const getUsedDays = (type) => {
    const approvedAppliedDays = leaves
      .filter((l) => l.type === type && l.status === "Approved")
      .reduce((acc, l) => {
        const start = new Date(l.startDate);
        const end = l.endDate ? new Date(l.endDate) : start;
        const diff = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
        return acc + diff;
      }, 0);

    const bal = employeeDetails?.leaveBalances?.find((b) => b.leaveType === type);
    const initialTaken = bal ? (bal.takenLeaves ?? 0) : 0;

    return approvedAppliedDays + initialTaken;
  };

  const getLeaveBalance = (type) => {
    const bal = employeeDetails?.leaveBalances?.find((b) => b.leaveType === type);
    return bal ? bal.allowedDays : 10;
  };

  const annualAllowed = getLeaveBalance("Paid Annual Leave");
  const annualUsed = getUsedDays("Paid Annual Leave");
  const annualUnused = Math.max(0, annualAllowed - annualUsed);
  const annualPct = annualAllowed > 0 ? (annualUsed / annualAllowed) * 100 : 0;
  const strokeDashoffset = 251.2 - (251.2 * annualPct) / 100;

  const sickAllowed = getLeaveBalance("Sick Leave");
  const sickUsed = getUsedDays("Sick Leave");
  const sickUnused = Math.max(0, sickAllowed - sickUsed);
  const unpaidSickUsed = getUsedDays("Unpaid Sick Leave");

  const casualAllowed = getLeaveBalance("Casual Leave");
  const casualUsed = getUsedDays("Casual Leave");
  const casualUnused = Math.max(0, casualAllowed - casualUsed);

  const upcomingLeave = leaves
    .filter((l) => l.status === "Approved" && new Date(l.startDate) > new Date())
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];

  return (
    <div className="space-y-6">
      {/* Header block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            My Leave Requests
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Monitor annual leave balances and submit pending approvals
          </p>
        </div>
        <button
          onClick={onApplyClick}
          className="bg-[#588b12] hover:bg-[#4a750f] text-white px-4.5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-lime-900/10 hover:shadow-lime-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Apply for New Leave
        </button>
      </div>

      {/* Annual stats cards row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* 1. Annual Leave Balance Donut Chart Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col items-center">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
            Annual Leave Balance
          </h3>

          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg
              className="w-full h-full transform -rotate-90"
              viewBox="0 0 100 100"
            >
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#f1f5f9"
                strokeWidth="10"
                fill="none"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#588b12"
                strokeWidth="10"
                fill="none"
                strokeDasharray="251.2"
                strokeDashoffset={strokeDashoffset}
              />
            </svg>

            <div className="absolute text-center leading-none select-none">
              <span className="text-3xl font-black text-slate-900 font-sans">
                {annualUnused}
              </span>
              <span className="block text-[10px] text-slate-400 uppercase font-extrabold mt-1">
                days left
              </span>
            </div>
          </div>

          <div className="flex gap-6 mt-4.5 text-xs font-bold w-full justify-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-200" />
              <span className="text-slate-500">Allowed: {annualAllowed}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#588b12]" />
              <span className="text-slate-800">Used: {annualUsed}</span>
            </div>
          </div>
        </div>

        {/* 2. Sick Leaves Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
            My Sick Leaves
          </h3>
          <div className="space-y-1">
            <p className="text-4xl font-black text-slate-900 font-sans">{sickUnused} days</p>
            <p className="text-xs text-slate-400">
              Remaining sick allowances (Allowed: {sickAllowed})
            </p>
          </div>
          <div className="border-t border-slate-100 pt-4 space-y-2.5 text-sm font-medium">
            <div className="flex justify-between">
              <span className="text-slate-500">● Paid sick used</span>
              <span className="text-slate-800 font-bold">{sickUsed} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">● Unpaid sick used</span>
              <span className="text-slate-800 font-bold">{unpaidSickUsed} days</span>
            </div>
          </div>
        </div>

        {/* 3. Casual Leaves Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
            My Casual Leaves
          </h3>
          <div className="space-y-1">
            <p className="text-4xl font-black text-slate-900 font-sans">{casualUnused} days</p>
            <p className="text-xs text-slate-400">
              Remaining casual allowances (Allowed: {casualAllowed})
            </p>
          </div>
          <div className="border-t border-slate-100 pt-4 space-y-2.5 text-sm font-medium">
            <div className="flex justify-between">
              <span className="text-slate-500">● Casual leaves used</span>
              <span className="text-slate-800 font-bold">{casualUsed} days</span>
            </div>
          </div>
        </div>

        {/* 4. Upcoming Approved Leave Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
              Upcoming Approved Leave
            </h3>
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-widest font-mono text-slate-400 block font-bold">
                Next Leave
              </span>
              <p className="text-lg font-extrabold text-slate-900">
                {upcomingLeave
                  ? formatLeaveDates(upcomingLeave.startDate, upcomingLeave.endDate)
                  : "None Scheduled"}
              </p>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <span className="text-[10px] uppercase tracking-widest font-mono text-slate-400 block font-bold">
              Total
            </span>
            <p className="text-2xl font-black text-[#588b12] font-sans">
              {upcomingLeave
                ? calculateDays(upcomingLeave.startDate, upcomingLeave.endDate)
                : "0 Days"}
            </p>
          </div>
        </div>
      </div>

      {/* Leaves list table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-base">
            Leave History & Status
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Dates</th>
                <th className="px-6 py-4">Total Days</th>
                <th className="px-6 py-4">Submitted On</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150/80 text-sm">
              {leaves.map((l, i) => (
                <tr
                  key={l._id || i}
                  className="hover:bg-slate-55/30 transition-colors"
                >
                  <td className="px-6 py-4 font-bold text-slate-800">
                    {l.type}
                  </td>
                  <td className="px-6 py-4 text-slate-600 font-semibold">
                    {formatLeaveDates(l.startDate, l.endDate)}
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-medium">
                    {calculateDays(l.startDate, l.endDate)}
                  </td>
                  <td className="px-6 py-4 text-slate-450 font-medium">
                    {l.createdAt
                      ? new Date(l.createdAt).toLocaleDateString("en-GB")
                      : "Today"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(
                        l.status
                      )}`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onViewDetailsClick(l)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-650 rounded-xl cursor-pointer"
                      >
                        View Details
                      </button>
                      {l.status === "Pending HR" && (
                        <button
                          onClick={() => onCancelClick(l)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 rounded-xl cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-slate-50/60 px-6 py-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing 1 to {leaves.length} of {leaves.length} entries
          </span>
        </div>
      </div>
    </div>
  );
}

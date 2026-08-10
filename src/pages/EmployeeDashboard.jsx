import React, { useEffect, useState } from "react";
import {
  User,
  Briefcase,
  Phone,
  MapPin,
  Calendar,
  ChevronRight,
  Plus,
  X,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AxiosInstance from "../utilities/AxiosInstance";
import Sidebar from "../layouts/Sidebar";
import Navbar from "../layouts/Navbar";

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("employeeActiveTab") || "Detailed Daily Log";
  });

  useEffect(() => {
    localStorage.setItem("employeeActiveTab", activeTab);
  }, [activeTab]);

  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Custom states for leaves
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [leaves, setLeaves] = useState([]);

  const [newLeave, setNewLeave] = useState({
    type: "Paid Annual Leave",
    startDate: "",
    endDate: "",
    reason: "",
  });

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
      year: "numeric"
    });
    if (!end || end === start) return startDateStr;
    const endDateStr = new Date(end).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
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

  const fetchLeaves = (employeeKey) => {
    AxiosInstance.get(`/leaves/employee/${employeeKey}`)
      .then((res) => {
        setLeaves(res.data || []);
      })
      .catch((err) => {
        console.error("Error fetching leaves:", err);
      });
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

  useEffect(() => {
    const storedUser = sessionStorage.getItem("user");

    if (!storedUser) {
      navigate("/");
      return;
    }

    try {
      const user = JSON.parse(storedUser);
      const employeeKey = user?.id || user?.employeeId;

      if (!employeeKey) {
        setLoadingProfile(false);
        return;
      }

      AxiosInstance.get(`/employees/${employeeKey}`)
        .then((response) => {
          setEmployeeDetails(response?.data || null);
        })
        .catch(() => {
          toast.error("Unable to load employee details.");
        })
        .finally(() => {
          setLoadingProfile(false);
        });

      fetchLeaves(employeeKey);
    } catch (error) {
      console.error("Failed to parse stored user", error);
      setLoadingProfile(false);
    }
  }, [navigate]);

  const handleApplyLeaveSubmit = async (e) => {
    e.preventDefault();
    if (!newLeave.startDate) {
      toast.error("Please enter start date.");
      return;
    }

    const storedUser = sessionStorage.getItem("user");
    if (!storedUser) return;
    const user = JSON.parse(storedUser);
    const employeeKey = user?.id || user?.employeeId;

    try {
      const response = await AxiosInstance.post("/leaves", {
        employeeId: employeeKey,
        type: newLeave.type,
        startDate: newLeave.startDate,
        endDate: newLeave.endDate || newLeave.startDate,
        reason: newLeave.reason,
      });

      setLeaves([response.data, ...leaves]);
      toast.success("Leave application submitted successfully!");
      setShowApplyModal(false);
      setNewLeave({
        type: "Paid Annual Leave",
        startDate: "",
        endDate: "",
        reason: "",
      });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit leave request.");
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-800 lg:pl-56">
      {/* Shared Employee Sidebar */}
      <Sidebar
        variant="employee"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Navbar */}
      <Navbar
        title={activeTab}
        onMobileMenuOpen={() => setMobileMenuOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pt-[60px]">
        {/* Main Client Area depending on activeTab */}
        <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto">
          <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-[#f7fee7] p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-2xl bg-[#588b12]/10 flex items-center justify-center overflow-hidden border border-[#588b12]/20 shadow-sm">
                  {employeeDetails?.profilePhoto ? (
                    <img
                      src={employeeDetails.profilePhoto}
                      alt="Employee"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-black text-[#588b12]">
                      {(employeeDetails?.firstName?.[0] || "E").toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    <User className="w-3.5 h-3.5" />
                    Employee Profile
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">
                    {loadingProfile
                      ? "Loading employee..."
                      : `${employeeDetails?.firstName || ""} ${employeeDetails?.lastName || ""}`.trim() ||
                        "Employee"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {employeeDetails?.designation || "Employee"} •{" "}
                    {employeeDetails?.employeeId || "N/A"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                <div className="rounded-xl bg-white/80 p-3 shadow-sm border border-slate-200">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    Email
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {employeeDetails?.email || "N/A"}
                  </p>
                </div>
                <div className="rounded-xl bg-white/80 p-3 shadow-sm border border-slate-200">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    Phone
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {employeeDetails?.workPhoneNumber ||
                      employeeDetails?.personalPhoneNumber ||
                      "N/A"}
                  </p>
                </div>
                <div className="rounded-xl bg-white/80 p-3 shadow-sm border border-slate-200">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    Status
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {employeeDetails?.status || "Active"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Active Tab: Employee Details */}
          {(activeTab === "Detailed Daily Log" ||
            activeTab === "Dashboard") && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Employee Details
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Complete profile and work information for the current
                    employee
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-xl border border-[#588b12]/20 bg-lime-50 px-4 py-2 text-sm font-bold text-[#588b12]">
                  <Briefcase className="w-4 h-4" />
                  {employeeDetails?.designation || "Employee"}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      Profile Overview
                    </h3>
                    <p className="text-sm text-slate-500">
                      A complete view of employee information
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/admin-dashboard")}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                        <User className="w-3.5 h-3.5" />
                        Personal Information
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                            Full Name
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {employeeDetails?.firstName || "N/A"}{" "}
                            {employeeDetails?.lastName || ""}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                            Employee ID
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {employeeDetails?.employeeId || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                            Email
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {employeeDetails?.email || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                            Phone
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {employeeDetails?.workPhoneNumber ||
                              employeeDetails?.personalPhoneNumber ||
                              "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                            Gender
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {employeeDetails?.gender || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                            Date of Birth
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {employeeDetails?.dob
                              ? new Date(
                                  employeeDetails.dob,
                                ).toLocaleDateString()
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                        <MapPin className="w-3.5 h-3.5" />
                        Address Information
                      </div>
                      <div className="mt-4 space-y-2 text-sm text-slate-700">
                        <p className="font-semibold text-slate-800">
                          {employeeDetails?.presentAddress || "N/A"}
                        </p>
                        <p className="text-slate-500">
                          {employeeDetails?.permanentAddress || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                        <Briefcase className="w-3.5 h-3.5" />
                        Work Information
                      </div>
                      <div className="mt-4 space-y-3 text-sm text-slate-700">
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">Designation</span>
                          <span className="font-semibold text-slate-900">
                            {employeeDetails?.designation || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">Status</span>
                          <span className="font-semibold text-slate-900">
                            {employeeDetails?.status || "Active"}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">Employee Type</span>
                          <span className="font-semibold text-slate-900">
                            {employeeDetails?.employeeType || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">Joining Date</span>
                          <span className="font-semibold text-slate-900">
                            {employeeDetails?.dateOfJoining
                              ? new Date(
                                  employeeDetails.dateOfJoining,
                                ).toLocaleDateString()
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">Experience</span>
                          <span className="font-semibold text-slate-900">
                            {employeeDetails?.totalWorkExperience ?? "N/A"} yrs
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                        <Phone className="w-3.5 h-3.5" />
                        Contact Information
                      </div>
                      <div className="mt-4 space-y-3 text-sm text-slate-700">
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">Work Phone</span>
                          <span className="font-semibold text-slate-900">
                            {employeeDetails?.workPhoneNumber || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">Personal Phone</span>
                          <span className="font-semibold text-slate-900">
                            {employeeDetails?.personalPhoneNumber || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">
                            Emergency Contact
                          </span>
                          <span className="font-semibold text-slate-900">
                            {employeeDetails?.emergencyContact || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-slate-500">
                            Emergency Number
                          </span>
                          <span className="font-semibold text-slate-900">
                            {employeeDetails?.emergencyNumber || "N/A"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active Tab: Leave Requests (Leave.png view) */}
          {activeTab === "Leave Requests" && (
            <div className="space-y-6">
              {/* Header block */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    My Leave Requests
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Monitor annual leaf balances and submit pending approvals
                  </p>
                </div>
                <button
                  onClick={() => setShowApplyModal(true)}
                  className="bg-[#588b12] hover:bg-[#4a750f] text-white px-4.5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-lime-900/10 hover:shadow-lime-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Apply for New Leave
                </button>
              </div>

              {/* Annual stats cards row matching Leave.png */}
              {(() => {
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
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* 1. Annual Leave Balance Donut Chart Card */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col items-center">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
                        Annual Leave Balance
                      </h3>

                      {/* Progress donut SVG */}
                      <div className="relative w-36 h-36 flex items-center justify-center">
                        <svg
                          className="w-full h-full transform -rotate-90"
                          viewBox="0 0 100 100"
                        >
                          {/* Grey background circle */}
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="#f1f5f9"
                            strokeWidth="10"
                            fill="none"
                          />
                          {/* Green progress circle */}
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

                        {/* Inner center text */}
                        <div className="absolute text-center leading-none select-none">
                          <span className="text-3xl font-black text-slate-900">
                            {annualUnused}
                          </span>
                          <span className="block text-[10px] text-slate-450 uppercase font-extrabold mt-1">
                            days left
                          </span>
                        </div>
                      </div>

                      {/* Left / Right Indicators */}
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
                        <p className="text-4xl font-black text-slate-900">{sickUnused} days</p>
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
                        <p className="text-4xl font-black text-slate-900">{casualUnused} days</p>
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
                            {upcomingLeave ? formatLeaveDates(upcomingLeave.startDate, upcomingLeave.endDate) : "None Scheduled"}
                          </p>
                        </div>
                      </div>
                      <div className="border-t border-slate-100 pt-4">
                        <span className="text-[10px] uppercase tracking-widest font-mono text-slate-400 block font-bold">
                          Total
                        </span>
                        <p className="text-2xl font-black text-[#588b12]">
                          {upcomingLeave ? calculateDays(upcomingLeave.startDate, upcomingLeave.endDate) : "0 Days"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

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
                            {l.createdAt ? new Date(l.createdAt).toLocaleDateString("en-GB") : "Today"}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(l.status)}`}
                            >
                              {l.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() =>
                                  toast.info(`Reason: ${l.reason || "No reason provided"}`)
                                }
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-650 rounded-xl cursor-pointer"
                              >
                                View Details
                              </button>
                              {l.status === "Pending HR" && (
                                <button
                                  onClick={async () => {
                                    try {
                                      await AxiosInstance.delete(`/leaves/${l._id}`);
                                      setLeaves(leaves.filter((item) => item._id !== l._id));
                                      toast.success("Leave request cancelled successfully.");
                                    } catch (err) {
                                      toast.error("Failed to cancel leave request.");
                                    }
                                  }}
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
                  <div className="flex items-center gap-1">
                    <button
                      className="px-2 py-1 rounded border border-slate-200/60 bg-white hover:bg-slate-100"
                      disabled
                    >
                      &lt;
                    </button>
                    <button className="px-3 py-1 rounded bg-[#588b12] text-white font-bold">
                      1
                    </button>
                    <button
                      className="px-2 py-1 rounded border border-slate-200/60 bg-white hover:bg-slate-100"
                      disabled
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Leave Application Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base">
                Apply for New Leave
              </h3>
              <button
                onClick={() => setShowApplyModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyLeaveSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Leave Type
                </label>
                <select
                  value={newLeave.type}
                  onChange={(e) =>
                    setNewLeave({ ...newLeave, type: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#588b12] focus:bg-white transition-all font-semibold text-slate-750"
                >
                  <option value="Paid Annual Leave">Paid Annual Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Casual Leave">Casual Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newLeave.startDate}
                    onChange={(e) =>
                      setNewLeave({ ...newLeave, startDate: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#588b12] focus:bg-white transition-all font-medium"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={newLeave.endDate}
                    onChange={(e) =>
                      setNewLeave({ ...newLeave, endDate: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#588b12] focus:bg-white transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Reason for Leave
                </label>
                <textarea
                  value={newLeave.reason}
                  onChange={(e) =>
                    setNewLeave({ ...newLeave, reason: e.target.value })
                  }
                  rows="3"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#588b12] focus:bg-white transition-all font-medium"
                  placeholder="Enter reason..."
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-650 hover:bg-slate-100 text-sm font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#588b12] hover:bg-[#4a750f] text-white rounded-xl text-sm font-bold transition-all cursor-pointer"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

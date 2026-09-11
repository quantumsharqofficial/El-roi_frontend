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
  FileText,
  Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AxiosInstance from "../utilities/AxiosInstance";
import Sidebar from "../layouts/Sidebar";
import Navbar from "../layouts/Navbar";
import EmployeeProfile from "../component/EmployeeProfile";
import LeaveRequests from "../component/LeaveRequests";
import ApplyLeaveModal from "../component/ApplyLeaveModal";
import Payslips from "../component/Payslips";
import PayslipModal from "../component/PayslipModal";
import EmployeeAttendance from "../component/EmployeeAttendance";
import EmployeeOverview from "../component/EmployeeOverview";

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("employeeActiveTab") || "Dashboard";
  });

  useEffect(() => {
    localStorage.setItem("employeeActiveTab", activeTab);
  }, [activeTab]);

  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Custom states for leaves
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [selectedPayslip, setSelectedPayslip] = useState(null);

  const fetchPayslips = (employeeKey) => {
    AxiosInstance.get(`/payroll/employee/${employeeKey}`)
      .then((res) => {
        setPayslips(res.data?.filter(p => p.status === "Paid") || []);
      })
      .catch((err) => {
        console.error("Error fetching payslips:", err);
      });
  };

  const [newLeave, setNewLeave] = useState({
    type: "Paid Annual Leave",
    startDate: "",
    endDate: "",
    reason: "",
  });

  const fetchEmployeeData = (employeeKey) => {
    if (!employeeKey) return;
    AxiosInstance.get(`/employees/${employeeKey}`)
      .then((response) => {
        if (response?.data) setEmployeeDetails(response.data);
      })
      .catch(() => {});
  };

  const fetchLeaves = (employeeKey) => {
    if (!employeeKey) return;
    AxiosInstance.get(`/leaves/employee/${employeeKey}`)
      .then((res) => {
        setLeaves(res.data || []);
      })
      .catch((err) => {
        console.error("Error fetching leaves:", err);
      });
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
      fetchPayslips(employeeKey);
    } catch (error) {
      console.error("Failed to parse stored user", error);
      setLoadingProfile(false);
    }
  }, [navigate]);

  // Re-fetch employee & leaves when switching tabs so leave balances reflect instantly
  useEffect(() => {
    const storedUser = sessionStorage.getItem("user");
    if (!storedUser) return;
    try {
      const user = JSON.parse(storedUser);
      const employeeKey = user?.id || user?.employeeId;
      if (employeeKey) {
        fetchEmployeeData(employeeKey);
        fetchLeaves(employeeKey);
      }
    } catch (err) {}
  }, [activeTab]);

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
      fetchEmployeeData(employeeKey);
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
          {/* Active Tab: Dashboard Overview */}
          {activeTab === "Dashboard" && (
            <EmployeeOverview
              employeeDetails={employeeDetails}
              leaves={leaves}
              payslips={payslips}
              onNavigateTab={setActiveTab}
              onOpenApplyLeave={() => setShowApplyModal(true)}
            />
          )}

          {/* Active Tab: Attendance */}
          {activeTab === "Attendance" && (
            <EmployeeAttendance employeeDetails={employeeDetails} />
          )}

          {/* Active Tab: Employee Profile Details */}
          {(activeTab === "Detailed Daily Log" || activeTab === "Profile") && (
            <>
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

              <EmployeeProfile
                employeeDetails={employeeDetails}
                loadingProfile={loadingProfile}
              />
            </>
          )}

          {/* Active Tab: Leave Requests */}
          {activeTab === "Leave Requests" && (
            <LeaveRequests
              leaves={leaves}
              employeeDetails={employeeDetails}
              onApplyClick={() => setShowApplyModal(true)}
              onCancelClick={async (l) => {
                try {
                  await AxiosInstance.delete(`/leaves/${l._id}`);
                  setLeaves(leaves.filter((item) => item._id !== l._id));
                  toast.success("Leave request cancelled successfully.");
                  const storedUser = sessionStorage.getItem("user");
                  if (storedUser) {
                    const user = JSON.parse(storedUser);
                    fetchEmployeeData(user?.id || user?.employeeId);
                  }
                } catch (err) {
                  toast.error("Failed to cancel leave request.");
                }
              }}
              onViewDetailsClick={(l) =>
                toast.info(`Reason: ${l.reason || "No reason provided"}`)
              }
            />
          )}

          {/* Active Tab: Payslips */}
          {activeTab === "Payslips" && (
            <Payslips
              payslips={payslips}
              onViewPayslipClick={(p) => setSelectedPayslip(p)}
            />
          )}
        </main>
      </div>

      {/* Payslip Details Modal */}
      <PayslipModal
        selectedPayslip={selectedPayslip}
        employeeDetails={employeeDetails}
        onClose={() => setSelectedPayslip(null)}
      />

      {/* Leave Application Modal */}
      <ApplyLeaveModal
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        onSubmit={handleApplyLeaveSubmit}
        newLeave={newLeave}
        setNewLeave={setNewLeave}
      />
    </div>
  );
}

import React, { useState, useEffect } from "react";
import {
  User,
  Briefcase,
  MapPin,
  Phone,
  ArrowLeft,
  ScanFace,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Calendar,
  Coffee,
  HeartPulse,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AxiosInstance from "../utilities/AxiosInstance";

export default function EmployeeProfile({ employeeDetails, loadingProfile }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(employeeDetails);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setProfile(employeeDetails);
  }, [employeeDetails]);

  const handleDeleteFaceVector = async () => {
    const targetId = profile?._id || profile?.employeeId;
    if (!targetId) return;

    setIsDeleting(true);
    try {
      const res = await AxiosInstance.delete(`/employees/${targetId}/face-vector`);
      toast.success(res.data?.message || "Face vector deleted successfully!");
      setProfile((prev) => ({
        ...prev,
        faceVector: [],
        faceVectorUpdatedAt: null,
        faceCaptureStatus: "not_started",
      }));
      setShowDeleteModal(false);
    } catch (err) {
      console.error("Failed to delete face vector:", err);
      toast.error(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to delete face vector. Please try again."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const hasFaceVector = Array.isArray(profile?.faceVector) && profile.faceVector.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Employee Details
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Complete profile and work information for the current employee
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-[#588b12]/20 bg-lime-50 px-4 py-2 text-sm font-bold text-[#588b12]">
          <Briefcase className="w-4 h-4" />
          {profile?.designation || "Employee"}
        </div>
      </div>

      {/* Face Vector Management Card */}
      {profile && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0 ${
                  hasFaceVector
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                    : "bg-amber-50 text-amber-600 border-amber-200"
                }`}
              >
                <ScanFace className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Face Recognition Data
                  </h3>
                  {hasFaceVector ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100/80 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Vector Ready ({profile.faceVector.length} dimensions)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100/80 text-amber-700 border border-amber-200">
                      <AlertCircle className="w-3.5 h-3.5" /> No Face Vector
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {hasFaceVector
                    ? profile.faceVectorUpdatedAt
                      ? `Face vector registered on ${new Date(profile.faceVectorUpdatedAt).toLocaleString()}`
                      : "Active face vector registered in database."
                    : "No face vector registered for this employee. Register face images for automated attendance recognition."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {hasFaceVector ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-bold transition-all shadow-sm cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Face Vector
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate(`/face-capture/${profile?._id || profile?.employeeId}`)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  <ScanFace className="w-4 h-4" />
                  Add Face Vector
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Face Vector Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center gap-3.5 text-rose-600">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Delete Face Vector?</h3>
                <p className="text-xs text-slate-500">Confirmation required</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to delete the face vector for{" "}
              <span className="font-bold text-slate-900">
                {profile?.firstName} {profile?.lastName}
              </span>
              ? This will permanently remove the employee's face recognition data from the database.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-sm font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteFaceVector}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition-all shadow-md shadow-rose-600/20 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Face Vector
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-650 hover:bg-slate-100 cursor-pointer"
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
                    {profile?.firstName || "N/A"}{" "}
                    {profile?.lastName || ""}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    Employee ID
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {profile?.employeeId || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    Email
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {profile?.email || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    Phone
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {profile?.workPhoneNumber ||
                      profile?.personalPhoneNumber ||
                      "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    Gender
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {profile?.gender || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    Date of Birth
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {profile?.dob
                      ? new Date(profile.dob).toLocaleDateString()
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
                  {profile?.presentAddress || "N/A"}
                </p>
                <p className="text-slate-500">
                  {profile?.permanentAddress || "N/A"}
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
                    {profile?.designation || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Status</span>
                  <span className="font-semibold text-slate-900">
                    {profile?.status || "Active"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Employee Type</span>
                  <span className="font-semibold text-slate-900">
                    {profile?.employeeType || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Joining Date</span>
                  <span className="font-semibold text-slate-900">
                    {profile?.dateOfJoining
                      ? new Date(profile.dateOfJoining).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Experience</span>
                  <span className="font-semibold text-slate-900">
                    {profile?.totalWorkExperience ?? "N/A"} yrs
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
                    {profile?.workPhoneNumber || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Personal Phone</span>
                  <span className="font-semibold text-slate-900">
                    {profile?.personalPhoneNumber || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Emergency Contact</span>
                  <span className="font-semibold text-slate-900">
                    {profile?.emergencyContact || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Emergency Number</span>
                  <span className="font-semibold text-slate-900">
                    {profile?.emergencyNumber || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Leave Balances Configuration Section */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-[#588b12]" />
            <h4 className="text-base font-extrabold text-slate-900 uppercase tracking-wider">
              Leave Balances Configuration
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {["Paid Annual Leave", "Sick Leave", "Casual Leave"].map((leaveType, idx) => {
              const prefix = leaveType.toLowerCase().split(" ")[0];
              const balance = (profile?.leaveBalances || []).find((b) =>
                b.leaveType?.toLowerCase().includes(prefix)
              );
              const allowed = Number(balance?.allowedDays) || 12;
              const taken = Number(balance?.takenLeaves) || 0;
              const remaining = Math.max(0, allowed - taken);
              const pctUsed = allowed > 0 ? Math.min(100, Math.round((taken / allowed) * 100)) : 0;

              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 shadow-sm flex flex-col justify-between gap-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {leaveType.includes("Casual") ? (
                        <Coffee className="w-4 h-4 text-emerald-600" />
                      ) : leaveType.includes("Sick") ? (
                        <HeartPulse className="w-4 h-4 text-rose-500" />
                      ) : (
                        <Calendar className="w-4 h-4 text-[#588b12]" />
                      )}
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        {leaveType}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        remaining > 0
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {remaining} Days Left
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Allowed Days
                      </p>
                      <p className="text-base font-black text-slate-800 mt-0.5">
                        {allowed}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Taken Leaves
                      </p>
                      <p className="text-base font-black text-rose-600 mt-0.5">
                        {taken}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold">Remaining Balance:</span>
                      <span className="font-black text-[#588b12] text-sm">
                        {remaining} <span className="text-xs text-slate-400 font-semibold">/ {allowed} Days</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#588b12] h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(0, 100 - pctUsed)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

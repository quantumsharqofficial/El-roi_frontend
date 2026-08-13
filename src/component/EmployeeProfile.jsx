import React from "react";
import { User, Briefcase, MapPin, Phone, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function EmployeeProfile({ employeeDetails, loadingProfile }) {
  const navigate = useNavigate();

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
                      ? new Date(employeeDetails.dob).toLocaleDateString()
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
                      ? new Date(employeeDetails.dateOfJoining).toLocaleDateString()
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
                  <span className="text-slate-500">Emergency Contact</span>
                  <span className="font-semibold text-slate-900">
                    {employeeDetails?.emergencyContact || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500">Emergency Number</span>
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
  );
}

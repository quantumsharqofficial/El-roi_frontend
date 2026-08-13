import React from "react";
import { X } from "lucide-react";

export default function PayslipModal({
  selectedPayslip,
  employeeDetails,
  onClose,
}) {
  if (!selectedPayslip) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header banner */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 flex items-center justify-between text-white">
          <div>
            <h3 className="font-black text-lg tracking-tight text-white">
              Salary Pay Slip
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Statement for the month of{" "}
              {new Date(selectedPayslip.month + "-02").toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8 space-y-6 overflow-y-auto max-h-[80vh]">
          {/* Company & Employee Details */}
          <div className="flex flex-col sm:flex-row justify-between gap-6 border-b border-slate-100 pb-5">
            <div>
              <h4 className="text-base font-extrabold text-[#588b12]">
                ELROI PHYSIO CARE
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-[250px] leading-relaxed">
                Premium Physiotherapy Clinic & Rehabilitation Center
              </p>
            </div>
            <div className="text-sm space-y-1">
              <p className="text-slate-800 font-bold">
                {selectedPayslip.employeeName}
              </p>
              <p className="text-xs text-slate-500">
                ID: {selectedPayslip.employeeEID}
              </p>
              <p className="text-xs text-slate-500">
                Designation: {employeeDetails?.designation || "Physiotherapist"}
              </p>
            </div>
          </div>

          {/* Working info stats cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                Working Days
              </span>
              <span className="text-base font-black text-slate-800 font-sans">
                {selectedPayslip.actualWorkingDays} / {selectedPayslip.totalWorkingDays}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                Hours Worked
              </span>
              <span className="text-base font-black text-slate-800 font-sans">
                {selectedPayslip.actualWorkingHours} hrs
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                Overtime
              </span>
              <span className="text-base font-black text-slate-800 font-sans">
                {selectedPayslip.overtimeHours} hrs
              </span>
            </div>
          </div>

          {/* Earnings & Deductions Breakdown Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Earnings Table */}
            <div className="space-y-3">
              <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                Earnings Breakdown
              </h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Basic Salary</span>
                  <span className="font-semibold text-slate-800">
                    ₹{selectedPayslip.basicSalary?.toLocaleString("en-IN")}
                  </span>
                </div>
                {selectedPayslip.overtimeHours > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Overtime Earnings</span>
                    <span className="font-semibold text-lime-700">
                      ₹{Math.round(selectedPayslip.overtimeHours * (selectedPayslip.basicSalary / (selectedPayslip.totalWorkingDays || 30) / 8 || 150))?.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                {selectedPayslip.incentives > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Incentives</span>
                    <span className="font-semibold text-lime-700">
                      +₹{selectedPayslip.incentives?.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                {selectedPayslip.performanceBonus > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Performance Bonus</span>
                    <span className="font-semibold text-lime-700">
                      +₹{selectedPayslip.performanceBonus?.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                {selectedPayslip.specialAllowances > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Special Allowance</span>
                    <span className="font-semibold text-lime-700">
                      +₹{selectedPayslip.specialAllowances?.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                {selectedPayslip.travelAllowance > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Travel Allowance</span>
                    <span className="font-semibold text-lime-700">
                      +₹{selectedPayslip.travelAllowance?.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                {selectedPayslip.otherAdditionalPayments > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Other Payments</span>
                    <span className="font-semibold text-lime-700">
                      +₹{selectedPayslip.otherAdditionalPayments?.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Deductions & Leaves Table */}
            <div className="space-y-3">
              <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                Deductions & Leaves
              </h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Paid Leaves</span>
                  <span className="font-semibold text-slate-800">
                    {selectedPayslip.paidLeavesCount} days
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Unpaid Leaves</span>
                  <span className="font-semibold text-slate-800">
                    {selectedPayslip.unpaidLeavesCount} days
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2 font-bold">
                  <span className="text-slate-700">Leave Deductions</span>
                  <span className="text-rose-600">
                    -₹{selectedPayslip.leaveDeductions?.toLocaleString("en-IN") || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Total Salary Box */}
          <div className="bg-[#f7fee7] border border-[#588b12]/20 p-5 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Net Take Home Salary
              </span>
              <span className="text-xs text-slate-400 mt-0.5 block">
                Transferred to registered bank account
              </span>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-[#588b12] block font-sans">
                ₹{selectedPayslip.payableSalary?.toLocaleString("en-IN")}
              </span>
              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#588b12]/10 text-[#588b12] mt-1 border border-[#588b12]/25">
                Paid
              </span>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="px-6 py-4.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-650 hover:bg-slate-100 text-sm font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            Print Slip
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

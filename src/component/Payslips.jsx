import React from "react";
import { FileText, Eye } from "lucide-react";

export default function Payslips({ payslips, onViewPayslipClick }) {
  return (
    <div className="space-y-6">
      {/* Header block */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          My Payslips
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          View and download your monthly generated and approved salary slips.
        </p>
      </div>

      {/* Payslips table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 text-base">
            Payment History
          </h3>
          <span className="text-xs font-bold bg-lime-50 text-[#588b12] border border-lime-200 px-3 py-1 rounded-full">
            {payslips.length} Payslip{payslips.length !== 1 ? 's' : ''} Paid
          </span>
        </div>

        {payslips.length === 0 ? (
          <div className="p-16 text-center text-slate-450 font-medium space-y-2">
            <FileText className="w-12 h-12 mx-auto text-slate-350 stroke-[1.5]" />
            <p className="text-slate-600 font-bold">No payslips found</p>
            <p className="text-xs text-slate-400">
              Your generated monthly payslips will appear here once approved and marked as Paid by HR.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Month</th>
                    <th className="px-6 py-4">Basic Salary</th>
                    <th className="px-6 py-4">Deductions</th>
                    <th className="px-6 py-4">Net Salary</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150/80 text-sm">
                  {payslips.map((p, i) => (
                    <tr
                      key={p._id || i}
                      className="hover:bg-slate-55/30 transition-colors"
                    >
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {new Date(p.month + "-02").toLocaleDateString("en-US", {
                          month: "long",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-700">
                        ₹{p.basicSalary?.toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4 text-rose-600 font-semibold">
                        -₹{p.leaveDeductions?.toLocaleString("en-IN") || 0}
                      </td>
                      <td className="px-6 py-4 font-bold text-[#588b12]">
                        ₹{p.payableSalary?.toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold border bg-lime-50 text-lime-700 border-lime-200">
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => onViewPayslipClick(p)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-650 rounded-xl cursor-pointer transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Payslip
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50/60 px-6 py-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing 1 to {payslips.length} of {payslips.length} entries
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

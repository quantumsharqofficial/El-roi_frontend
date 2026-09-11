import React, { useState } from "react";
import { FileText, Eye, Download } from "lucide-react";

export default function Payslips({ payslips, onViewPayslipClick }) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalEntries = payslips.length;
  const totalPages = Math.ceil(totalEntries / itemsPerPage) || 1;
  const activePage = Math.min(currentPage, totalPages);

  const indexOfLastItem = activePage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPayslips = payslips.slice(indexOfFirstItem, indexOfLastItem);

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
                  {currentPayslips.map((p, i) => (
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
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onViewPayslipClick(p)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#588b12] hover:bg-[#48730e] text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-sm"
                            title="View & Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                            PDF / View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50/60 px-6 py-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {totalEntries === 0 ? 0 : indexOfFirstItem + 1} to {Math.min(indexOfLastItem, totalEntries)} of {totalEntries} entries
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={activePage === 1}
                  className="px-2 py-1 rounded border border-slate-200/60 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white cursor-pointer"
                >
                  &lt;
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 rounded font-bold cursor-pointer transition-all ${
                      activePage === pageNum
                        ? 'bg-[#588b12] text-white'
                        : 'border border-slate-200/60 bg-white text-slate-650 hover:bg-slate-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={activePage === totalPages}
                  className="px-2 py-1 rounded border border-slate-200/60 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white cursor-pointer"
                >
                  &gt;
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

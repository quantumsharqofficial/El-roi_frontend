import React, { useState, useEffect } from 'react';
import { Search, Plus, CheckCircle2, Clock, AlertCircle, ScanFace, Eye, Edit, Trash2, Calendar, CalendarDays } from 'lucide-react';

const getWorkingDaysCount = (startDate, endDate) => {
  let count = 0;
  let cur = new Date(startDate);
  const end = new Date(endDate);

  const holidays = [
    "01-01", // New Year
    "01-26", // Republic Day
    "05-01", // May Day
    "08-15", // Independence Day
    "10-02", // Gandhi Jayanti
    "12-25", // Christmas
  ];

  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) {
      const monthStr = String(cur.getMonth() + 1).padStart(2, "0");
      const dateStr = String(cur.getDate()).padStart(2, "0");
      const mmdd = `${monthStr}-${dateStr}`;
      if (!holidays.includes(mmdd)) {
        count++;
      }
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

export default function EmployeeList({ employees, navigate, setDeleteModal }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.designation.toLowerCase().includes(searchTerm.toLowerCase());

    if (roleFilter === 'All') return matchesSearch;
    if (roleFilter === 'Physiotherapists') {
      return matchesSearch && emp.designation.toLowerCase().includes('physiotherapist');
    }
    if (roleFilter === 'Admin') {
      return matchesSearch && emp.department.toLowerCase() === 'admin';
    }
    if (roleFilter === 'New Joinees') {
      return matchesSearch && emp.dateOfJoining.includes('2024');
    }
    return matchesSearch;
  });

  // Reset to page 1 whenever filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter]);

  const totalEntries = filteredEmployees.length;
  const totalPages = Math.ceil(totalEntries / itemsPerPage) || 1;
  const activePage = Math.min(currentPage, totalPages);

  const indexOfLastItem = activePage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEmployees = filteredEmployees.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Employee Directory</h2>
          <p className="text-xs text-slate-500 mt-1">Manage physiotherapists, support staff and administrator accounts</p>
        </div>

        <button
          onClick={() => navigate('/add-employee')}
          className="bg-[#588b12] hover:bg-[#4a750f] text-white px-4.5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-lime-900/10 hover:shadow-lime-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add New Employee
        </button>
      </div>

      {/* Filtering & Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-3 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search employees by name, ID, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:border-[#588b12] focus:bg-white text-sm transition-all placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['All', 'Physiotherapists', 'Admin', 'New Joinees'].map((filter) => {
            const isActive = roleFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setRoleFilter(filter)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${isActive
                  ? 'bg-[#588b12] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-650 hover:bg-slate-200/60'
                  }`}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Employee ID</th>
                <th className="px-6 py-4">Profile</th>
                <th className="px-6 py-4">Full Name</th>
                <th className="px-6 py-4">Designation</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Date of Joining</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150/80 text-sm">
              {currentEmployees.length > 0 ? (
                currentEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/40 transition-colors group">
                    <td className="px-6 py-4 font-mono font-bold text-slate-500 group-hover:text-slate-900">
                      {emp.id}
                    </td>
                    <td className="px-6 py-4">
                      <img
                        src={emp.avatar}
                        alt={emp.name}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-inner"
                      />
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {emp.name}
                    </td>
                    <td className="px-6 py-4 text-slate-650 font-medium">
                      <div className="font-semibold text-slate-900">{emp.designation}</div>
                      {emp.employeeType === "Probation Period" ? (() => {
                        const start = emp.probationStartDate || emp.rawDateOfJoining || new Date();
                        const completed = getWorkingDaysCount(new Date(start), new Date());
                        const remaining = Math.max(0, 45 - completed);
                        return (
                          <span className="inline-block mt-1 text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            🟡 Probation – {completed} of 45 Days Completed ({remaining} Left)
                          </span>
                        );
                      })() : emp.employeeType === "Notice Period" ? (() => {
                        const start = emp.noticeStartDate || new Date();
                        const diffTime = Math.abs(new Date() - new Date(start));
                        const completed = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
                        const remaining = Math.max(0, 30 - completed);
                        return (
                          <span className="inline-block mt-1 text-[10px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            🔴 Notice Period Day {completed} / 30 ({remaining} Days Remaining)
                          </span>
                        );
                      })() : emp.employeeType && (
                        <span className="inline-block mt-1 text-[10px] font-extrabold text-[#588b12] bg-[#588b12]/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                          {emp.employeeType}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      {emp.department}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      {emp.dateOfJoining}
                    </td>
                    <td className="px-6 py-4">
                      {emp.status === 'Active' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold bg-lime-50 text-lime-700 border border-lime-200/60">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Active
                        </span>
                      )}
                      {emp.status === 'Onboarding' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                          <Clock className="w-3.5 h-3.5" />
                          Onboarding
                        </span>
                      )}
                      {emp.status === 'Deactivated' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/60">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Deactivated
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2.5">

                        {(!emp.faceVector || emp.faceVector.length === 0) && (
                          <button
                            title="Face Recognition"
                            onClick={() => navigate(`/face-capture/${emp._id}`)}
                            className="w-[34px] h-[34px] flex items-center justify-center rounded-[10px] border border-amber-300 text-amber-500 hover:bg-amber-50 transition-colors cursor-pointer"
                          >
                            <ScanFace className="w-[18px] h-[18px]" strokeWidth={2.5} />
                          </button>
                        )}
                        <button
                          title="Daily Tracking"
                          onClick={() => navigate(`/employee-tracking/${emp._id}/${emp.id}`)}
                          className="w-[34px] h-[34px] flex items-center justify-center rounded-[10px] border border-[#588b12]/40 text-[#588b12] hover:bg-[#588b12]/10 transition-colors cursor-pointer"
                        >
                          <Calendar className="w-[18px] h-[18px]" strokeWidth={2.5} />
                        </button>
                        <button
                          title="Employee Leave History"
                          onClick={() => navigate(`/employee-leaves/${emp._id}/${emp.id}`)}
                          className="w-[34px] h-[34px] flex items-center justify-center rounded-[10px] border border-purple-300 text-purple-600 hover:bg-purple-50 transition-colors cursor-pointer"
                        >
                          <CalendarDays className="w-[18px] h-[18px]" strokeWidth={2.5} />
                        </button>
                        <button
                          title="View"
                          onClick={() => navigate(`/view-employee/${emp._id}`)}
                          className="w-[34px] h-[34px] flex items-center justify-center rounded-[10px] border border-blue-300 text-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Eye className="w-[18px] h-[18px]" strokeWidth={2.5} />
                        </button>
                        <button
                          title="Edit"
                          onClick={() => navigate(`/edit-employee/${emp._id}`)}
                          className="w-[34px] h-[34px] flex items-center justify-center rounded-[10px] border border-slate-300 text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <Edit className="w-[18px] h-[18px]" strokeWidth={2.5} />
                        </button>
                        <button
                          title="Delete"
                          onClick={() => setDeleteModal({ isOpen: true, employee: emp, confirmId: '' })}
                          className="w-[34px] h-[34px] flex items-center justify-center rounded-[10px] border border-rose-300 text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-[18px] h-[18px]" strokeWidth={2.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-450 font-medium">
                    No employees found.
                  </td>
                </tr>
              )}
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
      </div>
    </>
  );
}

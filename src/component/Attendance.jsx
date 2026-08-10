import React, { useState, useEffect } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import AxiosInstance from '../utilities/AxiosInstance';

export default function Attendance({ employees }) {
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState('All');
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);

  const [attendanceFormData, setAttendanceFormData] = useState({
    employee_ID: '',
    date: new Date().toISOString().split('T')[0],
    checkInTime: '09:00',
    checkOutTime: '17:00',
    status: 'Present'
  });

  const calculateHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut || checkIn === 'N/A' || checkOut === 'N/A') return 'N/A';
    const parseTime = (timeStr) => {
      const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)?$/i);
      if (!match) {
        const parts = timeStr.split(':').map(Number);
        return parts[0] * 60 + (parts[1] || 0);
      }
      let [_, hrs, mins, meridiem] = match;
      hrs = Number(hrs);
      mins = Number(mins);
      if (meridiem) {
        if (meridiem.toUpperCase() === 'PM' && hrs !== 12) hrs += 12;
        if (meridiem.toUpperCase() === 'AM' && hrs === 12) hrs = 0;
      }
      return hrs * 60 + mins;
    };
    try {
      const startMins = parseTime(checkIn);
      const endMins = parseTime(checkOut);
      let diff = endMins - startMins;
      if (diff < 0) diff += 24 * 60;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      return `${h}h ${m}m`;
    } catch (e) {
      return 'N/A';
    }
  };

  const fetchLogs = () => {
    AxiosInstance.get(`/attendance/find-date/${attendanceDate}`)
      .then(res => {
        if (res.data) {
          const formatted = res.data.map(log => {
            const emp = employees.find(e => e.id === log.employee_ID || e._id === log.employee_ID);
            return {
              id: log.employee_ID,
              name: log.name || (emp ? emp.name : log.employee_ID),
              designation: emp ? emp.designation : 'Staff',
              date: log.date
                ? new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')
                : '',
              checkIn: log.checkInTime || 'N/A',
              checkOut: log.checkOutTime || 'N/A',
              hours: log.checkInTime && log.checkOutTime ? calculateHours(log.checkInTime, log.checkOutTime) : 'N/A',
              status: log.status || 'Present',
              avatar: emp ? emp.avatar : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
            };
          });
          setAttendanceLogs(formatted);
        }
      })
      .catch(err => {
        console.warn('Attendance logs not found or empty for this date:', err.message);
        setAttendanceLogs([]);
      });
  };

  useEffect(() => {
    fetchLogs();
  }, [attendanceDate, employees]);

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    if (!attendanceFormData.employee_ID) {
      toast.error('Please select an employee');
      return;
    }
    setIsSubmittingAttendance(true);
    try {
      const selectedEmp = employees.find(emp => emp.id === attendanceFormData.employee_ID || emp._id === attendanceFormData.employee_ID);
      const name = selectedEmp ? selectedEmp.name : 'Unknown';

      // 1. Mark Check-In / Create Attendance record
      await AxiosInstance.post('/multi-attendance/mark', {
        employee_ID: attendanceFormData.employee_ID,
        name: name,
        date: attendanceFormData.date,
        time: attendanceFormData.checkInTime,
        status: attendanceFormData.status
      });

      // 2. If status is Present/Late and checkOutTime is provided, record Check-Out
      if (
        (attendanceFormData.status === 'Present' || attendanceFormData.status === 'Late') &&
        attendanceFormData.checkOutTime
      ) {
        await AxiosInstance.patch('/attendance/check-out', {
          employee_ID: attendanceFormData.employee_ID,
          date: attendanceFormData.date,
          checkOutTime: attendanceFormData.checkOutTime
        });
      }

      toast.success('Attendance recorded successfully!');
      setIsMarkingAttendance(false);
      fetchLogs();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to record attendance');
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  const filteredLogs = attendanceLogs.filter(log => {
    const matchesSearch = log.name.toLowerCase().includes(attendanceSearch.toLowerCase()) || 
                          log.id.toLowerCase().includes(attendanceSearch.toLowerCase());
    const matchesStatus = attendanceStatusFilter === 'All' || 
                          log.status.toLowerCase() === attendanceStatusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  // Reset page if search, status, or date changes
  useEffect(() => {
    setCurrentPage(1);
  }, [attendanceSearch, attendanceStatusFilter, attendanceDate]);

  // Pagination calculations
  const totalEntries = filteredLogs.length;
  const totalPages = Math.ceil(totalEntries / entriesPerPage) || 1;
  const activePage = Math.min(currentPage, totalPages);
  
  const indexOfLastLog = activePage * entriesPerPage;
  const indexOfFirstLog = indexOfLastLog - entriesPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Daily Attendance Log</h2>
          <p className="text-xs text-slate-500 mt-1">Review check-in status, timestamps and diagnostic hours</p>
        </div>
        <button
          onClick={() => setIsMarkingAttendance(true)}
          className="bg-[#588b12] hover:bg-[#4a750f] text-white px-4.5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-lime-900/10 hover:shadow-lime-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Attendance
        </button>
      </div>

      {/* Filters grid */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Date</label>
          <input
            type="date"
            value={attendanceDate}
            onChange={(e) => setAttendanceDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none font-medium"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Status</label>
          <select
            value={attendanceStatusFilter}
            onChange={(e) => setAttendanceStatusFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none font-semibold"
          >
            <option value="All">All</option>
            <option value="Present">Present</option>
            <option value="Late">Late</option>
            <option value="Absent">Absent</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Search</label>
          <div className="relative">
            <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by employee name, ID..."
              value={attendanceSearch}
              onChange={(e) => setAttendanceSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none font-medium"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Employee ID</th>
                <th className="px-6 py-4">Full Name</th>
                <th className="px-6 py-4">Designation</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Check-In</th>
                <th className="px-6 py-4">Check-Out</th>
                {/* <th className="px-6 py-4">Total Hours</th> */}
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150/80 text-sm">
              {currentLogs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-slate-440 font-medium">
                    No attendance records found for this selection.
                  </td>
                </tr>
              ) : (
                currentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-500">{log.id}</td>
                    <td className="px-6 py-4 flex items-center gap-3">
                      <img src={log.avatar} alt={log.name} className="w-8 h-8 rounded-full object-cover border" />
                      <span className="font-semibold text-slate-900">{log.name}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-650 font-medium">{log.designation}</td>
                    <td className="px-6 py-4 text-slate-500 font-medium">{log.date}</td>
                    <td className="px-6 py-4 font-medium text-slate-700">
                      {log.checkIn}
                      {log.status === 'Late' && <span className="ml-1 text-[10px] text-amber-600 font-semibold bg-amber-50 px-1 py-0.5 rounded">● Late</span>}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-750">{log.checkOut}</td>
                    {/* <td className="px-6 py-4 font-semibold text-slate-800">{log.hours}</td> */}
                    <td className="px-6 py-4">
                      {log.status === 'Present' && (
                        <span className="px-2.5 py-1 rounded bg-lime-100 text-lime-800 text-xs font-bold uppercase">Present</span>
                      )}
                      {log.status === 'Checked In' && (
                        <span className="px-2.5 py-1 rounded bg-blue-100 text-blue-800 text-xs font-bold uppercase">Checked In</span>
                      )}
                      {log.status === 'Checked Out' && (
                        <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-800 text-xs font-bold uppercase">Checked Out</span>
                      )}
                      {log.status === 'Late' && (
                        <span className="px-2.5 py-1 rounded bg-amber-100 text-amber-800 text-xs font-bold uppercase">Late</span>
                      )}
                      {log.status === 'Absent' && (
                        <span className="px-2.5 py-1 rounded bg-rose-100 text-rose-800 text-xs font-bold uppercase">Absent ×</span>
                      )}
                      {log.status === 'On Leave' && (
                        <span className="px-2.5 py-1 rounded bg-purple-100 text-purple-800 text-xs font-bold uppercase">On Leave</span>
                      )}
                      {!['Present', 'Checked In', 'Checked Out', 'Late', 'Absent', 'On Leave'].includes(log.status) && (
                        <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-800 text-xs font-bold uppercase">{log.status}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-slate-50/60 px-6 py-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {totalEntries === 0 ? 0 : indexOfFirstLog + 1} to {Math.min(indexOfLastLog, totalEntries)} of {totalEntries} entries
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={activePage === totalPages}
              className="px-2 py-1 rounded border border-slate-200/60 bg-white hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white cursor-pointer"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Mark Attendance Modal */}
      {isMarkingAttendance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-base">Add Attendance Record</h3>
              <button
                onClick={() => setIsMarkingAttendance(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMarkAttendance} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Employee *
                </label>
                <select
                  required
                  value={attendanceFormData.employee_ID}
                  onChange={(e) => setAttendanceFormData(prev => ({ ...prev, employee_ID: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#588b12] focus:bg-white transition-all font-semibold text-slate-750"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={attendanceFormData.date}
                  onChange={(e) => setAttendanceFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#588b12] focus:bg-white transition-all font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Status *
                </label>
                <select
                  value={attendanceFormData.status}
                  onChange={(e) => setAttendanceFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#588b12] focus:bg-white transition-all font-semibold text-slate-750"
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </div>

              {(attendanceFormData.status === 'Present' || attendanceFormData.status === 'Late') && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Check-In Time
                    </label>
                    <input
                      type="text"
                      placeholder="09:00"
                      value={attendanceFormData.checkInTime}
                      onChange={(e) => setAttendanceFormData(prev => ({ ...prev, checkInTime: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#588b12] focus:bg-white transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Check-Out Time
                    </label>
                    <input
                      type="text"
                      placeholder="17:00"
                      value={attendanceFormData.checkOutTime}
                      onChange={(e) => setAttendanceFormData(prev => ({ ...prev, checkOutTime: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#588b12] focus:bg-white transition-all font-medium"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsMarkingAttendance(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-650 hover:bg-slate-100 text-sm font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAttendance}
                  className="px-5 py-2.5 bg-[#588b12] hover:bg-[#4a750f] text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingAttendance ? 'Saving...' : 'Save Attendance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

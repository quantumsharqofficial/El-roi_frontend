import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, Building2, Car, Home, ArrowLeft, User, Mail, Phone, Briefcase } from 'lucide-react';
import AxiosInstance from '../utilities/AxiosInstance';
import Sidebar from '../layouts/Sidebar';
import Navbar from '../layouts/Navbar';

const formatDuration = (minutes) => {
  if (!minutes || minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
};

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const getDayName = (date) => {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
};

const formatDate = (date) => {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function EmployeeTracking() {
  const { id, employeeId } = useParams();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [records, setRecords] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  const [employeeInfo, setEmployeeInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch employee info
  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const res = await AxiosInstance.get(`/employees/${id}`);
        setEmployeeInfo(res.data);
      } catch (err) {
        console.error('Error fetching employee:', err);
      }
    };
    if (id) fetchEmployee();
  }, [id]);

  // Fetch all attendance records for this employee
  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      try {
        const empId = employeeId || employeeInfo?.employeeId;
        if (!empId) return;
        const res = await AxiosInstance.get(`/attendance/${empId}`);
        const data = Array.isArray(res.data) ? res.data : [];
        setAllRecords(data);
      } catch (err) {
        console.error('Error fetching attendance:', err);
        setAllRecords([]);
      } finally {
        setLoading(false);
      }
    };
    if (employeeId || employeeInfo?.employeeId) fetchRecords();
  }, [employeeId, employeeInfo]);

  // Filter records for the selected date
  useEffect(() => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    const filtered = allRecords.filter(r => {
      if (!r.date) return false;
      const recDate = new Date(r.date).toISOString().split('T')[0];
      return recDate === dateStr;
    });
    filtered.sort((a, b) => {
      const aTime = parseTimeToMinutes(a.checkInTime) || 0;
      const bTime = parseTimeToMinutes(b.checkInTime) || 0;
      return aTime - bTime;
    });
    setRecords(filtered);
  }, [selectedDate, allRecords]);

  const goToPreviousDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const goToNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    if (next <= new Date()) {
      setSelectedDate(next);
    }
  };

  // Build timeline entries from records
  const buildTimeline = () => {
    if (records.length === 0) return [];
    const entries = [];
    records.forEach((record, idx) => {
      const checkIn = parseTimeToMinutes(record.checkInTime);
      const checkOut = parseTimeToMinutes(record.checkOutTime);
      const duration = (checkIn !== null && checkOut !== null) ? checkOut - checkIn : null;
      const place = record.place || 'EL ROI Physio Care Center';
      const address = record.address || 'EL ROI Physio Care Center, Anna Nagar, Chennai';

      let entryType = 'office';
      const placeLower = (place || '').toLowerCase();
      if (placeLower.includes('home visit') || placeLower.includes('home')) {
        entryType = 'home-visit';
      } else if (placeLower.includes('travel')) {
        entryType = 'travel';
      }

      entries.push({
        type: entryType,
        title: entryType === 'office' ? 'In-Office Hours' : entryType === 'home-visit' ? 'Home Visit' : 'Travel Time',
        subtitle: place,
        duration: duration !== null ? formatDuration(duration) : record.checkOutTime ? '' : 'In Progress...',
        location: address,
        timeRange: `${record.checkInTime || '--:--'} – ${record.checkOutTime || 'Present'}`,
        status: record.status,
      });

      if (idx < records.length - 1) {
        const nextRecord = records[idx + 1];
        const nextCheckIn = parseTimeToMinutes(nextRecord.checkInTime);
        if (checkOut !== null && nextCheckIn !== null && nextCheckIn > checkOut) {
          const travelDuration = nextCheckIn - checkOut;
          if (travelDuration > 0) {
            const fromPlace = place.split(',')[0] || place;
            const toPlace = (nextRecord.place || 'Office').split(',')[0] || nextRecord.place;
            entries.push({
              type: 'travel',
              title: 'Travel Time',
              subtitle: `${fromPlace} → ${toPlace}`,
              duration: formatDuration(travelDuration),
              location: toPlace,
              timeRange: `${record.checkOutTime} – ${nextRecord.checkInTime}`,
            });
          }
        }
      }
    });
    return entries;
  };

  const timeline = buildTimeline();

  const totalMinutes = records.reduce((sum, r) => {
    const checkIn = parseTimeToMinutes(r.checkInTime);
    const checkOut = parseTimeToMinutes(r.checkOutTime);
    if (checkIn !== null && checkOut !== null) return sum + (checkOut - checkIn);
    return sum;
  }, 0);

  const getEntryIcon = (type) => {
    switch (type) {
      case 'office':
        return <Building2 className="w-5 h-5 text-white" />;
      case 'home-visit':
        return <Home className="w-5 h-5 text-white" />;
      case 'travel':
        return <Car className="w-5 h-5 text-white" />;
      default:
        return <Clock className="w-5 h-5 text-white" />;
    }
  };

  const getEntryColor = (type) => {
    switch (type) {
      case 'office':
        return 'bg-[#588b12]';
      case 'home-visit':
        return 'bg-[#588b12]';
      case 'travel':
        return 'bg-slate-500';
      default:
        return 'bg-slate-400';
    }
  };

  const empName = employeeInfo
    ? [employeeInfo.firstName, employeeInfo.lastName].filter(Boolean).join(' ')
    : '';

  const profilePhotoUrl = employeeInfo?.profilePhoto
    ? (employeeInfo.profilePhoto.startsWith('http') ? employeeInfo.profilePhoto : `${AxiosInstance.defaults.baseURL?.replace('/api', '')}${employeeInfo.profilePhoto}`)
    : null;

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-800 lg:pl-56">

      {/* Shared Admin Sidebar */}
      <Sidebar
        variant="admin"
        activeTab="Employees"
        onTabChange={(tab) => {
          if (tab === 'Employees') navigate('/admin-dashboard');
          else navigate('/admin-dashboard');
        }}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Navbar */}
      <Navbar title="Employee Tracking" onMobileMenuOpen={() => setMobileMenuOpen(true)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pt-[60px]">
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">

          {/* Page Header */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4.5 h-4.5 text-slate-600" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Employee Daily Tracking</h2>
              {empName && (
                <p className="text-xs text-slate-500 font-medium mt-0.5">{empName} • {employeeInfo?.employeeId}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">

          {/* LEFT SIDEBAR — Employee Details */}
          <div className="lg:w-[320px] shrink-0 space-y-5">
            {/* Employee Profile Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              {/* Profile header with accent */}
              <div className="h-20 bg-gradient-to-r from-[#588b12] to-[#6fa520] relative">
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                  {profilePhotoUrl ? (
                    <img
                      src={profilePhotoUrl}
                      alt={empName}
                      className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-slate-200 border-4 border-white shadow-md flex items-center justify-center">
                      <User className="w-8 h-8 text-slate-400" />
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-12 pb-5 px-5 text-center">
                <h2 className="text-lg font-bold text-slate-900">{empName || '—'}</h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">{employeeInfo?.designation || '—'}</p>
                {employeeInfo?.status && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold mt-2 ${
                    employeeInfo.status === 'Active'
                      ? 'bg-lime-50 text-lime-700 border border-lime-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {employeeInfo.status}
                  </span>
                )}
              </div>
            </div>

            {/* Employee Info List */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Employee Details</h3>

              <div className="space-y-3.5">
                {/* Employee ID */}
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Briefcase className="w-4 h-4 text-slate-500" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Employee ID</p>
                    <p className="text-sm font-bold text-slate-800 truncate">{employeeInfo?.employeeId || '—'}</p>
                  </div>
                </div>

                {/* Full Name */}
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-slate-500" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</p>
                    <p className="text-sm font-bold text-slate-800 truncate">{empName || '—'}</p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-emerald-600" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone</p>
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {employeeInfo?.workPhoneNumber || employeeInfo?.personalPhoneNumber || '—'}
                    </p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-blue-600" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</p>
                    <p className="text-sm font-bold text-slate-800 truncate">{employeeInfo?.email || '—'}</p>
                  </div>
                </div>

                {/* Designation */}
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                    <Briefcase className="w-4 h-4 text-violet-600" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Designation</p>
                    <p className="text-sm font-bold text-slate-800 truncate">{employeeInfo?.designation || '—'}</p>
                  </div>
                </div>

                {/* Date of Joining */}
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-amber-600" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date of Joining</p>
                    <p className="text-sm font-bold text-slate-800 truncate">
                      {employeeInfo?.dateOfJoining
                        ? new Date(employeeInfo.dateOfJoining).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — Daily Log Timeline */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* Date Navigation */}
            <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200/80 shadow-sm px-5 py-4">
              <button
                onClick={goToPreviousDay}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4.5 h-4.5 text-slate-600" />
              </button>

              <div className="text-center">
                <div className="flex items-center gap-2 justify-center">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="font-bold text-slate-900 text-sm">
                    {formatDate(selectedDate)}, {getDayName(selectedDate)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-[#588b12]">
                  Total Duration: {formatDuration(totalMinutes)}
                </span>
                <button
                  onClick={goToNextDay}
                  disabled={selectedDate.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]}
                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4.5 h-4.5 text-slate-600" />
                </button>
              </div>
            </div>

            {/* Timeline */}
            {loading ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-12 text-center">
                <div className="w-8 h-8 border-3 border-slate-200 border-t-[#588b12] rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-500 font-medium">Loading attendance data...</p>
              </div>
            ) : timeline.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-12 text-center">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-base font-bold text-slate-500 mb-1">No records found</p>
                <p className="text-xs text-slate-400">No attendance data available for this date.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {timeline.map((entry, idx) => (
                    <div key={idx} className="flex gap-4 px-5 py-5 hover:bg-slate-50/40 transition-colors">
                      {/* Timeline line + icon */}
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full ${getEntryColor(entry.type)} flex items-center justify-center shrink-0 shadow-sm`}>
                          {getEntryIcon(entry.type)}
                        </div>
                        {idx < timeline.length - 1 && (
                          <div className="w-0.5 flex-1 bg-slate-200 mt-2 min-h-[24px]" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-1">
                        <h3 className="font-bold text-slate-900 text-[15px] leading-tight">{entry.title}</h3>
                        <p className="text-sm text-slate-600 font-medium mt-0.5">{entry.subtitle}</p>
                        <p className="text-base font-extrabold text-slate-900 mt-2">{entry.duration}</p>
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-[#588b12] shrink-0" />
                          <span className="truncate">{entry.location}</span>
                        </div>
                        {entry.timeRange && (
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400 font-medium">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>{entry.timeRange}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          </div>
        </main>
      </div>
    </div>
  );
}

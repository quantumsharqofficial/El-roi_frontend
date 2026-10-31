import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  Home,
  FileText,
  User,
  Activity,
  Filter,
  Trash2,
  X,
  CheckCircle2,
  Clock,
  Sparkles,
  HeartPulse,
  MapPin,
  Navigation,
  ExternalLink,
  Eye,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import AxiosInstance from '../utilities/AxiosInstance';

export default function ComprehensiveHomeVisitLogs({ employees = [] }) {
  // Navigation / View Modes: 'daily' | 'monthly'
  const [viewMode, setViewMode] = useState('daily');

  // Date State for Daily View
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Month State for Monthly View
  const [selectedMonthDate, setSelectedMonthDate] = useState(new Date());

  const [searchQuery, setSearchQuery] = useState('');
  const [visits, setVisits] = useState([]);
  const [monthlySummaryData, setMonthlySummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('');
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [selectedEmployeeModal, setSelectedEmployeeModal] = useState(null);

  // Form state for adding home visit
  const [formData, setFormData] = useState({
    employeeId: '',
    patientName: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00 AM',
    endTime: '11:00 AM',
    duration: '1h 00m',
    pain: 7,
    diagnosis: '',
    prescription: '',
    modalities: '',
    comments: '',
    place: '',
    address: '',
    latitude: null,
    longitude: null,
    gpsAccuracy: null,
  });

  // Calculate formatted month string (YYYY-MM)
  const summaryMonth = useMemo(() => {
    const y = selectedMonthDate.getFullYear();
    const m = String(selectedMonthDate.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, [selectedMonthDate]);

  const monthLabel = useMemo(() => {
    return selectedMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [selectedMonthDate]);

  const dailyLabel = useMemo(() => {
    if (!selectedDate) return '';
    const d = new Date(selectedDate);
    if (isNaN(d.getTime())) return selectedDate;
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  }, [selectedDate]);

  // Daily Date Navigation Handlers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  // Monthly Navigation Handlers
  const handlePrevMonth = () => {
    setSelectedMonthDate(new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonthDate(new Date(selectedMonthDate.getFullYear(), selectedMonthDate.getMonth() + 1, 1));
  };

  // Fetch Visits based on current viewMode
  const fetchVisits = () => {
    setLoading(true);
    if (viewMode === 'daily') {
      AxiosInstance.get(`/home-visits?date=${selectedDate}`)
        .then((res) => {
          if (res.data && res.data.success) {
            setVisits(res.data.data || []);
          } else {
            setVisits([]);
          }
        })
        .catch((err) => {
          console.error('Error fetching daily home visits:', err);
          setVisits([]);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // Monthly View: fetch both all month visits and aggregated summaries
      Promise.all([
        AxiosInstance.get(`/home-visits?month=${summaryMonth}`),
        AxiosInstance.get(`/home-visits/monthly-summary?month=${summaryMonth}`)
      ])
        .then(([monthVisitsRes, summaryRes]) => {
          if (monthVisitsRes.data?.success) {
            setVisits(monthVisitsRes.data.data || []);
          } else {
            setVisits([]);
          }

          if (summaryRes.data?.success) {
            setMonthlySummaryData(summaryRes.data);
          } else {
            setMonthlySummaryData(null);
          }
        })
        .catch((err) => {
          console.error('Error fetching monthly home visits:', err);
          setVisits([]);
          setMonthlySummaryData(null);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  useEffect(() => {
    fetchVisits();
  }, [viewMode, selectedDate, summaryMonth]);

  // Duration Helper
  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return '';
    try {
      const parseMins = (t) => {
        let clean = t.trim();
        let isPM = /pm/i.test(clean);
        let isAM = /am/i.test(clean);
        clean = clean.replace(/am|pm/gi, '').trim();
        let [h, m] = clean.split(':').map(Number);
        if (isNaN(h)) return 0;
        if (isPM && h < 12) h += 12;
        if (isAM && h === 12) h = 0;
        return h * 60 + (m || 0);
      };
      const s = parseMins(startTime);
      const e = parseMins(endTime);
      let diff = e - s;
      if (diff < 0) diff += 24 * 60;
      const hrs = Math.floor(diff / 60);
      const mins = diff % 60;
      if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
      if (hrs > 0) return `${hrs}h`;
      return `${mins}m`;
    } catch (err) {
      return '';
    }
  };

  const handleTimeChange = (type, val) => {
    setFormData((prev) => {
      const updated = { ...prev, [type]: val };
      const start = type === 'startTime' ? val : prev.startTime;
      const end = type === 'endTime' ? val : prev.endTime;
      const dur = calculateDuration(start, end);
      return { ...updated, duration: dur || prev.duration };
    });
  };

  // GPS Location Detection with OpenStreetMap Reverse Geocoding
  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      setGpsStatus('GPS not supported on this device');
      return;
    }

    setIsDetectingGps(true);
    setGpsStatus('Acquiring high-accuracy GPS coordinates...');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const roundedAcc = Math.round(accuracy);
        setGpsStatus(`GPS detected (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);

        setFormData((prev) => ({
          ...prev,
          latitude,
          longitude,
          gpsAccuracy: roundedAcc,
        }));

        // Reverse Geocoding
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          if (data && data.address) {
            const a = data.address;
            const locality =
              a.suburb ||
              a.neighbourhood ||
              a.road ||
              a.residential ||
              a.village ||
              a.town ||
              a.city ||
              'Patient Location';
            const city = a.city || a.state_district || '';
            const placeStr = locality && city ? `${locality}, ${city}` : locality;
            const fullAddress = data.display_name || `${placeStr}`;

            setFormData((prev) => ({
              ...prev,
              place: placeStr,
              address: fullAddress,
            }));
            setGpsStatus(`📍 GPS Location Acquired (±${roundedAcc}m)`);
            toast.success('Live GPS location & address captured!');
          } else {
            setFormData((prev) => ({
              ...prev,
              place: prev.place || `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
              address: prev.address || `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`,
            }));
            setGpsStatus(`📍 GPS Coordinates Saved (±${roundedAcc}m)`);
            toast.success('GPS coordinates saved!');
          }
        } catch (geoErr) {
          console.warn('Reverse geocode network error:', geoErr);
          setFormData((prev) => ({
            ...prev,
            place: prev.place || `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
            address: prev.address || `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`,
          }));
          setGpsStatus(`📍 GPS Coordinates Saved (±${roundedAcc}m)`);
          toast.success('GPS coordinates saved!');
        } finally {
          setIsDetectingGps(false);
        }
      },
      (err) => {
        console.error('GPS detection failed:', err);
        setIsDetectingGps(false);
        setGpsStatus(`GPS error: ${err.message}`);
        toast.error(`Unable to retrieve GPS: ${err.message}. Please verify permissions.`);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Filter Visits with Search Query
  const filteredVisits = useMemo(() => {
    if (!searchQuery.trim()) return visits;
    const q = searchQuery.toLowerCase().trim();
    return visits.filter(
      (v) =>
        (v.patientName && v.patientName.toLowerCase().includes(q)) ||
        (v.employeeName && v.employeeName.toLowerCase().includes(q)) ||
        (v.diagnosis && v.diagnosis.toLowerCase().includes(q)) ||
        (v.prescription && v.prescription.toLowerCase().includes(q)) ||
        (v.modalities && v.modalities.toLowerCase().includes(q)) ||
        (v.comments && v.comments.toLowerCase().includes(q)) ||
        (v.place && v.place.toLowerCase().includes(q)) ||
        (v.address && v.address.toLowerCase().includes(q))
    );
  }, [visits, searchQuery]);

  const handleCreateVisit = async (e) => {
    e.preventDefault();
    if (!formData.patientName.trim()) {
      toast.error('Please enter patient name');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedEmp = employees.find(
        (emp) =>
          emp.employeeId === formData.employeeId ||
          emp._id === formData.employeeId ||
          emp.id === formData.employeeId
      );
      const empName = selectedEmp
        ? [selectedEmp.firstName, selectedEmp.lastName].filter(Boolean).join(' ') || selectedEmp.name
        : formData.patientName;

      const d = new Date(formData.date);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Kolkata' });

      const res = await AxiosInstance.post('/home-visits', {
        ...formData,
        employeeName: empName,
        day: dayName,
      });

      if (res.data?.success) {
        toast.success('Home visit record created successfully');
        setShowAddModal(false);
        setFormData({
          employeeId: '',
          patientName: '',
          date: new Date().toISOString().split('T')[0],
          startTime: '10:00 AM',
          endTime: '11:00 AM',
          duration: '1h 00m',
          pain: 7,
          diagnosis: '',
          prescription: '',
          modalities: '',
          comments: '',
          place: '',
          address: '',
          latitude: null,
          longitude: null,
          gpsAccuracy: null,
        });
        setGpsStatus('');
        fetchVisits();
      }
    } catch (err) {
      console.error('Error creating home visit:', err);
      toast.error(err.response?.data?.message || 'Failed to create home visit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDisplayDate = (dStr) => {
    if (!dStr) return '';
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return dStr;
    const day = String(d.getDate()).padStart(2, '0');
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    const yr = d.getFullYear();
    return `${day}/${mon}/${yr}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-[#588b12]/10 text-[#588b12] rounded-xl">
              <Home className="w-5 h-5" />
            </span>
            Comprehensive Home Visit Logs
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {viewMode === 'daily'
              ? 'Daily live record of home visits, treatment plans, start/end times and patient GPS locations.'
              : 'Comprehensive month-wise record of home visits, therapist performance and treatment outcomes.'}
          </p>
        </div>

        {/* Action Controls & View Mode Toggle */}
        <div className="flex items-center gap-3">
          {/* Daily / Monthly Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === 'daily'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              Daily Log
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === 'monthly'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              Monthly Summary
            </button>
          </div>

          {/* <button
            onClick={() => {
              setShowAddModal(true);
              handleDetectGps(); // Auto-prompt GPS on open for seamless experience
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#588b12] hover:bg-[#48730e] text-white font-bold text-xs shadow-md shadow-[#588b12]/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Home Visit
          </button> */}
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Date / Month Selector depending on View Mode */}
        {viewMode === 'daily' ? (
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-xl self-start">
            <button
              onClick={handlePrevDay}
              className="p-1 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 px-2 font-bold text-slate-800 text-xs">
              <Calendar className="w-3.5 h-3.5 text-[#588b12]" />
              <span>{dailyLabel}</span>
            </div>
            <button
              onClick={handleNextDay}
              className="p-1 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="ml-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#588b12]/10 text-[#588b12] hover:bg-[#588b12]/20 transition-colors"
            >
              Today
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="ml-1 w-5 h-5 opacity-0 absolute cursor-pointer"
              title="Select specific date"
            />
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-xl self-start">
            <button
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 px-2 font-bold text-slate-800 text-xs">
              <Calendar className="w-3.5 h-3.5 text-[#588b12]" />
              <span>{monthLabel}</span>
            </div>
            <button
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter patient, diagnosis, address or therapist..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#588b12]/30 focus:border-[#588b12] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="text-xs text-slate-500 font-semibold self-center">
          {viewMode === 'daily' ? (
            <span>
              Visits on this date: <strong className="text-slate-800">{filteredVisits.length}</strong>
            </span>
          ) : (
            <span>
              Total Month Visits: <strong className="text-slate-800">{visits.length}</strong>
            </span>
          )}
        </div>
      </div>

      {/* ─────────────────── MONTHLY KPI SUMMARY CARDS (When in Monthly Mode) ─────────────────── */}
      {/* {viewMode === 'monthly' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Visits</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{visits.length}</p>
              <p className="text-[11px] text-[#588b12] font-semibold mt-0.5">{monthLabel}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-lime-50 text-[#588b12] flex items-center justify-center border border-lime-100">
              <Home className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Patients Treated</p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {new Set(visits.map((v) => v.patientName?.trim()).filter(Boolean)).size}
              </p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Unique Patients</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <User className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Pain Score</p>
              <p className="text-2xl font-black text-amber-600 mt-1">
                {visits.length > 0
                  ? (
                    visits.reduce((acc, curr) => acc + (Number(curr.pain) || 0), 0) /
                    visits.length
                  ).toFixed(1)
                  : '0'}
              </p>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Rating scale 1 - 10</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
              <HeartPulse className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">GPS Verified Visits</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {visits.filter((v) => v.latitude && v.longitude).length}
              </p>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Location Pinned</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <MapPin className="w-5 h-5" />
            </div>
          </div>
        </div>
      )} */}

      {/* ─────────────────── MONTHLY THERAPIST SUMMARY TABLE (When in Monthly Mode) ─────────────────── */}
      {viewMode === 'monthly' && monthlySummaryData?.summaries && (
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#588b12]" />
              Therapist Home Visit Monthly Summary ({monthLabel})
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Staff with Home Visits
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <th className="px-5 py-3.5">Therapist</th>
                  <th className="px-4 py-3.5">Designation</th>
                  <th className="px-4 py-3.5 text-center">Visits This Month</th>
                  {/* <th className="px-4 py-3.5 text-center">Unique Patients</th>
                  <th className="px-4 py-3.5 text-center">Avg Pain Score</th> */}
                  <th className="px-5 py-3.5">Latest Visit Date</th>
                  <th className="px-4 py-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-xs">
                {monthlySummaryData.summaries.map((emp) => (
                  <tr key={emp.employeeId || emp._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs overflow-hidden">
                          {emp.profilePhoto ? (
                            <img src={emp.profilePhoto} alt={emp.name} className="w-full h-full object-cover" />
                          ) : (
                            emp.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{emp.name}</p>
                          <p className="text-[10px] font-mono text-slate-400">{emp.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 font-medium">
                      {emp.designation}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-xs ${emp.totalVisits > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-slate-400'
                        }`}>
                        {emp.totalVisits}
                      </span>
                    </td>
                    {/* <td className="px-4 py-3.5 text-center font-bold text-slate-800">
                      {emp.uniquePatients}
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-amber-600">
                      {emp.avgPain > 0 ? emp.avgPain : '--'}
                    </td> */}
                    <td className="px-5 py-3.5 text-slate-600 font-medium">
                      {emp.lastVisitDate ? formatDisplayDate(emp.lastVisitDate) : '--'}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => setSelectedEmployeeModal(emp)}
                        title="View Therapist Visits"
                        className="p-1.5 rounded-lg border border-slate-200 hover:border-[#588b12] hover:bg-lime-50 text-slate-500 hover:text-[#588b12] transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────── VISITS TABLE (Daily Log OR Complete Month Log) ─────────────────── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#588b12]" />
            {viewMode === 'daily'
              ? `Daily Home Visit Log for ${dailyLabel}`
              : `All Home Visit Records for ${monthLabel}`}
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-800">{filteredVisits.length}</strong> records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="px-4 py-3.5">Date & Day</th>
                <th className="px-4 py-3.5">Start - End Time</th>
                <th className="px-4 py-3.5">Patient Name</th>
                <th className="px-4 py-3.5">Therapist</th>
                <th className="px-4 py-3.5">Place & Address (GPS)</th>
                <th className="px-3 py-3.5 text-center">Pain</th>
                <th className="px-4 py-3.5">Diagnosis</th>
                <th className="px-4 py-3.5">Prescription</th>
                <th className="px-4 py-3.5">Modalities</th>
                <th className="px-4 py-3.5">Comments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="10" className="px-6 py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#588b12] border-t-transparent rounded-full animate-spin" />
                      <span>Loading home visit logs...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredVisits.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-6 py-12 text-center text-slate-400">
                    <p className="font-semibold text-slate-600">No home visit logs found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {viewMode === 'daily'
                        ? `No visits recorded for ${dailyLabel}. Click "+ Add Home Visit" to record one.`
                        : `No visits recorded for ${monthLabel}.`}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredVisits.map((visit) => {
                  const painNum = Number(visit.pain) || 0;
                  const painBadgeColor =
                    painNum >= 8
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : painNum >= 5
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200';

                  const hasGps = visit.latitude && visit.longitude;
                  const googleMapsUrl = hasGps
                    ? `https://www.google.com/maps?q=${visit.latitude},${visit.longitude}`
                    : null;

                  return (
                    <tr
                      key={visit._id || `${visit.date}-${visit.patientName}`}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      {/* Date & Day */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <p className="font-mono font-bold text-slate-800">
                          {formatDisplayDate(visit.date)}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {visit.day ||
                            new Date(visit.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              timeZone: 'Asia/Kolkata',
                            })}
                        </p>
                      </td>

                      {/* Start - End Time */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <div>
                            <p className="font-semibold text-slate-800">
                              {visit.startTime || '10:00 AM'} - {visit.endTime || '11:00 AM'}
                            </p>
                            {visit.duration && (
                              <span className="inline-block text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                                {visit.duration}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Patient Name */}
                      <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                        {visit.patientName}
                      </td>

                      {/* Therapist */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <p className="font-semibold text-slate-800">{visit.employeeName || 'Staff'}</p>
                        {visit.employeeId && (
                          <p className="text-[10px] font-mono text-slate-400">{visit.employeeId}</p>
                        )}
                      </td>

                      {/* Place & Address with GPS Link */}
                      <td className="px-4 py-3.5 max-w-[240px]">
                        <div className="flex items-start gap-1.5">
                          <MapPin className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${hasGps ? 'text-emerald-600' : 'text-slate-400'}`} />
                          <div className="min-w-0">
                            {visit.place && (
                              <p className="font-bold text-slate-800 text-[11px] truncate">
                                {visit.place}
                              </p>
                            )}
                            <p className="text-[11px] text-slate-500 line-clamp-2 leading-tight">
                              {visit.address || 'Address not recorded'}
                            </p>
                            {hasGps && (
                              <a
                                href={googleMapsUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-[#588b12] hover:underline font-semibold mt-0.5"
                              >
                                View GPS Map <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Pain */}
                      <td className="px-3 py-3.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md font-bold text-xs ${painBadgeColor}`}
                        >
                          {visit.pain ?? 0}
                        </span>
                      </td>

                      {/* Diagnosis */}
                      <td className="px-4 py-3.5 font-medium text-slate-800 max-w-[180px]">
                        {visit.diagnosis || '--'}
                      </td>

                      {/* Prescription */}
                      <td className="px-4 py-3.5 text-slate-600 max-w-[200px]">
                        {visit.prescription || '--'}
                      </td>

                      {/* Modalities */}
                      <td className="px-4 py-3.5 text-slate-600 max-w-[200px]">
                        {visit.modalities || '--'}
                      </td>

                      {/* Comments */}
                      <td className="px-4 py-3.5 text-slate-500 max-w-[220px]">
                        {visit.comments || '--'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────── ADD HOME VISIT MODAL (WITH GPS & START/END TIME) ─────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-[#588b12]/10 text-[#588b12]">
                  <Home className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Add Home Visit</h3>
                  <p className="text-xs text-slate-500">Record therapist visit, start/end time, and GPS location</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleCreateVisit} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Employee / Therapist */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Therapist / Employee
                  </label>
                  <select
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#588b12]/30 focus:border-[#588b12]"
                  >
                    <option value="">Select Therapist</option>
                    {employees.map((emp) => (
                      <option key={emp.employeeId || emp._id} value={emp.employeeId || emp._id}>
                        {[emp.firstName, emp.lastName].filter(Boolean).join(' ') || emp.name || emp.employeeId}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Patient Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Patient Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.patientName}
                    onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                    placeholder="e.g. Abhijith Srinivas"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#588b12]/30 focus:border-[#588b12]"
                  />
                </div>

                {/* Visit Date */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Visit Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#588b12]/30 focus:border-[#588b12]"
                  />
                </div>

                {/* Pain Score */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center justify-between">
                    <span>Pain Rating (1-10)</span>
                    <span className="font-bold text-[#588b12] text-sm">{formData.pain}</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.pain}
                    onChange={(e) => setFormData({ ...formData, pain: Number(e.target.value) })}
                    className="w-full accent-[#588b12] cursor-pointer mt-1"
                  />
                </div>

                {/* Start Time */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Start Time
                  </label>
                  <input
                    type="text"
                    value={formData.startTime}
                    onChange={(e) => handleTimeChange('startTime', e.target.value)}
                    placeholder="e.g. 10:00 AM or 10:00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#588b12]/30 focus:border-[#588b12]"
                  />
                </div>

                {/* End Time */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center justify-between">
                    <span>End Time</span>
                    {formData.duration && (
                      <span className="text-[10px] text-[#588b12] font-semibold">
                        Duration: {formData.duration}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={formData.endTime}
                    onChange={(e) => handleTimeChange('endTime', e.target.value)}
                    placeholder="e.g. 11:00 AM or 11:00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#588b12]/30 focus:border-[#588b12]"
                  />
                </div>
              </div>

              {/* GPS Location & Address Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-[#588b12]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Live GPS & Place Detection
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDetectGps}
                    disabled={isDetectingGps}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-[#588b12] text-xs font-bold text-[#588b12] shadow-2xs hover:bg-lime-50 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isDetectingGps ? (
                      <div className="w-3.5 h-3.5 border-2 border-[#588b12] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <MapPin className="w-3.5 h-3.5" />
                    )}
                    {isDetectingGps ? 'Detecting GPS...' : '📍 Capture GPS Location'}
                  </button>
                </div>

                {/* GPS Status Badge */}
                {gpsStatus && (
                  <p className="text-[11px] font-medium text-slate-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {gpsStatus}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Place / Locality Name
                    </label>
                    <input
                      type="text"
                      value={formData.place}
                      onChange={(e) => setFormData({ ...formData, place: e.target.value })}
                      placeholder="e.g. Anna Nagar, Chennai"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#588b12]/30 focus:border-[#588b12]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Full Address (House / Street)
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="e.g. 12, 4th Cross St, Anna Nagar West"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#588b12]/30 focus:border-[#588b12]"
                    />
                  </div>
                </div>

                {formData.latitude && formData.longitude && (
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono px-1">
                    <span>Coordinates: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}</span>
                    <a
                      href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#588b12] hover:underline font-semibold flex items-center gap-1"
                    >
                      Test Map Pin <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                )}
              </div>

              {/* Diagnosis */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Diagnosis
                </label>
                <input
                  type="text"
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                  placeholder="e.g. L4-L5 disc protrusion / Frozen shoulder"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#588b12]/30 focus:border-[#588b12]"
                />
              </div>

              {/* Prescription */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Prescription
                </label>
                <input
                  type="text"
                  value={formData.prescription}
                  onChange={(e) => setFormData({ ...formData, prescription: e.target.value })}
                  placeholder="e.g. Ibuprofen 400mg, Paracetamol"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#588b12]/30 focus:border-[#588b12]"
                />
              </div>

              {/* Modalities */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Modalities
                </label>
                <input
                  type="text"
                  value={formData.modalities}
                  onChange={(e) => setFormData({ ...formData, modalities: e.target.value })}
                  placeholder="e.g. TENS, heat therapy, soft tissue mobilization"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#588b12]/30 focus:border-[#588b12]"
                />
              </div>

              {/* Comments */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Comments
                </label>
                <textarea
                  rows="2"
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  placeholder="e.g. Patient has limited mobility. Recheck in 3 days."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#588b12]/30 focus:border-[#588b12]"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#588b12] hover:bg-[#48730e] text-white shadow-md shadow-[#588b12]/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Visit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────── EMPLOYEE DETAIL BREAKDOWN MODAL ─────────────────── */}
      {selectedEmployeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="overflow-auto bg-white rounded-3xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-auto border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm overflow-auto">
                  {selectedEmployeeModal.profilePhoto ? (
                    <img src={selectedEmployeeModal.profilePhoto} alt={selectedEmployeeModal.name} className="w-full h-full object-cover" />
                  ) : (
                    selectedEmployeeModal.name.charAt(0)
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">{selectedEmployeeModal.name}</h3>
                  <p className="text-xs text-slate-500">
                    {selectedEmployeeModal.designation} • {selectedEmployeeModal.employeeId} • {monthLabel}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmployeeModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {/* <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Total Visits</p>
                  <p className="text-xl font-black text-slate-900 mt-0.5">{selectedEmployeeModal.totalVisits}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Unique Patients</p>
                  <p className="text-xl font-black text-slate-900 mt-0.5">{selectedEmployeeModal.uniquePatients}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Avg Pain Score</p>
                  <p className="text-xl font-black text-amber-600 mt-0.5">{selectedEmployeeModal.avgPain || '--'}</p>
                </div>
              </div> */}

              <div className="border border-slate-200 rounded-xl overflow-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2.5">Date</th>
                      <th className="px-3 py-2.5">Time</th>
                      <th className="px-3 py-2.5">Patient</th>
                      <th className="px-3 py-2.5">Pain</th>
                      <th className="px-3 py-2.5">Diagnosis</th>
                      <th className="px-3 py-2.5">modalities</th>
                      <th className="px-3 py-2.5">comments</th>
                      <th className="px-3 py-2.5">Place / Address</th>

                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {selectedEmployeeModal.visits?.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-slate-400">
                          No visits logged for this employee in {monthLabel}.
                        </td>
                      </tr>
                    ) : (
                      selectedEmployeeModal.visits?.map((v, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2.5 font-medium whitespace-nowrap">
                            {formatDisplayDate(v.date)}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">
                            {v.startTime || '10:00 AM'} - {v.endTime || '11:00 AM'}
                          </td>
                          <td className="px-3 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                            {v.patientName}
                          </td>
                          <td className="px-3 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                            {v.pain}
                          </td>
                          <td className="px-3 py-2.5 text-slate-700">
                            {v.diagnosis || '--'}
                          </td>
                          <td className="px-3 py-2.5 text-slate-700">
                            {v.modalities || '--'}
                          </td>
                          <td className="px-3 py-2.5 text-slate-500">
                            {v.comments || '--'}
                          </td>
                          <td className="px-3 py-2.5 text-slate-500">
                            {v.place || v.address || '--'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

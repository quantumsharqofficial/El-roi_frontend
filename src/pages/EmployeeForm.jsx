import React, { useState, useRef } from "react";
import {
  ChevronRight,
  User,
  Briefcase,
  Phone,
  MapPin,
  GraduationCap,
  Building2,
  CreditCard,
  Camera,
  Plus,
  Trash2,
  Upload,
  Save,
  RotateCcw,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  X,
  Calendar,
} from "lucide-react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { toast } from "sonner";
import Sidebar from "../layouts/Sidebar";
import Navbar from "../layouts/Navbar";
import AxiosInstance from "../utilities/AxiosInstance";

const calculateAge = (dobString) => {
  if (!dobString) return "";
  const dobDate = new Date(dobString);
  if (isNaN(dobDate.getTime())) return "";
  const diff = Date.now() - dobDate.getTime();
  const calculatedAge = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  return calculatedAge >= 0 ? `${calculatedAge} years` : "";
};

/* ─── Section Wrapper ────────────────────────────────────────────────────────── */
function Section({ icon: Icon, title, color = "#588b12", children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div
        className="px-6 py-4 border-b border-slate-100 flex items-center gap-3"
        style={{
          background: `linear-gradient(135deg, ${color}08, ${color}04)`,
        }}
      >
        <span
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${color}18`, color }}
        >
          <Icon className="w-4 h-4" />
        </span>
        <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
          {title}
        </h3>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

/* ─── Form Field ──────────────────────────────────────────────────────────────── */
function Field({ label, required, children, className = "" }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT =
  "w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#588b12] focus:bg-white focus:ring-2 focus:ring-[#588b12]/10 transition-all duration-200";
const SELECT =
  "w-full bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:border-[#588b12] focus:bg-white focus:ring-2 focus:ring-[#588b12]/10 transition-all duration-200 cursor-pointer";

/* ─── Main Component ─────────────────────────────────────────────────────────── */
export default function EmployeeForm({ mode = "add" }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Employees");
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(mode !== "add");
  const fileInputRef = useRef(null);

  /* ── Form State ── */
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    workPhoneNumber: "",
    personalPhoneNumber: "",
    dob: "",
    gender: "Male",
    maritalStatus: "",
    bloodGroup: "",
    employeeId: "",
    designation: "",
    sourceOfHire: "",
    dateOfJoining: "",
    totalWorkExperience: "",
    salary: "",
    employeeType: "Onboarding",
    probationEndDate: "",
    probationStartDate: "",
    noticePeriodEndDate: "",
    noticeStartDate: "",
    status: "Active",
    emergencyContact: "",
    emergencyNumber: "",
    checkInTime: "",
    checkOutTime: "",
    presentAddress: "",
    permanentAddress: "",
    city: "",
    state: "",
    zip: "",
    certifications: [{ name: "", fileName: "", fileContent: "" }],
    workExperience: [
      { companyName: "", jobTitle: "", fromDate: "", toDate: "" },
    ],
    education: [{ instituteName: "", degree: "", yearOfPassing: "" }],
    bankDetails: {
      accountHolderName: "",
      bankName: "",
      branchName: "",
      accountNumber: "",
      ifscCode: "",
      upiId: "",
    },
    leaveBalances: [
      { leaveType: "Paid Annual Leave", allowedDays: 0, takenLeaves: 0 },
      { leaveType: "Sick Leave", allowedDays: 0, takenLeaves: 0 },
      { leaveType: "Casual Leave", allowedDays: 0, takenLeaves: 0 }
    ],
  });

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const setBank = (key, val) =>
    setForm((f) => ({ ...f, bankDetails: { ...f.bankDetails, [key]: val } }));

  /* ── Work Experience handlers ── */
  const addExperience = () =>
    setForm((f) => ({
      ...f,
      workExperience: [
        ...f.workExperience,
        { companyName: "", jobTitle: "", fromDate: "", toDate: "" },
      ],
    }));
  const removeExperience = (i) =>
    setForm((f) => ({
      ...f,
      workExperience: f.workExperience.filter((_, idx) => idx !== i),
    }));
  const updateExperience = (i, key, val) =>
    setForm((f) => {
      const updated = [...f.workExperience];
      updated[i] = { ...updated[i], [key]: val };
      return { ...f, workExperience: updated };
    });

  /* ── Education handlers ── */
  const addEducation = () =>
    setForm((f) => ({
      ...f,
      education: [
        ...f.education,
        { instituteName: "", degree: "", yearOfPassing: "" },
      ],
    }));
  const removeEducation = (i) =>
    setForm((f) => ({
      ...f,
      education: f.education.filter((_, idx) => idx !== i),
    }));
  const updateEducation = (i, key, val) =>
    setForm((f) => {
      const updated = [...f.education];
      updated[i] = { ...updated[i], [key]: val };
      return { ...f, education: updated };
    });

  /* ── Certification handlers ── */
  const addCertification = () =>
    setForm((f) => ({
      ...f,
      certifications: [
        ...f.certifications,
        { name: "", fileName: "", fileContent: "" },
      ],
    }));
  const removeCertification = (i) =>
    setForm((f) => ({
      ...f,
      certifications: f.certifications.filter((_, idx) => idx !== i),
    }));
  const updateCertification = (i, val) =>
    setForm((f) => {
      const updated = [...f.certifications];
      updated[i] = val;
      return { ...f, certifications: updated };
    });

  const location = useLocation();

  /* ── Fetch Existing Employee for Edit/View ── */
  React.useEffect(() => {
    if (mode === "add") {
      if (location.state?.candidate) {
        const cand = location.state.candidate;
        setForm(f => ({
          ...f,
          firstName: cand.name.split(" ")[0] || "",
          lastName: cand.name.split(" ").slice(1).join(" ") || "",
          personalPhoneNumber: cand.mobileNumber || "",
          designation: cand.positionApplied || "",
          dateOfJoining: cand.proposedDateOfJoining ? cand.proposedDateOfJoining.split("T")[0] : "",
          sourceOfHire: "Shortlisted Candidate",
        }));
      }
      setIsLoading(false);
      return;
    }

    if (!id) return;

    AxiosInstance.get(`/employees/${id}`)
      .then((res) => {
        const data = res.data;
        if (data) {
          setForm({
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            email: data.email || "",
            workPhoneNumber: data.workPhoneNumber || "",
            personalPhoneNumber: data.personalPhoneNumber || "",
            dob: data.dob ? data.dob.split("T")[0] : "",
            gender: data.gender || "Male",
            maritalStatus: data.maritalStatus || "",
            bloodGroup: data.bloodGroup || "",
            employeeId: data.employeeId || "",
            designation: data.designation || "",
            sourceOfHire: data.sourceOfHire || "",
            dateOfJoining: data.dateOfJoining
              ? data.dateOfJoining.split("T")[0]
              : "",
            totalWorkExperience: data.totalWorkExperience || "",
            salary: data.salary || "",
            employeeType: data.employeeType || "Onboarding",
            probationEndDate: data.probationEndDate
              ? data.probationEndDate.split("T")[0]
              : "",
            probationStartDate: data.probationStartDate
              ? data.probationStartDate.split("T")[0]
              : "",
            noticePeriodEndDate: data.noticePeriodEndDate
              ? data.noticePeriodEndDate.split("T")[0]
              : "",
            noticeStartDate: data.noticeStartDate
              ? data.noticeStartDate.split("T")[0]
              : "",
            status: data.status || "Active",
            emergencyContact: data.emergencyContact || "",
            emergencyNumber: data.emergencyNumber || "",
            checkInTime: data.checkInTime || "09:00",
            checkOutTime: data.checkOutTime || "17:00",
            presentAddress: data.presentAddress || "",
            permanentAddress: data.permanentAddress || "",
            city: data.city || "",
            state: data.state || "",
            zip: data.zip || "",
            certifications: data.certifications?.length
              ? data.certifications
              : [{ name: "", fileName: "", fileContent: "" }],
            workExperience: data.workExperience?.length
              ? data.workExperience.map((exp) => ({
                ...exp,
                fromDate: exp.fromDate?.split("T")[0] || "",
                toDate: exp.toDate?.split("T")[0] || "",
              }))
              : [{ companyName: "", jobTitle: "", fromDate: "", toDate: "" }],
            education: data.education?.length
              ? data.education
              : [{ instituteName: "", degree: "", yearOfPassing: "" }],
            bankDetails: data.bankDetails || {
              accountHolderName: "",
              bankName: "",
              branchName: "",
              accountNumber: "",
              ifscCode: "",
              upiId: "",
            },
            leaveBalances: data.leaveBalances?.length ? data.leaveBalances : [
              { leaveType: "Paid Annual Leave", allowedDays: 12, takenLeaves: 0 },
              { leaveType: "Sick Leave", allowedDays: 10, takenLeaves: 0 },
              { leaveType: "Casual Leave", allowedDays: 8, takenLeaves: 0 }
            ],
          });
          if (data.profilePhoto) {
            setPhotoPreview(data.profilePhoto);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to fetch employee", err);
        toast.error("Failed to load employee data");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id, mode, location.state]);

  /* ── Photo upload ── */
  const handlePhotoFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target.result);
    reader.readAsDataURL(file);
    setPhotoFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    handlePhotoFile(e.dataTransfer.files[0]);
  };

  /* ── Reset ── */
  const handleReset = () => {
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      workPhoneNumber: "",
      personalPhoneNumber: "",
      dob: "",
      gender: "Male",
      maritalStatus: "",
      bloodGroup: "",
      employeeId: "",
      designation: "",
      sourceOfHire: "",
      dateOfJoining: "",
      totalWorkExperience: "",
      salary: "",
      employeeType: "Onboarding",
      probationEndDate: "",
      noticePeriodEndDate: "",
      status: "Active",
      emergencyContact: "",
      emergencyNumber: "",
      checkInTime: "09:00",
      checkOutTime: "17:00",
      presentAddress: "",
      permanentAddress: "",
      city: "",
      state: "",
      zip: "",
      certifications: [{ name: "", fileName: "", fileContent: "" }],
      workExperience: [
        { companyName: "", jobTitle: "", fromDate: "", toDate: "" },
      ],
      education: [{ instituteName: "", degree: "", yearOfPassing: "" }],
      bankDetails: {
        accountHolderName: "",
        bankName: "",
        branchName: "",
        accountNumber: "",
        ifscCode: "",
        upiId: "",
      },
      leaveBalances: [
        { leaveType: "Paid Annual Leave", allowedDays: 12, takenLeaves: 0 },
        { leaveType: "Sick Leave", allowedDays: 10, takenLeaves: 0 },
        { leaveType: "Casual Leave", allowedDays: 8, takenLeaves: 0 }
      ],
    });
    setPhotoPreview(null);
    setPhotoFile(null);
    toast.info("Form has been reset.");
  };

  /* ── Submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim()) {
      toast.error("First Name is required.");
      return;
    }
    if (!form.email.trim()) {
      toast.error("Email Address is required.");
      return;
    }
    if (!form.designation.trim()) {
      toast.error("Designation is required.");
      return;
    }
    if (!form.dateOfJoining) {
      toast.error("Date of Joining is required.");
      return;
    }

    const dateFormatted = form.dateOfJoining
      ? new Date(form.dateOfJoining)
        .toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
        .replace(/ /g, "-")
      : "";

    const localEmployees = JSON.parse(
      localStorage.getItem("employees") || "[]",
    );
    const nextNum = localEmployees.length + 1;
    const generatedId =
      form.employeeId.trim() || `EID-${String(nextNum).padStart(3, "0")}`;

    const dashboardRecord = {
      id: generatedId,
      name: `${form.firstName} ${form.lastName}`.trim(),
      designation: form.designation,
      department: "Clinical",
      dateOfJoining: dateFormatted,
      status: form.status === "Active" ? "Active" : "Deactivated",
      avatar:
        photoPreview ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      email: form.email,
      phone: form.personalPhoneNumber || form.workPhoneNumber || "",
      employeeType: form.employeeType || "Onboarding",
    };

    const employeeData = {
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      workPhoneNumber: form.workPhoneNumber,
      personalPhoneNumber: form.personalPhoneNumber,
      dob: form.dob,
      gender: form.gender,
      maritalStatus: form.maritalStatus,
      bloodGroup: form.bloodGroup,
      employeeId: generatedId,
      designation: form.designation,
      sourceOfHire: form.sourceOfHire,
      dateOfJoining: form.dateOfJoining,
      totalWorkExperience: parseFloat(form.totalWorkExperience) || 0,
      salary: parseFloat(form.salary) || 0,
      employeeType: form.employeeType || "Onboarding",
      probationEndDate: form.probationEndDate,
      probationStartDate: form.probationStartDate || form.dateOfJoining,
      noticePeriodEndDate: form.noticePeriodEndDate,
      noticeStartDate: form.noticeStartDate,
      status: form.status,
      emergencyContact: form.emergencyContact,
      emergencyNumber: form.emergencyNumber,
      checkInTime: form.checkInTime,
      checkOutTime: form.checkOutTime,
      presentAddress: form.presentAddress,
      permanentAddress: form.permanentAddress,
      certifications: form.certifications,
      workExperience: form.workExperience,
      education: form.education,
      bankDetails: form.bankDetails,
      leaveBalances: form.leaveBalances,
      profilePhoto: photoPreview,
    };

    try {
      if (photoFile) {
        const fd = new FormData();
        fd.append("profilePhoto", photoFile);
        // Append scalar fields
        Object.entries(employeeData).forEach(([k, v]) => {
          if (k === "profilePhoto") return; // Skip profilePhoto since photoFile is already appended
          if (v === undefined || v === null) return;
          if (typeof v === "object") {
            fd.append(k, JSON.stringify(v));
          } else {
            fd.append(k, v);
          }
        });

        if (mode === "edit") {
          await AxiosInstance.put(`/employees/${id}`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          toast.success(
            `Employee profile for ${form.firstName} ${form.lastName} updated successfully!`,
          );
        } else {
          await AxiosInstance.post("/employees", fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          localStorage.setItem(
            "employees",
            JSON.stringify([...localEmployees, dashboardRecord]),
          );
          toast.success(
            `Employee profile for ${form.firstName} ${form.lastName} saved successfully!`,
          );
        }
      } else {
        if (mode === "edit") {
          await AxiosInstance.put(`/employees/${id}`, employeeData);
          toast.success(
            `Employee profile for ${form.firstName} ${form.lastName} updated successfully!`,
          );
        } else {
          await AxiosInstance.post("/employees", employeeData);
          localStorage.setItem(
            "employees",
            JSON.stringify([...localEmployees, dashboardRecord]),
          );
          toast.success(
            `Employee profile for ${form.firstName} ${form.lastName} saved successfully!`,
          );
        }
      }
      if (mode !== "edit" && location.state?.candidate) {
        try {
          const cand = location.state.candidate;
          await AxiosInstance.put(`/shortlisted/${cand._id}`, { status: "Converted" });
        } catch (candErr) {
          console.error("Failed to update candidate status:", candErr);
        }
      }
      setTimeout(() => navigate("/admin-dashboard"), 1200);
    } catch (err) {
      console.error("Backend save failed:", err);
      toast.error(
        err.response?.data?.error ||
        "Failed to save employee profile. Please try again.",
      );
    }
  };

  const getPageTitle = () => {
    if (mode === "view") return "View Employee Profile";
    if (mode === "edit") return "Edit Employee Profile";
    return "New Employee Profile";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  const storedUser = sessionStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const isEmployee = user?.role === "employee";

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans text-slate-800 lg:pl-56">
      {/* Sidebar */}
      <Sidebar
        variant={isEmployee ? "employee" : "admin"}
        activeTab={isEmployee ? "Profile" : activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (isEmployee) {
            navigate("/employee-dashboard");
          } else {
            navigate("/admin-dashboard");
          }
        }}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Navbar */}
      <Navbar
        title={getPageTitle()}
        onMobileMenuOpen={() => setMobileMenuOpen(true)}
      />

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 pt-[60px]">
        <main className="flex-1 p-6 md:p-8 space-y-6">
          {/* ── Breadcrumb & Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                {isEmployee ? (
                  <span className="text-slate-400">Profile</span>
                ) : (
                  <button
                    onClick={() => navigate("/admin-dashboard")}
                    className="hover:text-[#588b12] transition-colors cursor-pointer"
                  >
                    Employees
                  </button>
                )}
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-slate-700">{getPageTitle()}</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                {getPageTitle()}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {mode === "view"
                  ? "Viewing staff record details"
                  : "Fill in the details below to manage staff record"}
              </p>
            </div>
            <button
              onClick={() => navigate(isEmployee ? "/employee-dashboard" : "/admin-dashboard")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 text-sm font-bold transition-all shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              {isEmployee ? "Back to Dashboard" : "Back to Directory"}
            </button>
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <fieldset disabled={mode === "view"} className="space-y-6">
              {/* 1 — Personal Information */}
              <Section icon={User} title="Personal Information">
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Field label="First Name" required>
                      <input
                        type="text"
                        required
                        value={form.firstName}
                        onChange={(e) => set("firstName", e.target.value)}
                        className={INPUT}
                        placeholder="e.g. Sarah"
                      />
                    </Field>
                    <Field label="Last Name">
                      <input
                        type="text"
                        value={form.lastName}
                        onChange={(e) => set("lastName", e.target.value)}
                        className={INPUT}
                        placeholder="e.g. Jenkins"
                      />
                    </Field>
                    <Field label="Email Address" required>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        className={INPUT}
                        placeholder="email@elroi.com"
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                    <Field label="Date of Birth">
                      <input
                        type="date"
                        value={form.dob}
                        onChange={(e) => set("dob", e.target.value)}
                        className={INPUT}
                      />
                    </Field>
                    <Field label="Age">
                      <input
                        type="text"
                        disabled
                        value={calculateAge(form.dob)}
                        className={`${INPUT} bg-slate-100/80 cursor-not-allowed`}
                        placeholder="Age"
                      />
                    </Field>
                    <Field label="Gender">
                      <select
                        value={form.gender}
                        onChange={(e) => set("gender", e.target.value)}
                        className={SELECT}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </Field>
                    <Field label="Marital Status">
                      <select
                        value={form.maritalStatus}
                        onChange={(e) => set("maritalStatus", e.target.value)}
                        className={SELECT}
                      >
                        <option value="">— Select —</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Widowed">Widowed</option>
                      </select>
                    </Field>
                    <Field label="Blood Group">
                      <select
                        value={form.bloodGroup}
                        onChange={(e) => set("bloodGroup", e.target.value)}
                        className={SELECT}
                      >
                        <option value="">— Select —</option>
                        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                          (bg) => (
                            <option key={bg} value={bg}>
                              {bg}
                            </option>
                          ),
                        )}
                      </select>
                    </Field>
                  </div>
                </div>
              </Section>

              {/* 2 — Work Information */}
              <Section icon={Briefcase} title="Work Information">
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                    <Field label="Employee ID">
                      <input
                        type="text"
                        value={form.employeeId}
                        onChange={(e) => set("employeeId", e.target.value)}
                        className={`${INPUT} font-mono`}
                        placeholder="EID-AUTO"
                      />
                    </Field>
                    <Field label="Designation" required>
                      <input
                        type="text"
                        required
                        value={form.designation}
                        onChange={(e) => set("designation", e.target.value)}
                        className={INPUT}
                        placeholder="e.g. Physiotherapist"
                      />
                    </Field>
                    <Field label="Source of Hire">
                      <select
                        value={form.sourceOfHire}
                        onChange={(e) => set("sourceOfHire", e.target.value)}
                        className={SELECT}
                      >
                        <option value="">— Select —</option>
                        <option value="Direct">Direct</option>
                        <option value="Referral">Referral</option>
                        <option value="Job Portal">Job Portal</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="Agency">Agency</option>
                        <option value="Walk-in">Walk-in</option>
                      </select>
                    </Field>
                    <Field label="Date of Joining" required>
                      <input
                        type="date"
                        required
                        value={form.dateOfJoining}
                        onChange={(e) => set("dateOfJoining", e.target.value)}
                        className={INPUT}
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-end">
                    <Field label="Total Work Experience (years)">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={form.totalWorkExperience}
                        onChange={(e) =>
                          set("totalWorkExperience", e.target.value)
                        }
                        className={INPUT}
                        placeholder="0"
                      />
                    </Field>
                    <Field label="Salary (&#8377;)">
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm pointer-events-none">
                          &#8377;
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={form.salary}
                          onChange={(e) => set("salary", e.target.value)}
                          className={`${INPUT} pl-8`}
                          placeholder="0"
                        />
                      </div>
                    </Field>
                    <Field label="Employee Type" required>
                      <select
                        value={form.employeeType}
                        onChange={(e) => set("employeeType", e.target.value)}
                        className={SELECT}
                      >
                        <option value="Onboarding">Onboarding</option>
                        <option value="Offboarding">Offboarding</option>
                        <option value="Probation Period">
                          Probation Period
                        </option>
                        <option value="Notice Period">Notice Period</option>
                        <option value="Permanent">Permanent</option>
                      </select>
                    </Field>
                    <Field label="Employee Status">
                      <div className="flex items-center gap-3 h-[42px]">
                        <span
                          className={`text-sm font-bold transition-colors ${form.status === "Active" ? "text-[#588b12]" : "text-slate-400"}`}
                        >
                          Active
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            set(
                              "status",
                              form.status === "Active" ? "Inactive" : "Active",
                            )
                          }
                          className={`relative w-12 h-6 rounded-full transition-all duration-300 cursor-pointer flex-shrink-0 ${form.status === "Active" ? "bg-[#588b12]" : "bg-slate-300"}`}
                        >
                          <span
                            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${form.status === "Active" ? "left-6" : "left-0.5"}`}
                          />
                        </button>
                        <span
                          className={`text-sm font-bold transition-colors ${form.status === "Inactive" ? "text-rose-500" : "text-slate-400"}`}
                        >
                          Inactive
                        </span>
                      </div>
                    </Field>
                  </div>

                   {form.employeeType === "Probation Period" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Field label="Probation Start Date" required>
                        <input
                          type="date"
                          required
                          value={form.probationStartDate || form.dateOfJoining}
                          onChange={(e) =>
                            set("probationStartDate", e.target.value)
                          }
                          disabled={mode === "view"}
                          className={INPUT}
                        />
                      </Field>
                      <Field label="Probation End Date">
                        <input
                          type="date"
                          value={form.probationEndDate}
                          onChange={(e) =>
                            set("probationEndDate", e.target.value)
                          }
                          disabled={mode === "view"}
                          className={INPUT}
                        />
                      </Field>
                    </div>
                  )}
                  {form.employeeType === "Notice Period" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <Field label="Notice Start Date" required>
                        <input
                          type="date"
                          required
                          value={form.noticeStartDate}
                          onChange={(e) => {
                            const val = e.target.value;
                            set("noticeStartDate", val);
                            if (val) {
                              const d = new Date(val);
                              d.setDate(d.getDate() + 30);
                              set("noticePeriodEndDate", d.toISOString().split("T")[0]);
                            }
                          }}
                          disabled={mode === "view"}
                          className={INPUT}
                        />
                      </Field>
                      <Field label="Notice Period End Date (Auto-calculated 30 Days)">
                        <input
                          type="date"
                          readOnly
                          value={form.noticePeriodEndDate}
                          disabled={true}
                          className={`${INPUT} bg-slate-100 cursor-not-allowed`}
                        />
                      </Field>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                    <Field label="Daily Check-In Time" required>
                      <input
                        type="time"
                        required
                        value={form.checkInTime}
                        onChange={(e) => set("checkInTime", e.target.value)}
                        className={INPUT}
                      />
                    </Field>
                    <Field label="Daily Check-Out Time" required>
                      <input
                        type="time"
                        required
                        value={form.checkOutTime}
                        onChange={(e) => set("checkOutTime", e.target.value)}
                        className={INPUT}
                      />
                    </Field>
                  </div>
                </div>
              </Section>

              {/* 3 — Contact Details */}
              <Section icon={Phone} title="Contact Details">
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Field label="Work Phone">
                      <input
                        type="tel"
                        value={form.workPhoneNumber}
                        onChange={(e) => set("workPhoneNumber", e.target.value)}
                        className={INPUT}
                        placeholder="+91 98765 43210"
                      />
                    </Field>
                    <Field label="Personal Phone">
                      <input
                        type="tel"
                        value={form.personalPhoneNumber}
                        onChange={(e) =>
                          set("personalPhoneNumber", e.target.value)
                        }
                        className={INPUT}
                        placeholder="+91 98765 43210"
                      />
                    </Field>
                    <Field label="Emergency Contact Name">
                      <input
                        type="text"
                        value={form.emergencyContact}
                        onChange={(e) =>
                          set("emergencyContact", e.target.value)
                        }
                        className={INPUT}
                        placeholder="Contact Person"
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Field label="Emergency Contact Number">
                      <input
                        type="tel"
                        value={form.emergencyNumber}
                        onChange={(e) => set("emergencyNumber", e.target.value)}
                        className={INPUT}
                        placeholder="+91 98765 43210"
                      />
                    </Field>
                  </div>
                </div>
              </Section>

              {/* 4 — Address */}
              <Section icon={MapPin} title="Address Details">
                <div className="space-y-5">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <span className="w-4 h-px bg-slate-200 inline-block" />
                      Present Address
                      <span className="flex-1 h-px bg-slate-100 inline-block" />
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                      <Field label="Street Address" className="md:col-span-2">
                        <input
                          type="text"
                          value={form.presentAddress}
                          onChange={(e) =>
                            set("presentAddress", e.target.value)
                          }
                          className={INPUT}
                          placeholder="Street, Area"
                        />
                      </Field>
                      <Field label="City">
                        <input
                          type="text"
                          value={form.city}
                          onChange={(e) => set("city", e.target.value)}
                          className={INPUT}
                          placeholder="City"
                        />
                      </Field>
                      <Field label="State">
                        <input
                          type="text"
                          value={form.state}
                          onChange={(e) => set("state", e.target.value)}
                          className={INPUT}
                          placeholder="State"
                        />
                      </Field>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <span className="w-4 h-px bg-slate-200 inline-block" />
                      Permanent Address
                      <span className="flex-1 h-px bg-slate-100 inline-block" />
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                      <Field label="Street Address" className="md:col-span-2">
                        <textarea
                          rows={2}
                          value={form.permanentAddress}
                          onChange={(e) =>
                            set("permanentAddress", e.target.value)
                          }
                          className={`${INPUT} resize-none`}
                          placeholder="Street, Area"
                        />
                      </Field>
                      <Field label="ZIP / PIN Code">
                        <input
                          type="text"
                          value={form.zip}
                          onChange={(e) => set("zip", e.target.value)}
                          className={INPUT}
                          placeholder="600001"
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              </Section>

              {/* 5 — Work Experience */}
              <Section icon={Building2} title="Work Experience">
                <div className="space-y-4">
                  {form.workExperience.map((exp, i) => (
                    <div
                      key={i}
                      className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Experience #{i + 1}
                        </span>
                        {form.workExperience.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeExperience(i)}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                        <Field label="Company Name" className="md:col-span-2">
                          <input
                            type="text"
                            value={exp.companyName}
                            onChange={(e) =>
                              updateExperience(i, "companyName", e.target.value)
                            }
                            className={INPUT}
                            placeholder="Company Name"
                          />
                        </Field>
                        <Field label="Job Title">
                          <input
                            type="text"
                            value={exp.jobTitle}
                            onChange={(e) =>
                              updateExperience(i, "jobTitle", e.target.value)
                            }
                            className={INPUT}
                            placeholder="Job Title"
                          />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="From">
                            <input
                              type="date"
                              value={exp.fromDate}
                              onChange={(e) =>
                                updateExperience(i, "fromDate", e.target.value)
                              }
                              className={INPUT}
                            />
                          </Field>
                          <Field label="To">
                            <input
                              type="date"
                              value={exp.toDate}
                              onChange={(e) =>
                                updateExperience(i, "toDate", e.target.value)
                              }
                              className={INPUT}
                            />
                          </Field>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addExperience}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-[#588b12]/50 text-[#588b12] bg-[#588b12]/5 hover:bg-[#588b12]/10 text-xs font-bold uppercase tracking-wide transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Add Experience
                  </button>
                </div>
              </Section>

              {/* 6 — Education */}
              <Section icon={GraduationCap} title="Education">
                <div className="space-y-4">
                  {form.education.map((edu, i) => (
                    <div
                      key={i}
                      className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Education #{i + 1}
                        </span>
                        {form.education.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEducation(i)}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <Field label="Institute Name" className="md:col-span-2">
                          <input
                            type="text"
                            value={edu.instituteName}
                            onChange={(e) =>
                              updateEducation(
                                i,
                                "instituteName",
                                e.target.value,
                              )
                            }
                            className={INPUT}
                            placeholder="University / College Name"
                          />
                        </Field>
                        <Field label="Degree / Course">
                          <input
                            type="text"
                            value={edu.degree}
                            onChange={(e) =>
                              updateEducation(i, "degree", e.target.value)
                            }
                            className={INPUT}
                            placeholder="e.g. BPT, MPT"
                          />
                        </Field>
                        <Field label="Year of Passing">
                          <input
                            type="number"
                            min="1980"
                            max={new Date().getFullYear()}
                            value={edu.yearOfPassing}
                            onChange={(e) =>
                              updateEducation(
                                i,
                                "yearOfPassing",
                                e.target.value,
                              )
                            }
                            className={INPUT}
                            placeholder="2020"
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addEducation}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-violet-400/50 text-violet-600 bg-violet-50/50 hover:bg-violet-100/50 text-xs font-bold uppercase tracking-wide transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Add Education
                  </button>
                </div>
              </Section>

              {/* 7 — Certifications */}
              <Section
                icon={CheckCircle2}
                title="Certifications"
                color="#7c3aed"
              >
                <div className="space-y-4">
                  {form.certifications.map((cert, i) => (
                    <div
                      key={i}
                      className="p-4 bg-slate-50/50 rounded-2xl border border-slate-200/80 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Certification #{i + 1}
                        </span>
                        {form.certifications.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCertification(i)}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Certification Name
                          </label>
                          <input
                            type="text"
                            value={cert.name || ""}
                            onChange={(e) =>
                              updateCertification(i, {
                                ...cert,
                                name: e.target.value,
                              })
                            }
                            className={INPUT}
                            placeholder="e.g. Certified Manual Therapist"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Certificate File
                          </label>
                          {cert.fileName ? (
                            <div className="flex items-center justify-between bg-violet-50/50 border border-violet-100 rounded-xl px-4 py-2">
                              <div className="flex items-center gap-2 text-sm font-semibold text-violet-750 truncate">
                                <Upload className="w-4 h-4 text-violet-500 shrink-0" />
                                <span className="truncate">
                                  {cert.fileName}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  updateCertification(i, {
                                    ...cert,
                                    fileName: "",
                                    fileContent: "",
                                  })
                                }
                                className="text-rose-500 hover:text-rose-700 p-1 shrink-0 cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="relative">
                              <input
                                type="file"
                                accept=".pdf,image/*,.doc,.docx"
                                id={`cert-file-${i}`}
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  if (file.size > 10 * 1024 * 1024) {
                                    toast.error(
                                      "File size must be under 10MB.",
                                    );
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onload = (evt) => {
                                    updateCertification(i, {
                                      ...cert,
                                      fileName: file.name,
                                      fileContent: evt.target.result,
                                    });
                                  };
                                  reader.readAsDataURL(file);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  document
                                    .getElementById(`cert-file-${i}`)
                                    .click()
                                }
                                className="w-full bg-white border border-slate-200 hover:border-violet-400 hover:bg-violet-50/10 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-650 flex items-center justify-center gap-2 transition-all cursor-pointer"
                              >
                                <Upload className="w-4 h-4 text-slate-400" />
                                Choose File (PDF, Image)
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addCertification}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-violet-400/50 text-violet-600 bg-violet-50/50 hover:bg-violet-100/50 text-xs font-bold uppercase tracking-wide transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Add Certification
                  </button>
                </div>
              </Section>

              {/* 8 — Bank Details */}
              <Section icon={CreditCard} title="Bank Details" color="#0ea5e9">
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <Field
                      label="Account Holder Name"
                      className="md:col-span-2"
                    >
                      <input
                        type="text"
                        value={form.bankDetails.accountHolderName}
                        onChange={(e) =>
                          setBank("accountHolderName", e.target.value)
                        }
                        className={INPUT}
                        placeholder="Full Name as on Bank Account"
                      />
                    </Field>
                    <Field label="Bank Name">
                      <input
                        type="text"
                        value={form.bankDetails.bankName}
                        onChange={(e) => setBank("bankName", e.target.value)}
                        className={INPUT}
                        placeholder="e.g. HDFC Bank"
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                    <Field label="Branch Name">
                      <input
                        type="text"
                        value={form.bankDetails.branchName}
                        onChange={(e) => setBank("branchName", e.target.value)}
                        className={INPUT}
                        placeholder="Branch"
                      />
                    </Field>
                    <Field label="Account Number">
                      <input
                        type="text"
                        value={form.bankDetails.accountNumber}
                        onChange={(e) =>
                          setBank("accountNumber", e.target.value)
                        }
                        className={`${INPUT} font-mono tracking-wider`}
                        placeholder="XXXX XXXX XXXX"
                      />
                    </Field>
                    <Field label="IFSC Code">
                      <input
                        type="text"
                        value={form.bankDetails.ifscCode}
                        onChange={(e) =>
                          setBank("ifscCode", e.target.value.toUpperCase())
                        }
                        className={`${INPUT} font-mono uppercase`}
                        placeholder="HDFC0001234"
                      />
                    </Field>
                    <Field label="UPI ID">
                      <input
                        type="text"
                        value={form.bankDetails.upiId}
                        onChange={(e) => setBank("upiId", e.target.value)}
                        className={INPUT}
                        placeholder="name@upi"
                      />
                    </Field>
                  </div>
                </div>
              </Section>

              {/* Leave Balances Configuration */}
              <Section icon={Calendar} title="Leave Balances Configuration">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {form.leaveBalances?.map((bal, idx) => (
                      <div key={idx} className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 flex flex-col gap-3">
                        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">{bal.leaveType}</div>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Allowed Days">
                            <input
                              type="number"
                              min="0"
                              value={bal.allowedDays}
                              onChange={(e) => {
                                const updated = [...form.leaveBalances];
                                updated[idx] = { ...updated[idx], allowedDays: parseInt(e.target.value) || 0 };
                                set("leaveBalances", updated);
                              }}
                              className={INPUT}
                              placeholder="e.g. 12"
                            />
                          </Field>
                          <Field label="Taken Leaves">
                            <input
                              type="number"
                              min="0"
                              value={bal.takenLeaves ?? 0}
                              onChange={(e) => {
                                const updated = [...form.leaveBalances];
                                updated[idx] = { ...updated[idx], takenLeaves: parseInt(e.target.value) || 0 };
                                set("leaveBalances", updated);
                              }}
                              className={INPUT}
                              placeholder="e.g. 0"
                            />
                          </Field>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>

              {/* 9 — Profile Photo */}
              <Section icon={Camera} title="Profile Photo">
                <div className="flex flex-col sm:flex-row gap-8 items-center bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                  {/* Preview Area */}
                  <div className="relative group flex flex-col items-center gap-3 shrink-0">
                    <div
                      className="w-28 h-28 rounded-full border-4 border-white shadow-xl bg-slate-100 flex items-center justify-center overflow-hidden cursor-pointer relative transition-all duration-300 hover:scale-105"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {photoPreview ? (
                        <>
                          <img
                            src={photoPreview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                            <Camera className="w-7 h-7 text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <User className="w-12 h-12 text-slate-350" />
                        </div>
                      )}
                    </div>
                    {photoPreview && (
                      <button
                        type="button"
                        onClick={() => setPhotoPreview(null)}
                        className="text-xs font-bold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1 rounded-full border border-rose-200 transition-all cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Upload Area */}
                  <div
                    className={`flex-1 w-full border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300 ${isDragOver
                        ? "border-[#588b12] bg-[#588b12]/5 scale-[0.99]"
                        : "border-slate-200 hover:border-[#588b12]/60 bg-white hover:bg-slate-50/50"
                      }`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-12 h-12 rounded-full bg-lime-50 text-[#588b12] flex items-center justify-center">
                      <Upload className="w-5 h-5 animate-pulse" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-700">
                        Drag &amp; drop profile picture here, or{" "}
                        <span className="text-[#588b12] underline decoration-wavy decoration-lime-400">
                          click to browse
                        </span>
                      </p>
                      <p className="text-xs text-slate-450 mt-1.5 font-medium">
                        Supports JPG, PNG, WEBP — Max 5 MB
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePhotoFile(e.target.files?.[0])}
                    />
                  </div>
                </div>
              </Section>

              {/* ── Sticky Action Bar ── */}
              <div className="sticky bottom-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 py-4 -mx-6 md:-mx-8 flex items-center justify-between gap-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-10">
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                  {mode !== "view" && (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" />
                      Fields marked{" "}
                      <span className="text-rose-500 font-bold mx-0.5">
                        *
                      </span>{" "}
                      are required
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-auto">
                  <button
                    type="button"
                    onClick={() => navigate(isEmployee ? "/employee-dashboard" : "/admin-dashboard")}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-sm font-bold transition-all cursor-pointer"
                  >
                    {mode === "view" ? "Close" : "Cancel"}
                  </button>
                  {mode !== "view" && (
                    <>
                      <button
                        type="button"
                        onClick={handleReset}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 text-sm font-bold transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                      </button>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#588b12] hover:bg-[#4a750f] active:bg-[#3d6210] text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-lime-900/15 hover:shadow-lime-900/25 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        {mode === "edit" ? "Update Employee" : "Save Employee"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </fieldset>
          </form>
        </main>
      </div>
    </div>
  );
}

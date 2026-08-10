import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  User,
  Shield,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import AxiosInstance from "../utilities/AxiosInstance";
import logo from "../assets/elroi - logo.png";

export default function Login() {
  const [role, setRole] = useState("employee"); // 'employee' | 'admin'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      toast.error("Please fill in all fields.");
      return;
    }

    setLoading(true);

    try {
      if (role === "admin") {
        if (trimmedEmail === "admin@qsis" && trimmedPassword === "11111") {
          sessionStorage.setItem(
            "user",
            JSON.stringify({
              id: "admin",
              name: "ELROI Physio Care",
              email: trimmedEmail,
              role: "admin",
            }),
          );
          toast.success("Administrator authenticated successfully!");
          navigate("/admin-dashboard");
        } else {
          toast.error(
            "Invalid admin credentials. (Use: admin@elroi.com / admin123)",
          );
        }
        return;
      }

      const response = await AxiosInstance.post("/employees/login", {
        email: trimmedEmail,
        password: trimmedPassword,
      });

      const employee = response?.data?.employee;
      if (!employee) {
        throw new Error("No employee details returned from the server.");
      }

      sessionStorage.setItem(
        "user",
        JSON.stringify({
          id: employee._id,
          employeeId: employee.employeeId,
          name:
            `${employee.firstName || ""} ${employee.lastName || ""}`.trim() ||
            employee.employeeId,
          email: trimmedEmail,
          role: "employee",
          profilePhoto: employee.profilePhoto,
        }),
      );

      toast.success(
        `Welcome back, ${employee.firstName || trimmedEmail.split("@")[0]}!`,
      );
      navigate("/employee-dashboard");
    } catch (error) {
      const message =
        error?.response?.data?.message || "Login failed. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row font-sans selection:bg-lime-600/30 overflow-hidden relative">
      {/* Left Column: Dark Branding Panel (sidebar layout matching employee.png) */}
      <div className="w-full md:w-[40%] bg-[#111622] border-b md:border-b-0 md:border-r border-slate-900 flex flex-col justify-between p-8 md:p-12 z-10 shrink-0 select-none">
        {/* Top Section wrapper to prevent vertical stretching and group items */}
        <div className="space-y-8">
          {/* Logo Section */}
          <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-700/10 flex items-center justify-center">
            <img
              src={logo}
              alt="Elroi Logo"
              className="h-1/2 w-auto object-contain"
            />
          </div>

          {/* Informational Center Section (Hidden on small screens) */}
          <div className="hidden md:block space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Physiotherapist & HR Portal
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Log daily client logs, monitor leaves, review monthly payroll
                summaries, and manage clinical records through a secure
                database.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-slate-300  text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-lime-500" />
                Real-time attendance logs
              </div>
              <div className="flex items-center gap-3 text-slate-300  text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-lime-500" />
                Interactive diagnostics reporting
              </div>
              <div className="flex items-center gap-3 text-slate-300  text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-lime-500" />
                Automated slip processing
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center md:text-left text-[10px] text-slate-500 pt-6">
          <p>© {new Date().getFullYear()} ELROI PHYSIO CARE.</p>
          <p className="mt-0.5">Secure Gateway Server v2.4</p>
        </div>
      </div>

      {/* Right Column: Clean White Login Card Area */}
      <div className="flex-1 bg-[#f8fafc] flex items-center justify-center p-6 md:p-12 z-10">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-100 p-8 md:p-10 space-y-8 relative">
          {/* Header Title */}
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Sign In
            </h3>
            <p className="text-sm text-slate-500">
              Access your clinical dashboard panel
            </p>
          </div>

          {/* Role Tabs Selection (matches the styled tag filters in employee.png) */}
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              onClick={() => setRole("employee")}
              className={`flex-1 py-2.5 rounded-lg  text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                role === "employee"
                  ? "bg-[#588b12] text-white shadow-md"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Employee
            </button>
            <button
              onClick={() => setRole("admin")}
              className={`flex-1 py-2.5 rounded-lg  text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                role === "admin"
                  ? "bg-[#588b12] text-white shadow-md"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Administrator
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div className="space-y-1.5">
              <label className=" text-sm font-bold text-slate-700 uppercase tracking-wider">
                {role === "admin" ? "Admin Email" : "Employee ID / Email"}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#588b12] focus:bg-white transition-all font-medium"
                  placeholder={
                    role === "admin" ? "admin@elroi.com" : "employee@elroi.com"
                  }
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className=" text-sm font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <span className=" text-sm text-[#588b12] font-semibold hover:underline cursor-pointer">
                  Forgot Password?
                </span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4.5 h-4.5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#588b12] focus:bg-white transition-all font-medium"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-450 hover:text-slate-600 focus:outline-none cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2  text-sm text-slate-600 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 accent-[#588b12] border-slate-350 rounded focus:ring-0 focus:outline-none"
                />
                Keep me signed in
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 bg-[#588b12] hover:bg-[#4f8a10] text-white font-bold rounded-xl shadow-lg shadow-lime-900/10 hover:shadow-lime-900/20 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer ${
                loading ? "opacity-80 cursor-not-allowed" : ""
              }`}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Info Hint */}
          {role === "admin" && (
            <div className="text-[10px] bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 text-center text-slate-500 font-mono">
              Demo Admin Auth Hint:{" "}
              <span className="font-semibold text-slate-700">
                admin@elroi.com
              </span>{" "}
              / <span className="font-semibold text-slate-700">admin123</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

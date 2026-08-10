import React, { useState, useRef, useEffect } from "react";
import { User, LogOut, ChevronDown, Menu, Bell, Wifi, Eye, EyeOff, Save, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AxiosInstance from "../utilities/AxiosInstance";

const Navbar = ({ title = "Dashboard", onMobileMenuOpen }) => {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // WiFi Modal State
  const [wifiModalOpen, setWifiModalOpen] = useState(false);
  const [wifiUsername, setWifiUsername] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [wifiLoading, setWifiLoading] = useState(false);

  // Read user from sessionStorage (matches Login.jsx which uses navigate after auth)
  const user = (() => {
    try {
      return JSON.parse(sessionStorage.getItem("user"));
    } catch {
      return null;
    }
  })();

  const displayName = user?.name || user?.email?.split("@")[0] || "User";
  const displayRole = user?.role === "admin" ? "CEO/Admin" : "Employee";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch WiFi Configuration
  const fetchWifiConfig = async () => {
    try {
      const response = await AxiosInstance.get("/wifi");
      if (response.data && response.data.success) {
        setWifiUsername(response.data.data.wifiUsername || "");
        setWifiPassword(response.data.data.wifiPassword || "");
      }
    } catch (error) {
      console.error("Error fetching wifi config:", error);
    }
  };

  const handleOpenWifiModal = () => {
    fetchWifiConfig();
    setWifiModalOpen(true);
  };

  const handleSaveWifiConfig = async (e) => {
    e.preventDefault();
    if (!wifiUsername) {
      toast.error("WiFi Username is required.");
      return;
    }
    setWifiLoading(true);
    try {
      const response = await AxiosInstance.post("/wifi", {
        wifiUsername,
        wifiPassword,
      });
      if (response.data && response.data.success) {
        toast.success("WiFi Configuration saved successfully!");
        setWifiModalOpen(false);
      } else {
        toast.error(response.data.error || "Failed to save WiFi Configuration.");
      }
    } catch (error) {
      console.error("Error saving wifi config:", error);
      toast.error("Failed to save WiFi Configuration.");
    } finally {
      setWifiLoading(false);
    }
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    sessionStorage.clear();
    toast.info("Logged out successfully.");
    navigate("/");
  };

  return (
    <>
      <header
        className="
          fixed top-0 right-0 left-0 lg:left-56 z-30
          h-[60px] bg-white/90 backdrop-blur-md
          border-b border-slate-200/80
          flex items-center justify-between
          px-4 md:px-6
          shadow-[0_1px_8px_rgba(0,0,0,0.06)]
          transition-all duration-300
        "
      >
        {/* ── LEFT: Mobile hamburger + Page title ─────────────────────── */}
        <div className="flex items-center gap-3">
          {/* Mobile menu toggle */}
          <button
            onClick={onMobileMenuOpen}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Page title */}
          <div>
            <h1 className="text-base font-bold text-slate-800 leading-tight tracking-tight">
              {title}
            </h1>
            <p className="hidden sm:block text-[11px] text-slate-400 font-medium">
              Elroi Physio Portal
            </p>
          </div>
        </div>

        {/* ── RIGHT: Notification + Profile ───────────────────────────── */}
        <div className="flex items-center gap-2">
          {/* WiFi config button */}
          {
            displayRole !== 'Employee' && (

              <button
                onClick={handleOpenWifiModal}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="WiFi Configuration"
              >
                <Wifi className="w-4.5 h-4.5" />
              </button>

            )}
          {/* Notification bell */}
          <button className="relative p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <Bell className="w-4.5 h-4.5" />
            {/* badge */}
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#588b12]" />
          </button>

          {/* Profile dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-100 transition-colors"
            >
              {/* Avatar circle with initials */}
              <div className="w-8 h-8 rounded-full bg-[#588b12] text-white text-xs font-bold flex items-center justify-center shadow-sm shrink-0">
                {initials || <User className="w-4 h-4" />}
              </div>

              {/* Name + role (hidden on xs) */}
              <div className="hidden sm:block text-left leading-none">
                <p className="text-[13px] font-bold text-slate-800">
                  {displayName}
                </p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  {displayRole}
                </p>
              </div>

              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {/* Dropdown menu */}
            {dropdownOpen && (
              <div
                className="
                absolute right-0 top-full mt-2 w-52
                bg-white rounded-2xl border border-slate-100
                shadow-[0_8px_32px_rgba(0,0,0,0.12)]
                overflow-hidden z-50
                animate-in fade-in slide-in-from-top-2 duration-150
              "
              >
                {/* User info header */}
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <p className="text-sm font-bold text-slate-800">
                    {displayName}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{displayRole}</p>
                </div>

                {/* Menu items */}
                <div className="py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* WiFi Configuration Modal */}
      {wifiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl mx-4 border border-slate-100 animate-in zoom-in-95 duration-200 relative">

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">WiFi Configuration</h2>
              <button
                onClick={() => setWifiModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveWifiConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  WiFi Username
                </label>
                <input
                  type="text"
                  value={wifiUsername}
                  onChange={(e) => setWifiUsername(e.target.value)}
                  placeholder="Enter WiFi Username"
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium text-slate-700 placeholder-slate-400 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                  WiFi Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={wifiPassword}
                    onChange={(e) => setWifiPassword(e.target.value)}
                    placeholder="Enter WiFi Password"
                    className="w-full pl-4 pr-10 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium text-slate-700 placeholder-slate-400 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setWifiModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={wifiLoading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-md transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {wifiLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;

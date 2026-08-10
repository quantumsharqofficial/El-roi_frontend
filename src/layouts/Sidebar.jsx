import React from "react";
import {
  Users,
  CalendarCheck,
  CalendarDays,
  FileText,
  X,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import logo from "../assets/elroi - logo.png";

// ─── Menu Definitions ────────────────────────────────────────────────────────
const ADMIN_MENU = [
  { label: "Employees", icon: Users, tab: "Employees" },
  { label: "Attendance",  icon: CalendarCheck, tab: "Attendance Logs" },
  { label: 'Leave',       icon: CalendarDays,  tab: 'Leaves' },
];

const EMPLOYEE_MENU = [
  // { label: "Dashboard", icon: Users, tab: "Dashboard" },
  { label: "Leave Requests", icon: CalendarDays, tab: "Leave Requests" },
  { label: "Profile", icon: Users, tab: "Profile" },
];

// ─── Sidebar inner content ────────────────────────────────────────────────────
function SidebarContent({
  isAdmin,
  menuItems,
  activeTab,
  onTabChange,
  onMobileClose,
  handleLogout,
  handleMenuClick,
}) {
  return (
    <div
      className="flex flex-col h-full select-none overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #0f1923 0%, #111d28 60%, #0d1720 100%)",
      }}
    >
      {/* ── Logo Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-5 pb-4 border-b border-white/[0.06]">
        <div className="flex-1 flex items-center justify-center bg-white rounded-xl px-3 py-2.5 shadow-md">
          <img
            src={logo}
            alt="Elroi Physio"
            className="h-8 w-auto object-contain"
          />
        </div>
        {/* Mobile close */}
        <button
          onClick={onMobileClose}
          className="lg:hidden ml-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Role Tag ─────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-1">
        <div
          className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold
                    uppercase tracking-[0.12em] w-fit
                    ${
                      isAdmin
                        ? "bg-violet-500/10 text-violet-300 border border-violet-500/20"
                        : "bg-[#588b12]/10 text-[#96c93d] border border-[#588b12]/25"
                    }
                `}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${isAdmin ? "bg-violet-400" : "bg-[#7dbf24]"}`}
          />
          {isAdmin ? "Administrator" : "Employee"}
        </div>
      </div>

      {/* ── Section label ────────────────────────────────────────── */}
      <p className="px-5 pt-4 pb-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">
        Navigation
      </p>

      {/* ── Nav Items ────────────────────────────────────────────── */}
      <nav className="flex-1 px-2.5 space-y-0.5 overflow-y-auto pb-2">
        {menuItems.map(({ label, icon: Icon, tab }) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => handleMenuClick(tab)}
              className="w-full text-left relative group"
            >
              {/* Active left accent bar */}
              <span
                className={`
                                absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full
                                transition-all duration-200
                                ${isActive ? "h-6 bg-[#7dbf24]" : "h-0 bg-transparent"}
                            `}
              />

              <div
                className={`
                                flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-xl
                                transition-all duration-150
                                ${
                                  isActive
                                    ? "bg-[#588b12]/15 text-white"
                                    : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
                                }
                            `}
              >
                {/* Icon */}
                <span
                  className={`
                                    w-8 h-8 flex items-center justify-center rounded-lg shrink-0
                                    transition-all duration-150
                                    ${
                                      isActive
                                        ? "bg-[#588b12] text-white shadow-[0_2px_12px_rgba(88,139,18,0.45)]"
                                        : "bg-white/[0.06] text-slate-400 group-hover:bg-white/[0.1] group-hover:text-slate-200"
                                    }
                                `}
                >
                  <Icon className="w-[15px] h-[15px]" />
                </span>

                {/* Label */}
                <span className="flex-1 text-sm font-semibold">{label}</span>

                {/* Chevron / pip */}
                {isActive ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7dbf24] shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-opacity" />
                )}
              </div>
            </button>
          );
        })}
      </nav>

      {/* ── Divider ──────────────────────────────────────────────── */}
      <div className="mx-4 border-t border-white/[0.06]" />

      {/* ── Logout ───────────────────────────────────────────────── */}
      <div className="px-2.5 py-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-xl
                        text-slate-400 hover:text-red-400 hover:bg-red-500/[0.08]
                        transition-all duration-150 group"
        >
          <span
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/[0.06]
                        group-hover:bg-red-500/10 transition-colors shrink-0"
          >
            <LogOut className="w-[15px] h-[15px]" />
          </span>
          <span className="text-sm font-semibold">Logout</span>
        </button>
      </div>

      {/* ── Bottom branding ──────────────────────────────────────── */}
      <div className="px-4 pb-4 text-center">
        <p className="text-[9px] text-slate-600 font-mono tracking-widest">
          © {new Date().getFullYear()} ELROI PHYSIO CARE
        </p>
      </div>
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────
export default function Sidebar({
  variant,
  activeTab,
  onTabChange,
  mobileOpen,
  onMobileClose,
}) {
  const navigate = useNavigate();
  const isAdmin = variant === "admin";
  const menuItems = isAdmin ? ADMIN_MENU : EMPLOYEE_MENU;

  const handleLogout = () => {
    localStorage.removeItem("adminActiveTab");
    localStorage.removeItem("employeeActiveTab");
    toast.info("Logged out successfully.");
    navigate("/");
  };

  const handleMenuClick = (tab) => {
    if (!isAdmin) {
      if (tab === "Profile") {
        const storedUser = sessionStorage.getItem("user");
        if (storedUser) {
          const user = JSON.parse(storedUser);
          const employeeId = user?.id || user?.employeeId;
          if (employeeId) {
            navigate(`/view-employee/${employeeId}`);
            onMobileClose?.();
            return;
          }
        }
      } else {
        navigate("/employee-dashboard");
        onTabChange?.(tab);
        onMobileClose?.();
        return;
      }
    }

    onTabChange?.(tab);
    onMobileClose?.();
  };

  const contentProps = {
    isAdmin,
    menuItems,
    activeTab,
    onTabChange,
    onMobileClose,
    handleLogout,
    handleMenuClick,
  };

  return (
    <>
      {/* ── Desktop: fixed sidebar ── */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 h-screen fixed top-0 left-0 z-40 shadow-2xl">
        <SidebarContent {...contentProps} />
      </aside>

      {/* ── Mobile: overlay drawer ───────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <aside className="relative w-56 h-full shadow-2xl">
            <SidebarContent {...contentProps} />
          </aside>
        </div>
      )}
    </>
  );
}

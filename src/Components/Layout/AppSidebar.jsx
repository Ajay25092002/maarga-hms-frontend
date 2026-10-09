import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  LayoutDashboard,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  ClipboardList,
  CalendarDays,
  BedDouble,
  Wallet,
  Clock3,
  ReceiptText,
  Package,
  Stethoscope,
  UserRound,
  FlaskConical,
  ScanLine,
  Pill,
  Calculator,
  ShieldCheck,
  ChartNoAxesCombined,
  Users,
  HeartPulse,
  FileText,
} from "lucide-react";
import logo from "../../assets/logo.png";

const navigation = [
  {
    label: "Front Office",
    icon: ClipboardList,
    children: [
      { label: "Registration", icon: UserRound },
      { label: "Appointments", icon: CalendarDays },
      { label: "Admission", icon: BedDouble },
      { label: "Collection", icon: Wallet },
      { label: "Timeslots", icon: Clock3 },
      { label: "Ratechart View", icon: ReceiptText },
      { label: "Package View", icon: Package },
    ],
  },
  {
    label: "Nursing Station",
    icon: HeartPulse,
    children: [{ label: "Nursing Workspace", icon: ClipboardList }],
  },
  {
    label: "Doctors Desk",
    icon: Stethoscope,
    children: [{ label: "Doctor Workspace", icon: UserRound }],
  },
  {
    label: "Diagnostics",
    icon: FlaskConical,
    children: [{ label: "Laboratory", icon: FlaskConical }],
  },
  {
    label: "Radiology",
    icon: ScanLine,
    children: [{ label: "Radiology Workspace", icon: FileText }],
  },
  {
    label: "Pharmacy",
    icon: Pill,
    children: [{ label: "Pharmacy Workspace", icon: Package }],
  },
  {
    label: "Accounts",
    icon: Calculator,
    children: [{ label: "Accounts Workspace", icon: Wallet }],
  },
  {
    label: "Insurance",
    icon: ShieldCheck,
    children: [{ label: "Insurance Workspace", icon: FileText }],
  },
  {
    label: "MIS Management",
    icon: ChartNoAxesCombined,
    children: [
      { label: "MIS Patients", icon: Users },
      { label: "MIS Pharmacy", icon: Pill },
      { label: "MIS Diagnostics", icon: FlaskConical },
      { label: "MIS Laboratory", icon: FlaskConical },
      { label: "MIS Radiology", icon: ScanLine },
    ],
  },
];

export default function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [expandedMenus, setExpandedMenus] = useState(["Front Office"]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState("Dashboard");

  const toggleMenu = (label) => {
    setExpandedMenus((current) =>
      current.includes(label)
        ? current.filter((item) => item !== label)
        : [...current, label],
    );
  };

  const goToDashboard = () => {
    setSelectedItem("Dashboard");
    navigate("/");
    setMobileOpen(false);
  };

  const selectMenuItem = (label) => {
    // Preserve the existing placeholder behaviour until module routes exist.
    setSelectedItem(label);
    setMobileOpen(false);
  };

  const renderMenu = () => (
    <nav
      aria-label="Main navigation"
      className="min-h-0 flex-1 overflow-y-auto px-3 pb-4"
    >
      <div className="mb-2 px-3 pb-2 pt-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
          Main navigation
        </p>
      </div>

      <div className="space-y-0.5">
        {navigation.map((item) => {
          const Icon = item.icon;
          const expanded = expandedMenus.includes(item.label);
          const childSelected = item.children.some(
            (child) => child.label === selectedItem,
          );

          return (
            <div key={item.label}>
              <button
                type="button"
                onClick={() => toggleMenu(item.label)}
                aria-expanded={expanded}
                className={`group flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-[13px] transition-colors duration-150 ${
                  childSelected
                    ? "text-[#3E439C] dark:text-[#D6D4FF]"
                    : "text-slate-600 hover:bg-[#FAF9FF] hover:text-[#3E439C] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                }`}
              >
                <Icon
                  size={18}
                  strokeWidth={1.7}
                  className={`shrink-0 ${
                    childSelected
                      ? "text-[#3E439C] dark:text-[#D6D4FF]"
                      : "text-slate-500 group-hover:text-[#3E439C] dark:text-slate-400 dark:group-hover:text-[#D6D4FF]"
                  }`}
                />

                <span className="min-w-0 flex-1 font-medium">{item.label}</span>

                {expanded ? (
                  <ChevronDown
                    size={15}
                    strokeWidth={1.7}
                    className="shrink-0 text-slate-400 dark:text-slate-500"
                  />
                ) : (
                  <ChevronRight
                    size={15}
                    strokeWidth={1.7}
                    className="shrink-0 text-slate-400 dark:text-slate-500"
                  />
                )}
              </button>

              {expanded && (
                <div className="mb-1 ml-[21px] mt-0.5 border-l border-[#E4E2FF] pl-3 dark:border-slate-700">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon;
                    const active = selectedItem === child.label;

                    return (
                      <button
                        type="button"
                        key={child.label}
                        onClick={() => selectMenuItem(child.label)}
                        aria-current={active ? "page" : undefined}
                        className={`flex min-h-[34px] w-full items-center gap-2.5 rounded px-2 text-left text-[12px] transition-colors duration-150 ${
                          active
                            ? "bg-[#F1F0FF] font-medium text-[#3E439C] dark:bg-indigo-950/70 dark:text-[#D6D4FF]"
                            : "text-slate-500 hover:bg-[#FAF9FF] hover:text-[#3E439C] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                        }`}
                      >
                        <ChildIcon
                          size={15}
                          strokeWidth={1.7}
                          className="shrink-0"
                        />
                        <span>{child.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );

  const sidebarContent = (
    <>
      {/* Brand header */}
      <div className="flex h-[68px] shrink-0 items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-700">
        <img
          src={logo}
          alt="Maarga Mindcare"
          className="h-8 w-8 object-contain"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold tracking-tight text-[#292B38] dark:text-slate-100">
            Maarga Mindcare
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
            Hospital Management System
          </p>
        </div>
      </div>

      {/* Dashboard */}
      <div className="shrink-0 border-b border-slate-200 px-3 pb-3 dark:border-slate-700">
        <p className="px-3 pb-2 pt-5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
          Workspace
        </p>

        <button
          type="button"
          onClick={goToDashboard}
          aria-current={
            location.pathname === "/" && selectedItem === "Dashboard"
              ? "page"
              : undefined
          }
          className={`flex min-h-10 w-full items-center gap-3 rounded-md border-l-2 px-3 text-left text-[13px] transition-colors duration-150 ${
            location.pathname === "/" && selectedItem === "Dashboard"
              ? "border-[#3E439C] bg-[#F1F0FF] font-semibold text-[#3E439C] dark:border-[#FFDA16] dark:bg-indigo-950/70 dark:text-[#D6D4FF]"
              : "border-transparent text-slate-600 hover:bg-[#FAF9FF] hover:text-[#3E439C] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          }`}
        >
          <LayoutDashboard size={18} strokeWidth={1.7} className="shrink-0" />
          <span>Dashboard</span>
        </button>
      </div>

      {renderMenu()}

      {/* Footer */}
      <div className="flex shrink-0 items-center gap-2.5 border-t border-slate-200 px-4 py-3 dark:border-slate-700">
        <ShieldCheck
          size={17}
          strokeWidth={1.7}
          className="shrink-0 text-slate-500 dark:text-slate-400"
        />
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200">
            Hospital Operations
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
            Management workspace
          </p>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile trigger */}
      <button
        type="button"
        aria-label="Open navigation"
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-40 hidden h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-[#3E439C] shadow-sm max-md:flex dark:border-slate-700 dark:bg-[#171827] dark:text-[#D6D4FF]"
      >
        <Menu size={19} />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation backdrop"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/30 dark:bg-black/60 md:hidden"
        />
      )}

      {/* Desktop sidebar: original width and expanded layout */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-[#171827] md:flex">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-200 dark:border-slate-700 dark:bg-[#171827] md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-10 shrink-0 items-center justify-end border-b border-slate-100 px-3 dark:border-slate-700">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1.5 text-slate-500 hover:bg-[#F1F0FF] dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {sidebarContent}
      </aside>
    </>
  );
}

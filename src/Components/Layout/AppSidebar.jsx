import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useSidebarStore } from "../../Store";
import {
  LayoutDashboard,
  House,
  UserRoundPlus,
  Users,
  ReceiptText,
  BedDouble,
  Wallet,
  ShieldCheck,
  Menu,
  X,
  LogOut,
  AlertCircle,
  Tags,
  RotateCcw,
  FileSpreadsheet,
} from "lucide-react";

import { useTheme } from "../../Context/ThemeContext";
import logo from "../../assets/logo.png";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8001"
).replace(/\/$/, "");

// Module-level cache: survives AppSidebar unmounts during navigation.
let authCache = null;
let authRequest = null;

function getInitialAuthUser() {
  if (authCache !== null) {
    return Promise.resolve(authCache);
  }

  if (authRequest) {
    return authRequest;
  }

  authRequest = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Unable to load account permissions.");
      }

      authCache = {
        user: data.user || null,
        error: "",
      };
    } catch (error) {
      authCache = {
        user: null,
        error: error.message || "Unable to load your account.",
      };
    }

    return authCache;
  })();

  return authRequest;
}

function clearAuthCache() {
  authCache = null;
  authRequest = null;
}

const groups = [
  {
    title: "WORKSPACE",
    items: [
      {
        label: "Dashboard",
        path: "/home",
        icon: LayoutDashboard,
        permission: "dashboard.view",
        isActive: (pathname) => pathname === "/" || pathname === "/home",
      },
    ],
  },
  {
    title: "PATIENT MANAGEMENT",
    items: [
      {
        label: "Patient Registration",
        path: "/patients/new",
        icon: UserRoundPlus,
        permissions: ["patients.op.create", "patients.ip.create"],

        // Registration is active only on its exact route.
        isActive: (pathname) => pathname === "/patients/new",
      },
      {
        label: "Patient List",
        path: "/patients",
        icon: Users,
        permissions: ["patients.op.view", "patients.ip.view"],

        // Patient list and patient detail/edit pages only.
        // Explicitly exclude the registration route.
        isActive: (pathname) =>
          pathname === "/patients" ||
          (pathname !== "/patients/new" &&
            /^\/patients\/[^/]+(?:\/edit)?\/?$/.test(pathname)),
      },
    ],
  },
  {
    title: "BILLING OPERATIONS",
    items: [
      {
        label: "OP Billing",
        path: "/op-billing",
        icon: ReceiptText,
        permission: "bills.op.view",
        isActive: (pathname) =>
          pathname === "/op-billing" || pathname.startsWith("/op-billing/"),
      },
      {
        label: "IP Billing",
        path: "/ip-billing",
        icon: BedDouble,
        permission: "bills.ip.view",
        isActive: (pathname) =>
          pathname === "/ip-billing" || pathname.startsWith("/ip-billing/"),
      },
      {
        label: "Nurse",
        path: "/nurse",
        icon: BedDouble,
        permission: "nurse.view",
        isActive: (pathname) => pathname === "/nurse" || pathname.startsWith("/nurse/"),
      },
      {
        label: "Payments & Receipts",
        path: "/payments",
        icon: Wallet,
        permission: "payments.view",
        isActive: (pathname) =>
          pathname === "/payments" || pathname.startsWith("/payments/"),
      },
      {
        label: "Payment Refunds",
        path: "/payment-refunds",
        icon: RotateCcw,
        permission: "refunds.view",
        isActive: (pathname) =>
          pathname === "/payment-refunds" ||
          pathname.startsWith("/payment-refunds/"),
      },
      {
        label: "Reports",
        path: "/reports",
        icon: FileSpreadsheet,
        permission: "reports.view",
        isActive: (pathname) => pathname === "/reports" || pathname.startsWith("/reports/"),
      },
    ],
  },
];

const settingsItems = [
  {
    label: "Users",
    path: "/settings/users",
    icon: Users,
    permission: "users.view",
    isActive: (pathname) =>
      pathname === "/settings/users" || pathname.startsWith("/settings/users/"),
  },
  {
    label: "Roles",
    path: "/settings/roles",
    icon: ShieldCheck,
    permission: "roles.view",
    isActive: (pathname) =>
      pathname === "/settings/roles" || pathname.startsWith("/settings/roles/"),
  },
  {
    label: "Pricing Management",
    path: "/settings/pricing",
    icon: Tags,
    permission: "pricing.view",
    isActive: (pathname) =>
      pathname === "/settings/pricing" ||
      pathname.startsWith("/settings/pricing/"),
  },
];

function hasPermission(permissions, requiredPermission) {
  if (!requiredPermission) return true;

  const required = String(requiredPermission).trim().toLowerCase();

  if (Array.isArray(permissions)) {
    return permissions.some(
      (permission) => String(permission).trim().toLowerCase() === required,
    );
  }

  if (!permissions || typeof permissions !== "object") {
    return false;
  }

  // Flat object, e.g. { "dashboard.view": true }
  if (Object.prototype.hasOwnProperty.call(permissions, required)) {
    return permissions[required] === true;
  }

  // Nested object support, e.g. { dashboard: { view: true } }
  let current = permissions;

  for (const part of required.split(".")) {
    if (
      current === null ||
      typeof current !== "object" ||
      !Object.prototype.hasOwnProperty.call(current, part)
    ) {
      return false;
    }

    current = current[part];
  }

  return current === true;
}

function SidebarContents({
  permissions,
  onNavigate,
  onLogout,
  loggingOut,
  logoutError,
  loadingUser,
  userError,
}) {
  const location = useLocation();
  const { theme } = useTheme();

  const hasDashboardPermission = hasPermission(
    permissions,
    "dashboard.view",
  );

  const visibleGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          items: group.items
            .filter((item) => {
              // Keep the workspace link available even without dashboard access.
              if (item.path === "/home") return true;

              return item.permissions
                ? item.permissions.some((permission) =>
                    hasPermission(permissions, permission),
                  )
                : hasPermission(permissions, item.permission);
            })
            .map((item) => {
              // Show Home for users without dashboard.view permission.
              if (item.path === "/home") {
                return {
                  ...item,
                  label: hasDashboardPermission ? "Dashboard" : "Home",
                  icon: hasDashboardPermission ? LayoutDashboard : House,
                };
              }

              return item;
            }),
        }))
        .filter((group) => group.items.length > 0),
    [permissions, hasDashboardPermission],
  );

  const visibleSettings = useMemo(
    () =>
      settingsItems.filter((item) =>
        hasPermission(permissions, item.permission),
      ),
    [permissions],
  );

  const linkClass = (active) =>
    `group flex min-h-[34px] items-center gap-2 rounded-md px-2.5 text-[12px] font-medium transition-colors ${
      active
        ? "bg-[#F1F0FF] text-[#3E439C] dark:bg-[#303253] dark:text-[#DCDFFF]"
        : "text-slate-600 hover:bg-[#F8F7FF] hover:text-[#3E439C] dark:text-slate-300 dark:hover:bg-[#25263A] dark:hover:text-[#DCDFFF]"
    }`;

  function renderItem(item) {
    const Icon = item.icon;

    // Use only the explicit route condition.
    // Do not use NavLink's default isActive result here.
    const active = item.isActive(location.pathname);

    return (
      <NavLink
        key={item.path}
        to={item.path}
        onClick={onNavigate}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
        className={linkClass(active)}
      >
        <Icon size={16} strokeWidth={1.8} className="shrink-0" />

        <span className="min-w-0 flex-1 truncate">{item.label}</span>
      </NavLink>
    );
  }

  return (
    <>
      {/* Brand header */}
      <div className="flex h-[60px] shrink-0 items-center gap-3 border-b border-slate-200 px-3 dark:border-slate-700">
        <img
          src={logo}
          alt="Hospital HMS"
          className="h-9 w-9 shrink-0 object-contain"
        />

        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">
            Hospital HMS
          </p>
          <p className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400">
            Billing &amp; Operations
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav
        aria-label="Main navigation"
        className="billing-sidebar-scroll min-h-0 flex-1 overflow-y-auto px-2 py-1.5"
      >
        {loadingUser ? (
          <p className="px-3 py-4 text-xs text-slate-500 dark:text-slate-400">
            Loading your access...
          </p>
        ) : userError ? (
          <div
            role="alert"
            className="m-1 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
          >
            <div className="flex items-start gap-2">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{userError}</span>
            </div>
          </div>
        ) : (
          <>
            {visibleGroups.map((group) => (
              <section key={group.title} className="mb-2.5">
                <p className="mb-3 px-2.5 pt-0.5 text-[9px] font-semibold tracking-[0.12em] text-slate-400 dark:text-slate-500">
                  {group.title}
                </p>

                <div className="space-y-1">{group.items.map(renderItem)}</div>
              </section>
            ))}

            {visibleSettings.length > 0 && (
              <section className="mb-2">
                <p className="mb-1 px-2.5 pt-0.5 text-[9px] font-semibold tracking-[0.12em] text-slate-400 dark:text-slate-500">
                  SETTINGS
                </p>

                <div className="space-y-0">
                  {visibleSettings.map(renderItem)}
                </div>
              </section>
            )}

            {visibleGroups.length === 0 && visibleSettings.length === 0 && (
              <p className="px-3 py-4 text-xs text-slate-500 dark:text-slate-400">
                No navigation items are available for your account.
              </p>
            )}
          </>
        )}
      </nav>

      {/* Footer: Logout only */}
      <footer className="shrink-0 border-t border-slate-200 p-2.5 dark:border-slate-700">
        {logoutError && (
          <p
            role="alert"
            className="mb-2 text-xs text-red-600 dark:text-red-300"
          >
            {logoutError}
          </p>
        )}

        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          className="flex min-h-[38px] w-full items-center gap-2.5 rounded-md px-2.5 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-300 dark:hover:bg-red-950/30"
        >
          <LogOut size={16} className="shrink-0" />
          {loggingOut ? "Logging out..." : "Logout"}
        </button>
      </footer>
    </>
  );
}

export default function AppSidebar() {
  const navigate = useNavigate();

  const mobileOpen = useSidebarStore((state) => state.isOpen);
  const closeSidebar = useSidebarStore((state) => state.closeSidebar);
  const [permissions, setPermissions] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [userError, setUserError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const closeMobile = closeSidebar;

  // Fetch once per browser app session; route changes reuse the cache.
  useEffect(() => {
    let cancelled = false;

    getInitialAuthUser().then((result) => {
      if (cancelled) return;

      setPermissions(result.user?.permissions || null);
      setUserError(result.error);
      setLoadingUser(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") {
        closeMobile();
      }
    }

    if (mobileOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [mobileOpen, closeMobile]);

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Unable to log out.");
      }

      clearAuthCache();
      setPermissions(null);
      closeMobile();
      navigate("/login", { replace: true });
    } catch (error) {
      setLogoutError(error.message || "Unable to log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  const sidebarProps = {
    permissions,
    onNavigate: closeMobile,
    onLogout: handleLogout,
    loggingOut,
    logoutError,
    loadingUser,
    userError,
  };

  return (
    <>
      {/* Mobile and tablet full drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col border-r border-slate-200 bg-white text-slate-700 shadow-xl transition-transform duration-200 dark:border-slate-700 dark:bg-[#171827] dark:text-slate-200 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Mobile and tablet navigation"
        aria-hidden={!mobileOpen}
      >
        <div className="absolute right-2 top-4 z-10">
          <button
            type="button"
            onClick={closeMobile}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <X size={17} />
          </button>
        </div>

        <SidebarContents {...sidebarProps} />
      </aside>

      {/* Laptop and desktop full sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-[#171827] dark:text-slate-200 lg:flex"
        aria-label="Main navigation"
      >
        <SidebarContents {...sidebarProps} />
      </aside>

      <style>{`
        .billing-sidebar-scroll {
          scrollbar-width: thin;
          scrollbar-color: #d8d7e6 transparent;
        }

        .billing-sidebar-scroll::-webkit-scrollbar {
          width: 5px;
        }

        .billing-sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .billing-sidebar-scroll::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: #d8d7e6;
        }

        .billing-sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: #b8b6d3;
        }

        .dark .billing-sidebar-scroll {
          scrollbar-color: #484a65 transparent;
        }

        .dark .billing-sidebar-scroll::-webkit-scrollbar-thumb {
          background: #484a65;
        }

        .dark .billing-sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: #686b89;
        }
      `}</style>
    </>
  );
}

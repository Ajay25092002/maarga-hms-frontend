import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  LogOut,
  Moon,
  Sun,
  UserRound,
  Menu,
  X,
} from "lucide-react";
import { useSidebarStore } from "../../Store";
import { useTheme } from "../../Context/ThemeContext";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8001"
).replace(/\/$/, "");

export default function TopNavbar({
  title = "Hospital Operations",
  breadcrumb = ["Hospital Billing", "Workspace"],
}) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  const navigate = useNavigate();
  const menuRef = useRef(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const mobileOpen = useSidebarStore((state) => state.isOpen);
  const toggleSidebar = useSidebarStore((state) => state.toggleSidebar);

  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUser() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          if (response.status === 401 && !cancelled) {
            setCurrentUser(null);
          }
          return;
        }

        const data = await response.json();

        if (!cancelled) {
          setCurrentUser(data.user || null);
        }
      } catch {
        if (!cancelled) {
          setCurrentUser(null);
        }
      }
    }

    loadCurrentUser();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const email = currentUser?.email || "";
  const displayName =
    currentUser?.full_name ||
    currentUser?.name ||
    (email ? email.split("@")[0] : "Signed-in User");

  const roleName = currentUser?.role_name || currentUser?.role || "User";

  const initials =
    displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U";

  async function handleLogout() {
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
        throw new Error(data.detail || "Unable to log out. Please try again.");
      }

      setCurrentUser(null);
      setProfileOpen(false);
      navigate("/login", { replace: true });
    } catch (error) {
      setLogoutError(error.message || "Unable to log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between gap-3 border-b border-slate-200 bg-white pl-5 pr-3 transition-colors dark:border-slate-700 dark:bg-[#171827] sm:pr-5 lg:px-6">
      {/* Page context */}
      <button
            type="button"
            onClick={toggleSidebar}
            aria-label={
              mobileOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={mobileOpen}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-[#F1F0FF] dark:border-slate-700 dark:bg-[#171827] dark:text-slate-200 dark:hover:bg-slate-800 lg:hidden"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
      <div className="min-w-0 flex-1">
        
        <nav
          aria-label="Breadcrumb"
          className="mb-1 flex items-center gap-1.5 overflow-hidden text-[11px] text-slate-500 dark:text-slate-400"
        >
          
          {breadcrumb.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="flex min-w-0 shrink items-center gap-1.5"
            >
              {index > 0 && (
                <span className="shrink-0 text-slate-300 dark:text-slate-600">
                  /
                </span>
              )}

              <span
                className={`truncate ${
                  index === breadcrumb.length - 1
                    ? "font-medium text-slate-600 dark:text-slate-300"
                    : ""
                }`}
              >
                {item}
              </span>
            </span>
          ))}
        </nav>

        <h1 className="truncate text-[13px] font-semibold tracking-tight text-[#292B38] dark:text-slate-100">
          {title}
        </h1>
      </div>

      {/* Theme and user profile */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <div className="hidden h-6 w-px bg-slate-200 dark:bg-slate-700 sm:block" />

        <button
          type="button"
          aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
          title={`Switch to ${isDark ? "light" : "dark"} theme`}
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-md text-[#3E439C] transition-colors hover:bg-[#F1F0FF] dark:text-[#FFDA16] dark:hover:bg-slate-800"
        >
          {isDark ? (
            <Sun size={18} strokeWidth={1.8} />
          ) : (
            <Moon size={18} strokeWidth={1.8} />
          )}
        </button>

        <div className="hidden h-6 w-px bg-slate-200 dark:bg-slate-700 sm:block" />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-label="Open user profile menu"
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            onClick={() => {
              setProfileOpen((open) => !open);
              setLogoutError("");
            }}
            className="flex max-w-[230px] items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-[#FAF9FF] dark:hover:bg-slate-800 sm:gap-2.5 sm:px-2"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F1F0FF] text-xs font-semibold text-[#3E439C] dark:bg-indigo-950 dark:text-[#D6D4FF]">
              {initials}
            </div>

            <div className="hidden min-w-0 text-left sm:block">
              <p className="max-w-[145px] truncate text-xs font-semibold text-[#292B38] dark:text-slate-100">
                {displayName}
              </p>

              <p className="mt-0.5 max-w-[145px] truncate text-[10px] text-slate-500 dark:text-slate-400">
                {roleName}
              </p>
            </div>

            <ChevronDown
              size={14}
              className={`hidden shrink-0 text-slate-400 transition-transform dark:text-slate-500 sm:block ${
                profileOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {profileOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-[min(300px,calc(100vw-24px))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-[#171827]"
            >
              <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F1F0FF] text-sm font-semibold text-[#3E439C] dark:bg-indigo-950 dark:text-[#D6D4FF]">
                    {initials}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {displayName}
                    </p>

                    {email && (
                      <p className="mt-0.5 break-all text-xs text-slate-500 dark:text-slate-400">
                        {email}
                      </p>
                    )}

                    <p className="mt-1 text-xs text-[#3E439C] dark:text-[#D6D4FF]">
                      {roleName}
                    </p>
                  </div>
                </div>
              </div>

              {logoutError && (
                <p
                  role="alert"
                  className="px-4 py-2 text-xs text-red-600 dark:text-red-300"
                >
                  {logoutError}
                </p>
              )}

              <div className="p-2">
                <button
                  type="button"
                  role="menuitem"
                  disabled={loggingOut}
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-300 dark:hover:bg-red-950/30"
                >
                  <LogOut size={17} />
                  {loggingOut ? "Logging out..." : "Logout"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

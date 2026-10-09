
import {
  Search,
  Bell,
  ChevronDown,
  Building2,
  Command,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "../../Context/ThemeContext";

export default function TopNavbar({
  title = "Hospital Operations",
  breadcrumb = ["Hospital Management", "Workspace"],
}) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <header className="sticky top-0 z-20 flex h-[64px] w-full items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 pl-16 transition-colors dark:border-slate-700 dark:bg-[#171827] md:px-7">
      {/* Page context */}
      <div className="min-w-0 flex-1">
        <nav
          aria-label="Breadcrumb"
          className="mb-1 flex items-center gap-1.5 overflow-hidden text-[11px] text-slate-500 dark:text-slate-400"
        >
          {breadcrumb.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="flex shrink-0 items-center gap-1.5"
            >
              {index > 0 && (
                <span className="text-slate-300 dark:text-slate-600">
                  /
                </span>
              )}

              <span
                className={
                  index === breadcrumb.length - 1
                    ? "font-medium text-slate-600 dark:text-slate-300"
                    : ""
                }
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

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {/* Search */}
        <button
          type="button"
          aria-label="Search"
          className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-[#F1F0FF] hover:text-[#3E439C] sm:hidden dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-[#D6D4FF]"
        >
          <Search size={18} strokeWidth={1.8} />
        </button>

        <div className="relative hidden lg:block">
          <Search
            size={15}
            strokeWidth={1.8}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="search"
            aria-label="Search workspace"
            placeholder="Search workspace..."
            className="h-9 w-[220px] rounded-md border border-slate-200 bg-slate-50/70 pl-9 pr-10 text-xs text-[#292B38] outline-none transition focus:border-[#3E439C] focus:bg-white focus:ring-2 focus:ring-[#3E439C]/10 xl:w-[260px] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-[#8588D5] dark:focus:bg-slate-800"
          />

          <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
            <Command size={10} />
            K
          </span>
        </div>

        {/* Organization selector */}
        <button
          type="button"
          className="hidden h-9 items-center gap-2 rounded-md px-2 text-slate-600 transition-colors hover:bg-[#F1F0FF] hover:text-[#3E439C] xl:flex dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-[#D6D4FF]"
        >
          <Building2 size={17} strokeWidth={1.8} />

          <span className="max-w-[130px] truncate text-xs font-medium">
            Hospital Workspace
          </span>

          <ChevronDown size={14} className="text-slate-400" />
        </button>

        <div className="hidden h-6 w-px bg-slate-200 sm:block dark:bg-slate-700" />

        {/* Theme switch */}
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

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-[#F1F0FF] hover:text-[#3E439C] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-[#D6D4FF]"
        >
          <Bell size={18} strokeWidth={1.8} />
        </button>

        <div className="hidden h-6 w-px bg-slate-200 sm:block dark:bg-slate-700" />

        {/* User profile */}
        <button
          type="button"
          aria-label="User profile"
          className="flex items-center gap-2 rounded-md py-1 pl-1 transition-colors hover:bg-[#FAF9FF] dark:hover:bg-slate-800"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F1F0FF] text-xs font-semibold text-[#3E439C] dark:bg-indigo-950 dark:text-[#D6D4FF]">
            H
          </div>

          <div className="hidden text-left lg:block">
            <p className="text-xs font-semibold text-[#292B38] dark:text-slate-100">
              Hospital Admin
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
              Administrator
            </p>
          </div>

          <ChevronDown
            size={14}
            className="hidden text-slate-400 dark:text-slate-500 lg:block"
          />
        </button>
      </div>
    </header>
  );
}

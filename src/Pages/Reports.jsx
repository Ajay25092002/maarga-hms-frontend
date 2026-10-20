import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  CalendarDays,
  Users,
  IndianRupee,
  ClipboardList,
} from "lucide-react";
import AppSidebar from "../Components/Layout/AppSidebar";
import TopNavbar from "../Components/Layout/TopNavbar";
import ReportFilters from "../Components/Reports/ReportFilters";
import ReportTable from "../Components/Reports/ReportTable";
import { useAuth } from "../Context/AuthContext";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001"
).replace(/\/+$/, "");
const REPORTS = [
  {
    key: "patient-registration",
    label: "Patient Registration",
    description: "Registrations by date and source",
    icon: Users,
  },
  {
    key: "op-billing",
    label: "OP Billing",
    description: "Outpatient bills and balances",
    icon: FileSpreadsheet,
  },
  {
    key: "ip-billing",
    label: "IP Billing",
    description: "Inpatient bills and balances",
    icon: FileSpreadsheet,
  },
  {
    key: "cash-collection",
    label: "Cash Collection",
    description: "Payments collected by staff",
    icon: IndianRupee,
  },
  {
    key: "refunds",
    label: "Refunds",
    description: "Refund transactions and reasons",
    icon: RefreshCw,
  },
  {
    key: "outstanding",
    label: "Outstanding Bills",
    description: "Unpaid and partially paid bills",
    icon: IndianRupee,
  },
  {
    key: "service-wise",
    label: "Service-wise",
    description: "Billed amounts by service",
    icon: ClipboardList,
  },
  {
    key: "service-group-wise",
    label: "Service Group-wise",
    description: "Billed amounts by service group",
    icon: ClipboardList,
  },
  {
    key: "admission-discharge",
    label: "Admission & Discharge",
    description: "IP admissions, discharges and stay",
    icon: CalendarDays,
  },
  {
    key: "source-of-lead",
    label: "Source of Lead",
    description: "Patient acquisition source summary",
    icon: Users,
  },
];
const BASE_FILTERS = {
  date_from: "",
  date_to: "",
  search: "",
  source: "",
  bill_type: "",
  payment_method: "",
  staff: "",
  service: "",
  service_group: "",
  status: "",
};

// Use the hospital's Indian calendar day regardless of the browser timezone.
function getDefaultDateRange() {
  const today = new Date(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date()) + "T12:00:00");
  const toDateString = (value) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  const from = new Date(today);
  from.setDate(from.getDate() - 6);
  return { date_from: toDateString(from), date_to: toDateString(today) };
}

function todayIndia() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

function createDefaultFilters() {
  return { ...BASE_FILTERS, ...getDefaultDateRange() };
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(data.detail || "Unable to load report data.");
  return data;
}
function queryString(filters, extra = {}) {
  const params = new URLSearchParams();
  Object.entries({ ...filters, ...extra }).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined)
      params.set(key, String(value));
  });
  return params.toString();
}
function formatCsvValue(value, columnName = "") {
  if (value === null || value === undefined) return "";

  const isAdmissionOrDischargeDate = /^(admission|discharge) date$/i.test(
    String(columnName).trim(),
  );

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) {
    const dateOnly = value.slice(0, 10);

    // Admission and discharge are collected as dates only, never timestamps.
    if (isAdmissionOrDischargeDate || /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = dateOnly.split("-").map(Number);
      return new Date(Date.UTC(year, month - 1, day, 12)).toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }

    const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
    const date = new Date(hasTimezone ? value : `${value}+05:30`);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }
  }

  return String(value);
}

function downloadCsv(name, items) {
  const rows = items.map(({ report_date, ...rest }) => rest);
  const columns = rows.length ? Object.keys(rows[0]) : [];
  const escape = (value, columnName = "") => {
    const raw = formatCsvValue(value, columnName);
    return `"${raw.replaceAll('"', '""')}"`;
  };
  const content = [
    columns.map((key) => escape(key)).join(","),
    ...rows.map((row) => columns.map((key) => escape(row[key], key)).join(",")),
  ].join("\r\n");
  const blob = new Blob(["\uFEFF", content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-report.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const { user } = useAuth();
  const canDownload = user?.permissions?.["reports.download"] === true;
  const [activeReport, setActiveReport] = useState("patient-registration");
  const [filters, setFilters] = useState(createDefaultFilters);
  const [appliedFilters, setAppliedFilters] = useState(createDefaultFilters);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const loadReport = useCallback(
    async (
      report = activeReport,
      currentPage = page,
      currentFilters = appliedFilters,
    ) => {
      setLoading(true);
      setError("");
      try {
        const query = queryString(currentFilters, {
          page: currentPage,
          page_size: pageSize,
        });
        const data = await readResponse(
          await fetch(`${API_BASE}/api/reports/${report}?${query}`, {
            credentials: "include",
            headers: { Accept: "application/json" },
          }),
        );
        setItems(Array.isArray(data.items) ? data.items : []);
        setTotal(Number(data.total || 0));
      } catch (err) {
        setError(err.message || "Unable to load this report.");
        setItems([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [activeReport, page, appliedFilters, pageSize],
  );

  useEffect(() => {
    loadReport(activeReport, page, appliedFilters);
  }, [activeReport, page, appliedFilters, loadReport]);

  function chooseReport(key) {
    const defaults = createDefaultFilters();
    setActiveReport(key);
    setFilters(defaults);
    setAppliedFilters(defaults);
    setPage(1);
    setError("");
  }
  function applyFilters() {
    if (!filters.date_from || !filters.date_to) {
      setError("Select both a From date and a To date.");
      return;
    }
    if (filters.date_from > filters.date_to) {
      setError("The From date must be on or before the To date.");
      return;
    }
    if (filters.date_from > todayIndia() || filters.date_to > todayIndia()) {
      setError("Future report dates are not allowed.");
      return;
    }
    setError("");
    setPage(1);
    setAppliedFilters({ ...filters });
  }
  function resetFilters() {
    const defaults = createDefaultFilters();
    setFilters(defaults);
    setAppliedFilters(defaults);
    setPage(1);
    setError("");
  }

  const hasValidExportDateRange = Boolean(
    appliedFilters.date_from &&
    appliedFilters.date_to &&
    appliedFilters.date_from <= appliedFilters.date_to &&
    appliedFilters.date_to <= todayIndia(),
  );

  async function exportReport() {
    if (!appliedFilters.date_from || !appliedFilters.date_to) {
      setError(
        "Select both a From date and a To date, then apply the filters before downloading.",
      );
      return;
    }
    if (appliedFilters.date_from > todayIndia() || appliedFilters.date_to > todayIndia()) {
      setError("Future report dates are not allowed.");
      return;
    }
    if (appliedFilters.date_from > appliedFilters.date_to) {
      setError(
        "The From date must be on or before the To date. Apply the corrected date range before downloading.",
      );
      return;
    }
    setDownloading(true);
    setError("");
    try {
      const query = queryString(appliedFilters, {
        export_all: "true",
        page: 1,
        page_size: 200,
      });
      const data = await readResponse(
        await fetch(`${API_BASE}/api/reports/${activeReport}?${query}`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        }),
      );
      downloadCsv(
        REPORTS.find((report) => report.key === activeReport)?.label ||
          activeReport,
        data.items || [],
      );
    } catch (err) {
      setError(err.message || "Unable to download this report.");
    } finally {
      setDownloading(false);
    }
  }

  const selected = useMemo(
    () => REPORTS.find((report) => report.key === activeReport) || REPORTS[0],
    [activeReport],
  );
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="min-h-screen bg-[#F6F6FC] dark:bg-slate-950">
      <AppSidebar />
      <div className="min-h-screen lg:ml-[260px]">
        <TopNavbar
          title="Reports"
          breadcrumb={["Hospital Management", "Billing Operations", "Reports"]}
        />
        <main className="space-y-5 p-4 sm:p-6">
          <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                Reports
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                View, filter and download hospital billing and operations
                reports.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              {canDownload && (
                <button
                  onClick={exportReport}
                  disabled={downloading || loading || !hasValidExportDateRange}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#3E439C] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#30357d] disabled:opacity-60"
                >
                  <Download size={16} />
                  {downloading
                    ? "Preparing full report…"
                    : "Download full report"}
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <Printer size={16} />
                Print
              </button>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {REPORTS.map(({ key, label, description, icon: Icon }) => (
              <button
                key={key}
                onClick={() => chooseReport(key)}
                className={`rounded-xl border p-3 text-left transition-colors ${activeReport === key ? "border-[#3E439C] bg-[#F1F0FF] ring-1 ring-[#3E439C]/20 dark:bg-indigo-950/40" : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900"}`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${activeReport === key ? "bg-white text-[#3E439C] dark:bg-slate-800" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
                  >
                    <Icon size={17} />
                  </span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {label}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {description}
                </p>
              </button>
            ))}
          </section>

          <section className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {selected.label}
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {selected.description}. Downloads include every record matching
                the applied filters, not just the current page.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              Showing {start}–{end} of {total.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
            </div>
          </section>
          <ReportFilters
            reportType={activeReport}
            filters={filters}
            onChange={setFilters}
            onApply={applyFilters}
            onReset={resetFilters}
            loading={loading}
          />
          {!hasValidExportDateRange && (
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
              To download, select both dates in a valid range and click Apply
              filters. The default range is the last 7 calendar days.
            </p>
          )}
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
            >
              {error}
            </div>
          )}
          <ReportTable
            items={items}
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            loading={loading}
          />
          <p className="text-xs text-slate-400">
            Internal database IDs are not displayed. Bill numbers, OP/IP
            numbers, patient numbers, and receipt/refund numbers are shown where
            relevant.
          </p>
        </main>
      </div>
      <style>{`@media print { body { background: white !important; } aside, nav, button, input, select, form { display: none !important; } main { padding: 0 !important; } .lg\\:ml-\\[260px\\] { margin-left: 0 !important; } }`}</style>
    </div>
  );
}

import {
  Search,
  CalendarDays,
  Filter,
  RotateCcw,
  ReceiptText,
  Wallet,
  CircleDollarSign,
  Plus,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Download,
} from "lucide-react";

import { useTheme } from "../../Context/ThemeContext";
import IPBillsTable from "./IPBillsTable";

const PAGE_SIZE = 10;

const MAX_EXPORT_RANGE_DAYS = 90;

// Parse date-only values as UTC to avoid daylight-saving/time-zone drift.
const dayNumber = (value) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
};

const shiftDate = (value, days) => {
  const number = dayNumber(value);
  if (number === null) return undefined;
  return new Date((number + days) * 86400000).toISOString().slice(0, 10);
};

const getInclusiveRangeDays = (from, to) => {
  const start = dayNumber(from);
  const end = dayNumber(to);
  if (start === null || end === null || end < start) return null;
  return end - start + 1;
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

function SummaryItem({ icon: Icon, label, value, dark }) {
  return (
    <div
      className={`flex min-w-0 items-start gap-3 border-b pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4 last:border-0 ${
        dark ? "border-slate-700" : "border-slate-200"
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          dark ? "bg-[#303253] text-[#D6D4FF]" : "bg-[#F1F0FF] text-[#3E439C]"
        }`}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
          {label}
        </p>
        <p
          className={`mt-1 truncate text-base font-semibold ${
            dark ? "text-slate-100" : "text-slate-800"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export default function IPBillsList({
  bills = [],
  pagination = {},
  summary = {},
  query = {},
  billCreators = [],
  loading = false,
  error = "",
  onQueryChange,
  onPageChange,
  onResetFilters,
  onExport,
  downloading = false,
  onRetry,
  onCreateBill,
  onViewBill,
}) {
  const { theme } = useTheme();
  const dark = theme === "dark";

  const currentPage = Number(pagination.page ?? query.page ?? 1);
  const pageSize = Number(pagination.page_size ?? PAGE_SIZE);
  const totalBills = Number(pagination.total ?? 0);
  const totalPages = Number(pagination.total_pages ?? 0);

  const firstRecord = totalBills === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastRecord = Math.min(currentPage * pageSize, totalBills);

  const border = dark ? "border-slate-700" : "border-slate-200";
  const text = dark ? "text-slate-100" : "text-slate-800";
  const muted = dark ? "text-slate-400" : "text-slate-500";

  const inputClass = `h-10 w-full min-w-0 rounded-md border px-3 text-sm outline-none focus:border-[#3E439C] focus:ring-2 focus:ring-[#3E439C]/10 ${
    dark
      ? "border-slate-700 bg-[#171827] text-slate-100 placeholder:text-slate-500"
      : "border-slate-200 bg-white text-slate-800 placeholder:text-slate-400"
  }`;

  const selectClass = `h-10 min-w-0 rounded-md border px-3 text-sm outline-none focus:border-[#3E439C] ${
    dark
      ? "border-slate-700 bg-[#171827] text-slate-100"
      : "border-slate-200 bg-white text-slate-800"
  }`;

  const dateFilter = query.date_filter ?? "all";
  const customRangeDays = getInclusiveRangeDays(query.date_from, query.date_to);
  const customRangeComplete = Boolean(query.date_from && query.date_to);
  const customRangeValid =
    customRangeComplete &&
    customRangeDays !== null &&
    customRangeDays <= MAX_EXPORT_RANGE_DAYS;
  const canDownload =
    dateFilter !== "all" &&
    (dateFilter !== "custom" || customRangeValid);

  const hasFilters =
    Boolean(query.search?.trim()) ||
    (query.status ?? "all") !== "all" ||
    (query.date_filter ?? "all") !== "all" ||
    Boolean(query.date_from) ||
    Boolean(query.date_to) ||
    (query.billed_by ?? "all") !== "all";

  return (
    <div className="min-w-0 space-y-5">
      <section
        className={`grid grid-cols-1 gap-4 rounded-lg border p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4 ${
          border
        } ${dark ? "bg-[#171827]" : "bg-white"}`}
      >
        <SummaryItem
          icon={ReceiptText}
          label="IP Bills Found"
          value={totalBills.toLocaleString("en-IN")}
          dark={dark}
        />
        <SummaryItem
          icon={CircleDollarSign}
          label="Total Billed"
          value={formatCurrency(summary.billed)}
          dark={dark}
        />
        <SummaryItem
          icon={Wallet}
          label="Amount Received"
          value={formatCurrency(summary.received)}
          dark={dark}
        />
        <SummaryItem
          icon={CircleDollarSign}
          label="Outstanding"
          value={formatCurrency(summary.outstanding)}
          dark={dark}
        />
      </section>

      <section className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="relative min-w-0">
            <Search
              size={16}
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`}
            />
            <input
              type="search"
              value={query.search ?? ""}
              onChange={(event) =>
                onQueryChange?.({ search: event.target.value })
              }
              placeholder="Search bill, patient, UHID or registration..."
              className={`${inputClass} pl-9`}
              aria-label="Search inpatient bills"
            />
          </div>

          <div className="relative min-w-0">
            <Filter
              size={15}
              className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${muted}`}
            />
            <select
              value={query.status ?? "all"}
              onChange={(event) =>
                onQueryChange?.({ status: event.target.value })
              }
              className={`${selectClass} w-full pl-9`}
              aria-label="Filter by payment status"
            >
              <option value="all">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="relative min-w-0">
            <CalendarDays
              size={15}
              className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${muted}`}
            />
            <select
              value={query.date_filter ?? "all"}
              onChange={(event) =>
                onQueryChange?.({ date_filter: event.target.value })
              }
              className={`${selectClass} w-full pl-9`}
              aria-label="Filter by bill creation date"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="this_month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <div className="relative min-w-0">
            <Filter
              size={15}
              className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${muted}`}
            />
            <select
              value={query.billed_by ?? "all"}
              onChange={(event) =>
                onQueryChange?.({ billed_by: event.target.value })
              }
              className={`${selectClass} w-full pl-9`}
              aria-label="Filter by billed by username"
            >
              <option value="all">All Billed By</option>
              {billCreators.map((creator) => (
                <option key={creator.id} value={String(creator.id)}>
                  {creator.full_name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onResetFilters}
            disabled={!hasFilters || loading}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${border} ${text} ${
              dark ? "hover:bg-slate-800" : "hover:bg-slate-50"
            }`}
          >
            <RotateCcw size={14} />
            Reset
          </button>

          {query.date_filter === "custom" && (
            <div className="grid grid-cols-1 gap-3 rounded-lg border border-[#E5E4F2] bg-[#FAFAFE] p-3 sm:col-span-2 sm:grid-cols-2 xl:col-span-5 xl:max-w-[560px] dark:border-slate-700 dark:bg-[#1B1C2D]">
              <div className="min-w-0">
                <label className={`mb-1 block text-xs font-medium ${muted}`}>From Date</label>
                <input
                  type="date"
                  value={query.date_from ?? ""}
                  max={query.date_to || undefined}
                  min={query.date_to ? shiftDate(query.date_to, -(MAX_EXPORT_RANGE_DAYS - 1)) : undefined}
                  onChange={(event) => onQueryChange?.({ date_from: event.target.value })}
                  className={inputClass}
                  aria-label="From date"
                />
              </div>
              <div className="min-w-0">
                <label className={`mb-1 block text-xs font-medium ${muted}`}>To Date</label>
                <input
                  type="date"
                  value={query.date_to ?? ""}
                  min={query.date_from || undefined}
                  max={query.date_from ? shiftDate(query.date_from, MAX_EXPORT_RANGE_DAYS - 1) : undefined}
                  onChange={(event) => onQueryChange?.({ date_to: event.target.value })}
                  className={inputClass}
                  aria-label="To date"
                />
              </div>
              <p className={`text-xs sm:col-span-2 ${muted}`}>
                Choose a date range of up to 90 days. Both dates are required to filter and download.
                {customRangeComplete && !customRangeValid && (
                  <span className="mt-1 block font-medium text-red-600 dark:text-red-400">
                    The selected range exceeds 90 days or the end date is before the start date.
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-xs ${muted}`}>
              {loading
                ? "Loading inpatient bills..."
                : `Showing ${firstRecord}–${lastRecord} of ${totalBills} bills`}
            </p>
            {dateFilter === "all" && (
              <p className={`mt-1 text-xs ${muted}`}>
                Select a date range to enable CSV download.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canDownload && (
              <button
                type="button"
                onClick={onExport}
                disabled={loading || downloading || !canDownload}
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${border} ${text} ${
                  dark ? "hover:bg-slate-800" : "hover:bg-[#F1F0FF]"
                }`}
              >
                <Download size={15} />
                {downloading ? "Preparing..." : "Download CSV"}
              </button>
            )}
            <button
              type="button"
              onClick={onCreateBill}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#3E439C] px-4 text-sm font-semibold text-white transition hover:bg-[#323780]"
            >
              <Plus size={16} />
              Create IP Bill
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={17} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={onRetry}
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      <IPBillsTable
        bills={bills}
        loading={loading}
        dark={dark}
        emptyMessage={
          error
            ? "Unable to load inpatient bills."
            : hasFilters
              ? "No inpatient bills match your filters."
              : "No inpatient bills yet."
        }
        onViewBill={onViewBill}
      />

      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-t py-4 ${border}`}
      >
        <p className={`text-xs ${muted}`}>
          Page {currentPage} of {Math.max(totalPages, 1)}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage <= 1 || loading}
            className={`inline-flex h-9 items-center gap-1 rounded-md border px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${border} ${text}`}
          >
            <ChevronLeft size={15} />
            Previous
          </button>
          <button
            type="button"
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={loading || totalPages === 0 || currentPage >= totalPages}
            className={`inline-flex h-9 items-center gap-1 rounded-md border px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${border} ${text}`}
          >
            Next
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";

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
} from "lucide-react";

import { useTheme } from "../../Context/ThemeContext";
import OPBillsTable from "./OPBillsTable";

const PAGE_SIZE = 10;

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "");

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
          dark
            ? "bg-[#303253] text-[#D6D4FF]"
            : "bg-[#F1F0FF] text-[#3E439C]"
        }`}
      >
        <Icon size={18} />
      </div>

      <div className="min-w-0">
        <p
          className={`text-xs ${
            dark ? "text-slate-400" : "text-slate-500"
          }`}
        >
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

export default function OPBillsList({
  onCreateBill,
  onViewBill,
  onPrintBill,
}) {
  const { theme } = useTheme();
  const dark = theme === "dark";

  // Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [billedBy, setBilledBy] = useState("all");
  const [billCreators, setBillCreators] = useState([]);
  const [page, setPage] = useState(1);

  // API state
  const [bills, setBills] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: PAGE_SIZE,
    total: 0,
    total_pages: 0,
  });

  const [summary, setSummary] = useState({
    billed: 0,
    received: 0,
    outstanding: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

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

  // ==========================================================
  // Fetch bills from FastAPI
  // ==========================================================

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/api/bills/creators`, {
      credentials: "include",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load bill creators.");
        return response.json();
      })
      .then((data) => setBillCreators(Array.isArray(data) ? data : []))
      .catch((error) => {
        if (error.name !== "AbortError") console.error(error);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    // Debounce search input to avoid sending a request for
    // every keystroke.
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();

        // Restrict this page to outpatient bills. The backend applies this
        // filter before calculating totals, summary KPIs, and pagination.
        params.set("bill_type", "OP");
        params.set("page", String(page));
        params.set("page_size", String(PAGE_SIZE));

        if (search.trim()) {
          params.set("search", search.trim());
        }

        if (statusFilter !== "all") {
          params.set("status", statusFilter);
        }

        if (dateFilter !== "all") {
          params.set("date_filter", dateFilter);
        }
        if (billedBy !== "all") {
          params.set("billed_by", billedBy);
        }

        const url = `${API_BASE_URL}/api/bills?${params.toString()}`;

        const response = await fetch(url, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          let message = `Unable to load bills (HTTP ${response.status}).`;

          try {
            const errorData = await response.json();

            if (typeof errorData.detail === "string") {
              message = errorData.detail;
            }
          } catch {
            // Keep the default error message.
          }

          throw new Error(message);
        }

        const result = await response.json();

        if (!Array.isArray(result.items)) {
          throw new Error(
            "Invalid billing API response: items must be an array."
          );
        }

        const apiPagination = result.pagination ?? {};
        const apiSummary = result.summary ?? {};

        // Keep a status alias for table components that read bill.status.
        const normalizedBills = result.items.map((bill) => ({
          ...bill,
          status: bill.payment_status ?? bill.status ?? "Unpaid",
        }));

        setBills(normalizedBills);

        setPagination({
          page: Number(apiPagination.page ?? page),
          page_size: Number(
            apiPagination.page_size ?? PAGE_SIZE
          ),
          total: Number(apiPagination.total ?? 0),
          total_pages: Number(apiPagination.total_pages ?? 0),
        });

        setSummary({
          billed: Number(apiSummary.billed ?? 0),
          received: Number(apiSummary.received ?? 0),
          outstanding: Number(apiSummary.outstanding ?? 0),
        });
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }

        console.error("Error fetching OP bills:", err);

        setBills([]);
        setPagination({
          page,
          page_size: PAGE_SIZE,
          total: 0,
          total_pages: 0,
        });
        setSummary({
          billed: 0,
          received: 0,
          outstanding: 0,
        });
        setError(
          err.message ||
            "Unable to connect to the billing server."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [page, search, statusFilter, dateFilter, billedBy, refreshKey]);

  // ==========================================================
  // Filter handlers
  // ==========================================================

  const handleSearch = useCallback((value) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleStatus = useCallback((value) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  const handleDate = useCallback((value) => {
    setDateFilter(value);
    setPage(1);
  }, []);

  const handleBilledBy = useCallback((value) => {
    setBilledBy(value);
    setPage(1);
  }, []);

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setDateFilter("all");
    setBilledBy("all");
    setPage(1);
  };

  const handleRetry = () => {
    setRefreshKey((current) => current + 1);
  };

  const hasFilters =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    dateFilter !== "all" ||
    billedBy !== "all";

  // The API handles pagination. Do not slice bills again here.
  const currentPage = pagination.page || page;
  const totalPages = Math.max(1, pagination.total_pages || 0);
  const totalBills = pagination.total || 0;

  const firstRecord =
    totalBills === 0
      ? 0
      : (currentPage - 1) * PAGE_SIZE + 1;

  const lastRecord = Math.min(
    currentPage * PAGE_SIZE,
    totalBills
  );

  return (
    <div className="min-w-0 space-y-5">
      {/* Summary metrics */}
      <section
        className={`grid grid-cols-1 gap-4 rounded-lg border p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4 ${
          border
        } ${dark ? "bg-[#171827]" : "bg-white"}`}
      >
        <SummaryItem
          icon={ReceiptText}
          label="Bills Found"
          value={totalBills}
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

      {/* Search and filters */}
      <section className="space-y-3">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_180px_200px_auto]">
          {/* Search */}
          <div className="relative min-w-0">
            <Search
              size={16}
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`}
            />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                handleSearch(event.target.value)
              }
              placeholder="Search bill number, patient or UHID..."
              className={`${inputClass} pl-9`}
              aria-label="Search outpatient bills"
            />
          </div>

          {/* Payment status */}
          <div className="relative min-w-0">
            <Filter
              size={15}
              className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${muted}`}
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                handleStatus(event.target.value)
              }
              className={`${selectClass} w-full pl-9`}
              aria-label="Filter by payment status"
            >
              <option value="all">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">
                Partially Paid
              </option>
              <option value="Unpaid">Unpaid</option>
            </select>
          </div>

          {/* Date filter */}
          <div className="relative min-w-0">
            <CalendarDays
              size={15}
              className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${muted}`}
            />

            <select
              value={dateFilter}
              onChange={(event) =>
                handleDate(event.target.value)
              }
              className={`${selectClass} w-full pl-9`}
              aria-label="Filter by bill date"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
            </select>
          </div>

          {/* Billed by filter */}
          <div className="relative min-w-0">
            <Filter
              size={15}
              className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${muted}`}
            />
            <select
              value={billedBy}
              onChange={(event) => handleBilledBy(event.target.value)}
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

          {/* Reset */}
          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasFilters}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${border} ${text} ${
              dark ? "hover:bg-slate-800" : "hover:bg-slate-50"
            }`}
          >
            <RotateCcw size={14} />
            Reset
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">


          <button
            type="button"
            onClick={onCreateBill}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#3E439C] px-4 text-sm font-semibold text-white transition hover:bg-[#323780]"
          >
            <Plus size={16} />
            Create Bill
          </button>
        </div>
      </section>

      {/* Error state */}
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
            onClick={handleRetry}
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Bills table */}
      <OPBillsTable
        bills={bills}
        loading={loading}
        dark={dark}
        emptyMessage={
          error
            ? "Unable to load bills."
            : hasFilters
              ? "No bills match your filters."
              : "No outpatient bills yet."
        }
        onViewBill={onViewBill}
        onPrintBill={onPrintBill}
      />

      {/* Server-side pagination */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 border-t pt-4 ${border}`}
      >
        <p className={`text-xs ${muted}`}>
          Page {currentPage} of {totalPages}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setPage((current) => Math.max(1, current - 1))
            }
            disabled={currentPage <= 1 || loading}
            className={`inline-flex h-9 items-center gap-1 rounded-md border px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${border} ${text}`}
          >
            <ChevronLeft size={15} />
            Previous
          </button>

          <button
            type="button"
            onClick={() =>
              setPage((current) =>
                Math.min(totalPages, current + 1)
              )
            }
            disabled={currentPage >= totalPages || loading}
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
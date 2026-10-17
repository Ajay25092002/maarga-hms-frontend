import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  RotateCcw,
  IndianRupee,
  ReceiptText,
  Wallet,
  Users,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Filter,
  RefreshCw,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import AppSidebar from "../Components/Layout/AppSidebar";
import TopNavbar from "../Components/Layout/TopNavbar";
import { useTheme } from "../Context/ThemeContext";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const API = `${API_BASE_URL}/api/payment-refunds`;
const PAGE_SIZE = 10;

const METHODS = ["Cash", "Card", "UPI", "Bank Transfer", "Cheque", "Other"];

const EMPTY_FILTERS = {
  search: "",
  refund_method: "",
  date_from: "",
  date_to: "",
};

const inputClass =
  "h-[42px] w-full rounded-md border border-[#DFE4F2] bg-white px-3.5 text-[13px] text-[#101828] outline-none placeholder:text-[#8A9AB8] focus:border-[#3E439C] focus:ring-1 focus:ring-[#3E439C]/15 dark:border-[#34364F] dark:bg-[#1B1C2B] dark:text-slate-100 dark:placeholder:text-slate-500";

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function dateText(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getErrorMessage(data, fallback) {
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.message === "string") return data.message;

  if (Array.isArray(data?.detail)) {
    return data.detail
      .map((item) => item.msg)
      .filter(Boolean)
      .join(", ");
  }

  return fallback;
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const responseText = await response.text();
  let data = {};

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { message: responseText };
    }
  }

  if (!response.ok) {
    throw new Error(
      getErrorMessage(data, `Request failed (${response.status})`),
    );
  }

  return data;
}

function SummaryCard({ icon: Icon, label, value, last = false }) {
  return (
    <div
      className={`flex min-w-0 items-center gap-3 px-4 py-3 sm:px-5 ${
        last ? "" : "border-r border-[#DFE4F2] dark:border-[#34364F]"
      }`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F1F0FF] text-[#3E439C] dark:bg-[#292B49] dark:text-[#D6D4FF]">
        <Icon size={19} strokeWidth={1.8} />
      </div>

      <div className="min-w-0">
        <p className="text-[13px] leading-5 text-[#657BA2] dark:text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 truncate text-base font-semibold leading-5 text-[#101828] dark:text-slate-100">
          {value}
        </p>
      </div>
    </div>
  );
}

export default function PaymentRefunds() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const dark = theme === "dark";

  const text = dark ? "text-slate-100" : "text-slate-800";
  const muted = dark ? "text-slate-400" : "text-slate-500";

  const [refunds, setRefunds] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);


  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("page_size", String(PAGE_SIZE));

    if (filters.search.trim()) params.set("search", filters.search.trim());
    if (filters.refund_method) {
      params.set("refund_method", filters.refund_method);
    }
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);

    return params.toString();
  }, [filters, page]);

  const fetchRefunds = useCallback(async () => {
    const data = await apiRequest(`${API}?${queryString}`);
    const rows = Array.isArray(data)
      ? data
      : (data.items ?? data.results ?? data.refunds ?? []);

    setRefunds(rows);
    setTotalCount(
      Number(
        data.total ??
          data.total_count ??
          data.count ??
          data.pagination?.total_records ?? data.pagination?.total ??
          rows.length,
      ),
    );
  }, [queryString]);

  const fetchSummary = useCallback(async () => {
    const params = new URLSearchParams();

    if (filters.search.trim()) params.set("search", filters.search.trim());
    if (filters.refund_method) {
      params.set("refund_method", filters.refund_method);
    }
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);

    const query = params.toString();
    const data = await apiRequest(`${API}/summary${query ? `?${query}` : ""}`);

    setSummary(data?.summary ?? data);
  }, [filters]);

  const loadData = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      else setRefreshing(true);

      setError("");

      try {
        await Promise.all([fetchRefunds(), fetchSummary()]);
      } catch (err) {
        setError(err.message || "Unable to load payment refunds.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchRefunds, fetchSummary],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setFilters((current) => ({
        ...current,
        search: searchInput,
      }));
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const updateFilter = (key, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const resetFilters = () => {
    setSearchInput("");
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    searchInput.trim() ||
    filters.refund_method ||
    filters.date_from ||
    filters.date_to,
  );

  const openDetails = (refund) => {
    const id = refund.id ?? refund.refund_id;

    if (id == null) {
      setNotice({
        type: "error",
        message: "This refund record does not contain a valid refund ID.",
      });
      return;
    }

    navigate(`/payment-refunds/${encodeURIComponent(id)}`);
  };

  const totalRefunds = Number(
    summary.refund_count ??
      summary.total_refunds ??
      summary.count ??
      totalCount,
  );

  const totalRefunded = Number(
    summary.total_refunded_amount ??
      summary.total_refunded ??
      summary.refunded_amount ??
      0,
  );

  const averageRefund = Number(
    summary.average_refund_amount ??
      summary.average_refund ??
      (totalRefunds > 0 ? totalRefunded / totalRefunds : 0),
  );

  const paymentsWithRefunds = Number(
    summary.bills_with_refunds ?? summary.payments_with_refunds ?? summary.unique_payments ?? 0,
  );

  return (
    <div className="min-h-screen min-w-0 bg-[#F6F6FC] dark:bg-[#11121F]">
      <AppSidebar />

      <div className="min-h-screen min-w-0 md:ml-[72px] lg:ml-[260px]">
        <TopNavbar
          title="Payment Refunds"
          breadcrumb={["Hospital Management", "Billing", "Payment Refunds"]}
        />

        <main className="min-w-0 px-4 py-5 sm:px-5 lg:px-6">
          <div className="mx-auto w-full ">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F1F0FF] dark:bg-[#292B49]">
                <ReceiptText
                  size={20}
                  className="text-[#3E439C] dark:text-[#D6D4FF]"
                />
              </div>

              <div>
                <h1 className={`text-lg font-semibold ${text}`}>
                  Payment Refunds
                </h1>
                <p className={`mt-1 text-[13px] ${muted}`}>
                  Search, filter, and manage payment refund records
                </p>
              </div>
            </div>

            <section className="mb-5 overflow-hidden rounded-lg border border-[#DFE4F2] bg-white dark:border-[#34364F] dark:bg-[#1B1C2B]">
              <div className="grid grid-cols-1 divide-y divide-[#DFE4F2] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
                <SummaryCard
                  icon={ReceiptText}
                  label="Total Refunds"
                  value={totalRefunds.toLocaleString("en-IN")}
                />
                <SummaryCard
                  icon={IndianRupee}
                  label="Total Refunded"
                  value={money(totalRefunded)}
                />
                <SummaryCard
                  icon={Wallet}
                  label="Average Refund"
                  value={money(averageRefund)}
                />
                <SummaryCard
                  icon={Users}
                  label="Bills Refunded"
                  value={paymentsWithRefunds.toLocaleString("en-IN")}
                  last
                />
              </div>
            </section>

            <section className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_180px_270px_auto]">
              <div className="relative min-w-0">
                <Search
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#657BA2]"
                />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search refund number, bill number, patient or reason..."
                  className={`${inputClass} pl-10`}
                />
              </div>

              <div className="relative min-w-0">
                <Filter
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#657BA2]"
                />
                <select
                  value={filters.refund_method}
                  onChange={(event) =>
                    updateFilter("refund_method", event.target.value)
                  }
                  className={`${inputClass} appearance-none pl-10 pr-8`}
                >
                  <option value="">All Methods</option>
                  {METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex h-[42px] min-w-0 items-center gap-1.5 rounded-md border border-[#DFE4F2] bg-white px-2.5 dark:border-[#34364F] dark:bg-[#1B1C2B]">
                <CalendarDays size={16} className="shrink-0 text-[#657BA2]" />
                <input
                  type="date"
                  aria-label="Start date"
                  value={filters.date_from}
                  max={filters.date_to || undefined}
                  onChange={(event) =>
                    updateFilter("date_from", event.target.value)
                  }
                  className="min-w-0 w-full bg-transparent text-[11px] text-[#344054] outline-none dark:text-slate-200"
                />
                <span className="text-[11px] text-[#98A2B3]">to</span>
                <input
                  type="date"
                  aria-label="End date"
                  value={filters.date_to}
                  min={filters.date_from || undefined}
                  onChange={(event) =>
                    updateFilter("date_to", event.target.value)
                  }
                  className="min-w-0 w-full bg-transparent text-[11px] text-[#344054] outline-none dark:text-slate-200"
                />
              </div>

              <button
                type="button"
                onClick={resetFilters}
                disabled={!hasActiveFilters}
                className="inline-flex h-[42px] items-center justify-center gap-2 rounded-md border border-[#DFE4F2] bg-white px-3.5 text-[13px] font-medium text-[#475467] transition hover:bg-[#F1F0FF] hover:text-[#3E439C] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#34364F] dark:bg-[#1B1C2B] dark:text-slate-300 dark:hover:bg-[#292B49]"
              >
                <RotateCcw size={15} />
                Reset
              </button>
            </section>

            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <p className={`text-[13px] ${muted}`}>
                {loading
                  ? "Loading refund records..."
                  : `Showing ${
                      totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
                    }–${Math.min(page * PAGE_SIZE, totalCount)} of ${totalCount} refunds`}
              </p>

              {/* Navigate to the separate refund-entry page */}
              <button
                type="button"
                onClick={() => navigate("/payment-refunds/new")}
                className="inline-flex h-[42px] items-center justify-center gap-2 rounded-md bg-[#3E439C] px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#323781] focus:outline-none focus:ring-2 focus:ring-[#3E439C]/30"
              >
                <ReceiptText size={16} />
                Record Refund
              </button>
            </div>

            {notice && (
              <div
                className={`mb-4 flex items-start gap-2 rounded-md border p-3 text-[13px] ${
                  notice.type === "error"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                {notice.type === "error" ? (
                  <AlertCircle size={17} className="mt-0.5 shrink-0" />
                ) : (
                  <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
                )}
                <span>{notice.message}</span>
                <button
                  type="button"
                  onClick={() => setNotice(null)}
                  className="ml-auto"
                  aria-label="Dismiss notification"
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {error && !loading && (
              <div className="mb-4 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">Unable to load refund records</p>
                  <p className="mt-1 break-words">{error}</p>
                </div>
                <button
                  type="button"
                  onClick={() => loadData(true)}
                  className="shrink-0 font-medium underline"
                >
                  Retry
                </button>
              </div>
            )}

            <section className="overflow-hidden rounded-lg border border-[#DFE4F2] bg-white dark:border-[#34364F] dark:bg-[#1B1C2B]">
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[1000px] border-collapse text-left">
                  <thead className="bg-[#F7F8FB] dark:bg-[#202135]">
                    <tr className="border-b border-[#DFE4F2] dark:border-[#34364F]">
                      {[
                        "Refund Number",
                        "Refund Date",
                        "Bill",
                        "Refund Amount",
                        "Method",
                        "Reason",
                        "Recorded By",
                      ].map((heading, index) => (
                        <th
                          key={heading}
                          className={`px-3.5 py-3.5 text-[13px] font-medium text-[#344054] dark:text-slate-300 ${
                            index === 0 ? "pl-4" : ""
                          }`}
                        >
                          {heading}
                        </th>
                      ))}
                      <th className="px-4 py-3.5 text-right text-[13px] font-medium text-[#344054] dark:text-slate-300">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#E6EAF2] dark:divide-[#34364F]">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center">
                          <LoaderCircle
                            size={22}
                            className="mx-auto animate-spin text-[#3E439C]"
                          />
                          <p className={`mt-2 text-[13px] ${muted}`}>
                            Loading refund records...
                          </p>
                        </td>
                      </tr>
                    ) : refunds.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center">
                          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-[#F1F0FF] text-[#3E439C] dark:bg-[#292B49] dark:text-[#D6D4FF]">
                            <ReceiptText size={21} />
                          </div>
                          <p
                            className={`mt-2.5 text-[13px] font-medium ${text}`}
                          >
                            No refunds found
                          </p>
                          <p className={`mt-1 text-[13px] ${muted}`}>
                            {hasActiveFilters
                              ? "Try changing your search or filters."
                              : "Recorded payment refunds will appear here."}
                          </p>
                          {hasActiveFilters && (
                            <button
                              type="button"
                              onClick={resetFilters}
                              className="mt-2 text-[13px] font-medium text-[#3E439C] hover:underline dark:text-[#D6D4FF]"
                            >
                              Clear filters
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      refunds.map((refund) => {
                        const id = refund.id ?? refund.refund_id;
                        const number =
                          refund.refund_number || `REF-${id ?? "—"}`;

                        return (
                          <tr
                            key={id ?? number}
                            className="transition-colors hover:bg-[#FAFAFE] dark:hover:bg-[#202135]"
                          >
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2.5">
                                <FileText
                                  size={17}
                                  className="shrink-0 text-[#3E439C] dark:text-[#D6D4FF]"
                                />
                                <span className="whitespace-nowrap text-[13px] font-medium text-[#3E439C] dark:text-[#D6D4FF]">
                                  {number}
                                </span>
                              </div>
                            </td>

                            <td className="whitespace-nowrap px-3.5 py-4 text-[13px] text-[#657BA2] dark:text-slate-400">
                              {dateText(
                                refund.created_at ??
                                  refund.refund_date ??
                                  refund.created_on,
                              )}
                            </td>

                            <td className="px-3.5 py-4">
                              <p className="whitespace-nowrap text-[13px] font-medium text-[#344054] dark:text-slate-200">
                                {refund.bill_number || `Bill #${refund.bill_id ?? "—"}`}
                              </p>
                              <p className="mt-0.5 text-[11px] text-[#8A9AB8]">
                                {refund.bill_type || "Bill"} · {refund.patient_name || "Patient"}
                              </p>
                            </td>

                            <td className="whitespace-nowrap px-3.5 py-4 text-[13px] font-semibold text-[#101828] dark:text-slate-100">
                              {money(refund.refund_amount)}
                            </td>

                            <td className="whitespace-nowrap px-3.5 py-4 text-[13px] text-[#344054] dark:text-slate-200">
                              {refund.refund_method || "—"}
                            </td>

                            <td className="max-w-[200px] px-3.5 py-4">
                              <p
                                title={refund.reason || ""}
                                className="truncate text-[13px] text-[#344054] dark:text-slate-200"
                              >
                                {refund.reason || "—"}
                              </p>
                            </td>

                            <td className="whitespace-nowrap px-3.5 py-4 text-[13px] text-[#344054] dark:text-slate-200">
                              {refund.created_by_name ||
                                refund.recorded_by ||
                                "—"}
                            </td>

                            <td className="px-4 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => openDetails(refund)}
                                className="inline-flex h-9 min-w-[72px] items-center justify-center gap-1.5 rounded-md border border-[#DDE3EF] bg-white px-3 text-[13px] font-medium text-[#344054] transition hover:border-[#C9C8F2] hover:bg-[#F1F0FF] hover:text-[#3E439C] disabled:opacity-50 dark:border-[#34364F] dark:bg-[#1B1C2B] dark:text-slate-200 dark:hover:bg-[#292B49]"
                              >
                                <Eye size={14} />
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#DFE4F2] px-4 py-4 dark:border-[#34364F]">
                <p className={`text-[13px] ${muted}`}>
                  Page {page} of {totalPages}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                    disabled={page <= 1 || loading}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-[#DDE3EF] bg-white px-3.5 text-[13px] font-medium text-[#475467] transition hover:bg-[#F1F0FF] hover:text-[#3E439C] disabled:cursor-not-allowed disabled:opacity-45 dark:border-[#34364F] dark:bg-[#1B1C2B] dark:text-slate-300 dark:hover:bg-[#292B49]"
                  >
                    <ChevronLeft size={15} />
                    Previous
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) => Math.min(totalPages, current + 1))
                    }
                    disabled={page >= totalPages || loading}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-[#DDE3EF] bg-white px-3.5 text-[13px] font-medium text-[#475467] transition hover:bg-[#F1F0FF] hover:text-[#3E439C] disabled:cursor-not-allowed disabled:opacity-45 dark:border-[#34364F] dark:bg-[#1B1C2B] dark:text-slate-300 dark:hover:bg-[#292B49]"
                  >
                    Next
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </section>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => loadData(false)}
                disabled={refreshing || loading}
                className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium text-[#657BA2] transition hover:bg-[#F1F0FF] hover:text-[#3E439C] disabled:opacity-50 dark:hover:bg-[#292B49]"
              >
                <RefreshCw
                  size={13}
                  className={refreshing ? "animate-spin" : ""}
                />
                Refresh data
              </button>
            </div>
          </div>
        </main>
      </div>

    </div>
  );
}

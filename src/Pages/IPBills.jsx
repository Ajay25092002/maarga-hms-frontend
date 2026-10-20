import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ReceiptText } from "lucide-react";

import AppSidebar from "../Components/Layout/AppSidebar";
import TopNavbar from "../Components/Layout/TopNavbar";
import IPBillsList from "../Components/IPBilling/IPBillsList";
import { useTheme } from "../Context/ThemeContext";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8001"
).replace(/\/$/, "");

const PAGE_SIZE = 10;

const EMPTY_PAGINATION = {
  page: 1,
  page_size: PAGE_SIZE,
  total: 0,
  total_pages: 0,
};

const EMPTY_SUMMARY = {
  billed: 0,
  received: 0,
  outstanding: 0,
};

const getErrorMessage = (data, fallback) => {
  if (typeof data?.detail === "string") return data.detail;

  if (Array.isArray(data?.detail)) {
    return data.detail
      .map((item) => item.msg || "Invalid request")
      .join("; ");
  }

  return fallback;
};

export default function IPBills() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const dark = theme === "dark";

  const [bills, setBills] = useState([]);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [billCreators, setBillCreators] = useState([]);

  // Query state is owned by the page so the API, not the browser,
  // performs searching, filtering, and pagination.
  const [query, setQuery] = useState({
    page: 1,
    page_size: PAGE_SIZE,
    search: "",
    status: "all",
    date_filter: "all",
    billed_by: "all",
  });

  const text = dark ? "text-slate-100" : "text-slate-800";
  const muted = dark ? "text-slate-400" : "text-slate-500";

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
      .catch((requestError) => {
        if (requestError.name !== "AbortError") console.error(requestError);
      });
    return () => controller.abort();
  }, []);

  const loadBills = useCallback(
    async (signal) => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          bill_type: "IP",
          page: String(query.page),
          page_size: String(query.page_size),
        });

        const search = query.search.trim();
        if (search) params.set("search", search);
        if (query.status !== "all") params.set("status", query.status);
        if (query.date_filter !== "all") {
          params.set("date_filter", query.date_filter);
        }
        if (query.billed_by !== "all") {
          params.set("billed_by", query.billed_by);
        }

        const response = await fetch(
          `${API_BASE_URL}/api/bills?${params.toString()}`,
          {
            method: "GET",
            credentials: "include",
            headers: { Accept: "application/json" },
            signal,
          },
        );

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            getErrorMessage(data, "Unable to load inpatient bills."),
          );
        }

        if (!data || !Array.isArray(data.items)) {
          throw new Error(
            "The billing API returned an unexpected response. Expected an items array.",
          );
        }

        setBills(data.items);
        setPagination({
          page: Number(data.pagination?.page ?? query.page),
          page_size: Number(data.pagination?.page_size ?? query.page_size),
          total: Number(data.pagination?.total ?? data.items.length),
          total_pages: Number(data.pagination?.total_pages ?? 0),
        });
        setSummary({
          billed: Number(data.summary?.billed ?? 0),
          received: Number(data.summary?.received ?? 0),
          outstanding: Number(data.summary?.outstanding ?? 0),
        });
      } catch (requestError) {
        if (requestError.name === "AbortError") return;

        console.error("Failed to load IP bills:", requestError);
        setError(
          requestError.message ||
            "Unable to connect to the billing server. Please try again.",
        );
        setBills([]);
        setPagination({
          page: query.page,
          page_size: query.page_size,
          total: 0,
          total_pages: 0,
        });
        setSummary(EMPTY_SUMMARY);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [query],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadBills(controller.signal);
    return () => controller.abort();
  }, [loadBills, reloadKey]);

  const handleQueryChange = (changes) => {
    setQuery((current) => {
      const next = { ...current, ...changes };

      // Any search/filter change should start from the first page.
      if (
        Object.keys(changes).some((key) =>
          ["search", "status", "date_filter", "billed_by", "page_size"].includes(key)
        )
      ) {
        next.page = 1;
      }

      return next;
    });
  };

  const handlePageChange = (page) => {
    setQuery((current) => ({ ...current, page }));
  };

  const handleResetFilters = () => {
    setQuery({
      page: 1,
      page_size: PAGE_SIZE,
      search: "",
      status: "all",
      date_filter: "all",
      billed_by: "all",
    });
  };

  const handleRetry = () => setReloadKey((current) => current + 1);

  const handleCreateBill = () => navigate("/ip-billing/new");

  const handleViewBill = (bill) => {
    if (!bill?.id) {
      console.error("Cannot open IP bill: bill ID is missing.", bill);
      return;
    }

    navigate(`/ip-billing/${encodeURIComponent(bill.id)}`);
  };

  return (
    <div className="min-h-screen min-w-0 bg-[#F6F6FC] dark:bg-[#11121F]">
      <AppSidebar />

      <div className="min-h-screen min-w-0 md:ml-[72px] lg:ml-[260px]">
        <TopNavbar
          title="IP Bills"
          breadcrumb={["Hospital Management", "Billing", "IP Bills"]}
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
                  Inpatient Bills
                </h1>
                <p className={`mt-1 text-[13px] ${muted}`}>
                  Search, filter, and manage inpatient billing records
                </p>
              </div>
            </div>

            <IPBillsList
              bills={bills}
              pagination={pagination}
              summary={summary}
              query={query}
              billCreators={billCreators}
              loading={loading}
              error={error}
              onQueryChange={handleQueryChange}
              onPageChange={handlePageChange}
              onResetFilters={handleResetFilters}
              onRetry={handleRetry}
              onCreateBill={handleCreateBill}
              onViewBill={handleViewBill}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

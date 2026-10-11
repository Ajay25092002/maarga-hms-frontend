import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppSidebar from "../Components/Layout/AppSidebar";
import TopNavbar from "../Components/Layout/TopNavbar";
import { useTheme } from "../Context/ThemeContext";
import PaymentSummaryCards from "../Components/Payments/PaymentSummaryCards";
import PaymentFilters from "../Components/Payments/PaymentFilters";
import PaymentsTable from "../Components/Payments/PaymentsTable";
import { paymentService } from "../Services/paymentService";
import { getErrorMessage, getPagination, normalizeList } from "../Components/Payments/paymentUtils";

const initialFilters = { search: "", bill_type: "", payment_method: "", date_from: "", date_to: "" };

export default function Payments() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const dark = theme === "dark";
  const [filters, setFilters] = useState(initialFilters);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, page_size: 10, total: 0, total_pages: 1 });
  const [refreshKey, setRefreshKey] = useState(0);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, page_size: 10, ...filters };
      const payload = await paymentService.listPayments(params);
      const rows = normalizeList(payload);
      setPayments(rows);
      setPagination(getPagination(payload, page, 10, rows.length));
    } catch (err) {
      setPayments([]);
      setPagination({ page, page_size: 10, total: 0, total_pages: 1 });
      setError(getErrorMessage(err, "Unable to load payments."));
    } finally {
      setLoading(false);
    }
  }, [page, filters, refreshKey]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const updateFilter = (key, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const resetFilters = () => {
    setPage(1);
    setFilters(initialFilters);
  };

  const summaryPayments = useMemo(() => payments, [payments]);

  return (
    <div className={`min-h-screen min-w-0 ${dark ? "bg-[#11121F]" : "bg-[#F6F6FC]"}`}>
      <AppSidebar />
      <div className="min-h-screen min-w-0 md:ml-[72px] lg:ml-[260px]">
        <TopNavbar title="Payments & Receipts" breadcrumb={["Hospital Management", "Billing", "Payments & Receipts"]} />
        <main className="min-w-0 space-y-5 px-4 py-5 sm:px-5 lg:px-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F1F0FF] text-[#3E439C]"><Wallet size={22}/></span>
              <div><h1 className={`text-xl font-bold ${dark ? "text-slate-100" : "text-slate-900"}`}>Payments & Receipts</h1><p className={`mt-1 text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>View payment history and record payments against existing OP/IP bills.</p></div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setRefreshKey((v) => v + 1)} className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold ${dark ? "border-slate-700 text-slate-200 hover:bg-slate-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}><RefreshCw size={15}/> Refresh</button>
              <button type="button" onClick={() => navigate("/payments/new")} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#3E439C] px-4 text-sm font-semibold text-white hover:bg-[#32367D]"><Plus size={16}/> Create Payment</button>
            </div>
          </div>

          <PaymentSummaryCards payments={summaryPayments} dark={dark}/>
          <PaymentFilters filters={filters} onChange={updateFilter} onReset={resetFilters} dark={dark}/>
          <PaymentsTable payments={payments} loading={loading} error={error} page={page} pagination={pagination} onPageChange={setPage} onView={(id) => navigate(`/payments/receipts/${id}`)} onRetry={() => setRefreshKey((v) => v + 1)} dark={dark}/>
          <p className={`text-xs ${dark ? "text-slate-500" : "text-slate-400"}`}>Summary cards reflect the payment rows on the current page, not the entire filtered dataset. The API does not currently expose a separate collection-summary endpoint.</p>
        </main>
      </div>
    </div>
  );
}

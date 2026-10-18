import { Search, RotateCcw } from "lucide-react";

export default function ReportFilters({ reportType, filters, onChange, onApply, onReset, loading }) {
  const todayIndia = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const set = (key, value) => onChange((current) => ({ ...current, [key]: value }));
  return (
    <form onSubmit={(event) => { event.preventDefault(); onApply(); }} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">From date
          <input type="date" max={todayIndia} value={filters.date_from} onChange={(e) => set("date_from", e.target.value)} className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700 outline-none focus:border-[#3E439C] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
        </label>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">To date
          <input type="date" max={todayIndia} value={filters.date_to} onChange={(e) => set("date_to", e.target.value)} className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-700 outline-none focus:border-[#3E439C] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
        </label>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Search
          <div className="relative mt-1.5"><Search size={15} className="absolute left-3 top-3 text-slate-400" /><input value={filters.search} onChange={(e) => set("search", e.target.value)} placeholder="Search report data..." className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-normal text-slate-700 outline-none focus:border-[#3E439C] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" /></div>
        </label>
        {reportType === "cash-collection" && <>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Bill type<select value={filters.bill_type} onChange={(e) => set("bill_type", e.target.value)} className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal dark:border-slate-700 dark:bg-slate-800"><option value="">All types</option><option value="OP">OP</option><option value="IP">IP</option></select></label>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Payment method<select value={filters.payment_method} onChange={(e) => set("payment_method", e.target.value)} className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal dark:border-slate-700 dark:bg-slate-800"><option value="">All methods</option><option>Cash</option><option>Card</option><option>UPI</option><option>Bank Transfer</option><option>Cheque</option></select></label>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Collected by<input value={filters.staff} onChange={(e) => set("staff", e.target.value)} placeholder="Staff name" className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal dark:border-slate-700 dark:bg-slate-800" /></label>
        </>}
        {(reportType === "patient-registration" || reportType === "source-of-lead") && <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Source of lead<select value={filters.source} onChange={(e) => set("source", e.target.value)} className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal dark:border-slate-700 dark:bg-slate-800"><option value="">All sources</option>{["Word of mouth", "Google", "Social media", "Maps", "Advertisement", "Not Specified"].map((source) => <option key={source}>{source}</option>)}</select></label>}
        {(reportType === "outstanding" || reportType === "service-wise" || reportType === "service-group-wise") && <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Bill type<select value={filters.bill_type} onChange={(e) => set("bill_type", e.target.value)} className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal dark:border-slate-700 dark:bg-slate-800"><option value="">OP &amp; IP</option><option value="OP">OP</option><option value="IP">IP</option></select></label>}
        {reportType === "service-wise" && <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Service name<input value={filters.service} onChange={(e) => set("service", e.target.value)} placeholder="Filter service" className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal dark:border-slate-700 dark:bg-slate-800" /></label>}
        {(reportType === "service-wise" || reportType === "service-group-wise") && <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Service group<input value={filters.service_group} onChange={(e) => set("service_group", e.target.value)} placeholder="Filter group" className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal dark:border-slate-700 dark:bg-slate-800" /></label>}
        {reportType === "admission-discharge" && <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Admission status<select value={filters.status} onChange={(e) => set("status", e.target.value)} className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal dark:border-slate-700 dark:bg-slate-800"><option value="">All statuses</option><option value="admitted">Currently admitted</option><option value="discharged">Discharged</option></select></label>}
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onReset} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"><RotateCcw size={14} />Reset</button>
        <button type="submit" disabled={loading} className="h-9 rounded-lg bg-[#3E439C] px-4 text-xs font-semibold text-white hover:bg-[#30357d] disabled:opacity-60">{loading ? "Loading..." : "Apply filters"}</button>
      </div>
    </form>
  );
}

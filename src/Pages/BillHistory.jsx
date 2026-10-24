import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ClipboardList, Eye, Search, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import AppSidebar from "../Components/Layout/AppSidebar";
import TopNavbar from "../Components/Layout/TopNavbar";
import { useTheme } from "../Context/ThemeContext";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8001").replace(/\/+$/, "");
const PAGE_SIZE = 10;

const dateTime = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? String(value)
    : parsed.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
};
const dateOnly = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? String(value)
    : parsed.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" });
};
const titleCase = (value) => String(value || "Change").replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const IGNORED_AUDIT_FIELDS = new Set([
  "id",
  "bill_id",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
  "service_id",
  "service_group_id",
  "service_price_id",
  "patient_db_id",
]);

const FIELD_LABELS = {
  amount: "Amount",
  net_amount: "Net Amount",
  rate: "Rate",
  quantity: "Quantity",
  discount_amount: "Discount",
  gst_amount: "GST",
  service_name: "Service",
  service_date: "Service Date",
  service_group_name: "Service Group",
  room_type_name: "Room Type",
  bed_number: "Bed Number",
  bill_date: "Bill Date",
  admission_date: "Admission Date",
  discharge_date: "Discharge Date",
  total_amount: "Bill Total",
  subtotal: "Subtotal",
  notes: "Notes",
  doctor_name: "Doctor",
  department: "Department",
  rate_category: "Rate Category",
  payment_status: "Payment Status",
  payment_method: "Payment Method",
  refund_amount: "Refund Amount",
  reason: "Reason",
};

const fieldLabel = (key) =>
  FIELD_LABELS[key] || titleCase(key);

const parseAuditValue = (value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed || !["{", "["].includes(trimmed[0])) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const normalizedValue = (value) => {
  value = parseAuditValue(value);
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed !== "" && /^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
    return trimmed;
  }
  if (Array.isArray(value)) return value.map(normalizedValue);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !IGNORED_AUDIT_FIELDS.has(key))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, normalizedValue(nested)]),
    );
  }
  return value;
};

const valuesEqual = (left, right) =>
  JSON.stringify(normalizedValue(left)) === JSON.stringify(normalizedValue(right));

const displayValue = (key, value) => {
  value = parseAuditValue(value);
  if (value === null || value === undefined || value === "") return "—";
  if (["discount_amount", "gst_amount", "amount", "net_amount", "rate", "total_amount", "subtotal", "refund_amount"].includes(key)) {
    const number = Number(value);
    if (Number.isFinite(number)) {
      return `₹${number.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }
  if (["service_date", "bill_date", "admission_date", "discharge_date"].includes(key)) return dateOnly(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return "—";
  return String(value);
};

const asRecord = (value) => {
  const parsed = parseAuditValue(value);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
};

const BILL_CREATION_FIELDS = [
  "bill_number", "bill_type", "bill_date", "subtotal", "total_amount",
  "doctor_name", "room_type_name", "bed_number", "admission_date", "discharge_date",
];

const relevantFields = (billType, value, entry = {}) => {
  const record = asRecord(value);
  const action = String(entry.action || "").toLowerCase();
  const entityType = String(entry.entity_type || "").toLowerCase();

  if (action === "bill.created") {
    const bill = asRecord(record.bill || record);
    return Object.fromEntries(
      BILL_CREATION_FIELDS
        .filter((key) => key in bill && !(billType !== "IP" && ["admission_date", "discharge_date", "room_type_name", "bed_number"].includes(key)))
        .map((key) => [key, bill[key]]),
    );
  }

  if (entityType === "bill_item" || action.startsWith("bill_item.")) {
    if (action === "bill_item.added") return asRecord(record.item || record);
    if (action === "bill_item.removed") return asRecord(record.item || record);
    if (record.item && typeof record.item === "object") return asRecord(record.item);
    return record;
  }

  if (record.bill && typeof record.bill === "object") return asRecord(record.bill);
  return record;
};

const getChangedFields = (oldValues, newValues, billType, entry = {}) => {
  const action = String(entry.action || "").toLowerCase();
  let oldRecord;
  let newRecord;

  if (action === "bill.created") {
    oldRecord = {};
    newRecord = relevantFields(billType, newValues, entry);
  } else if (action === "bill_item.added") {
    oldRecord = {};
    newRecord = relevantFields(billType, newValues, entry);
  } else if (action === "bill_item.removed") {
    oldRecord = relevantFields(billType, oldValues, entry);
    if (Object.keys(oldRecord).length === 0) oldRecord = relevantFields(billType, newValues, entry);
    newRecord = {};
  } else {
    oldRecord = relevantFields(billType, oldValues, entry);
    newRecord = relevantFields(billType, newValues, entry);
  }

  const keys = [...new Set([...Object.keys(oldRecord), ...Object.keys(newRecord)])];
  return keys
    .filter((key) => !IGNORED_AUDIT_FIELDS.has(key))
    .filter((key) => !(billType !== "IP" && ["admission_date", "discharge_date", "room_type_name", "bed_number"].includes(key)))
    .filter((key) => !(billType !== "OP" && ["op_number"].includes(key)))
    .filter((key) => !(billType !== "IP" && ["ip_number"].includes(key)))
    .filter((key) => !valuesEqual(oldRecord[key], newRecord[key]))
    .map((key) => ({
      key,
      label: fieldLabel(key),
      oldValue: displayValue(key, oldRecord[key]),
      newValue: displayValue(key, newRecord[key]),
    }));
};

export default function BillHistory() {
  const navigate = useNavigate();
  const { billId } = useParams();
  const { theme } = useTheme();
  const dark = theme === "dark";
  const [search, setSearch] = useState("");
  const [billType, setBillType] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0, total_pages: 0 });
  const [history, setHistory] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const panel = dark ? "border-slate-700 bg-[#191A2B]" : "border-slate-200 bg-white";
  const text = dark ? "text-slate-100" : "text-slate-800";
  const muted = dark ? "text-slate-400" : "text-slate-500";
  const input = `h-10 rounded-lg border px-3 text-sm outline-none focus:border-[#3E439C] focus:ring-2 focus:ring-[#3E439C]/15 ${dark ? "border-slate-700 bg-slate-900 text-slate-100" : "border-slate-200 bg-white text-slate-800"}`;

  const loadBills = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) });
      if (search.trim()) params.set("search", search.trim());
      if (billType) params.set("bill_type", billType);
      const response = await fetch(`${API_BASE}/api/bills/history/search?${params}`, { credentials: "include", headers: { Accept: "application/json" } });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.detail || "Unable to load bill history.");
      setResult(data);
    } catch (e) { setError(e.message || "Unable to load bill history."); }
    finally { setLoading(false); }
  }, [page, search, billType]);

  const loadHistory = useCallback(async () => {
    if (!billId) return;
    setLoading(true); setError("");
    try {
      const response = await fetch(`${API_BASE}/api/bills/history/bill/${encodeURIComponent(billId)}`, { credentials: "include", headers: { Accept: "application/json" } });
      const bill = await response.json();
      if (!response.ok) throw new Error(bill?.detail || "Unable to load bill.");
      setSelectedBill(bill);
      const historyResponse = await fetch(`${API_BASE}/api/bills/${encodeURIComponent(billId)}/history`, { credentials: "include", headers: { Accept: "application/json" } });
      const entries = await historyResponse.json();
      if (!historyResponse.ok) throw new Error(entries?.detail || "Unable to load audit history.");
      setHistory(Array.isArray(entries) ? entries : []);
    } catch (e) { setError(e.message || "Unable to load audit history."); }
    finally { setLoading(false); }
  }, [billId]);

  useEffect(() => { if (billId) loadHistory(); else loadBills(); }, [billId, loadHistory, loadBills]);

  return (
    <div className="min-h-screen min-w-0 bg-[#F6F6FC] dark:bg-[#11121F]">
      <AppSidebar />
      <div className="min-h-screen min-w-0 md:ml-[72px] lg:ml-[260px]">
        <TopNavbar title="Bill History" breadcrumb={["Hospital Management", "Billing", "Bill History", ...(billId ? ["Audit Timeline"] : [])]} />
        <main className="min-w-0 px-4 py-5 sm:px-5 lg:px-6">
          <div className="mx-auto w-full max-w-[1500px]">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F1F0FF] dark:bg-[#292B49]"><ClipboardList size={20} className="text-[#3E439C] dark:text-[#D6D4FF]" /></div>
                <div><h1 className={`text-lg font-semibold ${text}`}>{billId ? "Bill Audit Timeline" : "Bill History"}</h1><p className={`mt-1 text-[13px] ${muted}`}>{billId ? "Review every recorded change, timestamp, and actor." : "Search OP/IP bills and review their complete change history."}</p></div>
              </div>
              {billId && <button onClick={() => navigate("/bill-history")} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-[#3E439C] hover:bg-[#F1F0FF]"><ArrowLeft size={16}/> Back to bills</button>}
            </div>

            {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            {!billId ? (
              <section className={`overflow-hidden rounded-xl border shadow-sm ${panel}`}>
                <div className="grid grid-cols-1 gap-3 border-b border-slate-200 p-4 md:grid-cols-[minmax(0,1fr)_180px_auto]">
                  <div className="relative"><Search size={17} className={`absolute left-3 top-3 ${muted}`}/><input className={`${input} w-full pl-9`} placeholder="Bill number, OP number, IP number, patient name or patient ID" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}/></div>
                  <select className={input} value={billType} onChange={(e) => { setBillType(e.target.value); setPage(1); }}><option value="">All bill types</option><option value="OP">OP bills</option><option value="IP">IP bills</option></select>
                  <button onClick={loadBills} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#3E439C] px-4 text-sm font-semibold text-white hover:bg-[#32377F]"><RefreshCw size={16}/> Search</button>
                </div>
                <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left text-sm">
                  <thead className={dark ? "bg-slate-900/70 text-slate-300" : "bg-[#F8F8FC] text-slate-600"}><tr>{["Bill Number","Type","OP / IP Number","Patient","Bill Date","Discharge Date","Total","Action"].map((x)=><th key={x} className="px-4 py-3 font-semibold">{x}</th>)}</tr></thead>
                  <tbody>{loading ? <tr><td colSpan={8} className={`p-8 text-center ${muted}`}>Loading bills…</td></tr> : result.items.length === 0 ? <tr><td colSpan={8} className={`p-8 text-center ${muted}`}>No bills found for this search.</td></tr> : result.items.map((bill)=><tr key={bill.id} className={`border-t ${dark ? "border-slate-800 hover:bg-slate-900/50" : "border-slate-100 hover:bg-slate-50"}`}>
                    <td className={`px-4 py-3 font-semibold ${text}`}>{bill.bill_number || `#${bill.id}`}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${bill.bill_type === "IP" ? "bg-indigo-50 text-indigo-700" : "bg-sky-50 text-sky-700"}`}>{bill.bill_type}</span></td>
                    <td className={`px-4 py-3 ${text}`}>{bill.bill_type === "OP" ? (bill.op_number || "—") : (bill.ip_number || "—")}</td>
                    <td className={`px-4 py-3 ${text}`}><div className="font-medium">{bill.patient_name || "—"}</div><div className={`text-xs ${muted}`}>{bill.patient_id || ""}</div></td>
                    <td className={`px-4 py-3 ${text}`}>{dateOnly(bill.bill_date)}</td>
                    <td className={`px-4 py-3 ${text}`}>{bill.bill_type === "IP" ? dateOnly(bill.discharge_date) : "—"}</td>
                    <td className={`px-4 py-3 ${text}`}>₹{Number(bill.total_amount || 0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
                    <td className="px-4 py-3"><button onClick={() => navigate(`/bill-history/${bill.id}`)} className="inline-flex items-center gap-1.5 rounded-md bg-[#F1F0FF] px-3 py-2 text-xs font-bold text-[#3E439C] hover:bg-[#e5e3ff]"><Eye size={14}/> View</button></td>
                  </tr>)}</tbody>
                </table></div>
                <div className={`flex flex-wrap items-center justify-between gap-3 border-t p-4 ${dark ? "border-slate-800" : "border-slate-100"}`}>
                  <p className={`text-sm ${muted}`}>Showing {result.items.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, result.total)} of {result.total} bills</p>
                  <div className="flex items-center gap-2"><button disabled={page <= 1 || loading} onClick={() => setPage((p)=>Math.max(1,p-1))} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronLeft size={17}/></button><span className={`text-sm ${text}`}>Page {page} of {Math.max(1,result.total_pages || 1)}</span><button disabled={page >= (result.total_pages || 1) || loading} onClick={() => setPage((p)=>p+1)} className="rounded-lg border border-slate-200 p-2 disabled:opacity-40"><ChevronRight size={17}/></button></div>
                </div>
              </section>
            ) : (
              <div className="space-y-4">
                {selectedBill && <section className={`rounded-xl border p-5 shadow-sm ${panel}`}><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h2 className={`text-base font-bold ${text}`}>{selectedBill.bill_number || `Bill #${selectedBill.id}`}</h2><span className="rounded-full bg-[#F1F0FF] px-2.5 py-1 text-xs font-bold text-[#3E439C]">{selectedBill.bill_type}</span></div><p className={`mt-2 text-sm ${muted}`}>Patient: <span className={text}>{selectedBill.patient_name || selectedBill.patient?.name || "—"}</span> · Patient ID: {selectedBill.patient_id || "—"}</p></div><div className="text-sm"><div className={muted}>Bill total</div><div className={`text-lg font-bold ${text}`}>₹{Number(selectedBill.total_amount || 0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}</div></div></div><div className={`mt-4 grid grid-cols-2 gap-3 border-t pt-4 md:grid-cols-4 ${dark ? "border-slate-700" : "border-slate-100"}`}><div><div className={`text-xs ${muted}`}>Bill Date</div><div className={`mt-1 text-sm ${text}`}>{dateOnly(selectedBill.bill_date)}</div></div><div><div className={`text-xs ${muted}`}>Admission Date</div><div className={`mt-1 text-sm ${text}`}>{selectedBill.bill_type === "IP" ? dateOnly(selectedBill.admission_date) : "—"}</div></div><div><div className={`text-xs ${muted}`}>Discharge Date</div><div className={`mt-1 text-sm ${text}`}>{selectedBill.bill_type === "IP" ? dateOnly(selectedBill.discharge_date) : "—"}</div></div><div><div className={`text-xs ${muted}`}>OP / IP Number</div><div className={`mt-1 text-sm ${text}`}>{selectedBill.bill_type === "OP" ? (selectedBill.op_number || "—") : (selectedBill.ip_number || "—")}</div></div></div></section>}
                <section className={`rounded-xl border p-5 shadow-sm ${panel}`}><h2 className={`mb-4 text-base font-bold ${text}`}>Change timeline</h2>
                  {loading ? <p className={`py-8 text-center ${muted}`}>Loading audit events…</p> : history.length === 0 ? <p className={`py-8 text-center ${muted}`}>No audit events have been recorded for this bill yet.</p> : <div className="space-y-4">{history.map((entry)=><article key={entry.id} className={`relative rounded-lg border p-4 ${dark ? "border-slate-700 bg-slate-900/40" : "border-slate-200 bg-slate-50"}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className={`font-semibold ${text}`}>{titleCase(entry.action)}</h3><p className={`mt-1 text-xs ${muted}`}>{entry.entity_type || "record"}{entry.entity_id ? ` · ID ${entry.entity_id}` : ""}</p></div><div className="text-right"><div className={`text-sm font-semibold ${text}`}>{entry.changed_by_name || (entry.changed_by ? `User ID ${entry.changed_by}` : "System")}</div><div className={`mt-1 text-xs ${muted}`}>{dateTime(entry.changed_at)}</div></div></div>
                    {(() => {
                      const changes = getChangedFields(entry.old_values, entry.new_values, selectedBill?.bill_type, entry);
                      if (changes.length === 0) {
                        return <p className={`mt-4 rounded-md border px-3 py-2 text-sm ${dark ? "border-slate-700 text-slate-400" : "border-slate-200 bg-white text-slate-500"}`}>No field-level changes to display for this event.</p>;
                      }
                      return (
                        <div className="mt-4 overflow-x-auto rounded-md border border-slate-200 dark:border-slate-700">
                          <table className="w-full min-w-[520px] text-left text-sm">
                            <thead className={dark ? "bg-slate-800 text-slate-300" : "bg-white text-slate-600"}>
                              <tr>
                                <th className="px-3 py-2.5 font-semibold">Changed field</th>
                                <th className="px-3 py-2.5 font-semibold">Previous value</th>
                                <th className="px-3 py-2.5 font-semibold">New value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {changes.map((change) => (
                                <tr key={change.key} className={`border-t ${dark ? "border-slate-700" : "border-slate-100"}`}>
                                  <td className={`px-3 py-2.5 font-medium ${text}`}>{change.label}</td>
                                  <td className="px-3 py-2.5 text-rose-700 dark:text-rose-300">{change.oldValue}</td>
                                  <td className="px-3 py-2.5 text-emerald-700 dark:text-emerald-300">{change.newValue}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </article>)}</div>}
                </section>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

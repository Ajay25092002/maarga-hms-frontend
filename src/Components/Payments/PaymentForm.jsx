import { AlertCircle, CalendarDays, CreditCard, IndianRupee, Search, Wallet } from "lucide-react";
import { formatCurrency, getBillBalance, getBillPaid, getBillTotal, getPatientIdentifier, getPatientName, getPaymentStatus, todayInputValue } from "./paymentUtils";

const inputBase = "h-10 w-full rounded-lg border px-3 text-sm outline-none transition focus:border-[#3E439C] focus:ring-2 focus:ring-[#3E439C]/15";
const inputClass = (dark) => `${inputBase} ${dark ? "border-slate-700 bg-[#11121F] text-slate-100 placeholder:text-slate-500" : "border-slate-200 bg-white text-slate-800 placeholder:text-slate-400"}`;

export default function PaymentForm({
  bills, billsLoading, billsError, selectedBill, onSelectBill, billQuery, onBillQueryChange,
  amount, onAmountChange, paymentDate, onPaymentDateChange, paymentMethod, onPaymentMethodChange,
  referenceNumber, onReferenceNumberChange, notes, onNotesChange, submitting, error, onSubmit, onCancel, dark,
}) {
  const text = dark ? "text-slate-100" : "text-slate-800";
  const muted = dark ? "text-slate-400" : "text-slate-500";

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <section className={`rounded-xl border p-4 sm:p-5 ${dark ? "border-slate-700 bg-[#191A2B]" : "border-slate-200 bg-white"}`}>
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F1F0FF] text-[#3E439C]"><Search size={18} /></span>
          <div><h2 className={`text-sm font-semibold ${text}`}>Select bill</h2><p className={`mt-0.5 text-xs ${muted}`}>Payments must be recorded against an existing OP or IP bill.</p></div>
        </div>
        <label className={`mb-1.5 block text-xs font-medium ${muted}`}>Search bill, patient or UHID</label>
        <input className={inputClass(dark)} value={billQuery} onChange={(e) => onBillQueryChange(e.target.value)} placeholder="Search by bill number, patient name or UHID…" />
        {billsLoading ? <p className={`mt-3 text-sm ${muted}`}>Loading bills…</p> : billsError ? <p className="mt-3 text-sm text-rose-600">{billsError}</p> : (
          <div className={`mt-3 max-h-64 overflow-y-auto rounded-lg border ${dark ? "border-slate-700" : "border-slate-200"}`}>
            {bills.length === 0 ? <p className={`p-4 text-sm ${muted}`}>No matching bills found.</p> : bills.map((bill) => {
              const active = String(selectedBill?.id) === String(bill.id);
              return <button key={bill.id} type="button" onClick={() => onSelectBill(bill)} className={`flex w-full items-center justify-between gap-3 border-b p-3 text-left last:border-b-0 ${dark ? "border-slate-800" : "border-slate-100"} ${active ? "bg-[#F1F0FF] text-[#292D78]" : dark ? "text-slate-200 hover:bg-slate-800/60" : "text-slate-700 hover:bg-slate-50"}`}>
                <span className="min-w-0"><span className="block truncate text-sm font-semibold">{bill.bill_number || `Bill #${bill.id}`} · {getPatientName(bill)}</span><span className="mt-1 block text-xs opacity-75">{bill.bill_type || "—"} · {getPatientIdentifier(bill)}</span></span>
                <span className="shrink-0 text-right"><span className="block text-sm font-semibold">{formatCurrency(getBillBalance(bill))}</span><span className="text-xs opacity-75">Balance</span></span>
              </button>;
            })}
          </div>
        )}
        {selectedBill && (
          <div className={`mt-4 rounded-lg border p-4 ${dark ? "border-slate-700 bg-[#11121F]" : "border-[#DCDDF7] bg-[#FAFAFF]"}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><p className={`text-xs ${muted}`}>Selected bill</p><p className={`mt-1 font-semibold ${text}`}>{selectedBill.bill_number || `Bill #${selectedBill.id}`}</p><p className={`mt-1 text-xs ${muted}`}>{getPatientName(selectedBill)} · {selectedBill.bill_type || "—"}</p></div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getPaymentStatus(selectedBill) === "Paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{getPaymentStatus(selectedBill)}</span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[["Bill total", getBillTotal(selectedBill)], ["Paid so far", getBillPaid(selectedBill)], ["Outstanding", getBillBalance(selectedBill)]].map(([label, value]) => <div key={label} className={`rounded-lg p-3 ${dark ? "bg-slate-900" : "bg-white"}`}><p className={`text-xs ${muted}`}>{label}</p><p className={`mt-1 text-base font-semibold ${label === "Outstanding" ? "text-[#3E439C]" : text}`}>{formatCurrency(value)}</p></div>)}
            </div>
          </div>
        )}
      </section>

      <section className={`rounded-xl border p-4 sm:p-5 ${dark ? "border-slate-700 bg-[#191A2B]" : "border-slate-200 bg-white"}`}>
        <div className="mb-4 flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F1F0FF] text-[#3E439C]"><Wallet size={18}/></span><div><h2 className={`text-sm font-semibold ${text}`}>Payment details</h2><p className={`mt-0.5 text-xs ${muted}`}>Enter the amount received and payment reference.</p></div></div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label><span className={`mb-1.5 block text-xs font-medium ${muted}`}>Payment amount (₹) *</span><span className="relative block"><IndianRupee size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`}/><input required type="number" min="0.01" step="0.01" max={selectedBill ? getBillBalance(selectedBill) : undefined} value={amount} onChange={(e) => onAmountChange(e.target.value)} className={`${inputClass(dark)} pl-9`} placeholder="0.00" /></span>{selectedBill && Number(amount) > getBillBalance(selectedBill) && <span className="mt-1 block text-xs text-rose-600">Payment cannot exceed the outstanding balance.</span>}</label>
          <label><span className={`mb-1.5 block text-xs font-medium ${muted}`}>Payment date *</span><span className="relative block"><CalendarDays size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`}/><input required type="date" value={paymentDate} max={todayInputValue()} onChange={(e) => onPaymentDateChange(e.target.value)} className={`${inputClass(dark)} pl-9`}/></span></label>
          <label><span className={`mb-1.5 block text-xs font-medium ${muted}`}>Payment mode *</span><span className="relative block"><CreditCard size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`}/><select required value={paymentMethod} onChange={(e) => onPaymentMethodChange(e.target.value)} className={`${inputClass(dark)} pl-9`}><option value="">Select payment mode</option><option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option><option>Cheque</option></select></span></label>
          <label><span className={`mb-1.5 block text-xs font-medium ${muted}`}>Transaction / reference number</span><input maxLength={150} value={referenceNumber} onChange={(e) => onReferenceNumberChange(e.target.value)} className={inputClass(dark)} placeholder="Optional for cash; enter for digital payments"/></label>
          <label className="md:col-span-2"><span className={`mb-1.5 block text-xs font-medium ${muted}`}>Notes</span><textarea rows={3} maxLength={2000} value={notes} onChange={(e) => onNotesChange(e.target.value)} className={`${inputClass(dark)} h-auto py-2`} placeholder="Optional payment remarks"/></label>
        </div>
      </section>

      {error && <div role="alert" className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${dark ? "border-rose-900 bg-rose-950/30 text-rose-200" : "border-rose-200 bg-rose-50 text-rose-700"}`}><AlertCircle size={17} className="mt-0.5 shrink-0"/><span>{error}</span></div>}
      <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
        <button type="button" onClick={onCancel} disabled={submitting} className={`h-10 rounded-lg border px-5 text-sm font-semibold disabled:opacity-50 ${dark ? "border-slate-700 text-slate-200 hover:bg-slate-800" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}>Cancel</button>
        <button type="submit" disabled={submitting || !selectedBill || !amount || Number(amount) <= 0 || Number(amount) > (selectedBill ? getBillBalance(selectedBill) : 0)} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#3E439C] px-5 text-sm font-semibold text-white hover:bg-[#32367D] disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"/> : <Wallet size={16}/>}
          {submitting ? "Recording payment…" : "Record Payment"}
        </button>
      </div>
    </form>
  );
}

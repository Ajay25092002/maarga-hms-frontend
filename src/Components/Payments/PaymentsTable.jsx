import { Eye, ReceiptText } from "lucide-react";
import { formatCurrency, formatDate, getPatientIdentifier, getPatientName } from "./paymentUtils";

function ModeBadge({ value, dark }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${dark ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-700"}`}>{value || "—"}</span>;
}

export default function PaymentsTable({ payments = [], loading, error, page, pagination, onPageChange, onView, onRetry, dark }) {
  const surface = dark ? "border-slate-700 bg-[#191A2B]" : "border-slate-200 bg-white";
  const muted = dark ? "text-slate-400" : "text-slate-500";

  return (
    <section className={`overflow-hidden rounded-xl border ${surface}`}>
      <div className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 ${dark ? "border-slate-700" : "border-slate-200"}`}>
        <div>
          <h2 className={`text-sm font-semibold ${dark ? "text-slate-100" : "text-slate-900"}`}>Payment history</h2>
          <p className={`mt-0.5 text-xs ${muted}`}>{pagination.total} payment record(s)</p>
        </div>
        <span className={`text-xs ${muted}`}>Page {pagination.page} of {Math.max(1, pagination.total_pages)}</span>
      </div>

      {loading ? (
        <div className={`flex min-h-48 items-center justify-center gap-2 text-sm ${muted}`}>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#3E439C] border-t-transparent" /> Loading payments…
        </div>
      ) : error ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-3 px-4 text-center">
          <p className={`text-sm ${dark ? "text-rose-300" : "text-rose-700"}`}>{error}</p>
          <button type="button" onClick={onRetry} className="rounded-lg bg-[#3E439C] px-4 py-2 text-sm font-medium text-white">Try again</button>
        </div>
      ) : payments.length === 0 ? (
        <div className={`flex min-h-48 flex-col items-center justify-center px-4 text-center ${muted}`}>
          <ReceiptText size={28} className="mb-2 opacity-60" />
          <p className={`text-sm font-medium ${dark ? "text-slate-200" : "text-slate-700"}`}>No payments found</p>
          <p className="mt-1 text-xs">Try changing the filters or record a payment against an existing bill.</p>
        </div>
      ) : (
        <>
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className={dark ? "bg-[#141524] text-slate-400" : "bg-slate-50 text-slate-500"}>
                <tr>
                  {["Receipt / ID", "Payment date", "Patient", "Bill", "Type", "Payment mode", "Amount", "Action"].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-xs font-semibold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className={`divide-y ${dark ? "divide-slate-800 text-slate-200" : "divide-slate-100 text-slate-700"}`}>
                {payments.map((payment) => (
                  <tr key={payment.id} className={dark ? "hover:bg-slate-800/40" : "hover:bg-slate-50"}>
                    <td className="px-4 py-3">
                      <p className="font-semibold">{payment.receipt_number || `RCT-${payment.id}`}</p>
                      {payment.reference_number && <p className={`mt-0.5 max-w-32 truncate text-xs ${muted}`} title={payment.reference_number}>{payment.reference_number}</p>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(payment.payment_date, true)}</td>
                    <td className="px-4 py-3">
                      <p className="max-w-48 truncate font-medium" title={getPatientName(payment)}>{getPatientName(payment)}</p>
                      <p className={`mt-0.5 text-xs ${muted}`}>{getPatientIdentifier(payment)}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{payment.bill_number || `#${payment.bill_id}`}</td>
                    <td className="px-4 py-3"><span className={`rounded-md px-2 py-1 text-xs font-semibold ${payment.bill_type === "IP" ? "bg-indigo-100 text-indigo-800" : "bg-violet-100 text-violet-800"}`}>{payment.bill_type || "—"}</span></td>
                    <td className="px-4 py-3"><ModeBadge value={payment.payment_method} dark={dark} /></td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold">{formatCurrency(payment.amount)}</td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => onView(payment.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-[#3E439C]/20 px-3 py-2 text-xs font-semibold text-[#3E439C] hover:bg-[#F1F0FF]">
                        <Eye size={14} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={`flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 ${dark ? "border-slate-700" : "border-slate-200"}`}>
            <p className={`text-xs ${muted}`}>Showing {payments.length ? (page - 1) * pagination.page_size + 1 : 0}–{(page - 1) * pagination.page_size + payments.length} of {pagination.total}</p>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={`rounded-lg border px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${dark ? "border-slate-700 text-slate-200" : "border-slate-200 text-slate-700"}`}>Previous</button>
              <button type="button" disabled={page >= pagination.total_pages} onClick={() => onPageChange(page + 1)} className={`rounded-lg border px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${dark ? "border-slate-700 text-slate-200" : "border-slate-200 text-slate-700"}`}>Next</button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

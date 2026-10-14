
import { Printer, ArrowLeft, ReceiptText, UserRound, CreditCard, CalendarDays } from "lucide-react";
import {
  formatCurrency,
  formatDate,
  getPatientIdentifier,
  getPatientName,
} from "./paymentUtils";

export default function ReceiptPreview({
  payment,
  onBack,
  onPrintReceipt,
  dark,
}) {
  if (!payment) return null;

  const border = dark ? "border-slate-700" : "border-slate-200";
  const text = dark ? "text-slate-100" : "text-slate-800";
  const muted = dark ? "text-slate-400" : "text-slate-500";
  const surface = dark ? "bg-[#171827]" : "bg-white";

  const patientId = getPatientIdentifier(payment);

  const rows = [
    ["Receipt Number", payment.receipt_number || `RCT-${payment.id}`],
    ["Payment Date", formatDate(payment.payment_date, true)],
    ["Patient Name", getPatientName(payment)],
    ["Patient ID / UHID", patientId],
    ["Bill Number", payment.bill_number || `#${payment.bill_id}`],
    ["Bill Type", payment.bill_type || "—"],
    ["Payment Method", payment.payment_method || "—"],
    ["Reference Number", payment.reference_number || "—"],
  ];

  const billRows = [
    ["Bill Total", formatCurrency(payment.bill_total)],
    ["Total Paid Against Bill", formatCurrency(payment.bill_amount_paid)],
    ["Outstanding Balance", formatCurrency(payment.bill_outstanding_amount)],
  ];

  return (
    <div className="space-y-5">
      {/* Page heading and actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F1F0FF] dark:bg-[#292B49]">
            <ReceiptText
              size={20}
              className="text-[#3E439C] dark:text-[#D6D4FF]"
            />
          </span>

          <div>
            <h1 className={`text-lg font-semibold ${text}`}>
              Receipt Details
            </h1>
            <p className={`mt-1 text-[13px] ${muted}`}>
              View payment, patient and bill details
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onBack}
            className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium transition ${
              dark
                ? "border-slate-700 text-slate-200 hover:bg-slate-800"
                : "border-slate-200 text-slate-700 hover:bg-white"
            }`}
          >
            <ArrowLeft size={16} />
            Back to Payments
          </button>

          <button
            type="button"
            onClick={onPrintReceipt}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-[#3E439C] px-4 text-sm font-semibold text-white transition hover:bg-[#323780]"
          >
            <Printer size={16} />
            Print Receipt
          </button>
        </div>
      </div>

      {/* Receipt document */}
      <article
        className={`receipt-print-area mx-auto w-full max-w-[1200px] space-y-5 rounded-lg border p-4 sm:p-6 ${border} ${surface}`}
      >
        {/* Receipt header */}
        <header
          className={`flex flex-wrap items-start justify-between gap-4 border-b pb-5 ${border}`}
        >
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#F1F0FF] dark:bg-[#292B49]">
              <ReceiptText
                size={23}
                className="text-[#3E439C] dark:text-[#D6D4FF]"
              />
            </span>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#3E439C] dark:text-[#B9B7FF]">
                Maarga Mindcare
              </p>

              <h2 className={`mt-1 text-lg font-bold ${text}`}>
                PAYMENT RECEIPT
              </h2>

              <p className={`mt-1 text-xs ${muted}`}>
                Receipt for payment received against a hospital bill.
              </p>

              <p className={`mt-3 text-sm font-semibold ${text}`}>
                Receipt No: {payment.receipt_number || `RCT-${payment.id}`}
              </p>

              <p className={`mt-1 text-xs ${muted}`}>
                Bill No: {payment.bill_number || `#${payment.bill_id}`}
              </p>
            </div>
          </div>

          <div className="sm:min-w-[180px] sm:text-right">
            <p className={`text-xs ${muted}`}>Payment Date</p>
            <p className={`mt-1 text-sm font-medium ${text}`}>
              {formatDate(payment.payment_date, true)}
            </p>

            <p className={`mt-3 text-xs ${muted}`}>Payment Method</p>
            <p className={`mt-1 text-sm font-medium ${text}`}>
              {payment.payment_method || "—"}
            </p>
          </div>
        </header>

        {/* Patient and receipt information */}
        <section className={`rounded-lg border p-4 sm:p-5 ${border}`}>
          <div className="mb-4 flex items-center gap-2">
            <UserRound
              size={17}
              className="text-[#3E439C] dark:text-[#B9B7FF]"
            />
            <h3 className={`text-sm font-semibold ${text}`}>
              Patient & Receipt Information
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <p className={`mb-1 text-xs ${muted}`}>{label}</p>
                <p className={`break-words text-sm font-medium ${text}`}>
                  {value || "—"}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Bill payment summary */}
        <section className={`rounded-lg border p-4 sm:p-5 ${border}`}>
          <div className="mb-4 flex items-center gap-2">
            <CreditCard
              size={17}
              className="text-[#3E439C] dark:text-[#B9B7FF]"
            />
            <h3 className={`text-sm font-semibold ${text}`}>
              Bill Payment Summary
            </h3>
          </div>

          <div className="ml-auto w-full max-w-md space-y-3">
            {billRows.map(([label, value], index) => (
              <div
                key={label}
                className={`flex items-center justify-between gap-4 ${
                  index === 2 ? `border-t pt-3 ${border}` : ""
                }`}
              >
                <span
                  className={`text-sm ${
                    index === 2
                      ? `font-semibold ${text}`
                      : muted
                  }`}
                >
                  {label}
                </span>

                <span
                  className={`text-sm tabular-nums ${
                    index === 2
                      ? "font-bold text-amber-600"
                      : text
                  }`}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Amount received */}
        <section
          className={`rounded-lg border p-4 sm:p-5 ${border}`}
        >
          <div className="mb-3 flex items-center gap-2">
            <ReceiptText
              size={17}
              className="text-[#3E439C] dark:text-[#B9B7FF]"
            />
            <h3 className={`text-sm font-semibold ${text}`}>
              Payment Details
            </h3>
          </div>

          <div
            className={`flex flex-wrap items-center justify-between gap-4 border-t pt-4 ${border}`}
          >
            <div>
              <p className={`text-sm ${muted}`}>Amount Received</p>
              <p className="mt-1 text-2xl font-bold text-[#3E439C] dark:text-[#B9B7FF]">
                {formatCurrency(payment.amount)}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <p className={`text-xs ${muted}`}>Receipt Status</p>
              <span
                className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
                  dark
                    ? "border-emerald-800 bg-emerald-950/40 text-emerald-300"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                Payment Recorded
              </span>
            </div>
          </div>

          <p className={`mt-3 text-xs ${muted}`}>
            This receipt reflects the payment record currently stored by
            the billing system.
          </p>
        </section>

        {/* Notes */}
        {payment.notes && (
          <section className={`border-t pt-4 ${border}`}>
            <h3 className={`mb-2 text-sm font-semibold ${text}`}>
              Notes
            </h3>
            <p className={`whitespace-pre-wrap text-sm ${muted}`}>
              {payment.notes}
            </p>
          </section>
        )}

   
      </article>


    </div>
  );
}

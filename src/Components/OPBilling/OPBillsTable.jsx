import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "../ui/table";

import { ReceiptText, Eye, FileText } from "lucide-react";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getPatientName = (bill) =>
  bill?.patient_name ?? bill?.patient?.name ?? "—";

const getPatientId = (bill) =>
  bill?.patient_id ?? bill?.patient?.patient_id ?? "—";

const getBillNumber = (bill) =>
  bill?.bill_number ?? bill?.id ?? "—";

const getTotal = (bill) => Number(bill?.total_amount ?? 0);

const getPaid = (bill) => Number(bill?.amount_paid ?? 0);

const getOutstanding = (bill) =>
  Number(
    bill?.outstanding_amount ??
      Math.max(0, getTotal(bill) - getPaid(bill))
  );

const getStatus = (bill) => {
  const status = String(
    bill?.payment_status ?? bill?.status ?? ""
  ).toLowerCase();

  if (status === "cancelled" || status === "canceled") {
    return "Cancelled";
  }

  if (status === "paid") return "Paid";

  if (
    status === "partially_paid" ||
    status === "partially paid" ||
    status === "partial"
  ) {
    return "Partially Paid";
  }

  if (status === "unpaid") return "Unpaid";

  const total = getTotal(bill);
  const paid = getPaid(bill);

  if (total > 0 && paid >= total) return "Paid";
  if (paid > 0 && paid < total) return "Partially Paid";

  return "Unpaid";
};

function StatusBadge({ status, dark }) {
  const styles = {
    Paid: dark
      ? "border-emerald-800 bg-emerald-950/40 text-emerald-300"
      : "border-emerald-200 bg-emerald-50 text-emerald-700",

    "Partially Paid": dark
      ? "border-amber-800 bg-amber-950/40 text-amber-300"
      : "border-amber-200 bg-amber-50 text-amber-700",

    Unpaid: dark
      ? "border-red-900 bg-red-950/40 text-red-300"
      : "border-red-200 bg-red-50 text-red-700",

    Cancelled: dark
      ? "border-slate-700 bg-slate-800 text-slate-400"
      : "border-slate-200 bg-slate-100 text-slate-500",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium ${
        styles[status] ?? styles.Unpaid
      }`}
    >
      {status}
    </span>
  );
}

export default function OPBillsTable({
  bills = [],
  dark = false,
  loading = false,
  emptyMessage = "No bills found.",
  onViewBill,
}) {
  const theme = {
    header: dark
      ? "border-slate-700 bg-slate-800/70 text-slate-300"
      : "border-slate-200 bg-slate-50/80 text-slate-600",

    row: dark
      ? "border-slate-800 hover:bg-slate-800/60"
      : "border-slate-100 hover:bg-[#F1F0FF]/50",

    primaryText: dark ? "text-slate-100" : "text-slate-800",
    secondaryText: dark ? "text-slate-400" : "text-slate-500",
    billNumber: dark ? "text-[#B9B7FF]" : "text-[#3E439C]",

    button: dark
      ? "border-slate-700 text-slate-200 hover:border-[#7775D1] hover:bg-[#303253] hover:text-[#D6D4FF]"
      : "border-slate-200 text-slate-700 hover:border-[#3E439C]/30 hover:bg-[#F1F0FF] hover:text-[#3E439C]",
  };

  const actionButtonClass = [
    "inline-flex h-8 items-center justify-center gap-1.5",
    "rounded-md border px-5 cursor-pointer ",
    "text-xs font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2",
    "focus-visible:ring-[#3E439C]/30",
    theme.button,
  ].join(" ");

  return (
    <div
      className={`w-full overflow-hidden rounded-lg border ${
        dark ? "border-slate-800" : "border-slate-200"
      }`}
    >
      <div className="w-full overflow-x-auto">
        <Table className="w-full min-w-[1050px] table-auto border-collapse">
          <TableHeader>
            <TableRow
              className={`h-12 border-b hover:bg-transparent ${theme.header}`}
            >
              <TableHead className="px-4 text-left text-xs font-semibold">
                Bill Number
              </TableHead>
              <TableHead className="px-4 text-left text-xs font-semibold">
                Bill Date
              </TableHead>
              <TableHead className="px-4 text-left text-xs font-semibold">
                Patient
              </TableHead>
              <TableHead className="px-4 text-left text-xs font-semibold">
                Patient ID / UHID
              </TableHead>
              <TableHead className="px-4 text-right text-xs font-semibold">
                Total Amount
              </TableHead>
              <TableHead className="px-4 text-right text-xs font-semibold">
                Paid
              </TableHead>
              <TableHead className="px-4 text-right text-xs font-semibold">
                Outstanding
              </TableHead>
              <TableHead className="px-4 text-left text-xs font-semibold">
                Status
              </TableHead>
              <TableHead className="px-4 text-right text-xs font-semibold">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow
                  key={`bill-skeleton-${index}`}
                  className={`h-[68px] border-b ${theme.row}`}
                >
                  {Array.from({ length: 9 }).map((_, cellIndex) => (
                    <TableCell
                      key={`bill-skeleton-cell-${cellIndex}`}
                      className="px-4 py-3"
                    >
                      <div
                        className={`h-3.5 animate-pulse rounded ${
                          cellIndex === 2 ? "w-28" : "w-16"
                        } ${
                          dark ? "bg-slate-700" : "bg-slate-200"
                        }`}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : bills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-48 px-4 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-full ${
                        dark ? "bg-slate-800" : "bg-[#F1F0FF]"
                      }`}
                    >
                      <ReceiptText
                        size={21}
                        className={
                          dark ? "text-[#D6D4FF]" : "text-[#3E439C]"
                        }
                      />
                    </div>

                    <p
                      className={`text-sm font-semibold ${theme.primaryText}`}
                    >
                      {emptyMessage}
                    </p>

                    <p className={`text-xs ${theme.secondaryText}`}>
                      Generated outpatient bills will appear here.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              bills.map((bill, index) => {
                const billNumber = getBillNumber(bill);
                const patientName = getPatientName(bill);
                const patientId = getPatientId(bill);
                const total = getTotal(bill);
                const paid = getPaid(bill);
                const outstanding = getOutstanding(bill);
                const status = getStatus(bill);

                return (
                  <TableRow
                    key={
                      bill?.id ??
                      bill?.bill_number ??
                      `${billNumber}-${index}`
                    }
                    className={`h-[68px] border-b transition-colors last:border-b-0 ${theme.row}`}
                  >
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText
                          size={16}
                          className={
                            dark ? "text-[#B9B7FF]" : "text-[#3E439C]"
                          }
                        />
                        <span
                          className={`whitespace-nowrap text-xs font-semibold ${theme.billNumber}`}
                        >
                          {billNumber}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell
                      className={`whitespace-nowrap px-4 py-3 text-xs ${theme.secondaryText}`}
                    >
                      {formatDate(bill?.bill_date ?? bill?.created_at)}
                    </TableCell>

                    <TableCell className="max-w-[180px] px-4 py-3">
                      <span
                        title={patientName}
                        className={`block truncate text-sm font-medium ${theme.primaryText}`}
                      >
                        {patientName}
                      </span>
                    </TableCell>

                    <TableCell
                      className={`whitespace-nowrap px-4 py-3 text-xs ${theme.secondaryText}`}
                    >
                      {patientId}
                    </TableCell>

                    <TableCell
                      className={`whitespace-nowrap px-4 py-3 text-right text-xs font-medium tabular-nums ${theme.primaryText}`}
                    >
                      {formatCurrency(total)}
                    </TableCell>

                    <TableCell
                      className={`whitespace-nowrap px-4 py-3 text-right text-xs tabular-nums ${theme.primaryText}`}
                    >
                      {formatCurrency(paid)}
                    </TableCell>

                    <TableCell
                      className={`whitespace-nowrap px-4 py-3 text-right text-xs font-medium tabular-nums ${
                        outstanding > 0
                          ? dark
                            ? "text-amber-300"
                            : "text-amber-700"
                          : theme.primaryText
                      }`}
                    >
                      {formatCurrency(outstanding)}
                    </TableCell>

                    <TableCell className="px-4 py-3">
                      <StatusBadge status={status} dark={dark} />
                    </TableCell>

                    <TableCell className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => onViewBill?.(bill)}
                          className={actionButtonClass}
                          aria-label={`View bill ${billNumber}`}
                        >
                          View
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
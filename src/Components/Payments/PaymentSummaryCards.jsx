
import {
  Banknote,
  CalendarDays,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { formatCurrency } from "./paymentUtils";

const cards = [
  {
    key: "total",
    label: "Total Payments Received",
    icon: Wallet,
    tone: "bg-[#F1F0FF] text-[#3E439C]",
  },
  {
    key: "cash",
    label: "Cash Collections",
    icon: Banknote,
    tone: "bg-emerald-50 text-emerald-700",
  },
  {
    key: "nonCash",
    label: "Non-Cash Collections",
    icon: ReceiptText,
    tone: "bg-sky-50 text-sky-700",
  },
  {
    key: "count",
    label: "Total Transactions",
    icon: CalendarDays,
    tone: "bg-amber-50 text-amber-700",
  },
];

export default function PaymentSummaryCards({
  payments = [],
  dark = false,
}) {
  const totals = payments.reduce(
    (acc, payment) => {
      const amount = Number(payment.amount) || 0;

      acc.total += amount;

      if (
        String(payment.payment_method || "").toLowerCase() === "cash"
      ) {
        acc.cash += amount;
      } else {
        acc.nonCash += amount;
      }

      return acc;
    },
    { total: 0, cash: 0, nonCash: 0 }
  );

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ key, label, icon: Icon, tone }) => (
        <section
          key={key}
          className={`min-w-0 border p-3 ${
            dark
              ? "border-slate-700 bg-[#191A2B]"
              : "border-slate-200 bg-white/70"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}
            >
              <Icon size={17} strokeWidth={1.8} />
            </span>

            <div className="min-w-0">
              <p
                className={`truncate text-xs font-medium ${
                  dark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                {label}
              </p>

              <p
                className={`mt-1 text-sm font-semibold ${
                  dark ? "text-slate-100" : "text-slate-900"
                }`}
              >
                {key === "count"
                  ? payments.length
                  : formatCurrency(totals[key])}
              </p>

            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

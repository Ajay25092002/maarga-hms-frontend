import { Search, X } from "lucide-react";

const inputClass = (dark) =>
  `h-10 w-full rounded-lg border px-3 text-sm outline-none transition focus:border-[#3E439C] focus:ring-2 focus:ring-[#3E439C]/15 ${
    dark
      ? "border-slate-700 bg-[#11121F] text-slate-100 placeholder:text-slate-500"
      : "border-slate-200 bg-white text-slate-800 placeholder:text-slate-400"
  }`;

export default function PaymentFilters({
  filters,
  onChange,
  onReset,
  dark,
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        dark
          ? "border-slate-700 bg-[#191A2B]"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
        {/* Search */}
        <label className="relative block min-w-0 sm:col-span-2 xl:col-span-1">
          <span className="sr-only">Search payments</span>

          <span
            className={`pointer-events-none absolute inset-y-0 left-3 flex items-center ${
              dark ? "text-slate-500" : "text-slate-400"
            }`}
          >
            <Search size={17} />
          </span>

          <input
            className={`${inputClass(dark)} pl-10`}
            value={filters.search}
            onChange={(event) =>
              onChange("search", event.target.value)
            }
            placeholder="Search patient, bill, receipt or reference"
          />
        </label>

        {/* Bill type */}
        <label className="block min-w-0">
          <span
            className={`mb-1 block text-xs font-medium ${
              dark ? "text-slate-400" : "text-slate-600"
            }`}
          >
            Bill type
          </span>

          <select
            className={inputClass(dark)}
            value={filters.bill_type}
            onChange={(event) =>
              onChange("bill_type", event.target.value)
            }
          >
            <option value="">All OP/IP</option>
            <option value="OP">OP</option>
            <option value="IP">IP</option>
          </select>
        </label>

        {/* Payment mode */}
        <label className="block min-w-0">
          <span
            className={`mb-1 block text-xs font-medium ${
              dark ? "text-slate-400" : "text-slate-600"
            }`}
          >
            Payment mode
          </span>

          <select
            className={inputClass(dark)}
            value={filters.payment_method}
            onChange={(event) =>
              onChange("payment_method", event.target.value)
            }
          >
            <option value="">All modes</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Card">Card</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cheque">Cheque</option>
          </select>
        </label>

        {/* From date */}
        <label className="block min-w-0">
          <span
            className={`mb-1 block text-xs font-medium ${
              dark ? "text-slate-400" : "text-slate-600"
            }`}
          >
            From date
          </span>

          <input
            type="date"
            className={inputClass(dark)}
            value={filters.date_from}
            onChange={(event) =>
              onChange("date_from", event.target.value)
            }
          />
        </label>

        {/* To date */}
        <label className="block min-w-0">
          <span
            className={`mb-1 block text-xs font-medium ${
              dark ? "text-slate-400" : "text-slate-600"
            }`}
          >
            To date
          </span>

          <input
            type="date"
            className={inputClass(dark)}
            value={filters.date_to}
            onChange={(event) =>
              onChange("date_to", event.target.value)
            }
          />
        </label>

        {/* Clear filters — same row on desktop */}
        <div className="flex items-end justify-end sm:col-span-2 xl:col-span-1">
          <button
            type="button"
            onClick={onReset}
            className={`inline-flex h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition ${
              dark
                ? "text-slate-300 hover:bg-slate-800"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <X size={15} />
            Clear filters
          </button>
        </div>
      </div>
    </div>
  );
}
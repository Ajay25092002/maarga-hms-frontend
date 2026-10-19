
import { ChevronLeft, ChevronRight } from "lucide-react";

function display(value, key) {
  if (value === null || value === undefined || value === "") return "—";

  const isAdmissionOrDischargeDate = /^(admission|discharge) date$/i.test(String(key || "").trim());

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) {
    const dateOnly = value.slice(0, 10);
    if (isAdmissionOrDischargeDate || /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = dateOnly.split("-").map(Number);
      return new Date(Date.UTC(year, month - 1, day, 12)).toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);

    return new Date(
      Date.UTC(year, month - 1, day, 12),
    ).toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
    });
  }

  if (
    typeof value === "number" &&
    /amount|paid|refunded|outstanding|deposit|quantity/i.test(String(key))
  ) {
    return value.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return String(value);
}

export default function ReportTable({
  items,
  total,
  page,
  pageSize,
  onPageChange,
  loading,
}) {
  const columns = items.length
    ? Object.keys(items[0]).filter((key) => key !== "report_date")
    : [];

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-700">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Report data
        </p>

        <p className="text-xs text-slate-500">
          {total.toLocaleString("en-IN")} record
          {total === 1 ? "" : "s"}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-left text-xs dark:divide-slate-700">
          <thead className="bg-[#F8F8FC] dark:bg-slate-800">
            <tr>
              {columns.map((key) => (
                <th
                  key={key}
                  className="whitespace-nowrap px-4 py-3 font-bold text-slate-600 dark:text-slate-300"
                >
                  {key}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td
                  colSpan={Math.max(columns.length, 1)}
                  className="px-4 py-12 text-center text-slate-500"
                >
                  Loading report data…
                </td>
              </tr>
            ) : items.length ? (
              items.map((item, index) => (
                <tr
                  key={`${index}-${item[columns[0]] ?? "row"}`}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50"
                >
                  {columns.map((key) => (
                    <td
                      key={key}
                      className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-200"
                    >
                      {display(item[key], key)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={Math.max(columns.length, 1)}
                  className="px-4 py-12 text-center text-slate-500"
                >
                  No records match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 dark:border-slate-700">
        <span className="text-xs text-slate-500">
          Page {page} of {pages}
        </span>

        <div className="flex gap-2">
          <button
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-3 text-xs disabled:opacity-40 dark:border-slate-700"
          >
            <ChevronLeft size={14} />
            Previous
          </button>

          <button
            disabled={page >= pages || loading}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-3 text-xs disabled:opacity-40 dark:border-slate-700"
          >
            Next
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

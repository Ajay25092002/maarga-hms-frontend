import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  AlertCircle,
  BedDouble,
  CalendarDays,
  CreditCard,
  Printer,
  ReceiptText,
  RefreshCw,
  UserRound,
} from "lucide-react";

import AppSidebar from "../Components/Layout/AppSidebar";
import TopNavbar from "../Components/Layout/TopNavbar";
import { useTheme } from "../Context/ThemeContext";

// Billing endpoints run on port 8001 by default.
// Override with VITE_API_BASE_URL.
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8001"
).replace(/\/$/, "");

const currency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDate = (value, includeTime = false) => {
  if (!value) return "—";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
};

const displayValue = (value, fallback = "—") =>
  value === null || value === undefined || value === "" ? fallback : value;

const getErrorMessage = (data, fallback) => {
  if (typeof data?.detail === "string") return data.detail;

  if (Array.isArray(data?.detail)) {
    return data.detail.map((item) => item.msg || "Invalid request").join("; ");
  }

  return fallback;
};

const getPatientName = (bill) =>
  bill?.patient_name ?? bill?.patient?.name ?? bill?.patient?.full_name ?? "—";

const getPatientId = (bill) =>
  bill?.patient_id ?? bill?.patient?.patient_id ?? "—";

const getPaid = (bill) => Number(bill?.amount_paid ?? 0);

const getTotal = (bill) => Number(bill?.total_amount ?? 0);

const getOutstanding = (bill) =>
  Number(
    bill?.outstanding_amount ?? Math.max(0, getTotal(bill) - getPaid(bill)),
  );

const getStatus = (bill) => {
  const status = String(
    bill?.payment_status ?? bill?.status ?? "",
  ).toLowerCase();

  if (status === "cancelled" || status === "canceled") {
    return "Cancelled";
  }

  if (
    status === "paid" ||
    (getTotal(bill) > 0 && getPaid(bill) >= getTotal(bill))
  ) {
    return "Paid";
  }

  if (
    status === "partially_paid" ||
    status === "partially paid" ||
    status === "partial" ||
    getPaid(bill) > 0
  ) {
    return "Partially Paid";
  }

  return "Unpaid";
};

/**
 * Resolves a service-group name from common API response shapes.
 *
 * If the API returns only a group ID, the backend must also return
 * the corresponding group name for the frontend to display it.
 */
const getServiceGroupName = (item) => {
  const candidates = [
    item?.service_group_name,
    item?.service_group,
    item?.group_name,
    item?.serviceGroupName,
    item?.service_group?.name,
    item?.service_group?.group_name,
    item?.group?.name,
    item?.group?.group_name,
    item?.service?.service_group_name,
    item?.service?.service_group,
    item?.service?.group_name,
    item?.service?.service_group?.name,
    item?.service?.group?.name,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }

    if (
      candidate &&
      typeof candidate === "object" &&
      typeof candidate.name === "string" &&
      candidate.name.trim()
    ) {
      return candidate.name.trim();
    }
  }

  return "—";
};

const getServiceName = (item) =>
  item?.service_name ??
  item?.name ??
  item?.service?.service_name ??
  item?.service?.name ??
  item?.description ??
  "Hospital Service";

function DetailField({ label, value, dark }) {
  return (
    <div className="min-w-0">
      <p
        className={`mb-1 text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}
      >
        {label}
      </p>

      <p
        className={`break-words text-sm font-medium ${
          dark ? "text-slate-100" : "text-slate-800"
        }`}
      >
        {displayValue(value)}
      </p>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, dark, border }) {
  return (
    <section
      className={`rounded-lg border p-4 sm:p-5 ${border} ${
        dark ? "bg-[#171827]" : "bg-white"
      }`}
    >
      <div className="mb-4 flex items-center gap-2">
        {Icon ? (
          <Icon size={17} className="text-[#3E439C] dark:text-[#B9B7FF]" />
        ) : null}

        <h2
          className={`text-sm font-semibold ${
            dark ? "text-slate-100" : "text-slate-800"
          }`}
        >
          {title}
        </h2>
      </div>

      {children}
    </section>
  );
}

export default function IPBillDetails() {
  const { billId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const dark = theme === "dark";

  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);

  const border = dark ? "border-slate-700" : "border-slate-200";
  const text = dark ? "text-slate-100" : "text-slate-800";
  const muted = dark ? "text-slate-400" : "text-slate-500";
  const surface = dark ? "bg-[#171827]" : "bg-white";

  const loadBill = useCallback(
    async (signal) => {
      if (!billId) {
        setError("Bill ID is missing.");
        setBill(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/bills/${encodeURIComponent(billId)}`,
          {
            method: "GET",
            credentials: "include",
            headers: { Accept: "application/json" },
            signal,
          },
        );

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              data,
              `Unable to load bill (HTTP ${response.status}).`,
            ),
          );
        }

        if (!data || typeof data !== "object" || Array.isArray(data)) {
          throw new Error("Invalid bill details returned by the server.");
        }

        if (String(data.bill_type ?? "").toUpperCase() !== "IP") {
          throw new Error("This bill is not identified as an inpatient bill.");
        }

        setBill(data);
      } catch (err) {
        if (err.name === "AbortError") return;

        console.error("Failed to load IP bill details:", err);
        setBill(null);
        setError(err.message || "Unable to load inpatient bill details.");
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [billId],
  );

  useEffect(() => {
    const controller = new AbortController();

    loadBill(controller.signal);

    return () => controller.abort();
  }, [loadBill, refreshKey]);

  const items = useMemo(
    () => (Array.isArray(bill?.items) ? bill.items : []),
    [bill],
  );

  const payments = useMemo(
    () => (Array.isArray(bill?.payments) ? bill.payments : []),
    [bill],
  );

  const subtotal = Number(
    bill?.subtotal ??
      items.reduce(
        (sum, item) =>
          sum +
          Number(
            item?.amount ??
              Number(item?.quantity ?? 0) * Number(item?.rate ?? 0),
          ),
        0,
      ),
  );

  const itemDiscount = items.reduce(
    (sum, item) => sum + Number(item?.discount_amount ?? 0),
    0,
  );

  const billDiscount = Number(bill?.discount_amount ?? 0);
  const total = getTotal(bill);
  const paid = getPaid(bill);
  const outstanding = getOutstanding(bill);
  const status = getStatus(bill);

  const statusClass = {
    Paid: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    "Partially Paid":
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    Unpaid:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
    Cancelled:
      "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400",
  }[status];

  const handlePrintPdf = async () => {
    if (!billId || !bill || pdfLoading) return;

    const printWindow = window.open("about:blank", "_blank");

    if (!printWindow) {
      window.alert(
        "Your browser blocked the PDF tab. Allow pop-ups and try again.",
      );
      return;
    }

    printWindow.document.title = "IP Bill PDF";
    printWindow.document.body.innerHTML =
      '<p style="font-family:Arial,sans-serif;padding:24px">Preparing your IP bill PDF...</p>';

    setPdfLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/bills/${encodeURIComponent(billId)}/ip-pdf`,
        {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/pdf" },
        },
      );

      if (!response.ok) {
        const contentType = response.headers.get("content-type") || "";

        let message = `Unable to generate IP PDF (HTTP ${response.status}).`;

        if (contentType.includes("application/json")) {
          message = getErrorMessage(
            await response.json().catch(() => null),
            message,
          );
        } else {
          const bodyText = await response.text().catch(() => "");

          if (bodyText) message = bodyText;
        }

        throw new Error(message);
      }

      if (
        !(response.headers.get("content-type") || "").includes(
          "application/pdf",
        )
      ) {
        throw new Error("The server did not return a PDF document.");
      }

      const blob = await response.blob();

      if (!blob.size) {
        throw new Error("The server returned an empty PDF.");
      }

      const pdfUrl = URL.createObjectURL(blob);
      printWindow.location.href = pdfUrl;

      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 10 * 60 * 1000);
    } catch (err) {
      console.error("Failed to open IP bill PDF:", err);
      printWindow.close();

      window.alert(
        err instanceof Error ? err.message : "Unable to open the IP bill PDF.",
      );
    } finally {
      setPdfLoading(false);
    }
  };

  const buttonClass = `inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium ${border} ${text} ${
    dark ? "hover:bg-slate-800" : "hover:bg-white"
  }`;

  return (
    <div
      className={`min-h-screen min-w-0 ${
        dark ? "bg-[#11121F]" : "bg-[#F6F6FC]"
      }`}
    >
      <AppSidebar />

      <div className="min-h-screen min-w-0 lg:ml-[260px]">
        <TopNavbar
          title="IP Bill Details"
          breadcrumb={[
            "Hospital Management",
            "Billing",
            "IP Bills",
            "Bill Details",
          ]}
        />

        <main className="min-w-0 px-4 py-5 sm:px-5 lg:px-6">
          <div className="mx-auto w-full max-w-[1200px] space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F1F0FF] dark:bg-[#292B49]">
                  <ReceiptText
                    size={20}
                    className="text-[#3E439C] dark:text-[#D6D4FF]"
                  />
                </div>

                <div>
                  <h1 className={`text-lg font-semibold ${text}`}>
                    IP Bill Details
                  </h1>

                  <p className={`mt-1 text-[13px] ${muted}`}>
                    View patient, admission, charges and payment details
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/ip-billing")}
                  className={buttonClass}
                >
                  <ArrowLeft size={16} />
                  Back to IP Bills
                </button>

                <button
                  type="button"
                  onClick={handlePrintPdf}
                  disabled={loading || !bill || Boolean(error) || pdfLoading}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-[#3E439C] px-4 text-sm font-semibold text-white hover:bg-[#323780] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pdfLoading ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Printer size={16} />
                  )}

                  {pdfLoading ? "Preparing PDF..." : "Print PDF"}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="space-y-4" aria-live="polite">
                <div className={`h-28 animate-pulse rounded-lg ${surface}`} />
                <div className={`h-48 animate-pulse rounded-lg ${surface}`} />
                <div className={`h-64 animate-pulse rounded-lg ${surface}`} />

                <p className={`text-sm ${muted}`}>Loading inpatient bill...</p>
              </div>
            ) : error || !bill ? (
              <div
                className={`rounded-lg border border-red-200 p-5 dark:border-red-900 ${surface}`}
              >
                <div className="flex items-start gap-3">
                  <AlertCircle
                    size={20}
                    className="mt-0.5 shrink-0 text-red-500"
                  />

                  <div>
                    <h2 className={`text-base font-semibold ${text}`}>
                      Unable to load IP Bill
                    </h2>

                    <p className={`mt-2 text-sm ${muted}`}>
                      {error || "Bill details are unavailable."}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setRefreshKey((current) => current + 1)}
                        className="inline-flex h-9 items-center gap-2 rounded-md bg-[#3E439C] px-4 text-sm font-medium text-white"
                      >
                        <RefreshCw size={14} />
                        Retry
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate("/ip-billing")}
                        className={buttonClass}
                      >
                        <ArrowLeft size={15} />
                        Back to IP Bills
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <article
                className={`space-y-5 rounded-lg border p-4 sm:p-6 ${border} ${surface}`}
              >
                <header
                  className={`flex flex-wrap items-start justify-between gap-4 border-b pb-5 ${border}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#F1F0FF] dark:bg-[#292B49]">
                      <ReceiptText
                        size={23}
                        className="text-[#3E439C] dark:text-[#D6D4FF]"
                      />
                    </div>

                    <div>
                      <h2 className={`text-lg font-bold ${text}`}>
                        INPATIENT BILL
                      </h2>

                      <p className={`mt-1 text-xs ${muted}`}>
                        Hospital billing statement
                      </p>

                      <p className={`mt-3 text-sm font-semibold ${text}`}>
                        Bill No:{" "}
                        {displayValue(bill.bill_number, bill.id ?? billId)}
                      </p>

                      <p className={`mt-1 text-xs ${muted}`}>
                        Patient ID: {getPatientId(bill)}
                      </p>
                      <p className={`mt-1 text-xs ${muted}`}>
                        IP Number: {displayValue(bill.ip_number)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-left sm:text-right">
                    <div>
                      <p className={`text-xs ${muted}`}>Bill Date</p>

                      <p className={`mt-1 text-sm font-medium ${text}`}>
                        {formatDate(bill.bill_date ?? bill.created_at)}
                      </p>
                    </div>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClass}`}
                    >
                      {status}
                    </span>
                  </div>
                </header>

                <SectionCard
                  title="Patient Information"
                  icon={UserRound}
                  dark={dark}
                  border={border}
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailField
                      label="Patient Name"
                      value={getPatientName(bill)}
                      dark={dark}
                    />

                    <DetailField
                      label="Patient ID / UHID"
                      value={getPatientId(bill)}
                      dark={dark}
                    />

                    <DetailField
                      label="Phone Number"
                      value={
                        bill.mobile ??
                        bill.patient_phone ??
                        bill.patient?.mobile
                      }
                      dark={dark}
                    />

                    <DetailField
                      label="Email"
                      value={bill.email ?? bill.patient?.email}
                      dark={dark}
                    />

                    <DetailField
                      label="Gender"
                      value={bill.gender ?? bill.patient?.gender}
                      dark={dark}
                    />

                    <DetailField
                      label="Date of Birth"
                      value={formatDate(
                        bill.date_of_birth ?? bill.patient?.date_of_birth,
                      )}
                      dark={dark}
                    />

                    <div className="sm:col-span-2 lg:col-span-3">
                      <DetailField
                        label="Address"
                        value={bill.address ?? bill.patient?.address}
                        dark={dark}
                      />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  title="Admission Information"
                  icon={BedDouble}
                  dark={dark}
                  border={border}
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailField
                      label="Admission Date"
                      value={formatDate(bill.admission_date)}
                      dark={dark}
                    />

                    <DetailField
                      label="Discharge Date"
                      value={formatDate(bill.discharge_date)}
                      dark={dark}
                    />

                    <DetailField
                      label="Department"
                      value={bill.department}
                      dark={dark}
                    />

                    <DetailField
                      label="Room Type"
                      value={
                        bill.room_type_name ??
                        bill.room_type ??
                        bill.room_type_id
                      }
                      dark={dark}
                    />

                    <DetailField
                      label="Bed Number"
                      value={bill.bed_number}
                      dark={dark}
                    />

                    <DetailField
                      label="Attending Doctor"
                      value={bill.doctor_name ?? bill.attending_doctor}
                      dark={dark}
                    />

                    <DetailField
                      label="Rate Category"
                      value={bill.rate_category || "General IPD"}
                      dark={dark}
                    />
                  </div>
                </SectionCard>

                <section>
                  <div className="mb-3 flex items-center gap-2">
                    <ReceiptText
                      size={17}
                      className="text-[#3E439C] dark:text-[#B9B7FF]"
                    />

                    <h2 className={`text-sm font-semibold ${text}`}>
                      Itemized Charges
                    </h2>
                  </div>

                  <div
                    className={`overflow-x-auto rounded-lg border ${border}`}
                  >
                    <table className="w-full min-w-[900px] border-collapse text-sm">
                      <thead>
                        <tr className={dark ? "bg-slate-800" : "bg-slate-50"}>
                          {[
                            "#",
                            "Service Group",
                            "Description",
                            "Service Date",
                            "Qty",
                            "Rate",
                            "Amount",
                            "Discount",
                            "Net Amount",
                          ].map((heading) => (
                            <th
                              key={heading}
                              className={`border-b px-3 py-3 text-xs font-semibold ${border} ${muted} ${
                                [
                                  "Qty",
                                  "Rate",
                                  "Amount",
                                  "Discount",
                                  "Net Amount",
                                ].includes(heading)
                                  ? "text-right"
                                  : "text-left"
                              }`}
                            >
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {items.length === 0 ? (
                          <tr>
                            <td
                              colSpan={9}
                              className={`px-3 py-8 text-center text-sm ${muted}`}
                            >
                              No itemized charges are available.
                            </td>
                          </tr>
                        ) : (
                          items.map((item, index) => {
                            const quantity = Number(item?.quantity ?? 0);
                            const rate = Number(item?.rate ?? 0);
                            const amount = Number(
                              item?.amount ?? quantity * rate,
                            );
                            const discountAmount = Number(
                              item?.discount_amount ?? 0,
                            );
                            const netAmount = Number(
                              item?.net_amount ??
                                Math.max(0, amount - discountAmount),
                            );

                            return (
                              <tr
                                key={
                                  item?.id ?? `${index}-${getServiceName(item)}`
                                }
                              >
                                <td
                                  className={`border-b px-3 py-3 text-xs ${border} ${muted}`}
                                >
                                  {index + 1}
                                </td>

                                <td
                                  className={`border-b px-3 py-3 ${border} ${text}`}
                                >
                                  {getServiceGroupName(item)}
                                </td>

                                <td
                                  className={`border-b px-3 py-3 ${border} ${text}`}
                                >
                                  {getServiceName(item)}
                                </td>

                                <td
                                  className={`border-b px-3 py-3 whitespace-nowrap ${border} ${text}`}
                                >
                                  {formatDate(item?.service_date)}
                                </td>

                                <td
                                  className={`border-b px-3 py-3 text-right tabular-nums ${border} ${text}`}
                                >
                                  {quantity}
                                </td>

                                <td
                                  className={`border-b px-3 py-3 text-right whitespace-nowrap tabular-nums ${border} ${text}`}
                                >
                                  {currency(rate)}
                                </td>

                                <td
                                  className={`border-b px-3 py-3 text-right whitespace-nowrap tabular-nums ${border} ${text}`}
                                >
                                  {currency(amount)}
                                </td>

                                <td
                                  className={`border-b px-3 py-3 text-right whitespace-nowrap tabular-nums ${border} ${text}`}
                                >
                                  {currency(discountAmount)}
                                </td>

                                <td
                                  className={`border-b px-3 py-3 text-right whitespace-nowrap font-medium tabular-nums ${border} ${text}`}
                                >
                                  {currency(netAmount)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="ml-auto w-full max-w-sm space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className={`text-sm ${muted}`}>Subtotal</span>
                    <span className={`text-sm ${text}`}>
                      {currency(subtotal)}
                    </span>
                  </div>

                  {itemDiscount > 0 && (
                    <div className="flex items-center justify-between gap-4">
                      <span className={`text-sm ${muted}`}>Item Discounts</span>
                      <span className={`text-sm ${text}`}>
                        {currency(itemDiscount)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4">
                    <span className={`text-sm ${muted}`}>Bill Discount</span>
                    <span className={`text-sm ${text}`}>
                      {currency(billDiscount)}
                    </span>
                  </div>

                  <div
                    className={`flex items-center justify-between gap-4 border-t pt-3 ${border}`}
                  >
                    <span className={`text-sm font-semibold ${text}`}>
                      Final Bill Total
                    </span>

                    <span className="text-base font-bold text-[#3E439C] dark:text-[#B9B7FF]">
                      {currency(total)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className={`text-sm ${muted}`}>Amount Paid</span>
                    <span className={`text-sm ${text}`}>{currency(paid)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className={`text-sm font-semibold ${text}`}>
                      Outstanding Balance
                    </span>

                    <span
                      className={`text-sm font-bold ${
                        outstanding > 0 ? "text-amber-600" : "text-emerald-600"
                      }`}
                    >
                      {currency(outstanding)}
                    </span>
                  </div>
                </section>

                <SectionCard
                  title="Payment History"
                  icon={CreditCard}
                  dark={dark}
                  border={border}
                >
                  {payments.length === 0 ? (
                    <p className={`text-sm ${muted}`}>
                      No payments have been recorded for this bill.
                    </p>
                  ) : (
                    <div
                      className={`overflow-x-auto rounded-md border ${border}`}
                    >
                      <table className="w-full min-w-[800px] table-fixed border-collapse text-sm">
                        <colgroup>
                          <col className="w-[16%]" />
                          <col className="w-[24%]" />
                          <col className="w-[14%]" />
                          <col className="w-[18%]" />
                          <col className="w-[14%]" />
                          <col className="w-[14%]" />
                        </colgroup>

                        <thead
                          className={dark ? "bg-slate-800" : "bg-slate-50"}
                        >
                          <tr>
                            {[
                              "Receipt No.",
                              "Payment Date",
                              "Method",
                              "Reference",
                              "Amount",
                              "Notes",
                            ].map((heading) => (
                              <th
                                key={heading}
                                className={`border-b px-3 py-3 text-xs font-semibold ${border} ${muted} ${
                                  heading === "Amount"
                                    ? "text-right"
                                    : "text-left"
                                }`}
                              >
                                {heading}
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody>
                          {payments.map((payment, index) => (
                            <tr
                              key={
                                payment?.id ??
                                `${payment?.receipt_number ?? "receipt"}-${index}`
                              }
                            >
                              <td
                                className={`border-b px-3 py-3 whitespace-nowrap ${border} ${text}`}
                              >
                                {displayValue(payment?.receipt_number)}
                              </td>

                              <td
                                className={`border-b px-3 py-3 whitespace-nowrap ${border} ${text}`}
                              >
                                {formatDate(payment?.payment_date, true)}
                              </td>

                              <td
                                className={`border-b px-3 py-3 break-words ${border} ${text}`}
                              >
                                {displayValue(payment?.payment_method)}
                              </td>

                              <td
                                className={`border-b px-3 py-3 break-words ${border} ${text}`}
                              >
                                {displayValue(payment?.reference_number)}
                              </td>

                              <td
                                className={`border-b px-3 py-3 text-right whitespace-nowrap tabular-nums ${border} ${text}`}
                              >
                                {currency(payment?.amount)}
                              </td>

                              <td
                                className={`border-b px-3 py-3 break-words ${border} ${text}`}
                              >
                                {displayValue(payment?.notes)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </SectionCard>

                {bill.notes ? (
                  <section className={`border-t pt-4 ${border}`}>
                    <h2 className={`mb-2 text-sm font-semibold ${text}`}>
                      Bill Notes
                    </h2>

                    <p className={`whitespace-pre-wrap text-sm ${muted}`}>
                      {bill.notes}
                    </p>
                  </section>
                ) : null}

                <footer
                  className={`border-t pt-4 text-center text-xs ${border} ${muted}`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <CalendarDays size={13} />
                    This is a computer-generated inpatient billing statement.
                  </div>
                </footer>
              </article>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

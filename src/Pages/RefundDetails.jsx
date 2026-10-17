import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  AlertCircle,
  CalendarDays,
  FileText,
  IndianRupee,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  UserRound,
  Wallet,
} from "lucide-react";

import AppSidebar from "../Components/Layout/AppSidebar";
import TopNavbar from "../Components/Layout/TopNavbar";
import { useTheme } from "../Context/ThemeContext";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const REFUNDS_API = `${API_BASE_URL}/api/payment-refunds`;

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function dateTimeText(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getErrorMessage(data, fallback) {
  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.message === "string") return data.message;

  if (Array.isArray(data?.detail)) {
    return data.detail
      .map((item) => item.msg)
      .filter(Boolean)
      .join(", ");
  }

  return fallback;
}

async function apiRequest(url) {
  const response = await fetch(url, { credentials: "include" });
  const responseText = await response.text();
  let data = {};

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { message: responseText };
    }
  }

  if (!response.ok) {
    throw new Error(
      getErrorMessage(data, `Request failed (${response.status})`),
    );
  }

  return data;
}

function DetailItem({ label, value, emphasize = false, wide = false }) {
  return (
    <div className={`min-w-0 ${wide ? "sm:col-span-2" : ""}`}>
      <p className="text-xs font-medium text-[#667085] dark:text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1.5 break-words text-[13px] ${
          emphasize
            ? "font-semibold text-[#3E439C] dark:text-[#D6D4FF]"
            : "text-[#101828] dark:text-slate-100"
        }`}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <section className="overflow-hidden rounded-lg border border-[#DFE4F2] bg-white dark:border-[#34364F] dark:bg-[#1B1C2B]">
      <div className="flex items-center gap-2.5 border-b border-[#E6EAF2] px-4 py-3.5 dark:border-[#34364F] sm:px-5">
        <Icon size={17} className="text-[#3E439C] dark:text-[#D6D4FF]" />
        <h2 className="text-sm font-semibold text-[#101828] dark:text-slate-100">
          {title}
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 p-4 sm:grid-cols-2 sm:p-5">
        {children}
      </div>
    </section>
  );
}

export default function RefundDetails() {
  const { refundId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const dark = theme === "dark";

  const [refund, setRefund] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRefund = useCallback(async () => {
    if (!refundId) {
      setError("A refund ID was not provided.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await apiRequest(
        `${REFUNDS_API}/${encodeURIComponent(refundId)}`,
      );
      const record = data?.refund ?? data?.data ?? data;

      if (!record || typeof record !== "object" || Array.isArray(record)) {
        throw new Error("The API returned an invalid refund record.");
      }

      setRefund(record);
    } catch (err) {
      setError(err.message || "Unable to load refund details.");
      setRefund(null);
    } finally {
      setLoading(false);
    }
  }, [refundId]);

  useEffect(() => {
    fetchRefund();
  }, [fetchRefund]);

  const refundNumber =
    refund?.refund_number || `REF-${refund?.id ?? refundId ?? "—"}`;

  const text = dark ? "text-slate-100" : "text-slate-800";
  const muted = dark ? "text-slate-400" : "text-slate-500";

  return (
    <div className="min-h-screen min-w-0 bg-[#F6F6FC] dark:bg-[#11121F]">
      <AppSidebar />

      <div className="min-h-screen min-w-0 md:ml-[72px] lg:ml-[260px]">
        <TopNavbar
          title="Refund Details"
          breadcrumb={[
            "Hospital Management",
            "Billing",
            "Payment Refunds",
            refundNumber,
          ]}
        />

        <main className="min-w-0 px-4 py-5 sm:px-5 lg:px-6">
          <div className="mx-auto w-full ">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F1F0FF] dark:bg-[#292B49]">
                  <RotateCcw
                    size={20}
                    className="text-[#3E439C] dark:text-[#D6D4FF]"
                  />
                </div>
                <div>
                  <h1 className={`text-lg font-semibold ${text}`}>
                    Refund Details
                  </h1>
                  <p className={`mt-1 text-[13px] ${muted}`}>
                    Refund reference: {refundNumber}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate("/payment-refunds")}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-[#DDE3EF] bg-white px-3.5 text-[13px] font-medium text-[#344054] transition hover:border-[#C9C8F2] hover:bg-[#F1F0FF] hover:text-[#3E439C] dark:border-[#34364F] dark:bg-[#1B1C2B] dark:text-slate-200 dark:hover:bg-[#292B49]"
              >
                <ArrowLeft size={15} />
                Back to Refunds
              </button>
            </div>

            {loading ? (
              <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-[#DFE4F2] bg-white dark:border-[#34364F] dark:bg-[#1B1C2B]">
                <div className="flex items-center gap-2 text-[13px] text-[#667085] dark:text-slate-400">
                  <LoaderCircle size={18} className="animate-spin" />
                  Loading refund details...
                </div>
              </div>
            ) : error ? (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-white p-5 dark:border-red-900 dark:bg-[#1B1C2B]"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle
                    size={20}
                    className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-[#101828] dark:text-slate-100">
                      Unable to load refund
                    </h2>
                    <p className="mt-1 text-[13px] text-red-600 dark:text-red-400">
                      {error}
                    </p>
                    <button
                      type="button"
                      onClick={fetchRefund}
                      className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-[#DDE3EF] px-3.5 text-[13px] font-medium text-[#344054] hover:bg-[#F1F0FF] hover:text-[#3E439C] dark:border-[#34364F] dark:text-slate-200 dark:hover:bg-[#292B49]"
                    >
                      <RefreshCw size={14} />
                      Try again
                    </button>
                  </div>
                </div>
              </div>
            ) : refund ? (
              <>
                <section className="mb-5 overflow-hidden rounded-lg border border-[#DFE4F2] bg-white dark:border-[#34364F] dark:bg-[#1B1C2B]">
                  <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#F1F0FF] dark:bg-[#292B49]">
                        <IndianRupee
                          size={21}
                          className="text-[#3E439C] dark:text-[#D6D4FF]"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[13px] ${muted}`}>
                          Refunded Amount
                        </p>
                        <p className="mt-1 break-words text-2xl font-semibold text-[#3E439C] dark:text-[#D6D4FF]">
                          {money(refund.refund_amount)}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-md border border-[#E4E2FF] bg-[#F8F7FF] px-3 py-2 dark:border-[#34364F] dark:bg-[#202135]">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-[#657BA2] dark:text-slate-400">
                        Refund Number
                      </p>
                      <p className="mt-1 text-[13px] font-semibold text-[#3E439C] dark:text-[#D6D4FF]">
                        {refundNumber}
                      </p>
                    </div>
                  </div>
                </section>

                <div className="space-y-5">
                  <SectionCard title="Refund Information" icon={FileText}>
                    <DetailItem label="Refund Number" value={refundNumber} />
                    <DetailItem
                      label="Refund Date"
                      value={dateTimeText(
                        refund.created_at ??
                          refund.refund_date ??
                          refund.created_on,
                      )}
                    />
                    <DetailItem
                      label="Refund Method"
                      value={refund.refund_method}
                    />
                    <DetailItem
                      label="Refund Amount"
                      value={money(refund.refund_amount)}
                      emphasize
                    />
                    <DetailItem
                      label="Reason"
                      value={refund.reason}
                      wide
                    />
                    <DetailItem
                      label="Notes"
                      value={refund.notes}
                      wide
                    />
                  </SectionCard>

                  <SectionCard title="Related Bill" icon={Wallet}>
                    <DetailItem label="Bill ID" value={refund.bill_id} />
                    <DetailItem
                      label="Bill Number"
                      value={refund.bill_number}
                    />
                    <DetailItem label="Original Bill Amount" value={refund.bill_total != null ? money(refund.bill_total) : "—"} />
                    <DetailItem label="Total Paid" value={refund.total_paid != null ? money(refund.total_paid) : "—"} />
                    <DetailItem label="Total Refunded" value={refund.total_refunded != null ? money(refund.total_refunded) : "—"} />
                    <DetailItem label="Outstanding Balance" value={refund.outstanding_amount != null ? money(refund.outstanding_amount) : "—"} />
                  </SectionCard>

                  <SectionCard title="Patient Information" icon={UserRound}>
                    <DetailItem
                      label="Patient Name"
                      value={refund.patient_name ?? refund.patient?.name ?? refund.patient?.full_name}
                    />
                    <DetailItem
                      label="Patient ID / UHID"
                      value={
                        refund.patient_uhid ??
                        refund.patient_id ??
                        refund.uhid ??
                        refund.patient_identifier ??
                        refund.patient?.patient_id
                      }
                    />
                    <DetailItem
                      label="Mobile Number"
                      value={refund.mobile ?? refund.patient_mobile ?? refund.patient?.mobile}
                    />
                  </SectionCard>

                  <SectionCard title="Audit Information" icon={CalendarDays}>
                    <DetailItem
                      label="Recorded By"
                      value={
                        refund.created_by_name ??
                        refund.recorded_by ??
                        refund.created_by
                      }
                    />
                    <DetailItem
                      label="Created At"
                      value={dateTimeText(refund.created_at)}
                    />
                    <DetailItem label="Refund Record ID" value={refund.id} />
                  </SectionCard>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-[#DFE4F2] bg-white p-5 text-[13px] text-[#667085] dark:border-[#34364F] dark:bg-[#1B1C2B] dark:text-slate-400">
                No refund details were returned by the server.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

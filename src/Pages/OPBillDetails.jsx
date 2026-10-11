import { useEffect, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  Printer,
  ReceiptText,
  CreditCard,
  AlertCircle,
  LoaderCircle,
} from "lucide-react";

import logo from "../assets/logo.png";

import AppSidebar from "../Components/Layout/AppSidebar";

import TopNavbar from "../Components/Layout/TopNavbar";

import { useTheme } from "../Context/ThemeContext";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "");

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

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",

    month: "short",

    year: "numeric",

    hour: "2-digit",

    minute: "2-digit",
  });
};

const getStatus = (bill) => {
  const status = String(
    bill?.payment_status ?? bill?.status ?? "",
  ).toLowerCase();

  if (status === "cancelled" || status === "canceled") {
    return "Cancelled";
  }

  const total = Number(bill?.total_amount ?? 0);

  const paid = Number(bill?.amount_paid ?? 0);

  if (status === "paid" || (total > 0 && paid >= total)) {
    return "Paid";
  }

  if (
    status === "partially_paid" ||
    status === "partially paid" ||
    status === "partial" ||
    paid > 0
  ) {
    return "Partially Paid";
  }

  return "Unpaid";
};

function StatusBadge({ status }) {
  const styles = {
    Paid: "border-emerald-200 bg-emerald-50 text-emerald-700",

    "Partially Paid": "border-amber-200 bg-amber-50 text-amber-700",

    Unpaid: "border-red-200 bg-red-50 text-red-700",

    Cancelled: "border-slate-200 bg-slate-100 text-slate-600",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${
        styles[status] ?? styles.Unpaid
      }`}
    >
      {status}
    </span>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-slate-500">{label}</p>

      <p className="mt-1 break-words text-sm font-medium text-slate-800">
        {value || "—"}
      </p>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }) {
  return (
    <section className="bill-section overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="bill-section-heading flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        <Icon size={18} className="text-[#3E439C]" />

        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
      </div>

      <div className="bill-section-content p-5">{children}</div>
    </section>
  );
}

export default function OPBillDetails() {
  const { billId } = useParams();

  const navigate = useNavigate();

  const { theme } = useTheme();

  const dark = theme === "dark";

  const [bill, setBill] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchBill() {
      setLoading(true);

      setError("");

      setBill(null);

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/bills/${encodeURIComponent(billId)}`,

          {
            method: "GET",

            credentials: "include",

            headers: { Accept: "application/json" },

            signal: controller.signal,
          },
        );

        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            typeof result?.detail === "string"
              ? result.detail
              : `Unable to load bill (${response.status}).`,
          );
        }

        const billData = result?.bill ?? result;

        setBill({
          ...billData,

          items: billData?.items ?? result?.items ?? [],

          payments:
            billData?.payments ??
            billData?.payment_history ??
            result?.payments ??
            result?.payment_history ??
            [],
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Failed to load bill details:", err);

          setError(err.message || "Unable to load bill details.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    if (billId) {
      fetchBill();
    } else {
      setLoading(false);

      setError("Bill ID is missing.");
    }

    return () => controller.abort();
  }, [billId]);

  // Use the backend-generated OP PDF instead of window.print() on the React page.
  const handlePrint = async () => {
    if (!billId || !bill || pdfLoading) return;

    // Open synchronously to avoid popup blockers while the API request runs.
    const printWindow = window.open("about:blank", "_blank");
    if (!printWindow) {
      window.alert(
        "Your browser blocked the PDF tab. Allow pop-ups and try again.",
      );
      return;
    }

    printWindow.document.title = "OP Bill PDF";
    printWindow.document.body.innerHTML =
      '<p style="font-family:Arial,sans-serif;padding:24px">Preparing your OP bill PDF...</p>';

    setPdfLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/bills/${encodeURIComponent(billId)}/op-pdf`,
        {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/pdf" },
        },
      );

      if (!response.ok) {
        const contentType = response.headers.get("content-type") || "";
        let message = `Unable to generate OP PDF (HTTP ${response.status}).`;
        if (contentType.includes("application/json")) {
          const data = await response.json().catch(() => null);
          message = typeof data?.detail === "string" ? data.detail : message;
        } else {
          const responseText = await response.text().catch(() => "");
          if (responseText) message = responseText;
        }
        throw new Error(message);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/pdf")) {
        throw new Error("The server did not return a PDF document.");
      }

      const blob = await response.blob();
      if (!blob.size) throw new Error("The server returned an empty PDF.");

      const pdfUrl = URL.createObjectURL(blob);
      printWindow.location.href = pdfUrl;
      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 10 * 60 * 1000);
    } catch (err) {
      console.error("Failed to open OP bill PDF:", err);
      printWindow.close();
      window.alert(
        err instanceof Error ? err.message : "Unable to open the OP bill PDF.",
      );
    } finally {
      setPdfLoading(false);
    }
  };

  const goBack = () => navigate("/op-billing");

  const pageBackground = dark ? "bg-[#11121F]" : "bg-[#F6F6FC]";

  if (loading || error || !bill) {
    return (
      <div className={`min-h-screen ${pageBackground}`}>
        <AppSidebar />

        <div className="min-h-screen min-w-0 md:ml-[72px] lg:ml-[260px]">
          <div className="no-print">
            <TopNavbar
              title="Bill Details"
              breadcrumb={[
                "Hospital Management",

                "Billing",

                "OP Bills",

                "Bill Details",
              ]}
            />
          </div>

          <main className="min-w-0 px-4 py-6 sm:px-5 lg:px-6">
            <div className="mx-auto max-w-3xl">
              <button
                type="button"
                onClick={goBack}
                className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-[#3E439C] hover:underline"
              >
                <ArrowLeft size={16} />
                Back to OP Bills
              </button>

              <div className="rounded-xl border border-slate-200 bg-white p-8">
                {loading ? (
                  <div className="flex items-center justify-center gap-3 py-8 text-sm text-slate-500">
                    <LoaderCircle size={20} className="animate-spin" />
                    Loading bill details...
                  </div>
                ) : (
                  <div className="text-center">
                    <AlertCircle
                      size={30}
                      className="mx-auto mb-3 text-red-500"
                    />

                    <h2 className="font-semibold text-slate-800">
                      Unable to load bill
                    </h2>

                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                      {error || "The requested bill could not be found."}
                    </p>

                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="mt-5 rounded-lg bg-[#3E439C] px-4 py-2 text-sm font-medium text-white hover:bg-[#323780]"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const billNumber = bill.bill_number ?? bill.id ?? billId;

  const patientName = bill.patient_name ?? bill.patient?.name ?? "—";

  const patientId = bill.patient_id ?? bill.patient?.patient_id ?? "—";

  const mobile = bill.mobile ?? bill.patient?.mobile ?? "—";

  const email = bill.email ?? bill.patient?.email ?? "—";

  const address = bill.address ?? bill.patient?.address ?? "—";

  const gender = bill.gender ?? bill.patient?.gender ?? "—";

  const dateOfBirth = bill.date_of_birth ?? bill.patient?.date_of_birth;

  const billDate = bill.bill_date ?? bill.created_at;

  const total = Number(bill.total_amount ?? 0);

  const paid = Number(bill.amount_paid ?? 0);

  const outstanding = Number(
    bill.outstanding_amount ?? Math.max(0, total - paid),
  );

  const status = getStatus(bill);

  const items = Array.isArray(bill.items) ? bill.items : [];

  const payments = Array.isArray(bill.payments) ? bill.payments : [];

  return (
    <div className={`min-h-screen min-w-0 ${pageBackground}`}>
      {/* Fixed/sidebar layout matches the OP Bills page */}

      <div className="no-print">
        <AppSidebar />
      </div>

      <div className="min-h-screen min-w-0 md:ml-[72px] lg:ml-[260px]">
        {/* Navbar stays within the main content area */}

        <div className="no-print">
          <TopNavbar
            title="Bill Details"
            breadcrumb={[
              "Hospital Management",

              "Billing",

              "OP Bills",

              "Bill Details",
            ]}
          />
        </div>

        <main className="bill-page-content min-w-0 px-4 py-5 sm:px-5 lg:px-6">
          <div className="mx-auto w-full max-w-[1220px]">
            {/* Page actions */}

            <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-[#3E439C]/30 hover:bg-[#F1F0FF] hover:text-[#3E439C]"
              >
                <ArrowLeft size={16} />
                Back to OP Bills
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-lg bg-[#3E439C] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#323780]"
              >
                <Printer size={16} />
                Print Bill
              </button>
            </div>

            {/* Only this element is printed */}

            <main id="printable-bill" className="space-y-4">
              {/* Bill header and patient information */}

              <section className="bill-section rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
                <div className="flex flex-col justify-between gap-5 border-b-2 border-[#3E439C] pb-5 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F1F0FF]">
                        <img
                          src={logo}
                          alt="Hospital Logo"
                          className="h-full w-full object-contain"
                        />
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#3E439C]">
                          Hospital Management System
                        </p>

                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                          OUTPATIENT BILL
                        </h1>
                      </div>
                    </div>

                    <p className="mt-3 text-sm text-slate-500">
                      Official billing statement
                    </p>
                  </div>

                  <div className="sm:min-w-[190px] sm:text-right">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Bill Number
                    </p>

                    <p className="mt-1 break-words text-xl font-bold text-[#3E439C]">
                      {billNumber}
                    </p>

                    <p className="mt-3 text-xs text-slate-500">Bill Date</p>

                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {formatDate(billDate)}
                    </p>

                    <div className="mt-3 sm:flex sm:justify-end">
                      <StatusBadge status={status} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 pt-6 md:grid-cols-2">
                  <div>
                    <h2 className="mb-4 border-b border-slate-200 pb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Patient Information
                    </h2>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <DetailItem label="Patient Name" value={patientName} />

                      <DetailItem label="Patient ID / UHID" value={patientId} />

                      <DetailItem label="Mobile Number" value={mobile} />

                      <DetailItem label="Email" value={email} />

                      <DetailItem label="Gender" value={gender} />

                      <DetailItem
                        label="Date of Birth"
                        value={formatDate(dateOfBirth)}
                      />

                      <div className="sm:col-span-2">
                        <DetailItem label="Address" value={address} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="mb-4 border-b border-slate-200 pb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                      Billing Information
                    </h2>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <DetailItem label="Department" value={bill.department} />

                      <DetailItem label="Doctor" value={bill.doctor_name} />

                      <DetailItem
                        label="Registration Number"
                        value={bill.registration_number}
                      />

                      <DetailItem
                        label="Rate Category"
                        value={bill.rate_category}
                      />

                      <DetailItem
                        label="Patient Category"
                        value={bill.patient_category}
                      />

                      <DetailItem label="Bill Type" value={bill.bill_type} />

                      {bill.notes && (
                        <div className="sm:col-span-2">
                          <DetailItem label="Notes" value={bill.notes} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Itemized charges */}

              <SectionCard title="Itemized Charges" icon={ReceiptText}>
                <div className="overflow-x-auto">
                  <table className="bill-table w-full min-w-[650px] border-collapse text-left">
                    <thead>
                      <tr>
                        {/* <th className="w-10 text-center">#</th> */}

                        <th>Service Date</th>

                        <th>Service Description</th>

                        <th className="text-right">Rate (₹)</th>

                        <th className="text-right">Qty</th>

                        <th className="text-right">Amount (₹)</th>

                        <th className="text-right">Discount (₹)</th>

                        <th className="text-right">Net Amount (₹)</th>
                      </tr>
                    </thead>

                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="py-8 text-center text-sm text-slate-500"
                          >
                            No bill items are available.
                          </td>
                        </tr>
                      ) : (
                        items.map((item, index) => {
                          const amount = Number(item.amount ?? 0);

                          const discount = Number(item.discount_amount ?? 0);

                          const netAmount = Number(
                            item.net_amount ?? amount - discount,
                          );

                          return (
                            <tr key={item.id ?? `${item.description}-${index}`}>
                              <td className="text-center text-slate-500">
                                {index + 1}
                              </td>

                              <td>{formatDate(item.service_date)}</td>

                              <td>
                                <p className="font-medium text-slate-800">
                                  {item.description ?? "—"}
                                </p>

                                {item.service_code && (
                                  <p className="mt-1 text-xs text-slate-500">
                                    Code: {item.service_code}
                                  </p>
                                )}
                              </td>

                              <td className="text-right">
                                {formatCurrency(item.rate)}
                              </td>

                              <td className="text-right">
                                {Number(item.quantity ?? 0)}
                              </td>

                              <td className="text-right">
                                {formatCurrency(amount)}
                              </td>

                              <td className="text-right">
                                {formatCurrency(discount)}
                              </td>

                              <td className="text-right font-semibold">
                                {formatCurrency(netAmount)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex justify-end">
                  <div className="w-full space-y-3 sm:max-w-[350px]">
                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-slate-500">Subtotal</span>

                      <span className="font-medium text-slate-800">
                        {formatCurrency(bill.subtotal ?? total)}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-slate-500">Bill Discount</span>

                      <span className="font-medium text-slate-800">
                        {formatCurrency(bill.discount_amount)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 border-t-2 border-slate-800 pt-3">
                      <span className="text-base font-bold text-slate-900">
                        Total Amount
                      </span>

                      <span className="text-xl font-bold text-[#3E439C]">
                        {formatCurrency(total)}
                      </span>
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Payment summary and payment history */}

              <SectionCard title="Payment Summary" icon={CreditCard}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-medium text-slate-500">
                      Total Bill Amount
                    </p>

                    <p className="mt-2 text-lg font-bold text-slate-900">
                      {formatCurrency(total)}
                    </p>
                  </div>

                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-medium text-emerald-700">
                      Amount Received
                    </p>

                    <p className="mt-2 text-lg font-bold text-emerald-800">
                      {formatCurrency(paid)}
                    </p>
                  </div>

                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-medium text-amber-700">
                      Balance Due
                    </p>

                    <p className="mt-2 text-lg font-bold text-amber-800">
                      {formatCurrency(outstanding)}
                    </p>
                  </div>
                </div>

                {payments.length > 0 && (
                  <div className="mt-6">
                    <h3 className="mb-3 text-sm font-semibold text-slate-800">
                      Payment History
                    </h3>

                    <div className="overflow-x-auto">
                      <table className="bill-table w-full min-w-[500px] border-collapse text-left">
                        <thead>
                          <tr>
                            <th>Payment Date</th>

                            <th>Payment Method</th>

                            <th>Reference Number</th>

                            <th className="text-right">Amount (₹)</th>
                          </tr>
                        </thead>

                        <tbody>
                          {payments.map((payment, index) => (
                            <tr key={payment.id ?? index}>
                              <td>
                                {formatDateTime(
                                  payment.payment_date ?? payment.created_at,
                                )}
                              </td>

                              <td>{payment.payment_method ?? "—"}</td>

                              <td>{payment.reference_number ?? "—"}</td>

                              <td className="text-right font-medium">
                                {formatCurrency(payment.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </SectionCard>

              {/* Bill footer */}

              <footer className="rounded-xl border border-slate-200 bg-white px-5 py-5">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      Payment Status
                    </p>

                    <div className="mt-2">
                      <StatusBadge status={status} />
                    </div>

                    <p className="mt-3 text-xs text-slate-500">
                      Outstanding balance: {formatCurrency(outstanding)}
                    </p>
                  </div>

                  <div className="flex flex-col justify-end sm:items-end">
                    <div className="w-48 border-t border-slate-300 pt-2 text-center">
                      <p className="text-xs font-medium text-slate-600">
                        Authorized Signature
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-200 pt-4 text-center">
                  <p className="text-xs text-slate-500">
                    This bill reflects the billing information recorded in the
                    hospital management system.
                  </p>

                  <p className="mt-1 text-[11px] text-slate-400">
                    Bill Number: {billNumber}
                  </p>
                </div>
              </footer>
            </main>
          </div>
        </main>
      </div>
    </div>
  );
}

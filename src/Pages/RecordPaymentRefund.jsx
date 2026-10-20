import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  IndianRupee,
  LoaderCircle,
  ReceiptText,
  Search,
  Wallet,
  X,
} from "lucide-react";

import AppSidebar from "../Components/Layout/AppSidebar";
import TopNavbar from "../Components/Layout/TopNavbar";
import { useTheme } from "../Context/ThemeContext";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001"
).replace(/\/+$/, "");

const REFUNDS_API = `${API_BASE_URL}/api/payment-refunds`;
const BILLS_API = `${API_BASE_URL}/api/bills`;

const METHODS = ["Cash", "Card", "UPI", "Bank Transfer", "Cheque", "Other"];

const inputClass =
  "h-[42px] w-full rounded-md border border-[#DFE4F2] bg-white px-3.5 text-[13px] text-[#101828] outline-none placeholder:text-[#8A9AB8] focus:border-[#3E439C] focus:ring-1 focus:ring-[#3E439C]/15 dark:border-[#34364F] dark:bg-[#1B1C2B] dark:text-slate-100 dark:placeholder:text-slate-500";

function money(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
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

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

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

function Field({ label, required, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-medium text-[#344054] dark:text-slate-300">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {children}

      {hint && (
        <p className="text-xs text-[#667085] dark:text-slate-400">{hint}</p>
      )}
    </div>
  );
}

function normalizeBill(bill) {
  return {
    ...bill,
    id: bill.id ?? bill.bill_id,
    bill_number: bill.bill_number ?? `Bill #${bill.id ?? bill.bill_id}`,
    bill_type: String(bill.bill_type ?? "").toUpperCase(),
    patient_name: bill.patient_name ?? bill.name ?? "Unknown patient",
    mobile: bill.mobile ?? bill.patient_mobile ?? "",
    patient_identifier: bill.patient_id ?? bill.patient_uhid ?? "",
    total_amount: Number(bill.total_amount ?? bill.bill_total ?? 0),
    total_paid: Number(bill.total_payments ?? bill.total_paid ?? bill.amount_paid ?? 0),
    total_refunded: Number(bill.total_refunds ?? bill.total_refunded ?? 0),
    outstanding_amount: Number(bill.outstanding_amount ?? 0),
    bill_date: bill.bill_date ?? bill.created_at ?? null,
    discharge_date: bill.discharge_date ?? null,
  };
}

function getBillResults(data) {
  const results = Array.isArray(data)
    ? data
    : (data?.items ?? data?.results ?? data?.bills ?? data?.data ?? []);
  return Array.isArray(results)
    ? results
        .map(normalizeBill)
        .filter(
          (bill) =>
            bill.id != null &&
            bill.total_amount > 0 &&
            bill.total_paid >= bill.total_amount &&
            bill.total_refunded <= 0 &&
            (bill.bill_type !== "IP" || Boolean(bill.discharge_date)),
        )
    : [];
}

function BillSearchDropdown({
  value,
  onSelect,
  onClear,
  selectedBill,
  disabled,
  dark,
}) {
  const containerRef = useRef(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!open) return;

    const term = query.trim();

    if (term.length < 2) {
      setResults([]);
      setSearchError("");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      setSearchError("");

      try {
        const params = new URLSearchParams({
          search: term,
          status: "Paid",
          page: "1",
          page_size: "100",
        });

        const data = await apiRequest(`${BILLS_API}?${params}`);

        if (!cancelled) {
          setResults(getBillResults(data));
        }
      } catch (err) {
        if (!cancelled) {
          setResults([]);
          setSearchError(
            err.message ||
              "Unable to search bills. Check the bills API endpoint.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [query, open]);

  const handleSelect = (bill) => {
    onSelect(bill);
    setQuery("");
    setResults([]);
    setOpen(false);
    setSearchError("");
  };

  return (
    <div ref={containerRef} className="relative">
      {selectedBill ? (
        <div
          className={`rounded-md border p-3 ${
            dark
              ? "border-[#34364F] bg-[#202135]"
              : "border-[#DFE4F2] bg-[#F8F8FE]"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#3E439C] dark:text-[#D6D4FF]">
                Bill: {selectedBill.bill_number}
              </p>

              <p className="mt-1 truncate text-[13px] font-medium text-[#101828] dark:text-slate-100">
                {selectedBill.patient_name}
              </p>

              <p className="mt-1 text-xs text-[#667085] dark:text-slate-400">
                {selectedBill.mobile || "No mobile number"}
                {selectedBill.patient_identifier
                  ? ` · Patient ID: ${selectedBill.patient_identifier}`
                  : ""}
              </p>

              <p className="mt-1 text-xs text-[#667085] dark:text-slate-400">
                {selectedBill.bill_type ? `${selectedBill.bill_type} · ` : ""}
                {formatDate(selectedBill.bill_date)}
              </p>

              <p className="mt-2 text-[13px] font-semibold text-[#101828] dark:text-slate-100">
                Bill amount: {money(selectedBill.total_amount)}
              </p>
            </div>

            <button
              type="button"
              disabled={disabled}
              onClick={onClear}
              aria-label="Change selected bill"
              className="rounded-md p-1.5 text-[#667085] hover:bg-[#ECEBFA] hover:text-[#3E439C] disabled:opacity-50 dark:hover:bg-[#292B49]"
            >
              <X size={17} />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#657BA2]"
            />

            <input
              type="text"
              value={query}
              disabled={disabled}
              onFocus={() => setOpen(true)}
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") setOpen(false);
              }}
              placeholder="Search bill number, patient name, patient ID or mobile"
              className={`${inputClass} pl-9 pr-9`}
              autoComplete="off"
              aria-expanded={open}
              aria-label="Search bills"
            />

            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#657BA2]"
            />
          </div>

          {open && (
            <div className="absolute z-30 mt-1.5 max-h-[320px] w-full overflow-y-auto rounded-md border border-[#DFE4F2] bg-white shadow-lg dark:border-[#34364F] dark:bg-[#1B1C2B]">
              {query.trim().length < 2 ? (
                <p className="px-3.5 py-3 text-[13px] text-[#667085] dark:text-slate-400">
                  Type at least 2 characters to search bills.
                </p>
              ) : loading ? (
                <div className="flex items-center gap-2 px-3.5 py-4 text-[13px] text-[#667085] dark:text-slate-400">
                  <LoaderCircle size={16} className="animate-spin" />
                  Searching bills...
                </div>
              ) : searchError ? (
                <div className="px-3.5 py-3 text-[13px] text-red-600 dark:text-red-400">
                  {searchError}
                </div>
              ) : results.length === 0 ? (
                <p className="px-3.5 py-3 text-[13px] text-[#667085] dark:text-slate-400">
                  No matching bills found.
                </p>
              ) : (
                results.map((bill) => (
                  <button
                    key={bill.id}
                    type="button"
                    onClick={() => handleSelect(bill)}
                    className="block w-full border-b border-[#EEF0F6] px-3.5 py-3 text-left last:border-b-0 hover:bg-[#F1F0FF] dark:border-[#34364F] dark:hover:bg-[#292B49]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#3E439C] dark:text-[#D6D4FF]">
                          {bill.bill_number} · {bill.bill_type}
                        </p>

                        <p className="mt-1 truncate text-[13px] font-medium text-[#101828] dark:text-slate-100">
                          {bill.patient_name}
                        </p>

                        <p className="mt-1 text-xs text-[#667085] dark:text-slate-400">
                          {bill.mobile || "No mobile number"}
                          {bill.patient_identifier ? ` · Patient ID: ${bill.patient_identifier}` : ""}
                        </p>

                        <p className="mt-1 text-xs text-[#667085] dark:text-slate-400">
                          {formatDate(bill.bill_date)}
                        </p>
                      </div>

                      <p className="shrink-0 text-[13px] font-semibold text-[#101828] dark:text-slate-100">
                        {money(bill.total_amount)}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </>
      )}

      <input type="hidden" name="bill_id" value={value || ""} />
    </div>
  );
}

export default function RecordPaymentRefund() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const dark = theme === "dark";

  const text = dark ? "text-slate-100" : "text-slate-800";
  const muted = dark ? "text-slate-400" : "text-slate-500";

  const [form, setForm] = useState({
    bill_id: "",
    refund_amount: "",
    refund_method: "Cash",
    reason: "",
    notes: "",
  });

  const [selectedBill, setSelectedBill] = useState(null);
  const [balance, setBalance] = useState(null);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
    setSuccess("");
  };

  const selectBill = async (bill) => {
    setSelectedBill(bill);
    setForm((current) => ({
      ...current,
      bill_id: String(bill.id),
      refund_amount: "",
    }));
    setBalance(null);
    setError("");
    setSuccess("");

    setCheckingBalance(true);

    try {
      const data = await apiRequest(
        `${REFUNDS_API}/bills/${encodeURIComponent(bill.id)}/balance`,
      );

      const result = data?.balance ?? data?.bill ?? data;

      const nextBalance = {
        bill_total: Number(result.bill_total ?? result.total_amount ?? bill.total_amount ?? 0),
        total_paid: Number(result.total_paid ?? bill.total_paid ?? 0),
        outstanding_amount: Number(result.outstanding_amount ?? bill.outstanding_amount ?? 0),
        total_refunded: Number(
          result.total_refunded ?? result.refunded_amount ?? 0,
        ),
        bill_type: String(result.bill_type ?? bill.bill_type ?? "").toUpperCase(),
        deposit_balance: Number(result.deposit_balance ?? 0),
        refundable_balance: Number(result.refundable_balance ?? result.remaining_balance ?? result.balance ?? 0),
      };

      setBalance(nextBalance);

      if (nextBalance.refundable_balance <= 0) {
        setError("This bill has no remaining refundable amount.");
      }
    } catch (err) {
      setError(err.message || "Unable to retrieve bill refund balance.");
    } finally {
      setCheckingBalance(false);
    }
  };

  const clearSelectedBill = () => {
    setSelectedBill(null);
    setBalance(null);
    setForm((current) => ({
      ...current,
      bill_id: "",
      refund_amount: "",
    }));
    setError("");
    setSuccess("");
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const billId = Number(form.bill_id);
    const amount = Number(form.refund_amount);

    if (!selectedBill || !Number.isInteger(billId) || billId <= 0) {
      setError("Search for and select a bill first.");
      return;
    }

    if (!balance) {
      setError("The selected bill refund balance has not been verified.");
      return;
    }

    if (balance.refundable_balance <= 0) {
      setError("This bill has no remaining refundable amount.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Refund amount must be greater than zero.");
      return;
    }

    if (amount > balance.refundable_balance) {
      setError(
        `Refund amount cannot exceed ${money(balance.refundable_balance)}.`,
      );
      return;
    }

    if (!form.reason.trim()) {
      setError("Please enter a reason for the refund.");
      return;
    }

    setSaving(true);

    try {
      await apiRequest(REFUNDS_API, {
        method: "POST",
        body: JSON.stringify({
          bill_id: billId,
          refund_amount: amount,
          refund_method: form.refund_method,
          reason: form.reason.trim(),
          notes: form.notes.trim() || null,
        }),
      });

      setSuccess("Refund recorded successfully.");

      window.setTimeout(() => {
        navigate("/payment-refunds", {
          state: { refundRecorded: true },
        });
      }, 800);
    } catch (err) {
      setError(err.message || "Unable to record the refund.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen min-w-0 bg-[#F6F6FC] dark:bg-[#11121F]">
      <AppSidebar />

      <div className="min-h-screen min-w-0 md:ml-[72px] lg:ml-[260px]">
        <TopNavbar
          title="Record Refund"
          breadcrumb={[
            "Hospital Management",
            "Billing",
            "Payment Refunds",
            "Record Refund",
          ]}
        />

        <main className="min-w-0 px-4 py-5 sm:px-5 lg:px-6">
          <div className="mx-auto w-full ">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F1F0FF] dark:bg-[#292B49]">
                <ReceiptText
                  size={20}
                  className="text-[#3E439C] dark:text-[#D6D4FF]"
                />
              </div>

              <div>
                <h1 className={`text-lg font-semibold ${text}`}>
                  Record Payment Refund
                </h1>
                <p className={`mt-1 text-[13px] ${muted}`}>
                  Select a bill and record a refund against that bill
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/payment-refunds")}
              className={`mb-4 inline-flex h-9 items-center gap-2 rounded-md border border-[#DFE4F2] bg-white px-3.5 text-[13px] font-medium ${text} transition hover:bg-[#F1F0FF] dark:border-[#34364F] dark:bg-[#1B1C2B] dark:hover:bg-[#292B49]`}
            >
              <ArrowLeft size={15} />
              Back to Refunds
            </button>

            <form
              onSubmit={submit}
              className="overflow-visible rounded-lg border border-[#DFE4F2] bg-white dark:border-[#34364F] dark:bg-[#1B1C2B]"
            >
              <div className="rounded-t-lg border-b border-[#E6EAF2] px-4 py-3.5 dark:border-[#34364F] sm:px-5">
                <h2 className={`text-base font-semibold ${text}`}>
                  Refund Information
                </h2>
                <p className={`mt-1 text-[13px] ${muted}`}>
                  OP refunds use the amount paid. For IP bills, only the deposit balance (payment above the bill total) is refundable.
                </p>
              </div>

              <div className="space-y-5 p-4 sm:p-5">
                {error && (
                  <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
                    <AlertCircle size={17} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-[13px] text-emerald-700">
                    <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
                    <span>{success}</span>
                  </div>
                )}

                <Field
                  label="Select Bill"
                  required
                  hint="Search by bill number, patient name, patient ID or mobile number."
                >
                  <BillSearchDropdown
                    value={form.bill_id}
                    selectedBill={selectedBill}
                    onSelect={selectBill}
                    onClear={clearSelectedBill}
                    disabled={saving || checkingBalance}
                    dark={dark}
                  />
                </Field>

                {checkingBalance && (
                  <div className="flex items-center gap-2 text-[13px] text-[#667085] dark:text-slate-400">
                    <LoaderCircle size={16} className="animate-spin" />
                    Loading bill refund balance...
                  </div>
                )}

                {balance && (
                  <section className="rounded-lg border border-[#DFE4F2] bg-[#F8F8FE] p-3.5 dark:border-[#34364F] dark:bg-[#202135]">
                    <div className="mb-3 flex items-center gap-2">
                      <Wallet
                        size={17}
                        className="text-[#3E439C] dark:text-[#D6D4FF]"
                      />
                      <h3 className={`text-[13px] font-semibold ${text}`}>
                        Bill Refund Summary
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                      <div>
                        <p className={`text-xs ${muted}`}>Original Bill Amount</p>
                        <p className={`mt-1 text-sm font-semibold ${text}`}>{money(balance.bill_total)}</p>
                      </div>
                      <div>
                        <p className={`text-xs ${muted}`}>Total Paid</p>
                        <p className={`mt-1 text-sm font-semibold ${text}`}>{money(balance.total_paid)}</p>
                      </div>
                      <div>
                        <p className={`text-xs ${muted}`}>Outstanding</p>
                        <p className={`mt-1 text-sm font-semibold ${text}`}>{money(balance.outstanding_amount)}</p>
                      </div>
                      <div>
                        <p className={`text-xs ${muted}`}>Already Refunded</p>
                        <p className={`mt-1 text-sm font-semibold ${text}`}>
                          {money(balance.total_refunded)}
                        </p>
                      </div>

                      <div>
                        <p className={`text-xs ${muted}`}>
                          {balance.bill_type === "IP" ? "Refundable Deposit Balance" : "Refundable Balance"}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#3E439C] dark:text-[#D6D4FF]">
                          {money(balance.refundable_balance)}
                        </p>
                        {balance.bill_type === "IP" && (
                          <p className={`mt-1 text-xs ${muted}`}>
                            Only the amount paid above the IP bill total can be refunded.
                          </p>
                        )}
                      </div>
                    </div>
                  </section>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="Refund Amount (₹)" required>
                    <div className="relative">
                      <IndianRupee
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#657BA2]"
                      />
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        max={balance?.refundable_balance ?? undefined}
                        value={form.refund_amount}
                        onChange={(event) =>
                          update("refund_amount", event.target.value)
                        }
                        className={`${inputClass} pl-9`}
                        placeholder="Enter refund amount"
                        required
                        disabled={
                          !balance ||
                          balance.refundable_balance <= 0 ||
                          checkingBalance ||
                          saving
                        }
                      />
                    </div>
                    {balance && (
                      <p className={`text-xs ${muted}`}>
                        {balance.bill_type === "IP" ? "Maximum refundable deposit" : "Maximum refundable"}: {money(balance.refundable_balance)}
                      </p>
                    )}
                  </Field>

                  <Field label="Refund Method" required>
                    <select
                      value={form.refund_method}
                      onChange={(event) =>
                        update("refund_method", event.target.value)
                      }
                      className={inputClass}
                      required
                      disabled={saving}
                    >
                      {METHODS.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="Reason for Refund" required>
                  <input
                    type="text"
                    maxLength={1000}
                    value={form.reason}
                    onChange={(event) => update("reason", event.target.value)}
                    className={inputClass}
                    placeholder="Enter refund reason"
                    required
                    disabled={saving}
                  />
                </Field>

                <Field label="Additional Notes">
                  <textarea
                    value={form.notes}
                    onChange={(event) => update("notes", event.target.value)}
                    className={`${inputClass} h-auto py-2.5`}
                    rows={3}
                    maxLength={2000}
                    placeholder="Add any additional notes (optional)"
                    disabled={saving}
                  />
                </Field>

                <div className="rounded-md border border-[#E6EAF2] bg-[#FAFAFE] p-3 text-[12px] leading-5 text-[#667085] dark:border-[#34364F] dark:bg-[#202135] dark:text-slate-400">
                  This records the refund in the billing system. The actual
                  transfer of money must be completed separately.
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 rounded-b-lg border-t border-[#E6EAF2] px-4 py-3 dark:border-[#34364F] sm:flex-row sm:justify-end sm:px-5">
                <button
                  type="button"
                  onClick={() => navigate("/payment-refunds")}
                  disabled={saving}
                  className="h-9 rounded-md border border-[#DDE3EF] px-4 text-[13px] font-medium text-[#344054] transition hover:bg-slate-50 disabled:opacity-50 dark:border-[#34364F] dark:text-slate-200 dark:hover:bg-[#292B49]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    checkingBalance ||
                    !selectedBill ||
                    !balance ||
                    balance.refundable_balance <= 0
                  }
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#3E439C] px-4 text-[13px] font-semibold text-white transition hover:bg-[#323781] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <LoaderCircle size={15} className="animate-spin" />
                      Recording...
                    </>
                  ) : (
                    <>
                      <ReceiptText size={15} />
                      Record Refund
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

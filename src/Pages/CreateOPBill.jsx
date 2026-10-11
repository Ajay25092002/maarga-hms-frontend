import { useCallback, useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import AppSidebar from "../Components/Layout/AppSidebar";

import TopNavbar from "../Components/Layout/TopNavbar";

import { useTheme } from "../Context/ThemeContext";
import Loader from "../Components/Common/Loader";
import FullPageLoader from "../Components/Common/FullPageLoader";
import { useToast } from "../Components/Common/useToast";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const today = () => {
  const now = new Date();

  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

  return local.toISOString().slice(0, 10);
};

const makeItem = () => ({
  id: `${Date.now()}-${Math.random()}`,

  description: "",

  quantity: "1",

  rate: "",
});

const currency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",

    currency: "INR",

    minimumFractionDigits: 2,

    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const patientName = (patient) => patient?.name?.trim() || "—";

export default function CreateOPBill() {
  const navigate = useNavigate();

  const { theme } = useTheme();
  const { showToast } = useToast();

  const dark = theme === "dark";

  const [patients, setPatients] = useState([]);

  const [patientsLoading, setPatientsLoading] = useState(true);

  const [patientsError, setPatientsError] = useState("");

  const [patientQuery, setPatientQuery] = useState("");

  const [selectedPatient, setSelectedPatient] = useState(null);

  const [showPatientResults, setShowPatientResults] = useState(false);

  const [billDate, setBillDate] = useState(today());

  const [items, setItems] = useState([makeItem()]);

  const [discount, setDiscount] = useState("0");

  const [notes, setNotes] = useState("");

  const [showPreview, setShowPreview] = useState(false);

  const [notice, setNotice] = useState("");

  const [noticeType, setNoticeType] = useState("error");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [savedBill, setSavedBill] = useState(null);

  const text = dark ? "text-slate-100" : "text-slate-800";

  const muted = dark ? "text-slate-400" : "text-slate-500";

  const border = dark ? "border-slate-700" : "border-slate-200";

  const inputClass = `h-10 w-full min-w-0 rounded-md border px-3 text-sm outline-none transition focus:border-[#3E439C] focus:ring-2 focus:ring-[#3E439C]/10 ${
    dark
      ? "border-slate-700 bg-[#171827] text-slate-100 placeholder:text-slate-500"
      : "border-slate-200 bg-white text-slate-800 placeholder:text-slate-400"
  }`;

  const labelClass = `mb-2 block text-[13px] font-medium ${
    dark ? "text-slate-300" : "text-slate-600"
  }`;

  const loadPatients = useCallback(
    async (signal) => {
      setPatientsLoading(true);

      setPatientsError("");

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/patients?page=1&page_size=100`,

          {
            credentials: "include",

            headers: { Accept: "application/json" },

            signal,
          },
        );

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            data?.detail || "Unable to load registered patients.",
          );
        }

        const records = Array.isArray(data) ? data : data?.items;

        if (!Array.isArray(records)) {
          throw new Error("Unexpected response from the patients API.");
        }

        setPatients(records);
      } catch (error) {
        if (error.name === "AbortError") return;

        const message = error.message || "Unable to load patients.";
        setPatientsError(message);
        showToast({
          type: "error",
          title: "Unable to load patients",
          message,
          duration: 6000,
        });
      } finally {
        if (!signal?.aborted) setPatientsLoading(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    const controller = new AbortController();

    loadPatients(controller.signal);

    return () => controller.abort();
  }, [loadPatients]);

  const filteredPatients = useMemo(() => {
    const query = patientQuery.trim().toLowerCase();

    if (!query) return patients.slice(0, 8);

    return patients

      .filter((patient) => {
        const searchable = [
          patientName(patient),

          patient.patient_id,

          patient.registration_number,

          patient.mobile,
        ];

        return searchable.some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(query),
        );
      })

      .slice(0, 8);
  }, [patients, patientQuery]);

  const calculations = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      const quantity = Math.max(0, Number(item.quantity) || 0);
      const rate = Math.max(0, Number(item.rate) || 0);
      return sum + quantity * rate;
    }, 0);

    const safeDiscount = Math.min(subtotal, Math.max(0, Number(discount) || 0));
    const total = Math.max(0, subtotal - safeDiscount);

    return { subtotal, discount: safeDiscount, total };
  }, [items, discount]);

  const updateItem = (id, field, value) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );

    setNotice("");

    setNoticeType("error");
  };

  const selectPatient = (patient) => {
    setSelectedPatient(patient);

    setPatientQuery(patientName(patient));

    setShowPatientResults(false);

    setNotice("");

    setNoticeType("error");
  };

  const addItem = () => {
    setItems((current) => [...current, makeItem()]);
  };

  const removeItem = (id) => {
    setItems((current) =>
      current.length === 1
        ? [makeItem()]
        : current.filter((item) => item.id !== id),
    );
  };

  const validateForm = () => {
    if (!selectedPatient) {
      setNotice("Please select a registered patient.");
      setNoticeType("error");
      showToast({
        type: "warning",
        title: "Patient required",
        message: "Please select a registered patient.",
      });
      return false;
    }

    if (!billDate) {
      setNotice("Please select a bill date.");
      setNoticeType("error");
      showToast({
        type: "warning",
        title: "Bill date required",
        message: "Please select a bill date.",
      });
      return false;
    }

    const completedItems = items.filter((item) => item.description.trim());

    if (completedItems.length === 0) {
      setNotice("Please add at least one service.");
      setNoticeType("error");
      showToast({
        type: "warning",
        title: "Service required",
        message: "Please add at least one service.",
      });
      return false;
    }

    const hasInvalidItem = completedItems.some(
      (item) =>
        Number(item.quantity) <= 0 ||
        item.quantity === "" ||
        item.rate === "" ||
        Number(item.rate) < 0,
    );

    if (hasInvalidItem) {
      setNotice("Check every service description, quantity, and rate.");
      setNoticeType("error");
      showToast({
        type: "warning",
        title: "Check service details",
        message: "Check every service description, quantity, and rate.",
      });
      return false;
    }

    if (Number(discount) < 0 || Number(discount) > calculations.subtotal) {
      setNotice("Discount must be between zero and the subtotal.");
      setNoticeType("error");
      showToast({
        type: "warning",
        title: "Invalid discount",
        message: "Discount must be between zero and the subtotal.",
      });
      return false;
    }

    if (calculations.total <= 0) {
      setNotice("The bill total must be greater than zero.");
      setNoticeType("error");
      showToast({
        type: "warning",
        title: "Invalid bill total",
        message: "The bill total must be greater than zero.",
      });
      return false;
    }

    return true;
  };

  const handleGenerateBill = async (event) => {
    event.preventDefault();

    if (isSubmitting || savedBill) return;
    if (!validateForm()) return;

    const completedItems = items.filter((item) => item.description.trim());

    const payload = {
      bill_type: "OP",
      patient_id: selectedPatient.patient_id,
      // The backend schema expects a datetime, not only a date string.
      bill_date: `${billDate}T00:00:00`,
      discount_amount: Number(discount || 0),
      notes: notes.trim() || null,
      items: completedItems.map((item) => ({
        description: item.description.trim(),
        quantity: Number(item.quantity),
        rate: Number(item.rate),
        discount_amount: 0,
      })),
    };

    setIsSubmitting(true);
    setNotice("");
    setNoticeType("error");

    try {
      const response = await fetch(`${API_BASE_URL}/api/bills`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const detail = data?.detail;
        const message = Array.isArray(detail)
          ? detail.map((item) => item.msg || "Invalid request").join("; ")
          : typeof detail === "string"
            ? detail
            : "Unable to save the bill. Please check the details and try again.";
        throw new Error(message);
      }

      setSavedBill(data);
      setShowPreview(true);
      setNotice(
        `Bill created successfully${data?.bill_number ? `: ${data.bill_number}` : ""}.`,
      );
      setNoticeType("success");
      showToast({
        type: "success",
        title: "OP bill created",
        message: `Bill ${data?.bill_number ? `${data.bill_number} ` : ""}was saved successfully.`,
      });
    } catch (error) {
      setNotice(
        error.message ||
          "Unable to connect to the billing server. Check the API URL and try again.",
      );
      setNoticeType("error");
      showToast({
        type: "error",
        title: "Bill creation failed",
        message:
          error instanceof TypeError
            ? "Unable to connect to the billing server. Check the API URL and try again."
            : error.message || "Unable to save the bill. Please try again.",
        duration: 6000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen min-w-0 bg-[#F6F6FC] dark:bg-[#11121F]">
      <FullPageLoader show={isSubmitting} />

      <AppSidebar />

      <div className="min-h-screen min-w-0 md:ml-[72px] lg:ml-[260px]">
        <TopNavbar
          title="Create OP Bill"
          breadcrumb={[
            "Hospital Management",

            "Billing",

            "OP Bills",

            "Create Bill",
          ]}
        />

        <main className="min-w-0 px-4 py-5 sm:px-5 lg:px-6">
          <div className="mx-auto w-full max-w-[1200px]">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F1F0FF] dark:bg-[#292B49]">
                  <ReceiptText
                    size={20}
                    className="text-[#3E439C] dark:text-[#D6D4FF]"
                  />
                </div>

                <div>
                  <h1 className={`text-lg font-semibold ${text}`}>
                    Create OP Bill
                  </h1>

                  <p className={`mt-1 text-[13px] ${muted}`}>
                    Enter patient and service details
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate("/op-billing")}
                className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium ${border} ${text} ${
                  dark ? "hover:bg-slate-800" : "hover:bg-white"
                }`}
              >
                <ArrowLeft size={15} />
                Back to OP Bills
              </button>
            </div>

            <form onSubmit={handleGenerateBill} className="space-y-7">
              {/* Patient details */}

              <section className={`border-b pb-6 ${border}`}>
                <div className="mb-4 flex items-center gap-2">
                  <UserRound size={17} className="text-[#3E439C]" />

                  <h2 className={`text-sm font-semibold ${text}`}>
                    Patient Details
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="relative">
                    <label className={labelClass}>Search Patient *</label>

                    <div className="relative">
                      <Search
                        size={16}
                        className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`}
                      />

                      <input
                        value={patientQuery}
                        onChange={(event) => {
                          setPatientQuery(event.target.value);

                          setSelectedPatient(null);

                          setShowPatientResults(true);
                        }}
                        onFocus={() => setShowPatientResults(true)}
                        placeholder="Name, patient ID or mobile"
                        className={`${inputClass} pl-9 pr-9`}
                        autoComplete="off"
                      />

                      <ChevronDown
                        size={15}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 ${muted}`}
                      />
                    </div>

                    {showPatientResults && (
                      <div
                        className={`absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-md border shadow-lg ${border} ${
                          dark ? "bg-[#171827]" : "bg-white"
                        }`}
                      >
                        {patientsLoading ? (
                          <div
                            className={`flex items-center gap-2 p-3 text-sm ${muted}`}
                          >
                            <Loader
                              variant="button"
                              size="sm"
                              message="Loading patients..."
                            />
                          </div>
                        ) : patientsError ? (
                          <div className="p-3 text-sm text-red-500">
                            <p>{patientsError}</p>

                            <button
                              type="button"
                              onClick={() => loadPatients()}
                              className="mt-2 font-semibold underline"
                            >
                              Retry
                            </button>
                          </div>
                        ) : filteredPatients.length === 0 ? (
                          <p className={`p-3 text-sm ${muted}`}>
                            No matching patients found.
                          </p>
                        ) : (
                          filteredPatients.map((patient) => (
                            <button
                              key={patient.patient_id}
                              type="button"
                              onClick={() => selectPatient(patient)}
                              className={`block w-full border-b px-3 py-2.5 text-left last:border-0 ${border} ${
                                dark
                                  ? "hover:bg-slate-800"
                                  : "hover:bg-[#F1F0FF]"
                              }`}
                            >
                              <span
                                className={`block text-sm font-medium ${text}`}
                              >
                                {patientName(patient)}
                              </span>

                              <span className={`mt-1 block text-xs ${muted}`}>
                                {patient.patient_id} · {patient.mobile}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>Patient ID / UHID</label>

                    <div className={`${inputClass} flex items-center`}>
                      {selectedPatient?.patient_id || "Select a patient"}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Mobile Number</label>

                    <div className={`${inputClass} flex items-center`}>
                      {selectedPatient?.mobile || "—"}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Patient Name</label>

                    <div className={`${inputClass} flex items-center`}>
                      {selectedPatient ? patientName(selectedPatient) : "—"}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="billDate" className={labelClass}>
                      Bill Date *
                    </label>

                    <div className="relative">
                      <CalendarDays
                        size={16}
                        className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`}
                      />

                      <input
                        id="billDate"
                        type="date"
                        value={billDate}
                        onChange={(event) => setBillDate(event.target.value)}
                        required
                        className={`${inputClass} pl-9`}
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Service entries */}

              <section>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className={`text-sm font-semibold ${text}`}>
                      Services & Charges
                    </h2>

                    <p className={`mt-1 text-xs ${muted}`}>
                      Service rates are entered manually until the pricing
                      catalogue is connected.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-[#3E439C] px-3 text-sm font-medium text-white hover:bg-[#323780]"
                  >
                    <Plus size={15} />
                    Add Service
                  </button>
                </div>

                <div className={`overflow-x-auto rounded-md border ${border}`}>
                  <table className="w-full min-w-[700px] text-sm">
                    <thead
                      className={
                        dark
                          ? "bg-slate-800/70 text-slate-300"
                          : "bg-slate-50 text-slate-600"
                      }
                    >
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-semibold">
                          Service Description
                        </th>

                        <th className="w-28 px-3 py-3 text-right text-xs font-semibold">
                          Quantity
                        </th>

                        <th className="w-36 px-3 py-3 text-right text-xs font-semibold">
                          Rate (₹)
                        </th>

                        <th className="w-36 px-3 py-3 text-right text-xs font-semibold">
                          Amount
                        </th>

                        <th className="w-12 px-2 py-3" />
                      </tr>
                    </thead>

                    <tbody>
                      {items.map((item) => {
                        const amount =
                          Math.max(0, Number(item.quantity) || 0) *
                          Math.max(0, Number(item.rate) || 0);

                        return (
                          <tr key={item.id} className={`border-t ${border}`}>
                            <td className="px-3 py-2.5">
                              <input
                                value={item.description}
                                onChange={(event) =>
                                  updateItem(
                                    item.id,

                                    "description",

                                    event.target.value,
                                  )
                                }
                                placeholder="e.g. Consultation Fee"
                                className={inputClass}
                              />
                            </td>

                            <td className="px-3 py-2.5">
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={item.quantity}
                                onChange={(event) =>
                                  updateItem(
                                    item.id,

                                    "quantity",

                                    event.target.value,
                                  )
                                }
                                className={`${inputClass} text-right`}
                              />
                            </td>

                            <td className="px-3 py-2.5">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.rate}
                                onChange={(event) =>
                                  updateItem(
                                    item.id,

                                    "rate",

                                    event.target.value,
                                  )
                                }
                                placeholder="0.00"
                                className={`${inputClass} text-right`}
                              />
                            </td>

                            <td
                              className={`px-3 py-2.5 text-right font-medium ${text}`}
                            >
                              {currency(amount)}
                            </td>

                            <td className="px-2 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                aria-label="Remove service"
                                className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Bill summary and notes */}
              <section className="grid grid-cols-1 gap-7 lg:grid-cols-2">
                <div>
                  <div className="mb-4 flex items-center gap-2">
                    <ReceiptText size={17} className="text-[#3E439C]" />
                    <h2 className={`text-sm font-semibold ${text}`}>
                      Bill Notes
                    </h2>
                  </div>
                  <label htmlFor="notes" className={labelClass}>
                    Notes (optional)
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Additional billing notes"
                    className={`w-full rounded-md border px-3 py-2.5 text-sm outline-none focus:border-[#3E439C] ${
                      dark
                        ? "border-slate-700 bg-[#171827] text-slate-100"
                        : "border-slate-200 bg-white text-slate-800"
                    }`}
                  />
                </div>

                <div
                  className={`border-t pt-5 lg:border-t-0 lg:pt-0 ${border}`}
                >
                  <h2 className={`mb-4 text-sm font-semibold ${text}`}>
                    Bill Summary
                  </h2>
                  <div className="space-y-4">
                    <div className={`flex justify-between text-sm ${muted}`}>
                      <span>Subtotal</span>
                      <span className={text}>
                        {currency(calculations.subtotal)}
                      </span>
                    </div>
                    <div
                      className={`flex items-center justify-between gap-4 text-sm ${muted}`}
                    >
                      <label htmlFor="discount">Discount (₹)</label>
                      <input
                        id="discount"
                        type="number"
                        min="0"
                        max={calculations.subtotal}
                        step="0.01"
                        value={discount}
                        onChange={(event) => setDiscount(event.target.value)}
                        className={`${inputClass} max-w-36 text-right`}
                      />
                    </div>
                    <div
                      className={`flex justify-between border-t pt-4 ${border}`}
                    >
                      <span className={`text-sm font-semibold ${text}`}>
                        Total Bill Amount
                      </span>
                      <span className="text-xl font-bold text-[#3E439C] dark:text-[#B9B7FF]">
                        {currency(calculations.total)}
                      </span>
                    </div>
                    <p className={`text-xs ${muted}`}>
                      Payment will be recorded separately after the bill is
                      created.
                    </p>
                  </div>
                </div>
              </section>

              {notice && (
                <div
                  role="alert"
                  className={`rounded-md border px-4 py-3 text-sm ${
                    noticeType === "success"
                      ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200"
                      : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
                  }`}
                >
                  {notice}
                </div>
              )}

              <div
                className={`flex flex-wrap items-center justify-between gap-3 border-t pt-5 ${border}`}
              >
                <p className={`text-xs ${muted}`}>
                  {savedBill
                    ? "Bill saved to the database. Payment will be recorded separately."
                    : "Bill details will be saved to the billing database when you generate the bill."}
                </p>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => navigate("/op-billing")}
                    className={`inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium ${border} ${text}`}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || Boolean(savedBill)}
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-[#3E439C] px-4 text-sm font-semibold text-white hover:bg-[#323780] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <Loader
                        variant="button"
                        size="sm"
                        message="Saving bill..."
                        className="text-white [&_span:first-child]:border-white/30 [&_span:first-child]:border-t-white"
                      />
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        {savedBill ? "Bill Saved" : "Generate Bill"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Draft preview */}

            {showPreview && (
              <section className={`mt-8 border-t pt-6 ${border}`}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className={`text-base font-semibold ${text}`}>
                    {savedBill ? "Saved OP Bill" : "Draft Bill Preview"}
                  </h2>

                  <button
                    type="button"
                    onClick={() => setShowPreview(false)}
                    className={`rounded-md border p-2 ${border} ${muted}`}
                    aria-label="Close draft preview"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div
                  className={`border p-5 sm:p-7 ${border} ${dark ? "bg-[#171827]" : "bg-white"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
                    <div>
                      <h3 className={`text-lg font-bold ${text}`}>
                        MAARGA MINDCARE
                      </h3>

                      <p className={`mt-1 text-xs ${muted}`}>
                        OUTPATIENT BILL{savedBill ? "" : " — DRAFT"}
                      </p>
                    </div>

                    {savedBill ? (
                      <span className="rounded-full border border-green-300 bg-green-50 px-3 py-1 text-xs font-semibold text-green-800">
                        SAVED
                      </span>
                    ) : (
                      <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                        DRAFT — NOT SAVED
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 py-5 sm:grid-cols-2">
                    <div>
                      <p className={`text-xs ${muted}`}>Patient</p>

                      <p className={`mt-1 text-sm font-semibold ${text}`}>
                        {patientName(selectedPatient)}
                      </p>

                      <p className={`mt-1 text-xs ${muted}`}>
                        {selectedPatient?.patient_id}
                      </p>

                      <p className={`mt-1 text-xs ${muted}`}>
                        {selectedPatient?.mobile}
                      </p>
                    </div>

                    <div>
                      <p className={`text-xs ${muted}`}>Bill Date</p>

                      <p className={`mt-1 text-sm font-medium ${text}`}>
                        {billDate}
                      </p>

                      <p className={`mt-3 text-xs ${muted}`}>Bill Number</p>

                      <p className={`mt-1 text-sm font-medium ${text}`}>
                        {savedBill?.bill_number ||
                          "Assigned when the bill is saved"}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] text-sm">
                      <thead className={dark ? "bg-slate-800" : "bg-slate-50"}>
                        <tr>
                          <th className="px-3 py-2 text-left text-xs">
                            Service
                          </th>

                          <th className="px-3 py-2 text-right text-xs">Qty</th>

                          <th className="px-3 py-2 text-right text-xs">Rate</th>

                          <th className="px-3 py-2 text-right text-xs">
                            Amount
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {items

                          .filter((item) => item.description.trim())

                          .map((item) => (
                            <tr key={item.id} className={`border-t ${border}`}>
                              <td className={`px-3 py-3 ${text}`}>
                                {item.description}
                              </td>

                              <td className={`px-3 py-3 text-right ${text}`}>
                                {item.quantity}
                              </td>

                              <td className={`px-3 py-3 text-right ${text}`}>
                                {currency(item.rate)}
                              </td>

                              <td className={`px-3 py-3 text-right ${text}`}>
                                {currency(
                                  Number(item.quantity) * Number(item.rate),
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  <div
                    className={`ml-auto mt-5 max-w-sm space-y-3 border-t pt-4 ${border}`}
                  >
                    <div className={`flex justify-between text-sm ${muted}`}>
                      <span>Subtotal</span>

                      <span className={text}>
                        {currency(calculations.subtotal)}
                      </span>
                    </div>

                    <div className={`flex justify-between text-sm ${muted}`}>
                      <span>Discount</span>

                      <span className={text}>
                        {currency(calculations.discount)}
                      </span>
                    </div>

                    <div
                      className={`flex justify-between border-t pt-3 ${border}`}
                    >
                      <span className={`font-semibold ${text}`}>Total</span>

                      <span className="text-lg font-bold text-[#3E439C] dark:text-[#B9B7FF]">
                        {currency(calculations.total)}
                      </span>
                    </div>

                    {notes && (
                      <p className={`text-xs ${muted}`}>Notes: {notes}</p>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

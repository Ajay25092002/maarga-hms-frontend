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
import SearchableDropdown from "../Components/Common/SearchableDropdown";
import TopNavbar from "../Components/Layout/TopNavbar";

import { useTheme } from "../Context/ThemeContext";

import Loader from "../Components/Common/Loader";

import FullPageLoader from "../Components/Common/FullPageLoader";

import { useToast } from "../Components/Common/useToast";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8001";

const today = () => {
  const now = new Date();

  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

  return local.toISOString().slice(0, 10);
};

const makeItem = () => ({
  id: `${Date.now()}-${Math.random()}`,
  service_id: "",
  description: "",
  priceLoading: false,
  priceError: "",

  quantity: "1",

  rate: "",

  discount_amount: "0",
});

const currency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",

    currency: "INR",

    minimumFractionDigits: 2,

    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const patientName = (patient) => patient?.name?.trim() || "—";

const unwrapList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};
const recordId = (record) =>
  record?.id ?? record?.service_id ?? record?.doctor_id ?? "";
const recordName = (record) => record?.name ?? record?.service_name ?? "";
const getResolvedPrice = (data) => {
  const candidates = [
    data?.amount,
    data?.price,
    data?.rate,
    data?.resolved_price,
    data?.service_price?.amount,
    data?.data?.amount,
    data?.data?.price,
  ];
  const value = candidates.find(
    (candidate) =>
      candidate !== undefined && candidate !== null && candidate !== "",
  );
  if (value === undefined || !Number.isFinite(Number(value)))
    throw new Error("The pricing API did not return a valid service price.");
  return Number(value);
};

const getItemAmounts = (item) => {
  const quantity = Math.max(0, Number(item.quantity) || 0);

  const rate = Math.max(0, Number(item.rate) || 0);

  const amount = Math.round((quantity * rate + Number.EPSILON) * 100) / 100;

  const discount = Math.max(0, Number(item.discount_amount) || 0);

  const netAmount =
    Math.round((Math.max(0, amount - discount) + Number.EPSILON) * 100) / 100;

  return { amount, discount, netAmount };
};

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

  const [doctors, setDoctors] = useState([]);
  const [services, setServices] = useState([]);
  const [mastersLoading, setMastersLoading] = useState(true);
  const [mastersError, setMastersError] = useState("");

  const [billDate, setBillDate] = useState(today());

  // Doctor and psychologist details

  const [doctorId, setDoctorId] = useState("");
  const [doctorName, setDoctorName] = useState("");

  const [psychologistName, setPsychologistName] = useState("");

  // Each service has its own quantity, rate and discount

  const [items, setItems] = useState([makeItem()]);

  const [notes, setNotes] = useState("");

  const [showPreview, setShowPreview] = useState(false);

  const [notice, setNotice] = useState("");

  const [noticeType, setNoticeType] = useState("error");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [savedBill, setSavedBill] = useState(null);
  const [rateCategory] = useState("General OPD");

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
        if (!signal?.aborted) {
          setPatientsLoading(false);
        }
      }
    },

    [showToast],
  );

  useEffect(() => {
    const controller = new AbortController();

    loadPatients(controller.signal);

    return () => controller.abort();
  }, [loadPatients]);

  const loadMasters = useCallback(async (signal) => {
    setMastersLoading(true);
    setMastersError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/doctors`, {
        credentials: "include",
        headers: { Accept: "application/json" },
        signal,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail || `Unable to load doctors (${response.status}).`,
        );
      }

      setDoctors(
        unwrapList(data).filter((doctor) => doctor.is_active !== false),
      );
    } catch (error) {
      if (error.name === "AbortError") return;
      setMastersError(error.message || "Unable to load doctors.");
    } finally {
      if (!signal?.aborted) setMastersLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadMasters(controller.signal);
    return () => controller.abort();
  }, [loadMasters]);

  const fetchOPServices = useCallback(async (search, { signal } = {}) => {
    const params = new URLSearchParams({
      bill_type: "OP",
      search: search.trim(),
      page: "1",
      page_size: "10",
      is_active: "true",
    });

    const response = await fetch(
      `${API_BASE_URL}/api/services?${params.toString()}`,
      {
        credentials: "include",
        headers: { Accept: "application/json" },
        signal,
      },
    );

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        data?.detail || `Unable to search OP services (${response.status}).`,
      );
    }

    const results = unwrapList(data).filter(
      (service) =>
        service.is_active !== false && service.available_for_op !== false,
    );

    setServices((current) => {
      const byId = new Map(
        current.map((service) => [String(recordId(service)), service]),
      );

      results.forEach((service) => {
        byId.set(String(recordId(service)), service);
      });

      return Array.from(byId.values());
    });

    return results;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadMasters(controller.signal);
    return () => controller.abort();
  }, [loadMasters]);

  const resolveServicePrice = async (itemId, serviceId, selectedDoctorId) => {
    if (!serviceId) {
      setItems((current) =>
        current.map((item) =>
          item.id === itemId
            ? {
                ...item,
                service_id: "",
                description: "",
                rate: "",
                priceLoading: false,
                priceError: "",
              }
            : item,
        ),
      );
      return;
    }
    if (!selectedDoctorId) {
      setItems((current) =>
        current.map((item) =>
          item.id === itemId
            ? {
                ...item,
                service_id: serviceId,
                rate: "",
                priceLoading: false,
                priceError: "Select a doctor before choosing a service.",
              }
            : item,
        ),
      );
      return;
    }
    const service = services.find(
      (entry) => String(recordId(entry)) === String(serviceId),
    );
    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              service_id: String(serviceId),
              description: recordName(service),
              rate: "",
              priceLoading: true,
              priceError: "",
            }
          : item,
      ),
    );
    try {
      const params = new URLSearchParams({
        service_id: String(serviceId),
        bill_type: "OP",
        doctor_id: String(selectedDoctorId),
      });
      const response = await fetch(
        `${API_BASE_URL}/api/billing/service-price?${params.toString()}`,
        { credentials: "include", headers: { Accept: "application/json" } },
      );
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = data?.detail;
        throw new Error(
          typeof detail === "string"
            ? detail
            : detail?.message ||
                `No applicable OP price exists (${response.status}).`,
        );
      }
      const amount = getResolvedPrice(data);
      setItems((current) =>
        current.map((item) =>
          item.id === itemId
            ? {
                ...item,
                service_id: String(serviceId),
                description: recordName(service),
                rate: String(amount),
                priceLoading: false,
                priceError: "",
              }
            : item,
        ),
      );
    } catch (error) {
      setItems((current) =>
        current.map((item) =>
          item.id === itemId
            ? {
                ...item,
                service_id: String(serviceId),
                description: recordName(service),
                rate: "",
                priceLoading: false,
                priceError: error.message || "Unable to resolve OP price.",
              }
            : item,
        ),
      );
    }
  };

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
    let subtotal = 0;

    let discount = 0;

    let total = 0;

    for (const item of items) {
      const amounts = getItemAmounts(item);

      subtotal += amounts.amount;

      discount += amounts.discount;

      total += amounts.netAmount;
    }

    return {
      subtotal: Math.round((subtotal + Number.EPSILON) * 100) / 100,

      discount: Math.round((discount + Number.EPSILON) * 100) / 100,

      total: Math.round((total + Number.EPSILON) * 100) / 100,
    };
  }, [items]);

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

    if (!doctorId) {
      setNotice("Please select a doctor before adding OP services.");
      setNoticeType("error");
      showToast({
        type: "warning",
        title: "Doctor required",
        message: "Please select a doctor before adding OP services.",
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

    const completedItems = items.filter(
      (item) => item.service_id && item.description.trim(),
    );

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

    if (completedItems.some((item) => item.priceLoading)) {
      setNotice("Wait for all OP service prices to finish loading.");
      setNoticeType("error");
      return false;
    }
    if (completedItems.some((item) => item.priceError || item.rate === "")) {
      setNotice(
        "A valid backend price is required for every selected service. Re-select the service to retry.",
      );
      setNoticeType("error");
      return false;
    }

    const hasInvalidItem = completedItems.some(
      (item) =>
        item.quantity === "" ||
        !Number.isFinite(Number(item.quantity)) ||
        Number(item.quantity) <= 0 ||
        item.rate === "" ||
        !Number.isFinite(Number(item.rate)) ||
        Number(item.rate) < 0,
    );

    if (hasInvalidItem) {
      setNotice("Check every service description, quantity and rate.");

      setNoticeType("error");

      showToast({
        type: "warning",

        title: "Check service details",

        message: "Enter a valid quantity and rate for every service.",
      });

      return false;
    }

    const hasInvalidDiscount = completedItems.some((item) => {
      if (
        item.discount_amount === "" ||
        !Number.isFinite(Number(item.discount_amount))
      ) {
        return true;
      }

      const { amount } = getItemAmounts(item);

      const discount = Number(item.discount_amount);

      return discount < 0 || discount > amount;
    });

    if (hasInvalidDiscount) {
      setNotice(
        "Each line-item discount must be between zero and that item's gross amount.",
      );

      setNoticeType("error");

      showToast({
        type: "warning",

        title: "Invalid line-item discount",

        message: "Each discount must be between zero and its service amount.",
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

    const completedItems = items.filter(
      (item) => item.service_id && item.description.trim(),
    );

    const payload = {
      bill_type: "OP",

      patient_id: selectedPatient.patient_id,

      bill_date: `${billDate}T00:00:00`,
      rate_category: rateCategory, // Added

      // Doctor and psychologist information
      doctor_id: Number(doctorId),
      doctor_name: doctorName.trim() || null,

      psychologist_name: psychologistName.trim() || null,

      // Discounts are applied per service row.

      // The bill-level discount remains zero.

      discount_amount: 0,

      notes: notes.trim() || null,

      items: completedItems.map((item) => ({
        service_id: Number(item.service_id),
        service_date: billDate,
        quantity: Number(item.quantity),
        discount_amount: Number(item.discount_amount || 0),
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
            : detail?.message ||
              "Unable to save the bill. Please check the details and try again.";

        throw new Error(message);
      }

      setSavedBill(data);

      setShowPreview(true);

      setNotice(
        `Bill created successfully${
          data?.bill_number ? `: ${data.bill_number}` : ""
        }.`,
      );

      setNoticeType("success");

      showToast({
        type: "success",

        title: "OP bill created",

        message: `Bill ${
          data?.bill_number ? `${data.bill_number} ` : ""
        }was saved successfully.`,
      });
    } catch (error) {
      const message =
        error instanceof TypeError
          ? "Unable to connect to the billing server. Check the API URL and try again."
          : error.message || "Unable to save the bill. Please try again.";

      setNotice(message);

      setNoticeType("error");

      showToast({
        type: "error",

        title: "Bill creation failed",

        message,

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
                    Enter patient, provider and service details
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

            {mastersError && (
              <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <span>{mastersError}</span>
                <button
                  type="button"
                  onClick={() => loadMasters()}
                  className="font-semibold underline"
                >
                  Retry
                </button>
              </div>
            )}
            {mastersLoading && (
              <div className={`mb-4 text-sm ${muted}`}>
                Loading doctors and OP services...
              </div>
            )}

            <form onSubmit={handleGenerateBill} className="space-y-7">
              {/* Patient and provider details */}

              <section className={`border-b pb-6 ${border}`}>
                <div className="mb-4 flex items-center gap-2">
                  <UserRound size={17} className="text-[#3E439C]" />

                  <h2 className={`text-sm font-semibold ${text}`}>
                    Patient & Provider Details
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {/* Patient search */}

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
                          <div className={`p-3 text-sm ${muted}`}>
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

                  {/* Doctor name */}

                  <div>
                    <label htmlFor="doctorName" className={labelClass}>
                      Doctor Name *
                    </label>
                    <select
                      id="doctorName"
                      value={doctorId}
                      onChange={(event) => {
                        const selectedId = event.target.value;
                        const selectedDoctor = doctors.find(
                          (doctor) => String(recordId(doctor)) === selectedId,
                        );
                        setDoctorId(selectedId);
                        setDoctorName(recordName(selectedDoctor));
                        setItems((current) =>
                          current.map((item) => ({
                            ...item,
                            service_id: "",
                            description: "",
                            rate: "",
                            priceLoading: false,
                            priceError: "",
                          })),
                        );
                      }}
                      className={inputClass}
                      required
                      disabled={mastersLoading}
                    >
                      <option value="">
                        {mastersLoading
                          ? "Loading doctors..."
                          : "Select doctor"}
                      </option>
                      {doctors.map((doctor) => (
                        <option key={recordId(doctor)} value={recordId(doctor)}>
                          {recordName(doctor)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Psychologist name */}

                  <div>
                    <label htmlFor="psychologistName" className={labelClass}>
                      Psychologist Name
                    </label>

                    <input
                      id="psychologistName"
                      type="text"
                      value={psychologistName}
                      onChange={(event) =>
                        setPsychologistName(event.target.value)
                      }
                      placeholder="Enter psychologist's name"
                      maxLength={150}
                      className={inputClass}
                    />
                  </div>

                  {/* Rate Category */}
                  <div>
                    <label htmlFor="rateCategory" className={labelClass}>
                      Rate Category
                    </label>

                    <input
                      id="rateCategory"
                      type="text"
                      value={rateCategory}
                      readOnly
                      aria-readonly="true"
                      className={`${inputClass} ${
                        dark ? "bg-slate-800/70" : "bg-slate-50"
                      }`}
                    />
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
                      Select a doctor, then choose an OP service. The applicable
                      rate is loaded automatically.
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
                  <table className="w-full min-w-[1000px] text-sm">
                    <thead
                      className={
                        dark
                          ? "bg-slate-800/70 text-slate-300"
                          : "bg-slate-50 text-slate-600"
                      }
                    >
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-semibold">
                          OP Service
                        </th>

                        <th className="w-24 px-3 py-3 text-right text-xs font-semibold">
                          Quantity
                        </th>

                        <th className="w-32 px-3 py-3 text-right text-xs font-semibold">
                          Rate (₹)
                        </th>

                        <th className="w-32 px-3 py-3 text-right text-xs font-semibold">
                          Gross Amount
                        </th>

                        <th className="w-32 px-3 py-3 text-right text-xs font-semibold">
                          Discount (₹)
                        </th>

                        <th className="w-32 px-3 py-3 text-right text-xs font-semibold">
                          Net Amount
                        </th>

                        <th className="w-12 px-2 py-3" />
                      </tr>
                    </thead>

                    <tbody>
                      {items.map((item) => {
                        const { amount, netAmount } = getItemAmounts(item);

                        return (
                          <tr key={item.id} className={`border-t ${border}`}>
                            <td className="px-3 py-2.5">
                              <SearchableDropdown
                                value={
                                  services.find(
                                    (service) =>
                                      String(recordId(service)) ===
                                      String(item.service_id),
                                  ) ?? null
                                }
                                onChange={(service) =>
                                  resolveServicePrice(
                                    item.id,
                                    service ? recordId(service) : "",
                                    doctorId,
                                  )
                                }
                                fetchOptions={fetchOPServices}
                                getOptionLabel={recordName}
                                getOptionValue={recordId}
                                placeholder={
                                  !doctorId
                                    ? "Select doctor first"
                                    : "Select OP service"
                                }
                                searchPlaceholder="Search OP services..."
                                emptyMessage="No matching OP services found."
                                loadingMessage="Searching OP services..."
                                disabled={
                                  !doctorId ||
                                  mastersLoading ||
                                  item.priceLoading
                                }
                                minSearchLength={0}
                                className="w-full"
                              />
                              {item.priceLoading && (
                                <p className={`mt-1 text-xs ${muted}`}>
                                  Loading applicable OP price...
                                </p>
                              )}
                              {item.priceError && (
                                <p className="mt-1 text-xs text-red-500">
                                  {item.priceError}
                                </p>
                              )}
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
                                readOnly
                                aria-readonly="true"
                                placeholder={
                                  item.priceLoading ? "Loading..." : "—"
                                }
                                title="Rate is populated by the backend and cannot be edited."
                                className={`${inputClass} text-right ${dark ? "bg-slate-800/70" : "bg-slate-50"}`}
                              />
                            </td>

                            <td className={`px-3 py-2.5 text-right ${muted}`}>
                              {currency(amount)}
                            </td>

                            <td className="px-3 py-2.5">
                              <input
                                type="number"
                                min="0"
                                max={amount}
                                step="0.01"
                                value={item.discount_amount}
                                onChange={(event) =>
                                  updateItem(
                                    item.id,

                                    "discount_amount",

                                    event.target.value,
                                  )
                                }
                                className={`${inputClass} text-right`}
                                aria-label={`Discount for ${
                                  item.description || "service"
                                }`}
                              />
                            </td>

                            <td
                              className={`px-3 py-2.5 text-right font-semibold ${text}`}
                            >
                              {currency(netAmount)}
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

              {/* Notes and summary */}

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

                    <div className={`flex justify-between text-sm ${muted}`}>
                      <span>Total Line-item Discounts</span>

                      <span className={text}>
                        {currency(calculations.discount)}
                      </span>
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
                      Payment is recorded separately after the bill is created.
                    </p>
                  </div>
                </div>
              </section>

              {/* Submission status */}

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
                    ? "Bill saved to the database."
                    : "Bill details will be saved when you generate the bill."}
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
                    disabled={
                      isSubmitting || Boolean(savedBill) || mastersLoading
                    }
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-[#3E439C] px-4 text-sm font-semibold text-white hover:bg-[#323780] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <Loader
                        variant="button"
                        size="sm"
                        message="Saving bill..."
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

            {/* Saved bill preview */}

            {showPreview && (
              <section className={`mt-8 border-t pt-6 ${border}`}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className={`text-base font-semibold ${text}`}>
                    Saved OP Bill
                  </h2>

                  <button
                    type="button"
                    onClick={() => setShowPreview(false)}
                    className={`rounded-md border p-2 ${border} ${muted}`}
                    aria-label="Close bill preview"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div
                  className={`border p-5 sm:p-7 ${border} ${
                    dark ? "bg-[#171827]" : "bg-white"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
                    <div>
                      <h3 className={`text-lg font-bold ${text}`}>
                        MAARGA MINDCARE
                      </h3>

                      <p className={`mt-1 text-xs ${muted}`}>OUTPATIENT BILL</p>
                    </div>

                    <span className="rounded-full border border-green-300 bg-green-50 px-3 py-1 text-xs font-semibold text-green-800">
                      SAVED
                    </span>
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

                      <p className={`mt-3 text-xs ${muted}`}>Doctor Name</p>

                      <p className={`mt-1 text-sm font-medium ${text}`}>
                        {savedBill?.doctor_name || doctorName || "—"}
                      </p>

                      <p className={`mt-3 text-xs ${muted}`}>
                        Psychologist Name
                      </p>

                      <p className={`mt-1 text-sm font-medium ${text}`}>
                        {savedBill?.psychologist_name ||
                          psychologistName ||
                          "—"}
                      </p>

                      <p className={`mt-3 text-xs ${muted}`}>Bill Number</p>

                      <p className={`mt-1 text-sm font-medium ${text}`}>
                        {savedBill?.bill_number || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-sm">
                      <thead className={dark ? "bg-slate-800" : "bg-slate-50"}>
                        <tr>
                          <th className="px-3 py-2 text-left text-xs">
                            Service
                          </th>

                          <th className="px-3 py-2 text-right text-xs">Qty</th>

                          <th className="px-3 py-2 text-right text-xs">Rate</th>

                          <th className="px-3 py-2 text-right text-xs">
                            Gross
                          </th>

                          <th className="px-3 py-2 text-right text-xs">
                            Discount
                          </th>

                          <th className="px-3 py-2 text-right text-xs">
                            Net Amount
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {items

                          .filter((item) => item.description.trim())

                          .map((item) => {
                            const { amount, discount, netAmount } =
                              getItemAmounts(item);

                            return (
                              <tr
                                key={item.id}
                                className={`border-t ${border}`}
                              >
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
                                  {currency(amount)}
                                </td>

                                <td className={`px-3 py-3 text-right ${text}`}>
                                  {currency(discount)}
                                </td>

                                <td
                                  className={`px-3 py-3 text-right font-semibold ${text}`}
                                >
                                  {currency(netAmount)}
                                </td>
                              </tr>
                            );
                          })}
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
                      <span>Total Line-item Discounts</span>

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

import { useCallback, useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  UserRound,
  BedDouble,
  RefreshCw,
} from "lucide-react";

import AppSidebar from "../Components/Layout/AppSidebar";

import TopNavbar from "../Components/Layout/TopNavbar";

import { useTheme } from "../Context/ThemeContext";

import Loader from "../Components/Common/Loader";

import FullPageLoader from "../Components/Common/FullPageLoader";

import { useToast } from "../Components/Common/useToast";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http\://localhost:8001"
).replace(/\/$/, "");

const today = () => {
  const now = new Date();

  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

  return local.toISOString().slice(0, 10);
};

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const createCharge = () => ({
  id: makeId(),

  service_id: "",

  description: "",

  quantity: "1",

  rate: "",

  discount_amount: "0",

  priceLoading: false,

  priceError: "",
});

const createCategory = () => ({
  id: makeId(),

  service_group_id: "",

  items: [createCharge()],
});

const currency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",

    currency: "INR",

    minimumFractionDigits: 2,

    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const patientName = (patient) => patient?.name?.trim() || "—";

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",

    headers: {
      Accept: "application/json",

      ...(options.body ? { "Content-Type": "application/json" } : {}),

      ...options.headers,
    },

    ...options,
  });

  const contentType = response.headers.get("content-type") || "";

  const data = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    const detail = data?.detail ?? data?.message ?? data;

    const message = Array.isArray(detail)
      ? detail.map((item) => item.msg || JSON.stringify(item)).join("; ")
      : typeof detail === "string"
        ? detail
        : `Request failed (${response.status})`;

    throw new Error(message || `Request failed (${response.status})`);
  }

  return data;
}

function unwrapList(data) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.items)) return data.items;

  if (Array.isArray(data?.results)) return data.results;

  if (Array.isArray(data?.data)) return data.data;

  return [];
}

function getId(record) {
  return record?.id ?? record?.service_id ?? record?.patient_id ?? "";
}

function getName(record) {
  return record?.name ?? record?.service_name ?? "";
}

function getPrice(data) {
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

  if (value === undefined || !Number.isFinite(Number(value))) {
    throw new Error("The pricing API did not return a valid service price.");
  }

  return Number(value);
}

export default function CreateIPBill() {
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

  const [serviceGroups, setServiceGroups] = useState([]);

  const [services, setServices] = useState([]);

  const [roomTypes, setRoomTypes] = useState([]);

  const [mastersLoading, setMastersLoading] = useState(true);

  const [mastersError, setMastersError] = useState("");

  const [admissionDate, setAdmissionDate] = useState(today());

  const [dischargeDate, setDischargeDate] = useState("");

  const [billDate, setBillDate] = useState(today());

  const [department, setDepartment] = useState("");

  const [doctorName, setDoctorName] = useState("");

  const [bedNumber, setBedNumber] = useState("");

  const [roomTypeId, setRoomTypeId] = useState("");

  const [rateCategory] = useState("General IPD");

  const [categories, setCategories] = useState([createCategory()]);

  const [notes, setNotes] = useState("");

  const [notice, setNotice] = useState("");

  const [noticeType, setNoticeType] = useState("error");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [savedBill, setSavedBill] = useState(null);

  const text = dark ? "text-slate-100" : "text-slate-800";

  const muted = dark ? "text-slate-400" : "text-slate-500";

  const border = dark ? "border-slate-700" : "border-slate-200";

  const panel = dark ? "bg-[#171827]" : "bg-white";

  const inputClass = `h-10 w-full min-w-0 rounded-md border px-3 text-sm outline-none transition focus:border-[#3E439C] focus:ring-2 focus:ring-[#3E439C]/10 ${
    dark
      ? "border-slate-700 bg-[#171827] text-slate-100 placeholder:text-slate-500"
      : "border-slate-200 bg-white text-slate-800 placeholder:text-slate-400"
  }`;

  const readOnlyClass = `h-10 w-full flex items-center min-w-0 rounded-md border px-3 text-sm ${
    dark
      ? "border-slate-700 bg-slate-800/70 text-slate-300"
      : "border-slate-200 bg-slate-50 text-slate-700"
  }`;

  const labelClass = `mb-2 block text-[13px] font-medium ${
    dark ? "text-slate-300" : "text-slate-600"
  }`;

  const loadPatients = useCallback(
    async (signal) => {
      setPatientsLoading(true);

      setPatientsError("");

      try {
        const data = await apiRequest("/api/patients?page=1&page_size=100", {
          signal,
        });

        const records = unwrapList(data);

        setPatients(records);
      } catch (error) {
        if (error.name === "AbortError") return;

        setPatientsError(error.message || "Unable to load patients.");

        showToast({
          type: "error",

          title: "Unable to load patients",

          message: error.message || "Please try again.",

          duration: 6000,
        });
      } finally {
        if (!signal?.aborted) setPatientsLoading(false);
      }
    },

    [showToast],
  );

  const loadMasters = useCallback(async (signal) => {
    setMastersLoading(true);

    setMastersError("");

    try {
      const [groupsData, servicesData, roomTypesData, doctorsData] =
        await Promise.all([
          apiRequest("/api/service-groups", { signal }),

          apiRequest("/api/services", { signal }),

          apiRequest("/api/room-types", { signal }),

          apiRequest("/api/doctors", { signal }),
        ]);

      setServiceGroups(
        unwrapList(groupsData).filter((item) => item.is_active !== false),
      );

      setServices(
        unwrapList(servicesData).filter(
          (item) => item.is_active !== false && item.available_for_ip !== false,
        ),
      );

      setRoomTypes(
        unwrapList(roomTypesData).filter((item) => item.is_active !== false),
      );

      setDoctors(
        unwrapList(doctorsData).filter((doctor) => doctor.is_active !== false),
      );
    } catch (error) {
      if (error.name === "AbortError") return;

      setMastersError(
        error.message ||
          "Unable to load service groups, services, and room types.",
      );
    } finally {
      if (!signal?.aborted) setMastersLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loadPatients(controller.signal);

    loadMasters(controller.signal);

    return () => controller.abort();
  }, [loadPatients, loadMasters]);

  const filteredPatients = useMemo(() => {
    const query = patientQuery.trim().toLowerCase();

    const records = !query
      ? patients.slice(0, 8)
      : patients.filter((patient) =>
          [patientName(patient), patient.patient_id, patient.mobile].some(
            (value) =>
              String(value ?? "")
                .toLowerCase()

                .includes(query),
          ),
        );

    return records.slice(0, 8);
  }, [patients, patientQuery]);

  const getServicesForGroup = useCallback(
    (groupId) =>
      services.filter(
        (service) =>
          String(service.service_group_id ?? service.group_id ?? "") ===
          String(groupId),
      ),

    [services],
  );

  const updateCategory = (categoryId, updates) => {
    setCategories((current) =>
      current.map((category) =>
        category.id === categoryId ? { ...category, ...updates } : category,
      ),
    );

    setNotice("");
  };

  const addCategory = () => {
    setCategories((current) => [...current, createCategory()]);

    setNotice("");
  };

  const removeCategory = (categoryId) => {
    setCategories((current) =>
      current.length <= 1
        ? current
        : current.filter((category) => category.id !== categoryId),
    );
  };

  const addCharge = (categoryId) => {
    setCategories((current) =>
      current.map((category) =>
        category.id === categoryId
          ? { ...category, items: [...category.items, createCharge()] }
          : category,
      ),
    );
  };

  const removeCharge = (categoryId, chargeId) => {
    setCategories((current) =>
      current.map((category) => {
        if (category.id !== categoryId) return category;

        return {
          ...category,

          items:
            category.items.length === 1
              ? [createCharge()]
              : category.items.filter((item) => item.id !== chargeId),
        };
      }),
    );
  };

  const updateCharge = (categoryId, chargeId, updates) => {
    setCategories((current) =>
      current.map((category) =>
        category.id !== categoryId
          ? category
          : {
              ...category,

              items: category.items.map((item) =>
                item.id === chargeId ? { ...item, ...updates } : item,
              ),
            },
      ),
    );

    setNotice("");
  };

  const resolvePrice = async (categoryId, chargeId, serviceId) => {
    if (!serviceId) {
      updateCharge(categoryId, chargeId, {
        service_id: "",

        description: "",

        rate: "",

        priceLoading: false,

        priceError: "",
      });

      return;
    }

    if (!roomTypeId) {
      updateCharge(categoryId, chargeId, {
        service_id: serviceId,

        rate: "",

        priceLoading: false,

        priceError: "Select a room type before choosing a service.",
      });

      return;
    }

    const service = services.find(
      (item) => String(getId(item)) === String(serviceId),
    );

    updateCharge(categoryId, chargeId, {
      service_id: String(serviceId),

      description: getName(service),

      rate: "",

      priceLoading: true,

      priceError: "",
    });

    try {
      const params = new URLSearchParams({
        service_id: String(serviceId),

        bill_type: "IP",

        room_type_id: String(roomTypeId),
      });

      const data = await apiRequest(
        `/api/billing/service-price?${params.toString()}`,
      );

      const amount = getPrice(data);

      updateCharge(categoryId, chargeId, {
        service_id: String(serviceId),

        description: getName(service),

        rate: String(amount),

        priceLoading: false,

        priceError: "",
      });
    } catch (error) {
      updateCharge(categoryId, chargeId, {
        service_id: String(serviceId),

        description: getName(service),

        rate: "",

        priceLoading: false,

        priceError:
          error.message ||
          "No applicable price exists for this service and room type.",
      });
    }
  };

  // If the room type changes, every selected service must be repriced.

  useEffect(() => {
    if (!roomTypeId) {
      setCategories((current) =>
        current.map((category) => ({
          ...category,

          items: category.items.map((item) => ({
            ...item,

            rate: "",

            priceLoading: false,

            priceError: item.service_id
              ? "Select a room type to retrieve the price."
              : "",
          })),
        })),
      );

      return;
    }

    const selected = categories.flatMap((category) =>
      category.items

        .filter((item) => item.service_id)

        .map((item) => ({
          categoryId: category.id,

          chargeId: item.id,

          serviceId: item.service_id,
        })),
    );

    selected.forEach((item) =>
      resolvePrice(item.categoryId, item.chargeId, item.serviceId),
    );

    // Only run on room type changes. resolvePrice intentionally uses current

    // master data and selected room type from this render.

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomTypeId]);

  const categorySummaries = useMemo(
    () =>
      categories.map((category) => {
        const lines = category.items.map((item) => {
          const quantity = Math.max(0, Number(item.quantity) || 0);

          const rate = Math.max(0, Number(item.rate) || 0);

          const gross = quantity * rate;

          const requestedDiscount = Math.max(
            0,

            Number(item.discount_amount) || 0,
          );

          const discount = Math.min(gross, requestedDiscount);

          return {
            id: item.id,

            gross,

            discount,

            net: Math.max(0, gross - discount),
          };
        });

        return {
          id: category.id,

          subtotal: lines.reduce((sum, line) => sum + line.gross, 0),

          discount: lines.reduce((sum, line) => sum + line.discount, 0),

          total: lines.reduce((sum, line) => sum + line.net, 0),
        };
      }),

    [categories],
  );

  const billSummary = useMemo(() => {
    const subtotal = categorySummaries.reduce(
      (sum, category) => sum + category.subtotal,

      0,
    );

    const discount = categorySummaries.reduce(
      (sum, category) => sum + category.discount,

      0,
    );

    return {
      subtotal,

      discount,

      total: Math.max(0, subtotal - discount),
    };
  }, [categorySummaries]);

  const selectPatient = (patient) => {
    setSelectedPatient(patient);

    setPatientQuery(patientName(patient));

    setShowPatientResults(false);

    setNotice("");
  };

  const validateForm = () => {
    const fail = (message) => {
      setNotice(message);

      setNoticeType("error");

      showToast({
        type: "warning",

        title: "Check bill details",

        message,
      });

      return false;
    };

    if (!selectedPatient) return fail("Please select a registered patient.");

    if (!admissionDate || !billDate) {
      return fail("Please select the admission date and bill date.");
    }

    if (dischargeDate && dischargeDate < admissionDate) {
      return fail("Discharge date cannot be earlier than admission date.");
    }

    if (!roomTypeId) return fail("Please select an IP room type.");

    const items = categories.flatMap((category) =>
      category.items.filter((item) => item.service_id),
    );

    if (items.length === 0) {
      return fail("Add at least one service to the IP bill.");
    }

    for (const item of items) {
      if (item.priceLoading) {
        return fail("Wait for all service prices to finish loading.");
      }

      if (item.priceError || item.rate === "") {
        return fail(
          item.priceError ||
            "A service price is missing. Re-select the service to retry.",
        );
      }

      const quantity = Number(item.quantity);

      const rate = Number(item.rate);

      const discount = Number(item.discount_amount || 0);

      const gross = quantity * rate;

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return fail("Each service quantity must be greater than zero.");
      }

      if (!Number.isFinite(rate) || rate < 0) {
        return fail("A valid backend service price is required.");
      }

      if (!Number.isFinite(discount) || discount < 0 || discount > gross) {
        return fail(
          "Each discount must be non-negative and cannot exceed the charge amount.",
        );
      }
    }

    if (billSummary.total <= 0) {
      return fail("The final bill amount must be greater than zero.");
    }

    return true;
  };

  const handleGenerateBill = async (event) => {
    event.preventDefault();

    if (isSubmitting || savedBill || !validateForm()) return;

    const items = categories.flatMap((category) =>
      category.items

        .filter((item) => item.service_id)

        .map((item) => ({
          service_id: Number(item.service_id),

          service_date: billDate,

          quantity: Number(item.quantity),

          discount_amount: Number(item.discount_amount || 0),
        })),
    );

    const payload = {
      bill_type: "IP",

      patient_id: selectedPatient.patient_id,

      bill_date: `${billDate}T00:00:00`,

      admission_date: `${admissionDate}T00:00:00`,

      discharge_date: dischargeDate ? `${dischargeDate}T00:00:00` : null,

      department: department.trim() || null,

      doctor_name: doctorName.trim() || null,

      bed_number: bedNumber.trim() || null,

      room_type_id: Number(roomTypeId),

      rate_category: "General IPD",

      discount_amount: 0,

      notes: notes.trim() || null,

      items,
    };

    setIsSubmitting(true);

    setNotice("");

    try {
      const data = await apiRequest("/api/bills", {
        method: "POST",

        body: JSON.stringify(payload),
      });

      setSavedBill(data);

      setNotice(
        `IP bill created successfully${
          data?.bill_number ? `: ${data.bill_number}` : ""
        }.`,
      );

      setNoticeType("success");

      showToast({
        type: "success",

        title: "IP bill created",

        message: `Bill ${
          data?.bill_number ? `${data.bill_number} ` : ""
        }was saved successfully.`,
      });
    } catch (error) {
      setNotice(error.message || "Unable to save the bill.");

      setNoticeType("error");

      showToast({
        type: "error",

        title: "Bill creation failed",

        message: error.message || "Unable to save the bill.",

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
          title="Create IP Bill"
          breadcrumb={[
            "Hospital Management",

            "Billing",

            "IP Bills",

            "Create Bill",
          ]}
        />

        <main className="min-w-0 px-4 py-5 sm:px-5 lg:px-6">
          <div className="mx-auto w-full max-w-[1400px]">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F1F0FF] dark:bg-[#292B49]">
                  <ReceiptText
                    size={20}
                    className="text-[#3E439C] dark:text-[#D6D4FF]"
                  />
                </div>

                <div>
                  <h1 className={`text-lg font-semibold ${text}`}>
                    Create IP Bill
                  </h1>

                  <p className={`mt-1 text-[13px] ${muted}`}>
                    Select service groups and add room-specific inpatient
                    charges.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate("/ip-billing")}
                className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium ${border} ${text}`}
              >
                <ArrowLeft size={15} />
                Back to IP Bills
              </button>
            </div>

            {mastersError && (
              <div className="mb-5 flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
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
              <div className={`mb-5 rounded-lg border p-4 ${border} ${panel}`}>
                <Loader
                  variant="button"
                  size="sm"
                  message="Loading pricing configuration..."
                />
              </div>
            )}

            <form onSubmit={handleGenerateBill} className="space-y-7">
              {/* Patient and admission details */}

              <section className={`border-b pb-6 ${border}`}>
                <div className="mb-4 flex items-center gap-2">
                  <UserRound size={17} className="text-[#3E439C]" />

                  <h2 className={`text-sm font-semibold ${text}`}>
                    Patient & Admission Details
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
                        className={`${inputClass} pl-9`}
                        autoComplete="off"
                      />
                    </div>

                    {showPatientResults && (
                      <>
                        <button
                          type="button"
                          aria-label="Close patient results"
                          className="fixed inset-0 z-10 cursor-default"
                          onClick={() => setShowPatientResults(false)}
                        />

                        <div
                          className={`absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-md border shadow-lg ${border} ${panel}`}
                        >
                          {patientsLoading ? (
                            <div className={`p-3 text-sm ${muted}`}>
                              Loading patients...
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
                      </>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>Patient ID / UHID</label>

                    <div className={`${readOnlyClass} flex items-center`}>
                      {selectedPatient?.patient_id || "Select a patient"}
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Patient Name</label>

                    <div className={`${readOnlyClass} flex items-center`}>
                      {selectedPatient ? patientName(selectedPatient) : "—"}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Mobile Number</label>

                    <div className={`${readOnlyClass} flex items-center`}>
                      {selectedPatient?.mobile || "—"}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Department</label>

                    <input
                      value={department}
                      onChange={(event) => setDepartment(event.target.value)}
                      placeholder="Department"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Doctor Name (optional)</label>

                    <select
                      value={doctorName}
                      onChange={(event) => setDoctorName(event.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select doctor</option>

                      {doctors.map((doctor) => (
                        <option key={getId(doctor)} value={getName(doctor)}>
                          {getName(doctor)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Admission Date *</label>

                    <input
                      type="date"
                      value={admissionDate}
                      onChange={(event) => setAdmissionDate(event.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Discharge Date</label>

                    <input
                      type="date"
                      value={dischargeDate}
                      min={admissionDate}
                      onChange={(event) => setDischargeDate(event.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Bill Date *</label>

                    <input
                      type="date"
                      value={billDate}
                      onChange={(event) => setBillDate(event.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Room Type *</label>

                    <select
                      value={roomTypeId}
                      onChange={(event) => setRoomTypeId(event.target.value)}
                      className={inputClass}
                      required
                    >
                      <option value="">Select room type</option>

                      {roomTypes.map((room) => (
                        <option key={getId(room)} value={getId(room)}>
                          {getName(room)}
                        </option>
                      ))}
                    </select>

                    <p className={`mt-1 text-xs ${muted}`}>
                      Service prices are resolved using this room type.
                    </p>
                  </div>

                  <div>
                    <label className={labelClass}>Bed Number</label>

                    <input
                      value={bedNumber}
                      onChange={(event) => setBedNumber(event.target.value)}
                      placeholder="e.g. B-102"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Rate Category</label>

                    <div className={readOnlyClass} aria-readonly="true">
                      General IPD
                    </div>
                  </div>
                </div>
              </section>

              {/* Service groups and services */}

              <section className={`border-b pb-6 ${border}`}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className={`text-sm font-semibold ${text}`}>
                      Service Groups & Charges
                    </h2>

                    <p className={`mt-1 text-xs ${muted}`}>
                      Add multiple groups. Each service dropdown only shows
                      services belonging to its selected group.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addCategory}
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-[#3E439C] px-3 text-sm font-medium text-white hover:bg-[#323780]"
                  >
                    <Plus size={16} />
                    Add Service Group
                  </button>
                </div>

                {categories.map((category, categoryIndex) => {
                  const summary = categorySummaries.find(
                    (item) => item.id === category.id,
                  );

                  const groupServices = getServicesForGroup(
                    category.service_group_id,
                  );

                  return (
                    <div
                      key={category.id}
                      className={`mb-5 rounded-lg border p-4 last:mb-0 sm:p-5 ${border} ${panel}`}
                    >
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h3 className={`text-sm font-semibold ${text}`}>
                          Service Group {categoryIndex + 1}
                        </h3>

                        <button
                          type="button"
                          onClick={() => removeCategory(category.id)}
                          disabled={categories.length === 1}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-950/30"
                        >
                          <Trash2 size={14} />
                          Remove Group
                        </button>
                      </div>

                      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className={labelClass}>Service Group *</label>

                          <select
                            value={category.service_group_id}
                            onChange={(event) => {
                              updateCategory(category.id, {
                                service_group_id: event.target.value,

                                items: category.items.map((item) => ({
                                  ...item,

                                  service_id: "",

                                  description: "",

                                  rate: "",

                                  priceLoading: false,

                                  priceError: "",
                                })),
                              });
                            }}
                            className={inputClass}
                            required
                          >
                            <option value="">Select service group</option>

                            {serviceGroups.map((group) => (
                              <option key={getId(group)} value={getId(group)}>
                                {getName(group)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-end">
                          <p className={`text-xs ${muted}`}>
                            {category.service_group_id
                              ? `${groupServices.length} available IP service(s) in this group.`
                              : "Select a service group to load its services."}
                          </p>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[850px] border-collapse text-sm">
                          <thead>
                            <tr
                              className={
                                dark ? "bg-slate-800/70" : "bg-slate-50"
                              }
                            >
                              <th
                                className={`px-3 py-3 text-left font-medium ${muted}`}
                              >
                                Service *
                              </th>

                              <th
                                className={`w-24 px-3 py-3 text-right font-medium ${muted}`}
                              >
                                Quantity
                              </th>

                              <th
                                className={`w-36 px-3 py-3 text-right font-medium ${muted}`}
                              >
                                Rate (₹)
                              </th>

                              <th
                                className={`w-36 px-3 py-3 text-right font-medium ${muted}`}
                              >
                                Amount
                              </th>

                              <th
                                className={`w-36 px-3 py-3 text-right font-medium ${muted}`}
                              >
                                Discount (₹)
                              </th>

                              <th
                                className={`w-36 px-3 py-3 text-right font-medium ${muted}`}
                              >
                                Net Amount
                              </th>

                              <th className="w-12 px-2 py-3" />
                            </tr>
                          </thead>

                          <tbody>
                            {category.items.map((item) => {
                              const quantity = Math.max(
                                0,

                                Number(item.quantity) || 0,
                              );

                              const rate = Math.max(0, Number(item.rate) || 0);

                              const gross = quantity * rate;

                              const discount = Math.min(
                                gross,

                                Math.max(0, Number(item.discount_amount) || 0),
                              );

                              const net = Math.max(0, gross - discount);

                              return (
                                <tr
                                  key={item.id}
                                  className={`border-t ${border}`}
                                >
                                  <td className="px-3 py-3">
                                    <select
                                      value={item.service_id}
                                      disabled={
                                        !category.service_group_id ||
                                        !roomTypeId ||
                                        item.priceLoading
                                      }
                                      onChange={(event) =>
                                        resolvePrice(
                                          category.id,

                                          item.id,

                                          event.target.value,
                                        )
                                      }
                                      className={inputClass}
                                      required
                                    >
                                      <option value="">
                                        {!category.service_group_id
                                          ? "Select group first"
                                          : !roomTypeId
                                            ? "Select room type first"
                                            : "Select service"}
                                      </option>

                                      {groupServices.map((service) => (
                                        <option
                                          key={getId(service)}
                                          value={getId(service)}
                                        >
                                          {getName(service)}
                                        </option>
                                      ))}
                                    </select>

                                    {item.priceLoading && (
                                      <p
                                        className={`mt-1 flex items-center gap-1 text-xs ${muted}`}
                                      >
                                        <RefreshCw
                                          size={12}
                                          className="animate-spin"
                                        />
                                        Fetching room-specific price...
                                      </p>
                                    )}

                                    {item.priceError && (
                                      <p className="mt-1 text-xs text-red-500">
                                        {item.priceError}
                                      </p>
                                    )}
                                  </td>

                                  <td className="px-3 py-3">
                                    <input
                                      type="number"
                                      min="1"
                                      step="1"
                                      value={item.quantity}
                                      onChange={(event) =>
                                        updateCharge(category.id, item.id, {
                                          quantity: event.target.value,
                                        })
                                      }
                                      className={`${inputClass} text-right`}
                                      required
                                    />
                                  </td>

                                  <td className="px-3 py-3">
                                    <input
                                      type="number"
                                      value={item.rate}
                                      readOnly
                                      aria-readonly="true"
                                      placeholder={
                                        item.priceLoading ? "Loading..." : "—"
                                      }
                                      className={`${readOnlyClass} text-right`}
                                      title="Rate is populated by the backend and cannot be edited."
                                    />
                                  </td>

                                  <td
                                    className={`px-3 py-3 text-right ${text}`}
                                  >
                                    {currency(gross)}
                                  </td>

                                  <td className="px-3 py-3">
                                    <input
                                      type="number"
                                      min="0"
                                      max={gross}
                                      step="0.01"
                                      value={item.discount_amount}
                                      onChange={(event) =>
                                        updateCharge(category.id, item.id, {
                                          discount_amount: event.target.value,
                                        })
                                      }
                                      className={`${inputClass} text-right`}
                                    />
                                  </td>

                                  <td
                                    className={`px-3 py-3 text-right font-semibold ${text}`}
                                  >
                                    {currency(net)}
                                  </td>

                                  <td className="px-2 py-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeCharge(category.id, item.id)
                                      }
                                      title="Remove service"
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

                      <button
                        type="button"
                        onClick={() => addCharge(category.id)}
                        className={`mt-3 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium text-[#3E439C] hover:bg-[#F1F0FF] dark:text-[#D6D4FF] dark:hover:bg-[#292B49] ${border}`}
                      >
                        <Plus size={14} />
                        Add Service
                      </button>

                      <div
                        className={`mt-4 grid grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-3 ${border}`}
                      >
                        <div>
                          <p className={`text-xs ${muted}`}>Group Subtotal</p>

                          <p className={`mt-1 text-sm font-semibold ${text}`}>
                            {currency(summary?.subtotal || 0)}
                          </p>
                        </div>

                        <div>
                          <p className={`text-xs ${muted}`}>Group Discount</p>

                          <p className="mt-1 text-sm font-semibold text-red-600 dark:text-red-400">
                            − {currency(summary?.discount || 0)}
                          </p>
                        </div>

                        <div>
                          <p className={`text-xs ${muted}`}>Group Total</p>

                          <p className="mt-1 text-sm font-bold text-[#3E439C] dark:text-[#B9B7FF]">
                            {currency(summary?.total || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </section>

              {/* Notes and bill summary */}

              <section className="grid grid-cols-1 gap-7 lg:grid-cols-2">
                <div>
                  <div className="mb-4 flex items-center gap-2">
                    <FileText size={17} className="text-[#3E439C]" />

                    <h2 className={`text-sm font-semibold ${text}`}>
                      Billing Notes
                    </h2>
                  </div>

                  <label htmlFor="ip-bill-notes" className={labelClass}>
                    Notes (optional)
                  </label>

                  <textarea
                    id="ip-bill-notes"
                    rows={4}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Additional inpatient billing notes"
                    className={`w-full rounded-md border px-3 py-2.5 text-sm outline-none focus:border-[#3E439C] ${
                      dark
                        ? "border-slate-700 bg-[#171827] text-slate-100"
                        : "border-slate-200 bg-white text-slate-800"
                    }`}
                  />
                </div>

                <div
                  className={`rounded-lg border p-4 sm:p-5 ${border} ${panel}`}
                >
                  <h2 className={`mb-4 text-sm font-semibold ${text}`}>
                    Overall Bill Summary
                  </h2>

                  <div className="space-y-4">
                    <div className={`flex justify-between text-sm ${muted}`}>
                      <span>Service Groups</span>

                      <span className={text}>{categories.length}</span>
                    </div>

                    <div className={`flex justify-between text-sm ${muted}`}>
                      <span>Total Services</span>

                      <span className={text}>
                        {categories.reduce(
                          (sum, category) =>
                            sum +
                            category.items.filter((item) => item.service_id)
                              .length,

                          0,
                        )}
                      </span>
                    </div>

                    <div className={`flex justify-between text-sm ${muted}`}>
                      <span>Subtotal</span>

                      <span className={text}>
                        {currency(billSummary.subtotal)}
                      </span>
                    </div>

                    <div className={`flex justify-between text-sm ${muted}`}>
                      <span>Total Discounts</span>

                      <span className="font-medium text-red-600 dark:text-red-400">
                        − {currency(billSummary.discount)}
                      </span>
                    </div>

                    <div
                      className={`flex justify-between border-t pt-4 ${border}`}
                    >
                      <span className={`text-sm font-semibold ${text}`}>
                        Final Payable Amount
                      </span>

                      <span className="text-xl font-bold text-[#3E439C] dark:text-[#B9B7FF]">
                        {currency(billSummary.total)}
                      </span>
                    </div>

                    <p className={`text-xs ${muted}`}>
                      Rates are retrieved from backend pricing configuration for
                      the selected room type.
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
                    ? "Bill saved successfully."
                    : "Review the patient, room type, services, prices, and discounts before generating the bill."}
                </p>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => navigate("/ip-billing")}
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

                        {savedBill ? "Bill Saved" : "Generate IP Bill"}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {savedBill && (
                <section className={`rounded-lg border p-4 ${border}`}>
                  <h2 className={`text-sm font-semibold ${text}`}>
                    IP Bill Created
                  </h2>

                  <p className={`mt-2 text-sm ${muted}`}>
                    Bill Number:{" "}
                    <span className={`font-semibold ${text}`}>
                      {savedBill.bill_number || "Assigned by the server"}
                    </span>
                  </p>

                  <button
                    type="button"
                    onClick={() => navigate("/ip-billing")}
                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-[#3E439C] px-4 text-sm font-semibold text-white hover:bg-[#323780]"
                  >
                    <ArrowLeft size={15} />
                    Return to IP Bills
                  </button>
                </section>
              )}
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

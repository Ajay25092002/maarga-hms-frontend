import { useCallback, useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  UserRound,
  FolderPlus,
} from "lucide-react";

import AppSidebar from "../Components/Layout/AppSidebar";

import TopNavbar from "../Components/Layout/TopNavbar";

import { useTheme } from "../Context/ThemeContext";

import Loader from "../Components/Common/Loader";

import FullPageLoader from "../Components/Common/FullPageLoader";

import { useToast } from "../Components/Common/useToast";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "");

const today = () => {
  const now = new Date();

  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

  return local.toISOString().slice(0, 10);
};

const createCharge = () => ({
  id: `${Date.now()}-${Math.random()}`,

  description: "",

  quantity: "1",

  rate: "",

  discount_amount: "0",
});

const createCategory = (name = "") => ({
  id: `${Date.now()}-${Math.random()}`,

  name,

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

  const [admissionDate, setAdmissionDate] = useState(today());
  const [dischargeDate, setDischargeDate] = useState("");
  const [billDate, setBillDate] = useState(today());
  const [department, setDepartment] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [bedNumber, setBedNumber] = useState("");
  const [rateCategory, setRateCategory] = useState("");

  // Categories are created by the billing user.

  const [categories, setCategories] = useState([createCategory("")]);

  const [notes, setNotes] = useState("");

  const [notice, setNotice] = useState("");

  const [noticeType, setNoticeType] = useState("error");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [savedBill, setSavedBill] = useState(null);

  const [newCategoryName, setNewCategoryName] = useState("");

  const [showCategoryInput, setShowCategoryInput] = useState(false);

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

  // Calculate individual charges and totals for each category.

  const categorySummaries = useMemo(() => {
    return categories.map((category) => {
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
    });
  }, [categories]);

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

  const updateCategoryName = (categoryId, name) => {
    setCategories((current) =>
      current.map((category) =>
        category.id === categoryId ? { ...category, name } : category,
      ),
    );

    setNotice("");
  };

  const addCategory = () => {
    const name = newCategoryName.trim();

    if (!name) {
      showToast({
        type: "warning",

        title: "Category name required",

        message: "Enter a name for the new category.",
      });

      return;
    }

    const duplicate = categories.some(
      (category) => category.name.trim().toLowerCase() === name.toLowerCase(),
    );

    if (duplicate) {
      showToast({
        type: "warning",

        title: "Category already exists",

        message: "Please use a different category name.",
      });

      return;
    }

    setCategories((current) => [...current, createCategory(name)]);

    setNewCategoryName("");

    setShowCategoryInput(false);

    setNotice("");

    showToast({
      type: "success",

      title: "Category added",

      message: `${name} has been added.`,
    });
  };

  const removeCategory = (categoryId) => {
    if (categories.length === 1) {
      showToast({
        type: "warning",

        title: "At least one category is required",

        message: "Rename this category instead of removing it.",
      });

      return;
    }

    setCategories((current) =>
      current.filter((category) => category.id !== categoryId),
    );

    setNotice("");
  };

  const addCharge = (categoryId) => {
    setCategories((current) =>
      current.map((category) =>
        category.id === categoryId
          ? {
              ...category,

              items: [...category.items, createCharge()],
            }
          : category,
      ),
    );
  };

  const updateCharge = (categoryId, chargeId, field, value) => {
    setCategories((current) =>
      current.map((category) =>
        category.id === categoryId
          ? {
              ...category,

              items: category.items.map((item) =>
                item.id === chargeId ? { ...item, [field]: value } : item,
              ),
            }
          : category,
      ),
    );

    setNotice("");
  };

  const removeCharge = (categoryId, chargeId) => {
    setCategories((current) =>
      current.map((category) =>
        category.id === categoryId
          ? {
              ...category,

              items:
                category.items.length === 1
                  ? [createCharge()]
                  : category.items.filter((item) => item.id !== chargeId),
            }
          : category,
      ),
    );
  };

  const selectPatient = (patient) => {
    setSelectedPatient(patient);

    setPatientQuery(patientName(patient));

    setShowPatientResults(false);

    setNotice("");
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

    if (!admissionDate || !billDate) {
      setNotice("Please select the admission date and bill date.");

      setNoticeType("error");

      showToast({
        type: "warning",

        title: "Date required",

        message: "Please select both dates.",
      });

      return false;
    }

    if (dischargeDate && dischargeDate < admissionDate) {
      setNotice("Discharge date cannot be earlier than admission date.");
      setNoticeType("error");
      showToast({
        type: "warning",
        title: "Invalid discharge date",
        message: "Discharge date cannot be earlier than admission date.",
      });
      return false;
    }

    if (categories.length === 0) {
      setNotice("Please add at least one category.");

      setNoticeType("error");

      return false;
    }

    const categoryNames = categories.map((category) =>
      category.name.trim().toLowerCase(),
    );

    if (categories.some((category) => !category.name.trim())) {
      setNotice("Please enter a name for every category.");

      setNoticeType("error");

      showToast({
        type: "warning",

        title: "Category name required",

        message: "Every category must have a name.",
      });

      return false;
    }

    if (new Set(categoryNames).size !== categoryNames.length) {
      setNotice("Category names must be unique.");

      setNoticeType("error");

      showToast({
        type: "warning",

        title: "Duplicate category",

        message: "Please give each category a unique name.",
      });

      return false;
    }

    const allItems = categories.flatMap((category) =>
      category.items.map((item) => ({
        ...item,

        categoryName: category.name.trim(),
      })),
    );

    const completedItems = allItems.filter((item) => item.description.trim());

    if (completedItems.length === 0) {
      setNotice("Please add at least one service or charge.");

      setNoticeType("error");

      showToast({
        type: "warning",

        title: "Charge required",

        message: "Add at least one charge with a description.",
      });

      return false;
    }

    const invalidItem = completedItems.some((item) => {
      const quantity = Number(item.quantity);

      const rate = Number(item.rate);

      const discount = Number(item.discount_amount || 0);

      const gross = quantity * rate;

      return (
        item.quantity === "" ||
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        item.rate === "" ||
        !Number.isFinite(rate) ||
        rate < 0 ||
        !Number.isFinite(discount) ||
        discount < 0 ||
        discount > gross
      );
    });

    if (invalidItem) {
      setNotice(
        "Check each charge's quantity, rate and discount. A discount cannot exceed its charge amount.",
      );

      setNoticeType("error");

      showToast({
        type: "warning",

        title: "Invalid charge details",

        message:
          "Quantity must be positive, and each discount must be between zero and the charge amount.",
      });

      return false;
    }

    if (billSummary.total <= 0) {
      setNotice("The final bill amount must be greater than zero.");

      setNoticeType("error");

      showToast({
        type: "warning",

        title: "Invalid bill total",

        message: "The final payable amount must be greater than zero.",
      });

      return false;
    }

    return true;
  };

  const handleGenerateBill = async (event) => {
    event.preventDefault();

    if (isSubmitting || savedBill) return;

    if (!validateForm()) return;

    const items = categories.flatMap((category) =>
      category.items

        .filter((item) => item.description.trim())

        .map((item) => ({
          // The backend must support this category field

          // to preserve the grouping after the bill is saved.

          category: category.name.trim(),

          description: item.description.trim(),

          quantity: Number(item.quantity),

          rate: Number(item.rate),

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
      rate_category: rateCategory.trim() || null,
      discount_amount: 0,
      notes: notes.trim() || null,
      items,
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
            : "Unable to save the bill. Check the details and try again.";

        throw new Error(message);
      }

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
            : error.message || "Unable to save the bill.",

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
                    Create categories and add inpatient charges
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
                      </>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>Patient ID / UHID</label>

                    <div className={`${inputClass} flex items-center`}>
                      {selectedPatient?.patient_id || "Select a patient"}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Registration Number</label>

                    <div className={`${inputClass} flex items-center`}>
                      {selectedPatient?.registration_number || "—"}
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
                    <label htmlFor="admissionDate" className={labelClass}>
                      Admission Date *
                    </label>

                    <div className="relative">
                      <CalendarDays
                        size={16}
                        className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`}
                      />

                      <input
                        id="admissionDate"
                        type="date"
                        value={admissionDate}
                        onChange={(event) =>
                          setAdmissionDate(event.target.value)
                        }
                        className={`${inputClass} pl-9`}
                        required
                      />
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
                        className={`${inputClass} pl-9`}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="dischargeDate" className={labelClass}>
                      Discharge Date
                    </label>
                    <div className="relative">
                      <CalendarDays
                        size={16}
                        className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`}
                      />
                      <input
                        id="dischargeDate"
                        type="date"
                        value={dischargeDate}
                        min={admissionDate || undefined}
                        onChange={(event) =>
                          setDischargeDate(event.target.value)
                        }
                        className={`${inputClass} pl-9`}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="department" className={labelClass}>
                      Department / Ward
                    </label>
                    <input
                      id="department"
                      value={department}
                      onChange={(event) => setDepartment(event.target.value)}
                      placeholder="Enter department or ward"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="doctorName" className={labelClass}>
                      Attending Doctor
                    </label>
                    <input
                      id="doctorName"
                      value={doctorName}
                      onChange={(event) => setDoctorName(event.target.value)}
                      placeholder="Enter doctor name"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="bedNumber" className={labelClass}>
                      Bed Number
                    </label>
                    <input
                      id="bedNumber"
                      value={bedNumber}
                      onChange={(event) => setBedNumber(event.target.value)}
                      placeholder="Enter bed number"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="rateCategory" className={labelClass}>
                      Rate Category
                    </label>
                    <input
                      id="rateCategory"
                      value={rateCategory}
                      onChange={(event) => setRateCategory(event.target.value)}
                      placeholder="Enter rate category"
                      className={inputClass}
                    />
                  </div>
                </div>
              </section>

              {/* User-created categories */}

              <section>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className={`text-sm font-semibold ${text}`}>
                      Inpatient Categories & Charges
                    </h2>

                    <p className={`mt-1 text-xs ${muted}`}>
                      Create your own categories and group related charges.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCategoryInput((current) => !current)}
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-[#3E439C] px-4 text-sm font-medium text-white hover:bg-[#323780]"
                  >
                    <FolderPlus size={16} />
                    Add Category
                  </button>
                </div>

                {showCategoryInput && (
                  <div
                    className={`mb-5 rounded-lg border p-4 ${border} ${
                      dark ? "bg-[#171827]" : "bg-white"
                    }`}
                  >
                    <label htmlFor="newCategoryName" className={labelClass}>
                      New Category Name *
                    </label>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        id="newCategoryName"
                        value={newCategoryName}
                        onChange={(event) =>
                          setNewCategoryName(event.target.value)
                        }
                        placeholder="e.g. Room Charges, Clinical Charges"
                        className={inputClass}
                        autoFocus
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();

                            addCategory();
                          }
                        }}
                      />

                      <button
                        type="button"
                        onClick={addCategory}
                        className="h-10 shrink-0 rounded-md bg-[#3E439C] px-4 text-sm font-medium text-white hover:bg-[#323780]"
                      >
                        Create Category
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowCategoryInput(false);

                          setNewCategoryName("");
                        }}
                        className={`flex h-10 items-center justify-center rounded-md border px-3 ${border} ${text}`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-5">
                  {categories.map((category, categoryIndex) => {
                    const summary = categorySummaries.find(
                      (item) => item.id === category.id,
                    );

                    return (
                      <div
                        key={category.id}
                        className={`overflow-hidden rounded-lg border ${border} ${
                          dark ? "bg-[#171827]" : "bg-white"
                        }`}
                      >
                        <div
                          className={`flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 ${border} ${
                            dark ? "bg-slate-800/50" : "bg-[#F8F8FD]"
                          }`}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F1F0FF] dark:bg-[#292B49]">
                              <ReceiptText
                                size={17}
                                className="text-[#3E439C] dark:text-[#D6D4FF]"
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <label
                                htmlFor={`category-${category.id}`}
                                className={`mb-1 block text-xs ${muted}`}
                              >
                                Category {categoryIndex + 1} Name *
                              </label>

                              <input
                                id={`category-${category.id}`}
                                value={category.name}
                                onChange={(event) =>
                                  updateCategoryName(
                                    category.id,

                                    event.target.value,
                                  )
                                }
                                placeholder="Enter category name"
                                className={`${inputClass} max-w-md font-semibold`}
                                required
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeCategory(category.id)}
                            aria-label="Remove category"
                            title="Remove category"
                            className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 px-3 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
                          >
                            <Trash2 size={15} />
                            Remove Category
                          </button>
                        </div>

                        <div className="p-4">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <h3 className={`text-sm font-semibold ${text}`}>
                              Charges
                            </h3>

                            <button
                              type="button"
                              onClick={() => addCharge(category.id)}
                              className="inline-flex h-9 items-center gap-2 rounded-md border border-[#3E439C] px-3 text-sm font-medium text-[#3E439C] hover:bg-[#F1F0FF] dark:text-[#D6D4FF] dark:hover:bg-[#292B49]"
                            >
                              <Plus size={15} />
                              Add Charge
                            </button>
                          </div>

                          <div
                            className={`overflow-x-auto rounded-md border ${border}`}
                          >
                            <table className="w-full min-w-[950px] text-sm">
                              <thead
                                className={
                                  dark
                                    ? "bg-slate-800/70 text-slate-300"
                                    : "bg-slate-50 text-slate-600"
                                }
                              >
                                <tr>
                                  <th className="px-3 py-3 text-left text-xs font-semibold">
                                    Service / Charge
                                  </th>

                                  <th className="w-24 px-3 py-3 text-right text-xs font-semibold">
                                    Quantity
                                  </th>

                                  <th className="w-32 px-3 py-3 text-right text-xs font-semibold">
                                    Rate (₹)
                                  </th>

                                  <th className="w-36 px-3 py-3 text-right text-xs font-semibold">
                                    Gross Amount
                                  </th>

                                  <th className="w-36 px-3 py-3 text-right text-xs font-semibold">
                                    Discount (₹)
                                  </th>

                                  <th className="w-36 px-3 py-3 text-right text-xs font-semibold">
                                    Net Amount
                                  </th>

                                  <th className="w-12 px-2 py-3" />
                                </tr>
                              </thead>

                              <tbody>
                                {category.items.map((item) => {
                                  const gross =
                                    Math.max(
                                      0,

                                      Number(item.quantity) || 0,
                                    ) * Math.max(0, Number(item.rate) || 0);

                                  const discount = Math.min(
                                    gross,

                                    Math.max(
                                      0,

                                      Number(item.discount_amount) || 0,
                                    ),
                                  );

                                  const net = Math.max(0, gross - discount);

                                  return (
                                    <tr
                                      key={item.id}
                                      className={`border-t ${border}`}
                                    >
                                      <td className="px-3 py-2.5">
                                        <input
                                          value={item.description}
                                          onChange={(event) =>
                                            updateCharge(
                                              category.id,

                                              item.id,

                                              "description",

                                              event.target.value,
                                            )
                                          }
                                          placeholder="Enter service or charge"
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
                                            updateCharge(
                                              category.id,

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
                                            updateCharge(
                                              category.id,

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
                                        className={`px-3 py-2.5 text-right ${text}`}
                                      >
                                        {currency(gross)}
                                      </td>

                                      <td className="px-3 py-2.5">
                                        <input
                                          type="number"
                                          min="0"
                                          max={gross}
                                          step="0.01"
                                          value={item.discount_amount}
                                          onChange={(event) =>
                                            updateCharge(
                                              category.id,

                                              item.id,

                                              "discount_amount",

                                              event.target.value,
                                            )
                                          }
                                          aria-label={`Discount for ${
                                            item.description || "this charge"
                                          }`}
                                          className={`${inputClass} text-right`}
                                        />

                                        {Number(item.discount_amount) >
                                          gross && (
                                          <p className="mt-1 text-[11px] text-red-500">
                                            Exceeds amount
                                          </p>
                                        )}
                                      </td>

                                      <td
                                        className={`px-3 py-2.5 text-right font-semibold ${text}`}
                                      >
                                        {currency(net)}
                                      </td>

                                      <td className="px-2 py-2.5 text-center">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            removeCharge(
                                              category.id,

                                              item.id,
                                            )
                                          }
                                          aria-label="Remove charge"
                                          title="Remove charge"
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

                          <div
                            className={`mt-4 grid grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-3 ${border}`}
                          >
                            <div>
                              <p className={`text-xs ${muted}`}>
                                Category Subtotal
                              </p>

                              <p
                                className={`mt-1 text-sm font-semibold ${text}`}
                              >
                                {currency(summary?.subtotal || 0)}
                              </p>
                            </div>

                            <div>
                              <p className={`text-xs ${muted}`}>
                                Category Discount
                              </p>

                              <p className="mt-1 text-sm font-semibold text-red-600 dark:text-red-400">
                                − {currency(summary?.discount || 0)}
                              </p>
                            </div>

                            <div>
                              <p className={`text-xs ${muted}`}>
                                Category Total
                              </p>

                              <p className="mt-1 text-sm font-bold text-[#3E439C] dark:text-[#B9B7FF]">
                                {currency(summary?.total || 0)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setShowCategoryInput(true)}
                  className={`mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-4 text-sm font-medium text-[#3E439C] hover:bg-[#F1F0FF] dark:text-[#D6D4FF] dark:hover:bg-[#292B49] ${border}`}
                >
                  <FolderPlus size={17} />
                  Add Another Category
                </button>
              </section>

              {/* Notes and overall bill summary */}

              <section className="grid grid-cols-1 gap-7 lg:grid-cols-2">
                <div>
                  <div className="mb-4 flex items-center gap-2">
                    <ReceiptText size={17} className="text-[#3E439C]" />

                    <h2 className={`text-sm font-semibold ${text}`}>
                      Billing Notes
                    </h2>
                  </div>

                  <label htmlFor="notes" className={labelClass}>
                    Notes (optional)
                  </label>

                  <textarea
                    id="notes"
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
                  className={`rounded-lg border p-4 sm:p-5 ${border} ${
                    dark ? "bg-[#171827]" : "bg-white"
                  }`}
                >
                  <h2 className={`mb-4 text-sm font-semibold ${text}`}>
                    Overall Bill Summary
                  </h2>

                  <div className="space-y-4">
                    <div className={`flex justify-between text-sm ${muted}`}>
                      <span>Total Categories</span>

                      <span className={text}>{categories.length}</span>
                    </div>

                    <div className={`flex justify-between text-sm ${muted}`}>
                      <span>Total Charges</span>

                      <span className={text}>
                        {categories.reduce(
                          (sum, category) =>
                            sum +
                            category.items.filter((item) =>
                              item.description.trim(),
                            ).length,

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
                      The final amount is calculated from every charge in every
                      category, after individual discounts.
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
                    ? "Bill saved. Verify the saved bill details."
                    : "Review all categories and charges before generating the bill."}
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
                    disabled={isSubmitting || Boolean(savedBill)}
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

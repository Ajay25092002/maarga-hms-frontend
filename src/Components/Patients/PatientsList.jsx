import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import FullPageLoader from "../Common/FullPageLoader";
import PatientTable from "./PatientTable";
import PatientDetailsModal from "./PatientDetailsModal";

import {
  Search,
  UserRoundPlus,
  Users,
  CalendarDays,
  UserRound,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
  RefreshCw,
} from "lucide-react";

const PAGE_SIZE = 10;

function parseDate(value) {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function isSameLocalDay(first, second) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function isWithinLastSevenDays(value, now = new Date()) {
  const date = parseDate(value);

  if (!date) return false;

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return date >= start && date <= end;
}

function calculatePatientAge(dateOfBirth) {
  if (!dateOfBirth) return "";

  const dob = new Date(
    `${String(dateOfBirth).slice(0, 10)}T00:00:00`
  );

  const today = new Date();

  if (Number.isNaN(dob.getTime()) || dob > today) {
    return "";
  }

  let age = today.getFullYear() - dob.getFullYear();

  if (
    today.getMonth() < dob.getMonth() ||
    (today.getMonth() === dob.getMonth() &&
      today.getDate() < dob.getDate())
  ) {
    age -= 1;
  }

  return age;
}

function SummaryMetric({ icon: Icon, label, value, detail, dark }) {
  return (
    <div
      className={`flex min-w-0 items-center gap-3 border px-4 py-3 ${
        dark
          ? "border-slate-700 bg-[#171827]"
          : "border-slate-200 bg-white/70"
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
          dark ? "bg-[#292B49]" : "bg-[#F1F0FF]"
        }`}
      >
        <Icon
          size={17}
          className={dark ? "text-[#D6D4FF]" : "text-[#3E439C]"}
        />
      </div>

      <div className="min-w-0">
        <p
          className={`truncate text-[11px] ${
            dark ? "text-slate-400" : "text-slate-500"
          }`}
        >
          {label}
        </p>

        <div className="mt-0.5 flex items-baseline gap-2">
          <span
            className={`text-xl font-semibold tabular-nums ${
              dark ? "text-slate-100" : "text-slate-800"
            }`}
          >
            {value}
          </span>

          <span
            className={`hidden truncate text-[10px] sm:inline ${
              dark ? "text-slate-500" : "text-slate-400"
            }`}
          >
            {detail}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function PatientsList() {
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [totalPatients, setTotalPatients] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [selectedPatient, setSelectedPatient] = useState(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const fetchPatients = useCallback(
    async (signal) => {
      setLoading(true);
      setLoadError("");

      try {
        const API_BASE_URL =
          import.meta.env.VITE_API_BASE_URL ||
          "http://localhost:8001";

        const params = new URLSearchParams({
          page: String(page),
          page_size: String(PAGE_SIZE),
          registration_date:
            dateFilter === "week" ? "last_7_days" : dateFilter,
        });

        if (search.trim()) {
          params.set("search", search.trim());
        }

        if (genderFilter !== "all") {
          params.set("gender", genderFilter);
        }

        const response = await fetch(
          `${API_BASE_URL}/api/patients?${params.toString()}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            credentials: "include",
            signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            `Unable to load patients. Server returned ${response.status}.`
          );
        }

        const result = await response.json();

        const records = Array.isArray(result)
          ? result
          : result?.items;

        if (!Array.isArray(records)) {
          throw new Error(
            "The server returned an unexpected patient data format."
          );
        }

        const normalizedPatients = records.map((patient) => {
          const dateOfBirth = patient.date_of_birth ?? "";

          const registrationDate = patient.registered_at ?? "";

          return {
            ...patient,

            // Use the exact fields returned by the API.
            id: patient.id,
            patient_id: patient.patient_id,
            name: patient.name,
            mobile: patient.mobile,
            date_of_birth: dateOfBirth,
            gender: patient.gender,
            email: patient.email,
            address: patient.address,
            registered_at: registrationDate,
            registration_number: patient.registration_number,

            // Derived values used by the existing table.
            patientId: patient.patient_id,
            fullName: patient.name || "Unnamed patient",
            dateOfBirth,
            registrationDate,
            age: dateOfBirth
              ? calculatePatientAge(dateOfBirth)
              : "",
          };
        });

        setPatients(normalizedPatients);

        const total = Number(
          result.total ?? normalizedPatients.length
        );

        setTotalPatients(total);

        setTotalPages(
          Number(
            result.total_pages ?? Math.ceil(total / PAGE_SIZE)
          )
        );
      } catch (error) {
        if (error.name === "AbortError") return;

        console.error("Failed to fetch patients:", error);

        setLoadError(
          error.message ||
            "Unable to load patients. Please try again."
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [page, search, genderFilter, dateFilter]
  );

  useEffect(() => {
    const controller = new AbortController();

    fetchPatients(controller.signal);

    return () => controller.abort();
  }, [fetchPatients]);

  const dark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  const today = new Date();

  const todayCount = patients.filter((patient) => {
    const date = parseDate(patient.registered_at);

    return date ? isSameLocalDay(date, today) : false;
  }).length;

  const recentCount = patients.filter((patient) =>
    isWithinLastSevenDays(patient.registered_at, today)
  ).length;

  const currentPage = Math.min(page, Math.max(totalPages, 1));
  const visiblePatients = patients;

  const rangeStart =
    totalPatients > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0;

  const rangeEnd = Math.min(
    currentPage * PAGE_SIZE,
    totalPatients
  );

  const clearFilters = () => {
    setSearch("");
    setGenderFilter("all");
    setDateFilter("all");
    setPage(1);
    setNotice("");
  };

  const onSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  const onGenderChange = (value) => {
    setGenderFilter(value);
    setPage(1);
  };

  const onDateChange = (value) => {
    setDateFilter(value);
    setPage(1);
  };

  const inputClass = `h-10 w-full rounded-md border px-3 text-[13px] outline-none focus:border-[#3E439C] focus:ring-2 focus:ring-[#3E439C]/10 ${
    dark
      ? "border-slate-700 bg-[#171827] text-slate-100 placeholder:text-slate-500"
      : "border-slate-200 bg-white text-slate-700 placeholder:text-slate-400"
  }`;

  const subtleText = dark ? "text-slate-400" : "text-slate-500";

  const handleEdit = (patient) => {
    const patientId = patient?.patient_id;

    if (!patientId) {
      setNotice("Unable to edit patient: Patient ID is missing.");
      return;
    }

    navigate(
      `/patients/${encodeURIComponent(patientId)}/edit`
    );
  };

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <FullPageLoader show={loading} />

      {/* Page header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2
            className={`text-xl font-semibold tracking-tight ${
              dark ? "text-slate-100" : "text-slate-800"
            }`}
          >
            Patients
          </h2>

          <p className={`mt-1 text-[13px] ${subtleText}`}>
            View and manage registered patients
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/patients/new")}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#3E439C] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#323780]"
        >
          <UserRoundPlus size={16} />
          Register Patient
        </button>
      </div>

      {/* Summary metrics */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryMetric
          icon={Users}
          label="Total Patients"
          value={totalPatients}
          detail="Available records"
          dark={dark}
        />

        <SummaryMetric
          icon={CalendarDays}
          label="Registered Today"
          value={todayCount}
          detail="Today's registrations"
          dark={dark}
        />

        <SummaryMetric
          icon={UserRound}
          label="Recently Added"
          value={recentCount}
          detail="Last 7 days"
          dark={dark}
        />
      </div>

      {/* Search and filters */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1 lg:max-w-[520px]">
          <Search
            size={17}
            className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${subtleText}`}
          />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              onSearchChange(event.target.value)
            }
            placeholder="Search by patient name, ID or mobile number"
            aria-label="Search patients"
            className={`${inputClass} pl-10`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={genderFilter}
            onChange={(event) =>
              onGenderChange(event.target.value)
            }
            aria-label="Filter by gender"
            className={`${inputClass} min-w-[145px] sm:w-auto`}
          >
            <option value="all">All genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer not to say">
              Prefer not to say
            </option>
          </select>

          <select
            value={dateFilter}
            onChange={(event) =>
              onDateChange(event.target.value)
            }
            aria-label="Filter by registration date"
            className={`${inputClass} min-w-[150px] sm:w-auto`}
          >
            <option value="all">All dates</option>
            <option value="today">Today</option>
            <option value="week">Last 7 days</option>
          </select>

          <button
            type="button"
            onClick={clearFilters}
            className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-md border px-3 text-[12px] font-medium transition-colors ${
              dark
                ? "border-slate-700 text-slate-300 hover:bg-slate-800"
                : "border-slate-200 text-slate-600 hover:bg-white"
            }`}
          >
            <RotateCcw size={14} />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Status notice */}
      {notice && (
        <div
          role="status"
          className={`mb-4 flex items-start justify-between gap-3 border px-3 py-2.5 text-[12px] ${
            dark
              ? "border-amber-800 bg-amber-950/30 text-amber-200"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          <p>{notice}</p>

          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss message"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Loading error */}
      {loadError && (
        <div className="mb-4 flex items-center justify-between border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <span>{loadError}</span>

          <button
            type="button"
            onClick={() => fetchPatients()}
            className="inline-flex items-center gap-2"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      )}

      {/* Patient table */}
      <PatientTable
        patients={visiblePatients}
        dark={dark}
        loading={loading}
        onViewPatient={setSelectedPatient}
        onEditPatient={handleEdit}
        emptyMessage={
          totalPatients === 0
            ? "No patients registered yet."
            : "No patients match your search or filters."
        }
      />

      {/* Patient details modal */}
      <PatientDetailsModal
        patient={selectedPatient}
        dark={dark}
        onClose={() => setSelectedPatient(null)}
        onEditPatient={handleEdit}
      />

      {/* Empty state */}
      {!loading && visiblePatients.length === 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className={`text-xs ${subtleText}`}>
            {totalPatients === 0
              ? "Register a patient to see their details here."
              : "Try changing your search or filters to find a patient."}
          </p>

          {totalPatients === 0 ? (
            <button
              type="button"
              onClick={() => navigate("/patients/new")}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-[#3E439C] px-3.5 text-xs font-semibold text-white hover:bg-[#323780]"
            >
              <UserRoundPlus size={15} />
              Register Patient
            </button>
          ) : (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3.5 text-xs font-medium hover:bg-white dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <X size={14} />
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Pagination */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 py-4 text-xs ${subtleText}`}
      >
        <p>
          Showing{" "}
          <span className="font-medium">
            {rangeStart}–{rangeEnd}
          </span>{" "}
          of{" "}
          <span className="font-medium">{totalPatients}</span>{" "}
          patients
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setPage((current) => Math.max(1, current - 1))
            }
            disabled={currentPage <= 1 || loading}
            aria-label="Previous page"
            className={`flex h-8 w-8 items-center justify-center border disabled:cursor-not-allowed disabled:opacity-40 ${
              dark
                ? "border-slate-700 hover:bg-slate-800"
                : "border-slate-200 hover:bg-white"
            }`}
          >
            <ChevronLeft size={16} />
          </button>

          <span className="min-w-[70px] text-center">
            Page {totalPatients > 0 ? currentPage : 0} of{" "}
            {totalPages}
          </span>

          <button
            type="button"
            onClick={() =>
              setPage((current) =>
                Math.min(totalPages, current + 1)
              )
            }
            disabled={
              currentPage >= totalPages ||
              totalPatients === 0 ||
              loading
            }
            aria-label="Next page"
            className={`flex h-8 w-8 items-center justify-center border disabled:cursor-not-allowed disabled:opacity-40 ${
              dark
                ? "border-slate-700 hover:bg-slate-800"
                : "border-slate-200 hover:bg-white"
            }`}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
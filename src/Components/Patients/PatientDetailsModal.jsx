import { useEffect, useRef } from "react";
import {
  X,
  UserRound,
  Phone,
  ClipboardList,
} from "lucide-react";

const getValue = (...values) => {
  const value = values.find(
    (item) =>
      item !== undefined &&
      item !== null &&
      item !== ""
  );

  return value ?? "—";
};

const getPatientName = (patient) =>
  patient?.name?.trim() || "Patient";

const getPatientId = (patient) =>
  getValue(patient?.patient_id);

const getAge = (patient) => {
  const dob = patient?.date_of_birth;

  if (!dob) return "—";

  const birthDate = new Date(dob);

  if (Number.isNaN(birthDate.getTime())) {
    return "—";
  }

  const today = new Date();

  let age =
    today.getFullYear() - birthDate.getFullYear();

  const birthdayNotReached =
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() &&
      today.getDate() < birthDate.getDate());

  if (birthdayNotReached) {
    age--;
  }

  return age >= 0 ? `${age} years` : "—";
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const InfoField = ({ label, value, dark }) => (
  <div className="min-w-0 space-y-1.5">
    <p
      className={`text-xs font-medium ${
        dark ? "text-slate-400" : "text-slate-500"
      }`}
    >
      {label}
    </p>

    <p
      className={`break-words text-sm font-medium ${
        dark ? "text-slate-100" : "text-slate-800"
      }`}
    >
      {getValue(value)}
    </p>
  </div>
);

const DetailSection = ({
  title,
  icon: Icon,
  children,
  dark,
}) => (
  <section
    className={`rounded-xl border p-4 sm:p-5 ${
      dark
        ? "border-slate-700 bg-slate-800/40"
        : "border-slate-200 bg-white"
    }`}
  >
    <div className="mb-5 flex items-center gap-2.5">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
          dark
            ? "bg-[#303253] text-[#C8C6FF]"
            : "bg-[#F1F0FF] text-[#3E439C]"
        }`}
      >
        <Icon size={18} strokeWidth={1.8} />
      </div>

      <h3
        className={`text-sm font-semibold ${
          dark ? "text-slate-100" : "text-slate-800"
        }`}
      >
        {title}
      </h3>
    </div>

    <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
      {children}
    </div>
  </section>
);

const PatientDetailsModal = ({
  patient,
  onClose,
  onEditPatient,
  dark = false,
}) => {
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (!patient) return undefined;

    previousFocusRef.current = document.activeElement;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
        return;
      }

      if (event.key === "Tab") {
        const dialog = document.getElementById(
          "patient-details-dialog"
        );

        if (!dialog) return;

        const focusable = dialog.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (
          event.shiftKey &&
          document.activeElement === first
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === last
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

      previousFocusRef.current?.focus?.();
    };
  }, [patient, onClose]);

  if (!patient) return null;

  const patientName = getPatientName(patient);
  const patientId = getPatientId(patient);

  const dob = patient.date_of_birth;

  const email = getValue(patient.email);
  const mobile = getValue(patient.mobile);
  const address = getValue(patient.address);
  const gender = getValue(patient.gender);

  const registrationDate = formatDate(
    patient.registered_at
  );

  const registrationDetails = [
    {
      label: "Registration Date",
      value: registrationDate,
    },
    {
      label: "Registration Number",
      value: patient.registration_number,
    },
  ].filter(
    (field) =>
      field.value !== undefined &&
      field.value !== null &&
      field.value !== ""
  );

  const primaryText = dark
    ? "text-slate-100"
    : "text-slate-900";

  const secondaryText = dark
    ? "text-slate-400"
    : "text-slate-500";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-[3px] sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        id="patient-details-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-details-title"
        aria-describedby="patient-details-description"
        className={`my-auto flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border shadow-2xl ${
          dark
            ? "border-slate-700 bg-slate-900"
            : "border-slate-200 bg-white"
        }`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header
          className={`flex shrink-0 items-start justify-between gap-4 border-b px-5 py-5 sm:px-7 ${
            dark
              ? "border-slate-700"
              : "border-slate-200"
          }`}
        >
          <div className="min-w-0">
            <p
              className={`mb-1 text-xs font-semibold uppercase tracking-wider ${
                dark
                  ? "text-[#B9B7FF]"
                  : "text-[#3E439C]"
              }`}
            >
              Patient Record
            </p>

            <h2
              id="patient-details-title"
              className={`text-xl font-semibold tracking-tight sm:text-2xl ${primaryText}`}
            >
              Patient Details
            </h2>

            <p
              id="patient-details-description"
              className={`mt-1 text-sm ${secondaryText}`}
            >
              View the patient's registered information
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close patient details"
            className={`flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E439C]/40 ${
              dark ? "text-slate-300" : "text-slate-500"
            }`}
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-7">
          <div
            className={`flex items-center gap-4 rounded-xl border p-4 sm:p-5 ${
              dark
                ? "border-[#454575] bg-[#272846]"
                : "border-[#E4E2FF] bg-[#F8F7FF]"
            }`}
          >
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${
                dark
                  ? "bg-[#39395F] text-[#D6D4FF]"
                  : "bg-[#EAE8FF] text-[#3E439C]"
              }`}
            >
              <UserRound size={27} strokeWidth={1.7} />
            </div>

            <div className="min-w-0 flex-1">
              <h3
                className={`break-words text-lg font-semibold ${primaryText}`}
              >
                {patientName}
              </h3>

              <p className={`mt-1 text-sm ${secondaryText}`}>
                Patient ID / UHID:{" "}
                <span
                  className={`font-medium ${
                    dark
                      ? "text-[#C8C6FF]"
                      : "text-[#3E439C]"
                  }`}
                >
                  {patientId}
                </span>
              </p>
            </div>
          </div>

          <DetailSection
            title="Personal Information"
            icon={UserRound}
            dark={dark}
          >
            <InfoField
              label="Full Name"
              value={patientName}
              dark={dark}
            />

            <InfoField
              label="Date of Birth"
              value={dob ? formatDate(dob) : "—"}
              dark={dark}
            />

            <InfoField
              label="Age"
              value={getAge(patient)}
              dark={dark}
            />

            <InfoField
              label="Gender"
              value={gender}
              dark={dark}
            />
          </DetailSection>

          <DetailSection
            title="Contact Information"
            icon={Phone}
            dark={dark}
          >
            <InfoField
              label="Mobile Number"
              value={mobile}
              dark={dark}
            />

            <InfoField
              label="Email Address"
              value={email}
              dark={dark}
            />

            <div className="sm:col-span-2">
              <InfoField
                label="Address"
                value={address}
                dark={dark}
              />
            </div>
          </DetailSection>

          <DetailSection
            title="Registration Information"
            icon={ClipboardList}
            dark={dark}
          >
            <InfoField
              label="Patient ID / UHID"
              value={patientId}
              dark={dark}
            />

            {registrationDetails.map((field) => (
              <InfoField
                key={field.label}
                label={field.label}
                value={field.value}
                dark={dark}
              />
            ))}
          </DetailSection>
        </div>
      </div>
    </div>
  );
};

export default PatientDetailsModal;
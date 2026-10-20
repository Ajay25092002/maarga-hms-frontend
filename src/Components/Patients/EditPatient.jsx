import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  UserRoundPen,
  Phone,
  CalendarDays,
  MapPin,
  ArrowLeft,
  Save,
  Mail,
  RotateCcw,
  LoaderCircle,
  AlertCircle,
  MapPinned,
  UsersRound,
} from "lucide-react";

import { useTheme } from "../../Context/ThemeContext";
import { useToast } from "../Common/useToast";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8001";

const initialForm = {
  name: "",
  date_of_birth: "",
  gender: "",
  mobile: "",
  email: "",
  address: "",
  pincode: "",
  referral: "",
  source_of_lead: "",
};

function getErrorMessage(data, fallback) {
  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (Array.isArray(data?.detail)) {
    return data.detail
      .map((item) => item.msg)
      .filter(Boolean)
      .join(", ");
  }

  return fallback;
}

function Field({ label, name, required = false, error, labelClass, children }) {
  return (
    <div className="min-w-0">
      <label htmlFor={name} className={labelClass}>
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {children}

      {error && (
        <p className="mt-1.5 text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function LeadingIcon({ icon: Icon, className = "" }) {
  return (
    <Icon
      aria-hidden="true"
      size={16}
      className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 ${className}`}
    />
  );
}

export default function EditPatient() {
  const navigate = useNavigate();
  const { patientId } = useParams();
  const { theme } = useTheme();
  const { showToast } = useToast();

  const isDark = theme === "dark";

  const [form, setForm] = useState(initialForm);
  const [originalPatient, setOriginalPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [errors, setErrors] = useState({});

  const labelClass = `mb-2 block text-[13px] font-medium ${
    isDark ? "text-slate-300" : "text-slate-600"
  }`;

  const inputClass = `block h-[40px] w-full min-w-0 rounded-md border px-3 text-sm outline-none transition-colors focus:border-[#3E439C] focus:ring-2 focus:ring-[#3E439C]/10 ${
    isDark
      ? "border-slate-700 bg-[#171827] text-slate-100 placeholder:text-slate-500"
      : "border-slate-200 bg-white text-slate-800 placeholder:text-slate-400"
  }`;

  const mutedClass = "text-slate-400";

  const textareaClass = `block min-h-[80px] w-full min-w-0 resize-y rounded-md border py-3 pl-10 pr-3 text-sm outline-none transition-colors focus:border-[#3E439C] focus:ring-2 focus:ring-[#3E439C]/10 ${
    isDark
      ? "border-slate-700 bg-[#171827] text-slate-100 placeholder:text-slate-500"
      : "border-slate-200 bg-white text-slate-800 placeholder:text-slate-400"
  }`;

  const fetchPatient = useCallback(
    async (signal) => {
      setLoading(true);
      setLoadError("");

      try {
        if (!patientId) {
          throw new Error("Patient ID is missing from the URL.");
        }

        const response = await fetch(
          `${API_BASE_URL}/api/patients/${encodeURIComponent(patientId)}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
            credentials: "include",
            signal,
          },
        );

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            getErrorMessage(data, "Unable to load patient details."),
          );
        }

        const patient = data?.patient ?? data;

        if (!patient || typeof patient !== "object") {
          throw new Error("The server returned invalid patient details.");
        }

        setOriginalPatient(patient);

        setForm({
          name: patient.name ?? "",
          date_of_birth: patient.date_of_birth
            ? String(patient.date_of_birth).slice(0, 10)
            : "",
          gender: patient.gender ?? "",
          mobile: patient.mobile ?? "",
          email: patient.email ?? "",
          address: patient.address ?? "",
          pincode: patient.pincode ?? "",
          referral: patient.referral ?? "",
          source_of_lead: patient.source_of_lead ?? "",
        });
      } catch (error) {
        if (error.name === "AbortError") return;

        console.error("Failed to load patient:", error);
        setLoadError(error.message || "Unable to load patient details.");
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [patientId],
  );

  useEffect(() => {
    const controller = new AbortController();

    fetchPatient(controller.signal);

    return () => controller.abort();
  }, [fetchPatient]);

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    setErrors((current) => ({
      ...current,
      [name]: "",
    }));
  };

  const updateMobile = (event) => {
    const value = event.target.value.replace(/\D/g, "").slice(0, 10);

    setForm((current) => ({
      ...current,
      mobile: value,
    }));

    setErrors((current) => ({
      ...current,
      mobile: "",
    }));
  };

  const updatePincode = (event) => {
    const value = event.target.value.replace(/\D/g, "").slice(0, 6);

    setForm((current) => ({
      ...current,
      pincode: value,
    }));

    setErrors((current) => ({
      ...current,
      pincode: "",
    }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = "Full name is required.";
    }

    if (!/^[6-9]\d{9}$/.test(form.mobile)) {
      nextErrors.mobile = "Enter a valid 10-digit Indian mobile number.";
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (form.date_of_birth) {
      const dob = new Date(`${form.date_of_birth}T00:00:00`);

      if (Number.isNaN(dob.getTime()) || dob > new Date()) {
        nextErrors.date_of_birth = "Enter a valid date of birth.";
      }
    }

    if (!form.address.trim()) {
      nextErrors.address = "Address is required.";
    }

    if (!/^\d{6}$/.test(form.pincode)) {
      nextErrors.pincode = "Enter a valid 6-digit pincode.";
    }

    if (form.referral.trim().length > 255) {
      nextErrors.referral = "Referral must not exceed 255 characters.";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const handleReset = () => {
    if (!originalPatient) return;

    setForm({
      name: originalPatient.name ?? "",
      date_of_birth: originalPatient.date_of_birth
        ? String(originalPatient.date_of_birth).slice(0, 10)
        : "",
      gender: originalPatient.gender ?? "",
      mobile: originalPatient.mobile ?? "",
      email: originalPatient.email ?? "",
      address: originalPatient.address ?? "",
      pincode: originalPatient.pincode ?? "",
      referral: originalPatient.referral ?? "",
      source_of_lead: originalPatient.source_of_lead ?? "",
    });

    setErrors({});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving || !validate()) {
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        mobile: form.mobile.trim(),
        email: form.email.trim() || null,
        address: form.address.trim(),
        pincode: form.pincode.trim(),
        referral: form.referral.trim() || null,
        source_of_lead: form.source_of_lead || null,
      };

      const response = await fetch(
        `${API_BASE_URL}/api/patients/${encodeURIComponent(patientId)}`,
        {
          method: "PUT",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "Unable to update patient."));
      }

      showToast({
        type: "success",
        title: "Patient updated",
        message: "Patient details updated successfully.",
      });

      navigate("/patients", {
        replace: true,
        state: {
          patientUpdated: true,
          patientId,
        },
      });
    } catch (error) {
      console.error("Failed to update patient:", error);

      showToast({
        type: "error",
        title: "Update failed",
        message:
          error instanceof TypeError
            ? "Unable to connect to the server. Please try again."
            : error.message || "Unable to update patient.",
        duration: 6000,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
          <LoaderCircle size={20} className="animate-spin" />
          Loading patient details...
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-[1200px]">
        <button
          type="button"
          onClick={() => navigate("/patients")}
          className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-[#3E439C] dark:text-slate-400"
        >
          <ArrowLeft size={16} />
          Back to Patients
        </button>

        <div
          role="alert"
          className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />

          <div>
            <p className="font-semibold">Unable to load patient</p>
            <p className="mt-1">{loadError}</p>

            <button
              type="button"
              onClick={() => fetchPatient()}
              className="mt-3 font-semibold underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F1F0FF] dark:bg-[#292B49]">
            <UserRoundPen
              size={20}
              className="text-[#3E439C] dark:text-[#D6D4FF]"
            />
          </div>

          <div>
            <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Edit Patient
            </h1>
            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
              Update the patient's registered information
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate("/patients")}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-[13px] font-medium text-slate-600 transition-colors hover:bg-white disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ArrowLeft size={15} />
          Patient List
        </button>
      </div>

      <div className="mb-5 flex flex-wrap gap-x-8 gap-y-3 border-b border-slate-200/80 pb-4 dark:border-slate-700">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Patient ID / UHID
          </p>
          <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">
            {originalPatient?.patient_id ?? patientId}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Registration Date
          </p>
          <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">
            {originalPatient?.registered_at
              ? new Date(originalPatient.registered_at).toLocaleString(
                  "en-IN",
                  {
      timeZone: "Asia/Kolkata",
                    dateStyle: "medium",
                    timeStyle: "short",
                    hour12: true,
                  },
                )
              : "—"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-x-3 gap-y-3 md:grid-cols-2">
          <Field
            label="Full Name"
            name="name"
            required
            error={errors.name}
            labelClass={labelClass}
          >
            <input
              id="name"
              name="name"
              value={form.name}
              onChange={updateField}
              placeholder="Enter patient's full name"
              autoComplete="name"
              maxLength={201}
              required
              className={inputClass}
            />
          </Field>

          <Field
            label="Mobile Number"
            name="mobile"
            required
            error={errors.mobile}
            labelClass={labelClass}
          >
            <div className="relative">
              <LeadingIcon icon={Phone} className={mutedClass} />
              <input
                id="mobile"
                name="mobile"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={form.mobile}
                onChange={updateMobile}
                placeholder="10-digit mobile number"
                maxLength={10}
                required
                className={`${inputClass} pl-10`}
              />
            </div>
          </Field>

          <Field
            label="Date of Birth"
            name="date_of_birth"
            error={errors.date_of_birth}
            labelClass={labelClass}
          >
            <div className="relative">
              <LeadingIcon icon={CalendarDays} className={mutedClass} />
              <input
                id="date_of_birth"
                name="date_of_birth"
                type="date"
                value={form.date_of_birth}
                max={new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())}
                onChange={updateField}
                className={`${inputClass} pl-10`}
              />
            </div>
          </Field>

          <Field label="Gender" name="gender" labelClass={labelClass}>
            <select
              id="gender"
              name="gender"
              value={form.gender}
              onChange={updateField}
              className={inputClass}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer not to say">Prefer not to say</option>
            </select>
          </Field>

          <Field
            label="Email Address"
            name="email"
            error={errors.email}
            labelClass={labelClass}
          >
            <div className="relative">
              <LeadingIcon icon={Mail} className={mutedClass} />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={updateField}
                placeholder="patient@example.com"
                maxLength={254}
                className={`${inputClass} pl-10`}
              />
            </div>
          </Field>

          <Field
            label="Pincode"
            name="pincode"
            required
            error={errors.pincode}
            labelClass={labelClass}
          >
            <div className="relative">
              <LeadingIcon icon={MapPinned} className={mutedClass} />
              <input
                id="pincode"
                name="pincode"
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                value={form.pincode}
                onChange={updatePincode}
                placeholder="6-digit pincode"
                maxLength={6}
                required
                className={`${inputClass} pl-10`}
              />
            </div>
          </Field>

          <div className="min-w-0 md:col-span-2">
            <Field
              label="Address"
              name="address"
              required
              error={errors.address}
              labelClass={labelClass}
            >
              <div className="relative">
                <MapPin
                  size={16}
                  className={`pointer-events-none absolute left-3 top-3.5 ${mutedClass}`}
                />
                <textarea
                  id="address"
                  name="address"
                  rows={3}
                  value={form.address}
                  onChange={updateField}
                  placeholder="House number, street, area, city and state"
                  maxLength={1000}
                  required
                  className={textareaClass}
                />
              </div>
            </Field>
          </div>

          <Field
            label="Referral (Optional)"
            name="referral"
            error={errors.referral}
            labelClass={labelClass}
          >
            <div className="relative">
              <LeadingIcon icon={UsersRound} className={mutedClass} />
              <input
                id="referral"
                name="referral"
                type="text"
                value={form.referral}
                onChange={updateField}
                placeholder="Referral source or person"
                maxLength={255}
                className={`${inputClass} pl-10`}
              />
            </div>
          </Field>
          <Field label="Source of Lead (Optional)" name="source_of_lead" error={errors.source_of_lead} labelClass={labelClass}>
            <select id="source_of_lead" name="source_of_lead" value={form.source_of_lead} onChange={updateField} className={inputClass}>
              <option value="">Select source of lead</option>
              <option value="Word of mouth">Word of mouth</option>
              <option value="Google">Google</option>
              <option value="Social media">Social media</option>
              <option value="Maps">Maps</option>
              <option value="Advertisement">Advertisement</option>
            </select>
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200/80 pt-4 dark:border-slate-700">
          <p className="text-xs text-slate-400">
            Fields marked with * are required.
          </p>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-white disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RotateCcw size={15} />
              Reset
            </button>

            <button
              type="submit"
              disabled={saving}
              aria-busy={saving}
              className="inline-flex items-center gap-2 rounded-md bg-[#3E439C] px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#323780] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <LoaderCircle size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

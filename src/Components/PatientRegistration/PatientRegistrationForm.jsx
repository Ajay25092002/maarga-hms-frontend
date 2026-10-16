import { useState } from "react";
import {
  UserRoundPlus,
  Phone,
  CalendarDays,
  MapPin,
  RotateCcw,
  Mail,
  MapPinned,
  UsersRound,
} from "lucide-react";

import { useTheme } from "../../Context/ThemeContext";
import Loader from "../Common/Loader";
import { useToast } from "../Common/useToast";
import FullPageLoader from "../Common/FullPageLoader";

const initialForm = {
  fullName: "",
  mobile: "",
  dateOfBirth: "",
  gender: "",
  email: "",
  address: "",
  pincode: "",
  referral: "",
};

function Field({ label, name, required, error, labelClass, children }) {
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

export default function PatientRegistrationForm() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [form, setForm] = useState({ ...initialForm });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showToast } = useToast();

  const labelClass = `mb-2 block text-[13px] font-medium ${
    isDark ? "text-slate-300" : "text-slate-600"
  }`;

  const inputClass = `block h-[40px] w-full min-w-0 rounded-md border px-3 text-sm outline-none transition-colors focus:border-[#3E439C] focus:ring-2 focus:ring-[#3E439C]/10 ${
    isDark
      ? "border-slate-700 bg-[#171827] text-slate-100 placeholder:text-slate-500"
      : "border-slate-200 bg-white text-slate-800 placeholder:text-slate-400"
  }`;

  const textareaClass = `block min-h-[80px] w-full min-w-0 resize-y rounded-md border py-3 pl-10 pr-3 text-sm outline-none transition-colors focus:border-[#3E439C] focus:ring-2 focus:ring-[#3E439C]/10 ${
    isDark
      ? "border-slate-700 bg-[#171827] text-slate-100 placeholder:text-slate-500"
      : "border-slate-200 bg-white text-slate-800 placeholder:text-slate-400"
  }`;

  const mutedClass = "text-slate-400";

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

    setMessage("");
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

    setMessage("");
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

    setMessage("");
  };

  const validate = () => {
    const next = {};

    if (!form.fullName.trim()) {
      next.fullName = "Full name is required.";
    } else if (form.fullName.trim().length < 2) {
      next.fullName = "Full name must contain at least 2 characters.";
    }

    if (!/^[6-9]\d{9}$/.test(form.mobile)) {
      next.mobile = "Enter a valid 10-digit Indian mobile number.";
    }

    if (form.dateOfBirth) {
      const dob = new Date(`${form.dateOfBirth}T00:00:00`);

      if (Number.isNaN(dob.getTime()) || dob > new Date()) {
        next.dateOfBirth = "Enter a valid date of birth.";
      }
    }

    if (!form.gender) {
      next.gender = "Please select a gender.";
    }

    if (
      form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      next.email = "Enter a valid email address.";
    }

    if (!form.address.trim()) {
      next.address = "Address is required.";
    }

    if (!/^\d{6}$/.test(form.pincode)) {
      next.pincode = "Enter a valid 6-digit Indian pincode.";
    }

    if (form.referral.trim().length > 255) {
      next.referral = "Referral must not exceed 255 characters.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmitting) return;

    setMessage("");

    if (!validate()) {
      showToast({
        type: "warning",
        message: "Please correct the highlighted fields.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

      const payload = {
        name: form.fullName.trim(),
        mobile: form.mobile,
        date_of_birth: form.dateOfBirth || null,
        gender: form.gender,
        email: form.email.trim() || null,
        address: form.address.trim(),
        pincode: form.pincode,
        referral: form.referral.trim() || null,
      };

      const response = await fetch(`${API_BASE_URL}/api/patients`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const detail = result.detail;

        const errorMessage =
          typeof detail === "string"
            ? detail
            : Array.isArray(detail)
              ? detail
                  .map((item) => {
                    const field = Array.isArray(item.loc)
                      ? item.loc[item.loc.length - 1]
                      : null;

                    const message = item.msg || "Invalid value";

                    return field ? `${field}: ${message}` : message;
                  })
                  .join(", ")
              : "Unable to register patient. Please try again.";

        throw new Error(errorMessage);
      }

      const patientId = result.patient_id
        ? ` Patient ID: ${result.patient_id}.`
        : "";

      showToast({
        type: "success",
        title: "Patient registered",
        message: `Patient registered successfully.${patientId}`,
      });

      setErrors({});
      setForm({ ...initialForm });
    } catch (error) {
      console.error("Patient registration failed:", error);

      showToast({
        type: "error",
        title: "Registration failed",
        message:
          error instanceof TypeError
            ? "Unable to connect to the server. Please check your connection and try again."
            : error.message || "Unable to register patient. Please try again.",
        duration: 6000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setForm({ ...initialForm });
    setErrors({});
    setMessage("");
  };

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <FullPageLoader show={isSubmitting} />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F1F0FF] dark:bg-[#292B49]">
            <UserRoundPlus
              size={20}
              className="text-[#3E439C] dark:text-[#D6D4FF]"
            />
          </div>

          <div>
            <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Patient Registration
            </h1>

            <p className="text-[13px] text-slate-500 dark:text-slate-400">
              Register patient details for hospital billing and visits
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="grid grid-cols-1 gap-x-3 gap-y-3 md:grid-cols-2">
          {/* Full Name */}
          <Field
            label="Full Name"
            name="fullName"
            required
            error={errors.fullName}
            labelClass={labelClass}
          >
            <input
              id="fullName"
              name="fullName"
              value={form.fullName}
              onChange={updateField}
              placeholder="Enter patient's full name"
              autoComplete="name"
              maxLength={150}
              className={inputClass}
            />
          </Field>

          {/* Mobile Number */}
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
                className={`${inputClass} pl-10`}
              />
            </div>
          </Field>

          {/* Date of Birth */}
          <Field
            label="Date of Birth"
            name="dateOfBirth"
            error={errors.dateOfBirth}
            labelClass={labelClass}
          >
            <div className="relative">
              <LeadingIcon icon={CalendarDays} className={mutedClass} />

              <input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                value={form.dateOfBirth}
                max={new Date().toISOString().slice(0, 10)}
                onChange={updateField}
                className={`${inputClass} pl-10`}
              />
            </div>
          </Field>

          {/* Gender */}
          <Field
            label="Gender"
            name="gender"
            required
            error={errors.gender}
            labelClass={labelClass}
          >
            <select
              id="gender"
              name="gender"
              value={form.gender}
              onChange={updateField}
              className={inputClass}
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </Field>

          {/* Email Address */}
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
                maxLength={255}
                className={`${inputClass} pl-10`}
              />
            </div>
          </Field>

          {/* Pincode */}
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
                placeholder="Enter 6-digit pincode"
                maxLength={6}
                className={`${inputClass} pl-10`}
              />
            </div>
          </Field>

          {/* Address */}
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
                  placeholder="Enter house number, street, area, city and state"
                  maxLength={1000}
                  className={textareaClass}
                />
              </div>
            </Field>
          </div>

          {/* Referral */}
          <div className="min-w-0 md:col-span-2">
            <Field
              label="Referral"
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
                  placeholder="Enter referral name or source (optional)"
                  maxLength={255}
                  className={`${inputClass} pl-10`}
                />
              </div>
            </Field>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200/80 pt-4 dark:border-slate-700">
         

          <div className="ml-auto flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-4 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-white disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RotateCcw size={15} />
              Reset
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="inline-flex items-center gap-2 rounded-md bg-[#3E439C] px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#323780] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader
                  variant="button"
                  size="sm"
                  message="Saving..."
                  className="text-white [&_span:first-child]:border-white/30 [&_span:first-child]:border-t-white"
                />
              ) : (
                <>
                  <UserRoundPlus size={16} />
                  Register Patient
                </>
              )}
            </button>
          </div>
        </div>

        {message && (
          <p
            role="status"
            className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
          >
            {message}
          </p>
        )}
      </form>
    </div>
  );
}

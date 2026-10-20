
import { useEffect, useState } from "react";
import { KeyRound, Save, UserRound } from "lucide-react";
import { useTheme } from "../../Context/ThemeContext";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8001"
).replace(/\/$/, "");

const inputBase =
  "w-full min-w-0 rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:border-[#3E439C] focus:ring-2 focus:ring-[#3E439C]/10";

export default function UserForm({
  initialData = null,
  onSubmit,
  submitting = false,
  submitLabel = "Create User",
}) {
  const { theme } = useTheme();
  const dark = theme === "dark";

  const [form, setForm] = useState({
    login_id: "",
    full_name: "",
    email: "",
    password: "",
    role_id: "",
    is_active: true,
  });

  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (!initialData) return;

    setForm({
      login_id: initialData.login_id || "",
      full_name: initialData.full_name || "",
      email: initialData.email || "",
      password: "",
      role_id: String(initialData.role_id || ""),
      is_active: Boolean(initialData.is_active),
    });
  }, [initialData]);

  useEffect(() => {
    let cancelled = false;

    async function loadRoles() {
      setRolesLoading(true);
      setRolesError("");

      try {
        const response = await fetch(`${API_BASE_URL}/api/users/roles`);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.detail || "Unable to load roles.");
        }

        if (!Array.isArray(data)) {
          throw new Error("The roles API returned an unexpected response.");
        }

        if (!cancelled) setRoles(data);
      } catch (error) {
        if (!cancelled) {
          setRolesError(error.message || "Unable to load roles.");
        }
      } finally {
        if (!cancelled) setRolesLoading(false);
      }
    }

    loadRoles();

    return () => {
      cancelled = true;
    };
  }, []);

  const setField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    setValidationError("");
  };

  const inputClass = [
    inputBase,
    dark
      ? "border-slate-700 bg-[#191A2A] text-slate-100 placeholder:text-slate-500"
      : "border-slate-200 bg-white text-slate-800 placeholder:text-slate-400",
  ].join(" ");

  const labelClass = `mb-1.5 block text-sm font-medium ${
    dark ? "text-slate-200" : "text-slate-700"
  }`;

  const cardClass = `rounded-xl border p-4 sm:p-5 ${
    dark
      ? "border-slate-800 bg-[#171827]"
      : "border-slate-200 bg-white"
  }`;

  const helperClass = `mt-1 text-xs ${
    dark ? "text-slate-400" : "text-slate-500"
  }`;

  const handleSubmit = (event) => {
    event.preventDefault();
    setValidationError("");

    const loginId = form.login_id.trim();

    if (!loginId || loginId.length > 50) {
      setValidationError(
        "User ID is required and must not exceed 50 characters."
      );
      return;
    }

    if (!form.full_name.trim()) {
      setValidationError("Please enter the user's full name.");
      return;
    }

    if (!form.role_id) {
      setValidationError("Please select a role for this user.");
      return;
    }

    if (!initialData && !form.password) {
      setValidationError("Please enter a password.");
      return;
    }

    if (form.email.trim()) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(form.email.trim())) {
        setValidationError("Please enter a valid email address.");
        return;
      }
    }

    const payload = {
      login_id: form.login_id.trim().toUpperCase(),
      full_name: form.full_name.trim(),
      email: form.email.trim()
        ? form.email.trim().toLowerCase()
        : null,
      role_id: Number(form.role_id),
      is_active: form.is_active,
    };

    if (form.password) {
      payload.password = form.password;
    }

    onSubmit(payload);
  };

  const errorMessage = validationError || rolesError;

  return (
    <form onSubmit={handleSubmit} className="w-full min-w-0 space-y-4">
      <section className={cardClass}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F1F0FF] dark:bg-[#292B49]">
            <UserRound
              size={19}
              className="text-[#3E439C] dark:text-[#D6D4FF]"
            />
          </div>

          <div>
            <h2 className="text-sm font-semibold">User Information</h2>
            <p className={helperClass}>
              Enter a unique User ID and the user's details.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-5 gap-y-3.5 md:grid-cols-2">
          <div className="min-w-0">
            <label className={labelClass} htmlFor="login_id">
              User ID <span className="text-red-500">*</span>
            </label>

            <input
              id="login_id"
              name="login_id"
              type="text"
              className={inputClass}
              value={form.login_id}
              onChange={(e) =>
                setField("login_id", e.target.value.toUpperCase())
              }
              minLength={8}
              maxLength={20}
              autoComplete="off"
              required
              placeholder="e.g. USR00105"
              aria-describedby="login_id_help"
            />

            <p id="login_id_help" className={helperClass}>
              Enter a unique ID using USR followed by at least five digits.
            </p>
          </div>

          <div className="min-w-0">
            <label className={labelClass} htmlFor="full_name">
              Full Name <span className="text-red-500">*</span>
            </label>

            <input
              id="full_name"
              name="full_name"
              type="text"
              className={inputClass}
              value={form.full_name}
              onChange={(e) => setField("full_name", e.target.value)}
              minLength={2}
              maxLength={150}
              autoComplete="name"
              required
              placeholder="Enter full name"
            />
          </div>

          <div className="min-w-0">
            <label className={labelClass} htmlFor="email">
              Email Address{" "}
              <span className={helperClass}>(Optional)</span>
            </label>

            <input
              id="email"
              name="email"
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              maxLength={255}
              autoComplete="email"
              placeholder="Enter email address (optional)"
            />

            <p className={helperClass}>
              Email address is optional. Leave blank if unavailable.
            </p>
          </div>
        </div>
      </section>

      <section className={cardClass}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F1F0FF] dark:bg-[#292B49]">
            <KeyRound
              size={19}
              className="text-[#3E439C] dark:text-[#D6D4FF]"
            />
          </div>

          <div>
            <h2 className="text-sm font-semibold">Access &amp; Security</h2>
            <p className={helperClass}>
              Assign a role and configure account access.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-5 gap-y-3.5 md:grid-cols-2">
          <div className="min-w-0">
            <label className={labelClass} htmlFor="role_id">
              Assigned Role <span className="text-red-500">*</span>
            </label>

            <select
              id="role_id"
              className={inputClass}
              value={form.role_id}
              onChange={(e) => setField("role_id", e.target.value)}
              required
              disabled={rolesLoading || Boolean(rolesError)}
            >
              <option value="">
                {rolesLoading ? "Loading roles..." : "Select a role"}
              </option>

              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>

            {!rolesLoading && !rolesError && roles.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">
                Create an active role before creating a user.
              </p>
            )}
          </div>

          <div className="min-w-0">
            <label className={labelClass} htmlFor="password">
              {initialData ? "New Password" : "Password"}
              {!initialData && (
                <span className="text-red-500"> *</span>
              )}
            </label>

            <input
              id="password"
              name="password"
              type="password"
              className={inputClass}
              value={form.password}
              onChange={(e) => setField("password", e.target.value)}
              minLength={8}
              maxLength={128}
              required={!initialData}
              autoComplete="new-password"
              placeholder={
                initialData
                  ? "Leave blank to keep current password"
                  : "Minimum 8 characters"
              }
            />

            {initialData && (
              <p className={helperClass}>
                Leave blank to keep the current password.
              </p>
            )}
          </div>
        </div>

        <label
          className={`mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-lg border px-3.5 py-3 ${
            dark ? "border-slate-700" : "border-slate-200"
          }`}
        >
          <span className="min-w-0">
            <span className="block text-sm font-medium">
              Account Status
            </span>
            <span className={helperClass}>
              {form.is_active
                ? "This account is active and enabled."
                : "This account is inactive."}
            </span>
          </span>

          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setField("is_active", e.target.checked)}
            className="h-4 w-4 shrink-0 accent-[#3E439C]"
          />
        </label>
      </section>

      {errorMessage && (
        <div
          role="alert"
          className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
            dark
              ? "border-red-900 bg-red-950/30 text-red-300"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <span>{errorMessage}</span>

          <button
            type="button"
            onClick={() => {
              setValidationError("");
              setRolesError("");
            }}
            className="shrink-0 font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div
        className={`flex flex-wrap justify-end gap-3 rounded-xl border px-4 py-3 ${
          dark
            ? "border-slate-800 bg-[#171827]"
            : "border-slate-200 bg-white"
        }`}
      >
        <button
          type="button"
          onClick={() => window.history.back()}
          disabled={submitting}
          className={`rounded-lg border px-4 py-2.5 text-sm font-medium ${
            dark
              ? "border-slate-700 text-slate-200 hover:bg-slate-800"
              : "border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={submitting || rolesLoading || roles.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#3E439C] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#32377F] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={16} />
          {submitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

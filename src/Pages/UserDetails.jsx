
import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Pencil,
  ShieldCheck,
  UserRound,
  UserX,
} from "lucide-react";
import AppFooter from "../Components/Layout/AppFooter";
import AppSidebar from "../Components/Layout/AppSidebar";
import TopNavbar from "../Components/Layout/TopNavbar";
import { useTheme } from "../Context/ThemeContext";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8001"
).replace(/\/$/, "");

function getErrorMessage(data, fallback) {
  if (typeof data?.detail === "string") return data.detail;

  if (Array.isArray(data?.detail)) {
    return data.detail.map((item) => item.msg).join("; ");
  }

  return fallback;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function DetailField({ label, value, dark }) {
  return (
    <div className="min-w-0">
      <p
        className={`mb-1.5 text-xs ${
          dark ? "text-slate-400" : "text-slate-500"
        }`}
      >
        {label}
      </p>

      <p className="break-words text-sm font-medium">{value || "—"}</p>
    </div>
  );
}

export default function UserDetails() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const dark = theme === "dark";

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");
  const [deactivating, setDeactivating] = useState(false);

  const loadUser = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/users/${encodeURIComponent(userId)}`
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, `Unable to load user (${response.status}).`)
        );
      }

      setUser(data);
    } catch (err) {
      setError(err.message || "Unable to load user details.");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const deactivateUser = async () => {
    if (!user || deactivating) return;

    const confirmed = window.confirm(
      `Deactivate the account for ${user.full_name}?`
    );

    if (!confirmed) return;

    setDeactivating(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/users/${encodeURIComponent(userId)}`,
        { method: "DELETE" }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, "Unable to deactivate this user.")
        );
      }

      setNotice(data.message || "User deactivated successfully.");
      await loadUser();
    } catch (err) {
      setError(err.message || "Unable to deactivate user.");
    } finally {
      setDeactivating(false);
    }
  };

  const border = dark ? "border-slate-800" : "border-slate-200";
  const panel = dark ? "bg-[#171827]" : "bg-white";
  const muted = dark ? "text-slate-400" : "text-slate-500";

  return (
    <div className="min-h-screen min-w-0 bg-[#F6F6FC] text-slate-800 dark:bg-[#11121F] dark:text-slate-100">
      <AppSidebar />

      <div className="min-h-screen min-w-0 md:ml-[72px] lg:ml-[260px]">
        <TopNavbar
          title="User Details"
          breadcrumb={[
            "Hospital Management",
            "Settings",
            "Users",
            "User Details",
          ]}
        />

        <main className="w-full min-w-0 px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
          <div className="w-full min-w-0">
            <button
              type="button"
              onClick={() => navigate("/settings/users")}
              className={`mb-3 inline-flex items-center gap-2 text-sm font-medium transition ${
                dark
                  ? "text-slate-300 hover:text-white"
                  : "text-slate-600 hover:text-[#3E439C]"
              }`}
            >
              <ArrowLeft size={17} />
              Back to Users
            </button>

            {notice && (
              <div
                role="status"
                className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
              >
                <span>{notice}</span>

                <button
                  type="button"
                  onClick={() => setNotice("")}
                  className="shrink-0 font-medium underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="mb-3 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
              >
                <span>{error}</span>

                <button
                  type="button"
                  onClick={() => setError("")}
                  className="shrink-0 font-medium underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {loading ? (
              <div
                className={`rounded-xl border ${border} ${panel} p-8 text-center text-sm ${muted}`}
              >
                Loading user details...
              </div>
            ) : user ? (
              <>
                {/* User header */}
                <section
                  className={`mb-4 rounded-xl border ${border} ${panel} p-4 sm:p-5`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#F1F0FF] dark:bg-[#292B49]">
                        <UserRound
                          size={26}
                          className="text-[#3E439C] dark:text-[#D6D4FF]"
                        />
                      </div>

                      <div className="min-w-0">
                        <h1 className="break-words text-xl font-semibold">
                          {user.full_name}
                        </h1>

                        <p className={`mt-1 break-words text-sm ${muted}`}>
                          {user.email || "No email address"}
                        </p>

                        <span
                          className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                            user.is_active
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {user.is_active ? (
                            <CheckCircle2 size={13} />
                          ) : (
                            <UserX size={13} />
                          )}

                          {user.is_active
                            ? "Active account"
                            : "Inactive account"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/settings/users/${user.id}/edit`)
                        }
                        className="inline-flex items-center gap-2 rounded-lg bg-[#3E439C] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#32377F]"
                      >
                        <Pencil size={16} />
                        Edit User
                      </button>

                      {user.is_active && (
                        <button
                          type="button"
                          onClick={deactivateUser}
                          disabled={deactivating}
                          className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                        >
                          <UserX size={16} />
                          {deactivating
                            ? "Deactivating..."
                            : "Deactivate"}
                        </button>
                      )}
                    </div>
                  </div>
                </section>

                {/* Personal information */}
                <section
                  className={`mb-4 rounded-xl border ${border} ${panel} p-4 sm:p-5`}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F1F0FF] dark:bg-[#292B49]">
                      <UserRound
                        size={18}
                        className="text-[#3E439C] dark:text-[#D6D4FF]"
                      />
                    </div>

                    <h2 className="text-sm font-semibold">
                      Personal Information
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailField
                      label="Full Name"
                      value={user.full_name}
                      dark={dark}
                    />

                    <DetailField
                      label="Email Address"
                      value={user.email}
                      dark={dark}
                    />

                    <DetailField
                      label="User ID"
                      value={user.login_id}
                      dark={dark}
                    />
                  </div>
                </section>

                {/* Role and access */}
                <section
                  className={`mb-4 rounded-xl border ${border} ${panel} p-4 sm:p-5`}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F1F0FF] dark:bg-[#292B49]">
                      <ShieldCheck
                        size={18}
                        className="text-[#3E439C] dark:text-[#D6D4FF]"
                      />
                    </div>

                    <h2 className="text-sm font-semibold">Role &amp; Access</h2>
                  </div>

                  <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                    <DetailField
                      label="Assigned Role"
                      value={user.role_name}
                      dark={dark}
                    />

                    <DetailField
                      label="Role ID"
                      value={user.role_id}
                      dark={dark}
                    />

                    <div className="sm:col-span-2">
                      <p className={`mb-1.5 text-xs ${muted}`}>
                        Access permissions
                      </p>

                      <p className={`text-sm ${muted}`}>
                        Permissions are managed through the assigned role.
                        Open the Roles section to review its configured
                        permissions.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Account activity */}
                <section
                  className={`rounded-xl border ${border} ${panel} p-4 sm:p-5`}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F1F0FF] dark:bg-[#292B49]">
                      <CalendarDays
                        size={18}
                        className="text-[#3E439C] dark:text-[#D6D4FF]"
                      />
                    </div>

                    <h2 className="text-sm font-semibold">Account Activity</h2>
                  </div>

                  <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                    <div className="flex items-start gap-3">
                      <CalendarDays
                        size={17}
                        className={`mt-0.5 shrink-0 ${muted}`}
                      />

                      <div>
                        <p className={`mb-1.5 text-xs ${muted}`}>
                          Created At
                        </p>

                        <p className="text-sm font-medium">
                          {formatDate(user.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Clock3
                        size={17}
                        className={`mt-0.5 shrink-0 ${muted}`}
                      />

                      <div>
                        <p className={`mb-1.5 text-xs ${muted}`}>
                          Last Updated
                        </p>

                        <p className="text-sm font-medium">
                          {formatDate(user.updated_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              </>
            ) : (
              <div
                className={`rounded-xl border ${border} ${panel} p-8 text-center`}
              >
                <p className="font-medium">User not found</p>

                <button
                  type="button"
                  onClick={() => navigate("/settings/users")}
                  className="mt-3 text-sm font-medium text-[#3E439C] underline dark:text-[#D6D4FF]"
                >
                  Return to Users
                </button>
              </div>
            )}
          </div>
          <AppFooter />
        </main>
      </div>
    </div>
  );
}

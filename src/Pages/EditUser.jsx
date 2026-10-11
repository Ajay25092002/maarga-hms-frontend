
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, ArrowLeft, Pencil } from "lucide-react";

import AppSidebar from "../Components/Layout/AppSidebar";
import TopNavbar from "../Components/Layout/TopNavbar";
import UserForm from "../Components/Users/UserForm";
import { useTheme } from "../Context/ThemeContext";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "");

function getErrorMessage(data, fallback) {
  if (typeof data?.detail === "string") return data.detail;

  if (Array.isArray(data?.detail)) {
    return data.detail.map((item) => item.msg).join("; ");
  }

  return fallback;
}

export default function EditUser() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const dark = theme === "dark";

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
      setError(err.message || "Unable to load user.");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/users/${encodeURIComponent(userId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          getErrorMessage(data, `Unable to update user (${response.status}).`)
        );
      }

      navigate(`/settings/users/${userId}`, {
        replace: true,
        state: { notice: "User updated successfully." },
      });
    } catch (err) {
      setError(err.message || "Unable to update user.");
    } finally {
      setSubmitting(false);
    }
  };

  const muted = dark ? "text-slate-400" : "text-slate-500";

  return (
    <div className="min-h-screen min-w-0 bg-[#F6F6FC] text-slate-800 dark:bg-[#11121F] dark:text-slate-100">
      <AppSidebar />

      <div className="min-h-screen min-w-0 md:ml-[72px] lg:ml-[260px]">
        <TopNavbar
          title="Edit User"
          breadcrumb={[
            "Hospital Management",
            "Settings",
            "Users",
            "Edit User",
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

            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F1F0FF] dark:bg-[#292B49]">
                <Pencil
                  size={19}
                  className="text-[#3E439C] dark:text-[#D6D4FF]"
                />
              </div>

              <div className="min-w-0">
                <h1 className="text-lg font-semibold">Edit User</h1>
                <p className={`mt-0.5 text-[13px] ${muted}`}>
                  Update user information and assigned access.
                </p>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
              >
                <AlertCircle size={17} className="mt-0.5 shrink-0" />
                <span className="min-w-0 flex-1">{error}</span>

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
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-[#171827] dark:text-slate-400">
                Loading user details...
              </div>
            ) : user ? (
              <UserForm
                initialData={user}
                onSubmit={handleSubmit}
                submitting={submitting}
                submitLabel="Save Changes"
              />
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-[#171827]">
                <p className="font-medium">User could not be loaded.</p>

                <button
                  type="button"
                  onClick={loadUser}
                  className="mt-3 text-sm font-medium text-[#3E439C] underline dark:text-[#D6D4FF]"
                >
                  Try again
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/settings/users")}
                  className="ml-4 mt-3 text-sm font-medium text-slate-600 underline dark:text-slate-300"
                >
                  Back to Users
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

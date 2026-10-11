
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus } from "lucide-react";

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

export default function CreateUser() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const dark = theme === "dark";

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            `Unable to create user (${response.status}).`,
          ),
        );
      }

      navigate(`/settings/users/${data.id}`, {
        replace: true,
        state: { notice: "User created successfully." },
      });
    } catch (err) {
      setError(err.message || "Unable to create user.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen min-w-0 bg-[#F6F6FC] text-slate-800 dark:bg-[#11121F] dark:text-slate-100">
      <AppSidebar />

      <div className="min-h-screen min-w-0 md:ml-[72px] lg:ml-[260px]">
        <TopNavbar
          title="Create User"
          breadcrumb={[
            "Hospital Management",
            "Settings",
            "Users",
            "Create User",
          ]}
        />

        {/* Use nearly the entire available content width */}
        <main className="w-full min-w-0 px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
          <div className="w-full min-w-0">
            {/* Back navigation */}
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

            {/* Compact page heading */}
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F1F0FF] dark:bg-[#292B49]">
                <UserPlus
                  size={20}
                  className="text-[#3E439C] dark:text-[#D6D4FF]"
                />
              </div>

              <div className="min-w-0">
                <h1 className="text-lg font-semibold">Create User</h1>
                <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">
                  Create an account and assign the appropriate role.
                </p>
              </div>
            </div>

            {/* API error */}
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

            {/* Full-width form */}
            <UserForm
              onSubmit={handleSubmit}
              submitting={submitting}
              submitLabel="Create User"
            />
          </div>
        </main>
      </div>
    </div>
  );
}

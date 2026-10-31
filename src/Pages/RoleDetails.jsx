import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ShieldCheck,
  Pencil,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import AppFooter from "../Components/Layout/AppFooter";
import AppSidebar from "../Components/Layout/AppSidebar";
import TopNavbar from "../Components/Layout/TopNavbar";

const API_URL =
  (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001").replace(
    /\/+$/,
    "",
  ) + "/api/roles";

const GROUPS = [
  {
    title: "Dashboard",
    keys: ["dashboard.view"],
  },
  {
    title: "Patients",
    keys: ["patients.view", "patients.create", "patients.edit"],
  },
  {
    title: "OP Bills",
    keys: ["bills.op.view", "bills.op.create", "bills.op.edit"],
  },
  {
    title: "IP Bills",
    keys: ["bills.ip.view", "bills.ip.create", "bills.ip.edit"],
  },
  {
    title: "Bill History",
    keys: ["bills.history.view"],
  },
  {
    title: "Nurse",
    keys: ["nurse.view", "nurse.add_services", "nurse.all_service_groups"],
  },
  {
    title: "Payments & Receipts",
    keys: ["payments.view", "payments.create"],
  },
  {
    title: "Payment Refunds",
    keys: ["refunds.view", "refunds.create"],
  },
  {
    title: "Reports",
    keys: ["reports.view", "reports.download"],
  },
  {
    title: "Users",
    keys: ["users.view", "users.create", "users.edit", "users.delete"],
  },
  {
    title: "Roles & Permissions",
    keys: ["roles.view", "roles.create", "roles.edit", "roles.delete"],
  },
  {
    title: "Pricing",
    keys: ["pricing.view", "pricing.create", "pricing.edit", "pricing.import"],
  },
];

async function readResponse(response, fallback) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || fallback);
  }

  return data;
}

export default function RoleDetails() {
  const { roleId } = useParams();

  const [role, setRole] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRole = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [roleResponse, catalogResponse] = await Promise.all([
        fetch(`${API_URL}/${roleId}`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        }),
        fetch(`${API_URL}/permissions`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        }),
      ]);

      const roleData = await readResponse(roleResponse, "Unable to load role.");

      const catalogData = await readResponse(
        catalogResponse,
        "Unable to load permissions.",
      );

      setRole(roleData);
      setCatalog(Array.isArray(catalogData) ? catalogData : []);
    } catch (err) {
      setError(err.message || "Unable to load role details.");
    } finally {
      setLoading(false);
    }
  }, [roleId]);

  useEffect(() => {
    loadRole();
  }, [loadRole]);

  const enabledCount = Object.values(role?.permissions ?? {}).filter(
    Boolean,
  ).length;

  return (
    <div className="min-h-screen bg-[#F6F6FC] dark:bg-slate-950">
      <AppSidebar />

      <div className="min-h-screen lg:ml-[260px]">
        <TopNavbar
          title="Role Details"
          breadcrumb={[
            "Hospital Management",
            "Settings",
            "Roles",
            "Role Details",
          ]}
        />

        <main className="p-4 sm:p-6">
          {/* Page Header */}
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <Link
                to="/settings/roles"
                aria-label="Back to roles"
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <ArrowLeft size={19} />
              </Link>

              <div className="rounded-lg bg-[#F1F0FF] p-2.5 text-[#3E439C]">
                <ShieldCheck size={22} />
              </div>

              <div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Role Details
                </h1>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Review role information and assigned permissions.
                </p>
              </div>
            </div>

            {role && (
              <Link
                to={`/settings/roles/${roleId}/edit`}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#3E439C] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#32377F]"
              >
                <Pencil size={17} />
                Edit Role
              </Link>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              <AlertCircle size={18} className="shrink-0" />

              <div className="flex-1">
                <p>{error}</p>

                <button
                  type="button"
                  onClick={loadRole}
                  className="mt-1 inline-flex items-center gap-1 underline"
                >
                  <RefreshCw size={13} />
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              Loading role details...
            </div>
          ) : role ? (
            <div className="space-y-5">
              {/* Role Information */}
              <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {role.name}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {role.description || "No description provided."}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                      role.is_active
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {role.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 dark:border-slate-800 sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Role ID
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                      {role.id}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Status
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                      {role.is_active ? "Active" : "Inactive"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Enabled Permissions
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                      {enabledCount}
                    </p>
                  </div>

                  {role.created_at && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Created At
                      </p>

                      <p className="mt-1 text-sm text-slate-900 dark:text-white">
                        {new Date(role.created_at).toLocaleString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </p>
                    </div>
                  )}

                  {role.updated_at && (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Last Updated
                      </p>

                      <p className="mt-1 text-sm text-slate-900 dark:text-white">
                        {new Date(role.updated_at).toLocaleString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* Permissions */}
              <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <h2 className="font-semibold text-slate-900 dark:text-white">
                  Permissions
                </h2>

                <p className="mb-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Enabled and disabled permissions for this role.
                </p>

                {catalog.length === 0 ? (
                  <p className="py-4 text-sm text-slate-500">
                    No permissions were returned by the backend.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {GROUPS.map((group) => {
                      const items = group.keys
                        .map((key) => catalog.find((item) => item.key === key))
                        .filter(Boolean);

                      if (!items.length) return null;

                      return (
                        <div
                          key={group.title}
                          className="rounded-lg border border-slate-200 dark:border-slate-700"
                        >
                          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
                            <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                              {group.title}
                            </h3>
                          </div>

                          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                            {items.map((item) => {
                              const enabled = Boolean(
                                role.permissions?.[item.key],
                              );

                              return (
                                <div
                                  key={item.key}
                                  className="flex items-start gap-2"
                                >
                                  {enabled ? (
                                    <CheckCircle2
                                      size={18}
                                      className="mt-0.5 shrink-0 text-emerald-600"
                                    />
                                  ) : (
                                    <XCircle
                                      size={18}
                                      className="mt-0.5 shrink-0 text-slate-400"
                                    />
                                  )}

                                  <span
                                    className={`text-sm ${
                                      enabled
                                        ? "text-slate-800 dark:text-slate-200"
                                        : "text-slate-500 dark:text-slate-400"
                                    }`}
                                  >
                                    {item.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <Link
                to="/settings/roles"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#3E439C] hover:underline dark:text-indigo-300"
              >
                <ArrowLeft size={16} />
                Back to Roles
              </Link>
            </div>
          ) : null}

          <AppFooter />
        </main>
      </div>
    </div>
  );
}

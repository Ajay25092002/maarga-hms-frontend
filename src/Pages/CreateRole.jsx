import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Save, AlertCircle } from "lucide-react";

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
    title: "OP Patients",
    keys: ["patients.op.view", "patients.op.create", "patients.op.edit"],
  },
  {
    title: "IP Patients",
    keys: ["patients.ip.view", "patients.ip.create", "patients.ip.edit"],
  },
  {
    title: "OP Bills",
    keys: ["bills.op.view", "bills.op.create","bills.op.edit"],
  },
  {
    title: "IP Bills",
    keys: ["bills.ip.view", "bills.ip.create","bills.ip.edit"],
  },
  {
    title: "Nurse",
    keys: ["nurse.view", "nurse.add_services"],
  },
  {
    title: "Nurse Service Group Access",
    keys: ["nurse.all_service_groups"],
  },
  {
    title: "Payments & Receipts",
    keys: ["payments.view", "payments.create"],
  },
  {
    title: "Payment Refunds",
    keys: ["refunds.view", "refunds.create"],
  },

  // New: Service group management
  {
    title: "Service Groups",
    keys: [
      "service_groups.view",
      "service_groups.create",
      "service_groups.edit",
      "service_groups.delete",
    ],
  },

  // New: Individual services
  {
    title: "Services",
    keys: [
      "services.view",
      "services.create",
      "services.edit",
      "services.delete",
    ],
  },

  // New: OP/IP pricing management
  {
    title: "Pricing",
    keys: ["pricing.view", "pricing.create", "pricing.edit", "pricing.delete"],
  },

  // New: Room types used for IP pricing
  {
    title: "Room Types",
    keys: [
      "room_types.view",
      "room_types.create",
      "room_types.edit",
      "room_types.delete",
    ],
  },

  // New: Doctor and psychologist master records
  {
    title: "Doctors",
    keys: ["doctors.view", "doctors.create", "doctors.edit", "doctors.delete"],
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
];

async function readResponse(response, fallback) {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || fallback);
  }

  return data;
}

export default function CreateRole() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [catalog, setCatalog] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPermissions() {
      try {
        const response = await fetch(`${API_URL}/permissions`, {
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });

        const data = await readResponse(
          response,
          "Unable to load permissions.",
        );

        const items = Array.isArray(data) ? data : [];

        if (cancelled) return;

        setCatalog(items);

        setPermissions(
          Object.fromEntries(items.map((item) => [item.key, false])),
        );
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load permissions.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPermissions();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (name.trim().length < 2) {
      setError("Role name must contain at least 2 characters.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_URL}/`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          permissions,
          is_active: isActive,
        }),
      });

      await readResponse(response, "Unable to create role.");

      navigate("/settings/roles");
    } catch (err) {
      setError(err.message || "Unable to create role.");
    } finally {
      setSaving(false);
    }
  }

  function togglePermission(key, checked) {
    setPermissions((current) => ({
      ...current,
      [key]: checked,
    }));
  }

  function toggleGroup(group, checked) {
    const availableKeys = group.keys.filter((key) =>
      catalog.some((item) => item.key === key),
    );

    setPermissions((current) => {
      const updated = { ...current };

      availableKeys.forEach((key) => {
        updated[key] = checked;
      });

      return updated;
    });
  }

  return (
    <div className="min-h-screen bg-[#F6F6FC] dark:bg-slate-950">
      <AppSidebar />

      <div className="min-h-screen lg:ml-[260px]">
        <TopNavbar
          title="Create Role"
          breadcrumb={[
            "Hospital Management",
            "Settings",
            "Roles",
            "Create Role",
          ]}
        />

        <main className="p-4 sm:p-6">
          {/* Page heading */}
          <div className="mb-6 flex items-center gap-3">
            <Link
              to="/settings/roles"
              aria-label="Back to roles"
              className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <ArrowLeft size={19} />
            </Link>

            <div className="rounded-lg bg-[#F1F0FF] p-2.5 text-[#3E439C]">
              <ShieldCheck size={22} />
            </div>

            <div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                Create Role
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Define role details and access permissions.
              </p>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role information */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">
                Role Information
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="role-name"
                    className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Role Name *
                  </label>

                  <input
                    id="role-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    maxLength={100}
                    placeholder="e.g. Receptionist"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#3E439C] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="role-status"
                    className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Status
                  </label>

                  <select
                    id="role-status"
                    value={isActive ? "active" : "inactive"}
                    onChange={(e) => setIsActive(e.target.value === "active")}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="role-description"
                    className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Description
                  </label>

                  <textarea
                    id="role-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Describe the responsibilities of this role"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>
            </section>

            {/* Permissions */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-semibold text-slate-900 dark:text-white">
                Permissions
              </h2>

              <p className="mb-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                Select the modules and actions this role can access.
              </p>

              {loading ? (
                <p className="py-4 text-sm text-slate-500">
                  Loading permissions...
                </p>
              ) : catalog.length === 0 ? (
                <p className="py-4 text-sm text-slate-500">
                  No permissions were returned by the backend.
                </p>
              ) : (
                <div className="space-y-4">
                  {GROUPS.map((group) => {
                    const items = group.keys
                      .map((key) => catalog.find((item) => item.key === key))
                      .filter(Boolean);

                    // Only show permissions provided by the backend.
                    if (!items.length) return null;

                    const allSelected = items.every((item) =>
                      Boolean(permissions[item.key]),
                    );

                    return (
                      <div
                        key={group.title}
                        className="rounded-lg border border-slate-200 p-4 dark:border-slate-700"
                      >
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                            {group.title}
                          </h3>

                          <button
                            type="button"
                            onClick={() => toggleGroup(group, !allSelected)}
                            className="text-xs font-medium text-[#3E439C] hover:underline dark:text-indigo-300"
                          >
                            {allSelected ? "Deselect all" : "Select all"}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {items.map((item) => (
                            <label
                              key={item.key}
                              className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                              <input
                                type="checkbox"
                                checked={Boolean(permissions[item.key])}
                                onChange={(e) =>
                                  togglePermission(item.key, e.target.checked)
                                }
                                className="mt-1 h-4 w-4 accent-[#3E439C]"
                              />

                              <span className="text-sm text-slate-700 dark:text-slate-200">
                                {item.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Actions */}
            <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
              <Link
                to="/settings/roles"
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={saving || loading || catalog.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#3E439C] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#32377F] disabled:opacity-60"
              >
                <Save size={17} />
                {saving ? "Creating..." : "Create Role"}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}

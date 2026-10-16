import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Plus,
  Search,
  Eye,
  Pencil,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

import AppSidebar from "../Components/Layout/AppSidebar";
import TopNavbar from "../Components/Layout/TopNavbar";

const API_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "") + "/api/roles";

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRoles = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/`, {
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail || `Unable to load roles (${response.status}).`,
        );
      }

      if (!Array.isArray(data)) {
        throw new Error("Unexpected response from the roles API.");
      }

      setRoles(data);
    } catch (err) {
      setError(err.message || "Unable to load roles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const filteredRoles = roles.filter((role) =>
    `${role.name || ""} ${role.description || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const activeCount = roles.filter((role) => role.is_active).length;

  return (
    <div className="min-h-screen bg-[#F6F6FC] dark:bg-slate-950">
      <AppSidebar />
      <div className="min-h-screen md:ml-[248px]">
        <TopNavbar
          title="Roles & Permissions"
          breadcrumb={["Hospital Management", "Settings", "Roles"]}
        />

        <main className="p-4 sm:p-6">
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#F1F0FF] p-2.5 text-[#3E439C]">
                <ShieldCheck size={23} />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Roles & Permissions
                </h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Manage access to hospital modules.
                </p>
              </div>
            </div>

            <Link
              to="/settings/roles/create"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#3E439C] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#32377F]"
            >
              <Plus size={17} />
              Create Role
            </Link>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Total Roles
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                {roles.length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Active Roles
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-600">
                {activeCount}
              </p>
            </div>
          </div>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">
                  All Roles
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  View and maintain role configurations.
                </p>
              </div>

              <div className="flex gap-2">
                <div className="relative sm:w-64">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search roles..."
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-[#3E439C] dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={loadRoles}
                  title="Refresh roles"
                  className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <RefreshCw size={17} />
                </button>
              </div>
            </div>

            {error && (
              <div className="m-4 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                <AlertCircle size={18} className="shrink-0" />
                <div>
                  <p>{error}</p>
                  <button onClick={loadRoles} className="mt-1 underline">
                    Try again
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/70 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5 font-medium">Role Name</th>
                    <th className="px-5 py-3.5 font-medium">Description</th>
                    <th className="px-5 py-3.5 font-medium">Status</th>
                    <th className="px-5 py-3.5 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-12 text-center text-slate-500"
                      >
                        Loading roles...
                      </td>
                    </tr>
                  ) : filteredRoles.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-12 text-center text-slate-500 dark:text-slate-400"
                      >
                        {error
                          ? "Unable to display roles."
                          : search
                            ? "No matching roles found."
                            : "No roles found. Create your first role."}
                      </td>
                    </tr>
                  ) : (
                    filteredRoles.map((role) => (
                      <tr
                        key={role.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">
                          {role.name}
                        </td>
                        <td className="max-w-sm px-5 py-4 text-slate-600 dark:text-slate-300">
                          {role.description || "—"}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${role.is_active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
                          >
                            {role.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <Link
                              to={`/settings/roles/${role.id}`}
                              title="View role"
                              className="inline-flex items-center justify-center rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-[#F1F0FF] hover:text-[#3E439C] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              View
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {!loading && !error && (
              <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                Showing {filteredRoles.length} of {roles.length} roles
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

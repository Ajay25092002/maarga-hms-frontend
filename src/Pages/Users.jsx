import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Users as UsersIcon,
  UserX,
} from "lucide-react";

import AppSidebar from "../Components/Layout/AppSidebar";
import TopNavbar from "../Components/Layout/TopNavbar";
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

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      getErrorMessage(data, `Request failed (${response.status}).`),
    );
  }

  return data;
}

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-emerald-500" : "bg-slate-400"
        }`}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function SummaryCard({ icon: Icon, label, value, dark }) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        dark ? "border-slate-800 bg-[#171827]" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F1F0FF] dark:bg-[#292B49]">
          <Icon size={19} className="text-[#3E439C] dark:text-[#D6D4FF]" />
        </div>

        <div className="min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-xl font-semibold">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function Users() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const dark = theme === "dark";

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 10,
    total: 0,
    total_pages: 0,
  });

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleId, setRoleId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const loadRoles = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/roles`);
      const data = await readResponse(response);

      setRoles(Array.isArray(data) ? data : []);
    } catch (err) {
      setActionError(err.message || "Unable to load roles.");
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        page_size: String(pagination.page_size),
      });

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (roleId) {
        params.set("role_id", roleId);
      }

      if (statusFilter) {
        params.set("is_active", statusFilter === "active" ? "true" : "false");
      }

      const response = await fetch(
        `${API_BASE_URL}/api/users?${params.toString()}`,
      );

      const data = await readResponse(response);

      setUsers(Array.isArray(data.items) ? data.items : []);

      setPagination((current) => ({
        ...current,
        ...(data.pagination || {}),
      }));
    } catch (err) {
      setUsers([]);
      setError(err.message || "Unable to retrieve users.");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.page_size, search, roleId, statusFilter]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = (event) => {
    event.preventDefault();

    setPagination((current) => ({ ...current, page: 1 }));
    setSearch(searchInput.trim());
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setRoleId("");
    setStatusFilter("");
    setPagination((current) => ({ ...current, page: 1 }));
    setActionError("");
  };

  const changePage = (page) => {
    setPagination((current) => ({ ...current, page }));
  };

  const totalUsers = pagination.total || 0;
  const activeOnPage = users.filter((user) => user.is_active).length;
  const inactiveOnPage = users.length - activeOnPage;

  const border = dark ? "border-slate-800" : "border-slate-200";
  const panel = dark ? "bg-[#171827]" : "bg-white";
  const muted = dark ? "text-slate-400" : "text-slate-500";

  const input = `rounded-lg border ${border} ${
    dark
      ? "bg-[#191A2A] text-slate-100 placeholder:text-slate-500"
      : "bg-white text-slate-800 placeholder:text-slate-400"
  } px-3 py-2.5 text-sm outline-none focus:border-[#3E439C]`;

  return (
    <div className="min-h-screen min-w-0 bg-[#F6F6FC] text-slate-800 dark:bg-[#11121F] dark:text-slate-100">
      <AppSidebar />

      <div className="min-h-screen min-w-0 md:ml-[72px] lg:ml-[260px]">
        <TopNavbar
          title="Users"
          breadcrumb={["Hospital Management", "Settings", "Users"]}
        />

        <main className="min-w-0 px-4 py-5 sm:px-5 lg:px-6">
          <div className="mx-auto w-full max-w-[1440px]">
            {/* Page heading */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F1F0FF] dark:bg-[#292B49]">
                  <UsersIcon
                    size={20}
                    className="text-[#3E439C] dark:text-[#D6D4FF]"
                  />
                </div>

                <div>
                  <h1 className="text-lg font-semibold">User Management</h1>
                  <p className={`mt-1 text-[13px] ${muted}`}>
                    Manage user accounts, roles, and account status.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate("/settings/users/create")}
                className="inline-flex items-center gap-2 rounded-lg bg-[#3E439C] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#32377F]"
              >
                <Plus size={17} />
                Create User
              </button>
            </div>

            {/* Summary cards */}
            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <SummaryCard
                icon={UsersIcon}
                label="Total users matching filters"
                value={totalUsers}
                dark={dark}
              />

              <SummaryCard
                icon={CheckCircle2}
                label="Active on this page"
                value={activeOnPage}
                dark={dark}
              />

              <SummaryCard
                icon={UserX}
                label="Inactive on this page"
                value={inactiveOnPage}
                dark={dark}
              />
            </div>

            {/* Role-loading errors and other action messages */}
            {actionError && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
              >
                <AlertCircle size={17} className="mt-0.5 shrink-0" />

                <span className="min-w-0 flex-1">{actionError}</span>

                <button
                  type="button"
                  onClick={() => setActionError("")}
                  className="shrink-0 font-medium underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Users table */}
            <section
              className={`overflow-hidden rounded-xl border ${border} ${panel}`}
            >
              {/* Filters */}
              <div className={`border-b ${border} p-4`}>
                <form
                  onSubmit={handleSearch}
                  className="flex flex-col gap-3 lg:flex-row"
                >
                  <div className="relative min-w-0 flex-1">
                    <Search
                      size={17}
                      className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`}
                    />

                    <input
                      type="text"
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                      placeholder="Search name, email, or role..."
                      className={`${input} w-full pl-9`}
                      aria-label="Search users"
                    />
                  </div>

                  <select
                    value={roleId}
                    onChange={(event) => {
                      setRoleId(event.target.value);
                      setPagination((current) => ({
                        ...current,
                        page: 1,
                      }));
                    }}
                    className={input}
                    aria-label="Filter by role"
                  >
                    <option value="">All roles</option>

                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value);
                      setPagination((current) => ({
                        ...current,
                        page: 1,
                      }));
                    }}
                    className={input}
                    aria-label="Filter by account status"
                  >
                    <option value="">All statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#3E439C] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#32377F]"
                  >
                    <Search size={16} />
                    Search
                  </button>

                  <button
                    type="button"
                    onClick={clearFilters}
                    className={`rounded-lg border ${border} px-3 py-2.5 text-sm font-medium transition hover:bg-slate-50 dark:hover:bg-slate-800`}
                  >
                    Clear
                  </button>
                </form>
              </div>

              {/* List error */}
              {error && (
                <div className="m-4 flex flex-col items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                  </div>

                  <button
                    type="button"
                    onClick={loadUsers}
                    className="inline-flex items-center gap-2 rounded-lg border border-current px-3 py-2 font-medium"
                  >
                    <RefreshCw size={15} />
                    Try again
                  </button>
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead
                    className={
                      dark
                        ? "bg-[#1D1E30] text-slate-400"
                        : "bg-[#FAFAFE] text-slate-500"
                    }
                  >
                    <tr>
                      <th className="px-4 py-3 font-medium">User</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Created</th>
                      <th className="px-4 py-3 text-right font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className={`divide-y ${border}`}>
                    {loading ? (
                      <tr>
                        <td
                          colSpan={5}
                          className={`px-4 py-12 text-center ${muted}`}
                        >
                          Loading users...
                        </td>
                      </tr>
                    ) : !error && users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center">
                          <UsersIcon
                            size={28}
                            className={`mx-auto mb-3 ${muted}`}
                          />

                          <p className="font-medium">No users found</p>

                          <p className={`mt-1 text-xs ${muted}`}>
                            Try changing your filters or create a user.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr
                          key={user.id}
                          className={
                            dark ? "hover:bg-[#1D1E30]" : "hover:bg-[#FAFAFE]"
                          }
                        >
                          {/* Name and email */}
                          <td className="px-4 py-3.5">
                            <div className="font-medium">{user.full_name}</div>

                            <div
                              className={`mt-1 break-words text-xs ${muted}`}
                            >
                              {user.email || "No email provided"}
                            </div>
                          </td>

                          {/* Role */}
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1.5">
                              <ShieldCheck
                                size={15}
                                className="text-[#3E439C] dark:text-[#A5A7FF]"
                              />
                              {user.role_name || "—"}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5">
                            <StatusBadge active={user.is_active} />
                          </td>

                          {/* Created date */}
                          <td className={`px-4 py-3.5 text-xs ${muted}`}>
                            {user.created_at
                              ? new Date(user.created_at).toLocaleDateString(
                                  "en-IN",
                                  {
      timeZone: "Asia/Kolkata",
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )
                              : "—"}
                          </td>

                          {/* Only one action: View */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center justify-end">
                              <button
                                type="button"
                                onClick={() =>
                                  navigate(`/settings/users/${user.id}`)
                                }
                                aria-label={`View ${user.full_name}`}
                                className="inline-flex items-center gap-2 rounded-lg border border-[#3E439C] px-3 py-2 text-sm font-medium text-[#3E439C] transition hover:bg-[#F1F0FF] dark:border-[#7779D6] dark:text-[#D6D4FF] dark:hover:bg-[#292B49]"
                              >
                                <Eye size={16} />
                                View
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div
                className={`flex flex-col gap-3 border-t ${border} px-4 py-3 sm:flex-row sm:items-center sm:justify-between`}
              >
                <p className={`text-xs ${muted}`}>
                  {pagination.total > 0
                    ? `Showing ${
                        (pagination.page - 1) * pagination.page_size + 1
                      }–${Math.min(
                        pagination.page * pagination.page_size,
                        pagination.total,
                      )} of ${pagination.total} users`
                    : "No users to display"}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pagination.page <= 1 || loading}
                    onClick={() => changePage(pagination.page - 1)}
                    className={`inline-flex items-center gap-1 rounded-lg border ${border} px-3 py-2 text-xs font-medium transition disabled:opacity-40`}
                  >
                    <ChevronLeft size={15} />
                    Previous
                  </button>

                  <span className={`px-2 text-xs ${muted}`}>
                    Page {pagination.page} of{" "}
                    {Math.max(1, pagination.total_pages)}
                  </span>

                  <button
                    type="button"
                    disabled={
                      loading || pagination.page >= pagination.total_pages
                    }
                    onClick={() => changePage(pagination.page + 1)}
                    className={`inline-flex items-center gap-1 rounded-lg border ${border} px-3 py-2 text-xs font-medium transition disabled:opacity-40`}
                  >
                    Next
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

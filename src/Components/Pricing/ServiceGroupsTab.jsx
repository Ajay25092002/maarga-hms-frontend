
import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Layers3,
  RefreshCw,
  X,
  Check,
  Power,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { useTheme } from "../../Context/ThemeContext";
import { serviceGroupsApi } from "../../Services/pricingServices";
import ConfirmDialog from "../Common/ConfirmDialog";

const initialForm = { name: "" };
const DEFAULT_PAGE_SIZE = 10;

function getRows(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

function getPagination(response, rowCount, page, pageSize) {
  const metadata = response?.pagination || response?.data?.pagination;

  if (metadata) {
    return {
      page: Number(metadata.page ?? page),
      pageSize: Number(metadata.page_size ?? pageSize),
      total: Number(metadata.total ?? rowCount),
      totalPages: Number(metadata.total_pages ?? 0),
      hasPrevious: Boolean(metadata.has_previous),
      hasNext: Boolean(metadata.has_next),
    };
  }

  return {
    page,
    pageSize,
    total: rowCount,
    totalPages: rowCount ? 1 : 0,
    hasPrevious: false,
    hasNext: false,
  };
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

function isGroupActive(group) {
  if (typeof group?.is_active === "boolean") return group.is_active;
  if (typeof group?.is_active === "number") return group.is_active === 1;

  if (typeof group?.is_active === "string") {
    return !["false", "0", "inactive", "disabled"].includes(
      group.is_active.toLowerCase()
    );
  }

  if (typeof group?.isActive === "boolean") return group.isActive;
  if (typeof group?.active === "boolean") return group.active;

  if (typeof group?.status === "string") {
    return !["inactive", "disabled", "deactivated"].includes(
      group.status.toLowerCase()
    );
  }

  return true;
}

export default function ServiceGroupsTab({
  canCreate = true,
  canEdit = true,
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 0,
    hasPrevious: false,
    hasNext: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [form, setForm] = useState(initialForm);

  const [pendingGroup, setPendingGroup] = useState(null);
  const [confirmError, setConfirmError] = useState("");

  // Debounce search and reset to the first page.
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  const loadGroups = useCallback(
    async ({ showLoader = true } = {}) => {
      if (showLoader) setLoading(true);
      setError("");

      try {
        const response = await serviceGroupsApi.list({
          page,
          page_size: pageSize,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        });

        const rows = getRows(response);
        const metadata = getPagination(
          response,
          rows.length,
          page,
          pageSize
        );

        // Handle a page that no longer exists after a deletion.
        if (metadata.totalPages > 0 && page > metadata.totalPages) {
          setPage(metadata.totalPages);
          return rows;
        }

        setGroups(rows);
        setPagination(metadata);

        return rows;
      } catch (err) {
        setError(getErrorMessage(err));
        throw err;
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [page, pageSize, debouncedSearch]
  );

  useEffect(() => {
    loadGroups().catch(() => {});
  }, [loadGroups]);

  function openCreateModal() {
    setEditingGroup(null);
    setForm(initialForm);
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function openEditModal(group) {
    setEditingGroup(group);
    setForm({ name: group.name || "" });
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingGroup(null);
    setForm(initialForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const name = form.name.trim();

    if (!name) {
      setError("Please enter a service group name.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editingGroup) {
        await serviceGroupsApi.update(editingGroup.id, { name });
        setSuccess("Service group updated successfully.");
      } else {
        await serviceGroupsApi.create({ name });
        setSuccess("Service group created successfully.");
      }

      setModalOpen(false);
      setEditingGroup(null);
      setForm(initialForm);

      await loadGroups({ showLoader: false });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function openStatusConfirmation(group) {
    if (!canEdit || toggling) return;

    setError("");
    setSuccess("");
    setConfirmError("");
    setPendingGroup(group);
  }

  function closeStatusConfirmation() {
    if (toggling) return;
    setPendingGroup(null);
    setConfirmError("");
  }

  async function handleToggleStatus() {
    if (!pendingGroup || toggling || !canEdit) return;

    const group = pendingGroup;
    const nextActive = !isGroupActive(group);

    setToggling(true);
    setError("");
    setSuccess("");
    setConfirmError("");

    try {
      const savedGroup = await serviceGroupsApi.update(group.id, {
        name: group.name,
        is_active: nextActive,
      });

      if (
        savedGroup &&
        savedGroup.id != null &&
        typeof savedGroup.is_active === "boolean" &&
        savedGroup.is_active !== nextActive
      ) {
        throw new Error(
          "The server did not save the requested status. Please check the service group API."
        );
      }

      const refreshedGroups = await loadGroups({ showLoader: false });
      const refreshedGroup = refreshedGroups.find(
        (item) => String(item.id) === String(group.id)
      );

      if (
        refreshedGroup &&
        isGroupActive(refreshedGroup) !== nextActive
      ) {
        throw new Error(
          "The service group status was not updated on the server."
        );
      }

      setPendingGroup(null);
      setConfirmError("");
      setSuccess(
        `"${group.name}" was ${
          nextActive ? "activated" : "deactivated"
        } successfully.`
      );
    } catch (err) {
      const message = getErrorMessage(err);
      setConfirmError(message);
      setError(message);
    } finally {
      setToggling(false);
    }
  }

  function changePageSize(event) {
    setPageSize(Number(event.target.value));
    setPage(1);
  }

  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#3E439C] focus:ring-2 focus:ring-[#3E439C]/10 dark:border-slate-700 dark:bg-[#1D1E30] dark:text-slate-100 dark:placeholder:text-slate-500";

  const secondaryButton =
    "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800";

  const pendingActive = pendingGroup
    ? isGroupActive(pendingGroup)
    : false;

  const firstRecord =
    pagination.total === 0 ? 0 : (page - 1) * pageSize + 1;

  const lastRecord = Math.min(page * pageSize, pagination.total);

  return (
    <div data-theme={theme} className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            Service Groups
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Organize billable services into groups.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadGroups().catch(() => {})}
            disabled={loading || toggling}
            className={secondaryButton}
          >
            <RefreshCw
              size={14}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          {canCreate && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-[#3E439C] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#323780] focus:outline-none focus:ring-2 focus:ring-[#3E439C]/30"
            >
              <Plus size={15} />
              Add Group
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {(error || success) && !modalOpen && !pendingGroup && (
        <div
          role={error ? "alert" : "status"}
          className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
          }`}
        >
          {error && (
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
          )}
          <span>{error || success}</span>
          <button
            type="button"
            onClick={() => {
              setError("");
              setSuccess("");
            }}
            className="ml-auto shrink-0 opacity-70 hover:opacity-100"
            aria-label="Dismiss message"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Search and page size */}
      <div className="rounded-xl   p-0 ">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search service groups..."
              aria-label="Search service groups"
              className={`${inputClass} pl-9`}
            />
          </div>


            {/* this is not need just for now so keep it commented out */}
          {/* <label className="flex shrink-0 items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            Rows per page
            <select
              value={pageSize}
              onChange={changePageSize}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-[#3E439C] dark:border-slate-700 dark:bg-[#1D1E30] dark:text-slate-200"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label> */}
        </div>
      </div>

      {/* Service groups table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#171827]">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Layers3
              size={16}
              className="text-[#3E439C] dark:text-[#B9BCFF]"
            />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              All Service Groups
            </h3>
          </div>

          <span className="rounded-full bg-[#F1F0FF] px-2.5 py-1 text-xs font-medium text-[#3E439C] dark:bg-[#303253] dark:text-[#DCDFFF]">
            {pagination.total}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] text-left text-sm">
            <thead className="bg-[#F6F6FC] text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-[#1D1E30] dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Group name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    Loading service groups...
                  </td>
                </tr>
              ) : groups.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center">
                    <Layers3
                      size={25}
                      className="mx-auto mb-2 text-slate-300 dark:text-slate-600"
                    />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      No service groups found
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {debouncedSearch
                        ? "Try another search term."
                        : "Add a group to organize your services."}
                    </p>
                  </td>
                </tr>
              ) : (
                groups.map((group) => {
                  const active = isGroupActive(group);

                  return (
                    <tr
                      key={group.id}
                      className="transition hover:bg-slate-50/70 dark:hover:bg-[#202134]"
                    >
                      <td className="px-4 py-3.5">
                        <span className="font-medium text-slate-800 dark:text-slate-100">
                          {group.name}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                            active
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              active ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          {active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          {canEdit ? (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditModal(group)}
                                title="Edit group"
                                aria-label={`Edit ${group.name}`}
                                disabled={toggling}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-[#F1F0FF] hover:text-[#3E439C] disabled:opacity-50 dark:text-slate-400 dark:hover:bg-[#303253] dark:hover:text-[#DCDFFF]"
                              >
                                <Pencil size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() => openStatusConfirmation(group)}
                                title={active ? "Deactivate group" : "Activate group"}
                                aria-label={`${active ? "Deactivate" : "Activate"} ${group.name}`}
                                disabled={toggling}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                              >
                                <Power size={14} />
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400">
                              View only
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Simple pagination footer: one count and two buttons */}
        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {pagination.total === 0
              ? "Showing 0 groups"
              : `Showing ${firstRecord}–${lastRecord} of ${pagination.total} groups`}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={loading || page <= 1}
              className={secondaryButton}
              aria-label="Previous page"
            >
              <ChevronLeft size={15} />
              Previous
            </button>

            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              disabled={
                loading ||
                (!pagination.hasNext && page >= pagination.totalPages)
              }
              className={secondaryButton}
              aria-label="Next page"
            >
              Next
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Create / Edit modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-group-modal-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#171827]"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <div>
                <h3
                  id="service-group-modal-title"
                  className="text-sm font-semibold text-slate-800 dark:text-slate-100"
                >
                  {editingGroup ? "Edit Service Group" : "Add Service Group"}
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Enter a name for this group.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close dialog"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-2 p-5">
                {error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
                  >
                    {error}
                  </div>
                )}

                <label
                  htmlFor="service-group-name"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Group name <span className="text-red-500">*</span>
                </label>

                <input
                  id="service-group-name"
                  type="text"
                  autoFocus
                  required
                  maxLength={150}
                  value={form.name}
                  onChange={(event) =>
                    setForm({ name: event.target.value })
                  }
                  placeholder="e.g. Laboratory"
                  className={inputClass}
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className={secondaryButton}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-[#3E439C] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#323780] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  {saving
                    ? "Saving..."
                    : editingGroup
                      ? "Save Changes"
                      : "Create Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reusable confirmation dialog */}
      <ConfirmDialog
        isOpen={Boolean(pendingGroup)}
        onCancel={closeStatusConfirmation}
        onClose={closeStatusConfirmation}
        title={
          pendingGroup
            ? `${pendingActive ? "Deactivate" : "Activate"} service group?`
            : "Confirm status change"
        }
        description={
          pendingGroup
            ? pendingActive
              ? `Are you sure you want to deactivate "${pendingGroup.name}"? The group should no longer be available for new service selections.`
              : `Are you sure you want to activate "${pendingGroup.name}"?`
            : ""
        }
        variant={pendingActive ? "warning" : "info"}
        confirmText={pendingActive ? "Deactivate" : "Activate"}
        cancelText="Cancel"
        loading={toggling}
        closeOnBackdrop={!toggling}
        closeOnEscape={!toggling}
        onConfirm={handleToggleStatus}
      >
        {confirmError && (
          <div
            role="alert"
            className={`mt-4 rounded-lg border p-3 text-xs ${
              isDark
                ? "border-red-900 bg-red-950/30 text-red-300"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {confirmError}
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}

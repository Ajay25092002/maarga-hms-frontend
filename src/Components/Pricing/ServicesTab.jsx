
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Stethoscope,
  RefreshCw,
  X,
  Check,
  Power,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { useTheme } from "../../Context/ThemeContext";
import {
  serviceGroupsApi,
  servicesApi,
} from "../../Services/pricingServices";
import ConfirmDialog from "../Common/ConfirmDialog";

const initialForm = {
  name: "",
  service_group_id: "",
  available_for_op: true,
  available_for_ip: true,
};

const DEFAULT_PAGE_SIZE = 10;

function getRows(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

function getPagination(response, rows, page, pageSize) {
  const meta = response?.pagination ?? response?.data?.pagination;

  if (meta) {
    const total = Number(meta.total ?? rows.length);
    const totalPages = Number(
      meta.total_pages ?? Math.ceil(total / pageSize)
    );

    return {
      total,
      totalPages,
      hasPrevious: meta.has_previous ?? page > 1,
      hasNext: meta.has_next ?? page < totalPages,
    };
  }

  // Compatibility with APIs that still return a plain array.
  return {
    total: rows.length,
    totalPages: rows.length ? 1 : 0,
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

function isActive(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    return !["false", "0", "inactive", "disabled"].includes(
      value.toLowerCase()
    );
  }

  return true;
}

export default function ServicesTab({
  canCreate = true,
  canEdit = true,
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [services, setServices] = useState([]);
  const [groups, setGroups] = useState([]);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [billTypeFilter, setBillTypeFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [pagination, setPagination] = useState({
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
  const [editingService, setEditingService] = useState(null);
  const [form, setForm] = useState(initialForm);

  const [pendingService, setPendingService] = useState(null);
  const [confirmError, setConfirmError] = useState("");

  // Debounce search input to avoid calling the API on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  // Any filter change returns the list to page one.
  useEffect(() => {
    setPage(1);
  }, [groupFilter, billTypeFilter, pageSize]);

  const loadGroups = useCallback(async () => {
    const response = await serviceGroupsApi.list({
      page_size: 100,
    });

    const rows = getRows(response);

    setGroups(rows.filter((group) => isActive(group.is_active)));
  }, []);

  const loadServices = useCallback(
    async ({ showLoader = true } = {}) => {
      if (showLoader) setLoading(true);
      setError("");

      try {
        const params = {
          page,
          page_size: pageSize,
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          ...(groupFilter ? { service_group_id: groupFilter } : {}),
          ...(billTypeFilter !== "all"
            ? { bill_type: billTypeFilter }
            : {}),
        };

        const response = await servicesApi.list(params);
        const rows = getRows(response);
        const meta = getPagination(response, rows, page, pageSize);

        // If deleting/filtering leaves the current page out of range,
        // move to the last available page.
        if (meta.totalPages > 0 && page > meta.totalPages) {
          setPage(meta.totalPages);
          return rows;
        }

        setServices(rows);
        setPagination(meta);

        return rows;
      } catch (err) {
        setError(getErrorMessage(err));
        throw err;
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [page, pageSize, debouncedSearch, groupFilter, billTypeFilter]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      await Promise.all([loadGroups(), loadServices({ showLoader: false })]);
    } catch {
      // The individual loaders set the error message.
    } finally {
      setLoading(false);
    }
  }, [loadGroups, loadServices]);

  useEffect(() => {
    loadGroups().catch((err) => setError(getErrorMessage(err)));
  }, [loadGroups]);

  useEffect(() => {
    loadServices().catch(() => {});
  }, [loadServices]);

  const groupNames = useMemo(
    () => new Map(groups.map((group) => [String(group.id), group.name])),
    [groups]
  );

  function openCreateModal() {
    setEditingService(null);
    setForm(initialForm);
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function openEditModal(service) {
    setEditingService(service);
    setForm({
      name: service.name || "",
      service_group_id: String(service.service_group_id ?? ""),
      available_for_op: service.available_for_op === true,
      available_for_ip: service.available_for_ip === true,
    });
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingService(null);
    setForm(initialForm);
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const name = form.name.trim();

    if (!name) {
      setError("Please enter a service name.");
      return;
    }

    if (!form.service_group_id) {
      setError("Please select a service group.");
      return;
    }

    if (!form.available_for_op && !form.available_for_ip) {
      setError("Select at least one bill type: OP or IP.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      name,
      service_group_id: Number(form.service_group_id),
      available_for_op: form.available_for_op,
      available_for_ip: form.available_for_ip,
    };

    try {
      if (editingService) {
        await servicesApi.update(editingService.id, payload);
        setSuccess("Service updated successfully.");
      } else {
        await servicesApi.create(payload);
        setSuccess("Service created successfully.");
      }

      setModalOpen(false);
      setEditingService(null);
      setForm(initialForm);

      await loadGroups();
      await loadServices({ showLoader: false });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function openStatusConfirmation(service) {
    if (!canEdit || toggling) return;

    setPendingService(service);
    setConfirmError("");
    setError("");
    setSuccess("");
  }

  function closeStatusConfirmation() {
    if (toggling) return;
    setPendingService(null);
    setConfirmError("");
  }

  async function handleToggleStatus() {
    if (!pendingService || toggling) return;

    const service = pendingService;
    const nextActive = !isActive(service.is_active);

    setToggling(true);
    setConfirmError("");
    setError("");
    setSuccess("");

    try {
      // Use the dedicated PATCH status endpoint, not the general PUT update.
      const updated = await servicesApi.updateStatus(
        service.id,
        nextActive
      );

      if (
        updated &&
        typeof updated.is_active !== "undefined" &&
        isActive(updated.is_active) !== nextActive
      ) {
        throw new Error("The server did not save the requested status.");
      }

      setPendingService(null);
      setSuccess(
        `"${service.name}" was ${
          nextActive ? "activated" : "deactivated"
        } successfully.`
      );

      await loadServices({ showLoader: false });
    } catch (err) {
      const message = getErrorMessage(err);
      setConfirmError(message);
      setError(message);
    } finally {
      setToggling(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#3E439C] focus:ring-2 focus:ring-[#3E439C]/10 dark:border-slate-700 dark:bg-[#1D1E30] dark:text-slate-100 dark:placeholder:text-slate-500";

  const secondaryButton =
    "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800";

  const firstRecord =
    pagination.total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRecord = Math.min(page * pageSize, pagination.total);

  const pendingIsActive = pendingService
    ? isActive(pendingService.is_active)
    : false;

  return (
    <div data-theme={theme} className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            Services
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Configure billable services and their OP/IP availability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
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
              disabled={groups.length === 0}
              title={
                groups.length === 0
                  ? "Create a service group first"
                  : "Add service"
              }
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-[#3E439C] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#323780] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={15} />
              Add Service
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {(error || success) && !modalOpen && !pendingService && (
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
            aria-label="Dismiss message"
            className="ml-auto shrink-0 opacity-70 hover:opacity-100"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Search and filters */}
      <div className="grid grid-cols-1 gap-3 rounded-xl  p-0  md:grid-cols-3">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search services..."
            aria-label="Search services"
            className={`${inputClass} pl-9`}
          />
        </div>

        <select
          value={groupFilter}
          onChange={(event) => setGroupFilter(event.target.value)}
          aria-label="Filter by service group"
          className={inputClass}
        >
          <option value="">All service groups</option>
          {groups.map((group) => (
            <option key={group.id} value={String(group.id)}>
              {group.name}
            </option>
          ))}
        </select>

        <select
          value={billTypeFilter}
          onChange={(event) => setBillTypeFilter(event.target.value)}
          aria-label="Filter by bill type"
          className={inputClass}
        >
          <option value="all">All bill types</option>
          <option value="OP">OP services</option>
          <option value="IP">IP services</option>
        </select>
      </div>

      {groups.length === 0 && !loading && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Create an active service group before adding services.
        </div>
      )}

      {/* Services table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#171827]">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Stethoscope
              size={16}
              className="text-[#3E439C] dark:text-[#B9BCFF]"
            />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              All Services
            </h3>
          </div>

          <span className="rounded-full bg-[#F1F0FF] px-2.5 py-1 text-xs font-medium text-[#3E439C] dark:bg-[#303253] dark:text-[#DCDFFF]">
            {pagination.total}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[#F6F6FC] text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-[#1D1E30] dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Service group</th>
                <th className="px-4 py-3">Bill types</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    Loading services...
                  </td>
                </tr>
              ) : services.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <Stethoscope
                      size={25}
                      className="mx-auto mb-2 text-slate-300 dark:text-slate-600"
                    />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      No services found
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {search || groupFilter || billTypeFilter !== "all"
                        ? "Try changing your search or filters."
                        : "Add a service to get started."}
                    </p>
                  </td>
                </tr>
              ) : (
                services.map((service) => {
                  const active = isActive(service.is_active);
                  const availableForOp = service.available_for_op === true;
                  const availableForIp = service.available_for_ip === true;

                  return (
                    <tr
                      key={service.id}
                      className="transition hover:bg-slate-50/70 dark:hover:bg-[#202134]"
                    >
                      <td className="px-4 py-3.5">
                        <span className="font-medium text-slate-800 dark:text-slate-100">
                          {service.name}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300">
                        {groupNames.get(String(service.service_group_id)) ||
                          service.service_group_name ||
                          "—"}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1.5">
                          {availableForOp && (
                            <span className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                              OP
                            </span>
                          )}
                          {availableForIp && (
                            <span className="rounded-md bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                              IP
                            </span>
                          )}
                          {!availableForOp && !availableForIp && (
                            <span className="text-xs text-slate-400">
                              None
                            </span>
                          )}
                        </div>
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
                                onClick={() => openEditModal(service)}
                                title="Edit service"
                                aria-label={`Edit ${service.name}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-[#F1F0FF] hover:text-[#3E439C] dark:text-slate-400 dark:hover:bg-[#303253] dark:hover:text-[#DCDFFF]"
                              >
                                <Pencil size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() => openStatusConfirmation(service)}
                                title={active ? "Deactivate service" : "Activate service"}
                                aria-label={`${active ? "Deactivate" : "Activate"} ${service.name}`}
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

        {/* One record count and Previous / Next only */}
        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {pagination.total === 0
              ? "Showing 0 services"
              : `Showing ${firstRecord}–${lastRecord} of ${pagination.total} services`}
          </p>

          <div className="flex items-center gap-2">


            {/* this is the code is commented out because it is not needed for now. It can be uncommented if needed in the future. */}
            {/* <label className="mr-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              Rows
              <select
                value={pageSize}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-[#1D1E30] dark:text-slate-200"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label> */}

            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={loading || page <= 1}
              className={secondaryButton}
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
            aria-labelledby="service-modal-title"
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#171827]"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <div>
                <h3
                  id="service-modal-title"
                  className="text-sm font-semibold text-slate-800 dark:text-slate-100"
                >
                  {editingService ? "Edit Service" : "Add Service"}
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Configure the service details and bill types.
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
              <div className="space-y-4 p-5">
                {error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
                  >
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label
                    htmlFor="service-name"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Service name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="service-name"
                    type="text"
                    autoFocus
                    required
                    maxLength={255}
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    placeholder="e.g. Doctor Consultation"
                    className={inputClass}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="service-group"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Service group <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="service-group"
                    required
                    value={form.service_group_id}
                    onChange={(event) =>
                      updateForm("service_group_id", event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">Select a service group</option>
                    {groups.map((group) => (
                      <option key={group.id} value={String(group.id)}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                <fieldset className="space-y-2">
                  <legend className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Available for <span className="text-red-500">*</span>
                  </legend>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 transition hover:border-[#3E439C] dark:border-slate-700 dark:hover:border-[#777BE0]">
                      <input
                        type="checkbox"
                        checked={form.available_for_op}
                        onChange={(event) =>
                          updateForm("available_for_op", event.target.checked)
                        }
                        className="h-4 w-4 accent-[#3E439C]"
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        OP Billing
                      </span>
                    </label>

                    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 transition hover:border-[#3E439C] dark:border-slate-700 dark:hover:border-[#777BE0]">
                      <input
                        type="checkbox"
                        checked={form.available_for_ip}
                        onChange={(event) =>
                          updateForm("available_for_ip", event.target.checked)
                        }
                        className="h-4 w-4 accent-[#3E439C]"
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        IP Billing
                      </span>
                    </label>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    A service can be available for OP, IP, or both.
                  </p>
                </fieldset>
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
                  disabled={saving || groups.length === 0}
                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-[#3E439C] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#323780] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  {saving
                    ? "Saving..."
                    : editingService
                      ? "Save Changes"
                      : "Create Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reusable confirmation dialog */}
      <ConfirmDialog
        isOpen={Boolean(pendingService)}
        onCancel={closeStatusConfirmation}
        onClose={closeStatusConfirmation}
        title={
          pendingService
            ? `${pendingIsActive ? "Deactivate" : "Activate"} service?`
            : "Confirm status change"
        }
        description={
          pendingService
            ? pendingIsActive
              ? `Are you sure you want to deactivate "${pendingService.name}"? It will no longer be available for new service selections.`
              : `Are you sure you want to activate "${pendingService.name}"?`
            : ""
        }
        variant={pendingIsActive ? "warning" : "info"}
        confirmText={pendingIsActive ? "Deactivate" : "Activate"}
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


import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  Stethoscope,
  RefreshCw,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Power,
} from "lucide-react";

import { useTheme } from "../../Context/ThemeContext";
import { doctorsApi } from "../../Services/pricingServices";
import ConfirmDialog from "../Common/ConfirmDialog";

const DEFAULT_PAGE_SIZE = 10;

const getItems = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const getErrorMessage = (error) =>
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

const getPagination = (response, rows, page, pageSize) => {
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

  // Supports older API responses that return only an array.
  return {
    total: rows.length,
    totalPages: rows.length ? 1 : 0,
    hasPrevious: false,
    hasNext: false,
  };
};

const isDoctorActive = (doctor) => {
  const value = doctor?.is_active;

  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    return !["false", "0", "inactive", "disabled"].includes(
      value.toLowerCase()
    );
  }

  return true;
};

export default function DoctorsTab({
  canCreate = true,
  canEdit = true,
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [doctorName, setDoctorName] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [pendingDoctor, setPendingDoctor] = useState(null);
  const [confirmError, setConfirmError] = useState("");

  const styles = useMemo(
    () => ({
      panel: isDark
        ? "border-gray-700 bg-gray-900"
        : "border-gray-200 bg-white",

      heading: isDark ? "text-gray-100" : "text-gray-800",

      muted: isDark ? "text-gray-400" : "text-gray-500",

      input: isDark
        ? "border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500"
        : "border-gray-300 bg-white text-gray-800 placeholder-gray-400",

      secondaryButton: isDark
        ? "border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700"
        : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",

      rowHover: isDark
        ? "hover:bg-gray-800/70"
        : "hover:bg-gray-50",

      divider: isDark ? "border-gray-700" : "border-gray-100",

      overlay: isDark ? "bg-black/70" : "bg-black/40",

      modal: isDark
        ? "border-gray-700 bg-gray-900"
        : "border-gray-200 bg-white",

      tableHead: isDark
        ? "bg-gray-800/70 text-gray-300"
        : "bg-gray-50 text-gray-600",

      statusActive: isDark
        ? "bg-emerald-950/40 text-emerald-300"
        : "bg-emerald-50 text-emerald-700",

      statusInactive: isDark
        ? "bg-gray-800 text-gray-300"
        : "bg-gray-100 text-gray-600",

      noticeError: isDark
        ? "border-red-900 bg-red-950/30 text-red-300"
        : "border-red-200 bg-red-50 text-red-700",

      noticeSuccess: isDark
        ? "border-emerald-900 bg-emerald-950/30 text-emerald-300"
        : "border-emerald-200 bg-emerald-50 text-emerald-700",
    }),
    [isDark]
  );

  // Debounce search to reduce unnecessary API requests.
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  // Return to the first page when filters or page size change.
  useEffect(() => {
    setPage(1);
  }, [statusFilter, pageSize]);

  const loadDoctors = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = {
        page,
        page_size: pageSize,
        ...(debouncedSearch
          ? { search: debouncedSearch }
          : {}),
        ...(statusFilter === "all"
          ? {}
          : { is_active: statusFilter === "active" }),
      };

      const response = await doctorsApi.list(params);
      const rows = getItems(response);
      const meta = getPagination(response, rows, page, pageSize);

      // Handle a page that became invalid after filtering.
      if (meta.totalPages > 0 && page > meta.totalPages) {
        setPage(meta.totalPages);
        return;
      }

      setDoctors(rows);
      setPagination(meta);
    } catch (err) {
      setError(getErrorMessage(err));
      setDoctors([]);
      setPagination({
        total: 0,
        totalPages: 0,
        hasPrevious: false,
        hasNext: false,
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, statusFilter]);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  const firstRecord =
    pagination.total === 0 ? 0 : (page - 1) * pageSize + 1;

  const lastRecord = Math.min(
    page * pageSize,
    pagination.total
  );

  const resetForm = () => {
    setDoctorName("");
    setIsActive(true);
    setEditingDoctor(null);
    setError("");
  };

  const openCreateModal = () => {
    resetForm();
    setSuccess("");
    setModalOpen(true);
  };

  const openEditModal = (doctor) => {
    resetForm();
    setEditingDoctor(doctor);
    setDoctorName(doctor.name ?? "");
    setIsActive(isDoctorActive(doctor));
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    resetForm();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const name = doctorName.trim();

    if (!name) {
      setError("Please enter the doctor's name.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editingDoctor) {
        // Keep the update request compatible with the existing PUT schema.
        await doctorsApi.update(editingDoctor.id, { name });

        // Change status through its dedicated endpoint if required.
        if (isActive !== isDoctorActive(editingDoctor)) {
          await doctorsApi.updateStatus(
            editingDoctor.id,
            isActive
          );
        }

        setSuccess("Doctor updated successfully.");
      } else {
        await doctorsApi.create({ name });
        setSuccess("Doctor added successfully.");
      }

      setModalOpen(false);
      resetForm();
      await loadDoctors();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const openStatusConfirmation = (doctor) => {
    if (!canEdit || toggling) return;

    setPendingDoctor(doctor);
    setConfirmError("");
    setError("");
    setSuccess("");
  };

  const closeStatusConfirmation = () => {
    if (toggling) return;

    setPendingDoctor(null);
    setConfirmError("");
  };

  const handleToggleStatus = async () => {
    if (!pendingDoctor || toggling) return;

    const doctor = pendingDoctor;
    const nextStatus = !isDoctorActive(doctor);

    setToggling(true);
    setConfirmError("");
    setError("");
    setSuccess("");

    try {
      // Requires updateStatus in pricingServices.js and the backend PATCH route.
      const updated = await doctorsApi.updateStatus(
        doctor.id,
        nextStatus
      );

      if (
        updated &&
        typeof updated.is_active !== "undefined" &&
        isDoctorActive(updated) !== nextStatus
      ) {
        throw new Error(
          "The server did not save the requested status."
        );
      }

      setPendingDoctor(null);

      setSuccess(
        `Doctor "${doctor.name}" ${
          nextStatus ? "activated" : "deactivated"
        } successfully.`
      );

      await loadDoctors();
    } catch (err) {
      const message = getErrorMessage(err);
      setConfirmError(message);
      setError(message);
    } finally {
      setToggling(false);
    }
  };

  const pendingIsActive = pendingDoctor
    ? isDoctorActive(pendingDoctor)
    : false;

  return (
    <div className="space-y-4" data-theme={theme}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className={`text-base font-semibold ${styles.heading}`}>
            Doctors
          </h2>

          <p className={`mt-1 text-sm ${styles.muted}`}>
            Manage doctors used for doctor-specific OP consultation pricing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadDoctors}
            disabled={loading}
            className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${styles.secondaryButton}`}
          >
            <RefreshCw
              size={15}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          {canCreate && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#3E439C] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#32377F]"
            >
              <Plus size={16} />
              Add Doctor
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {(error || success) && !modalOpen && !pendingDoctor && (
        <div
          role={error ? "alert" : "status"}
          className={`rounded-lg border px-4 py-3 text-sm ${
            error ? styles.noticeError : styles.noticeSuccess
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <span>{error || success}</span>

            <button
              type="button"
              onClick={() => {
                setError("");
                setSuccess("");
              }}
              aria-label="Dismiss notification"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Table and filters */}
      <div className={`overflow-hidden rounded-xl border ${styles.panel}`}>
        <div
          className={`flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center ${styles.divider}`}
        >
          <div className="relative flex-1">
            <Search
              size={17}
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${styles.muted}`}
            />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search doctors..."
              aria-label="Search doctors"
              className={`w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-[#3E439C] focus:ring-2 focus:ring-[#3E439C]/10 ${styles.input}`}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter doctors by status"
            className={`rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[#3E439C] ${styles.input}`}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className={styles.tableHead}>
              <tr>
                <th className="px-5 py-3 font-medium">Doctor</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={3}
                    className={`px-5 py-12 text-center ${styles.muted}`}
                  >
                    Loading doctors...
                  </td>
                </tr>
              ) : doctors.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className={`px-5 py-12 text-center ${styles.muted}`}
                  >
                    {search.trim() || statusFilter !== "all"
                      ? "No doctors match your search or filters."
                      : "No doctors found. Add your first doctor to get started."}
                  </td>
                </tr>
              ) : (
                doctors.map((doctor) => {
                  const active = isDoctorActive(doctor);

                  return (
                    <tr
                      key={doctor.id}
                      className={`border-t ${styles.divider} ${styles.rowHover}`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={
                              isDark
                                ? "rounded-lg bg-gray-800 p-2 text-gray-300"
                                : "rounded-lg bg-[#F1F0FF] p-2 text-[#3E439C]"
                            }
                          >
                            <Stethoscope size={17} />
                          </div>

                          <span className={`font-medium ${styles.heading}`}>
                            {doctor.name}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            active
                              ? styles.statusActive
                              : styles.statusInactive
                          }`}
                        >
                          {active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          {canEdit && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditModal(doctor)}
                                title="Edit doctor"
                                aria-label={`Edit ${doctor.name}`}
                                className={`rounded-lg border  px-6 transition text-xs font-medium ${styles.secondaryButton}`}
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openStatusConfirmation(doctor)
                                }
                                title={
                                  active
                                    ? "Deactivate doctor"
                                    : "Activate doctor"
                                }
                                disabled={toggling}
                                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition disabled:opacity-50 ${styles.secondaryButton}`}
                              >
                                {active ? "Deactivate" : "Activate"}
                              </button>
                            </>
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

        {/* Pagination */}
        <div
          className={`flex flex-col gap-3 border-t px-5 py-3 sm:flex-row sm:items-center sm:justify-between ${styles.divider}`}
        >
          <p className={`text-xs ${styles.muted}`}>
            {pagination.total === 0
              ? "Showing 0 doctors"
              : `Showing ${firstRecord}–${lastRecord} of ${pagination.total} doctors`}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {/*
              Future enhancement: Rows per page selector.
              Keep commented out for now.

              <label className={`flex items-center gap-2 text-xs ${styles.muted}`}>
                Rows
                <select
                  value={pageSize}
                  onChange={(event) =>
                    setPageSize(Number(event.target.value))
                  }
                  className={`rounded-lg border px-2 py-2 text-xs ${styles.input}`}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
            */}

            <button
              type="button"
              onClick={() =>
                setPage((current) => Math.max(1, current - 1))
              }
              disabled={loading || page <= 1}
              className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${styles.secondaryButton}`}
            >
              <ChevronLeft size={14} />
              Previous
            </button>

            <span className={`min-w-16 text-center text-xs ${styles.muted}`}>
              Page {page}
              {pagination.totalPages > 0
                ? ` of ${pagination.totalPages}`
                : ""}
            </span>

            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              disabled={
                loading ||
                (!pagination.hasNext && page >= pagination.totalPages)
              }
              className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${styles.secondaryButton}`}
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit doctor dialog */}
      {modalOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 ${styles.overlay}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="doctor-modal-title"
            className={`my-auto w-full max-w-md rounded-xl border shadow-xl ${styles.modal}`}
          >
            <div
              className={`flex items-center justify-between border-b px-5 py-4 ${styles.divider}`}
            >
              <div>
                <h3
                  id="doctor-modal-title"
                  className={`font-semibold ${styles.heading}`}
                >
                  {editingDoctor ? "Edit Doctor" : "Add Doctor"}
                </h3>

                <p className={`mt-1 text-xs ${styles.muted}`}>
                  Enter the doctor's details below.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className={`rounded-lg border p-2 ${styles.secondaryButton}`}
                aria-label="Close dialog"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-5">
              {error && (
                <div
                  role="alert"
                  className={`rounded-lg border px-3 py-2 text-sm ${styles.noticeError}`}
                >
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="doctor-name"
                  className={`mb-1.5 block text-sm font-medium ${styles.heading}`}
                >
                  Doctor name <span className="text-red-500">*</span>
                </label>

                <input
                  id="doctor-name"
                  type="text"
                  value={doctorName}
                  onChange={(event) => setDoctorName(event.target.value)}
                  placeholder="Enter doctor name"
                  autoFocus
                  required
                  maxLength={255}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[#3E439C] focus:ring-2 focus:ring-[#3E439C]/10 ${styles.input}`}
                />
              </div>

              {editingDoctor && (
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(event) => setIsActive(event.target.checked)}
                    className="h-4 w-4 accent-[#3E439C]"
                  />

                  <span className={`text-sm ${styles.heading}`}>
                    Doctor is active
                  </span>
                </label>
              )}

              <div
                className={`flex justify-end gap-2 border-t pt-4 ${styles.divider}`}
              >
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className={`rounded-lg border px-4 py-2.5 text-sm font-medium ${styles.secondaryButton}`}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#3E439C] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#32377F] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <Check size={15} />
                  )}

                  {saving
                    ? "Saving..."
                    : editingDoctor
                      ? "Save Changes"
                      : "Add Doctor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reusable activation / deactivation confirmation */}
      <ConfirmDialog
        isOpen={Boolean(pendingDoctor)}
        onCancel={closeStatusConfirmation}
        onClose={closeStatusConfirmation}
        title={
          pendingDoctor
            ? `${pendingIsActive ? "Deactivate" : "Activate"} doctor?`
            : "Confirm status change"
        }
        description={
          pendingDoctor
            ? pendingIsActive
              ? `Are you sure you want to deactivate "${pendingDoctor.name}"?`
              : `Are you sure you want to activate "${pendingDoctor.name}"?`
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
            className={`mt-4 rounded-lg border p-3 text-xs ${styles.noticeError}`}
          >
            {confirmError}
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}

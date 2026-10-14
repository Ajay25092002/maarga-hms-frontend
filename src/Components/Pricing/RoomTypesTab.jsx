
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Pencil,
  BedDouble,
  RefreshCw,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useTheme } from "../../Context/ThemeContext";
import { roomTypesApi } from "../../Services/pricingServices";
import ConfirmDialog from "../Common/ConfirmDialog";

const PAGE_SIZE = 10;

const getItems = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.results)) return response.results;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const getPagination = (response, itemCount) => {
  const pagination = response?.pagination;

  return {
    page: Number(pagination?.page ?? 1),
    pageSize: Number(pagination?.page_size ?? PAGE_SIZE),
    total: Number(pagination?.total ?? itemCount),
    totalPages: Math.max(
      1,
      Number(pagination?.total_pages ?? 1)
    ),
    hasPrevious: Boolean(
      pagination?.has_previous ?? false
    ),
    hasNext: Boolean(pagination?.has_next ?? false),
  };
};

export default function RoomTypesTab({
  canCreate = true,
  canEdit = true,
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [roomTypes, setRoomTypes] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasPrevious: false,
    hasNext: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoomType, setEditingRoomType] = useState(null);
  const [roomTypeName, setRoomTypeName] = useState("");

  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    roomType: null,
    nextStatus: null,
  });

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
    }),
    [isDark]
  );

  const loadRoomTypes = useCallback(
    async (options = {}) => {
      const requestedPage = options.page ?? page;
      const requestedSearch = options.search ?? search;
      const requestedStatus = options.status ?? statusFilter;

      setLoading(true);
      setError("");

      try {
        const params = {
          page: requestedPage,
          page_size: PAGE_SIZE,
          search: requestedSearch.trim() || undefined,
          is_active:
            requestedStatus === "all"
              ? undefined
              : requestedStatus === "active",
        };

        const response = await roomTypesApi.list(params);
        const items = getItems(response);
        const pageInfo = getPagination(response, items.length);

        // If the current page becomes empty after deletion/filtering,
        // move to the last available page.
        if (
          requestedPage > pageInfo.totalPages &&
          pageInfo.total > 0
        ) {
          setPage(pageInfo.totalPages);
          return;
        }

        setRoomTypes(items);
        setPagination(pageInfo);
      } catch (err) {
        setRoomTypes([]);
        setPagination((previous) => ({
          ...previous,
          total: 0,
          totalPages: 1,
          hasPrevious: false,
          hasNext: false,
        }));

        setError(
          err?.response?.data?.detail ||
            err?.message ||
            "Unable to load room types."
        );
      } finally {
        setLoading(false);
      }
    },
    [page, search, statusFilter]
  );

  useEffect(() => {
    loadRoomTypes();
  }, [loadRoomTypes]);

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPage(1);
  };

  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(1);
  };

  const resetForm = () => {
    setRoomTypeName("");
    setEditingRoomType(null);
  };

  const openCreateModal = () => {
    resetForm();
    setError("");
    setModalOpen(true);
  };

  const openEditModal = (roomType) => {
    resetForm();
    setEditingRoomType(roomType);
    setRoomTypeName(roomType.name ?? "");
    setError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    resetForm();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const name = roomTypeName.trim();

    if (!name) {
      setError("Please enter a room type name.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editingRoomType) {
        // Name changes use PUT. Status changes use the separate PATCH endpoint.
        await roomTypesApi.update(editingRoomType.id, { name });
        setSuccess("Room type updated successfully.");
      } else {
        await roomTypesApi.create({ name });
        setSuccess("Room type added successfully.");
      }

      setModalOpen(false);
      resetForm();

      // Return to page 1 after creating a new room type.
      const targetPage = editingRoomType ? page : 1;
      if (!editingRoomType) setPage(1);

      await loadRoomTypes({
        page: targetPage,
        search,
        status: statusFilter,
      });
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to save the room type."
      );
    } finally {
      setSaving(false);
    }
  };

  const requestStatusChange = (roomType) => {
    setError("");
    setConfirmDialog({
      open: true,
      roomType,
      nextStatus: roomType.is_active === false,
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({
      open: false,
      roomType: null,
      nextStatus: null,
    });
  };

  const handleConfirmStatusChange = async () => {
    const { roomType, nextStatus } = confirmDialog;
    if (!roomType || nextStatus === null) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await roomTypesApi.updateStatus(roomType.id, nextStatus);

      setSuccess(
        `Room type ${nextStatus ? "activated" : "deactivated"} successfully.`
      );

      closeConfirmDialog();
      await loadRoomTypes();
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to update room type status."
      );
    } finally {
      setSaving(false);
    }
  };

  const goToPage = (nextPage) => {
    if (
      nextPage < 1 ||
      nextPage > pagination.totalPages ||
      nextPage === page
    ) {
      return;
    }

    setPage(nextPage);
  };

  const firstRow =
    pagination.total === 0
      ? 0
      : (page - 1) * pagination.pageSize + 1;

  const lastRow = Math.min(
    page * pagination.pageSize,
    pagination.total
  );

  return (
    <div className="space-y-4" data-theme={theme}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className={`text-base font-semibold ${styles.heading}`}>
            Room Types
          </h2>
          <p className={`mt-1 text-sm ${styles.muted}`}>
            Manage room categories used for inpatient billing and pricing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadRoomTypes()}
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
              Add Room Type
            </button>
          )}
        </div>
      </div>

      {error && !modalOpen && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className={`overflow-hidden rounded-xl border ${styles.panel}`}>
        <div className="flex flex-col gap-3 border-b border-inherit p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={17}
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${styles.muted}`}
            />
            <input
              type="search"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search room types..."
              className={`w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-[#3E439C] focus:ring-2 focus:ring-[#3E439C]/10 ${styles.input}`}
            />
          </div>

          <select
            value={statusFilter}
            onChange={handleStatusChange}
            className={`rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[#3E439C] ${styles.input}`}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Keep this for future use if page size needs to be configurable.
          <select
            value={pagination.pageSize}
            onChange={(event) => {
              setPage(1);
              // Add configurable page-size state and reload here.
            }}
          >
            <option value={10}>10 rows</option>
            <option value={25}>25 rows</option>
            <option value={50}>50 rows</option>
          </select>
          */}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead
              className={
                isDark
                  ? "bg-gray-800/70 text-gray-300"
                  : "bg-gray-50 text-gray-600"
              }
            >
              <tr>
                <th className="px-5 py-3 font-medium">Room type</th>
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
                    Loading room types...
                  </td>
                </tr>
              ) : roomTypes.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className={`px-5 py-12 text-center ${styles.muted}`}
                  >
                    {search.trim()
                      ? "No room types match your search."
                      : "No room types found. Add your first room type to get started."}
                  </td>
                </tr>
              ) : (
                roomTypes.map((roomType) => {
                  const active = roomType.is_active !== false;

                  return (
                    <tr
                      key={roomType.id}
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
                            <BedDouble size={17} />
                          </div>
                          <span className={`font-medium ${styles.heading}`}>
                            {roomType.name}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-gray-100 text-gray-600"
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
                                onClick={() => openEditModal(roomType)}
                                title="Edit room type"
                                className={`rounded-lg border p-2 transition ${styles.secondaryButton}`}
                              >
                                <Pencil size={15} />
                              </button>

                              <button
                                type="button"
                                onClick={() => requestStatusChange(roomType)}
                                title={
                                  active
                                    ? "Deactivate room type"
                                    : "Activate room type"
                                }
                                className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${styles.secondaryButton}`}
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

        <div
          className={`flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${styles.divider}`}
        >
          <p className={`text-xs ${styles.muted}`}>
            Showing {firstRow}–{lastRow} of {pagination.total} room types
          </p>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className={`text-xs ${styles.muted}`}>
              Page {page} of {pagination.totalPages}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={loading || page <= 1}
                className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${styles.secondaryButton}`}
              >
                <ChevronLeft size={15} />
                Previous
              </button>

              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={loading || page >= pagination.totalPages}
                className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${styles.secondaryButton}`}
              >
                Next
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

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
            aria-labelledby="room-type-modal-title"
            className={`my-auto w-full max-w-md rounded-xl border shadow-xl ${styles.modal}`}
          >
            <div
              className={`flex items-center justify-between border-b px-5 py-4 ${styles.divider}`}
            >
              <div>
                <h3
                  id="room-type-modal-title"
                  className={`font-semibold ${styles.heading}`}
                >
                  {editingRoomType ? "Edit Room Type" : "Add Room Type"}
                </h3>
                <p className={`mt-1 text-xs ${styles.muted}`}>
                  Enter the room category details below.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className={`rounded-lg p-2 ${styles.secondaryButton}`}
                aria-label="Close dialog"
              >
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-5">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="room-type-name"
                  className={`mb-1.5 block text-sm font-medium ${styles.heading}`}
                >
                  Room type name <span className="text-red-500">*</span>
                </label>
                <input
                  id="room-type-name"
                  type="text"
                  value={roomTypeName}
                  onChange={(event) => setRoomTypeName(event.target.value)}
                  placeholder="e.g. General Ward, Private Room"
                  autoFocus
                  required
                  maxLength={100}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[#3E439C] focus:ring-2 focus:ring-[#3E439C]/10 ${styles.input}`}
                />
              </div>

              <div
                className={`flex justify-end gap-2 border-t border-inherit pt-4`}
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
                    : editingRoomType
                    ? "Save Changes"
                    : "Add Room Type"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDialog.open && (
        <ConfirmDialog
          isOpen={confirmDialog.open}
          title={
            confirmDialog.nextStatus
              ? "Activate Room Type"
              : "Deactivate Room Type"
          }
          message={`Are you sure you want to ${
            confirmDialog.nextStatus ? "activate" : "deactivate"
          } "${confirmDialog.roomType?.name}"?`}
          confirmText={
            confirmDialog.nextStatus ? "Activate" : "Deactivate"
          }
          cancelText="Cancel"
          loading={saving}
          onConfirm={handleConfirmStatusChange}
          onCancel={closeConfirmDialog}
        />
      )}
    </div>
  );
}

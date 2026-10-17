import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Search,
  Plus,
  Pencil,
  RefreshCw,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { useTheme } from "../../Context/ThemeContext";

import ConfirmDialog from "../Common/ConfirmDialog";
import SearchableDropdown from "../Common/SearchableDropdown";

import {
  serviceGroupsApi,
  servicesApi,
  doctorsApi,
  roomTypesApi,
  servicePricingApi,
} from "../../Services/pricingServices";

const PAGE_SIZE = 10;

const getItems = (response) => {
  if (Array.isArray(response)) return response;

  if (Array.isArray(response?.items)) return response.items;

  if (Array.isArray(response?.results)) return response.results;

  if (Array.isArray(response?.data)) return response.data;

  return [];
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const emptyForm = {
  service_id: "",

  bill_type: "OP",

  amount: "",

  doctor_id: "",

  room_type_id: "",
};

const getPagination = (response, fallbackCount = 0) => {
  const info = response?.pagination;

  return {
    page: Number(info?.page ?? 1),

    pageSize: Number(info?.page_size ?? PAGE_SIZE),

    total: Number(info?.total ?? fallbackCount),

    totalPages: Math.max(1, Number(info?.total_pages ?? 1)),

    hasPrevious: Boolean(info?.has_previous ?? false),

    hasNext: Boolean(info?.has_next ?? false),
  };
};

export default function ServicePricingTab({
  canCreate = true,

  canEdit = true,
}) {
  const { theme } = useTheme();

  const isDark = theme === "dark";

  const [prices, setPrices] = useState([]);

  const [services, setServices] = useState([]);

  const [groups, setGroups] = useState([]);

  const [doctors, setDoctors] = useState([]);

  const [roomTypes, setRoomTypes] = useState([]);

  const [search, setSearch] = useState("");

  const [billTypeFilter, setBillTypeFilter] = useState("all");

  const [groupFilter, setGroupFilter] = useState("all");

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

  const [lookupsLoading, setLookupsLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    price: null,
    nextStatus: false,
  });

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);

  const [editingPrice, setEditingPrice] = useState(null);

  const [form, setForm] = useState(emptyForm);
  const [selectedService, setSelectedService] = useState(null);

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

      rowHover: isDark ? "hover:bg-gray-800/70" : "hover:bg-gray-50",

      divider: isDark ? "border-gray-700" : "border-gray-100",

      modal: isDark
        ? "border-gray-700 bg-gray-900"
        : "border-gray-200 bg-white",

      overlay: "bg-black/50",
    }),

    [isDark],
  );

  // -------------------------------------------------------

  // LOAD DROPDOWN DATA

  // -------------------------------------------------------

  const loadLookupData = useCallback(async () => {
    setLookupsLoading(true);

    try {
      const [servicesResponse, groupsResponse, doctorsResponse, roomsResponse] =
        await Promise.all([
          servicesApi.list(),

          serviceGroupsApi.list(),

          doctorsApi.list(),

          roomTypesApi.list(),
        ]);

      setServices(getItems(servicesResponse));

      setGroups(getItems(groupsResponse));

      setDoctors(getItems(doctorsResponse));

      setRoomTypes(getItems(roomsResponse));
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load pricing dropdown data."));
    } finally {
      setLookupsLoading(false);
    }
  }, []);

  // -------------------------------------------------------

  // LOAD PRICES WITH SERVER-SIDE SEARCH AND PAGINATION

  // -------------------------------------------------------

  const loadPrices = useCallback(
    async (options = {}) => {
      const requestedPage = options.page ?? page;

      const requestedSearch = options.search ?? search;

      const requestedBillType = options.billType ?? billTypeFilter;

      const requestedStatus = options.status ?? statusFilter;

      const requestedGroup = options.group ?? groupFilter;

      setLoading(true);

      setError("");

      try {
        const params = {
          page: requestedPage,
          page_size: PAGE_SIZE,
          search: requestedSearch.trim() || undefined,
          bill_type:
            requestedBillType === "all" ? undefined : requestedBillType,
          is_active:
            requestedStatus === "all"
              ? undefined
              : requestedStatus === "active",
          service_group_id:
            requestedGroup === "all" ? undefined : Number(requestedGroup),
        };

        const response = await servicePricingApi.list(params);

        const items = getItems(response);

        const pageInfo = getPagination(response, items.length);

        // Handle a page that no longer exists after filtering or status changes.

        if (requestedPage > pageInfo.totalPages && pageInfo.total > 0) {
          setPage(pageInfo.totalPages);

          return;
        }

        setPrices(items);

        setPagination(pageInfo);
      } catch (err) {
        setPrices([]);

        setPagination({
          page: 1,

          pageSize: PAGE_SIZE,

          total: 0,

          totalPages: 1,

          hasPrevious: false,

          hasNext: false,
        });

        setError(getErrorMessage(err, "Unable to load service pricing."));
      } finally {
        setLoading(false);
      }
    },

    [page, search, billTypeFilter, groupFilter, statusFilter],
  );

  useEffect(() => {
    loadLookupData();
  }, [loadLookupData]);

  useEffect(() => {
    loadPrices();
  }, [loadPrices]);

  // -------------------------------------------------------

  // LOOKUP HELPERS

  // -------------------------------------------------------

  const serviceMap = useMemo(
    () => new Map(services.map((item) => [String(item.id), item])),

    [services],
  );

  const groupMap = useMemo(
    () => new Map(groups.map((item) => [String(item.id), item])),

    [groups],
  );

  const doctorMap = useMemo(
    () => new Map(doctors.map((item) => [String(item.id), item])),

    [doctors],
  );

  const roomMap = useMemo(
    () => new Map(roomTypes.map((item) => [String(item.id), item])),

    [roomTypes],
  );

  const getServiceName = (price) => {
    const id = price.service_id ?? price.service?.id;

    return (
      price.service_name ??
      price.service?.name ??
      serviceMap.get(String(id))?.name ??
      "Unknown service"
    );
  };

  const getGroupName = (price) => {
    const service =
      serviceMap.get(String(price.service_id ?? price.service?.id)) ??
      price.service;

    const groupId =
      price.service_group_id ??
      service?.service_group_id ??
      service?.service_group?.id;

    return (
      price.service_group_name ??
      service?.service_group_name ??
      service?.service_group?.name ??
      groupMap.get(String(groupId))?.name ??
      "—"
    );
  };

  const getDoctorName = (price) => {
    const id = price.doctor_id ?? price.doctor?.id;

    return (
      price.doctor_name ??
      price.doctor?.name ??
      doctorMap.get(String(id))?.name ??
      ""
    );
  };

  const getRoomName = (price) => {
    const id = price.room_type_id ?? price.room_type?.id;

    return (
      price.room_type_name ??
      price.room_type?.name ??
      roomMap.get(String(id))?.name ??
      ""
    );
  };

  const getPriceContext = (price) => {
    const billType = String(price.bill_type ?? "").toUpperCase();

    if (billType === "OP") {
      return getDoctorName(price) || "Standard OP rate";
    }

    if (billType === "IP") {
      return getRoomName(price) || "Standard IP rate";
    }

    return "—";
  };

  const fetchServiceOptions = useCallback(async (query, { signal } = {}) => {
    const response = await servicesApi.list({
      page: 1,
      page_size: 10,
      search: query.trim() || undefined,
    });

    if (signal?.aborted) return [];

    const items = getItems(response);

    return items.filter((service) => service.is_active !== false);
  }, []);

  const eligibleServices = services.filter(
    (service) => service.is_active !== false,
  );

  const eligibleDoctors = doctors.filter(
    (doctor) => doctor.is_active !== false,
  );

  const eligibleRoomTypes = roomTypes.filter(
    (room) => room.is_active !== false,
  );

  // -------------------------------------------------------

  // SEARCH AND FILTER HANDLERS

  // -------------------------------------------------------

  const handleSearchChange = (event) => {
    setSearch(event.target.value);

    setPage(1);
  };

  const handleBillTypeChange = (event) => {
    setBillTypeFilter(event.target.value);

    setPage(1);
  };

  const handleGroupChange = (event) => {
    setGroupFilter(event.target.value);

    setPage(1);
  };

  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value);

    setPage(1);
  };

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.totalPages || nextPage === page) {
      return;
    }

    setPage(nextPage);
  };

  // -------------------------------------------------------

  // FORM HANDLERS

  // -------------------------------------------------------

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,

      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);

    setEditingPrice(null);
  };

  const openCreateModal = () => {
    resetForm();

    setError("");

    setModalOpen(true);
  };

  const openEditModal = (price) => {
    setError("");

    setEditingPrice(price);

    setForm({
      service_id: String(price.service_id ?? price.service?.id ?? ""),

      bill_type: String(price.bill_type ?? "OP").toUpperCase(),

      amount: String(price.amount ?? ""),

      doctor_id: String(price.doctor_id ?? price.doctor?.id ?? ""),

      room_type_id: String(price.room_type_id ?? price.room_type?.id ?? ""),
    });

    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);

    resetForm();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    setSuccess("");

    if (!form.service_id) {
      setError("Please select a service.");

      return;
    }

    const amount = Number(form.amount);

    if (!Number.isFinite(amount) || amount < 0) {
      setError("Enter a valid amount greater than or equal to zero.");

      return;
    }

    if (form.bill_type === "OP" && form.room_type_id) {
      setError("Room type is only applicable to IP pricing.");

      return;
    }

    if (form.bill_type === "IP" && form.doctor_id) {
      setError("Doctor-specific pricing is only applicable to OP pricing.");

      return;
    }

    setSaving(true);

    try {
      const payload = {
        service_id: Number(form.service_id),

        bill_type: form.bill_type,

        amount,

        doctor_id:
          form.bill_type === "OP" && form.doctor_id
            ? Number(form.doctor_id)
            : null,

        room_type_id:
          form.bill_type === "IP" && form.room_type_id
            ? Number(form.room_type_id)
            : null,
      };

      if (editingPrice) {
        // PUT updates pricing details only; status is managed separately.

        await servicePricingApi.update(editingPrice.id, payload);

        setSuccess("Service price updated successfully.");
      } else {
        await servicePricingApi.create(payload);

        setSuccess("Service price added successfully.");
      }

      setModalOpen(false);

      resetForm();

      const targetPage = editingPrice ? page : 1;

      if (!editingPrice) {
        setPage(1);
      }

      await loadPrices({
        page: targetPage,

        search,

        billType: billTypeFilter,

        status: statusFilter,
      });
    } catch (err) {
      setError(getErrorMessage(err, "Unable to save the service price."));
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------

  // ACTIVATE / DEACTIVATE

  // -------------------------------------------------------

  const handleToggleStatus = (price) => {
    if (statusUpdatingId !== null || saving) return;
    setConfirmDialog({
      isOpen: true,
      price,
      nextStatus: price.is_active === false,
    });
  };

  const closeConfirmDialog = () => {
    if (statusUpdatingId !== null) return;
    setConfirmDialog({ isOpen: false, price: null, nextStatus: false });
  };

  const confirmToggleStatus = async () => {
    const { price, nextStatus } = confirmDialog;
    if (!price || statusUpdatingId !== null || saving) return;

    setError("");
    setSuccess("");
    setStatusUpdatingId(price.id);

    try {
      await servicePricingApi.updateStatus(price.id, nextStatus);
      setSuccess(
        `Service price ${nextStatus ? "activated" : "deactivated"} successfully.`,
      );
      setConfirmDialog({ isOpen: false, price: null, nextStatus: false });
      await loadPrices({
        page,
        search,
        billType: billTypeFilter,
        status: statusFilter,
      });
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update service price status."));
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const firstRow =
    pagination.total === 0 ? 0 : (page - 1) * pagination.pageSize + 1;

  const lastRow = Math.min(page * pagination.pageSize, pagination.total);

  // -------------------------------------------------------

  // UI

  // -------------------------------------------------------

  return (
    <div className="space-y-4" data-theme={theme}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className={`text-base font-semibold ${styles.heading}`}>
            Service Pricing
          </h2>

          <p className={`mt-1 text-sm ${styles.muted}`}>
            Configure service prices for outpatient and inpatient billing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              loadLookupData();

              loadPrices();
            }}
            disabled={loading || lookupsLoading}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${styles.secondaryButton}`}
          >
            <RefreshCw
              size={15}
              className={loading || lookupsLoading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          {canCreate && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-lg bg-[#3E439C] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#32377F]"
            >
              <Plus size={16} />
              Add Price
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
        <div className="grid gap-3 border-b border-inherit p-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search
              size={16}
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${styles.muted}`}
            />

            <input
              type="search"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search service, doctor, room..."
              className={`w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#3E439C] focus:ring-2 focus:ring-[#3E439C]/10 ${styles.input}`}
            />
          </div>

          <select
            value={billTypeFilter}
            onChange={handleBillTypeChange}
            className={`rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[#3E439C] ${styles.input}`}
          >
            <option value="all">All billing types</option>

            <option value="OP">OP</option>

            <option value="IP">IP</option>
          </select>

          <select
            value={groupFilter}
            onChange={handleGroupChange}
            className={`rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[#3E439C] ${styles.input}`}
          >
            <option value="all">All service groups</option>

            {groups.map((group) => (
              <option key={group.id} value={String(group.id)}>
                {group.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={handleStatusChange}
            className={`rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[#3E439C] ${styles.input}`}
          >
            <option value="all">All statuses</option>

            <option value="active">Active</option>

            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead
              className={
                isDark
                  ? "bg-gray-800/70 text-gray-300"
                  : "bg-gray-50 text-gray-600"
              }
            >
              <tr>
                <th className="px-5 py-3 font-medium">Service</th>

                <th className="px-5 py-3 font-medium">Group</th>

                <th className="px-5 py-3 font-medium">Type</th>

                <th className="px-5 py-3 font-medium">Pricing context</th>

                <th className="px-5 py-3 font-medium">Amount</th>

                <th className="px-5 py-3 font-medium">Status</th>

                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className={`px-5 py-12 text-center ${styles.muted}`}
                  >
                    Loading pricing...
                  </td>
                </tr>
              ) : prices.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className={`px-5 py-12 text-center ${styles.muted}`}
                  >
                    No prices found. Try changing the filters or add a price.
                  </td>
                </tr>
              ) : (
                prices.map((price) => {
                  const active = price.is_active !== false;

                  const billType = String(price.bill_type ?? "").toUpperCase();

                  const updating = statusUpdatingId === price.id;

                  return (
                    <tr
                      key={price.id}
                      className={`border-t ${styles.divider} ${styles.rowHover}`}
                    >
                      <td className={`px-5 py-4 font-medium ${styles.heading}`}>
                        {getServiceName(price)}
                      </td>

                      <td className={`px-5 py-4 ${styles.muted}`}>
                        {getGroupName(price)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-md px-2 py-1 text-xs font-semibold ${
                            billType === "OP"
                              ? "bg-[#F1F0FF] text-[#3E439C]"
                              : "bg-sky-50 text-sky-700"
                          }`}
                        >
                          {billType || "—"}
                        </span>
                      </td>

                      <td className={`px-5 py-4 ${styles.muted}`}>
                        {getPriceContext(price)}
                      </td>

                      <td
                        className={`px-5 py-4 font-semibold ${styles.heading}`}
                      >
                        ₹
                        {Number(price.amount ?? 0).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
                          minimumFractionDigits: 2,

                          maximumFractionDigits: 2,
                        })}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
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
                                title="Edit price"
                                onClick={() => openEditModal(price)}
                                disabled={updating || saving}
                                className={`rounded-lg border p-2 transition disabled:opacity-50 ${styles.secondaryButton}`}
                              >
                                <Pencil size={15} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleStatus(price)}
                                disabled={updating || saving}
                                className={`min-w-[92px] rounded-lg border px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles.secondaryButton}`}
                              >
                                {updating
                                  ? "Updating..."
                                  : active
                                    ? "Deactivate"
                                    : "Activate"}
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
          className={`flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${styles.divider}`}
        >
          <p className={`text-xs ${styles.muted}`}>
            Showing {firstRow}–{lastRow} of {pagination.total} price entries
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

      {/* Add / Edit Modal  */}

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
            aria-labelledby="pricing-modal-title"
            className={`my-auto w-full max-w-lg rounded-xl border shadow-xl ${styles.modal}`}
          >
            <div
              className={`flex items-center justify-between border-b px-5 py-4 ${styles.divider}`}
            >
              <div>
                <h3
                  id="pricing-modal-title"
                  className={`font-semibold ${styles.heading}`}
                >
                  {editingPrice ? "Edit Service Price" : "Add Service Price"}
                </h3>

                <p className={`mt-1 text-xs ${styles.muted}`}>
                  Set the rate and its applicable billing context.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className={`rounded-lg border p-2 ${styles.secondaryButton}`}
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-5">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="price-service"
                  className={`mb-1.5 block text-sm font-medium ${styles.heading}`}
                >
                  Service <span className="text-red-500">*</span>
                </label>

                <SearchableDropdown
                  value={
                    selectedService &&
                    String(selectedService.id) === String(form.service_id)
                      ? selectedService
                      : eligibleServices.find(
                          (service) => String(service.id) === String(form.service_id),
                        ) ??
                        editingPrice?.service ??
                        (editingPrice
                          ? {
                              id: editingPrice.service_id,
                              name: editingPrice.service_name ?? "",
                            }
                          : null)
                  }
                  onChange={(service) => {
                    setSelectedService(service);
                    updateForm("service_id", service ? String(service.id) : "");
                  }}
                  fetchOptions={fetchServiceOptions}
                  getOptionLabel={(service) => service.name ?? ""}
                  getOptionValue={(service) => service.id}
                  placeholder="Select service"
                  searchPlaceholder="Search services..."
                  emptyMessage="No matching services found."
                  loadingMessage="Loading services..."
                  disabled={lookupsLoading}
                  className="w-full"
                />
              </div>

              <div>
                <label
                  htmlFor="price-bill-type"
                  className={`mb-1.5 block text-sm font-medium ${styles.heading}`}
                >
                  Billing type <span className="text-red-500">*</span>
                </label>

                <select
                  id="price-bill-type"
                  value={form.bill_type}
                  onChange={(event) => {
                    const billType = event.target.value;

                    setForm((current) => ({
                      ...current,

                      bill_type: billType,

                      doctor_id: "",

                      room_type_id: "",
                    }));
                  }}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[#3E439C] ${styles.input}`}
                >
                  <option value="OP">Outpatient (OP)</option>

                  <option value="IP">Inpatient (IP)</option>
                </select>
              </div>

              {form.bill_type === "OP" && (
                <div>
                  <label
                    htmlFor="price-doctor"
                    className={`mb-1.5 block text-sm font-medium ${styles.heading}`}
                  >
                    Doctor-specific rate{" "}
                    <span className={styles.muted}>(optional)</span>
                  </label>

                  <select
                    id="price-doctor"
                    value={form.doctor_id}
                    onChange={(event) =>
                      updateForm("doctor_id", event.target.value)
                    }
                    disabled={lookupsLoading}
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[#3E439C] ${styles.input}`}
                  >
                    <option value="">Standard OP rate (all doctors)</option>

                    {eligibleDoctors.map((doctor) => (
                      <option key={doctor.id} value={String(doctor.id)}>
                        {doctor.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {form.bill_type === "IP" && (
                <div>
                  <label
                    htmlFor="price-room"
                    className={`mb-1.5 block text-sm font-medium ${styles.heading}`}
                  >
                    Room type <span className={styles.muted}>(optional)</span>
                  </label>

                  <select
                    id="price-room"
                    value={form.room_type_id}
                    onChange={(event) =>
                      updateForm("room_type_id", event.target.value)
                    }
                    disabled={lookupsLoading}
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[#3E439C] ${styles.input}`}
                  >
                    <option value="">Standard IP rate (all rooms)</option>

                    {eligibleRoomTypes.map((room) => (
                      <option key={room.id} value={String(room.id)}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label
                  htmlFor="price-amount"
                  className={`mb-1.5 block text-sm font-medium ${styles.heading}`}
                >
                  Amount (₹) <span className="text-red-500">*</span>
                </label>

                <input
                  id="price-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.amount}
                  onChange={(event) => updateForm("amount", event.target.value)}
                  placeholder="Enter amount"
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[#3E439C] ${styles.input}`}
                />
              </div>

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
                  disabled={saving || lookupsLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#3E439C] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#32377F] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <Check size={15} />
                  )}

                  {saving
                    ? "Saving..."
                    : editingPrice
                      ? "Save Changes"
                      : "Add Price"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={
          confirmDialog.nextStatus
            ? "Activate Service Price"
            : "Deactivate Service Price"
        }
        message={
          confirmDialog.price
            ? `Are you sure you want to ${
                confirmDialog.nextStatus ? "activate" : "deactivate"
              } the price for "${getServiceName(confirmDialog.price)}"?`
            : ""
        }
        confirmText={confirmDialog.nextStatus ? "Activate" : "Deactivate"}
        cancelText="Cancel"
        loading={statusUpdatingId !== null}
        onConfirm={confirmToggleStatus}
        onCancel={closeConfirmDialog}
      />
    </div>
  );
}

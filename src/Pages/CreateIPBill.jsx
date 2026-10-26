import { useCallback, useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  UserRound,
  BedDouble,
  RefreshCw,
} from "lucide-react";

import AppSidebar from "../Components/Layout/AppSidebar";

import TopNavbar from "../Components/Layout/TopNavbar";

import { useTheme } from "../Context/ThemeContext";

import Loader from "../Components/Common/Loader";

import FullPageLoader from "../Components/Common/FullPageLoader";

import { useToast } from "../Components/Common/useToast";

import SearchableDropdown from "../Components/Common/SearchableDropdown";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8001"
).replace(/\/$/, "");

const REQUIRED_IP_SERVICES = [
  "ROOM RENT",
  "NURSING CHARGES",
  "HOLISTIC THERAPIES",
  "DIET & FOOD",
  "PSYCHIATRIC CONSULTATION/TREATMENT",
  "PSYCHOLOGIST COUNSELLING/TREATMENT",
  "RECREATION ACTVITIES/THERAPY",
  "DOCTOR CONSULTATION",
  "MRD CHARGES",
  "ADMISSION CHARGES",
];

const AUTOMATED_IP_SERVICE_NAMES = new Set([
  "ROOM RENT",
  "HOLISTIC THERAPIES",
  "DIET & FOOD",
  "DOCTOR CONSULTATION",
  "NURSING CHARGES",
  "PSYCHIATRIC CONSULTATION/TREATMENT",
  "PSYCHOLOGIST COUNSELLING/TREATMENT",
  "RECREATION ACTVITIES/THERAPY",
]);

const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",

    year: "numeric",

    month: "2-digit",

    day: "2-digit",
  }).format(new Date());

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const createCharge = () => ({
  id: makeId(),

  service_id: "",

  service_date: today(),

  description: "",

  quantity: "1",

  rate: "",

  discount_amount: "0",

  gst_amount: "0",

  priceLoading: false,

  priceError: "",
});

const createCategory = () => ({
  id: makeId(),

  service_group_id: "",

  items: [createCharge()],
});

const currency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",

    currency: "INR",

    minimumFractionDigits: 2,

    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const patientName = (patient) => patient?.name?.trim() || "—";

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",

    headers: {
      Accept: "application/json",

      ...(options.body ? { "Content-Type": "application/json" } : {}),

      ...options.headers,
    },

    ...options,
  });

  const contentType = response.headers.get("content-type") || "";

  const data = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    const detail = data?.detail ?? data?.message ?? data;

    const message = Array.isArray(detail)
      ? detail.map((item) => item.msg || JSON.stringify(item)).join("; ")
      : typeof detail === "string"
        ? detail
        : `Request failed (${response.status})`;

    throw new Error(message || `Request failed (${response.status})`);
  }

  return data;
}

function unwrapList(data) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.items)) return data.items;

  if (Array.isArray(data?.results)) return data.results;

  if (Array.isArray(data?.data)) return data.data;

  return [];
}

function getId(record) {
  return record?.id ?? record?.service_id ?? record?.patient_id ?? "";
}

function getName(record) {
  return record?.name ?? record?.service_name ?? "";
}

function getPrice(data) {
  const candidates = [
    data?.amount,

    data?.price,

    data?.rate,

    data?.resolved_price,

    data?.service_price?.amount,

    data?.data?.amount,

    data?.data?.price,
  ];

  const value = candidates.find(
    (candidate) =>
      candidate !== undefined && candidate !== null && candidate !== "",
  );

  if (value === undefined || !Number.isFinite(Number(value))) {
    throw new Error("The pricing API did not return a valid service price.");
  }

  return Number(value);
}

export default function CreateIPBill() {
  const navigate = useNavigate();

  const { theme } = useTheme();

  const { showToast } = useToast();

  const dark = theme === "dark";

  const [patients, setPatients] = useState([]);

  const [patientsLoading, setPatientsLoading] = useState(true);

  const [patientsError, setPatientsError] = useState("");

  const [patientQuery, setPatientQuery] = useState("");

  const [selectedPatient, setSelectedPatient] = useState(null);

  const [showPatientResults, setShowPatientResults] = useState(false);

  const [doctors, setDoctors] = useState([]);

  const [serviceGroups, setServiceGroups] = useState([]);

  const [services, setServices] = useState([]);

  const [roomTypes, setRoomTypes] = useState([]);

  const [mastersLoading, setMastersLoading] = useState(true);

  const [mastersError, setMastersError] = useState("");

  const [admissionDate, setAdmissionDate] = useState(today());

  const [dischargeDate, setDischargeDate] = useState("");

  const [billDate, setBillDate] = useState(today());

  const [department, setDepartment] = useState("");

  const [doctorName, setDoctorName] = useState("");

  const [bedNumber, setBedNumber] = useState("");

  const [roomTypeId, setRoomTypeId] = useState("");

  const [rateCategory] = useState("General IPD");

  const [categories, setCategories] = useState([createCategory()]);

  const [notes, setNotes] = useState("");

  const [notice, setNotice] = useState("");

  const [noticeType, setNoticeType] = useState("error");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [savedBill, setSavedBill] = useState(null);

  const [isLoadingRequiredServices, setIsLoadingRequiredServices] =
    useState(false);
  const [restrictAutoServices, setRestrictAutoServices] = useState(false);

  const text = dark ? "text-slate-100" : "text-slate-800";

  const muted = dark ? "text-slate-400" : "text-slate-500";

  const border = dark ? "border-slate-700" : "border-slate-200";

  const panel = dark ? "bg-[#171827]" : "bg-white";

  const inputClass = `h-10 w-full min-w-0 rounded-md border px-3 text-sm outline-none transition focus:border-[#3E439C] focus:ring-2 focus:ring-[#3E439C]/10 ${
    dark
      ? "border-slate-700 bg-[#171827] text-slate-100 placeholder:text-slate-500"
      : "border-slate-200 bg-white text-slate-800 placeholder:text-slate-400"
  }`;

  const readOnlyClass = `h-10 w-full flex items-center min-w-0 rounded-md border px-3 text-sm ${
    dark
      ? "border-slate-700 bg-slate-800/70 text-slate-300"
      : "border-slate-200 bg-slate-50 text-slate-700"
  }`;

  const labelClass = `mb-2 block text-[13px] font-medium ${
    dark ? "text-slate-300" : "text-slate-600"
  }`;

  const isGstEligible = (category, item) => {
    const group = serviceGroups.find(
      (entry) => String(getId(entry)) === String(category.service_group_id),
    );

    const service = services.find(
      (entry) => String(getId(entry)) === String(item.service_id),
    );

    return (
      getName(group).trim().toUpperCase() === "ACCOMMODATION CHARGES" &&
      getName(service).trim().toUpperCase() === "ROOM RENT"
    );
  };

  const fetchIPServices = useCallback(
    async (groupId, search, { signal } = {}) => {
      const params = new URLSearchParams({
        ...(groupId ? { service_group_id: String(groupId) } : {}),

        bill_type: "IP",

        search: search.trim(),

        page: "1",

        page_size: "10",

        is_active: "true",
      });

      const data = await apiRequest(`/api/services?${params.toString()}`, {
        signal,
      });

      const results = unwrapList(data).filter(
        (service) =>
          service.is_active !== false && service.available_for_ip !== false,
      );

      setServices((current) => {
        const byId = new Map(
          current.map((service) => [String(getId(service)), service]),
        );

        results.forEach((service) => {
          byId.set(String(getId(service)), service);
        });

        return Array.from(byId.values());
      });

      return results;
    },

    [],
  );

  const loadPatients = useCallback(
    async (signal) => {
      setPatientsLoading(true);

      setPatientsError("");

      try {
        const data = await apiRequest("/api/patients?page=1&page_size=100", {
          signal,
        });

        const records = unwrapList(data);

        setPatients(records);
      } catch (error) {
        if (error.name === "AbortError") return;

        setPatientsError(error.message || "Unable to load patients.");

        showToast({
          type: "error",

          title: "Unable to load patients",

          message: error.message || "Please try again.",

          duration: 6000,
        });
      } finally {
        if (!signal?.aborted) setPatientsLoading(false);
      }
    },

    [showToast],
  );

  const loadMasters = useCallback(async (signal) => {
    setMastersLoading(true);

    setMastersError("");

    try {
      const [groupsData, roomTypesData, doctorsData] = await Promise.all([
        apiRequest("/api/service-groups", { signal }),

        apiRequest("/api/room-types", { signal }),

        apiRequest("/api/doctors", { signal }),
      ]);

      setServiceGroups(
        unwrapList(groupsData).filter((item) => item.is_active !== false),
      );

      setRoomTypes(
        unwrapList(roomTypesData).filter((item) => item.is_active !== false),
      );

      setDoctors(
        unwrapList(doctorsData).filter((doctor) => doctor.is_active !== false),
      );
    } catch (error) {
      if (error.name === "AbortError") return;

      setMastersError(
        error.message ||
          "Unable to load service groups, room types, and doctors.",
      );
    } finally {
      if (!signal?.aborted) setMastersLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loadPatients(controller.signal);

    loadMasters(controller.signal);

    return () => controller.abort();
  }, [loadPatients, loadMasters]);

  const filteredPatients = useMemo(() => {
    const query = patientQuery.trim().toLowerCase();

    const records = !query
      ? patients.slice(0, 8)
      : patients.filter((patient) =>
          [patientName(patient), patient.patient_id, patient.mobile].some(
            (value) =>
              String(value ?? "")
                .toLowerCase()

                .includes(query),
          ),
        );

    return records.slice(0, 8);
  }, [patients, patientQuery]);

  const updateCategory = (categoryId, updates) => {
    setCategories((current) =>
      current.map((category) =>
        category.id === categoryId ? { ...category, ...updates } : category,
      ),
    );

    setNotice("");
  };

  const addCategory = () => {
    setCategories((current) => [...current, createCategory()]);

    setNotice("");
  };

  const removeCategory = (categoryId) => {
    setCategories((current) =>
      current.length <= 1
        ? current
        : current.filter((category) => category.id !== categoryId),
    );
  };

  const addCharge = (categoryId) => {
    setCategories((current) =>
      current.map((category) =>
        category.id === categoryId
          ? { ...category, items: [...category.items, createCharge()] }
          : category,
      ),
    );
  };

  const removeCharge = (categoryId, chargeId) => {
    setCategories((current) =>
      current.flatMap((category) => {
        if (category.id !== categoryId) return [category];

        const remainingItems = category.items.filter(
          (item) => item.id !== chargeId,
        );

        // Remove the category too when its final service row is deleted.

        // This ensures the deleted row disappears from the single table

        // instead of being replaced with a blank row.

        if (remainingItems.length === 0) return [];

        return [{ ...category, items: remainingItems }];
      }),
    );

    setNotice("");
  };

  const updateCharge = (categoryId, chargeId, updates) => {
    setCategories((current) =>
      current.map((category) =>
        category.id !== categoryId
          ? category
          : {
              ...category,

              items: category.items.map((item) =>
                item.id === chargeId ? { ...item, ...updates } : item,
              ),
            },
      ),
    );

    setNotice("");
  };

  const handleServiceSelection = async (categoryId, chargeId, service) => {
    const serviceId = service ? String(getId(service)) : "";

    if (!serviceId) {
      await resolvePrice(categoryId, chargeId, "");

      return;
    }

    const serviceGroupId = String(
      service.service_group_id ??
        service.group_id ??
        service.service_group?.id ??
        service.group?.id ??
        serviceGroups.find(
          (group) =>
            getName(group).trim().toLowerCase() ===
            String(
              service.service_group_name ??
                service.group_name ??
                service.service_group?.name ??
                service.group?.name ??
                "",
            )
              .trim()
              .toLowerCase(),
        )?.id ??
        "",
    );

    setServices((current) => {
      const byId = new Map(
        current.map((entry) => [String(getId(entry)), entry]),
      );

      byId.set(serviceId, service);

      return Array.from(byId.values());
    });

    if (!serviceGroupId) {
      await resolvePrice(categoryId, chargeId, serviceId, service);

      return;
    }

    const sourceCategory = categories.find(
      (category) => category.id === categoryId,
    );

    if (!sourceCategory) return;

    let targetCategoryId = categoryId;

    let nextCategories = categories;

    if (String(sourceCategory.service_group_id) !== serviceGroupId) {
      const selectedItem = sourceCategory.items.find(
        (item) => item.id === chargeId,
      );

      if (!selectedItem) return;

      const targetCategory = categories.find(
        (category) =>
          category.id !== categoryId &&
          String(category.service_group_id) === serviceGroupId,
      );

      if (sourceCategory.items.length === 1) {
        nextCategories = categories.map((category) =>
          category.id === sourceCategory.id
            ? { ...category, service_group_id: serviceGroupId }
            : category,
        );
      } else if (targetCategory) {
        targetCategoryId = targetCategory.id;

        nextCategories = categories.map((category) => {
          if (category.id === sourceCategory.id) {
            return {
              ...category,
              items: category.items.filter((item) => item.id !== chargeId),
            };
          }

          if (category.id === targetCategory.id) {
            return { ...category, items: [...category.items, selectedItem] };
          }

          return category;
        });
      } else {
        const newCategory = {
          ...createCategory(),

          service_group_id: serviceGroupId,

          items: [selectedItem],
        };

        targetCategoryId = newCategory.id;

        nextCategories = categories

          .map((category) =>
            category.id === sourceCategory.id
              ? {
                  ...category,
                  items: category.items.filter((item) => item.id !== chargeId),
                }
              : category,
          )

          .concat(newCategory);
      }

      setCategories(nextCategories);
    }

    await resolvePrice(targetCategoryId, chargeId, serviceId, service);
  };

  const resolvePrice = async (
    categoryId,
    chargeId,
    serviceId,
    serviceOverride = null,
  ) => {
    if (!serviceId) {
      updateCharge(categoryId, chargeId, {
        service_id: "",

        description: "",

        rate: "",

        gst_amount: "0",

        priceLoading: false,

        priceError: "",
      });

      return;
    }

    if (!roomTypeId) {
      updateCharge(categoryId, chargeId, {
        service_id: serviceId,

        rate: "",

        gst_amount: "0",

        priceLoading: false,

        priceError: "Select a room type before choosing a service.",
      });

      return;
    }

    const service =
      serviceOverride ??
      services.find((item) => String(getId(item)) === String(serviceId));

    updateCharge(categoryId, chargeId, {
      service_id: String(serviceId),

      description: getName(service),

      rate: "",

      gst_amount: "0",

      priceLoading: true,

      priceError: "",
    });

    try {
      const params = new URLSearchParams({
        service_id: String(serviceId),

        bill_type: "IP",

        room_type_id: String(roomTypeId),
      });

      const data = await apiRequest(
        `/api/billing/service-price?${params.toString()}`,
      );

      const amount = getPrice(data);

      updateCharge(categoryId, chargeId, {
        service_id: String(serviceId),

        description: getName(service),

        rate: String(amount),

        priceLoading: false,

        priceError: "",
      });
    } catch (error) {
      updateCharge(categoryId, chargeId, {
        service_id: String(serviceId),

        description: getName(service),

        rate: "",

        priceLoading: false,

        priceError:
          error.message ||
          "No applicable price exists for this service and room type.",
      });
    }
  };

  const autoPopulateIPServices = async (selectedRoomTypeId) => {
    if (!selectedRoomTypeId || mastersLoading) return;

    setIsLoadingRequiredServices(true);

    setMastersError("");

    try {
      // Step 1: Search for all required services concurrently.

      const serviceSearchTasks = serviceGroups.flatMap((group) => {
        const groupId = getId(group);

        return REQUIRED_IP_SERVICES.map(async (serviceName) => {
          const params = new URLSearchParams({
            service_group_id: String(groupId),

            bill_type: "IP",

            search: serviceName,

            page: "1",

            page_size: "10",

            is_active: "true",
          });

          const data = await apiRequest(`/api/services?${params.toString()}`);

          const matches = unwrapList(data).filter(
            (service) =>
              service.is_active !== false &&
              service.available_for_ip !== false &&
              getName(service).trim().toUpperCase() === serviceName,
          );

          return {
            groupId: String(groupId),

            services: matches,
          };
        });
      });

      // Continue even if an individual service search fails.

      const searchResults = await Promise.allSettled(serviceSearchTasks);

      const fetchedServices = [];

      const servicesByGroup = new Map();

      const searchErrors = [];

      searchResults.forEach((result) => {
        if (result.status === "rejected") {
          searchErrors.push(result.reason);

          return;
        }

        const { groupId, services: matches } = result.value;

        if (!servicesByGroup.has(groupId)) {
          servicesByGroup.set(groupId, []);
        }

        const groupServices = servicesByGroup.get(groupId);

        matches.forEach((service) => {
          const serviceId = String(getId(service));

          // Avoid duplicate services within the same group.

          if (
            !groupServices.some(
              (existing) => String(getId(existing)) === serviceId,
            )
          ) {
            groupServices.push(service);

            fetchedServices.push(service);
          }
        });
      });

      if (fetchedServices.length === 0) {
        throw new Error(
          searchErrors.length
            ? "Unable to retrieve the required IP services. Please try again."
            : "No matching IP services were found for automatic selection.",
        );
      }

      // Step 2: Fetch all service prices concurrently.

      const priceResults = await Promise.all(
        serviceGroups.map(async (group) => {
          const groupId = String(getId(group));

          const matchedServices = servicesByGroup.get(groupId) || [];

          if (matchedServices.length === 0) return null;

          const items = await Promise.all(
            matchedServices.map(async (service) => {
              try {
                const params = new URLSearchParams({
                  service_id: String(getId(service)),

                  bill_type: "IP",

                  room_type_id: String(selectedRoomTypeId),
                });

                const priceData = await apiRequest(
                  `/api/billing/service-price?${params.toString()}`,
                );

                return {
                  ...createCharge(),

                  isAutomaticallyPopulated: true,

                  service_id: String(getId(service)),

                  description: getName(service),

                  rate: String(getPrice(priceData)),

                  quantity: "1",

                  discount_amount: "0",

                  gst_amount: "0",

                  priceLoading: false,

                  priceError: "",
                };
              } catch (error) {
                return {
                  ...createCharge(),

                  isAutomaticallyPopulated: true,

                  service_id: String(getId(service)),

                  description: getName(service),

                  rate: "",

                  quantity: "1",

                  discount_amount: "0",

                  gst_amount: "0",

                  priceLoading: false,

                  priceError:
                    error.message ||
                    "No applicable price exists for this service and room type.",
                };
              }
            }),
          );

          return {
            ...createCategory(),

            service_group_id: groupId,

            items,
          };
        }),
      );

      const populatedCategories = priceResults.filter(Boolean);

      // Make fetched services available to the dropdowns.

      setServices((current) => {
        const byId = new Map(
          current.map((service) => [String(getId(service)), service]),
        );

        fetchedServices.forEach((service) => {
          byId.set(String(getId(service)), service);
        });

        return Array.from(byId.values());
      });

      // Update the displayed categories once.

      setCategories(populatedCategories);

      if (searchErrors.length > 0) {
        setMastersError(
          "Some service searches failed. Please review the loaded services.",
        );
      }
    } catch (error) {
      setMastersError(
        error.message || "Unable to automatically populate IP services.",
      );
    } finally {
      setIsLoadingRequiredServices(false);
    }
  };

  // If the room type changes, every selected service must be repriced.

  useEffect(() => {
    if (!roomTypeId) {
      setCategories((current) =>
        current.map((category) => ({
          ...category,

          items: category.items.map((item) => ({
            ...item,

            rate: "",

            priceLoading: false,

            priceError: item.service_id
              ? "Select a room type to retrieve the price."
              : "",
          })),
        })),
      );

      return;
    }

    // Required services and their room-specific prices are

    // loaded by autoPopulateIPServices() when room type changes.

    // Avoid making duplicate price API requests here.
  }, [roomTypeId]);

  const categorySummaries = useMemo(
    () =>
      categories.map((category) => {
        const lines = category.items.map((item) => {
          const quantity = Math.max(0, Number(item.quantity) || 0);

          const rate = Math.max(0, Number(item.rate) || 0);

          const gross = quantity * rate;

          const requestedDiscount = Math.max(
            0,

            Number(item.discount_amount) || 0,
          );

          const discount = Math.min(gross, requestedDiscount);

          const gst = isGstEligible(category, item)
            ? Math.max(0, Number(item.gst_amount) || 0)
            : 0;

          return {
            id: item.id,

            gross,

            discount,

            gst,

            net: Math.max(0, gross - discount),

            total: Math.max(0, gross - discount) + gst,
          };
        });

        return {
          id: category.id,

          subtotal: lines.reduce((sum, line) => sum + line.gross, 0),

          discount: lines.reduce((sum, line) => sum + line.discount, 0),

          gst: lines.reduce((sum, line) => sum + line.gst, 0),

          total: lines.reduce((sum, line) => sum + line.total, 0),
        };
      }),

    [categories],
  );

  const billSummary = useMemo(() => {
    const subtotal = categorySummaries.reduce(
      (sum, category) => sum + category.subtotal,

      0,
    );

    const discount = categorySummaries.reduce(
      (sum, category) => sum + category.discount,

      0,
    );

    const gst = categorySummaries.reduce(
      (sum, category) => sum + category.gst,

      0,
    );

    return {
      subtotal,

      discount,

      gst,

      total: Math.max(0, subtotal - discount) + gst,
    };
  }, [categorySummaries]);

  const selectPatient = (patient) => {
    setSelectedPatient(patient);

    setPatientQuery(patientName(patient));

    setShowPatientResults(false);

    setNotice("");
  };

  const validateForm = () => {
    const fail = (message) => {
      setNotice(message);

      setNoticeType("error");

      showToast({
        type: "warning",

        title: "Check bill details",

        message,
      });

      return false;
    };

    if (!selectedPatient) return fail("Please select a registered patient.");
    if (!department.trim()) {
      return fail("Please enter the department.");
    }

    if (!doctorName.trim()) {
      return fail("Please select a doctor.");
    }

    if (!bedNumber.trim()) {
      return fail("Please enter the bed number.");
    }

    if (!admissionDate || !billDate) {
      return fail("Please select the admission date and bill date.");
    }

    if (dischargeDate && dischargeDate < admissionDate) {
      return fail("Discharge date cannot be earlier than admission date.");
    }

    if (!roomTypeId) return fail("Please select an IP room type.");

    const items = categories.flatMap((category) =>
      category.items.filter((item) => item.service_id),
    );

    if (items.length === 0) {
      return fail("Add at least one service to the IP bill.");
    }

    for (const item of items) {
      if (item.priceLoading) {
        return fail("Wait for all service prices to finish loading.");
      }

      if (item.priceError || item.rate === "") {
        return fail(
          item.priceError ||
            "A service price is missing. Re-select the service to retry.",
        );
      }

      const quantity = Number(item.quantity);

      const rate = Number(item.rate);

      const discount = Number(item.discount_amount || 0);

      const gross = quantity * rate;

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return fail("Each service quantity must be greater than zero.");
      }

      if (!Number.isFinite(rate) || rate < 0) {
        return fail("A valid backend service price is required.");
      }

      if (!Number.isFinite(discount) || discount < 0 || discount > gross) {
        return fail(
          "Each discount must be non-negative and cannot exceed the charge amount.",
        );
      }

      const gst = Number(item.gst_amount || 0);

      if (!Number.isFinite(gst) || gst < 0) {
        return fail("GST must be a valid non-negative amount.");
      }
    }

    if (billSummary.total <= 0) {
      return fail("The final bill amount must be greater than zero.");
    }

    return true;
  };

  const handleGenerateBill = async (event) => {
    event.preventDefault();

    if (isSubmitting || savedBill || !validateForm()) return;

    const items = categories.flatMap((category) =>
      category.items

        .filter((item) => item.service_id)

        .map((item) => {
          const category = categories.find((entry) =>
            entry.items.some((charge) => charge.id === item.id),
          );

          const gstEligible = category ? isGstEligible(category, item) : false;

          return {
            service_id: Number(item.service_id),

            service_date: item.service_date || billDate,

            room_type_id: Number(roomTypeId),

            room_type_name:
              roomTypes.find((room) => String(room.id) === String(roomTypeId))
                ?.name || null,

            bed_number: bedNumber.trim() || null,

            quantity: Number(item.quantity),

            discount_amount: Number(item.discount_amount || 0),

            gst_amount: gstEligible ? Number(item.gst_amount || 0) : 0,
          };
        }),
    );

    const payload = {
      bill_type: "IP",

      patient_id: selectedPatient.patient_id,

      admission_date: `${admissionDate}T00:00:00`,

      discharge_date: dischargeDate ? `${dischargeDate}T00:00:00` : null,

      department: department.trim() || null,

      doctor_name: doctorName.trim() || null,

      bed_number: bedNumber.trim() || null,

      room_type_id: Number(roomTypeId),

      rate_category: "General IPD",

      discount_amount: 0,

      notes: notes.trim() || null,

      items,
    };

    setIsSubmitting(true);

    setNotice("");

    try {
      const data = await apiRequest("/api/bills", {
        method: "POST",

        body: JSON.stringify(payload),
      });

      setSavedBill(data);

      setNotice(
        `IP bill created successfully${
          data?.bill_number ? `: ${data.bill_number}` : ""
        }.`,
      );

      setNoticeType("success");

      showToast({
        type: "success",

        title: "IP bill created",

        message: `Bill ${
          data?.bill_number ? `${data.bill_number} ` : ""
        }was saved successfully.`,
      });
    } catch (error) {
      setNotice(error.message || "Unable to save the bill.");

      setNoticeType("error");

      showToast({
        type: "error",

        title: "Bill creation failed",

        message: error.message || "Unable to save the bill.",

        duration: 6000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen min-w-0 bg-[#F6F6FC] dark:bg-[#11121F]">
      <FullPageLoader show={isSubmitting || isLoadingRequiredServices} />

      <AppSidebar />

      <div className="min-h-screen min-w-0 md:ml-[72px] lg:ml-[260px]">
        <TopNavbar
          title="Create IP Bill"
          breadcrumb={[
            "Hospital Management",

            "Billing",

            "IP Bills",

            "Create Bill",
          ]}
        />

        <main className="min-w-0 px-4 py-5 sm:px-5 lg:px-6">
          <div className="mx-auto w-full max-w-[1400px]">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F1F0FF] dark:bg-[#292B49]">
                  <ReceiptText
                    size={20}
                    className="text-[#3E439C] dark:text-[#D6D4FF]"
                  />
                </div>

                <div>
                  <h1 className={`text-lg font-semibold ${text}`}>
                    Create IP Bill
                  </h1>

                  <p className={`mt-1 text-[13px] ${muted}`}>
                    Select service groups and add room-specific inpatient
                    charges.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate("/ip-billing")}
                className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium ${border} ${text}`}
              >
                <ArrowLeft size={15} />
                Back to IP Bills
              </button>
            </div>

            {mastersError && (
              <div className="mb-5 flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <span>{mastersError}</span>

                <button
                  type="button"
                  onClick={() => loadMasters()}
                  className="font-semibold underline"
                >
                  Retry
                </button>
              </div>
            )}

            {mastersLoading && (
              <div className={`mb-5 rounded-lg border p-4 ${border} ${panel}`}>
                <Loader
                  variant="button"
                  size="sm"
                  message="Loading pricing configuration..."
                />
              </div>
            )}

            <form onSubmit={handleGenerateBill} className="space-y-7">
              {/* Patient and admission details */}

              <section className={`border-b pb-6 ${border}`}>
                <div className="mb-4 flex items-center gap-2">
                  <UserRound size={17} className="text-[#3E439C]" />

                  <h2 className={`text-sm font-semibold ${text}`}>
                    Patient & Admission Details
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="relative">
                    <label className={labelClass}>Search Patient *</label>

                    <div className="relative">
                      <Search
                        size={16}
                        className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`}
                      />

                      <input
                        value={patientQuery}
                        onChange={(event) => {
                          setPatientQuery(event.target.value);

                          setSelectedPatient(null);

                          setShowPatientResults(true);
                        }}
                        onFocus={() => setShowPatientResults(true)}
                        placeholder="Name, patient ID or mobile"
                        className={`${inputClass} pl-9`}
                        autoComplete="off"
                      />
                    </div>

                    {showPatientResults && (
                      <>
                        <button
                          type="button"
                          aria-label="Close patient results"
                          className="fixed inset-0 z-10 cursor-default"
                          onClick={() => setShowPatientResults(false)}
                        />

                        <div
                          className={`absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-md border shadow-lg ${border} ${panel}`}
                        >
                          {patientsLoading ? (
                            <div className={`p-3 text-sm ${muted}`}>
                              Loading patients...
                            </div>
                          ) : patientsError ? (
                            <div className="p-3 text-sm text-red-500">
                              <p>{patientsError}</p>

                              <button
                                type="button"
                                onClick={() => loadPatients()}
                                className="mt-2 font-semibold underline"
                              >
                                Retry
                              </button>
                            </div>
                          ) : filteredPatients.length === 0 ? (
                            <p className={`p-3 text-sm ${muted}`}>
                              No matching patients found.
                            </p>
                          ) : (
                            filteredPatients.map((patient) => (
                              <button
                                key={patient.patient_id}
                                type="button"
                                onClick={() => selectPatient(patient)}
                                className={`block w-full border-b px-3 py-2.5 text-left last:border-0 ${border} ${
                                  dark
                                    ? "hover:bg-slate-800"
                                    : "hover:bg-[#F1F0FF]"
                                }`}
                              >
                                <span
                                  className={`block text-sm font-medium ${text}`}
                                >
                                  {patientName(patient)}
                                </span>

                                <span className={`mt-1 block text-xs ${muted}`}>
                                  {patient.patient_id} · {patient.mobile}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>Patient ID / UHID</label>

                    <div className={`${readOnlyClass} flex items-center`}>
                      {selectedPatient?.patient_id || "Select a patient"}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Patient Name</label>

                    <div className={`${readOnlyClass} flex items-center`}>
                      {selectedPatient ? patientName(selectedPatient) : "—"}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Mobile Number</label>

                    <div className={`${readOnlyClass} flex items-center`}>
                      {selectedPatient?.mobile || "—"}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Department *</label>

                    <input
                      value={department}
                      onChange={(event) => setDepartment(event.target.value)}
                      placeholder="Department"
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Doctor Name *</label>

                    <select
                      value={doctorName}
                      onChange={(event) => setDoctorName(event.target.value)}
                      className={inputClass}
                      required
                    >
                      <option value="">Select doctor</option>

                      {doctors.map((doctor) => (
                        <option key={getId(doctor)} value={getName(doctor)}>
                          {getName(doctor)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Admission Date *</label>

                    <input
                      type="date"
                      max={today()}
                      value={admissionDate}
                      onChange={(event) => setAdmissionDate(event.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Discharge Date</label>

                    <input
                      type="date"
                      max={today()}
                      value={dischargeDate}
                      min={admissionDate}
                      onChange={(event) => setDischargeDate(event.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Bill Date (automatic)</label>

                    <input
                      type="date"
                      value={billDate}
                      disabled
                      aria-label="Bill creation date (generated automatically)"
                      className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-75`}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Room Type *</label>

                    <select
                      value={roomTypeId}
                      onChange={(event) => {
                        const selectedRoomTypeId = event.target.value;

                        setRoomTypeId(selectedRoomTypeId);

                        if (selectedRoomTypeId) {
                          autoPopulateIPServices(selectedRoomTypeId);
                        }
                      }}
                      className={inputClass}
                      required
                    >
                      <option value="">Select room type</option>

                      {roomTypes.map((room) => (
                        <option key={getId(room)} value={getId(room)}>
                          {getName(room)}
                        </option>
                      ))}
                    </select>

                    <p className={`mt-1 text-xs ${muted}`}>
                      Service prices are resolved using this room type.
                    </p>
                  </div>

                  <div>
                    <label className={labelClass}>Bed Number *</label>

                    <input
                      value={bedNumber}
                      onChange={(event) => setBedNumber(event.target.value)}
                      placeholder="e.g: 102"
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Rate Category</label>

                    <div className={readOnlyClass} aria-readonly="true">
                      General IPD
                    </div>
                  </div>
                </div>
              </section>

              {/* Services: one table, matching the Edit IP Bill layout */}

              <section className={`border-b pb-6 ${border}`}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className={`text-sm font-semibold ${text}`}>
                      Services & Charges
                    </h2>

                    <p className={`mt-1 text-xs ${muted}`}>
                      Select an IP service. Its service group and room-specific
                      rate are populated automatically.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addCategory}
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-[#3E439C] px-3 text-sm font-medium text-white hover:bg-[#323780]"
                  >
                    <Plus size={15} /> Add Service
                  </button>
                </div>

                <div
                  className={`w-full overflow-x-auto rounded-md border ${border}`}
                >
                  <table className="w-full min-w-[1450px] table-fixed text-sm">
                    <colgroup>
                      <col style={{ width: "150px" }} />

                      <col style={{ width: "190px" }} />

                      <col style={{ width: "330px" }} />

                      <col style={{ width: "85px" }} />

                      <col style={{ width: "110px" }} />

                      <col style={{ width: "120px" }} />

                      <col style={{ width: "115px" }} />

                      <col style={{ width: "105px" }} />

                      <col style={{ width: "120px" }} />

                      <col style={{ width: "48px" }} />
                    </colgroup>

                    <thead
                      className={
                        dark
                          ? "bg-slate-800/70 text-slate-300"
                          : "bg-slate-50 text-slate-600"
                      }
                    >
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-semibold">
                          Service Date *
                        </th>

                        <th className="px-3 py-3 text-left text-xs font-semibold">
                          Service Group
                        </th>

                        <th className="px-3 py-3 text-left text-xs font-semibold">
                          IP Service *
                        </th>

                        <th className="px-3 py-3 text-right text-xs font-semibold">
                          Quantity
                        </th>

                        <th className="px-3 py-3 text-right text-xs font-semibold">
                          Rate (₹)
                        </th>

                        <th className="px-3 py-3 text-right text-xs font-semibold">
                          Gross Amount
                        </th>

                        <th className="px-3 py-3 text-right text-xs font-semibold">
                          Discount (₹)
                        </th>

                        <th className="px-3 py-3 text-right text-xs font-semibold">
                          GST (₹)
                        </th>

                        <th className="px-3 py-3 text-right text-xs font-semibold">
                          Net Amount
                        </th>

                        <th className="px-2 py-3" />
                      </tr>
                    </thead>

                    <tbody>
                      {categories
                        .flatMap((category) =>
                          category.items.map((item) => ({ category, item })),
                        )
                        .map(({ category, item }, index) => {
                          const isAutomatedIPService =
                            restrictAutoServices &&
                            Boolean(item.isAutomaticallyPopulated) &&
                            AUTOMATED_IP_SERVICE_NAMES.has(
                              String(item.description || "")
                                .trim()
                                .toUpperCase(),
                            );

                          const quantity = Math.max(
                            0,
                            Number(item.quantity) || 0,
                          );

                          const rate = Math.max(0, Number(item.rate) || 0);

                          const gross = quantity * rate;

                          const discount = Math.min(
                            gross,
                            Math.max(0, Number(item.discount_amount) || 0),
                          );

                          const gstEligible = isGstEligible(category, item);

                          const gstAmount = gstEligible
                            ? Math.max(0, Number(item.gst_amount) || 0)
                            : 0;

                          const netWithGst =
                            Math.max(0, gross - discount) + gstAmount;

                          const group = serviceGroups.find(
                            (entry) =>
                              String(getId(entry)) ===
                              String(category.service_group_id),
                          );

                          return (
                            <tr key={item.id} className={`border-t ${border}`}>
                              <td className="px-3 py-2.5 align-middle">
                                <input
                                  type="date"
                                  max={today()}
                                  disabled={isAutomatedIPService}
                                  value={item.service_date || today()}
                                  onChange={(event) =>
                                    updateCharge(category.id, item.id, {
                                      service_date: event.target.value,
                                    })
                                  }
                                  className={`${inputClass} w-full disabled:cursor-not-allowed disabled:opacity-60`}
                                  aria-label={`Service date for item ${index + 1}`}
                                  required
                                />
                              </td>

                              <td
                                className={`px-3 py-2.5 align-middle ${text}`}
                              >
                                <div
                                  className="truncate"
                                  title={
                                    getName(group) ||
                                    "Auto-selected from service"
                                  }
                                >
                                  {getName(group) || (
                                    <span className={muted}>Auto-selected</span>
                                  )}
                                </div>
                              </td>

                              <td className="px-3 py-2.5 align-middle">
                                <div className="min-w-0 overflow-hidden">
                                  <SearchableDropdown
                                    value={
                                      services.find(
                                        (service) =>
                                          String(getId(service)) ===
                                          String(item.service_id),
                                      ) ?? null
                                    }
                                    onChange={(service) =>
                                      handleServiceSelection(
                                        category.id,
                                        item.id,
                                        service,
                                      )
                                    }
                                    fetchOptions={(search, options) =>
                                      fetchIPServices("", search, options)
                                    }
                                    getOptionLabel={getName}
                                    getOptionValue={getId}
                                    placeholder={
                                      !roomTypeId
                                        ? "Select room type first"
                                        : "Select IP service"
                                    }
                                    searchPlaceholder="Search IP services..."
                                    emptyMessage="No matching IP services found."
                                    loadingMessage="Searching services..."
                                    disabled={
                                      !roomTypeId ||
                                      item.priceLoading ||
                                      isAutomatedIPService
                                    }
                                    minSearchLength={0}
                                    className="w-full min-w-0"
                                  />
                                </div>

                                {item.priceLoading && (
                                  <p
                                    className={`mt-1 flex items-center gap-1 text-xs ${muted}`}
                                  >
                                    <RefreshCw
                                      size={12}
                                      className="animate-spin"
                                    />{" "}
                                    Fetching room-specific price...
                                  </p>
                                )}

                                {item.priceError && (
                                  <p className="mt-1 text-xs text-red-500">
                                    {item.priceError}
                                  </p>
                                )}
                              </td>

                              <td className="px-3 py-2.5 align-middle">
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={item.quantity}
                                  disabled={isAutomatedIPService}
                                  onChange={(event) =>
                                    updateCharge(category.id, item.id, {
                                      quantity: event.target.value,
                                    })
                                  }
                                  className={`${inputClass} text-right disabled:cursor-not-allowed disabled:opacity-60`}
                                  required
                                />
                              </td>

                              <td className="px-3 py-2.5 align-middle">
                                <input
                                  type="number"
                                  value={item.rate}
                                  readOnly
                                  aria-readonly="true"
                                  placeholder={
                                    item.priceLoading ? "Loading..." : "—"
                                  }
                                  className={`${readOnlyClass} text-right`}
                                  title="Rate is populated by the backend and cannot be edited."
                                />
                              </td>

                              <td
                                className={`px-3 py-2.5 text-right align-middle ${text}`}
                              >
                                {currency(gross)}
                              </td>

                              <td className="px-3 py-2.5 align-middle">
                                <input
                                  type="number"
                                  min="0"
                                  max={gross}
                                  step="0.01"
                                  value={item.discount_amount}
                                  onChange={(event) =>
                                    updateCharge(category.id, item.id, {
                                      discount_amount: event.target.value,
                                    })
                                  }
                                  className={`${inputClass} text-right`}
                                />
                              </td>

                              <td className="px-3 py-2.5 align-middle">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.gst_amount}
                                  disabled={!gstEligible}
                                  onChange={(event) =>
                                    updateCharge(category.id, item.id, {
                                      gst_amount: event.target.value,
                                    })
                                  }
                                  className={`${inputClass} text-right disabled:cursor-not-allowed disabled:opacity-50`}
                                  aria-label="GST amount"
                                />
                              </td>

                              <td
                                className={`px-3 py-2.5 text-right align-middle font-semibold ${text}`}
                              >
                                {currency(netWithGst)}
                              </td>

                              <td className="px-2 py-2.5 text-center align-middle">
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeCharge(category.id, item.id)
                                  }
                                  disabled={isAutomatedIPService}
                                  title={
                                    isAutomatedIPService
                                      ? "Automatically populated service cannot be removed"
                                      : "Remove service"
                                  }
                                  aria-label="Remove service"
                                  className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-red-950/30"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Notes and bill summary */}

              <section className="grid grid-cols-1 gap-7 lg:grid-cols-2">
                <div>
                  <div className="mb-4 flex items-center gap-2">
                    <FileText size={17} className="text-[#3E439C]" />

                    <h2 className={`text-sm font-semibold ${text}`}>
                      Billing Notes
                    </h2>
                  </div>

                  <label htmlFor="ip-bill-notes" className={labelClass}>
                    Notes (optional)
                  </label>

                  <textarea
                    id="ip-bill-notes"
                    rows={4}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Additional inpatient billing notes"
                    className={`w-full rounded-md border px-3 py-2.5 text-sm outline-none focus:border-[#3E439C] ${
                      dark
                        ? "border-slate-700 bg-[#171827] text-slate-100"
                        : "border-slate-200 bg-white text-slate-800"
                    }`}
                  />
                </div>

                <div
                  className={`rounded-lg border p-4 sm:p-5 ${border} ${panel}`}
                >
                  <h2 className={`mb-4 text-sm font-semibold ${text}`}>
                    Overall Bill Summary
                  </h2>

                  <div className="space-y-4">
                    <div className={`flex justify-between text-sm ${muted}`}>
                      <span>Service Groups</span>

                      <span className={text}>
                        {
                          new Set(
                            categories
                              .filter((category) =>
                                category.items.some((item) => item.service_id),
                              )
                              .map((category) =>
                                String(category.service_group_id),
                              )
                              .filter(Boolean),
                          ).size
                        }
                      </span>
                    </div>

                    <div className={`flex justify-between text-sm ${muted}`}>
                      <span>Total Services</span>

                      <span className={text}>
                        {categories.reduce(
                          (sum, category) =>
                            sum +
                            category.items.filter((item) => item.service_id)
                              .length,

                          0,
                        )}
                      </span>
                    </div>

                    <div className={`flex justify-between text-sm ${muted}`}>
                      <span>Subtotal</span>

                      <span className={text}>
                        {currency(billSummary.subtotal)}
                      </span>
                    </div>

                    <div className={`flex justify-between text-sm ${muted}`}>
                      <span>Total Discounts</span>

                      <span className="font-medium text-red-600 dark:text-red-400">
                        − {currency(billSummary.discount)}
                      </span>
                    </div>

                    <div className={`flex justify-between text-sm ${muted}`}>
                      <span>Total GST</span>

                      <span className={text}>{currency(billSummary.gst)}</span>
                    </div>

                    <div
                      className={`flex justify-between border-t pt-4 ${border}`}
                    >
                      <span className={`text-sm font-semibold ${text}`}>
                        Final Payable Amount
                      </span>

                      <span className="text-xl font-bold text-[#3E439C] dark:text-[#B9B7FF]">
                        {currency(billSummary.total)}
                      </span>
                    </div>

                    <p className={`text-xs ${muted}`}>
                      Rates are retrieved from backend pricing configuration for
                      the selected room type.
                    </p>
                  </div>
                </div>
              </section>

              {notice && (
                <div
                  role="alert"
                  className={`rounded-md border px-4 py-3 text-sm ${
                    noticeType === "success"
                      ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200"
                      : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
                  }`}
                >
                  {notice}
                </div>
              )}

              <div
                className={`flex flex-wrap items-center justify-between gap-3 border-t pt-5 ${border}`}
              >
                <p className={`text-xs ${muted}`}>
                  {savedBill
                    ? "Bill saved successfully."
                    : "Review the patient, room type, services, prices, and discounts before generating the bill."}
                </p>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => navigate("/ip-billing")}
                    className={`inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium ${border} ${text}`}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      isSubmitting || Boolean(savedBill) || mastersLoading
                    }
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-[#3E439C] px-4 text-sm font-semibold text-white hover:bg-[#323780] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <Loader
                        variant="button"
                        size="sm"
                        message="Saving bill..."
                      />
                    ) : (
                      <>
                        <CheckCircle2 size={16} />

                        {savedBill ? "Bill Saved" : "Generate IP Bill"}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {savedBill && (
                <section className={`rounded-lg border p-4 ${border}`}>
                  <h2 className={`text-sm font-semibold ${text}`}>
                    IP Bill Created
                  </h2>

                  <p className={`mt-2 text-sm ${muted}`}>
                    Bill Number:{" "}
                    <span className={`font-semibold ${text}`}>
                      {savedBill.bill_number || "Assigned by the server"}
                    </span>
                  </p>

                  <button
                    type="button"
                    onClick={() => navigate("/ip-billing")}
                    className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-[#3E439C] px-4 text-sm font-semibold text-white hover:bg-[#323780]"
                  >
                    <ArrowLeft size={15} />
                    Return to IP Bills
                  </button>
                </section>
              )}
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

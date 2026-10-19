import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  UserRound,
  ReceiptText,
} from "lucide-react";

import AppSidebar from "../Components/Layout/AppSidebar";
import TopNavbar from "../Components/Layout/TopNavbar";
import SearchableDropdown from "../Components/Common/SearchableDropdown";
import { useTheme } from "../Context/ThemeContext";

const API = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8001"
).replace(/\/+$/, "");

const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const dateOnly = (value) => (value ? String(value).slice(0, 10) : "—");

const normalizeGroup = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const groupName = (service) =>
  service?.service_group_name ||
  service?.group_name ||
  service?.service_group?.name ||
  "";

const serviceName = (service) =>
  service?.service_name || service?.name || service?.description || "Service";

const serviceId = (service) => service?.id ?? service?.service_id;

const getAmount = (item) => {
  const explicitAmount = item?.net_amount ?? item?.total_amount ?? item?.amount;

  if (explicitAmount !== undefined && explicitAmount !== null) {
    return Number(explicitAmount) || 0;
  }

  return (Number(item?.rate) || 0) * (Number(item?.quantity) || 1);
};

const getBillTotal = (bill) => {
  if (!bill) return 0;

  const value =
    bill.total_amount ??
    bill.bill_total ??
    bill.grand_total ??
    bill.total ??
    bill.net_amount;

  if (value !== undefined && value !== null) {
    return Number(value) || 0;
  }

  const itemsTotal = (bill.items || []).reduce(
    (sum, item) => sum + getAmount(item),
    0,
  );

  return Math.max(0, itemsTotal - (Number(bill.discount_amount) || 0));
};

/** Only these service groups may be added by nurses to IP bills. */
const ALLOWED_NURSE_SERVICE_GROUPS = [
  "CLINICAL SERVICES",
  "MEDICAL EQUIPMENTS",
  "PROCEDURE",
  "PSYCHIATRY CHARGES",
  "RADIOLOGY CHARGES",
  "PATHOLOGY CHARGES",
];

/** Build a query for active services available for inpatient billing. */
const buildServiceQuery = ({ search = "", page = 1, pageSize = 100 } = {}) => {
  const params = new URLSearchParams();
  params.set("bill_type", "IP");
  params.set("is_active", "true");
  params.set("page", String(page));
  params.set("page_size", String(pageSize));

  if (search.trim()) params.set("search", search.trim());

  // Keep the API query narrow where supported; frontend filtering below is authoritative
  // for what appears in this dropdown.
  ALLOWED_NURSE_SERVICE_GROUPS.forEach((group) => {
    params.append("service_group", group);
  });

  return `/api/services?${params.toString()}`;
};

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";

  const data = contentType.includes("json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    throw new Error(
      typeof data?.detail === "string"
        ? data.detail
        : Array.isArray(data?.detail)
          ? data.detail.map((item) => item.msg).join("; ")
          : `Request failed (${response.status})`,
    );
  }

  return data;
}

const extractServices = (data) => {
  if (Array.isArray(data)) return data;
  return data?.items || data?.results || [];
};

const newKey = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function NurseEditIPBill() {
  const { billId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const dark = theme === "dark";

  const [bill, setBill] = useState(null);
  const [staged, setStaged] = useState([]);

  const [selectedService, setSelectedService] = useState(null);
  const [quantity, setQuantity] = useState("1");
  const [serviceDate, setServiceDate] = useState(today());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const text = dark ? "text-slate-100" : "text-slate-800";
  const muted = dark ? "text-slate-400" : "text-slate-500";
  const border = dark ? "border-slate-700" : "border-slate-200";
  const panel = dark ? "bg-[#171827]" : "bg-white";

  const input = `h-10 w-full rounded-md border px-3 text-sm outline-none focus:border-[#3E439C] ${
    dark
      ? "border-slate-700 bg-[#171827] text-slate-100"
      : "border-slate-200 bg-white text-slate-800"
  }`;

  // Load bill details only. Service filtering is handled by service API requests.
  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const billData = await request(
          `/api/bills/${encodeURIComponent(billId)}`,
        );

        if (!active) return;

        if (String(billData.bill_type || "").toUpperCase() !== "IP") {
          throw new Error("Nurses can only access inpatient bills.");
        }

        setBill(billData);
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to load the IP bill.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [billId]);

  const existingItems = bill?.items || [];

  // Only show active IP services belonging to one of the six permitted groups.
  // This frontend filter works even if the services API ignores service_group parameters.
  const fetchServices = async (search = "") => {
    const data = await request(
      buildServiceQuery({ search, page: 1, pageSize: 100 }),
    );

    return extractServices(data).filter((service) =>
      ALLOWED_NURSE_SERVICE_GROUPS.includes(
        normalizeGroup(groupName(service)),
      ),
    );
  };

  const originalTotal = useMemo(() => getBillTotal(bill), [bill]);

  const stagedTotal = useMemo(
    () =>
      staged.reduce(
        (sum, item) =>
          sum + (Number(item.rate) || 0) * (Number(item.quantity) || 0),
        0,
      ),
    [staged],
  );

  const revisedTotal = originalTotal + stagedTotal;

  const handleServiceChange = (service) => {
    setSelectedService(service || null);
    setError("");
  };

  const addService = async () => {
    setError("");

    if (!selectedService) {
      setError("Please select a service.");
      return;
    }

    const qty = Number(quantity);

    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }

    if (!serviceDate || serviceDate > today()) {
      setError("Select a valid service date that is not in the future.");
      return;
    }

    const id = serviceId(selectedService);

    if (id === undefined || id === null || id === "") {
      setError("The selected service has no valid ID.");
      return;
    }

    let rate = Number(
      selectedService.rate ??
        selectedService.price ??
        selectedService.amount ??
        selectedService.unit_price ??
        selectedService.service_price ??
        0,
    );

    try {
      const params = new URLSearchParams({
        service_id: String(id),
        bill_type: "IP",
      });

      if (bill?.room_type_id) {
        params.set("room_type_id", String(bill.room_type_id));
      }

      const priceData = await request(
        `/api/billing/service-price?${params.toString()}`,
      );

      const resolvedRate = Number(
        priceData?.amount ??
          priceData?.price ??
          priceData?.rate ??
          priceData?.resolved_price,
      );

      if (Number.isFinite(resolvedRate) && resolvedRate >= 0) {
        rate = resolvedRate;
      }
    } catch (err) {
      // Preserve the existing catalogue-rate fallback.
      console.warn("Unable to resolve service price:", err.message);
    }

    setStaged((current) => [
      ...current,
      {
        key: newKey(),
        service_id: Number(id),
        service_name: serviceName(selectedService),
        group_name: groupName(selectedService),
        quantity: qty,
        service_date: serviceDate,
        rate,
      },
    ]);

    setSelectedService(null);
    setQuantity("1");
    setServiceDate(today());
  };

  const removeStagedService = (key) => {
    setStaged((current) => current.filter((item) => item.key !== key));
  };

  const save = async () => {
    setError("");

    if (!staged.length) {
      setError("Add at least one new service before saving.");
      return;
    }

    if (saving) return;

    setSaving(true);

    try {
      // Only new services are submitted. Existing bill items are not updated or deleted.
      for (const item of staged) {
        await request(
          `/api/bills/${encodeURIComponent(billId)}/nurse-services`,
          {
            method: "POST",
            body: JSON.stringify({
              service_id: item.service_id,
              quantity: item.quantity,
              service_date: item.service_date,
            }),
          },
        );
      }

      navigate(`/nurse/${encodeURIComponent(billId)}`, {
        replace: true,
        state: { nurseUpdateSuccess: true },
      });
    } catch (err) {
      setError(
        `${err.message || "Unable to save the new services."} If some services were saved before the error, reopen the bill and check its latest contents.`,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`min-h-screen ${dark ? "bg-[#11121F]" : "bg-[#F6F6FC]"}`}>
      <AppSidebar />

      <div className="min-h-screen min-w-0 lg:ml-[260px]">
        <TopNavbar
          title="Nurse"
          breadcrumb={[
            "Hospital Management",
            "Billing",
            "Nurse",
            "Edit IP Bill",
          ]}
        />

        <main className="min-w-0 space-y-5 px-4 py-5 sm:px-5 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={`text-xs ${muted}`}>
                Hospital Management / Billing / Nurse / Edit
              </p>

              <h1 className={`mt-1 text-xl font-semibold ${text}`}>
                Edit IP Bill {bill?.bill_number || ""}
              </h1>

              <p className={`mt-1 text-sm ${muted}`}>
                Existing bill details are read-only. You can add permitted
                services and remove only services added in this session.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate(`/nurse/${encodeURIComponent(billId)}`)}
              className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm ${border} ${text}`}
            >
              <ArrowLeft size={16} />
              Back to Bill
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {loading ? (
            <section
              className={`rounded-lg border p-6 ${border} ${panel} ${muted}`}
            >
              Loading IP bill details…
            </section>
          ) : bill ? (
            <>
              <section
                className={`rounded-lg border p-4 sm:p-5 ${border} ${panel}`}
              >
                <h2
                  className={`mb-4 flex items-center gap-2 text-sm font-semibold ${text}`}
                >
                  <UserRound size={17} className="text-[#3E439C]" />
                  Patient & Admission Details
                </h2>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {[
                    ["Bill Number", bill.bill_number || bill.id],
                    ["Patient Name", bill.patient_name || bill.patient?.name],
                    [
                      "Patient ID / UHID",
                      bill.patient_id || bill.uhid || bill.patient?.patient_id,
                    ],
                    [
                      "Mobile Number",
                      bill.patient_mobile || bill.mobile_number || bill.mobile,
                    ],
                    ["Bill Date", dateOnly(bill.bill_date)],
                    ["Admission Date", dateOnly(bill.admission_date)],
                    ["Discharge Date", dateOnly(bill.discharge_date)],
                    ["Doctor", bill.doctor_name],
                    ["Room Type", bill.room_type_name || bill.room_type],
                    ["Bed Number", bill.bed_number],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className={`mb-1 text-xs ${muted}`}>{label}</p>
                      <p className={`text-sm font-medium ${text}`}>
                        {value || "—"}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section
                className={`rounded-lg border p-4 sm:p-5 ${border} ${panel}`}
              >
                <h2
                  className={`mb-4 flex items-center gap-2 text-sm font-semibold ${text}`}
                >
                  <ReceiptText size={17} className="text-[#3E439C]" />
                  Bill Amount Summary
                </h2>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className={`rounded-lg border p-4 ${border}`}>
                    <p className={`text-sm ${muted}`}>Current Bill Total</p>
                    <p className={`mt-2 text-xl font-semibold ${text}`}>
                      {money(originalTotal)}
                    </p>
                    <p className={`mt-1 text-xs ${muted}`}>
                      Existing bill amount
                    </p>
                  </div>

                  <div className={`rounded-lg border p-4 ${border}`}>
                    <p className={`text-sm ${muted}`}>New Services Total</p>
                    <p className={`mt-2 text-xl font-semibold ${text}`}>
                      {money(stagedTotal)}
                    </p>
                    <p className={`mt-1 text-xs ${muted}`}>
                      Services staged in this edit session
                    </p>
                  </div>

                  <div className="rounded-lg border border-[#3E439C]/30 bg-[#F1F0FF] p-4 dark:bg-[#292B49]">
                    <p className="text-sm text-[#3E439C] dark:text-[#D6D4FF]">
                      Revised Bill Total
                    </p>
                    <p className="mt-2 text-xl font-semibold text-[#3E439C] dark:text-white">
                      {money(revisedTotal)}
                    </p>
                    <p className="mt-1 text-xs text-[#3E439C]/80 dark:text-slate-300">
                      Current total + new services
                    </p>
                  </div>
                </div>

                <p className={`mt-3 text-xs ${muted}`}>
                  This is an estimate for the staged services. The final bill
                  amount is calculated by the billing server after saving.
                </p>
              </section>

              <section
                className={`overflow-hidden rounded-lg border ${border} ${panel}`}
              >
                <div className={`border-b px-4 py-3 ${border}`}>
                  <h2 className={`text-sm font-semibold ${text}`}>
                    Existing Services <span className={muted}>(read-only)</span>
                  </h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] text-left text-sm">
                    <thead
                      className={
                        dark
                          ? "bg-slate-800 text-slate-300"
                          : "bg-slate-50 text-slate-600"
                      }
                    >
                      <tr>
                        {[
                          "Service",
                          "Service Group",
                          "Service Date",
                          "Qty",
                          "Rate",
                          "Amount",
                        ].map((heading) => (
                          <th
                            key={heading}
                            className="px-4 py-3 text-xs font-semibold"
                          >
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {existingItems.length ? (
                        existingItems.map((item, index) => (
                          <tr
                            key={item.id ?? `${item.service_id}-${index}`}
                            className={`border-t ${border}`}
                          >
                            <td className={`px-4 py-3 ${text}`}>
                              {item.service_name ||
                                item.name ||
                                item.description ||
                                "Service"}
                            </td>
                            <td className={`px-4 py-3 ${muted}`}>
                              {item.service_group_name ||
                                item.group_name ||
                                "—"}
                            </td>
                            <td className={`px-4 py-3 ${muted}`}>
                              {dateOnly(item.service_date)}
                            </td>
                            <td className={`px-4 py-3 ${text}`}>
                              {item.quantity ?? 1}
                            </td>
                            <td className={`px-4 py-3 ${text}`}>
                              {money(item.rate)}
                            </td>
                            <td className={`px-4 py-3 ${text}`}>
                              {money(getAmount(item))}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={6}
                            className={`px-4 py-8 text-center ${muted}`}
                          >
                            No existing services found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section
                className={`rounded-lg border p-4 sm:p-5 ${border} ${panel}`}
              >
                <h2 className={`text-sm font-semibold ${text}`}>
                  Add New Services
                </h2>

                <p className={`mb-4 mt-1 text-xs ${muted}`}>
                  Search services from the six permitted IP service groups. Existing
                  services cannot be changed here.
                </p>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="md:col-span-2">
                    <label className={`mb-1 block text-sm font-medium ${text}`}>
                      Service *
                    </label>

                    <SearchableDropdown
                      value={selectedService}
                      onChange={handleServiceChange}
                      fetchOptions={async (search) => {
                        try {
                          return await fetchServices(String(search || ""));
                        } catch (err) {
                          setError(err.message || "Unable to load services.");
                          return [];
                        }
                      }}
                      getOptionLabel={(service) => serviceName(service)}
                      getOptionValue={(service) => serviceId(service)}
                      placeholder="Search permitted IP services"
                      searchPlaceholder="Search services..."
                      emptyMessage="No services found"
                      loadingMessage="Loading services..."
                      disabled={saving}
                      minSearchLength={0}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className={`mb-1 block text-sm font-medium ${text}`}>
                      Service Group
                    </label>

                    <div
                      className={`${input} flex items-center ${
                        selectedService ? text : muted
                      }`}
                    >
                      {selectedService
                        ? groupName(selectedService) || "—"
                        : "Selected Service Group"}
                    </div>
                  </div>

                  <div>
                    <label className={`mb-1 block text-sm font-medium ${text}`}>
                      Quantity *
                    </label>

                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      className={input}
                    />
                  </div>

                  <div>
                    <label className={`mb-1 block text-sm font-medium ${text}`}>
                      Service Date *
                    </label>

                    <input
                      type="date"
                      max={today()}
                      value={serviceDate}
                      onChange={(event) => setServiceDate(event.target.value)}
                      className={input}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addService}
                  disabled={!selectedService || saving}
                  className="mt-4 inline-flex h-10 items-center gap-2 rounded-md border border-[#3E439C] px-4 text-sm font-semibold text-[#3E439C] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus size={16} />
                  Add Service
                </button>

                {staged.length > 0 && (
                  <div
                    className={`mt-5 overflow-x-auto rounded-md border ${border}`}
                  >
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead
                        className={
                          dark
                            ? "bg-slate-800 text-slate-300"
                            : "bg-slate-50 text-slate-600"
                        }
                      >
                        <tr>
                          {[
                            "New Service",
                            "Service Group",
                            "Date",
                            "Qty",
                            "Estimated Amount",
                            "Action",
                          ].map((heading) => (
                            <th
                              key={heading}
                              className="px-3 py-3 text-xs font-semibold"
                            >
                              {heading}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {staged.map((item) => (
                          <tr key={item.key} className={`border-t ${border}`}>
                            <td className={`px-3 py-3 ${text}`}>
                              {item.service_name}
                            </td>
                            <td className={`px-3 py-3 ${muted}`}>
                              {normalizeGroup(item.group_name)}
                            </td>
                            <td className={`px-3 py-3 ${muted}`}>
                              {item.service_date}
                            </td>
                            <td className={`px-3 py-3 ${text}`}>
                              {item.quantity}
                            </td>
                            <td className={`px-3 py-3 ${text}`}>
                              {money(item.rate * item.quantity)}
                            </td>
                            <td className="px-3 py-3">
                              <button
                                type="button"
                                onClick={() => removeStagedService(item.key)}
                                disabled={saving}
                                className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs text-red-600 disabled:opacity-50"
                              >
                                <Trash2 size={14} />
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div
                  className={`mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4 ${border}`}
                >
                  <p className={`max-w-2xl text-xs ${muted}`}>
                    Only the new services listed above will be submitted.
                    Existing services, patient details, admission details,
                    discounts, payments, and refunds are not editable here.
                  </p>

                  <button
                    type="button"
                    onClick={save}
                    disabled={saving || staged.length === 0}
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-[#3E439C] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <RefreshCw size={15} className="animate-spin" />
                    ) : (
                      <Save size={15} />
                    )}

                    {saving
                      ? "Saving Services..."
                      : `Save ${staged.length} New Service${
                          staged.length === 1 ? "" : "s"
                        }`}
                  </button>
                </div>
              </section>
            </>
          ) : (
            <section
              className={`rounded-lg border p-6 ${border} ${panel} ${muted}`}
            >
              Unable to load the IP bill.
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  UserRound,
  CalendarDays,
} from "lucide-react";

import AppSidebar from "../Components/Layout/AppSidebar";

import TopNavbar from "../Components/Layout/TopNavbar";

import { useTheme } from "../Context/ThemeContext";

import { useToast } from "../Components/Common/useToast";
import SearchableDropdown from "../Components/Common/SearchableDropdown";

const API = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8001"
).replace(/\/$/, "");

const today = () => {
  const d = new Date();

  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)

    .toISOString()

    .slice(0, 10);
};

const dateOnly = (v) => (v ? String(v).slice(0, 10) : "");

// Remove a field key from this array whenever it should become editable.
const DISABLED_OP_EDIT_FIELDS = [
  "patient_search",
  "patient_id",
  "mobile_number",
  "patient_name",
  "bill_date",
  "doctor_name",
  "psychologist_name",
  "rate_category",
];

const money = (v) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    Number(v) || 0,
  );

const makeKey = () => `${Date.now()}-${Math.random()}`;

const api = async (url, options = {}) => {
  const res = await fetch(`${API}${url}`, {
    credentials: "include",

    ...options,

    headers: {
      Accept: "application/json",

      ...(options.body ? { "Content-Type": "application/json" } : {}),

      ...(options.headers || {}),
    },
  });

  const type = res.headers.get("content-type") || "";

  const data = type.includes("json")
    ? await res.json().catch(() => null)
    : await res.text().catch(() => "");

  if (!res.ok)
    throw new Error(
      typeof data?.detail === "string"
        ? data.detail
        : Array.isArray(data?.detail)
          ? data.detail.map((x) => x.msg).join("; ")
          : `Request failed (${res.status})`,
    );

  return data;
};

function BillEditScreen({ expectedType }) {
  const { billId } = useParams();

  const navigate = useNavigate();

  const { theme } = useTheme();

  const { showToast } = useToast();

  const dark = theme === "dark";

  const [bill, setBill] = useState(null);

  const [services, setServices] = useState([]);

  const [items, setItems] = useState([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const text = dark ? "text-slate-100" : "text-slate-800";

  const muted = dark ? "text-slate-400" : "text-slate-500";

  const border = dark ? "border-slate-700" : "border-slate-200";

  const panel = dark ? "bg-[#171827]" : "bg-white";

  const input = `h-10 w-full rounded-md border px-3 text-sm outline-none focus:border-[#3E439C] ${dark ? "border-slate-700 bg-[#171827] text-slate-100" : "border-slate-200 bg-white text-slate-800"}`;

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);

        const b = await api(`/api/bills/${billId}`);
        // Prevent editing OP/IP bills if any payment exists.
        const hasPayments =
          b.has_payments === true ||
          (Array.isArray(b.payments) && b.payments.length > 0);

        if (hasPayments) {
          showToast({
            type: "error",
            title: "Bill cannot be edited",
            message: "A payment has already been recorded for this bill.",
          });

          navigate(
            String(b.bill_type || "").toUpperCase() === "IP"
              ? `/ip-billing/${billId}`
              : `/op-billing/${billId}`,
            { replace: true },
          );

          return;
        }

        const list = await api(
          `/api/services?bill_type=${b.bill_type}&is_active=true&page=1&page_size=100`,
        );

        if (!active) return;

        if (String(b.bill_type || "").toUpperCase() !== expectedType) {
          throw new Error(
            `This is not an ${expectedType} bill. Please open the ${expectedType} bill edit screen.`,
          );
        }
        setBill(b);

        setServices(
          Array.isArray(list) ? list : list.items || list.results || [],
        );

        setItems(
          (b.items || []).map((x) => ({
            key: makeKey(),

            service_id: String(x.service_id),

            service_name: x.service_name || x.name || "",

            service_date: dateOnly(x.service_date),

            quantity: String(x.quantity ?? 1),

            discount_amount: String(x.discount_amount ?? 0),

            gst_amount: String(x.gst_amount ?? 0),

            rate: Number(x.rate) || 0,

            group_name: x.service_group_name || "",
          })),
        );
      } catch (e) {
        if (active) setError(e.message || "Unable to load bill.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [billId, expectedType]);

  const subtotal = useMemo(
    () =>
      items.reduce(
        (s, i) => s + (Number(i.rate) || 0) * (Number(i.quantity) || 0),

        0,
      ),

    [items],
  );

  const discounts = useMemo(
    () => items.reduce((s, i) => s + (Number(i.discount_amount) || 0), 0),

    [items],
  );

  const gst = useMemo(
    () => items.reduce((s, i) => s + (Number(i.gst_amount) || 0), 0),

    [items],
  );

  const total = Math.max(
    0,

    subtotal - discounts + gst - Number(bill?.discount_amount || 0),
  );

  const updateItem = (key, patch) =>
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, ...patch } : i)),
    );

  const addItem = () =>
    setItems((prev) => [
      ...prev,

      {
        key: makeKey(),

        service_id: "",

        service_name: "",

        service_date: "",

        quantity: "1",

        discount_amount: "0",

        gst_amount: "0",

        rate: 0,

        group_name: "",
      },
    ]);

  const selectService = async (key, id) => {
    const service = services.find(
      (s) => String(s.id ?? s.service_id) === String(id),
    );

    if (!service) {
      updateItem(key, {
        service_id: "",

        service_name: "",

        rate: 0,

        group_name: "",
      });

      return;
    }

    updateItem(key, {
      service_id: String(id),

      service_name: service.name || service.service_name,

      group_name: service.service_group_name || service.group_name || "",

      priceLoading: true,
    });

    try {
      const params = new URLSearchParams({
        service_id: String(id),

        bill_type: bill.bill_type,
      });

      if (bill.bill_type === "IP" && bill.room_type_id)
        params.set("room_type_id", bill.room_type_id);

      if (bill.bill_type === "OP" && bill.doctor_id)
        params.set("doctor_id", bill.doctor_id);

      const price = await api(`/api/billing/service-price?${params}`);

      updateItem(key, {
        rate: Number(
          price.amount ?? price.price ?? price.rate ?? price.resolved_price,
        ),

        priceLoading: false,
      });
    } catch (e) {
      updateItem(key, { priceLoading: false });

      showToast({
        type: "error",

        title: "Unable to resolve price",

        message: e.message,
      });
    }
  };

  const save = async (e) => {
    e.preventDefault();

    if (!bill || saving) return;

    if (
      !items.length ||
      items.some(
        (i) =>
          !i.service_id ||
          !i.service_date ||
          Number(i.quantity) <= 0 ||
          Number(i.discount_amount) < 0,
      )
    ) {
      showToast({
        type: "error",

        title: "Check service items",

        message:
          "Each item needs a service, service date, valid quantity and discount.",
      });

      return;
    }

    setSaving(true);

    try {
      const payload = {
        bill_type: bill.bill_type,

        patient_id: bill.patient_id,

        bill_date: bill.bill_date,

        department: bill.department || null,

        doctor_id: bill.doctor_id || null,

        doctor_name: bill.doctor_name || null,

        psychologist_id: bill.psychologist_id || null,

        psychologist_name: bill.psychologist_name || null,

        room_type_id: bill.bill_type === "IP" ? bill.room_type_id : null,

        discount_amount: Number(bill.discount_amount || 0),

        notes: bill.notes || null,

        admission_date: bill.admission_date || null,

        discharge_date: bill.discharge_date || null,

        bed_number: bill.bed_number || null,

        rate_category: bill.rate_category || null,

        items: items.map((i) => ({
          service_id: Number(i.service_id),

          service_date: i.service_date,

          quantity: Number(i.quantity),

          discount_amount: Number(i.discount_amount || 0),

          gst_amount: Number(i.gst_amount || 0),
        })),
      };

      await api(`/api/bills/${billId}`, {
        method: "PUT",

        body: JSON.stringify(payload),
      });

      showToast({
        type: "success",

        title: "Bill updated",

        message: "The existing bill and its service items have been updated.",
      });

      navigate(
        bill.bill_type === "IP"
          ? `/ip-billing/${billId}`
          : `/op-billing/${billId}`,
      );
    } catch (e) {
      showToast({
        type: "error",

        title: "Unable to update bill",

        message: e.message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`min-h-screen ${dark ? "bg-[#10111c]" : "bg-[#F6F6FC]"}`}>
      <AppSidebar />

      <div className="min-h-screen min-w-0 lg:ml-[260px]">
        <TopNavbar />

        <main className="min-w-0 w-full px-4 py-5 sm:px-5 lg:px-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={`text-xs ${muted}`}>
                Hospital Management / Billing / {expectedType} Bills / Edit
              </p>

              <h1 className={`mt-1 text-xl font-semibold ${text}`}>
                Edit {expectedType} Bill {bill?.bill_number || ""}
              </h1>

              <p className={`mt-1 text-sm ${muted}`}>
                Add or remove services and set a date for each service item.
              </p>
            </div>

            <button
              onClick={() => navigate(-1)}
              className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm ${border} ${text}`}
            >
              <ArrowLeft size={16} /> Back
            </button>
          </div>

          {loading ? (
            <div
              className={`rounded-lg border p-6 ${border} ${panel} ${muted}`}
            >
              Loading bill details…
            </div>
          ) : error ? (
            <div
              className={`rounded-lg border border-red-200 p-5 text-sm text-red-600 ${panel}`}
            >
              {error}
            </div>
          ) : (
            bill && (
              <form onSubmit={save} className="space-y-5">
                {/* Patient & Provider Details — editability controlled by DISABLED_OP_EDIT_FIELDS */}
                <section className={`border-b pb-6 ${border}`}>
                  <div className="mb-4 flex items-center gap-2">
                    <UserRound size={17} className="text-[#3E439C]" />
                    <h2 className={`text-sm font-semibold ${text}`}>
                      Patient & Provider Details
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div>
                      <label
                        className={`mb-2 block text-sm font-medium ${text}`}
                      >
                        Search Patient *
                      </label>
                      <input
                        type="text"
                        value={bill.patient_name || ""}
                        placeholder="Name, patient ID or mobile"
                        disabled={DISABLED_OP_EDIT_FIELDS.includes(
                          "patient_search",
                        )}
                        className={`${input} disabled:cursor-not-allowed disabled:opacity-75`}
                      />
                    </div>
                    <div>
                      <label
                        className={`mb-2 block text-sm font-medium ${text}`}
                      >
                        Patient ID / UHID
                      </label>
                      <input
                        type="text"
                        value={bill.patient_id || bill.uhid || ""}
                        placeholder="Select a patient"
                        disabled={DISABLED_OP_EDIT_FIELDS.includes(
                          "patient_id",
                        )}
                        className={`${input} disabled:cursor-not-allowed disabled:opacity-75`}
                      />
                    </div>
                    <div>
                      <label
                        className={`mb-2 block text-sm font-medium ${text}`}
                      >
                        Mobile Number
                      </label>
                      <input
                        type="text"
                        value={
                          bill.patient_mobile ||
                          bill.mobile_number ||
                          bill.mobile ||
                          ""
                        }
                        placeholder="—"
                        disabled={DISABLED_OP_EDIT_FIELDS.includes(
                          "mobile_number",
                        )}
                        className={`${input} disabled:cursor-not-allowed disabled:opacity-75`}
                      />
                    </div>
                    <div>
                      <label
                        className={`mb-2 block text-sm font-medium ${text}`}
                      >
                        Patient Name
                      </label>
                      <input
                        type="text"
                        value={bill.patient_name || ""}
                        placeholder="—"
                        disabled={DISABLED_OP_EDIT_FIELDS.includes(
                          "patient_name",
                        )}
                        className={`${input} disabled:cursor-not-allowed disabled:opacity-75`}
                      />
                    </div>
                    <div>
                      <label
                        className={`mb-2 block text-sm font-medium ${text}`}
                      >
                        Bill Date *
                      </label>
                      <div className="relative">
                        <CalendarDays
                          size={16}
                          className={`absolute left-3 top-1/2 -translate-y-1/2 ${muted}`}
                        />
                        <input
                          type="date"
                          value={dateOnly(bill.bill_date)}
                          disabled={DISABLED_OP_EDIT_FIELDS.includes(
                            "bill_date",
                          )}
                          className={`${input} pl-9 disabled:cursor-not-allowed disabled:opacity-75`}
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        className={`mb-2 block text-sm font-medium ${text}`}
                      >
                        Doctor Name *
                      </label>
                      <input
                        type="text"
                        value={bill.doctor_name || ""}
                        placeholder="Select doctor"
                        disabled={DISABLED_OP_EDIT_FIELDS.includes(
                          "doctor_name",
                        )}
                        className={`${input} disabled:cursor-not-allowed disabled:opacity-75`}
                      />
                    </div>
                    <div>
                      <label
                        className={`mb-2 block text-sm font-medium ${text}`}
                      >
                        Psychologist Name
                      </label>
                      <input
                        type="text"
                        value={bill.psychologist_name || ""}
                        placeholder="Enter psychologist's name"
                        disabled={DISABLED_OP_EDIT_FIELDS.includes(
                          "psychologist_name",
                        )}
                        className={`${input} disabled:cursor-not-allowed disabled:opacity-75`}
                      />
                    </div>
                    <div>
                      <label
                        className={`mb-2 block text-sm font-medium ${text}`}
                      >
                        Rate Category
                      </label>
                      <input
                        type="text"
                        value={bill.rate_category || "General OPD"}
                        disabled={DISABLED_OP_EDIT_FIELDS.includes(
                          "rate_category",
                        )}
                        className={`${input} disabled:cursor-not-allowed disabled:opacity-75`}
                      />
                    </div>
                  </div>
                </section>

                {/* Services & Charges */}
                <section>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className={`text-sm font-semibold ${text}`}>
                        Services & Charges
                      </h2>
                      <p className={`mt-1 text-xs ${muted}`}>
                        Select a service. The applicable rate is loaded
                        automatically.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addItem}
                      className="inline-flex h-9 items-center gap-2 rounded-md bg-[#3E439C] px-3 text-sm font-medium text-white hover:bg-[#323780]"
                    >
                      <Plus size={15} /> Add Service
                    </button>
                  </div>

                  <div
                    className={`w-full overflow-x-auto rounded-md border ${border}`}
                  >
                    <table className="w-full min-w-[1200px] table-fixed text-sm">
                      <colgroup>
                        <col style={{ width: "185px" }} />
                        <col style={{ width: "370px" }} />
                        <col style={{ width: "90px" }} />
                        <col style={{ width: "110px" }} />
                        <col style={{ width: "130px" }} />
                        <col style={{ width: "120px" }} />
                        <col style={{ width: "130px" }} />
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
                            Service Date
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-semibold">
                            OP Service
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
                            Net Amount
                          </th>
                          <th className="px-2 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => {
                          const quantity = Math.max(
                            0,
                            Number(item.quantity) || 0,
                          );
                          const rate = Math.max(0, Number(item.rate) || 0);
                          const gross = quantity * rate;
                          const discount = Math.max(
                            0,
                            Number(item.discount_amount) || 0,
                          );
                          const net = Math.max(
                            0,
                            gross - discount + (Number(item.gst_amount) || 0),
                          );
                          return (
                            <tr key={item.key} className={`border-t ${border}`}>
                              <td className="px-3 py-2.5 align-middle">
                                <input
                                  type="date"
                                  className={input}
                                  value={item.service_date || ""}
                                  onChange={(e) =>
                                    updateItem(item.key, {
                                      service_date: e.target.value,
                                    })
                                  }
                                  aria-label={`Service date for item ${index + 1}`}
                                  required
                                />
                              </td>
                              <td className="px-3 py-2.5 align-middle">
                                <div className="min-w-0 overflow-hidden">
                                  <SearchableDropdown
                                    value={
                                      services.find(
                                        (s) =>
                                          String(s.id ?? s.service_id) ===
                                          String(item.service_id),
                                      ) ??
                                      (item.service_id
                                        ? {
                                            id: item.service_id,
                                            name: item.service_name,
                                          }
                                        : null)
                                    }
                                    onChange={(service) =>
                                      selectService(
                                        item.key,
                                        service
                                          ? String(
                                              service.id ?? service.service_id,
                                            )
                                          : "",
                                      )
                                    }
                                    fetchOptions={async (search) =>
                                      services.filter((s) =>
                                        String(s.name ?? s.service_name ?? "")
                                          .toLowerCase()
                                          .includes(
                                            String(search ?? "").toLowerCase(),
                                          ),
                                      )
                                    }
                                    getOptionLabel={(s) =>
                                      s.name || s.service_name || ""
                                    }
                                    getOptionValue={(s) => s.id ?? s.service_id}
                                    placeholder="Select OP service"
                                    searchPlaceholder="Search OP services..."
                                    emptyMessage="No matching OP services found."
                                    loadingMessage="Loading services..."
                                    minSearchLength={0}
                                    className="w-full min-w-0"
                                  />
                                </div>
                                {item.priceLoading && (
                                  <p className={`mt-1 text-xs ${muted}`}>
                                    Loading applicable price…
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
                                  min="0.01"
                                  step="0.01"
                                  className={`${input} text-right`}
                                  value={item.quantity}
                                  onChange={(e) =>
                                    updateItem(item.key, {
                                      quantity: e.target.value,
                                    })
                                  }
                                  aria-label={`Quantity for item ${index + 1}`}
                                  required
                                />
                              </td>
                              <td className="px-3 py-2.5 align-middle">
                                <div
                                  className={`flex h-10 w-full min-w-0 items-center justify-end overflow-hidden rounded-md border px-2 text-sm ${border} ${muted} ${dark ? "bg-slate-800/70" : "bg-slate-50"}`}
                                >
                                  <span className="truncate">
                                    {item.priceLoading
                                      ? "Loading…"
                                      : money(rate)}
                                  </span>
                                </div>
                              </td>
                              <td
                                className={`px-3 py-2.5 text-right align-middle ${muted}`}
                              >
                                <span className="whitespace-nowrap">
                                  {money(gross)}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 align-middle">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className={`${input} text-right`}
                                  value={item.discount_amount}
                                  onChange={(e) =>
                                    updateItem(item.key, {
                                      discount_amount: e.target.value,
                                    })
                                  }
                                  aria-label={`Discount for item ${index + 1}`}
                                />
                              </td>
                              <td
                                className={`px-3 py-2.5 text-right align-middle font-semibold ${text}`}
                              >
                                <span className="whitespace-nowrap">
                                  {money(net)}
                                </span>
                              </td>
                              <td className="px-2 py-2.5 text-center align-middle">
                                <button
                                  type="button"
                                  title={`Remove service ${index + 1}`}
                                  onClick={() =>
                                    setItems((prev) =>
                                      prev.filter((i) => i.key !== item.key),
                                    )
                                  }
                                  disabled={items.length === 1}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 dark:hover:bg-red-950/30"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className={`rounded-lg border p-4 ${border} ${panel}`}>
                  <div
                    className={`ml-auto max-w-xl space-y-2 rounded-md p-3 ${dark ? "bg-slate-900/50" : "bg-[#F6F6FC]"}`}
                  >
                    <h2 className={`font-semibold ${text}`}>Bill Summary</h2>

                    <div className="flex justify-between text-sm">
                      <span className={muted}>Services subtotal</span>

                      <span className={text}>{money(subtotal)}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className={muted}>Service discounts</span>

                      <span className={text}>− {money(discounts)}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className={muted}>Bill discount</span>

                      <span className={text}>
                        − {money(bill.discount_amount)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className={muted}>GST</span>

                      <span className={text}>{money(gst)}</span>
                    </div>

                    <div
                      className={`flex justify-between border-t pt-3 font-semibold ${border}`}
                    >
                      <span className={text}>Revised bill total</span>

                      <span className={text}>{money(total)}</span>
                    </div>

                    <p className={`text-xs ${muted}`}>
                      Existing payment and refund records are not changed by
                      this edit. The outstanding balance is recalculated from
                      the revised total.
                    </p>
                  </div>
                </section>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className={`h-10 rounded-md border px-4 text-sm ${border} ${text}`}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving || items.length === 0}
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-[#3E439C] px-4 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {saving ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}{" "}
                    {saving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </form>
            )
          )}
        </main>
      </div>
    </div>
  );
}

export default function EditOPBill() {
  return <BillEditScreen expectedType="OP" />;
}

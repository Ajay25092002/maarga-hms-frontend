import { useCallback, useEffect, useState } from "react";
import AppSidebar from "../Components/Layout/AppSidebar";
import TopNavbar from "../Components/Layout/TopNavbar";
import { useTheme } from "../Context/ThemeContext";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8001"
).replace(/\/+$/, "");

const PRIMARY = "#3E439C";
const STATUS_COLORS = ["#16A34A", "#F59E0B", "#DC2626"];

const EMPTY_DATA = {
  summary: {
    patients_registered_today: 0,
    op_bills_today: 0,
    ip_bills_today: 0,
    collection_today: 0,
    outstanding_amount: 0,
  },
  charts: {
    collection_trend: [],
    billing_trend: [],
    payment_status: {
      paid: 0,
      partially_paid: 0,
      unpaid: 0,
    },
  },
  recent_bills: [],
  generated_at: null,
};

const currency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const compactCurrency = (value) => {
  const amount = Number(value) || 0;

  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;

  return `₹${amount}`;
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const shortDate = (value) => {
  if (!value) return "";

  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
};

function MetricCard({ title, value, subtitle, icon, accent, dark }) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md ${
        dark ? "border-slate-700 bg-[#191A2A]" : "border-[#E9E9F4] bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`text-sm font-medium ${dark ? "text-slate-400" : "text-gray-500"}`}
          >
            {title}
          </p>

          <p
            className={`mt-2 break-words text-xl font-semibold tracking-tight sm:text-2xl ${
              dark ? "text-slate-100" : "text-[#20213A]"
            }`}
          >
            {value}
          </p>


        </div>

        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg"
          style={{
            backgroundColor: dark ? `${accent}28` : `${accent}15`,
            color: dark && accent === PRIMARY ? "#B9B7FF" : accent,
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children, className = "", dark }) {
  return (
    <section
      className={`min-w-0 rounded-xl border p-4 shadow-sm ${
        dark ? "border-slate-700 bg-[#191A2A]" : "border-[#E9E9F4] bg-white"
      } ${className}`}
    >
      <div className="mb-4">
        <h2
          className={`text-sm font-semibold ${dark ? "text-slate-100" : "text-[#20213A]"}`}
        >
          {title}
        </h2>

        {subtitle && (
          <p
            className={`mt-1 text-xs ${dark ? "text-slate-400" : "text-gray-500"}`}
          >
            {subtitle}
          </p>
        )}
      </div>

      {children}
    </section>
  );
}

function ChartTooltip({ active, payload, label, money = false, dark }) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className={`rounded-xl border px-4 py-3 shadow-lg ${
        dark
          ? "border-slate-600 bg-[#202235] text-slate-100"
          : "border-gray-200 bg-white text-gray-900"
      }`}
    >
      <p
        className={`mb-2 text-xs font-medium ${dark ? "text-slate-400" : "text-gray-500"}`}
      >
        {label}
      </p>

      {payload.map((item) => (
        <div
          key={item.dataKey}
          className="mb-1 flex items-center gap-2 text-sm"
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className={dark ? "text-slate-300" : "text-gray-600"}>
            {item.name}:
          </span>
          <span className="font-semibold">
            {money
              ? currency(item.value)
              : Number(item.value).toLocaleString("en-IN")}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    Paid: "bg-green-100 text-green-800 ring-green-300 dark:bg-green-950/50 dark:text-green-300 dark:ring-green-800",
    "Partially Paid":
      "bg-amber-100 text-amber-800 ring-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800",
    Unpaid:
      "bg-red-100 text-red-800 ring-red-300 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-800",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
        styles[status] ||
        "bg-gray-100 text-gray-700 ring-gray-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600"
      }`}
    >
      {status || "Unknown"}
    </span>
  );
}

function EmptyChart({ message, dark }) {
  return (
    <div
      className={`flex h-full min-h-[180px] items-center justify-center text-sm ${
        dark ? "text-slate-400" : "text-gray-400"
      }`}
    >
      {message}
    </div>
  );
}

export default function Dashboard() {
  const { theme } = useTheme();
  const dark = theme === "dark";

  const [dashboard, setDashboard] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard`, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Your session has expired. Please log in again.");
        }

        if (response.status === 403) {
          throw new Error("You do not have permission to view the dashboard.");
        }

        throw new Error(`Unable to load dashboard data (${response.status}).`);
      }

      const result = await response.json();

      setDashboard({
        summary: {
          ...EMPTY_DATA.summary,
          ...result.summary,
        },
        charts: {
          ...EMPTY_DATA.charts,
          ...result.charts,
          payment_status: {
            ...EMPTY_DATA.charts.payment_status,
            ...result.charts?.payment_status,
          },
        },
        recent_bills: Array.isArray(result.recent_bills)
          ? result.recent_bills
          : [],
        generated_at: result.generated_at || null,
      });
    } catch (err) {
      setError(
        err.message || "Something went wrong while loading dashboard data.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const summary = dashboard.summary;
  const charts = dashboard.charts;

  const paymentStatusData = [
    { name: "Paid", value: Number(charts.payment_status.paid) || 0 },
    {
      name: "Partially Paid",
      value: Number(charts.payment_status.partially_paid) || 0,
    },
    { name: "Unpaid", value: Number(charts.payment_status.unpaid) || 0 },
  ];

  const totalBills = paymentStatusData.reduce(
    (total, item) => total + item.value,
    0,
  );

  const axisStyle = {
    fontSize: 11,
    fill: dark ? "#A7AEC0" : "#73738A",
  };

  const gridColor = dark ? "#34364B" : "#EEEEF5";
  const axisLineColor = dark ? "#45475C" : "#DCDCE8";

  const pageText = dark ? "text-slate-100" : "text-[#20213A]";
  const mutedText = dark ? "text-slate-400" : "text-gray-500";
  const tableBorder = dark ? "border-slate-700" : "border-gray-100";
  const tableHeader = dark
    ? "bg-[#202235] text-slate-300"
    : "bg-[#FAFAFD] text-gray-500";
  const tableHover = dark ? "hover:bg-[#222438]" : "hover:bg-[#FAFAFD]";

  return (
    <div
      className={`min-h-screen min-w-0 transition-colors ${
        dark ? "bg-[#11121F] text-slate-100" : "bg-[#F6F6FC] text-[#20213A]"
      }`}
    >
      <AppSidebar />

      <div className="min-h-screen min-w-0 md:ml-[72px] lg:ml-[260px]">
        <TopNavbar
          title="Hospital Operations"
          breadcrumb={["Hospital Management", "Dashboard"]}
        />

        <main className="min-w-0 px-3 py-3 sm:px-5 lg:px-6">
          <div className="mx-auto w-full max-w-[1500px] space-y-4">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-medium text-[#3E439C] dark:text-[#B9B7FF]">
                  Overview
                </p>

                <h1
                  className={`mt-1 text-xl font-semibold tracking-tight sm:text-2xl ${pageText}`}
                >
                  Dashboard
                </h1>

                <p className={`mt-1 text-xs ${mutedText}`}>
                  Overview of hospital registrations, billing and collections.
                </p>
              </div>

              <button
                type="button"
                onClick={() => fetchDashboard(true)}
                disabled={loading || refreshing}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#3E439C] px-3 text-sm font-medium text-white transition hover:bg-[#323780] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span
                  className={
                    refreshing
                      ? "inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                      : ""
                  }
                />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {error && (
              <div
                role="alert"
                className={`flex flex-col gap-3 rounded-xl border p-4 text-sm sm:flex-row sm:items-center sm:justify-between ${
                  dark
                    ? "border-red-900 bg-red-950/30 text-red-300"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => fetchDashboard()}
                  className="self-start font-semibold underline sm:self-auto"
                >
                  Try again
                </button>
              </div>
            )}

            {loading ? (
              <div
                className={`grid min-h-64 place-items-center rounded-xl border ${
                  dark
                    ? "border-slate-700 bg-[#191A2A]"
                    : "border-[#E9E9F4] bg-white"
                }`}
              >
                <div className="text-center">
                  <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-[#E4E4F7] border-t-[#3E439C]" />
                  <p className={`mt-4 text-sm ${mutedText}`}>
                    Loading dashboard...
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <MetricCard
                    title="New Patients Today"
                    value={Number(
                      summary.patients_registered_today || 0,
                    ).toLocaleString("en-IN")}
                    icon="♙"
                    accent="#3E439C"
                    dark={dark}
                  />
                  <MetricCard
                    title="OP Bills Today"
                    value={Number(summary.op_bills_today || 0).toLocaleString(
                      "en-IN",
                    )}
                    icon="▤"
                    accent="#0891B2"
                    dark={dark}
                  />
                  <MetricCard
                    title="IP Bills Today"
                    value={Number(summary.ip_bills_today || 0).toLocaleString(
                      "en-IN",
                    )}
                    icon="▣"
                    accent="#7C3AED"
                    dark={dark}
                  />
                  <MetricCard
                    title="Collections Today"
                    value={currency(summary.collection_today)}
                    icon="₹"
                    accent="#16A34A"
                    dark={dark}
                  />
                  <MetricCard
                    title="Outstanding Balance"
                    value={currency(summary.outstanding_amount)}
                    icon="◷"
                    accent="#EA580C"
                    dark={dark}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                  <Panel
                    title="Collection Trend"
                    subtitle="Payments received over the last 7 days"
                    className="xl:col-span-2"
                    dark={dark}
                  >
                    <div className="h-[230px] w-full">
                      {charts.collection_trend.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={charts.collection_trend}
                            margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
                          >
                            <CartesianGrid
                              stroke={gridColor}
                              strokeDasharray="4 4"
                              vertical={false}
                            />
                            <XAxis
                              dataKey="date"
                              tickFormatter={shortDate}
                              tick={axisStyle}
                              axisLine={{ stroke: axisLineColor }}
                              tickLine={false}
                              tickMargin={10}
                            />
                            <YAxis
                              tickFormatter={compactCurrency}
                              tick={axisStyle}
                              axisLine={false}
                              tickLine={false}
                              width={58}
                            />
                            <Tooltip
                              content={<ChartTooltip money dark={dark} />}
                            />
                            <Line
                              type="monotone"
                              dataKey="amount"
                              name="Collection"
                              stroke={dark ? "#A5A8FF" : PRIMARY}
                              strokeWidth={3}
                              dot={{
                                r: 4,
                                fill: dark ? "#A5A8FF" : PRIMARY,
                                strokeWidth: 2,
                                stroke: dark ? "#191A2A" : "#FFFFFF",
                              }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <EmptyChart
                          message="No collection data available."
                          dark={dark}
                        />
                      )}
                    </div>
                  </Panel>

                  <Panel
                    title="Payment Status"
                    subtitle="Bill payment breakdown"
                    dark={dark}
                  >
                    {totalBills > 0 ? (
                      <>
                        <div className="relative h-[185px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={paymentStatusData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius={58}
                                outerRadius={85}
                                paddingAngle={3}
                                stroke="none"
                              >
                                {paymentStatusData.map((item, index) => (
                                  <Cell
                                    key={item.name}
                                    fill={STATUS_COLORS[index]}
                                  />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: dark ? "#202235" : "#FFFFFF",
                                  borderColor: dark ? "#45475C" : "#E5E7EB",
                                  borderRadius: 12,
                                  color: dark ? "#F1F5F9" : "#111827",
                                }}
                                itemStyle={{
                                  color: dark ? "#F1F5F9" : "#111827",
                                }}
                                formatter={(value, name) => [
                                  Number(value).toLocaleString("en-IN"),
                                  name,
                                ]}
                              />
                            </PieChart>
                          </ResponsiveContainer>

                          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                            <span
                              className={`text-2xl font-semibold ${pageText}`}
                            >
                              {totalBills}
                            </span>
                            <span className={`mt-1 text-xs ${mutedText}`}>
                              Total bills
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 space-y-3">
                          {paymentStatusData.map((item, index) => (
                            <div
                              key={item.name}
                              className="flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-3 w-3 rounded-full"
                                  style={{
                                    backgroundColor: STATUS_COLORS[index],
                                  }}
                                />
                                <span
                                  className={`text-sm ${dark ? "text-slate-300" : "text-gray-600"}`}
                                >
                                  {item.name}
                                </span>
                              </div>

                              <span
                                className={`text-sm font-semibold ${pageText}`}
                              >
                                {item.value}
                                <span
                                  className={`ml-2 font-normal ${dark ? "text-slate-500" : "text-gray-400"}`}
                                >
                                  {((item.value / totalBills) * 100).toFixed(1)}
                                  %
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <EmptyChart
                        message="No payment status data available."
                        dark={dark}
                      />
                    )}
                  </Panel>
                </div>

                <Panel
                  title="OP vs IP Billing"
                  subtitle="Daily billed amounts over the last 7 days"
                  dark={dark}
                >
                  <div className="h-[260px] w-full">
                    {charts.billing_trend.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={charts.billing_trend}
                          margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
                          barGap={5}
                        >
                          <CartesianGrid
                            stroke={gridColor}
                            strokeDasharray="4 4"
                            vertical={false}
                          />
                          <XAxis
                            dataKey="date"
                            tickFormatter={shortDate}
                            tick={axisStyle}
                            axisLine={{ stroke: axisLineColor }}
                            tickLine={false}
                            tickMargin={10}
                          />
                          <YAxis
                            tickFormatter={compactCurrency}
                            tick={axisStyle}
                            axisLine={false}
                            tickLine={false}
                            width={58}
                          />
                          <Tooltip
                            content={<ChartTooltip money dark={dark} />}
                          />
                          <Legend
                            verticalAlign="top"
                            align="right"
                            wrapperStyle={{
                              fontSize: 12,
                              paddingBottom: 18,
                              color: dark ? "#CBD5E1" : "#4B5563",
                            }}
                          />
                          <Bar
                            dataKey="op_bill_amount"
                            name="OP Billing"
                            fill={dark ? "#A5A8FF" : "#3E439C"}
                            radius={[5, 5, 0, 0]}
                            maxBarSize={32}
                          />
                          <Bar
                            dataKey="ip_bill_amount"
                            name="IP Billing"
                            fill="#8B8FE0"
                            radius={[5, 5, 0, 0]}
                            maxBarSize={32}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <EmptyChart
                        message="No billing trend data available."
                        dark={dark}
                      />
                    )}
                  </div>

                  <div
                    className={`mt-4 grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-2 ${dark ? "border-slate-700" : "border-gray-100"}`}
                  >
                    <div
                      className={`rounded-xl p-4 ${dark ? "bg-[#222438]" : "bg-[#F6F6FC]"}`}
                    >
                      <p className={`text-sm ${mutedText}`}>Today's OP bills</p>
                      <p className="mt-1 text-lg font-semibold text-[#3E439C] dark:text-[#B9B7FF]">
                        {summary.op_bills_today}
                      </p>
                    </div>
                    <div
                      className={`rounded-xl p-4 ${dark ? "bg-[#222438]" : "bg-[#F6F6FC]"}`}
                    >
                      <p className={`text-sm ${mutedText}`}>Today's IP bills</p>
                      <p className="mt-1 text-lg font-semibold text-[#3E439C] dark:text-[#B9B7FF]">
                        {summary.ip_bills_today}
                      </p>
                    </div>
                  </div>
                </Panel>

                <Panel
                  title="Recent Bills"
                  subtitle="The 10 most recently created or dated bills"
                  dark={dark}
                >
                  {dashboard.recent_bills.length > 0 ? (
                    <div className="-mx-4 overflow-x-auto sm:mx-0">
                      <table className="w-full min-w-[950px] border-collapse text-left">
                        <thead>
                          <tr
                            className={`border-y ${tableBorder} ${tableHeader}`}
                          >
                            {[
                              "Bill Number",
                              "Patient",
                              "Type",
                              "Date",
                              "Total",
                              "Paid",
                              "Balance",
                              "Status",
                            ].map((heading) => (
                              <th
                                key={heading}
                                className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide ${
                                  ["Total", "Paid", "Balance"].includes(heading)
                                    ? "text-right"
                                    : "text-left"
                                }`}
                              >
                                {heading}
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody>
                          {dashboard.recent_bills.map((bill) => (
                            <tr
                              key={bill.id}
                              className={`border-b ${tableBorder} transition ${tableHover}`}
                            >
                              <td className="whitespace-nowrap px-3 py-3">
                                <span className="font-medium text-[#3E439C] dark:text-[#B9B7FF]">
                                  {bill.bill_number || `Bill #${bill.id}`}
                                </span>
                              </td>

                              <td className="px-3 py-3">
                                <p className={`font-medium ${pageText}`}>
                                  {bill.patient_name || "—"}
                                </p>
                                <p
                                  className={`mt-1 text-xs ${dark ? "text-slate-500" : "text-gray-400"}`}
                                >
                                  {bill.patient_id || "—"}
                                </p>
                              </td>

                              <td className="px-3 py-3">
                                <span
                                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                                    bill.bill_type === "IP"
                                      ? "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300"
                                      : "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
                                  }`}
                                >
                                  {bill.bill_type || "—"}
                                </span>
                              </td>

                              <td
                                className={`whitespace-nowrap px-3 py-3 text-sm ${dark ? "text-slate-300" : "text-gray-600"}`}
                              >
                                {formatDate(bill.bill_date)}
                              </td>

                              <td
                                className={`whitespace-nowrap px-3 py-3 text-right text-sm font-medium ${pageText}`}
                              >
                                {currency(bill.total_amount)}
                              </td>

                              <td className="whitespace-nowrap px-3 py-3 text-right text-sm text-green-600 dark:text-green-400">
                                {currency(bill.amount_paid)}
                              </td>

                              <td
                                className={`whitespace-nowrap px-3 py-3 text-right text-sm font-medium ${pageText}`}
                              >
                                {currency(bill.outstanding_amount)}
                              </td>

                              <td className="px-3 py-3">
                                <StatusBadge status={bill.payment_status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className={`py-8 text-center text-xs ${mutedText}`}>
                      No bills available.
                    </div>
                  )}
                </Panel>

                <p
                  className={`text-right text-xs ${dark ? "text-slate-500" : "text-gray-400"}`}
                >
                  {dashboard.generated_at
                    ? `Dashboard data date: ${formatDate(dashboard.generated_at)}`
                    : ""}
                </p>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

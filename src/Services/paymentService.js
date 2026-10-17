
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/+$/, "");

async function request(path, options = {}) {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";

  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    const detail = payload?.detail;

    const message = Array.isArray(detail)
      ? detail.map((item) => item.msg || "Invalid request").join("; ")
      : typeof detail === "string"
        ? detail
        : typeof payload === "string" && payload
          ? payload
          : `Request failed (${response.status})`;

    throw new Error(message);
  }

  return payload;
}

function queryString(params = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      search.set(key, String(value));
    }
  });

  const value = search.toString();
  return value ? `?${value}` : "";
}

export const paymentService = {
  listPayments(params = {}) {
    return request(`/api/payments${queryString(params)}`);
  },

  listPaymentCollectors() {
    return request("/api/payments/collectors");
  },

  getPayment(paymentId) {
    return request(`/api/payments/${encodeURIComponent(paymentId)}`);
  },

  createPayment(billId, payload) {
    return request(
      `/api/payments/bills/${encodeURIComponent(billId)}`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  },

  listBills(params = {}) {
    return request(`/api/bills${queryString(params)}`);
  },

  getBill(billId) {
    return request(`/api/bills/${encodeURIComponent(billId)}`);
  },
};

export { API_BASE_URL };

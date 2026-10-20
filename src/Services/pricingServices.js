
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8001"
).replace(/\/+$/, "");

const ENDPOINTS = {
  serviceGroups: "/api/service-groups",
  services: "/api/services",
  doctors: "/api/doctors",
  roomTypes: "/api/room-types",
  servicePricing: "/api/service-pricing/service-prices",
};

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : options.body
          ? { "Content-Type": "application/json" }
          : {}),
      ...options.headers,
    },
  });

  const contentType = response.headers.get("content-type") || "";

  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof data === "object"
        ? data?.detail || data?.message
        : data;

    throw new Error(
      typeof message === "string" && message
        ? message
        : `Request failed with status ${response.status}`
    );
  }

  return data;
}

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

function createResourceApi(endpoint) {
  return {
    list: (params) =>
      request(`${endpoint}${buildQuery(params)}`),

    getById: (id) =>
      request(`${endpoint}/${encodeURIComponent(id)}`),

    create: (payload) =>
      request(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    update: (id, payload) =>
      request(`${endpoint}/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),

    remove: (id) =>
      request(`${endpoint}/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
  };
}

export const serviceGroupsApi = createResourceApi(
  ENDPOINTS.serviceGroups
);


export const servicesApi = {
  ...createResourceApi(ENDPOINTS.services),

  updateStatus: (serviceId, isActive) =>
    request(
      `${ENDPOINTS.services}/${encodeURIComponent(serviceId)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ is_active: isActive }),
      }
    ),
};



export const doctorsApi = {
  ...createResourceApi(ENDPOINTS.doctors),

  updateStatus: (doctorId, isActive) =>
    request(
      `${ENDPOINTS.doctors}/${encodeURIComponent(doctorId)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ is_active: isActive }),
      }
    ),
};


export const roomTypesApi = createResourceApi(
  ENDPOINTS.roomTypes
);

export const servicePricingApi = {
  ...createResourceApi(ENDPOINTS.servicePricing),

  updateStatus: (priceId, isActive) =>
    request(
      `${ENDPOINTS.servicePricing}/${encodeURIComponent(priceId)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ is_active: isActive }),
      }
    ),

  getPricesForService: (serviceId, params = {}) =>
    request(
      `/api/service-pricing/services/${encodeURIComponent(serviceId)}/prices${buildQuery(params)}`
    ),

  resolvePrice: (params) =>
    request(`/api/billing/service-price${buildQuery(params)}`),
};

export default {
  serviceGroups: serviceGroupsApi,
  services: servicesApi,
  doctors: doctorsApi,
  roomTypes: roomTypesApi,
  servicePricing: servicePricingApi,
};

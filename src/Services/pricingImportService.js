const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8001"
).replace(/\/+$/, "");

const IMPORT_ENDPOINT = "/api/pricing/import";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...options,
  });

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const detail =
      typeof data === "object"
        ? data?.detail || data?.message
        : data;

    const message =
      typeof detail === "string"
        ? detail
        : detail?.message || JSON.stringify(detail);

    throw new Error(
      message || `Pricing request failed (${response.status})`
    );
  }

  return data;
}

function createFormData(file) {
  if (!(file instanceof File)) {
    throw new Error("Please select an Excel file.");
  }

  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new Error("Please select an Excel file (.xlsx).");
  }

  if (file.size === 0) {
    throw new Error("The selected file is empty.");
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("The file size must not exceed 10 MB.");
  }

  const formData = new FormData();
  formData.append("file", file);
  return formData;
}

export const pricingImportService = {
  // Step 1: Validate the workbook without writing to the database.
  async previewExcel(file) {
    return request(`${IMPORT_ENDPOINT}/preview`, {
      method: "POST",
      body: createFormData(file),
    });
  },

  // Step 2: Import only after the user confirms.
  async confirmImport(file) {
    return request(`${IMPORT_ENDPOINT}/confirm`, {
      method: "POST",
      body: createFormData(file),
    });
  },

  // Retained for compatibility with any existing callers.
  async importExcel(file) {
    return this.previewExcel(file);
  },

  async downloadTemplate() {
    const response = await fetch(
      `${API_BASE_URL}${IMPORT_ENDPOINT}/template`,
      { credentials: "include" }
    );

    if (!response.ok) {
      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await response.json().catch(() => ({}))
        : {};

      const detail = data?.detail;
      throw new Error(
        typeof detail === "string"
          ? detail
          : detail?.message || "Unable to download the pricing template."
      );
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "OP_IP_Pricing_Import_Template.xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();

    // Delay revocation so the browser can begin the download.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};

export default pricingImportService;
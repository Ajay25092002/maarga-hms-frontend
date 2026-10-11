export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

export const formatDate = (value, includeTime = false) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", includeTime
    ? { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
    : { day: "2-digit", month: "short", year: "numeric" });
};

export const getErrorMessage = (error, fallback = "Something went wrong.") =>
  error?.message || fallback;

export const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.bills)) return payload.bills;
  if (Array.isArray(payload?.payments)) return payload.payments;
  return [];
};

export const getPagination = (payload, page, pageSize, itemCount = 0) => {
  const meta = payload?.pagination || payload?.meta || {};
  const total = Number(meta.total ?? payload?.total ?? itemCount);
  const totalPages = Number(meta.total_pages ?? meta.totalPages ?? Math.max(1, Math.ceil(total / pageSize)));
  return {
    page: Number(meta.page ?? page),
    page_size: Number(meta.page_size ?? meta.pageSize ?? pageSize),
    total,
    total_pages: totalPages,
  };
};

export const getPatientName = (record) =>
  record?.patient_name ??
  record?.name ??
  record?.patient?.name ??
  record?.patient?.full_name ??
  "—";

export const getPatientIdentifier = (record) =>
  record?.patient_id ??
  record?.registration_number ??
  record?.patient?.patient_id ??
  record?.patient?.registration_number ??
  "—";

export const getBillTotal = (bill) => Number(bill?.total_amount ?? bill?.bill_total ?? 0);
export const getBillPaid = (bill) => Number(bill?.amount_paid ?? bill?.bill_amount_paid ?? 0);
export const getBillBalance = (bill) =>
  Number(bill?.outstanding_amount ?? bill?.bill_outstanding_amount ?? Math.max(0, getBillTotal(bill) - getBillPaid(bill)));

export const getPaymentStatus = (bill) => {
  const total = getBillTotal(bill);
  const paid = getBillPaid(bill);
  if (total > 0 && paid >= total) return "Paid";
  if (paid > 0) return "Partially Paid";
  return "Unpaid";
};

export const todayInputValue = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

import { useRef, useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ShieldCheck,
} from "lucide-react";

import { useTheme } from "../../Context/ThemeContext";
import pricingImportService from "../../Services/pricingImportService";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const getErrorMessage = (error) => {
  const detail = error?.message || "Unable to process the pricing file.";

  try {
    const parsed = JSON.parse(detail);
    if (typeof parsed === "string") return parsed;
    return parsed?.message || JSON.stringify(parsed);
  } catch {
    return detail;
  }
};

export default function PricingImportTab({ canImport = true }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);

  const busy = previewing || importing;

  const styles = {
    panel: isDark
      ? "border-gray-700 bg-gray-900"
      : "border-gray-200 bg-white",
    heading: isDark ? "text-gray-100" : "text-gray-800",
    muted: isDark ? "text-gray-400" : "text-gray-500",
    secondaryButton: isDark
      ? "border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700"
      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
    dropzone: dragging
      ? "border-[#3E439C] bg-[#F1F0FF]/70"
      : isDark
        ? "border-gray-600 bg-gray-800/50 hover:border-gray-500"
        : "border-gray-300 bg-gray-50 hover:border-gray-400",
    divider: isDark ? "border-gray-700" : "border-gray-100",
  };

  const clearMessages = () => {
    setError("");
    setSuccess("");
    setPreview(null);
    setResult(null);
  };

  const validateFile = (file) => {
    if (!file) return "Please select an Excel file.";

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return "Please select an Excel file (.xlsx).";
    }

    if (file.size > MAX_FILE_SIZE) {
      return "The file is too large. Maximum allowed size is 10 MB.";
    }

    if (file.size === 0) {
      return "The selected file is empty.";
    }

    return "";
  };

  const selectFile = (file) => {
    if (busy) return;

    clearMessages();

    const validationError = validateFile(file);

    if (validationError) {
      setSelectedFile(null);
      setError(validationError);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setSelectedFile(file);
  };

  const handleFileChange = (event) => {
    selectFile(event.target.files?.[0] ?? null);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);

    if (!canImport || busy) return;

    const file = event.dataTransfer.files?.[0];
    if (file) selectFile(file);
  };

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    setError("");
    setSuccess("");

    try {
      await pricingImportService.downloadTemplate();
      setSuccess("Pricing template download started.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  // Step 1: Validate the workbook without changing the database.
  const handlePreview = async () => {
    if (!canImport) {
      setError("You do not have permission to import pricing.");
      return;
    }

    const validationError = validateFile(selectedFile);

    if (validationError) {
      setError(validationError);
      return;
    }

    setPreviewing(true);
    setError("");
    setSuccess("");
    setPreview(null);
    setResult(null);

    try {
      const response =
        await pricingImportService.previewExcel(selectedFile);

      setPreview(response);

      if (response?.valid) {
        setSuccess(
          response.message || "Workbook validation completed successfully."
        );
      } else {
        setError(
          response?.message ||
            "Please correct the workbook errors before importing."
        );
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPreviewing(false);
    }
  };

  // Step 2: Import the same file after explicit confirmation.
  const handleConfirmImport = async () => {
    if (!canImport) {
      setError("You do not have permission to import pricing.");
      return;
    }

    if (!selectedFile || !preview?.valid) {
      setError("Please preview and validate the workbook first.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to import this pricing workbook? " +
        "Existing matching records may be updated."
    );

    if (!confirmed) return;

    setImporting(true);
    setError("");
    setSuccess("");

    try {
      const response =
        await pricingImportService.confirmImport(selectedFile);

      setResult(response);
      setSuccess(
        response?.message || "Pricing workbook imported successfully."
      );

      setSelectedFile(null);
      setPreview(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setImporting(false);
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const previewErrors = Array.isArray(preview?.errors)
    ? preview.errors
    : [];

  const importResults = result?.results || {};

  const resultItems = result
    ? [
        {
          label: "Groups Created",
          value: importResults.service_groups_created,
        },
        {
          label: "Groups Updated",
          value: importResults.service_groups_updated,
        },
        {
          label: "Services Created",
          value: importResults.services_created,
        },
        {
          label: "Services Updated",
          value: importResults.services_updated,
        },
        {
          label: "Room Types Created",
          value: importResults.room_types_created,
        },
        {
          label: "Doctors Created",
          value: importResults.doctors_created,
        },
        {
          label: "Prices Created",
          value: importResults.prices_created,
        },
        {
          label: "Prices Updated",
          value: importResults.prices_updated,
        },
      ].filter((item) => item.value !== undefined)
    : [];

  return (
    <div className="space-y-5" data-theme={theme}>
      <div>
        <h2 className={`text-lg font-semibold ${styles.heading}`}>
          Import Pricing
        </h2>
        <p className={`mt-1 text-sm ${styles.muted}`}>
          Upload an Excel workbook to import OP and IP service pricing.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p className="flex-1 whitespace-pre-wrap">{error}</p>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
            className="shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <p className="flex-1">{success}</p>
          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Dismiss success message"
            className="shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Step 1: Download template */}
      <section
        className={`rounded-xl border p-5 sm:p-6 ${styles.panel}`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[#F1F0FF] p-3 text-[#3E439C]">
              <FileSpreadsheet size={24} />
            </div>

            <div>
              <h3 className={`font-semibold ${styles.heading}`}>
                Step 1: Download the template
              </h3>
              <p className={`mt-1 max-w-xl text-sm ${styles.muted}`}>
                Download the approved Excel template and complete the
                required service and pricing details.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            disabled={downloading || busy}
            className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 ${styles.secondaryButton}`}
          >
            {downloading ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            {downloading ? "Preparing..." : "Download Template"}
          </button>
        </div>
      </section>

      {/* Step 2: Upload workbook */}
      <section
        className={`rounded-xl border p-5 sm:p-6 ${styles.panel}`}
      >
        <div className="mb-5">
          <h3 className={`font-semibold ${styles.heading}`}>
            Step 2: Upload the completed file
          </h3>
          <p className={`mt-1 text-sm ${styles.muted}`}>
            Select your completed workbook or drag and drop it below.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          onChange={handleFileChange}
          disabled={!canImport || busy}
          className="hidden"
        />

        <div
          onDragEnter={(event) => {
            event.preventDefault();
            if (canImport && !busy) setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            event.preventDefault();
            if (event.currentTarget === event.target) {
              setDragging(false);
            }
          }}
          onDrop={handleDrop}
          className={`rounded-xl border-2 border-dashed p-7 text-center transition sm:p-10 ${styles.dropzone} ${
            !canImport ? "cursor-not-allowed opacity-60" : ""
          }`}
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#F1F0FF] text-[#3E439C]">
            <Upload size={25} />
          </div>

          <h4 className={`font-medium ${styles.heading}`}>
            Drag and drop your Excel file here
          </h4>

          <p className={`mt-2 text-sm ${styles.muted}`}>
            Supported format: .xlsx · Maximum size: 10 MB
          </p>

          <button
            type="button"
            disabled={!canImport || busy}
            onClick={() => fileInputRef.current?.click()}
            className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[#3E439C] bg-white px-4 py-2.5 text-sm font-medium text-[#3E439C] transition hover:bg-[#F1F0FF] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileSpreadsheet size={16} />
            Browse Files
          </button>
        </div>

        {!canImport && (
          <p className="mt-3 text-sm text-amber-600">
            You do not have permission to import pricing.
          </p>
        )}

        {selectedFile && (
          <div
            className={`mt-4 flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between ${styles.divider}`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-700">
                <FileSpreadsheet size={20} />
              </div>

              <div className="min-w-0">
                <p className={`truncate text-sm font-medium ${styles.heading}`}>
                  {selectedFile.name}
                </p>
                <p className={`mt-1 text-xs ${styles.muted}`}>
                  {formatSize(selectedFile.size)}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setSelectedFile(null);
                clearMessages();

                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              className={`self-start rounded-lg border p-2 sm:self-auto ${styles.secondaryButton}`}
              aria-label="Remove selected file"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Preview summary */}
        {preview?.valid && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck
                size={20}
                className="mt-0.5 shrink-0 text-emerald-700"
              />
              <div>
                <h4 className="font-semibold text-emerald-800">
                  Workbook validation successful
                </h4>
                <p className="mt-1 text-sm text-emerald-800">
                  {preview.total_rows} rows validated. Review the summary
                  before confirming the import.
                </p>
              </div>
            </div>

            {preview.row_counts &&
              Object.keys(preview.row_counts).length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {Object.entries(preview.row_counts).map(
                    ([sheet, count]) => (
                      <div
                        key={sheet}
                        className="rounded-lg border border-emerald-200 bg-white p-3"
                      >
                        <p className="break-words text-xs text-gray-500">
                          {sheet}
                        </p>
                        <p className="mt-1 text-lg font-semibold text-gray-800">
                          {count}
                        </p>
                      </div>
                    )
                  )}
                </div>
              )}
          </div>
        )}

        {/* Workbook validation errors */}
        {preview && !preview.valid && previewErrors.length > 0 && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <h4 className="font-semibold text-red-800">
              Validation errors ({preview.error_count ?? previewErrors.length})
            </h4>

            <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-red-800">
              {previewErrors.slice(0, 20).map((item, index) => (
                <li key={`${item.sheet || "error"}-${item.row ?? index}-${index}`}>
                  {item.sheet ? `${item.sheet}: ` : ""}
                  {item.row ? `Row ${item.row}: ` : ""}
                  {item.message || item.detail || JSON.stringify(item)}
                </li>
              ))}
            </ul>

            {previewErrors.length > 20 && (
              <p className="mt-3 text-xs text-red-800">
                Showing the first 20 errors out of {previewErrors.length}.
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div
          className={`mt-5 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between ${styles.divider}`}
        >
          <p className={`text-xs ${styles.muted}`}>
            Validate the workbook before importing. Only confirm after the
            preview passes validation.
          </p>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handlePreview}
              disabled={!canImport || !selectedFile || busy}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#3E439C] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#32377F] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {previewing ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <ShieldCheck size={16} />
              )}
              {previewing ? "Validating..." : "Preview Pricing"}
            </button>

            {preview?.valid && selectedFile && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={!canImport || busy}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {importing ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} />
                )}
                {importing ? "Importing..." : "Confirm Import"}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Import results */}
      {result && (
        <section
          className={`rounded-xl border p-5 ${styles.panel}`}
        >
          <h3 className={`font-semibold ${styles.heading}`}>
            Import Summary
          </h3>

          {resultItems.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {resultItems.map((item) => (
                <div
                  key={item.label}
                  className={`rounded-lg border p-4 ${styles.divider}`}
                >
                  <p className={`text-sm ${styles.muted}`}>{item.label}</p>
                  <p className={`mt-1 text-xl font-semibold ${styles.heading}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className={`mt-2 text-sm ${styles.muted}`}>
              {result.message || "The import request completed."}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
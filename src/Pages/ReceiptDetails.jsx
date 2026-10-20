import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import AppSidebar from "../Components/Layout/AppSidebar";
import TopNavbar from "../Components/Layout/TopNavbar";
import { useTheme } from "../Context/ThemeContext";
import ReceiptPreview from "../Components/Payments/ReceiptPreview";
import { paymentService } from "../Services/paymentService";
import { getErrorMessage } from "../Components/Payments/paymentUtils";

export default function ReceiptDetails() {
  const navigate = useNavigate();
  const { paymentId } = useParams();
  const { theme } = useTheme();
  const dark = theme === "dark";

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPayment = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await paymentService.getPayment(paymentId);
      setPayment(result);
    } catch (err) {
      setPayment(null);
      setError(
        getErrorMessage(err, "Unable to load receipt details.")
      );
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  useEffect(() => {
    loadPayment();
  }, [loadPayment]);

  // Generate and open the receipt PDF using the backend API.
const handlePrintReceipt = async () => {
  setError("");

  // Open the tab immediately during the button click.
  const pdfWindow = window.open("about:blank", "_blank");

  if (!pdfWindow) {
    setError(
      "The PDF window was blocked. Please allow pop-ups and try again."
    );
    return;
  }

  pdfWindow.document.title = "Payment Receipt";
  pdfWindow.document.body.innerHTML =
    '<p style="font-family: Arial, sans-serif; padding: 20px;">Generating receipt PDF...</p>';

  let pdfUrl = null;

  try {
    const API_BASE_URL = (
      import.meta.env.VITE_API_BASE_URL || "http://localhost:8001"
    ).replace(/\/$/, "");

    const response = await fetch(
      `${API_BASE_URL}/api/payments/${paymentId}/receipt-pdf`,
      {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/pdf",
        },
      }
    );

    if (!response.ok) {
      let message = "Unable to generate payment receipt PDF.";

      try {
        const result = await response.json();
        message = result.detail || message;
      } catch {
        // Keep the default error message if the response is not JSON.
      }

      throw new Error(message);
    }

    const blob = await response.blob();

    if (
      blob.type &&
      !blob.type.toLowerCase().includes("application/pdf")
    ) {
      throw new Error("The server did not return a valid PDF.");
    }

    pdfUrl = window.URL.createObjectURL(blob);

    // Navigate the already-opened tab to the generated PDF.
    pdfWindow.location.href = pdfUrl;

    // Release the object URL after the PDF has had time to load.
    setTimeout(() => {
      window.URL.revokeObjectURL(pdfUrl);
    }, 60000);
  } catch (err) {
    if (!pdfWindow.closed) {
      pdfWindow.close();
    }

    setError(
      getErrorMessage(err, "Unable to print payment receipt.")
    );

    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
    }
  }
};

  return (
    <div
      className={`min-h-screen min-w-0 ${
        dark ? "bg-[#11121F]" : "bg-[#F6F6FC]"
      }`}
    >
      <AppSidebar />

      <div className="min-h-screen min-w-0 md:ml-[72px] lg:ml-[260px]">
        <TopNavbar
          title="Receipt Details"
          breadcrumb={[
            "Hospital Management",
            "Billing",
            "Payments",
            "Receipt",
          ]}
        />

        <main className="min-w-0 space-y-5 px-4 py-5 sm:px-5 lg:px-6">
         
          {/* Loading state */}
          {loading && (
            <div
              className={`flex min-h-48 items-center justify-center gap-2 text-sm ${
                dark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#3E439C] border-t-transparent" />
              Loading receipt…
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div
              className={`border-y py-6 ${
                dark ? "border-slate-700" : "border-slate-200"
              }`}
            >
              <p
                className={`flex items-start gap-2 text-sm ${
                  dark ? "text-rose-300" : "text-rose-700"
                }`}
              >
                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0"
                />
                {error}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={loadPayment}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#3E439C] px-4 text-sm font-semibold text-white transition hover:bg-[#343984]"
                >
                  <RefreshCw size={15} />
                  Retry
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/payments")}
                  className={`inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium ${
                    dark
                      ? "border-slate-700 text-slate-200 hover:bg-slate-800"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <ArrowLeft size={15} />
                  Back to payments
                </button>
              </div>
            </div>
          )}

          {/* Receipt content */}
          {!loading && !error && payment && (
            <div className="min-w-0">
              <ReceiptPreview
                payment={payment}
                onBack={() => navigate("/payments")}
                onPrintReceipt={handlePrintReceipt}
                dark={dark}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function ReceiptIconFallback() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </svg>
  );
}
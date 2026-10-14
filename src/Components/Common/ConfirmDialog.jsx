
import { useEffect, useId, useState } from "react";
import { useTheme } from "../../Context/ThemeContext";

const VARIANTS = {
  warning: {
    iconColor: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-950/50",
    confirmBg: "bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500",
    defaultTitle: "Are you sure?",
    defaultConfirmText: "Continue",
  },
  danger: {
    iconColor: "text-red-600 dark:text-red-400",
    iconBg: "bg-red-100 dark:bg-red-950/50",
    confirmBg: "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500",
    defaultTitle: "Confirm deletion",
    defaultConfirmText: "Delete",
  },
  info: {
    iconColor: "text-[#3E439C] dark:text-[#B9B7FF]",
    iconBg: "bg-[#F1F0FF] dark:bg-[#3E439C]/30",
    confirmBg: "bg-[#3E439C] hover:bg-[#323780] focus-visible:ring-[#3E439C]",
    defaultTitle: "Please confirm",
    defaultConfirmText: "Confirm",
  },
};

function DefaultIcon({ variant }) {
  if (variant === "danger") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v4m0 4h.01M10.3 3.9 2.9 17a2 2 0 0 0 1.8 3h14.6a2 2 0 0 0 1.8-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
        />
      </svg>
    );
  }

  if (variant === "info") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-6 w-6"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 11v5m0-8h.01"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v4m0 4h.01M10.3 3.9 2.9 17a2 2 0 0 0 1.8 3h14.6a2 2 0 0 0 1.8-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
      />
    </svg>
  );
}

/**
 * Reusable confirmation dialog.
 *
 * Props:
 * - isOpen: controls visibility
 * - title: dialog heading
 * - description: supporting text
 * - icon: optional custom React element
 * - variant: "warning" | "danger" | "info"
 * - confirmText / cancelText: button labels
 * - onConfirm: action to perform after confirmation
 * - onCancel: action when cancelled
 * - onClose: optional callback when the dialog closes
 * - loading: external loading state
 * - closeOnBackdrop: close when clicking outside
 * - closeOnEscape: close with the Escape key
 * - children: optional additional content
 */
export default function ConfirmDialog({
  isOpen = false,
  title,
  description,
  icon,
  variant = "warning",
  confirmText,
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  onClose,
  loading = false,
  closeOnBackdrop = true,
  closeOnEscape = true,
  children,
}) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const generatedId = useId();
  const [submitting, setSubmitting] = useState(false);

  const config = VARIANTS[variant] || VARIANTS.warning;
  const isBusy = loading || submitting;
  const dialogTitle = title || config.defaultTitle;
  const actionText = confirmText || config.defaultConfirmText;

  const closeDialog = () => {
    if (isBusy) return;

    if (onCancel) {
      onCancel();
    } else if (onClose) {
      onClose();
    }
  };

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !loading && !submitting) {
        event.stopPropagation();
        closeDialog();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isOpen,
    closeOnEscape,
    loading,
    submitting,
    onCancel,
    onClose,
  ]);

  useEffect(() => {
    if (!isOpen) {
      setSubmitting(false);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (isBusy) return;

    setSubmitting(true);

    try {
      if (onConfirm) {
        await onConfirm();
      }

      if (onClose) {
        onClose();
      }
    } catch (error) {
      // Keep the dialog open if the action fails.
      // The calling page can display the error using its toast system.
      console.error("Confirmation action failed:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (
          closeOnBackdrop &&
          event.target === event.currentTarget &&
          !isBusy
        ) {
          closeDialog();
        }
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${generatedId}-title`}
        aria-describedby={
          description ? `${generatedId}-description` : undefined
        }
        className={`my-auto w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl ${
          dark
            ? "border-slate-700 bg-[#191A2A] text-slate-100"
            : "border-[#E9E9F4] bg-white text-[#20213A]"
        }`}
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${config.iconBg} ${config.iconColor}`}
            >
              {icon || <DefaultIcon variant={variant} />}
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <h2
                id={`${generatedId}-title`}
                className="text-base font-semibold leading-6"
              >
                {dialogTitle}
              </h2>

              {description && (
                <p
                  id={`${generatedId}-description`}
                  className={`mt-2 whitespace-pre-line text-sm leading-6 ${
                    dark ? "text-slate-400" : "text-gray-500"
                  }`}
                >
                  {description}
                </p>
              )}
            </div>
          </div>

          {children && (
            <div className="mt-4 text-sm">
              {children}
            </div>
          )}
        </div>

        <div
          className={`flex flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end sm:px-6 ${
            dark
              ? "border-slate-700 bg-[#151625]"
              : "border-gray-100 bg-[#FAFAFD]"
          }`}
        >
          <button
            type="button"
            onClick={closeDialog}
            disabled={isBusy}
            className={`inline-flex min-h-10 items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
              dark
                ? "border-slate-600 bg-[#222438] text-slate-200 hover:bg-[#2A2D43] focus-visible:ring-slate-400 focus-visible:ring-offset-[#191A2A]"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus-visible:ring-gray-400 focus-visible:ring-offset-white"
            }`}
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isBusy}
            className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
              config.confirmBg
            } ${
              dark
                ? "focus-visible:ring-offset-[#191A2A]"
                : "focus-visible:ring-offset-white"
            }`}
          >
            {isBusy && (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden="true"
              />
            )}

            {isBusy ? "Please wait..." : actionText}
          </button>
        </div>
      </section>
    </div>
  );
}

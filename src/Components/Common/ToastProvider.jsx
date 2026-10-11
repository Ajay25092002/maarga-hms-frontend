
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  const nextId = useRef(0);

  const dismissToast = useCallback((id) => {
    const timer = timers.current.get(id);

    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }

    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    ({
      type = "info",
      message,
      duration = 4000,
      title,
    }) => {
      if (!message) return;

      const id = ++nextId.current;

      setToasts((current) => [
        ...current,
        { id, type, message, title },
      ]);

      if (duration > 0) {
        const timer = setTimeout(() => {
          dismissToast(id);
        }, duration);

        timers.current.set(id, timer);
      }

      return id;
    },
    [dismissToast]
  );

  useEffect(() => {
    const activeTimers = timers.current;

    return () => {
      activeTimers.forEach((timer) => clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  const value = useMemo(
    () => ({ showToast, dismissToast }),
    [showToast, dismissToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainerBridge
        toasts={toasts}
        dismissToast={dismissToast}
      />
    </ToastContext.Provider>
  );
}

function ToastContainerBridge({ toasts, dismissToast }) {
  // Kept separate to make the provider easy to maintain.
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[9999] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:top-6">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => dismissToast(toast.id)}
        />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }) {
  const styles = {
    success: {
      border: "border-emerald-200 dark:border-emerald-900",
      icon: "text-emerald-600 dark:text-emerald-400",
      title: "Success",
    },
    error: {
      border: "border-red-200 dark:border-red-900",
      icon: "text-red-600 dark:text-red-400",
      title: "Something went wrong",
    },
    warning: {
      border: "border-amber-200 dark:border-amber-900",
      icon: "text-amber-600 dark:text-amber-400",
      title: "Warning",
    },
    info: {
      border: "border-[#DCD9FF] dark:border-slate-700",
      icon: "text-[#3E439C] dark:text-[#D6D4FF]",
      title: "Information",
    },
  };

  const config = styles[toast.type] || styles.info;

  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      aria-live={toast.type === "error" ? "assertive" : "polite"}
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border ${config.border} bg-white p-4 shadow-lg dark:bg-[#1B1C2C] motion-safe:animate-[toast-enter_200ms_ease-out]`}
    >
      <ToastIcon type={toast.type} className={config.icon} />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {toast.title || config.title}
        </p>
        <p className="mt-1 break-words text-sm text-slate-600 dark:text-slate-300">
          {toast.message}
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#3E439C] dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <ToastCloseIcon />
      </button>
    </div>
  );
}

function ToastIcon({ type, className }) {
  const paths = {
    success: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </>
    ),
    error: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m9 9 6 6m0-6-6 6" />
      </>
    ),
    warning: (
      <>
        <path d="M10.3 4.3 2.8 17.2A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.8L13.7 4.3a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4m0 3h.01" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5m0-8h.01" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`mt-0.5 h-5 w-5 shrink-0 ${className}`}
    >
      {paths[type] || paths.info}
    </svg>
  );
}

function ToastCloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="m18 6-12 12M6 6l12 12" />
    </svg>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider.");
  }

  return context;
}

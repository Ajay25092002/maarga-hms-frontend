
export default function Loader({
  message = "Loading...",
  size = "md",
  variant = "inline",
  className = "",
}) {
  const sizes = {
    sm: "h-4 w-4 border-2",
    md: "h-5 w-5 border-2",
    lg: "h-8 w-8 border-[3px]",
  };

  const spinner = (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 animate-spin rounded-full border-[#3E439C]/20 border-t-[#3E439C] dark:border-white/20 dark:border-t-[#D6D4FF] ${sizes[size] || sizes.md}`}
    />
  );

  if (variant === "button") {
    return (
      <span
        className={`inline-flex items-center justify-center gap-2 ${className}`}
        role="status"
        aria-live="polite"
      >
        {spinner}
        <span>{message}</span>
      </span>
    );
  }

  return (
    <div
      className={`flex items-center justify-center gap-3 ${className}`}
      role="status"
      aria-live="polite"
    >
      {spinner}
      {message && (
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {message}
        </span>
      )}
    </div>
  );
}

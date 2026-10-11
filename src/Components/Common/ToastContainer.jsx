
export default function ToastContainer({
  children,
  className = "",
}) {
  return (
    <div
      className={`pointer-events-none fixed right-4 top-4 z-[9999] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:top-6 ${className}`}
    >
      {children}
    </div>
  );
}

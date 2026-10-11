
import Loader from "./Loader";

export default function LoadingOverlay({
  loading,
  message = "Loading...",
  children,
  className = "",
}) {
  return (
    <div
      className={`relative ${className}`}
      aria-busy={loading}
    >
      {children}

      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-inherit bg-white/75 backdrop-blur-[1px] dark:bg-[#11121F]/75">
          <Loader message={message} size="lg" />
        </div>
      )}
    </div>
  );
}


import { useEffect, useState } from "react";

export default function FullPageLoader({
  show = false,
  message = "Please wait",
}) {
  const [dots, setDots] = useState(0);

  useEffect(() => {
    if (!show) {
      setDots(0);
      return;
    }

    const interval = setInterval(() => {
      setDots((current) => (current + 1) % 4);
    }, 450);

    return () => clearInterval(interval);
  }, [show]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center
        bg-white/25 backdrop-blur-[2px]
        dark:bg-slate-950/30"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-4">
        {/* Spinning loader */}
        <div
          className="h-12 w-12 animate-spin rounded-full
            border-4 border-[#3E439C]/20
            border-t-[#3E439C]"
          aria-hidden="true"
        />

        {/* Static text with animated dots only */}
        <p className="flex items-center text-sm font-medium text-[#3E439C] dark:text-[#D6D4FF]">
          <span>{message}</span>
          <span className="inline-block w-[1.2em] text-left" aria-hidden="true">
            {".".repeat(dots)}
          </span>
        </p>
      </div>
    </div>
  );
}

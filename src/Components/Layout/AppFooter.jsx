
import React from "react";
import EngenLogo from "../../assets/Engen_logo.png";

export default function AppFooter() {
  return (
    <footer className="mt-auto w-full shrink-0 border-t border-[#E5E5F2] bg-[#F6F6FC] px-5 pt-3 sm:px-6 lg:px-7">
      <div className="flex min-h-9 items-center justify-end gap-2.5">

        {/* <span className="text-xs font-medium tracking-wide text-slate-500">
          Powered by
        </span> */}

        <a
          href="https://engencbss.com/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visit ENGEN website (opens in a new tab)"
          title="Visit ENGEN website"
          className="inline-flex items-center rounded-sm transition-opacity duration-200 hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E439C] focus-visible:ring-offset-2"
        >
          <img
            src={EngenLogo}
            alt="ENGEN - Scaling Heights"
            className="h-10 w-auto max-w-[150px] object-contain"
          />
        </a>

      </div>
    </footer>
  );
}

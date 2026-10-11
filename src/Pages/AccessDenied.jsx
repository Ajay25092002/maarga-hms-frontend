
import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

export default function AccessDenied() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <ShieldAlert
        size={44}
        className="mb-4 text-red-500"
      />

      <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
        Access Denied
      </h1>

      <p className="mt-2 max-w-md text-sm text-slate-500">
        You don't have permission to access this page.
        Contact your administrator if you need access.
      </p>

      <Link
        to="/home"
        className="mt-5 rounded-md bg-[#3E439C] px-4 py-2 text-sm font-medium text-white"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}


import { useState } from "react";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8001"
).replace(/\/+$/, "");

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(
          data?.detail ||
            "Unable to sign in. Please check your credentials and try again."
        );
        return;
      }

      // The browser stores the HttpOnly session cookie automatically.
      // Do not save the session ID or password in localStorage.
      setPassword("");
      navigate("/home", { replace: true });
    } catch (err) {
      console.error("Login request failed:", err);

      setError(
        "Unable to connect to the server. Please check that the backend is running."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F5FB] px-4 py-4 text-[#292B38] transition-colors dark:bg-[#171827] dark:text-gray-100">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-lg shadow-indigo-950/[0.04] sm:p-6 dark:border-gray-700 dark:bg-[#202132]">
          {/* Branding */}
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="Maarga Mindcare"
              className="h-8 w-8 object-contain"
            />

            <div>
              <h1 className="text-lg font-bold leading-6 tracking-tight text-[#292B38] dark:text-gray-100">
                Maarga Mindcare
              </h1>
              <p className="text-xs leading-5 text-gray-500 dark:text-gray-400">
                Hospital Management System
              </p>
            </div>
          </div>

          <div className="my-4 border-t border-gray-100 dark:border-gray-700" />

          {/* Welcome */}
          <div className="mb-6">
            <h2 className="text-2xl font-semibold leading-8 tracking-tight">
              Welcome back
            </h2>
            <p className="mt-0 text-sm leading-5 text-gray-500 dark:text-gray-400">
              Sign in to access your hospital workspace.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium"
              >
                Work email
              </label>

              <div className="relative">
                <Mail
                  size={17}
                  strokeWidth={1.8}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="Enter your work email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#3E439C] focus:ring-2 focus:ring-[#3E439C]/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-[#191A29] dark:placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>

                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-[#3E439C] hover:text-[#303680] dark:text-indigo-300"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <LockKeyhole
                  size={17}
                  strokeWidth={1.8}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-10 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#3E439C] focus:ring-2 focus:ring-[#3E439C]/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-[#191A29] dark:placeholder:text-gray-500"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-700 disabled:cursor-not-allowed dark:hover:text-gray-200"
                >
                  {showPassword ? (
                    <EyeOff size={17} strokeWidth={1.8} />
                  ) : (
                    <Eye size={17} strokeWidth={1.8} />
                  )}
                </button>
              </div>
            </div>

            {/* API / Validation Error */}
            {error && (
              <p
                role="alert"
                aria-live="polite"
                className="text-sm text-red-600 dark:text-red-400"
              >
                {error}
              </p>
            )}

            {/* Sign In */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center rounded-lg bg-[#3E439C] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#323680] focus:outline-none focus:ring-2 focus:ring-[#3E439C]/20 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Access Information */}
          <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-[#F1F0FF] p-3 dark:bg-indigo-950/40">
            <ShieldCheck
              size={17}
              className="mt-0.5 shrink-0 text-[#3E439C] dark:text-indigo-300"
            />

            <p className="text-xs leading-4 text-gray-600 dark:text-gray-300">
              Access is restricted to authorized hospital staff. Contact your
              hospital administrator if you need an account.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-3 text-center text-xs leading-4 text-gray-500 dark:text-gray-400">
          Secure access for authorized hospital staff
        </p>
      </div>
    </div>
  );
}


import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  ShieldCheck,
  KeyRound,
  RefreshCw,
} from "lucide-react";
import logo from "../assets/logo.png";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(300);

  useEffect(() => {
    if (step !== "otp" || secondsLeft <= 0) return;

    const timer = setTimeout(() => {
      setSecondsLeft((seconds) => seconds - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [step, secondsLeft]);

  const formattedTime = `${Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, "0")}:${(secondsLeft % 60)
    .toString()
    .padStart(2, "0")}`;

  const getErrorMessage = async (response) => {
    try {
      const data = await response.json();
      return typeof data.detail === "string"
        ? data.detail
        : "Request failed. Please try again.";
    } catch {
      return "Request failed. Please try again.";
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Please enter your registered work email.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/send-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: normalizedEmail,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      setEmail(normalizedEmail);
      setOtp("");
      setSecondsLeft(300);
      setStep("otp");
      setMessage("Verification code sent. Please check your email.");
    } catch (err) {
      setError(
        err.message ||
          "Unable to send the verification code. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter the six-digit verification code.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/verify-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            otp,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      setStep("verified");
      setMessage("Your email has been verified successfully.");
    } catch (err) {
      setError(
        err.message ||
          "Verification failed. Please check the code and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/send-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      setOtp("");
      setSecondsLeft(300);
      setMessage("A new verification code has been sent.");
    } catch (err) {
      setError(err.message || "Unable to resend the code.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeEmail = () => {
    setStep("email");
    setOtp("");
    setError("");
    setMessage("");
    setSecondsLeft(300);
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

          {/* Heading */}
          <div className="mb-6">
            <h2 className="text-2xl font-semibold leading-8 tracking-tight">
              {step === "email" && "Forgot password?"}
              {step === "otp" && "Verify your email"}
              {step === "verified" && "Email verified"}
            </h2>

            <p className="text-sm leading-5 text-gray-500 dark:text-gray-400">
              {step === "email" &&
                "Enter your registered work email to receive a verification code."}

              {step === "otp" &&
                "Enter the six-digit code sent to your email address."}

              {step === "verified" &&
                "Your email address has been verified successfully."}
            </p>
          </div>

          {/* Step 1: Email */}
          {step === "email" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
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
                    autoComplete="email"
                    placeholder="Enter your work email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#3E439C] focus:ring-2 focus:ring-[#3E439C]/10 dark:border-gray-600 dark:bg-[#191A29] dark:placeholder:text-gray-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#3E439C] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#323680] focus:outline-none focus:ring-2 focus:ring-[#3E439C]/20 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Mail size={16} />
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </form>
          )}

          {/* Step 2: OTP */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label
                  htmlFor="otp"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Verification code
                </label>

                <div className="relative">
                  <KeyRound
                    size={17}
                    strokeWidth={1.8}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) =>
                      setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    required
                    className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm tracking-[0.2em] outline-none transition placeholder:tracking-normal placeholder:text-gray-400 focus:border-[#3E439C] focus:ring-2 focus:ring-[#3E439C]/10 dark:border-gray-600 dark:bg-[#191A29] dark:placeholder:text-gray-500"
                  />
                </div>

                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>Sent to {email}</span>
                  <span>{formattedTime} remaining</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || secondsLeft <= 0}
                className="flex w-full items-center justify-center rounded-lg bg-[#3E439C] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#323680] focus:outline-none focus:ring-2 focus:ring-[#3E439C]/20 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleChangeEmail}
                  disabled={loading}
                  className="text-xs font-medium text-[#3E439C] hover:text-[#303680] disabled:opacity-50 dark:text-indigo-300"
                >
                  Change email
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading || secondsLeft > 0}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#3E439C] hover:text-[#303680] disabled:cursor-not-allowed disabled:opacity-50 dark:text-indigo-300"
                >
                  <RefreshCw size={13} />
                  Resend OTP
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Verified */}
          {step === "verified" && (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 rounded-lg bg-[#F1F0FF] p-3 dark:bg-indigo-950/40">
                <ShieldCheck
                  size={19}
                  className="mt-0.5 shrink-0 text-[#3E439C] dark:text-indigo-300"
                />
                <p className="text-sm leading-5 text-gray-600 dark:text-gray-300">
                  Email verification is complete. Password changing is not
                  connected yet.
                </p>
              </div>
            </div>
          )}

          {/* Feedback */}
          {error && (
            <p
              role="alert"
              className="mt-4 text-sm text-red-600 dark:text-red-400"
            >
              {error}
            </p>
          )}

          {message && (
            <p
              role="status"
              className="mt-4 text-sm leading-5 text-gray-600 dark:text-gray-300"
            >
              {message}
            </p>
          )}

          {/* Access Information */}
          <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-[#F1F0FF] p-3 dark:bg-indigo-950/40">
            <ShieldCheck
              size={17}
              className="mt-0.5 shrink-0 text-[#3E439C] dark:text-indigo-300"
            />

            <p className="text-xs leading-4 text-gray-600 dark:text-gray-300">
              Password recovery is available to authorized hospital staff.
              Contact your hospital administrator if you need assistance.
            </p>
          </div>

          {/* Back to Login */}
          <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700">
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-sm font-medium text-[#3E439C] transition hover:text-[#303680] dark:text-indigo-300"
            >
              <ArrowLeft size={16} />
              Back to Login
            </Link>
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

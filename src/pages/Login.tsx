
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  Eye,
  EyeOff,
} from "lucide-react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import { toast } from "react-toastify";

import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [identifier, setIdentifier] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const {
    user,
    loading,
    initializing,
    isAuthenticated,
    login,
  } = useAuth();

  const [submitting, setSubmitting] =
    useState(false);

  // =========================================================
  // REDIRECT AFTER AUTHENTICATION
  // =========================================================

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    const from =
      location.state?.from?.pathname;

    /*
     * Only administrator roles can access
     * the /admin route tree.
     */

    const isAdministrator =
      user.role === "admin" ||
      user.role === "super_admin";

    /*
     * Preserve the original protected
     * destination when it is safe to do so.
     *
     * Do not redirect customers to
     * administrative routes.
     */

    const requestedPath =
      typeof from === "string" &&
      from.startsWith("/") &&
      !from.startsWith("//")
        ? from
        : null;

    const destination =
      requestedPath &&
      (
        !requestedPath.startsWith("/admin") ||
        isAdministrator
      )
        ? requestedPath
        : isAdministrator
          ? "/admin"
          : "/dashboard";

    navigate(destination, {
      replace: true,
    });
  }, [
    isAuthenticated,
    user,
    location.state,
    navigate,
  ]);

  // =========================================================
  // PIN CHANGE
  // =========================================================

  const handlePinChange = (
    value: string,
  ) => {
    /*
     * Allow numbers only.
     *
     * Maximum of 4 digits.
     */

    const numericPin =
      value
        .replace(/\D/g, "")
        .slice(0, 4);

    setPassword(numericPin);
  };

  // =========================================================
  // SUBMIT
  // =========================================================

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    if (submitting) {
      return;
    }

    const cleanIdentifier =
      identifier.trim();

    if (!cleanIdentifier) {
      toast.error(
        "Please enter your email or phone number.",
      );
      return;
    }

    // -------------------------------------------------------
    // PIN VALIDATION
    // -------------------------------------------------------

    if (!password) {
      toast.error(
        "Please enter your 4-digit PIN.",
      );
      return;
    }

    if (!/^\d{4}$/.test(password)) {
      toast.error(
        "PIN must be exactly 4 digits.",
      );
      return;
    }

    // -------------------------------------------------------
    // LOGIN
    // -------------------------------------------------------

    setSubmitting(true);

    try {
      await login({
        identifier:
          cleanIdentifier,

        /*
         * The backend still expects
         * the credential as "password".
         *
         * The value is a 4-digit PIN.
         */
        password,
      });

      toast.success(
        "Login successful.",
      );
    } catch (error: unknown) {
      let message =
        "Login failed. Please check your credentials and try again.";

      if (
        typeof error === "object" &&
        error !== null
      ) {
        const axiosError =
          error as {
            response?: {
              data?: {
                message?: unknown;
                error?: unknown;
              };
            };
            message?: unknown;
          };

        const responseMessage =
          axiosError.response?.data?.message;

        const responseError =
          axiosError.response?.data?.error;

        if (
          typeof responseMessage ===
          "string"
        ) {
          message = responseMessage;
        } else if (
          typeof responseError ===
          "string"
        ) {
          message = responseError;
        } else if (
          typeof axiosError.message ===
          "string"
        ) {
          message = axiosError.message;
        }
      }

      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================
  // INITIAL SESSION LOADING
  // =========================================================

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500" />

          <h2 className="text-xl font-semibold text-gray-800">
            Loading
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Please wait...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        {/* BRAND */}

        <h1 className="mb-2 text-center text-3xl font-bold text-orange-500">
          Lovest
        </h1>

        <p className="mb-8 text-center text-gray-500">
          Welcome back
        </p>

        {/* FORM */}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {/* EMAIL / PHONE */}

          <div>
            <label
              htmlFor="identifier"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Phone Number
            </label>

            <input
              id="identifier"
              name="identifier"
              type="text"
              placeholder="Enter phone number or email"
              value={identifier}
              onChange={(e) =>
                setIdentifier(
                  e.target.value,
                )
              }
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              disabled={submitting}
              required
            />
          </div>

          {/* 4-DIGIT PIN */}

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              4-Digit PIN
            </label>

            <div className="relative">
              <input
                id="password"
                name="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                inputMode="numeric"
                maxLength={4}
                pattern="[0-9]{4}"
                placeholder="Enter 4-digit PIN"
                value={password}
                onChange={(e) =>
                  handlePinChange(
                    e.target.value,
                  )
                }
                autoComplete="current-password"
                disabled={submitting}
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 text-center tracking-[0.4em] outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100"
              />

              <button
                type="button"
                aria-label={
                  showPassword
                    ? "Hide PIN"
                    : "Show PIN"
                }
                onClick={() =>
                  setShowPassword(
                    (previous) =>
                      !previous,
                  )
                }
                disabled={submitting}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {showPassword ? (
                  <EyeOff size={20} />
                ) : (
                  <Eye size={20} />
                )}
              </button>
            </div>

            <p className="mt-1 text-xs text-gray-500">
              Enter your 4-digit PIN.
            </p>
          </div>

          {/* LOGIN */}

          <button
            type="submit"
            disabled={
              submitting ||
              password.length !== 4
            }
            className="w-full rounded-xl bg-orange-500 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {submitting
              ? "Signing in..."
              : "Login"}
          </button>
        </form>

        {/* FORGOT PIN */}

        <button
          type="button"
          onClick={() =>
            navigate(
              "/resetpassword",
            )
          }
          disabled={submitting}
          className="mt-4 w-full text-center text-sm text-orange-500 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          Forgot PIN?
        </button>

        {/* REGISTER */}

        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={() =>
              navigate("/register")
            }
            disabled={submitting}
            className="font-semibold text-orange-500 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            Register
          </button>
        </p>
      </div>
    </div>
  );
}


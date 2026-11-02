
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  Eye,
  EyeOff,
  Fingerprint,
} from "lucide-react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import { toast } from "react-toastify";

import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showBiometricSetup, setShowBiometricSetup] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const {
    user,
    loading,
    initializing,
    isAuthenticated,
    login,
    isBiometricAvailable,
    isBiometricEnabled,
    biometricLoading,
    loginWithBiometrics,
    enableBiometricLogin,
    checkBiometricAvailability,
  } = useAuth();

  /* =========================================================
     REDIRECT AFTER AUTHENTICATION
  ========================================================= */

  useEffect(() => {
    if (
      !isAuthenticated ||
      !user ||
      submitting ||
      showBiometricSetup
    ) {
      return;
    }

    const from = location.state?.from?.pathname;

    const isAdministrator =
      user.role === "admin" ||
      user.role === "super_admin";

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

    navigate(destination, { replace: true });
  }, [
    isAuthenticated,
    user,
    submitting,
    showBiometricSetup,
    location.state,
    navigate,
  ]);

  /* =========================================================
     CHECK BIOMETRIC AVAILABILITY
  ========================================================= */

  useEffect(() => {
    void checkBiometricAvailability();
  }, [checkBiometricAvailability]);

  /* =========================================================
     PIN INPUT
  ========================================================= */

  const handlePinChange = (value: string): void => {
    const numericPin = value
      .replace(/\D/g, "")
      .slice(0, 4);

    setPassword(numericPin);
  };

  const handleEnableBiometrics = async (): Promise<void> => {
    if (biometricLoading || submitting || loading) return;

    try {
      await enableBiometricLogin();
      toast.success("Fingerprint login is now enabled.");
      setShowBiometricSetup(false);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  /* =========================================================
     ERROR HANDLING
  ========================================================= */

  const getErrorMessage = (error: unknown): string => {
    if (typeof error === "object" && error !== null) {
      const axiosError = error as {
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

      if (typeof responseMessage === "string") {
        return responseMessage;
      }

      if (typeof responseError === "string") {
        return responseError;
      }

      if (typeof axiosError.message === "string") {
        return axiosError.message;
      }
    }

    return "Authentication failed. Please try again.";
  };

  /* =========================================================
     NORMAL PIN LOGIN
  ========================================================= */

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();

    if (submitting || loading || biometricLoading) {
      return;
    }

    const cleanIdentifier = identifier.trim();

    if (!cleanIdentifier) {
      toast.error(
        "Please enter your email or phone number.",
      );
      return;
    }

    if (!/^\d{4}$/.test(password)) {
      toast.error(
        "PIN must be exactly 4 digits.",
      );
      return;
    }

    setSubmitting(true);

    try {
      await login({
        identifier: cleanIdentifier,
        password,
      });

      toast.success("Login successful.");

      const biometricStatus = await checkBiometricAvailability();
      if (biometricStatus.available && !biometricStatus.enabled) {
        setShowBiometricSetup(true);
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================================================
     FINGERPRINT LOGIN
  ========================================================= */

  const handleBiometricLogin = async (): Promise<void> => {
    if (biometricLoading || loading || submitting) {
      return;
    }

    try {
      await loginWithBiometrics();

      toast.success(
        "Fingerprint authentication successful.",
      );
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  /* =========================================================
     INITIAL SESSION LOADING
  ========================================================= */

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

  /* =========================================================
     UI
  ========================================================= */

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

        {/* LOGIN FORM */}

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
                setIdentifier(e.target.value)
              }
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              disabled={
                submitting ||
                loading ||
                biometricLoading
              }
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100"
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
                  showPassword ? "text" : "password"
                }
                inputMode="numeric"
                maxLength={4}
                pattern="[0-9]{4}"
                placeholder="Enter 4-digit PIN"
                value={password}
                onChange={(e) =>
                  handlePinChange(e.target.value)
                }
                autoComplete="current-password"
                disabled={
                  submitting ||
                  loading ||
                  biometricLoading
                }
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
                    (previous) => !previous,
                  )
                }
                disabled={
                  submitting ||
                  loading ||
                  biometricLoading
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
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

          {/* NORMAL LOGIN BUTTON */}

          <button
            type="submit"
            disabled={
              submitting ||
              loading ||
              biometricLoading ||
              password.length !== 4
            }
            className="w-full rounded-xl bg-orange-500 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {submitting || loading
              ? "Signing in..."
              : "Login"}
          </button>
        </form>

        {/* FINGERPRINT LOGIN */}

        {isBiometricAvailable &&
          isBiometricEnabled && (
            <>
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />

                <span className="text-xs text-gray-400">
                  OR
                </span>

                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <button
                type="button"
                onClick={handleBiometricLogin}
                disabled={
                  biometricLoading ||
                  loading ||
                  submitting
                }
                className="group flex w-full items-center justify-center gap-3 rounded-xl border-2 border-orange-200 bg-orange-50 py-4 font-semibold text-orange-600 transition duration-200 hover:border-orange-400 hover:bg-orange-100 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {biometricLoading ? (
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-300 border-t-orange-600" />
                ) : (
                  <Fingerprint
                    size={27}
                    className="transition-transform duration-200 group-hover:scale-110"
                  />
                )}

                <span>
                  {biometricLoading
                    ? "Verifying fingerprint..."
                    : "Login with Fingerprint"}
                </span>
              </button>

              <p className="mt-2 text-center text-xs text-gray-500">
                Authenticate securely using your device
                biometrics.
              </p>
            </>
          )}

        {/* FORGOT PIN */}

        <button
          type="button"
          onClick={() => navigate("/resetpassword")}
          disabled={
            submitting ||
            loading ||
            biometricLoading
          }
          className="mt-5 w-full text-center text-sm text-orange-500 hover:underline disabled:opacity-50"
        >
          Forgot PIN?
        </button>

        {/* REGISTER */}

        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{" "}

          <button
            type="button"
            onClick={() => navigate("/register")}
            disabled={
              submitting ||
              loading ||
              biometricLoading
            }
            className="font-semibold text-orange-500 hover:underline disabled:opacity-50"
          >
            Register
          </button>
        </p>
      </div>

      {showBiometricSetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="biometric-setup-title"
            className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl"
          >
            <Fingerprint
              size={42}
              aria-hidden="true"
              className="mx-auto text-orange-500"
            />
            <h2
              id="biometric-setup-title"
              className="mt-4 text-xl font-bold text-gray-900"
            >
              Enable fingerprint login?
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Use your device biometrics to sign in securely next time.
              Your login session is stored in secure device storage.
            </p>
            <button
              type="button"
              onClick={handleEnableBiometrics}
              disabled={biometricLoading || submitting || loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {biometricLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-200 border-t-white" />
              ) : (
                <Fingerprint size={21} />
              )}
              {biometricLoading
                ? "Verifying fingerprint..."
                : "Enable fingerprint login"}
            </button>
            <button
              type="button"
              onClick={() => setShowBiometricSetup(false)}
              disabled={biometricLoading}
              className="mt-3 w-full rounded-xl py-3 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Not now
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

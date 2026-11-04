import { useEffect, useState, type FormEvent } from "react";

import { Eye, EyeOff, Fingerprint } from "lucide-react";

import { useLocation, useNavigate } from "react-router-dom";

import { toast } from "react-toastify";

import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showBiometricSetup, setShowBiometricSetup] = useState(false);
  const [biometricStatusMessage, setBiometricStatusMessage] = useState("");

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

  const busy = submitting || loading || biometricLoading;

  /* =========================================================
     REDIRECT AFTER AUTHENTICATION
  ========================================================= */

  useEffect(() => {
    if (!isAuthenticated || !user || submitting || showBiometricSetup) {
      return;
    }

    const from = location.state?.from?.pathname;

    const isAdministrator =
      user.role === "admin" || user.role === "super_admin";

    const requestedPath =
      typeof from === "string" && from.startsWith("/") && !from.startsWith("//")
        ? from
        : null;

    const destination =
      requestedPath && (!requestedPath.startsWith("/admin") || isAdministrator)
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
     ERROR HANDLING
  ========================================================= */

  const getErrorMessage = (error: unknown): string => {
    if (typeof error === "object" && error !== null) {
      const authError = error as {
        response?: {
          data?: {
            message?: unknown;
            error?: unknown;
          };
        };
        message?: unknown;
      };

      const responseMessage = authError.response?.data?.message;

      const responseError = authError.response?.data?.error;

      if (typeof responseMessage === "string") {
        return responseMessage;
      }

      if (typeof responseError === "string") {
        return responseError;
      }

      if (typeof authError.message === "string") {
        return authError.message;
      }
    }

    return "Authentication failed. Please try again.";
  };

  /* =========================================================
     PIN INPUT
  ========================================================= */

  const handlePinChange = (value: string): void => {
    setPassword(value.replace(/\D/g, "").slice(0, 4));
  };

  /* =========================================================
     NORMAL PIN LOGIN
  ========================================================= */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();

    if (busy) return;

    const cleanIdentifier = identifier.trim();

    if (!cleanIdentifier) {
      toast.error("Please enter your email or phone number.");
      return;
    }

    if (!/^\d{4}$/.test(password)) {
      toast.error("PIN must be exactly 4 digits.");
      return;
    }

    setSubmitting(true);

    try {
      console.log("[Login] Starting PIN login...");

      await login({
        identifier: cleanIdentifier,
        password,
      });

      console.log("[Login] PIN login successful.");

      toast.success("Login successful.");

      console.log("[Login] Checking biometric availability...");

      const biometricStatus = await checkBiometricAvailability();

      console.log("[Login] Biometric status:", biometricStatus);

      setBiometricStatusMessage(biometricStatus.error ?? "");

      if (biometricStatus.available && !biometricStatus.enabled) {
        console.log("[Login] Opening biometric setup modal.");

        setShowBiometricSetup(true);
      } else {
        console.log("[Login] Biometric setup not required:", biometricStatus);
      }
    } catch (error: unknown) {
      console.error("[Login] PIN login failed:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================================================
     FINGERPRINT LOGIN
  ========================================================= */

  const handleBiometricLogin = async (): Promise<void> => {
    console.log("[Biometric Login] Button clicked");

    if (busy) {
      console.log("[Biometric Login] Aborted: app is busy");
      return;
    }

    try {
      console.log("[Biometric Login] Checking biometric availability...");

      const biometricStatus = await checkBiometricAvailability();

      console.log(
        "[Biometric Login] Availability check result:",
        biometricStatus,
      );

      if (!biometricStatus.available) {
        console.warn(
          "[Biometric Login] Biometrics unavailable:",
          biometricStatus.error,
        );

        toast.info(
          biometricStatus.error ||
            "Fingerprint login is unavailable. Enroll biometrics in your device settings.",
        );
        return;
      }

      console.log("[Biometric Login] Biometrics are available");

      if (!biometricStatus.enabled) {
        if (isAuthenticated) {
          console.log(
            "[Biometric Login] User is authenticated. Opening biometric enrollment.",
          );
          setShowBiometricSetup(true);
          return;
        }

        console.info(
          "[Biometric Login] Enrollment requires an authenticated PIN session.",
        );
        toast.info("Sign in with your PIN to enable fingerprint login.");
        return;
      }

      console.log(
        "[Biometric Login] Biometric login is enabled. Starting authentication...",
      );

      await loginWithBiometrics();

      console.log("[Biometric Login] Authentication completed successfully");

      toast.success("Fingerprint authentication successful.");
    } catch (error: unknown) {
      console.error("[Biometric Login] Authentication failed:", error);

      if (error instanceof Error) {
        console.error("[Biometric Login] Error message:", error.message);
        console.error("[Biometric Login] Error stack:", error.stack);
      }

      toast.error(getErrorMessage(error));
    } finally {
      console.log("[Biometric Login] Handler finished");
    }
  };

  /* =========================================================
     ENABLE FINGERPRINT LOGIN
  ========================================================= */

  const handleEnableBiometrics = async (): Promise<void> => {
    if (busy) {
      return;
    }

    try {
      await enableBiometricLogin();

      toast.success("Fingerprint login is now enabled.");

      setShowBiometricSetup(false);
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

          <h2 className="text-xl font-semibold text-gray-800">Loading</h2>

          <p className="mt-2 text-sm text-gray-500">Please wait...</p>
        </div>
      </div>
    );
  }

  /* =========================================================
     LOGIN UI
  ========================================================= */

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        {/* BRAND */}

        <h1 className="mb-2 text-center text-3xl font-bold text-orange-500">
          Lovest
        </h1>

        <p className="mb-8 text-center text-gray-500">Welcome back</p>

        {/* LOGIN FORM */}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* EMAIL OR PHONE */}

          <div>
            <label
              htmlFor="identifier"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Phone Number or Email
            </label>

            <input
              id="identifier"
              name="identifier"
              type="text"
              placeholder="Enter phone number or email"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              disabled={busy}
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100"
            />
          </div>

          {/* FOUR-DIGIT PIN */}

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
                type={showPassword ? "text" : "password"}
                inputMode="numeric"
                maxLength={4}
                pattern="[0-9]{4}"
                placeholder="Enter 4-digit PIN"
                value={password}
                onChange={(event) => handlePinChange(event.target.value)}
                autoComplete="current-password"
                disabled={busy}
                required
                className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 text-center tracking-[0.4em] outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100"
              />

              <button
                type="button"
                aria-label={showPassword ? "Hide PIN" : "Show PIN"}
                onClick={() => setShowPassword((previous) => !previous)}
                disabled={busy}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <p className="mt-1 text-xs text-gray-500">
              Enter your 4-digit PIN.
            </p>
          </div>

          {/* LOGIN BUTTON */}

          <button
            type="submit"
            disabled={busy || password.length !== 4}
            className="w-full rounded-xl bg-orange-500 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {submitting || loading ? "Signing in..." : "Login"}
          </button>
        </form>

        {/* FINGERPRINT LOGIN — ALWAYS VISIBLE */}

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />

          <span className="text-xs text-gray-400">OR</span>

          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <button
          type="button"
          onClick={handleBiometricLogin}
          disabled={busy}
          aria-label={
            isAuthenticated && isBiometricAvailable && !isBiometricEnabled
              ? "Enable fingerprint login"
              : "Login with fingerprint"
          }
          className="group flex w-full items-center justify-center gap-3 rounded-xl border-2 border-orange-200 bg-orange-50 py-4 font-semibold text-orange-600 transition duration-200 hover:border-orange-400 hover:bg-orange-100 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {biometricLoading ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-300 border-t-orange-600" />
          ) : (
            <Fingerprint
              size={27}
              aria-hidden="true"
              className="shrink-0 transition-transform duration-200 group-hover:scale-110"
            />
          )}

          <span>
            {biometricLoading
              ? "Verifying fingerprint..."
              : isAuthenticated &&
                  isBiometricAvailable &&
                  !isBiometricEnabled
                ? "Enable Fingerprint Login"
                : "Login with Fingerprint"}
          </span>
        </button>

        <p className="mt-2 text-center text-xs text-gray-500">
          {biometricStatusMessage ||
            (!isBiometricAvailable
              ? "Biometric authentication is not currently available on this device."
              : !isBiometricEnabled
                ? "Sign in with your PIN first to enable fingerprint login."
                : "Authenticate securely using your device biometrics.")}
        </p>

        {/* FORGOT PIN */}

        <button
          type="button"
          onClick={() => navigate("/resetpassword")}
          disabled={busy}
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
            disabled={busy}
            className="font-semibold text-orange-500 hover:underline disabled:opacity-50"
          >
            Register
          </button>
        </p>
      </div>

      {/* BIOMETRIC SETUP MODAL */}

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
              Use your device biometrics to sign in securely next time. Your
              login session is stored in secure device storage.
            </p>

            <button
              type="button"
              onClick={handleEnableBiometrics}
              disabled={busy}
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

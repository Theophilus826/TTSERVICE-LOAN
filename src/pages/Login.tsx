import { useEffect, useRef, useState, type FormEvent } from "react";

import { Eye, EyeOff, Fingerprint } from "lucide-react";

import { useLocation, useNavigate } from "react-router-dom";

import { toast } from "react-toastify";

import { useAuth } from "../context/AuthContext";
import authApi from "../services/AuthService";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showBiometricSetup, setShowBiometricSetup] = useState(false);
  const [biometricStatusMessage, setBiometricStatusMessage] = useState("");
  const [allowBiometrics, setAllowBiometrics] = useState<boolean | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const biometricCheckRef = useRef(false);

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
    if (biometricCheckRef.current) return;

    biometricCheckRef.current = true;

    void checkBiometricAvailability()
      .then((status) => {
        setBiometricStatusMessage(status.error ?? "");
      })
      .catch((error) => {
        console.error("[Login] Biometric initialization failed:", error);
      });
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

    if (busy) {
      console.warn("[Login] Login blocked: application is busy.");
      return;
    }

    const cleanIdentifier = identifier.trim();

    if (!cleanIdentifier) {
      toast.error("Please enter your email or phone number.");
      return;
    }

    if (!/^\d{4}$/.test(password)) {
      toast.error("PIN must be exactly 4 digits.");
      return;
    }

    console.group("[Login] PIN LOGIN AND BIOMETRIC SETUP");
    console.log("[Login] Starting PIN authentication...");
    console.log("[Login] Biometric preference:", allowBiometrics);

    setSubmitting(true);

    try {
      // STEP 1: Authenticate using PIN
      console.log("[Login] Sending PIN login request...");

      const authenticatedUser = await login({
        identifier: cleanIdentifier,
        password,
      });

      console.log("[Login] Backend login response received.");
      console.log("[Login] User authenticated:", !!authenticatedUser);

      const token = authApi.getToken();

      if (!token || !authenticatedUser) {
        throw new Error(
          "Login succeeded but the authentication session was not saved.",
        );
      }

      console.log("[Login] Authentication token exists:", !!token);
      console.log("[Login] PIN authentication successful.");

      toast.success("Login successful.");

      // STEP 2: Only continue if user selected Allow
      if (allowBiometrics !== true) {
        console.log("[Login] Biometric setup skipped by user.");
        return;
      }

      console.log("[Login] User selected fingerprint authentication.");
      console.log("[Login] Checking biometric availability...");

      // STEP 3: Check native biometric availability
      try {
        const biometricStatus = await checkBiometricAvailability();

        console.log("[Login] Biometric availability result:", {
          available: biometricStatus.available,
          enabled: biometricStatus.enabled,
          error: biometricStatus.error,
        });

        setBiometricStatusMessage(biometricStatus.error ?? "");

        if (!biometricStatus.available) {
          console.warn(
            "[Login] Fingerprint unavailable:",
            biometricStatus.error,
          );

          toast.warning(
            biometricStatus.error ||
              "Please enroll a fingerprint in your Android phone settings.",
          );

          return;
        }

        // STEP 4: Check whether fingerprint login is already enabled
        if (biometricStatus.enabled) {
          console.log("[Login] Fingerprint login is already enabled.");
          toast.success("Fingerprint login is already enabled.");
          return;
        }

        // STEP 5: Trigger Android fingerprint prompt immediately
        console.log(
          "[Login] Starting native fingerprint authentication prompt...",
        );

        toast.info(
          "Touch your fingerprint sensor to enable fingerprint login.",
        );

        await enableBiometricLogin();

        console.log("[Login] Native fingerprint authentication completed.");

        // STEP 6: Verify that secure storage saved the details
        console.log("[Login] Verifying secure biometric storage...");

        const updatedStatus = await checkBiometricAvailability();

        console.log("[Login] Final biometric status:", {
          available: updatedStatus.available,
          enabled: updatedStatus.enabled,
          error: updatedStatus.error,
        });

        setBiometricStatusMessage(updatedStatus.error ?? "");

        if (!updatedStatus.enabled) {
          console.error(
            "[Login] Fingerprint authentication completed but registration was not confirmed.",
          );

          toast.warning(
            "Fingerprint setup could not be confirmed. Please try again.",
          );

          return;
        }

        setAllowBiometrics(true);

        console.log("[Login] SUCCESS: Fingerprint login enabled and verified.");

        toast.success("Fingerprint login enabled successfully!");
      } catch (biometricError: unknown) {
        // PIN login already succeeded. Do not report it as a PIN failure.
        console.error("[Login] BIOMETRIC SETUP FAILED:", biometricError);

        toast.warning(
          getErrorMessage(biometricError) ||
            "Fingerprint setup failed. You can still log in with your PIN.",
        );
      }
    } catch (error: unknown) {
      console.error("[Login] PIN LOGIN FAILED:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
      console.log("[Login] Login process finished.");
      console.groupEnd();
    }
  };

  /* =========================================================
     FINGERPRINT LOGIN
  ========================================================= */

  const handleBiometricLogin = async (): Promise<void> => {
    if (busy) return;

    console.group("FINGERPRINT LOGIN");

    try {
      const status = await checkBiometricAvailability();

      setBiometricStatusMessage(status.error ?? "");

      if (!status.available) {
        toast.error(
          status.error || "Biometrics are unavailable on this device.",
        );
        return;
      }

      // Fingerprint is available but not yet enrolled.
      if (!status.enabled) {
        setShowBiometricSetup(true);

        if (!isAuthenticated) {
          toast.info("Sign in with your PIN to enable fingerprint login.");
        }

        return;
      }

      // Fingerprint is already enabled.
      await loginWithBiometrics();

      const token = authApi.getToken();
      const currentUser = authApi.getUser();

      if (!token || !currentUser) {
        throw new Error(
          "Fingerprint authentication succeeded but session was not saved.",
        );
      }

      toast.success("Fingerprint login successful.");
    } catch (error: unknown) {
      console.error("[Login] Fingerprint login failed:", error);
      toast.error(getErrorMessage(error));
    } finally {
      console.groupEnd();
    }
  };

  /* =========================================================
     ENABLE FINGERPRINT LOGIN
  ========================================================= */

  const handleEnableBiometrics = async (): Promise<void> => {
    if (busy) return;

    try {
      const token = authApi.getToken();
      const currentUser = authApi.getUser();

      if (!token || !currentUser || !isAuthenticated) {
        throw new Error("Please sign in with your PIN first.");
      }

      console.log("[Login] Starting fingerprint enrollment...");

      // Recheck device support.
      const availability = await checkBiometricAvailability();

      setBiometricStatusMessage(availability.error ?? "");

      if (!availability.available) {
        throw new Error(availability.error || "Fingerprint is unavailable.");
      }

      if (availability.enabled) {
        setShowBiometricSetup(false);
        toast.success("Fingerprint login is already enabled.");
        return;
      }

      // Start actual biometric registration.
      await enableBiometricLogin();

      // Verify registration.
      const updatedStatus = await checkBiometricAvailability();

      setBiometricStatusMessage(updatedStatus.error ?? "");

      if (!updatedStatus.enabled) {
        throw new Error(
          "Fingerprint registration could not be confirmed. Please try again.",
        );
      }

      setAllowBiometrics(true);
      setShowBiometricSetup(false);

      toast.success("Fingerprint login enabled successfully!");
    } catch (error: unknown) {
      console.error("[Login] Fingerprint enrollment failed:", error);

      toast.error(getErrorMessage(error));
    }
  };

  /* =========================================================
     ALLOW / DISALLOW SELECTION
  ========================================================= */

  const handleBiometricPreference = (allow: boolean): void => {
    setAllowBiometrics(allow);

    if (allow) {
      toast.success("Biometric login selected. Continue with your PIN.");
    } else {
      setShowBiometricSetup(false);
      toast.info("PIN login only selected.");
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

          {/* PIN LOGIN BUTTON */}

          <button
            type="submit"
            disabled={busy || password.length !== 4}
            className="w-full rounded-xl bg-orange-500 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {submitting || loading ? "Signing in..." : "Login"}
          </button>

          {/* ALLOW / DISALLOW FINGERPRINT */}
          {!isBiometricEnabled && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
              <div className="flex items-center gap-3">
                <Fingerprint size={28} className="shrink-0 text-orange-500" />

                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Fingerprint Login
                  </p>

                  <p className="text-xs text-gray-500">
                    Would you like to enable fingerprint authentication?
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {/* ALLOW */}

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleBiometricPreference(true)}
                  aria-pressed={allowBiometrics === true}
                  className={`rounded-lg border py-3 text-sm font-semibold transition ${
                    allowBiometrics === true
                      ? "border-green-600 bg-green-600 text-white"
                      : "border-green-200 bg-white text-green-700 hover:border-green-500 hover:bg-green-50"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  ✓ Allow
                </button>

                {/* DISALLOW */}

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleBiometricPreference(false)}
                  aria-pressed={allowBiometrics === false}
                  className={`rounded-lg border py-3 text-sm font-semibold transition ${
                    allowBiometrics === false
                      ? "border-red-600 bg-red-600 text-white"
                      : "border-red-200 bg-white text-red-600 hover:border-red-500 hover:bg-red-50"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  ✕ Disallow
                </button>
              </div>

              <p className="mt-3 text-center text-xs text-gray-500">
                {allowBiometrics === true
                  ? "Fingerprint enrollment will be offered after PIN login."
                  : allowBiometrics === false
                    ? "You selected PIN login only."
                    : !isBiometricAvailable
                      ? "Biometric authentication is unavailable on this device."
                      : "Select Allow or Disallow before continuing."}
              </p>
            </div>
          )}
        </form>

        {/* DIVIDER */}

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />

          <span className="text-xs text-gray-400">OR</span>

          <div className="h-px flex-1 bg-gray-200" />
        </div>

        {/* FINGERPRINT LOGIN */}

        <button
          type="button"
          onClick={handleBiometricLogin}
          disabled={busy}
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
              : isBiometricEnabled
                ? "Login with Fingerprint"
                : "Enable / Login with Fingerprint"}
          </span>
        </button>

        <p className="mt-2 text-center text-xs text-gray-500">
          {biometricStatusMessage ||
            (!isBiometricAvailable
              ? "Biometric authentication is not currently available on this device."
              : !isBiometricEnabled
                ? "Select Allow and sign in with your PIN to enable fingerprint login."
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

      {/* =====================================================
          BIOMETRIC SETUP POPUP
      ===================================================== */}

      {showBiometricSetup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="biometric-setup-title"
            className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl"
          >
            {/* FINGERPRINT ICON */}

            <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
              {biometricLoading && (
                <>
                  <div className="absolute inset-0 animate-ping rounded-full border-2 border-orange-200 opacity-50" />

                  <div className="absolute inset-2 animate-pulse rounded-full border border-orange-300" />
                </>
              )}

              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
                <Fingerprint
                  size={biometricLoading ? 58 : 48}
                  className="relative z-10 text-orange-500"
                />
              </div>
            </div>

            {/* TITLE */}

            <h2
              id="biometric-setup-title"
              className="mt-5 text-2xl font-bold text-gray-900"
            >
              {!isAuthenticated
                ? "Fingerprint Login"
                : biometricLoading
                  ? "Scanning fingerprint..."
                  : "Enable fingerprint login?"}
            </h2>

            {/* DESCRIPTION */}

            <p className="mt-3 text-sm leading-6 text-gray-600">
              {!isAuthenticated
                ? "You must first sign in using your email or phone number and 4-digit PIN before enabling fingerprint login."
                : biometricLoading
                  ? "Place your finger on your device's fingerprint sensor. Verifying your identity..."
                  : "Use your device biometrics to sign in securely next time."}
            </p>

            {/* AUTHENTICATED USER */}

            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={handleEnableBiometrics}
                  disabled={busy}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {biometricLoading ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-200 border-t-white" />
                      Verifying fingerprint...
                    </>
                  ) : (
                    <>
                      <Fingerprint size={22} />
                      Enable Fingerprint Login
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowBiometricSetup(false)}
                  disabled={biometricLoading}
                  className="mt-3 w-full rounded-xl py-3 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                >
                  Not now
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setShowBiometricSetup(false);

                    document.getElementById("identifier")?.focus();

                    toast.info("Enter your PIN to continue.");
                  }}
                  className="mt-6 w-full rounded-xl bg-orange-500 py-3 font-semibold text-white transition hover:bg-orange-600"
                >
                  Continue with PIN
                </button>

                <button
                  type="button"
                  onClick={() => setShowBiometricSetup(false)}
                  className="mt-3 w-full rounded-xl py-3 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  Maybe later
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

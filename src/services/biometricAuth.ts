import { Capacitor } from "@capacitor/core";
import { BiometricAuth } from "@aparajita/capacitor-biometric-auth";
import {
  BiometryErrorType,
  BiometryType,
  type CheckBiometryResult,
} from "@aparajita/capacitor-biometric-auth";
import { SecureStorage } from "@aparajita/capacitor-secure-storage";

import authApi, { type AuthUser } from "./AuthService";

const TOKEN_KEY = "menumoney_biometric_token";
const ENABLED_KEY = "menumoney_biometric_enabled";

const LOG = "[Biometric Service]";

const logStart = (operation: string): number => {
  console.log(`${LOG} START: ${operation}`);
  return Date.now();
};

const logSuccess = (
  operation: string,
  start: number,
  result?: unknown,
): void => {
  console.log(`${LOG} SUCCESS: ${operation}`, {
    duration: `${Date.now() - start}ms`,
    result,
  });
};

const logError = (operation: string, start: number, error: unknown): void => {
  console.error(`${LOG} FAILED: ${operation}`, {
    duration: `${Date.now() - start}ms`,
    error,
  });
};

/* =========================================================
   NATIVE PLATFORM CHECK
========================================================= */

const ensureNative = (): void => {
  console.log(`${LOG} Checking native platform...`);

  const isNative = Capacitor.isNativePlatform();

  console.log(`${LOG} Native platform:`, isNative);
  console.log(`${LOG} Platform:`, Capacitor.getPlatform());

  if (!isNative) {
    throw new Error("Biometric login is only available in the mobile app.");
  }
};

/* =========================================================
   BIOMETRIC AUTHENTICATION
========================================================= */

const authenticateFingerprint = async (): Promise<void> => {
  const operation = "authenticateFingerprint";
  const start = logStart(operation);

  try {
    ensureNative();

    console.log(`${LOG} Checking device biometric capability...`);

    const checkStart = Date.now();
    const result = await BiometricAuth.checkBiometry();

    console.log(`${LOG} checkBiometry completed:`, {
      duration: `${Date.now() - checkStart}ms`,
      isAvailable: result.isAvailable,
      biometryType: result.biometryType,
      biometryTypes: result.biometryTypes,
      deviceIsSecure: result.deviceIsSecure,
      reason: result.reason,
      code: result.code,
    });

    if (!result.isAvailable) {
      throw new Error(
        result.reason ||
          "No enrolled fingerprint or supported biometric is available.",
      );
    }

    console.log(`${LOG} Opening native fingerprint prompt...`);

    const authStart = Date.now();

    await BiometricAuth.authenticate({
      reason: "Verify your identity to access MenuMoney.",
      cancelTitle: "Cancel",
      allowDeviceCredential: false,
      androidTitle: "MenuMoney fingerprint login",
      androidSubtitle: "Confirm your identity",
      androidConfirmationRequired: true,
    });

    console.log(`${LOG} Native fingerprint prompt completed:`, {
      duration: `${Date.now() - authStart}ms`,
    });

    logSuccess(operation, start);
  } catch (error) {
    logError(operation, start, error);
    throw error;
  }
};

/* =========================================================
   CHECK BIOMETRIC AVAILABILITY
========================================================= */

const isBiometricAvailable = async (): Promise<boolean> => {
  const operation = "isBiometricAvailable";
  const start = logStart(operation);

  try {
    const status = await getBiometricStatus();

    logSuccess(operation, start, {
      available: status.isAvailable,
    });

    return status.isAvailable;
  } catch (error) {
    logError(operation, start, error);
    throw error;
  }
};

const getBiometricStatus = async (): Promise<CheckBiometryResult> => {
  const operation = "getBiometricStatus";
  const start = logStart(operation);

  try {
    if (!Capacitor.isNativePlatform()) {
      console.warn(`${LOG} Not running on a native platform`);

      return {
        isAvailable: false,
        strongBiometryIsAvailable: false,
        biometryType: BiometryType.none,
        biometryTypes: [],
        deviceIsSecure: false,
        reason: "Biometric login requires the installed mobile app.",
        code: BiometryErrorType.biometryNotAvailable,
      };
    }

    console.log(`${LOG} Calling BiometricAuth.checkBiometry()...`);

    const status = await BiometricAuth.checkBiometry();

    logSuccess(operation, start, {
      isAvailable: status.isAvailable,
      biometryType: status.biometryType,
      biometryTypes: status.biometryTypes,
      deviceIsSecure: status.deviceIsSecure,
      reason: status.reason,
      code: status.code,
    });

    return status;
  } catch (error) {
    logError(operation, start, error);
    throw error;
  }
};

/* =========================================================
   CHECK WHETHER BIOMETRIC LOGIN IS ENABLED
========================================================= */

const isBiometricEnabled = async (): Promise<boolean> => {
  const operation = "isBiometricEnabled";
  const start = logStart(operation);

  try {
    if (!Capacitor.isNativePlatform()) {
      console.warn(`${LOG} Cannot check secure storage outside native app`);
      return false;
    }

    console.log(`${LOG} Reading biometric enabled flag...`);

    const enabledStart = Date.now();
    const enabled = await SecureStorage.get(ENABLED_KEY);

    console.log(`${LOG} Enabled flag read completed:`, {
      duration: `${Date.now() - enabledStart}ms`,
      enabled,
    });

    console.log(`${LOG} Reading saved biometric token...`);

    const tokenStart = Date.now();
    const token = await SecureStorage.get(TOKEN_KEY);

    console.log(`${LOG} Token read completed:`, {
      duration: `${Date.now() - tokenStart}ms`,
      tokenExists: typeof token === "string" && token.length > 0,
    });

    const result =
      enabled === true && typeof token === "string" && token.length > 0;

    logSuccess(operation, start, { enabled: result });

    return result;
  } catch (error) {
    logError(operation, start, error);
    throw error;
  }
};

/* =========================================================
   ENABLE BIOMETRIC LOGIN
========================================================= */

const enableBiometricLogin = async (): Promise<void> => {
  const operation = "enableBiometricLogin";
  const start = logStart(operation);

  try {
    console.group(`${LOG} FINGERPRINT ENROLLMENT`);

    // STEP 1: Confirm native Android environment
    console.log("[STEP 1] Checking native platform...");

    ensureNative();

    // STEP 2: Retrieve authenticated user's token
    console.log("[STEP 2] Retrieving authentication token...");

    const token = authApi.getToken();

    console.log("[STEP 2] Authentication token exists:", !!token);

    if (!token) {
      throw new Error(
        "Please log in with your PIN before enabling fingerprint login.",
      );
    }

    // STEP 3: Check biometric availability
    console.log("[STEP 3] Checking fingerprint availability...");

    const status = await getBiometricStatus();

    console.log("[STEP 3] Biometric device information:", {
      isAvailable: status.isAvailable,
      biometryType: status.biometryType,
      biometryTypes: status.biometryTypes,
      strongBiometryIsAvailable: status.strongBiometryIsAvailable,
      deviceIsSecure: status.deviceIsSecure,
      reason: status.reason,
      code: status.code,
    });

    if (!status.isAvailable) {
      throw new Error(
        status.reason ||
          "No enrolled fingerprint or supported biometric is available.",
      );
    }

    // STEP 4: Display Android fingerprint prompt
    console.log("[STEP 4] DISPLAYING ANDROID FINGERPRINT PROMPT...");

    console.log("[STEP 4] Touch your fingerprint sensor to continue.");

    await authenticateFingerprint();

    console.log("[STEP 4] SUCCESS: Android verified the fingerprint.");

    // STEP 5: Save token
    console.log("[STEP 5] Saving authentication credential...");

    await SecureStorage.set(TOKEN_KEY, token);

    const savedToken = await SecureStorage.get(TOKEN_KEY);

    console.log("[STEP 5] Token storage verification:", {
      tokenExists: typeof savedToken === "string" && savedToken.length > 0,
      tokenMatches: savedToken === token,
    });

    if (savedToken !== token) {
      throw new Error("Authentication credential could not be saved.");
    }

    // STEP 6: Save enabled flag
    console.log("[STEP 6] Saving biometric enabled flag...");

    await SecureStorage.set(ENABLED_KEY, true);

    const savedEnabled = await SecureStorage.get(ENABLED_KEY);

    console.log("[STEP 6] Enabled flag verification:", savedEnabled);

    if (savedEnabled !== true) {
      throw new Error("Biometric enabled status could not be saved.");
    }

    // STEP 7: Final verification
    console.log("[STEP 7] Checking final enrollment status...");

    const finalStatus = await isBiometricEnabled();

    console.log("[STEP 7] Final enrollment result:", finalStatus);

    if (!finalStatus) {
      throw new Error("Fingerprint enrollment could not be confirmed.");
    }

    console.log("[SUCCESS] FINGERPRINT LOGIN ENABLED SUCCESSFULLY.");

    logSuccess(operation, start);
  } catch (error) {
    console.error(`${LOG} FINGERPRINT ENROLLMENT ERROR:`, error);

    logError(operation, start, error);

    // Prevent partially saved credentials from being treated as enabled.
    try {
      await SecureStorage.remove(ENABLED_KEY);
      await SecureStorage.remove(TOKEN_KEY);

      console.warn(`${LOG} Partial biometric credentials cleaned up.`);
    } catch (cleanupError) {
      console.error(`${LOG} Secure storage cleanup failed:`, cleanupError);
    }

    throw error;
  } finally {
    console.groupEnd();
  }
};

/* =========================================================
   LOGIN WITH BIOMETRICS
========================================================= */

const loginWithBiometrics = async (): Promise<AuthUser> => {
  const operation = "loginWithBiometrics";
  const start = logStart(operation);

  try {
    ensureNative();

    console.log(`${LOG} Checking whether biometric login is enabled...`);

    const enabled = await isBiometricEnabled();

    console.log(`${LOG} Biometric login enabled:`, enabled);

    if (!enabled) {
      throw new Error(
        "Fingerprint login has not been enabled. Please log in with your PIN.",
      );
    }

    console.log(`${LOG} Starting local fingerprint verification...`);

    await authenticateFingerprint();

    console.log(`${LOG} Fingerprint verified. Reading saved token...`);

    const tokenStart = Date.now();
    const token = await SecureStorage.get(TOKEN_KEY);

    console.log(`${LOG} Saved token read completed:`, {
      duration: `${Date.now() - tokenStart}ms`,
      tokenExists: typeof token === "string" && token.length > 0,
    });

    if (typeof token !== "string" || !token) {
      throw new Error(
        "Saved login session not found. Please log in with your PIN.",
      );
    }

    console.log(`${LOG} Validating saved session with backend...`);

    const apiStart = Date.now();

    const authenticatedUser = await authApi.restoreBiometricSession(token);

    console.log(`${LOG} Backend session validation completed:`, {
      duration: `${Date.now() - apiStart}ms`,
      userAuthenticated: !!authenticatedUser,
    });

    if (!authenticatedUser) {
      throw new Error(
        "Your saved session is invalid. Please log in with your PIN.",
      );
    }

    console.log(`${LOG} Checking for refreshed authentication token...`);

    const currentToken = authApi.getToken();

    if (currentToken && currentToken !== token) {
      console.log(`${LOG} Updating saved biometric token...`);

      await SecureStorage.set(TOKEN_KEY, currentToken);
    }

    logSuccess(operation, start);

    return authenticatedUser;
  } catch (error) {
    logError(operation, start, error);
    throw error;
  }
};

/* =========================================================
   DISABLE BIOMETRIC LOGIN
========================================================= */

const disableBiometricLogin = async (): Promise<void> => {
  const operation = "disableBiometricLogin";
  const start = logStart(operation);

  try {
    ensureNative();

    console.log(`${LOG} Requesting fingerprint verification...`);

    await authenticateFingerprint();

    console.log(`${LOG} Removing saved biometric token...`);

    await SecureStorage.remove(TOKEN_KEY);

    console.log(`${LOG} Removing biometric enabled flag...`);

    await SecureStorage.remove(ENABLED_KEY);

    logSuccess(operation, start);
  } catch (error) {
    logError(operation, start, error);
    throw error;
  }
};

/* =========================================================
   EXPORT
========================================================= */

const biometricAuth = {
  isBiometricAvailable,
  getBiometricStatus,
  isBiometricEnabled,
  enableBiometricLogin,
  loginWithBiometrics,
  disableBiometricLogin,
};

export default biometricAuth;

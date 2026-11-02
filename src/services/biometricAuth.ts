
import { Capacitor } from "@capacitor/core";
import { BiometricAuth } from "@aparajita/capacitor-biometric-auth";
import { SecureStorage } from "@aparajita/capacitor-secure-storage";

import authApi, { type AuthUser } from "./AuthService";

const TOKEN_KEY = "menumoney_biometric_token";
const ENABLED_KEY = "menumoney_biometric_enabled";

/* =========================================================
   NATIVE PLATFORM CHECK
========================================================= */

const ensureNative = (): void => {
  if (!Capacitor.isNativePlatform()) {
    throw new Error(
      "Biometric login is only available in the mobile app.",
    );
  }
};

/* =========================================================
   BIOMETRIC AUTHENTICATION
========================================================= */

const authenticateFingerprint = async (): Promise<void> => {
  ensureNative();

  const result = await BiometricAuth.checkBiometry();

  if (!result.isAvailable) {
    throw new Error(
      result.reason ||
        "No enrolled fingerprint or supported biometric is available.",
    );
  }

  await BiometricAuth.authenticate({
    reason: "Verify your identity to access MenuMoney.",
    cancelTitle: "Cancel",
    allowDeviceCredential: false,
    androidTitle: "MenuMoney fingerprint login",
    androidSubtitle: "Confirm your identity",
    androidConfirmationRequired: true,
  });
};

/* =========================================================
   CHECK BIOMETRIC AVAILABILITY
========================================================= */

const isBiometricAvailable = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  const result = await BiometricAuth.checkBiometry();
  return result.isAvailable;
};

/* =========================================================
   CHECK WHETHER BIOMETRIC LOGIN IS ENABLED
========================================================= */

const isBiometricEnabled = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  const enabled = await SecureStorage.get(ENABLED_KEY);
  const token = await SecureStorage.get(TOKEN_KEY);

  return (
    enabled === true &&
    typeof token === "string" &&
    token.length > 0
  );
};

/* =========================================================
   ENABLE BIOMETRIC LOGIN
========================================================= */

const enableBiometricLogin = async (): Promise<void> => {
  ensureNative();

  const token = authApi.getToken();

  if (!token) {
    throw new Error(
      "Please log in with your PIN before enabling fingerprint login.",
    );
  }

  // Verify the user before saving the credential.
  await authenticateFingerprint();

  await SecureStorage.set(TOKEN_KEY, token);
  await SecureStorage.set(ENABLED_KEY, true);
};

/* =========================================================
   LOGIN WITH BIOMETRICS
========================================================= */

const loginWithBiometrics = async (): Promise<AuthUser> => {
  ensureNative();

  const enabled = await isBiometricEnabled();

  if (!enabled) {
    throw new Error(
      "Fingerprint login has not been enabled. Please log in with your PIN.",
    );
  }

  // Verify the user locally first.
  await authenticateFingerprint();

  const token = await SecureStorage.get(TOKEN_KEY);

  if (typeof token !== "string" || !token) {
    throw new Error(
      "Saved login session not found. Please log in with your PIN.",
    );
  }

  // Validate the saved session with the backend.
  const authenticatedUser =
    await authApi.restoreBiometricSession(token);

  if (!authenticatedUser) {
    throw new Error(
      "Your saved session is invalid. Please log in with your PIN.",
    );
  }

  const currentToken = authApi.getToken();
  if (currentToken && currentToken !== token) {
    await SecureStorage.set(TOKEN_KEY, currentToken);
  }

  return authenticatedUser;
};

/* =========================================================
   DISABLE BIOMETRIC LOGIN
========================================================= */

const disableBiometricLogin = async (): Promise<void> => {
  ensureNative();

  // Require identity verification before removing credentials.
  await authenticateFingerprint();

  await SecureStorage.remove(TOKEN_KEY);
  await SecureStorage.remove(ENABLED_KEY);
};

/* =========================================================
   EXPORT
========================================================= */

const biometricAuth = {
  isBiometricAvailable,
  isBiometricEnabled,
  enableBiometricLogin,
  loginWithBiometrics,
  disableBiometricLogin,
};

export default biometricAuth;

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import authApi, {
  type AuthUser,
  type LoginData,
  type RegisterData,
  type UserRole,
} from "../services/AuthService";

import { clearLoanWidget, syncLoanWidget } from "../services/loanWidget";

import biometricAuth from "../services/biometricAuth";

import {
  normalizeNigerianPhone,
  isValidNigerianPhone,
} from "../services/phone";

/* =========================================================
   PIN VALIDATION
========================================================= */

const isValidPin = (pin: string): boolean => {
  return /^\d{4}$/.test(pin);
};

/* =========================================================
   CONTEXT TYPE
========================================================= */

export interface AuthContextValue {
  user: AuthUser | null;

  loading: boolean;
  initializing: boolean;
  isAuthenticated: boolean;

  // Biometric state
  isBiometricAvailable: boolean;
  isBiometricEnabled: boolean;
  biometricLoading: boolean;

  // Authentication
  login(data: LoginData): Promise<AuthUser>;
  register(data: RegisterData): Promise<AuthUser>;
  logout(): Promise<void>;
  refreshUser(): Promise<AuthUser | null>;

  resetPassword(token: string, password: string): Promise<string>;

  // Biometric functions
  checkBiometricAvailability(): Promise<{
    available: boolean;
    enabled: boolean;
    error?: string;
  }>;

  enableBiometricLogin(): Promise<void>;
  disableBiometricLogin(): Promise<void>;
  loginWithBiometrics(): Promise<AuthUser>;

  // Roles
  getRole(): UserRole | null;

  hasRole(roles: UserRole | readonly UserRole[]): boolean;

  isAdmin(): boolean;
  isSuperAdmin(): boolean;
  isLoanOfficer(): boolean;
  isRiskOfficer(): boolean;
  isFinance(): boolean;
  isSupport(): boolean;
}

/* =========================================================
   CONTEXT
========================================================= */

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/* =========================================================
   PROVIDER PROPS
========================================================= */

export interface AuthProviderProps {
  children: ReactNode;
}

/* =========================================================
   AUTH PROVIDER
========================================================= */

export const AuthProvider = ({ children }: AuthProviderProps) => {
  /* =======================================================
     USER STATE
  ======================================================= */

  const [user, setUser] = useState<AuthUser | null>(() => authApi.getUser());

  /* =======================================================
     LOADING STATES
  ======================================================= */

  const [loading, setLoading] = useState(false);

  const [initializing, setInitializing] = useState(true);

  const [biometricLoading, setBiometricLoading] = useState(false);

  /* =======================================================
     BIOMETRIC STATES

     Availability and registration are independent
     from the visibility of the fingerprint icon.
  ======================================================= */

  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);

  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);

  /* =======================================================
     RESTORE SESSION
  ======================================================= */

  const restoreSession = useCallback(async (): Promise<void> => {
    try {
      const token = authApi.getToken();

      if (!token) {
        setUser(null);
        return;
      }

      const currentUser = await authApi.getMe();

      setUser(currentUser);
    } catch (error) {
      console.error("Session restoration failed:", error);

      setUser(null);
    } finally {
      setInitializing(false);
    }
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  /* =======================================================
     CHECK BIOMETRIC AVAILABILITY

     This function does not enable biometrics.
     It only checks device support and saved registration.
  ======================================================= */

  const checkBiometricAvailability = useCallback(async (): Promise<{
    available: boolean;
    enabled: boolean;
    error?: string;
  }> => {
    console.group("[AuthContext] CHECK BIOMETRIC AVAILABILITY");

    try {
      console.log("[AuthContext] Calling getBiometricStatus...");

      const status = await biometricAuth.getBiometricStatus();

      console.log("[AuthContext] Device status:", {
        available: status.isAvailable,
        biometryType: status.biometryType,
        biometryTypes: status.biometryTypes,
        deviceIsSecure: status.deviceIsSecure,
        reason: status.reason,
        code: status.code,
      });

      let enabled = false;

      if (status.isAvailable) {
        console.log("[AuthContext] Checking saved biometric credentials...");

        enabled = await biometricAuth.isBiometricEnabled();
      }

      setIsBiometricAvailable(status.isAvailable);
      setIsBiometricEnabled(enabled);

      console.log("[AuthContext] Final biometric state:", {
        available: status.isAvailable,
        enabled,
      });

      return {
        available: status.isAvailable,
        enabled,
        ...(!status.isAvailable && status.reason
          ? { error: status.reason }
          : {}),
      };
    } catch (error) {
      console.error("[AuthContext] Availability check failed:", error);

      setIsBiometricAvailable(false);
      setIsBiometricEnabled(false);

      return {
        available: false,
        enabled: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to check biometric availability.",
      };
    } finally {
      console.groupEnd();
    }
  }, []);

  /* =======================================================
     INITIAL BIOMETRIC CHECK
  ======================================================= */

  useEffect(() => {
    void checkBiometricAvailability();
  }, [checkBiometricAvailability]);

  /* =======================================================
     UNAUTHORIZED EVENT
  ======================================================= */

  useEffect(() => {
    const handleUnauthorized = (): void => {
      setUser(null);
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);

    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, []);

  /* =======================================================
     ANDROID LOAN WIDGET SYNC AND PRIVACY
  ======================================================= */

  useEffect(() => {
    const clearWidget = (): void => {
      void clearLoanWidget().catch((error) => {
        console.error("clearLoanWidget failed:", error);
      });
    };

    const syncWidget = (): void => {
      if (document.visibilityState === "visible" && user) {
        void syncLoanWidget().catch((error) => {
          console.error("syncLoanWidget failed:", error);
        });
      }
    };

    if (user) {
      syncWidget();

      document.addEventListener("visibilitychange", syncWidget);
    } else {
      clearWidget();
    }

    return () => {
      document.removeEventListener("visibilitychange", syncWidget);
    };
  }, [user, initializing]);

  /* =======================================================
     NORMAL PIN LOGIN
  ======================================================= */

 const login = useCallback(
  async (data: LoginData): Promise<AuthUser> => {
    console.group("[AuthContext] PIN LOGIN");

    setLoading(true);

    try {
      console.log("[AuthContext] Starting PIN validation...");

      if (!isValidPin(data.password)) {
        throw new Error("PIN must be exactly 4 digits.");
      }

      const identifier = data.identifier.trim();

      const normalizedIdentifier = isValidNigerianPhone(identifier)
        ? normalizeNigerianPhone(identifier)
        : identifier;

      const loginData: LoginData = {
        ...data,
        identifier: normalizedIdentifier,
      };

      console.log("[AuthContext] Sending login request:", {
        identifier: normalizedIdentifier,
        pinProvided: !!data.password,
      });

      const authenticatedUser = await authApi.login(loginData);

      console.log("[AuthContext] PIN LOGIN SUCCESS:", {
        userExists: !!authenticatedUser,
        userId: authenticatedUser?._id,
        role: authenticatedUser?.role,
        tokenExists: !!authApi.getToken(),
        storedUserExists: !!authApi.getUser(),
      });

      if (!authApi.getToken()) {
        throw new Error(
          "Login succeeded but the authentication token was not saved.",
        );
      }

      setUser(authenticatedUser);

      console.log("[AuthContext] React user state updated.");

      // Check biometric availability after successful PIN login.
      const biometricStatus = await checkBiometricAvailability();

      console.log("[AuthContext] Post-login biometric status:", {
        available: biometricStatus.available,
        enabled: biometricStatus.enabled,
        error: biometricStatus.error,
      });

      return authenticatedUser;
    } catch (error) {
      console.error("[AuthContext] PIN LOGIN FAILED:", error);
      throw error;
    } finally {
      setLoading(false);
      console.groupEnd();
    }
  },
  [checkBiometricAvailability],
);

  /* =======================================================
     REGISTER
  ======================================================= */

  const register = useCallback(
    async (data: RegisterData): Promise<AuthUser> => {
      setLoading(true);

      try {
        if (!isValidPin(data.password)) {
          throw new Error("PIN must be exactly 4 digits.");
        }

        if (!isValidPin(data.confirmPassword)) {
          throw new Error("Confirm PIN must be exactly 4 digits.");
        }

        if (data.password !== data.confirmPassword) {
          throw new Error("PINs do not match.");
        }

        const normalizedPhone = data.phone
          ? normalizeNigerianPhone(data.phone)
          : data.phone;

        const registerData: RegisterData = {
          ...data,
          phone: normalizedPhone,
        };

        const authenticatedUser = await authApi.register(registerData);

        setUser(authenticatedUser);

        await checkBiometricAvailability();

        return authenticatedUser;
      } finally {
        setLoading(false);
      }
    },
    [checkBiometricAvailability],
  );

  /* =======================================================
     ENABLE BIOMETRIC LOGIN
  ======================================================= */

  const enableBiometricLogin = useCallback(async (): Promise<void> => {
    console.group("[AuthContext] ENABLE FINGERPRINT LOGIN");

    setBiometricLoading(true);

    try {
      console.log("[AuthContext] Checking authenticated user...");

      const token = authApi.getToken();
      const authenticatedUser = authApi.getUser();

      console.log("[AuthContext] Enrollment authentication check:", {
        contextUserExists: !!user,
        storedUserExists: !!authenticatedUser,
        tokenExists: !!token,
        userId: authenticatedUser?._id,
      });

      if (!token) {
        throw new Error(
          "Authentication token is missing. Complete PIN login before enabling biometrics.",
        );
      }

      if (!user && !authenticatedUser) {
        throw new Error(
          "Authenticated user not found. Please complete PIN login first.",
        );
      }

      console.log("[AuthContext] User authenticated:", !!user);
      console.log("[AuthContext] Authentication token exists:", !!token);

      // STEP 1: Check device biometric availability
      console.log("[AuthContext] Checking biometric availability...");

      const status = await biometricAuth.getBiometricStatus();

      console.log("[AuthContext] Device biometric status:", {
        isAvailable: status.isAvailable,
        biometryType: status.biometryType,
        biometryTypes: status.biometryTypes,
        strongBiometryIsAvailable: status.strongBiometryIsAvailable,
        deviceIsSecure: status.deviceIsSecure,
        reason: status.reason,
        code: status.code,
      });

      setIsBiometricAvailable(status.isAvailable);

      if (!status.isAvailable) {
        throw new Error(
          status.reason || "Fingerprint authentication is unavailable.",
        );
      }

      // STEP 2: Start fingerprint enrollment
      console.log(
        "[AuthContext] Calling biometricAuth.enableBiometricLogin()...",
      );

      await biometricAuth.enableBiometricLogin();

      console.log("[AuthContext] Fingerprint authentication completed.");

      // STEP 3: Verify saved credentials
      console.log("[AuthContext] Verifying secure storage...");

      const enabled = await biometricAuth.isBiometricEnabled();

      console.log("[AuthContext] Secure storage result:", enabled);

      if (!enabled) {
        throw new Error(
          "Fingerprint login could not be enabled. Please try again.",
        );
      }

      // STEP 4: Update React state
      setIsBiometricAvailable(true);
      setIsBiometricEnabled(true);

      console.log("[AuthContext] SUCCESS: Fingerprint login enabled.");
    } catch (error) {
      console.error("[AuthContext] FINGERPRINT ENROLLMENT FAILED:", error);

      throw error;
    } finally {
      setBiometricLoading(false);
      console.groupEnd();
    }
  }, [user]);

  /* =======================================================
     DISABLE BIOMETRIC LOGIN
  ======================================================= */

  const disableBiometricLogin = useCallback(async (): Promise<void> => {
    setBiometricLoading(true);

    try {
      await biometricAuth.disableBiometricLogin();

      setIsBiometricEnabled(false);
    } finally {
      setBiometricLoading(false);
    }
  }, []);

  /* =======================================================
     LOGIN WITH BIOMETRICS
  ======================================================= */

  const loginWithBiometrics = useCallback(async (): Promise<AuthUser> => {
    console.group("[AuthContext] FINGERPRINT LOGIN");

    setLoading(true);
    setBiometricLoading(true);

    try {
      console.log("[AuthContext] Starting biometric login...");

      const authenticatedUser = await biometricAuth.loginWithBiometrics();

      console.log(
        "[AuthContext] Backend authentication successful:",
        !!authenticatedUser,
      );

      setUser(authenticatedUser);

      setIsBiometricAvailable(true);
      setIsBiometricEnabled(true);

      return authenticatedUser;
    } catch (error) {
      console.error("[AuthContext] Fingerprint login failed:", error);

      throw error;
    } finally {
      setBiometricLoading(false);
      setLoading(false);
      console.groupEnd();
    }
  }, []);

  /* =======================================================
     LOGOUT
  ======================================================= */

  const logout = useCallback(async (): Promise<void> => {
    setLoading(true);

    try {
      await authApi.logout();
    } finally {
      try {
        await clearLoanWidget();
      } catch (error) {
        console.error("Loan widget cleanup failed:", error);
      }

      // Preserve biometric credentials.
      // Logout must not automatically disable
      // fingerprint login.

      setUser(null);
      setLoading(false);
    }
  }, []);

  /* =======================================================
     REFRESH USER
  ======================================================= */

  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    const token = authApi.getToken();

    if (!token) {
      setUser(null);
      return null;
    }

    try {
      const currentUser = await authApi.getMe();

      setUser(currentUser);

      return currentUser;
    } catch (error) {
      console.error("User refresh failed:", error);

      setUser(null);

      return null;
    }
  }, []);

  /* =======================================================
     RESET PASSWORD / PIN
  ======================================================= */

  const resetPassword = useCallback(
    async (token: string, password: string): Promise<string> => {
      if (!isValidPin(password)) {
        throw new Error("PIN must be exactly 4 digits.");
      }

      setLoading(true);

      try {
        const response = await authApi.resetPassword(token, password);

        return response?.message || "PIN reset successfully";
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /* =======================================================
     ROLE HELPERS
  ======================================================= */

  const getRole = useCallback((): UserRole | null => {
    return user?.role ?? null;
  }, [user]);

  const hasRole = useCallback(
    (roles: UserRole | readonly UserRole[]): boolean => {
      if (!user) {
        return false;
      }

      const allowedRoles: readonly UserRole[] = Array.isArray(roles)
        ? (roles as readonly UserRole[])
        : [roles as UserRole];

      return allowedRoles.includes(user.role);
    },
    [user],
  );

  /* =======================================================
     ADMIN
  ======================================================= */

  const isAdmin = useCallback((): boolean => {
    return user?.role === "admin" || user?.role === "super_admin";
  }, [user]);

  /* =======================================================
     SUPER ADMIN
  ======================================================= */

  const isSuperAdmin = useCallback((): boolean => {
    return user?.role === "super_admin";
  }, [user]);

  /* =======================================================
     LOAN OFFICER
  ======================================================= */

  const isLoanOfficer = useCallback((): boolean => {
    return user?.role === "loan_officer";
  }, [user]);

  /* =======================================================
     RISK OFFICER
  ======================================================= */

  const isRiskOfficer = useCallback((): boolean => {
    return user?.role === "risk_officer";
  }, [user]);

  /* =======================================================
     FINANCE
  ======================================================= */

  const isFinance = useCallback((): boolean => {
    return user?.role === "finance";
  }, [user]);

  /* =======================================================
     SUPPORT
  ======================================================= */

  const isSupport = useCallback((): boolean => {
    return user?.role === "support";
  }, [user]);

  /* =======================================================
     AUTHENTICATED STATE
  ======================================================= */

  const isAuthenticated = Boolean(user && authApi.getToken());

  /* =======================================================
     CONTEXT VALUE
  ======================================================= */

  const value = useMemo<AuthContextValue>(
    () => ({
      user,

      loading,
      initializing,
      isAuthenticated,

      isBiometricAvailable,
      isBiometricEnabled,
      biometricLoading,

      login,
      register,
      logout,
      refreshUser,
      resetPassword,

      checkBiometricAvailability,
      enableBiometricLogin,
      disableBiometricLogin,
      loginWithBiometrics,

      getRole,
      hasRole,

      isAdmin,
      isSuperAdmin,
      isLoanOfficer,
      isRiskOfficer,
      isFinance,
      isSupport,
    }),
    [
      user,
      loading,
      initializing,
      isAuthenticated,

      isBiometricAvailable,
      isBiometricEnabled,
      biometricLoading,

      login,
      register,
      logout,
      refreshUser,
      resetPassword,

      checkBiometricAvailability,
      enableBiometricLogin,
      disableBiometricLogin,
      loginWithBiometrics,

      getRole,
      hasRole,

      isAdmin,
      isSuperAdmin,
      isLoanOfficer,
      isRiskOfficer,
      isFinance,
      isSupport,
    ],
  );

  /* =======================================================
     PROVIDER
  ======================================================= */

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/* =========================================================
   USE AUTH HOOK
========================================================= */

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};

export default AuthContext;

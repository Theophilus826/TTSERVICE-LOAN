
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

import {
  clearLoanWidget,
  syncLoanWidget,
} from "../services/loanWidget";

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

  resetPassword(
    token: string,
    password: string,
  ): Promise<string>;

  // Biometric functions
  checkBiometricAvailability(): Promise<void>;

  enableBiometricLogin(): Promise<void>;

  disableBiometricLogin(): Promise<void>;

  loginWithBiometrics(): Promise<AuthUser>;

  // Roles
  getRole(): UserRole | null;

  hasRole(
    roles: UserRole | readonly UserRole[],
  ): boolean;

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

const AuthContext = createContext<
  AuthContextValue | undefined
>(undefined);

/* =========================================================
   PROVIDER PROPS
========================================================= */

export interface AuthProviderProps {
  children: ReactNode;
}

/* =========================================================
   AUTH PROVIDER
========================================================= */

export const AuthProvider = ({
  children,
}: AuthProviderProps) => {

  /* =======================================================
     USER STATE
  ======================================================= */

  const [user, setUser] = useState<AuthUser | null>(
    () => authApi.getUser(),
  );

  /* =======================================================
     LOADING STATES
  ======================================================= */

  const [loading, setLoading] = useState<boolean>(false);

  const [initializing, setInitializing] = useState<boolean>(true);

  const [biometricLoading, setBiometricLoading] =
    useState<boolean>(false);

  /* =======================================================
     BIOMETRIC STATES
  ======================================================= */

  const [isBiometricAvailable, setIsBiometricAvailable] =
    useState<boolean>(false);

  const [isBiometricEnabled, setIsBiometricEnabled] =
    useState<boolean>(false);

  /* =======================================================
     RESTORE SESSION
  ======================================================= */

  const restoreSession = useCallback(async (): Promise<void> => {
    const token = authApi.getToken();

    if (!token) {
      setUser(null);
      setInitializing(false);
      return;
    }

    try {
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
  ======================================================= */

  const checkBiometricAvailability =
    useCallback(async (): Promise<void> => {
      try {
        const available =
          await biometricAuth.isBiometricAvailable();

        const enabled =
          available &&
          await biometricAuth.isBiometricEnabled();

        setIsBiometricAvailable(available);
        setIsBiometricEnabled(enabled);
      } catch (error) {
        console.error(
          "Biometric availability check failed:",
          error,
        );

        setIsBiometricAvailable(false);
        setIsBiometricEnabled(false);
      }
    }, []);

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

    window.addEventListener(
      "auth:unauthorized",
      handleUnauthorized,
    );

    return () => {
      window.removeEventListener(
        "auth:unauthorized",
        handleUnauthorized,
      );
    };
  }, []);

  /* =======================================================
     ANDROID LOAN WIDGET SYNC AND PRIVACY
  ======================================================= */

  useEffect(() => {
    const clearWidget = (): void => {
      void clearLoanWidget().catch((error) => {
        console.error(
          "clearLoanWidget failed:",
          error,
        );
      });
    };

    const syncWidget = (): void => {
      if (
        document.visibilityState === "visible" &&
        user
      ) {
        void syncLoanWidget().catch((error) => {
          console.error(
            "syncLoanWidget failed:",
            error,
          );
        });
      }
    };

    if (user) {
      syncWidget();

      document.addEventListener(
        "visibilitychange",
        syncWidget,
      );
    } else {
      clearWidget();
    }

    return () => {
      document.removeEventListener(
        "visibilitychange",
        syncWidget,
      );
    };
  }, [user, initializing]);

  /* =======================================================
     NORMAL LOGIN
  ======================================================= */

  const login = useCallback(
    async (data: LoginData): Promise<AuthUser> => {
      setLoading(true);

      try {
        if (!isValidPin(data.password)) {
          throw new Error(
            "PIN must be exactly 4 digits.",
          );
        }

        const identifier =
          data.identifier.trim();

        const normalizedIdentifier =
          isValidNigerianPhone(identifier)
            ? normalizeNigerianPhone(identifier)
            : identifier;

        const loginData: LoginData = {
          ...data,
          identifier: normalizedIdentifier,
        };

        const authenticatedUser =
          await authApi.login(loginData);

        setUser(authenticatedUser);

        // Check whether biometric login is available.
        await checkBiometricAvailability();

        return authenticatedUser;
      } finally {
        setLoading(false);
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
          throw new Error(
            "PIN must be exactly 4 digits.",
          );
        }

        if (!isValidPin(data.confirmPassword)) {
          throw new Error(
            "Confirm PIN must be exactly 4 digits.",
          );
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

        const authenticatedUser =
          await authApi.register(registerData);

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

  const enableBiometricLogin =
    useCallback(async (): Promise<void> => {
      setBiometricLoading(true);

      try {
        if (!user || !authApi.getToken()) {
          throw new Error(
            "Please log in with your PIN first.",
          );
        }

        const available =
          await biometricAuth.isBiometricAvailable();

        if (!available) {
          throw new Error(
            "Fingerprint authentication is not available on this device.",
          );
        }

        await biometricAuth.enableBiometricLogin();

        setIsBiometricAvailable(true);
        setIsBiometricEnabled(true);
      } finally {
        setBiometricLoading(false);
      }
    }, [user]);

  /* =======================================================
     DISABLE BIOMETRIC LOGIN
  ======================================================= */

  const disableBiometricLogin =
    useCallback(async (): Promise<void> => {
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

  const loginWithBiometrics =
    useCallback(async (): Promise<AuthUser> => {
      setLoading(true);
      setBiometricLoading(true);

      try {
        const available =
          await biometricAuth.isBiometricAvailable();

        if (!available) {
          throw new Error(
            "Fingerprint authentication is unavailable.",
          );
        }

        const authenticatedUser =
          await biometricAuth.loginWithBiometrics();

        setUser(authenticatedUser);

        return authenticatedUser;
      } catch (error) {
        setUser(null);
        throw error;
      } finally {
        setBiometricLoading(false);
        setLoading(false);
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
        console.error(
          "Loan widget cleanup failed:",
          error,
        );
      }

      // Do not delete biometric credentials here.
      // The user can still use fingerprint login
      // the next time they open MenuMoney.

      setUser(null);
      setLoading(false);
    }
  }, []);

  /* =======================================================
     REFRESH USER
  ======================================================= */

  const refreshUser = useCallback(
    async (): Promise<AuthUser | null> => {
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
    },
    [],
  );

  /* =======================================================
     RESET PASSWORD / PIN
  ======================================================= */

  const resetPassword = useCallback(
    async (
      token: string,
      password: string,
    ): Promise<string> => {
      if (!isValidPin(password)) {
        throw new Error(
          "PIN must be exactly 4 digits.",
        );
      }

      setLoading(true);

      try {
        const response =
          await authApi.resetPassword(
            token,
            password,
          );

        return (
          response?.message ||
          "PIN reset successfully"
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /* =======================================================
     ROLE HELPERS
  ======================================================= */

  const getRole = useCallback(
    (): UserRole | null => {
      return user?.role ?? null;
    },
    [user],
  );

  const hasRole = useCallback(
    (
      roles: UserRole | readonly UserRole[],
    ): boolean => {
      if (!user) {
        return false;
      }

      const allowedRoles = Array.isArray(roles)
        ? roles
        : [roles];

      return allowedRoles.includes(user.role);
    },
    [user],
  );

  /* =======================================================
     ADMIN
  ======================================================= */

  const isAdmin = useCallback((): boolean => {
    return (
      user?.role === "admin" ||
      user?.role === "super_admin"
    );
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

  const isAuthenticated = Boolean(
    user && authApi.getToken(),
  );

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

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/* =========================================================
   USE AUTH HOOK
========================================================= */

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within an AuthProvider",
    );
  }

  return context;
};

export default AuthContext;

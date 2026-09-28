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

  login(data: LoginData): Promise<AuthUser>;

  register(data: RegisterData): Promise<AuthUser>;

  logout(): Promise<void>;

  refreshUser(): Promise<AuthUser | null>;

  resetPassword(token: string, password: string): Promise<string>;

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
   AUTH PROVIDER
========================================================= */

export interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  /* =======================================================
     USER STATE
  ======================================================= */

  const [user, setUser] = useState<AuthUser | null>(() => authApi.getUser());

  /* =======================================================
     LOADING STATE
  ======================================================= */

  const [loading, setLoading] = useState<boolean>(false);

  const [initializing, setInitializing] = useState<boolean>(true);

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

      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setInitializing(false);
    }
  }, []);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

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
     LOGIN
  ======================================================= */

  const login = useCallback(async (data: LoginData): Promise<AuthUser> => {
    setLoading(true);

    try {
      /*
       * Validate 4-digit PIN.
       *
       * This assumes LoginData.password
       * is the PIN used for authentication.
       */

      if ("password" in data && typeof data.password === "string") {
        if (!isValidPin(data.password)) {
          throw new Error("PIN must be exactly 4 digits.");
        }
      }

      const normalizedIdentifier =
        data.identifier && isValidNigerianPhone(data.identifier)
          ? normalizeNigerianPhone(data.identifier)
          : data.identifier;

      const loginData = {
        ...data,
        identifier: normalizedIdentifier,
      };

      const authenticatedUser = await authApi.login(loginData);

      setUser(authenticatedUser);

      return authenticatedUser;
    } finally {
      setLoading(false);
    }
  }, []);

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

        const registerData = {
          ...data,
          phone: normalizedPhone,
        };

        const authenticatedUser = await authApi.register(registerData);

        setUser(authenticatedUser);

        return authenticatedUser;
      } catch (error) {
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /* =======================================================
     LOGOUT
  ======================================================= */

  const logout = useCallback(async (): Promise<void> => {
    setLoading(true);

    try {
      await authApi.logout();
    } finally {
      /*
       * Always clear the React session,
       * regardless of backend logout result.
       */

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
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  /* =======================================================
     RESET PASSWORD / PIN
  ======================================================= */

  const resetPassword = useCallback(
    async (token: string, password: string): Promise<string> => {
      /*
       * Treat reset password as a 4-digit PIN.
       */

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

      const allowedRoles = Array.isArray(roles) ? roles : [roles];

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

      login,
      register,
      logout,
      refreshUser,
      resetPassword,

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

      login,
      register,
      logout,
      refreshUser,
      resetPassword,

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

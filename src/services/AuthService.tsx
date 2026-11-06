import axios from "axios";
import API from "./Api";

/* =========================================================
   CONFIGURATION
========================================================= */

const USERS_BASE_URL = "/users";

const TOKEN_KEY = "token";
const USER_KEY = "user";
const USER_ID_KEY = "userId";

/* =========================================================
   USER ROLES
========================================================= */

export type UserRole =
  | "customer"
  | "admin"
  | "super_admin"
  | "loan_officer"
  | "risk_officer"
  | "finance"
  | "support";

/* =========================================================
   ACCOUNT STATUS
========================================================= */

export type AccountStatus = "active" | "suspended" | "blocked" | "closed";

/* =========================================================
   KYC STATUS
========================================================= */

export type KycStatus =
  | "not_started"
  | "pending"
  | "under_review"
  | "verified"
  | "rejected";

/* =========================================================
   BORROWER STATUS
========================================================= */

export type BorrowerStatus =
  | "new"
  | "eligible"
  | "restricted"
  | "suspended"
  | "blacklisted";

/* =========================================================
   AUTH USER
========================================================= */

export interface AuthUser {
  _id: string;

  name: string;

  firstName?: string;

  lastName?: string;

  email?: string | null;

  phone?: string | null;

  avatar?: string | null;

  token: string;

  role: UserRole;

  isAdmin: boolean;

  coins?: number;

  isVerified?: boolean;

  emailVerified?: boolean;

  phoneVerified?: boolean;

  online?: boolean;

  lastActive?: string;

  lastLoginAt?: string | null;

  accountStatus?: AccountStatus;

  kycStatus?: KycStatus;

  borrowerStatus?: BorrowerStatus;

  referralCode?: string;

  referredBy?: string | null;

  createdAt?: string;

  updatedAt?: string;
}

/* =========================================================
   LOGIN DATA
========================================================= */

export interface LoginData {
  identifier: string;

  /**
   * 4-digit numeric PIN.
   *
   * Kept as "password" because the backend
   * authentication API expects the password field.
   */
  password: string;
}

/* =========================================================
   REGISTER DATA
========================================================= */

export interface RegisterData {
  name: string;

  email?: string;

  phone?: string;

  /**
   * 4-digit numeric PIN.
   */
  password: string;

  /**
   * Must match the 4-digit PIN.
   */
  confirmPassword: string;

  referralCode?: string;
}

/* =========================================================
   BACKEND USER
========================================================= */

interface BackendUser {
  _id: string;

  name?: string;

  firstName?: string;

  lastName?: string;

  email?: string | null;

  phone?: string | null;

  avatar?: string | null;

  role?: UserRole;

  isAdmin?: boolean;

  coins?: number;

  isVerified?: boolean;

  emailVerified?: boolean;

  phoneVerified?: boolean;

  online?: boolean;

  lastActive?: string;

  lastLoginAt?: string | null;

  accountStatus?: AccountStatus;

  kycStatus?: KycStatus;

  borrowerStatus?: BorrowerStatus;

  referralCode?: string;

  referredBy?: string | null;

  createdAt?: string;

  updatedAt?: string;
}

/* =========================================================
   API RESPONSES
========================================================= */

interface AuthResponse {
  success: boolean;
  message?: string;
  data?: BackendUser;
  token?: string;
  accessToken?: string;
  expiresIn?: number;
  session?: {
    id: string;
    deviceId?: string;
    deviceName?: string;
    expiresAt?: string;
  };
}

interface GenericResponse<T = unknown> {
  success?: boolean;

  message?: string;

  data?: T;
}

/* =========================================================
   PIN VALIDATION
========================================================= */

/**
 * Authentication PIN must be exactly
 * four numeric digits.
 *
 * Examples:
 *
 * 1234 -> valid
 * 0000 -> valid
 * 9876 -> valid
 * 123  -> invalid
 * 12345 -> invalid
 * abcd -> invalid
 */

const getAccessToken = (data: AuthResponse): string | undefined => {
  return data.accessToken || data.token;
};

const isValidPin = (pin: string): boolean => {
  return /^\d{4}$/.test(pin);
};

/**
 * Validate a PIN and throw a useful
 * error when it is invalid.
 */
const validatePin = (pin: string, fieldName = "PIN"): void => {
  if (!pin) {
    throw new Error(`${fieldName} is required.`);
  }

  if (!isValidPin(pin)) {
    throw new Error(`${fieldName} must be exactly 4 digits.`);
  }
};

/* =========================================================
   NORMALIZE ROLE
========================================================= */

const normalizeRole = (data: BackendUser): UserRole => {
  /*
   * Prefer the explicit role returned
   * by the backend.
   */

  if (data.role) {
    return data.role;
  }

  /*
   * Backward compatibility for older
   * backend responses.
   */

  if (data.isAdmin === true) {
    return "admin";
  }

  return "customer";
};

/* =========================================================
   ADMIN ROLE CHECK
========================================================= */

const roleIsAdmin = (role: UserRole): boolean => {
  return role === "admin" || role === "super_admin";
};

/* =========================================================
   BUILD AUTH USER
========================================================= */

const buildAuthUser = (data: BackendUser, token: string): AuthUser => {
  if (!data?._id) {
    throw new Error("Authenticated user ID was not returned.");
  }

  if (!token) {
    throw new Error("Authentication token was not returned.");
  }

  const role = normalizeRole(data);

  const fullName = data.name?.trim() || "User";

  const [firstNameFromName, ...lastNameParts] = fullName.split(/\s+/);

  const firstName = data.firstName?.trim() || firstNameFromName || "User";

  const lastName = data.lastName?.trim() || lastNameParts.join(" ") || "";

  return {
    _id: String(data._id),

    name: fullName,

    firstName,

    lastName,

    email: data.email ?? null,

    phone: data.phone ?? null,

    avatar: data.avatar ?? null,

    token,

    role,

    isAdmin: roleIsAdmin(role),

    coins: data.coins ?? 0,

    isVerified: data.isVerified ?? false,

    emailVerified: data.emailVerified ?? false,

    phoneVerified: data.phoneVerified ?? false,

    online: data.online ?? false,

    lastActive: data.lastActive,

    lastLoginAt: data.lastLoginAt ?? null,

    accountStatus: data.accountStatus ?? "active",

    kycStatus: data.kycStatus ?? "not_started",

    borrowerStatus: data.borrowerStatus ?? "new",

    referralCode: data.referralCode,

    referredBy: data.referredBy ?? null,

    createdAt: data.createdAt,

    updatedAt: data.updatedAt,
  };
};

/* =========================================================
   SAVE AUTH
========================================================= */

const saveAuth = (data: BackendUser, token: string): AuthUser => {
  const user = buildAuthUser(data, token);

  localStorage.setItem(TOKEN_KEY, user.token);

  localStorage.setItem(USER_KEY, JSON.stringify(user));

  localStorage.setItem(USER_ID_KEY, user._id);

  return user;
};

/* =========================================================
   CLEAR AUTH
========================================================= */

const clearAuth = (): void => {
  localStorage.removeItem(TOKEN_KEY);

  localStorage.removeItem(USER_KEY);

  localStorage.removeItem(USER_ID_KEY);
};

/* =========================================================
   PHONE NUMBER NORMALIZATION
========================================================= */

/**
 * Convert Nigerian phone numbers to E.164 format:
 *
 * 08012345678     -> +2348012345678
 * 8012345678      -> +2348012345678
 * 2348012345678   -> +2348012345678
 * +2348012345678  -> +2348012345678
 *
 * Spaces, "-", "(", ")" are also removed.
 */
const normalizeNigerianPhone = (phone: string): string => {
  let value = phone.trim();

  /*
   * Remove everything except digits.
   */
  value = value.replace(/\D/g, "");

  /*
   * 08012345678
   * -> 2348012345678
   */
  if (value.startsWith("0")) {
    value = `234${value.slice(1)}`;
  } else if (
    /*
     * 8012345678
     * 7012345678
     * 9012345678
     *
     * -> 2348012345678
     */
    value.startsWith("7") ||
    value.startsWith("8") ||
    value.startsWith("9")
  ) {
    value = `234${value}`;
  }

  /*
   * 2348012345678
   * -> +2348012345678
   */
  if (value.startsWith("234")) {
    return `+${value}`;
  }

  return phone.trim();
};

/* =========================================================
   VALIDATE NIGERIAN PHONE
========================================================= */

const isValidNigerianPhone = (phone: string): boolean => {
  const normalized = normalizeNigerianPhone(phone);

  return /^\+234[789]\d{9}$/.test(normalized);
};

/* =========================================================
   REGISTER
========================================================= */

const register = async (userData: RegisterData): Promise<AuthUser> => {
  /* -------------------------------------------------------
     VALIDATE PIN
  ------------------------------------------------------- */

  validatePin(userData.password, "PIN");
  validatePin(userData.confirmPassword, "Confirm PIN");

  if (userData.password !== userData.confirmPassword) {
    throw new Error("PINs do not match.");
  }

  /* -------------------------------------------------------
     VALIDATE NAME
  ------------------------------------------------------- */

  const name = userData.name.trim();

  if (!name) {
    throw new Error("Please enter your name.");
  }

  if (name.length < 2) {
    throw new Error("Name must be at least 2 characters.");
  }

  /* -------------------------------------------------------
     EMAIL / PHONE
  ------------------------------------------------------- */

  const email = userData.email?.trim().toLowerCase();
  const phone = userData.phone?.trim();

  if (!email && !phone) {
    throw new Error("Please enter an email address or phone number.");
  }

  /* -------------------------------------------------------
     VALIDATE EMAIL
  ------------------------------------------------------- */

  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      throw new Error("Please enter a valid email address.");
    }
  }

  /* -------------------------------------------------------
     VALIDATE PHONE
  ------------------------------------------------------- */

  const normalizedPhone = phone ? normalizeNigerianPhone(phone) : undefined;

  if (normalizedPhone && !isValidNigerianPhone(normalizedPhone)) {
    throw new Error("Please enter a valid Nigerian phone number.");
  }

  /* -------------------------------------------------------
     REQUEST DATA
  ------------------------------------------------------- */

  const registerData: RegisterData = {
    name,

    ...(email ? { email } : {}),

    ...(normalizedPhone ? { phone: normalizedPhone } : {}),

    password: userData.password,

    confirmPassword: userData.confirmPassword,

    ...(userData.referralCode?.trim()
      ? { referralCode: userData.referralCode.trim() }
      : {}),
  };

  /* -------------------------------------------------------
     API REQUEST
     Create user + device session
  ------------------------------------------------------- */

  const response = await API.post<AuthResponse>(
    `${USERS_BASE_URL}/register`,
    registerData,
    {
      withCredentials: true,
    },
  );

  const data = response.data;

  /* -------------------------------------------------------
     VALIDATE RESPONSE
  ------------------------------------------------------- */

  if (!data?.success) {
    throw new Error(data?.message || "Registration failed.");
  }

  if (!data.data?._id) {
    throw new Error("Authenticated user ID was not returned.");
  }

  /* -------------------------------------------------------
     GET ACCESS TOKEN
  ------------------------------------------------------- */

  const accessToken = data.accessToken || data.token;

  if (!accessToken) {
    throw new Error("Authentication token was not returned.");
  }

  /* -------------------------------------------------------
     SAVE AUTHENTICATED USER
  ------------------------------------------------------- */

  const authenticatedUser = saveAuth(data.data, accessToken);

  /* -------------------------------------------------------
     RETURN AUTHENTICATED USER
  ------------------------------------------------------- */

  return authenticatedUser;
};

/* =========================================================
   LOGIN
========================================================= */

const login = async (userData: LoginData): Promise<AuthUser> => {
  /* -------------------------------------------------------
     VALIDATE PIN
  ------------------------------------------------------- */

  validatePin(userData.password, "PIN");

  /* -------------------------------------------------------
     IDENTIFIER
  ------------------------------------------------------- */

  const identifier = userData.identifier.trim();

  if (!identifier) {
    throw new Error("Email or phone number is required.");
  }

  /*
   * Email: lowercase and normalize.
   * Phone: convert to Nigerian +234 format.
   */

  const isEmail = identifier.includes("@");

  const normalizedIdentifier = isEmail
    ? identifier.toLowerCase()
    : normalizeNigerianPhone(identifier);

  /* -------------------------------------------------------
     VALIDATE PHONE
  ------------------------------------------------------- */

  if (!isEmail && !isValidNigerianPhone(normalizedIdentifier)) {
    throw new Error("Please enter a valid Nigerian phone number or email.");
  }

  /* -------------------------------------------------------
     API REQUEST
     Authenticate user + create device session
  ------------------------------------------------------- */

  const response = await API.post<AuthResponse>(
    `${USERS_BASE_URL}/login`,
    {
      identifier: normalizedIdentifier,
      password: userData.password,
    },
    {
      withCredentials: true,
    },
  );

  const data = response.data;

  /* -------------------------------------------------------
     VALIDATE RESPONSE
  ------------------------------------------------------- */

  if (!data?.success) {
    throw new Error(data?.message || "Login failed.");
  }

  if (!data.data?._id) {
    throw new Error("Authenticated user ID was not returned.");
  }

  /* -------------------------------------------------------
     GET ACCESS TOKEN
  ------------------------------------------------------- */

  const accessToken = data.accessToken || data.token;

  if (!accessToken) {
    throw new Error("Authentication token was not returned.");
  }

  /* -------------------------------------------------------
     SAVE AUTHENTICATED USER
  ------------------------------------------------------- */

  const authenticatedUser = saveAuth(data.data, accessToken);

  /* -------------------------------------------------------
     RETURN USER
  ------------------------------------------------------- */

  return authenticatedUser;
};

/* =========================================================
   REFRESH ACCESS TOKEN
========================================================= */

const refreshAccessToken = async (): Promise<string> => {
  const response = await API.post<AuthResponse>(
    `${USERS_BASE_URL}/refresh-token`,
    {},
    { withCredentials: true },
  );

  const data = response.data;
  const accessToken = getAccessToken(data);

  if (!data?.success || !accessToken) {
    clearAuth();
    throw new Error("Session expired. Please log in again.");
  }

  // Replace the expired access token.
  localStorage.setItem(TOKEN_KEY, accessToken);

  // Keep the stored user token in sync.
  const storedUser = getUser();

  if (storedUser) {
    storedUser.token = accessToken;
    localStorage.setItem(USER_KEY, JSON.stringify(storedUser));
  }

  return accessToken;
};

/* =========================================================
   LOGOUT
========================================================= */

const logout = async (): Promise<void> => {
  try {
    await API.post(
      `${USERS_BASE_URL}/logout`,
      {},
      {
        withCredentials: true,
      },
    );
  } catch (error) {
    console.error("Logout request failed:", error);
  } finally {
    /*
     * Always clear local authentication,
     * even if the backend is unavailable.
     */

    clearAuth();
  }
};

/* =========================================================
   FORGOT PASSWORD / PIN
========================================================= */

const forgotPassword = async (identifier: string): Promise<GenericResponse> => {
  const value = identifier.trim();

  if (!value) {
    throw new Error("Email or phone number is required.");
  }

  const normalizedIdentifier = value.includes("@")
    ? value.toLowerCase()
    : normalizeNigerianPhone(value);

  if (!value.includes("@") && !isValidNigerianPhone(normalizedIdentifier)) {
    throw new Error("Please enter a valid Nigerian phone number or email.");
  }

  const response = await API.post<GenericResponse>(
    `${USERS_BASE_URL}/forgot-password`,
    {
      identifier: normalizedIdentifier,
    },
  );

  return response.data;
};

/* =========================================================
   RESET PASSWORD / PIN
========================================================= */

const resetPassword = async (
  token: string,
  password: string,
): Promise<GenericResponse> => {
  if (!token) {
    throw new Error("Password reset token is required.");
  }

  /*
   * Reset credential must be
   * exactly 4 numeric digits.
   */
  validatePin(password, "PIN");

  const response = await API.put<GenericResponse>(
    `${USERS_BASE_URL}/reset-password/${encodeURIComponent(token)}`,
    {
      password,
    },
  );

  return response.data;
};

/* =========================================================
   VERIFY PHONE
========================================================= */

const verifyPhone = async (
  userId: string,
  code: string,
): Promise<AuthUser | GenericResponse> => {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  if (!code) {
    throw new Error("Verification code is required.");
  }

  const response = await API.post<AuthResponse>(
    `${USERS_BASE_URL}/verify-phone`,
    {
      userId,
      code,
    },
  );

  const data = response.data;
  const accessToken = getAccessToken(data);

  /*
   * Some backends return a fresh
   * authenticated user/token.
   */
  if (data?.success && data.data?._id && accessToken) {
    return saveAuth(data.data, accessToken);
  }

  return data;
};

/* =========================================================
   GET CURRENT USER
========================================================= */

const getMe = async (): Promise<AuthUser | null> => {
  const token = getToken();

  if (!token) {
    return null;
  }

  try {
    const response = await API.get<GenericResponse<BackendUser>>(
      `${USERS_BASE_URL}/me`,
    );

    const responseData = response.data;
    const userData = responseData?.data;

    if (responseData?.success === false || !userData?._id) {
      return null;
    }

    return saveAuth(userData, token);
  } catch (error) {
    // An expired or invalid token is not recoverable.
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearAuth();
      return null;
    }

    // Preserve the session if the failure is a network
    // problem or server error. Do not mistake it for expiry.
    throw error;
  }
};

/* =========================================================
   GET CONTACTS
========================================================= */

const getContacts = async (): Promise<GenericResponse> => {
  const response = await API.get<GenericResponse>(`${USERS_BASE_URL}/contacts`);

  return response.data;
};

/* =========================================================
   ADD CONTACT
========================================================= */

const addContact = async (userId: string): Promise<GenericResponse> => {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  const response = await API.post<GenericResponse>(
    `${USERS_BASE_URL}/contacts/add`,
    {
      userId,
    },
  );

  return response.data;
};

/* =========================================================
   GET TOKEN
========================================================= */

const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

/* =========================================================
   GET STORED USER
========================================================= */

const getUser = (): AuthUser | null => {
  try {
    const storedUser = localStorage.getItem(USER_KEY);

    if (!storedUser) {
      return null;
    }

    const user = JSON.parse(storedUser) as AuthUser;

    /*
     * Basic integrity validation.
     */

    if (!user?._id || !user.role || !user.token) {
      clearAuth();

      return null;
    }

    return user;
  } catch {
    clearAuth();

    return null;
  }
};

/* =========================================================
   IS AUTHENTICATED
========================================================= */

const isAuthenticated = (): boolean => {
  return Boolean(getToken());
};

/* =========================================================
   GET ROLE
========================================================= */

const getRole = (): UserRole | null => {
  const user = getUser();

  return user?.role ?? null;
};

/* =========================================================
   HAS ROLE
========================================================= */

const hasRole = (roles: UserRole | readonly UserRole[]): boolean => {
  const user = getUser();

  if (!user) {
    return false;
  }

  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return allowedRoles.includes(user.role);
};

/* =========================================================
   IS ADMIN
========================================================= */

const isAdmin = (): boolean => {
  const role = getRole();

  if (!role) {
    return false;
  }

  return roleIsAdmin(role);
};

/* =========================================================
   IS SUPER ADMIN
========================================================= */

const isSuperAdmin = (): boolean => {
  return hasRole("super_admin");
};

/* =========================================================
   IS LOAN OFFICER
========================================================= */

const isLoanOfficer = (): boolean => {
  return hasRole("loan_officer");
};

/* =========================================================
   IS RISK OFFICER
========================================================= */

const isRiskOfficer = (): boolean => {
  return hasRole("risk_officer");
};

/* =========================================================
   IS FINANCE
========================================================= */

const isFinance = (): boolean => {
  return hasRole("finance");
};

/* =========================================================
   IS SUPPORT
========================================================= */

const isSupport = (): boolean => {
  return hasRole("support");
};

const restoreBiometricSession = async (
  token: string,
): Promise<AuthUser | null> => {
  if (!token) {
    throw new Error("Saved authentication token is missing.");
  }

  // Restore the saved token for the Axios interceptor.
  localStorage.setItem(TOKEN_KEY, token);

  const currentUser = await getMe();

  if (!currentUser) {
    clearAuth();

    throw new Error(
      "Your saved session has expired. Please log in with your PIN.",
    );
  }

  return currentUser;
};

/* =========================================================
   EXPORT AUTH API
========================================================= */

const authApi = {
  register,
  login,
  logout,

  forgotPassword,
  resetPassword,
  verifyPhone,

  getMe,

  getContacts,
  addContact,

  getToken,
  getUser,

  getRole,
  hasRole,

  isAuthenticated,

  isAdmin,
  isSuperAdmin,
  isLoanOfficer,
  isRiskOfficer,
  isFinance,
  isSupport,
  restoreBiometricSession,
  saveAuth,
  clearAuth,
  refreshAccessToken,
};

export default authApi;

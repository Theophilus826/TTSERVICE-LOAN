
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

export type AccountStatus =
  | "active"
  | "suspended"
  | "blocked"
  | "closed";

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
const isValidPin = (
  pin: string,
): boolean => {
  return /^\d{4}$/.test(pin);
};

/**
 * Validate a PIN and throw a useful
 * error when it is invalid.
 */
const validatePin = (
  pin: string,
  fieldName = "PIN",
): void => {
  if (!pin) {
    throw new Error(
      `${fieldName} is required.`,
    );
  }

  if (!isValidPin(pin)) {
    throw new Error(
      `${fieldName} must be exactly 4 digits.`,
    );
  }
};

/* =========================================================
   NORMALIZE ROLE
========================================================= */

const normalizeRole = (
  data: BackendUser,
): UserRole => {
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

const roleIsAdmin = (
  role: UserRole,
): boolean => {
  return (
    role === "admin" ||
    role === "super_admin"
  );
};

/* =========================================================
   BUILD AUTH USER
========================================================= */

const buildAuthUser = (
  data: BackendUser,
  token: string,
): AuthUser => {
  if (!data?._id) {
    throw new Error(
      "Authenticated user ID was not returned.",
    );
  }

  if (!token) {
    throw new Error(
      "Authentication token was not returned.",
    );
  }

  const role = normalizeRole(data);

  const fullName =
    data.name?.trim() || "User";

  const [firstNameFromName, ...lastNameParts] =
    fullName.split(/\s+/);

  const firstName =
    data.firstName?.trim() ||
    firstNameFromName || "User";

  const lastName =
    data.lastName?.trim() ||
    lastNameParts.join(" ") || "";

  return {
    _id: String(data._id),

    name: fullName,

    firstName,

    lastName,

    email:
      data.email ?? null,

    phone:
      data.phone ?? null,

    avatar:
      data.avatar ?? null,

    token,

    role,

    isAdmin:
      roleIsAdmin(role),

    coins:
      data.coins ?? 0,

    isVerified:
      data.isVerified ?? false,

    emailVerified:
      data.emailVerified ?? false,

    phoneVerified:
      data.phoneVerified ?? false,

    online:
      data.online ?? false,

    lastActive:
      data.lastActive,

    lastLoginAt:
      data.lastLoginAt ?? null,

    accountStatus:
      data.accountStatus ??
      "active",

    kycStatus:
      data.kycStatus ??
      "not_started",

    borrowerStatus:
      data.borrowerStatus ??
      "new",

    referralCode:
      data.referralCode,

    referredBy:
      data.referredBy ?? null,

    createdAt:
      data.createdAt,

    updatedAt:
      data.updatedAt,
  };
};

/* =========================================================
   SAVE AUTH
========================================================= */

const saveAuth = (
  data: BackendUser,
  token: string,
): AuthUser => {
  const user = buildAuthUser(
    data,
    token,
  );

  localStorage.setItem(
    TOKEN_KEY,
    user.token,
  );

  localStorage.setItem(
    USER_KEY,
    JSON.stringify(user),
  );

  localStorage.setItem(
    USER_ID_KEY,
    user._id,
  );

  return user;
};

/* =========================================================
   CLEAR AUTH
========================================================= */

const clearAuth = (): void => {
  localStorage.removeItem(
    TOKEN_KEY,
  );

  localStorage.removeItem(
    USER_KEY,
  );

  localStorage.removeItem(
    USER_ID_KEY,
  );
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
const normalizeNigerianPhone = (
  phone: string,
): string => {
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
  }

  /*
   * 8012345678
   * 7012345678
   * 9012345678
   *
   * -> 2348012345678
   */
  else if (
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

const isValidNigerianPhone = (
  phone: string,
): boolean => {
  const normalized =
    normalizeNigerianPhone(phone);

  return /^\+234[789]\d{9}$/.test(
    normalized,
  );
};

/* =========================================================
   REGISTER
========================================================= */



const register = async (
  userData: RegisterData,
): Promise<AuthUser> => {
  /* -------------------------------------------------------
     VALIDATE PIN
  ------------------------------------------------------- */

  validatePin(
    userData.password,
    "PIN",
  );

  validatePin(
    userData.confirmPassword,
    "Confirm PIN",
  );

  if (
    userData.password !==
    userData.confirmPassword
  ) {
    throw new Error(
      "PINs do not match.",
    );
  }

  /* -------------------------------------------------------
     VALIDATE NAME
  ------------------------------------------------------- */

  const name =
    userData.name.trim();

  if (!name) {
    throw new Error(
      "Please enter your name.",
    );
  }

  if (name.length < 2) {
    throw new Error(
      "Name must be at least 2 characters.",
    );
  }

  /* -------------------------------------------------------
     EMAIL / PHONE
  ------------------------------------------------------- */

  const email =
    userData.email
      ?.trim()
      .toLowerCase();

  const phone =
    userData.phone?.trim();

  if (!email && !phone) {
    throw new Error(
      "Please enter an email address or phone number.",
    );
  }

  /* -------------------------------------------------------
     EMAIL
  ------------------------------------------------------- */

  if (email) {
    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      throw new Error(
        "Please enter a valid email address.",
      );
    }
  }

  /* -------------------------------------------------------
     PHONE
  ------------------------------------------------------- */

  const normalizedPhone =
    phone
      ? normalizeNigerianPhone(phone)
      : undefined;

  if (
    normalizedPhone &&
    !isValidNigerianPhone(
      normalizedPhone,
    )
  ) {
    throw new Error(
      "Please enter a valid Nigerian phone number.",
    );
  }

  /* -------------------------------------------------------
     REQUEST DATA
  ------------------------------------------------------- */

  const registerData: RegisterData = {
    name,

    ...(email
      ? { email }
      : {}),

    ...(normalizedPhone
      ? {
          phone: normalizedPhone,
        }
      : {}),

    password:
      userData.password,

    confirmPassword:
      userData.confirmPassword,

    ...(userData.referralCode
      ? {
          referralCode:
            userData.referralCode,
        }
      : {}),
  };

  /* -------------------------------------------------------
     API REQUEST
  ------------------------------------------------------- */

  const response =
    await API.post<AuthResponse>(
      `${USERS_BASE_URL}/register`,
      registerData,
    );

  const data =
    response.data;

  if (!data?.success) {
    throw new Error(
      data?.message ||
        "Registration failed.",
    );
  }

  if (!data.data?._id) {
    throw new Error(
      "Authenticated user ID was not returned.",
    );
  }

  if (!data.token) {
    throw new Error(
      "Authentication token was not returned.",
    );
  }

  return saveAuth(
    data.data,
    data.token,
  );
};

/* =========================================================
   LOGIN
========================================================= */

const login = async (
  userData: LoginData,
): Promise<AuthUser> => {
  /* -------------------------------------------------------
     VALIDATE PIN
  ------------------------------------------------------- */

  validatePin(
    userData.password,
    "PIN",
  );

  /* -------------------------------------------------------
     IDENTIFIER
  ------------------------------------------------------- */

  const identifier =
    userData.identifier.trim();

  if (!identifier) {
    throw new Error(
      "Email or phone number is required.",
    );
  }

  /*
   * If identifier is an email,
   * leave it unchanged.
   *
   * If it is a phone number,
   * normalize it to +234XXXXXXXXXX.
   */

  const normalizedIdentifier =
    identifier.includes("@")
      ? identifier
          .toLowerCase()
      : normalizeNigerianPhone(
          identifier,
        );

  /* -------------------------------------------------------
     VALIDATE PHONE
  ------------------------------------------------------- */

  if (
    !identifier.includes("@") &&
    !isValidNigerianPhone(
      normalizedIdentifier,
    )
  ) {
    throw new Error(
      "Please enter a valid Nigerian phone number or email.",
    );
  }

  /* -------------------------------------------------------
     API REQUEST
  ------------------------------------------------------- */

  const response =
    await API.post<AuthResponse>(
      `${USERS_BASE_URL}/login`,
      {
        identifier:
          normalizedIdentifier,

        /*
         * Send the 4-digit PIN
         * using the backend's existing
         * "password" field.
         */
        password:
          userData.password,
      },
    );

  const data =
    response.data;

  if (!data?.success) {
    throw new Error(
      data?.message ||
        "Login failed.",
    );
  }

  if (!data.data?._id) {
    throw new Error(
      "Authenticated user ID was not returned.",
    );
  }

  if (!data.token) {
    throw new Error(
      "Authentication token was not returned.",
    );
  }

  return saveAuth(
    data.data,
    data.token,
  );
};

/* =========================================================
   LOGOUT
========================================================= */

const logout = async (): Promise<void> => {
  try {
    await API.post(
      `${USERS_BASE_URL}/logout`,
    );
  } finally {
    /*
     * Always clear local authentication,
     * even when the backend request fails.
     */

    clearAuth();
  }
};

/* =========================================================
   FORGOT PASSWORD / PIN
========================================================= */

const forgotPassword = async (
  identifier: string,
): Promise<
  GenericResponse
> => {
  const value =
    identifier.trim();

  if (!value) {
    throw new Error(
      "Email or phone number is required.",
    );
  }

  const normalizedIdentifier =
    value.includes("@")
      ? value.toLowerCase()
      : normalizeNigerianPhone(
          value,
        );

  if (
    !value.includes("@") &&
    !isValidNigerianPhone(
      normalizedIdentifier,
    )
  ) {
    throw new Error(
      "Please enter a valid Nigerian phone number or email.",
    );
  }

  const response =
    await API.post<GenericResponse>(
      `${USERS_BASE_URL}/forgot-password`,
      {
        identifier:
          normalizedIdentifier,
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
): Promise<
  GenericResponse
> => {
  if (!token) {
    throw new Error(
      "Password reset token is required.",
    );
  }

  /*
   * Reset credential must be
   * exactly 4 numeric digits.
   */
  validatePin(
    password,
    "PIN",
  );

  const response =
    await API.put<GenericResponse>(
      `${USERS_BASE_URL}/reset-password/${encodeURIComponent(
        token,
      )}`,
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
): Promise<
  AuthUser | GenericResponse
> => {
  if (!userId) {
    throw new Error(
      "User ID is required.",
    );
  }

  if (!code) {
    throw new Error(
      "Verification code is required.",
    );
  }

  const response =
    await API.post<AuthResponse>(
      `${USERS_BASE_URL}/verify-phone`,
      {
        userId,
        code,
      },
    );

  const data =
    response.data;

  /*
   * Some backends return a fresh
   * authenticated user/token.
   */

  if (
    data?.success &&
    data.data?._id &&
    data.token
  ) {
    return saveAuth(
      data.data,
      data.token,
    );
  }

  return data;
};

/* =========================================================
   GET CURRENT USER
========================================================= */

const getMe = async (): Promise<
  AuthUser | null
> => {
  const token =
    getToken();

  /*
   * Do not call /me without a JWT.
   */

  if (!token) {
    return null;
  }

  try {
    const response =
      await API.get<
        GenericResponse<BackendUser>
      >(
        `${USERS_BASE_URL}/me`,
      );

    const responseData =
      response.data;

    if (
      responseData?.success === false
    ) {
      return null;
    }

    const userData =
      responseData?.data;

    if (!userData?._id) {
      return null;
    }

    /*
     * Keep the existing JWT.
     */
    return saveAuth(
      userData,
      token,
    );
  } catch {
    /*
     * Api.ts handles HTTP 401 globally.
     *
     * Do not clear valid local authentication
     * here for ordinary network/server errors.
     */

    return null;
  }
};

/* =========================================================
   GET CONTACTS
========================================================= */

const getContacts = async (): Promise<
  GenericResponse
> => {
  const response =
    await API.get<GenericResponse>(
      `${USERS_BASE_URL}/contacts`,
    );

  return response.data;
};

/* =========================================================
   ADD CONTACT
========================================================= */

const addContact = async (
  userId: string,
): Promise<
  GenericResponse
> => {
  if (!userId) {
    throw new Error(
      "User ID is required.",
    );
  }

  const response =
    await API.post<GenericResponse>(
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
  return localStorage.getItem(
    TOKEN_KEY,
  );
};

/* =========================================================
   GET STORED USER
========================================================= */

const getUser = (): AuthUser | null => {
  try {
    const storedUser =
      localStorage.getItem(
        USER_KEY,
      );

    if (!storedUser) {
      return null;
    }

    const user =
      JSON.parse(
        storedUser,
      ) as AuthUser;

    /*
     * Basic integrity validation.
     */

    if (
      !user?._id ||
      !user.role ||
      !user.token
    ) {
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

const isAuthenticated =
  (): boolean => {
    return Boolean(
      getToken(),
    );
  };

/* =========================================================
   GET ROLE
========================================================= */

const getRole =
  (): UserRole | null => {
    const user =
      getUser();

    return user?.role ?? null;
  };

/* =========================================================
   HAS ROLE
========================================================= */

const hasRole = (
  roles:
    | UserRole
    | readonly UserRole[],
): boolean => {
  const user =
    getUser();

  if (!user) {
    return false;
  }

  const allowedRoles =
    Array.isArray(roles)
      ? roles
      : [roles];

  return allowedRoles.includes(
    user.role,
  );
};

/* =========================================================
   IS ADMIN
========================================================= */

const isAdmin =
  (): boolean => {
    const role =
      getRole();

    if (!role) {
      return false;
    }

    return roleIsAdmin(role);
  };

/* =========================================================
   IS SUPER ADMIN
========================================================= */

const isSuperAdmin =
  (): boolean => {
    return hasRole(
      "super_admin",
    );
  };

/* =========================================================
   IS LOAN OFFICER
========================================================= */

const isLoanOfficer =
  (): boolean => {
    return hasRole(
      "loan_officer",
    );
  };

/* =========================================================
   IS RISK OFFICER
========================================================= */

const isRiskOfficer =
  (): boolean => {
    return hasRole(
      "risk_officer",
    );
  };

/* =========================================================
   IS FINANCE
========================================================= */

const isFinance =
  (): boolean => {
    return hasRole(
      "finance",
    );
  };

/* =========================================================
   IS SUPPORT
========================================================= */

const isSupport =
  (): boolean => {
    return hasRole(
      "support",
    );
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
};

export default authApi;


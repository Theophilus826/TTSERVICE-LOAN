
import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";

/* =========================================================
   ENVIRONMENT
========================================================= */

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

const API_FALLBACK_URL =
  "https://tofads-loan.onrender.com/api";

/* =========================================================
   STORAGE
========================================================= */

const TOKEN_KEY = "token";
const USER_KEY = "user";
const USER_ID_KEY = "userId";

/* =========================================================
   TYPES
========================================================= */

type RetryableRequest = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _fallbackTried?: boolean;
  skipAuthRefresh?: boolean;
};

interface RefreshResponse {
  success: boolean;
  token?: string;
  message?: string;
}

interface ApiErrorResponse {
  message?: unknown;
  error?: unknown;
  data?: {
    failureReason?: unknown;
    providerResponse?: {
      gatewayResponse?: unknown;
    };
  };
}

/* =========================================================
   AXIOS INSTANCE
========================================================= */

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: {
    Accept: "application/json",
  },

  // Supports secure refresh cookies when the backend
  // is configured for cookie-based authentication.
  withCredentials: true,
});

/* =========================================================
   SESSION HELPERS
========================================================= */

const clearLocalSession = (): void => {
  if (typeof window === "undefined") return;

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(USER_ID_KEY);
};

const saveAccessToken = (token: string): void => {
  if (!token) {
    throw new Error("Access token is missing.");
  }

  localStorage.setItem(TOKEN_KEY, token);

  // Keep the existing AuthService user shape compatible.
  const savedUser = localStorage.getItem(USER_KEY);

  if (!savedUser) return;

  try {
    const user = JSON.parse(savedUser) as {
      token?: string;
    };

    user.token = token;

    localStorage.setItem(
      USER_KEY,
      JSON.stringify(user),
    );
  } catch {
    // Do not turn a successful token refresh into a
    // failed request because cached profile JSON is bad.
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_ID_KEY);
  }
};

/* =========================================================
   PUBLIC AUTH ENDPOINTS
========================================================= */

const isPublicAuthEndpoint = (
  url = "",
): boolean => {
  return /\/users\/(login|register|forgot-password|reset-password|refresh)(\/|$)/i.test(
    url,
  );
};

/* =========================================================
   REQUEST INTERCEPTOR
========================================================= */

API.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem(TOKEN_KEY)
        : null;

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    /*
     * Let the browser generate the multipart boundary
     * for FormData uploads.
     */
    if (
      typeof FormData !== "undefined" &&
      config.data instanceof FormData
    ) {
      delete config.headers["Content-Type"];
    } else if (!config.headers["Content-Type"]) {
      config.headers["Content-Type"] =
        "application/json";
    }

    return config;
  },
  (error: unknown) => Promise.reject(error),
);

/* =========================================================
   SINGLE-FLIGHT TOKEN REFRESH
========================================================= */

// If several requests return 401 together, they share
// one refresh request rather than rotating the token
// multiple times concurrently.

let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = API.post<RefreshResponse>(
      "/users/refresh",
      {},
      {
        // Avoid inheriting a stale Authorization header
        // from the normal request interceptor.
        headers: {
          Authorization: "",
        },
        skipAuthRefresh: true,
      } as never,
    )
      .then((response) => {
        const { success, token } = response.data;

        if (!success || !token) {
          throw new Error(
            "Session renewal failed.",
          );
        }

        saveAccessToken(token);

        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

/* =========================================================
   UNAUTHORIZED EVENT
========================================================= */

const notifyUnauthorized = (): void => {
  if (typeof window === "undefined") return;

  clearLocalSession();

  window.dispatchEvent(
    new CustomEvent("auth:unauthorized"),
  );
};

/* =========================================================
   RESPONSE INTERCEPTOR
========================================================= */

API.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as
      | RetryableRequest
      | undefined;

    /* -----------------------------------------------------
       LOCALHOST -> RENDER FALLBACK
    ----------------------------------------------------- */

    const usingLocalBackend =
      API_BASE_URL.replace(/\/+$/, "") ===
      "http://localhost:5000/api";

    if (
      !error.response &&
      usingLocalBackend &&
      original &&
      !original._fallbackTried
    ) {
      original._fallbackTried = true;

      try {
        return await API.request({
          ...original,
          baseURL: API_FALLBACK_URL,
          headers: {
            ...original.headers,
            ...(localStorage.getItem(TOKEN_KEY)
              ? {
                  Authorization: `Bearer ${localStorage.getItem(
                    TOKEN_KEY,
                  )}`,
                }
              : {}),
          },
        });
      } catch (fallbackError) {
        return Promise.reject(fallbackError);
      }
    }

    /* -----------------------------------------------------
       TOKEN REFRESH
    ----------------------------------------------------- */

    if (
      status === 401 &&
      original &&
      !original._retry &&
      !original.skipAuthRefresh &&
      !isPublicAuthEndpoint(original.url)
    ) {
      original._retry = true;

      try {
        const token = await refreshAccessToken();

        original.headers.Authorization =
          `Bearer ${token}`;

        return await API.request(original);
      } catch (refreshError) {
        notifyUnauthorized();

        return Promise.reject(refreshError);
      }
    }

    /* -----------------------------------------------------
       INVALID PUBLIC AUTH REQUEST
    ----------------------------------------------------- */

    // Bad login credentials must not destroy an existing
    // locally saved session.
    if (
      status === 401 &&
      original &&
      !isPublicAuthEndpoint(original.url) &&
      !original.skipAuthRefresh
    ) {
      notifyUnauthorized();
    }

    /* -----------------------------------------------------
       FORBIDDEN
    ----------------------------------------------------- */

    if (status === 403) {
      console.warn("API request forbidden.", {
        url: original?.url,
      });
    }

    /* -----------------------------------------------------
       SERVER ERROR
    ----------------------------------------------------- */

    if (
      typeof status === "number" &&
      status >= 500
    ) {
      console.error("API server error.", {
        status,
        url: original?.url,
      });
    }

    return Promise.reject(error);
  },
);

/* =========================================================
   API ERROR HELPER
========================================================= */

export const getApiErrorMessage = (
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string => {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;

    if (
      responseData &&
      typeof responseData === "object"
    ) {
      const data =
        responseData as ApiErrorResponse;

      if (
        typeof data.message === "string" &&
        data.message.trim()
      ) {
        return data.message;
      }

      if (
        typeof data.error === "string" &&
        data.error.trim()
      ) {
        return data.error;
      }

      if (
        typeof data.data?.failureReason === "string" &&
        data.data.failureReason.trim()
      ) {
        return data.data.failureReason;
      }

      if (
        typeof data.data?.providerResponse
          ?.gatewayResponse === "string" &&
        data.data.providerResponse.gatewayResponse.trim()
      ) {
        return data.data.providerResponse.gatewayResponse;
      }
    }

    if (error.message?.trim()) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

/* =========================================================
   EXPORT
========================================================= */

export default API;


/// <reference types="vite/client" />

import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";

/* =========================================================
   ENVIRONMENT
========================================================= */

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
  _fallbackTried?: boolean;
  _retry?: boolean;
};

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

interface RefreshResponse {
  accessToken?: string;
  token?: string;
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

/* =========================================================
   PUBLIC AUTH ENDPOINTS
========================================================= */

const isPublicAuthEndpoint = (
  url = "",
): boolean => {
  return /\/users\/(login|register|forgot-password|reset-password|refresh-token)(\/|$)/i.test(
    url,
  );
};

/* =========================================================
   REFRESH TOKEN MANAGEMENT
========================================================= */

// Ensures multiple failed requests share one refresh call.
let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = async (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<RefreshResponse>(
        `${API_BASE_URL.replace(/\/+$/, "")}/users/refresh-token`,
        {},
        {
          withCredentials: true,
          timeout: 30_000,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        },
      )
      .then((response) => {
        const newToken =
          response.data?.accessToken ||
          response.data?.token;

        if (
          !newToken ||
          typeof newToken !== "string"
        ) {
          throw new Error(
            "New access token was not returned.",
          );
        }

        localStorage.setItem(
          TOKEN_KEY,
          newToken,
        );

        // Keep the stored user object synchronized.
        const storedUser =
          localStorage.getItem(USER_KEY);

        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);

            user.token = newToken;

            localStorage.setItem(
              USER_KEY,
              JSON.stringify(user),
            );
          } catch {
            console.warn(
              "Could not update stored user token.",
            );
          }
        }

        return newToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
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

    // Let the browser generate multipart boundaries.
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

    if (!original) {
      return Promise.reject(error);
    }

    /* -----------------------------------------------------
       LOCALHOST -> RENDER FALLBACK
    ----------------------------------------------------- */

    const usingLocalBackend =
      API_BASE_URL.replace(/\/+$/, "") ===
      "http://localhost:5000/api";

    if (
      !error.response &&
      usingLocalBackend &&
      !original._fallbackTried
    ) {
      original._fallbackTried = true;

      try {
        return await API.request({
          ...original,
          baseURL: API_FALLBACK_URL,
          headers: {
            ...original.headers,
          },
        });
      } catch (fallbackError) {
        return Promise.reject(fallbackError);
      }
    }

    /* -----------------------------------------------------
       UNAUTHORIZED - REFRESH ACCESS TOKEN
    ----------------------------------------------------- */

    if (
      status === 401 &&
      !isPublicAuthEndpoint(original.url)
    ) {
      // Prevent infinite retry loops.
      if (original._retry) {
        notifyUnauthorized();
        return Promise.reject(error);
      }

      original._retry = true;

      try {
        // Refresh only once, even if multiple requests fail.
        const newToken = await refreshAccessToken();

        // Update the original request.
        original.headers.Authorization =
          `Bearer ${newToken}`;

        // Retry the failed request.
        return API.request(original);

      } catch (refreshError) {
        notifyUnauthorized();

        return Promise.reject(refreshError);
      }
    }

    /* -----------------------------------------------------
       FORBIDDEN
    ----------------------------------------------------- */

    if (status === 403) {
      console.warn("API request forbidden.", {
        url: original.url,
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
        url: original.url,
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

  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
};

/* =========================================================
   EXPORT
========================================================= */

export default API;

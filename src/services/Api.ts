
import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// =========================================================
// ENVIRONMENT
// =========================================================
//
// Vite:
//   VITE_API_URL=http://localhost:5000/api
//
// Production:
//   VITE_API_URL=https://api.yourdomain.com/api
//

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";

// =========================================================
// STORAGE
// =========================================================

const TOKEN_KEY = "token";

// =========================================================
// AXIOS INSTANCE
// =========================================================

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: {
    Accept: "application/json",
  },
});

// =========================================================
// REQUEST INTERCEPTOR
// =========================================================

API.interceptors.request.use(
  (
    config: InternalAxiosRequestConfig,
  ) => {
    const token =
      localStorage.getItem(TOKEN_KEY);

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    /*
     * JSON is the default for normal requests.
     *
     * For FormData requests, remove the manually-set
     * content type so Axios/browser can generate the
     * correct multipart boundary.
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
  (error) =>
    Promise.reject(error),
);

// =========================================================
// RESPONSE INTERCEPTOR
// =========================================================

API.interceptors.response.use(
  (response) => response,

  (error: AxiosError) => {
    const status =
      error.response?.status;

    // -----------------------------------------------------
    // UNAUTHORIZED
    // -----------------------------------------------------

    if (status === 401) {
      localStorage.removeItem(
        TOKEN_KEY,
      );

      window.dispatchEvent(
        new CustomEvent(
          "auth:unauthorized",
        ),
      );
    }

    // -----------------------------------------------------
    // FORBIDDEN
    // -----------------------------------------------------

    if (status === 403) {
      console.warn(
        "API request forbidden.",
        {
          url: error.config?.url,
        },
      );
    }

    // -----------------------------------------------------
    // SERVER ERROR
    // -----------------------------------------------------

    if (
      typeof status === "number" &&
      status >= 500
    ) {
      console.error(
        "API server error.",
        {
          status,
          url: error.config?.url,
        },
      );
    }

    return Promise.reject(error);
  },
);

// =========================================================
// API ERROR HELPER
// =========================================================

export const getApiErrorMessage = (
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string => {
  if (axios.isAxiosError(error)) {
    const responseData =
      error.response?.data;

    if (
      responseData &&
      typeof responseData === "object"
    ) {
      const data =
        responseData as {
          message?: unknown;
          error?: unknown;
        };

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
    }

    if (
      typeof error.message === "string" &&
      error.message.trim()
    ) {
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

// =========================================================
// EXPORT
// =========================================================

export default API;


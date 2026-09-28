
import {
  useState,
  type FormEvent,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import { toast } from "react-toastify";

import { useAuth } from "../context/AuthContext";

export default function ResetPassword() {
  const { token } = useParams<{
    token: string;
  }>();

  const navigate = useNavigate();

  const {
    loading,
    resetPassword,
  } = useAuth();

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  // =========================================================
  // SUBMIT
  // =========================================================

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    // -------------------------------------------------------
    // TOKEN
    // -------------------------------------------------------

    if (!token) {
      toast.error(
        "Invalid or expired password reset link.",
      );
      return;
    }

    // -------------------------------------------------------
    // PASSWORD
    // -------------------------------------------------------

    const trimmedPassword =
      password.trim();

    if (!trimmedPassword) {
      toast.error(
        "Please enter a new password.",
      );
      return;
    }

    if (trimmedPassword.length < 8) {
      toast.error(
        "Password must be at least 8 characters long.",
      );
      return;
    }

    // -------------------------------------------------------
    // CONFIRM PASSWORD
    // -------------------------------------------------------

    if (!confirmPassword) {
      toast.error(
        "Please confirm your new password.",
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      toast.error(
        "Passwords do not match.",
      );
      return;
    }

    // -------------------------------------------------------
    // RESET PASSWORD
    // -------------------------------------------------------

    try {
      const message =
        await resetPassword(
          token,
          password,
        );

      toast.success(
        message ||
          "Password reset successfully.",
      );

      navigate("/login", {
        replace: true,
      });
    } catch (error: unknown) {
      let message =
        "Failed to reset password.";

      if (
        typeof error === "object" &&
        error !== null
      ) {
        const axiosError =
          error as {
            response?: {
              data?: {
                message?: unknown;
                error?: unknown;
              };
            };
            message?: unknown;
          };

        const responseMessage =
          axiosError.response?.data?.message;

        const responseError =
          axiosError.response?.data?.error;

        if (
          typeof responseMessage ===
          "string"
        ) {
          message = responseMessage;
        } else if (
          typeof responseError ===
          "string"
        ) {
          message = responseError;
        } else if (
          typeof axiosError.message ===
          "string"
        ) {
          message = axiosError.message;
        }
      }

      toast.error(message);
    }
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg sm:p-8">
        {/* HEADER */}

        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Reset Password
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Enter your new password below.
          </p>
        </div>

        {/* INVALID TOKEN */}

        {!token && (
          <div className="mb-5 rounded-lg bg-red-50 p-4 text-center text-sm text-red-600">
            This password reset link is
            invalid or has expired.
          </div>
        )}

        {/* FORM */}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {/* NEW PASSWORD */}

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              New Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value,
                )
              }
              placeholder="Enter new password"
              autoComplete="new-password"
              minLength={8}
              required
              disabled={
                loading || !token
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-gray-100"
            />

            <p className="mt-1 text-xs text-gray-500">
              Minimum 8 characters.
            </p>
          </div>

          {/* CONFIRM PASSWORD */}

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Confirm New Password
            </label>

            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(
                  e.target.value,
                )
              }
              placeholder="Confirm new password"
              autoComplete="new-password"
              minLength={8}
              required
              disabled={
                loading || !token
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-gray-100"
            />

            {password &&
              confirmPassword &&
              password !==
                confirmPassword && (
                <p className="mt-1 text-sm text-red-500">
                  Passwords do not match.
                </p>
              )}
          </div>

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={
              loading || !token
            }
            className="flex w-full items-center justify-center rounded-lg bg-orange-500 px-4 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {loading ? (
              <>
                <span className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />

                Resetting...
              </>
            ) : (
              "Reset Password"
            )}
          </button>
        </form>

        {/* BACK TO LOGIN */}

        <button
          type="button"
          onClick={() =>
            navigate("/login")
          }
          disabled={loading}
          className="mt-5 w-full text-center text-sm font-medium text-orange-500 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}


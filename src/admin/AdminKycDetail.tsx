
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  XCircle,
  ExternalLink,
  User,
  FileText,
  Camera,
  MapPin,
  Calendar,
  CreditCard,
} from "lucide-react";

import { toast } from "react-toastify";
import axios from "axios";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import API from "../services/Api";

/* =========================================================
   TYPES
   ========================================================= */

interface KycUser {
  _id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

type KycStatus =
  | "pending"
  | "submitted"
  | "under_review"
  | "verified"
  | "rejected";

interface Kyc {
  _id: string;

  user?: KycUser;

  firstName: string;
  lastName: string;

  dateOfBirth: string;

  gender?: string;

  address: string;
  city?: string;
  state?: string;
  country?: string;

  idType: string;

  idNumber?: string;

  idDocumentFront?: string | null;

  selfie?: string | null;

  status: KycStatus;

  rejectionReason?: string | null;

  submittedAt?: string;

  verifiedAt?: string;

  verifiedBy?: string;

  createdAt?: string;

  updatedAt?: string;
}

interface KycResponse {
  success?: boolean;
  message?: string;
  data?: Kyc | null;
}

/* =========================================================
   COMPONENT
   ========================================================= */

export default function AdminKycDetail() {
  const navigate = useNavigate();

  const { id } = useParams<{
    id: string;
  }>();

  const [kyc, setKyc] =
    useState<Kyc | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [updating, setUpdating] =
    useState(false);

  /* =======================================================
     ERROR MESSAGE
     ======================================================= */

  const getErrorMessage = (
    error: unknown
  ): string => {
    if (axios.isAxiosError(error)) {
      return (
        error.response?.data?.message ||
        error.message ||
        "Something went wrong"
      );
    }

    if (error instanceof Error) {
      return error.message;
    }

    return "Something went wrong";
  };

  /* =======================================================
     LOAD KYC
     ======================================================= */

  const loadKyc = useCallback(async () => {
    if (!id) {
      toast.error(
        "KYC ID is missing"
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await API.get<KycResponse>(
          `/kyc/admin/${id}`
        );

      if (response.data?.success === false) {
        throw new Error(
          response.data.message ||
            "Failed to load KYC"
        );
      }

      if (!response.data?.data) {
        throw new Error(
          "KYC record not found"
        );
      }

      setKyc(response.data.data);
    } catch (error: unknown) {
      console.error(
        "Failed to load KYC:",
        error
      );

      toast.error(
        getErrorMessage(error) ||
          "Failed to load KYC"
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  /* =======================================================
     INITIAL LOAD
     ======================================================= */

  useEffect(() => {
    void loadKyc();
  }, [loadKyc]);

  /* =======================================================
     VERIFY KYC
     ======================================================= */

  const verifyKyc = async () => {
    if (!id || !kyc) {
      return;
    }

    try {
      setUpdating(true);

      const response =
        await API.patch<KycResponse>(
          `/kyc/admin/${id}/verify`
        );

      if (response.data?.success === false) {
        throw new Error(
          response.data.message ||
            "Failed to verify KYC"
        );
      }

      toast.success(
        "KYC verified successfully"
      );

      /*
       * Use the backend response when available.
       */
      if (response.data?.data) {
        setKyc(response.data.data);
      } else {
        setKyc((current) =>
          current
            ? {
                ...current,
                status: "verified",
                verifiedAt:
                  new Date().toISOString(),
              }
            : current
        );
      }
    } catch (error: unknown) {
      console.error(
        "KYC verification failed:",
        error
      );

      toast.error(
        getErrorMessage(error) ||
          "Failed to verify KYC"
      );
    } finally {
      setUpdating(false);
    }
  };

  /* =======================================================
     REJECT KYC
     ======================================================= */

  const rejectKyc = async () => {
    if (!id || !kyc) {
      return;
    }

    const reason = window.prompt(
      "Enter rejection reason:"
    );

    if (!reason?.trim()) {
      return;
    }

    try {
      setUpdating(true);

      const response =
        await API.patch<KycResponse>(
          `/kyc/admin/${id}/reject`,
          {
            rejectionReason:
              reason.trim(),
          }
        );

      if (response.data?.success === false) {
        throw new Error(
          response.data.message ||
            "Failed to reject KYC"
        );
      }

      toast.success(
        "KYC rejected"
      );

      if (response.data?.data) {
        setKyc(response.data.data);
      } else {
        setKyc((current) =>
          current
            ? {
                ...current,
                status: "rejected",
                rejectionReason:
                  reason.trim(),
              }
            : current
        );
      }
    } catch (error: unknown) {
      console.error(
        "KYC rejection failed:",
        error
      );

      toast.error(
        getErrorMessage(error) ||
          "Failed to reject KYC"
      );
    } finally {
      setUpdating(false);
    }
  };

  /* =======================================================
     DATE FORMATTER
     ======================================================= */

  const formatDate = (
    value?: string
  ): string => {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString(
      "en-NG",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );
  };

  /* =======================================================
     STATUS LABEL
     ======================================================= */

  const formatStatus = (
    status: string
  ): string => {
    return status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) =>
        char.toUpperCase()
      );
  };

  /* =======================================================
     STATUS STYLE
     ======================================================= */

  const getStatusClass = (
    status: KycStatus
  ): string => {
    switch (status) {
      case "verified":
        return "bg-green-100 text-green-700";

      case "rejected":
        return "bg-red-100 text-red-700";

      case "under_review":
        return "bg-blue-100 text-blue-700";

      case "submitted":
      case "pending":
      default:
        return "bg-yellow-100 text-yellow-700";
    }
  };

  /* =======================================================
     LOADING
     ======================================================= */

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <RefreshCw
            size={32}
            className="mx-auto animate-spin text-orange-500"
          />

          <p className="mt-3 text-sm text-gray-500">
            Loading KYC details...
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     NOT FOUND
     ======================================================= */

  if (!kyc) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
        <XCircle
          size={44}
          className="mx-auto text-red-500"
        />

        <h1 className="mt-4 text-lg font-semibold text-gray-900">
          KYC not found
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          This KYC record could not be found.
        </p>

        <button
          type="button"
          onClick={() =>
            navigate("/admin/kyc")
          }
          className="mt-5 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Back to KYC
        </button>
      </div>
    );
  }

  /* =======================================================
     CAN REVIEW
     ======================================================= */

  const canReview =
    kyc.status !== "verified" &&
    kyc.status !== "rejected";

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="space-y-6">
      {/* ===================================================
          HEADER
          =================================================== */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              navigate("/admin/kyc")
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl border bg-white text-gray-600 transition hover:bg-gray-50"
            aria-label="Back to KYC applications"
          >
            <ArrowLeft size={19} />
          </button>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              KYC Details
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Review the customer's identity
              verification information.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${getStatusClass(
              kyc.status
            )}`}
          >
            {formatStatus(
              kyc.status
            )}
          </span>

          <button
            type="button"
            onClick={() =>
              void loadKyc()
            }
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>
        </div>
      </div>

      {/* ===================================================
          CUSTOMER HEADER
          =================================================== */}

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
              <User size={28} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {kyc.firstName}{" "}
                {kyc.lastName}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {kyc.user?.email ||
                  "No email"}
              </p>

              {kyc.user?.phone && (
                <p className="text-sm text-gray-500">
                  {kyc.user.phone}
                </p>
              )}
            </div>
          </div>

          {/* ACTIONS */}
          {canReview ? (
            <div className="flex gap-3">
              <button
                type="button"
                disabled={updating}
                onClick={() =>
                  void verifyKyc()
                }
                className="flex items-center gap-2 rounded-xl bg-green-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updating ? (
                  <RefreshCw
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <CheckCircle
                    size={17}
                  />
                )}

                Verify KYC
              </button>

              <button
                type="button"
                disabled={updating}
                onClick={() =>
                  void rejectKyc()
                }
                className="flex items-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updating ? (
                  <RefreshCw
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <XCircle size={17} />
                )}

                Reject
              </button>
            </div>
          ) : (
            <div
              className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold ${
                kyc.status ===
                "verified"
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {kyc.status ===
              "verified" ? (
                <CheckCircle
                  size={18}
                />
              ) : (
                <XCircle size={18} />
              )}

              {formatStatus(
                kyc.status
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===================================================
          PERSONAL INFORMATION
          =================================================== */}

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <User
            size={19}
            className="text-orange-500"
          />

          <h2 className="text-lg font-semibold text-gray-900">
            Personal Information
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              First Name
            </p>

            <p className="mt-1 text-sm font-medium text-gray-900">
              {kyc.firstName}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Last Name
            </p>

            <p className="mt-1 text-sm font-medium text-gray-900">
              {kyc.lastName}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Date of Birth
            </p>

            <p className="mt-1 flex items-center gap-2 text-sm font-medium text-gray-900">
              <Calendar
                size={15}
                className="text-gray-400"
              />

              {formatDate(
                kyc.dateOfBirth
              )}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Gender
            </p>

            <p className="mt-1 text-sm font-medium capitalize text-gray-900">
              {kyc.gender || "-"}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Country
            </p>

            <p className="mt-1 text-sm font-medium text-gray-900">
              {kyc.country || "-"}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Submitted
            </p>

            <p className="mt-1 text-sm font-medium text-gray-900">
              {formatDate(
                kyc.submittedAt
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ===================================================
          ADDRESS
          =================================================== */}

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <MapPin
            size={19}
            className="text-orange-500"
          />

          <h2 className="text-lg font-semibold text-gray-900">
            Address
          </h2>
        </div>

        <div className="rounded-xl border bg-gray-50 p-4 text-sm leading-6 text-gray-700">
          {kyc.address || "-"}
          {kyc.city
            ? `, ${kyc.city}`
            : ""}
          {kyc.state
            ? `, ${kyc.state}`
            : ""}
          {kyc.country
            ? `, ${kyc.country}`
            : ""}
        </div>
      </div>

      {/* ===================================================
          IDENTIFICATION
          =================================================== */}

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <CreditCard
            size={19}
            className="text-orange-500"
          />

          <h2 className="text-lg font-semibold text-gray-900">
            Identification
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              ID Type
            </p>

            <p className="mt-1 text-sm font-medium uppercase text-gray-900">
              {kyc.idType}
            </p>
          </div>

          {kyc.idNumber && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                ID Number
              </p>

              <p className="mt-1 text-sm font-medium text-gray-900">
                {kyc.idNumber}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ===================================================
          DOCUMENTS
          =================================================== */}

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <FileText
            size={19}
            className="text-orange-500"
          />

          <h2 className="text-lg font-semibold text-gray-900">
            Verification Documents
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* ID DOCUMENT */}
          <div className="overflow-hidden rounded-2xl border bg-gray-50">
            <div className="flex items-center justify-between border-b bg-white px-4 py-3">
              <div className="flex items-center gap-2">
                <FileText size={17} />

                <span className="text-sm font-semibold text-gray-800">
                  ID Document
                </span>
              </div>

              {kyc.idDocumentFront && (
                <a
                  href={
                    kyc.idDocumentFront
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs font-semibold text-orange-600 hover:underline"
                >
                  Open
                  <ExternalLink
                    size={13}
                  />
                </a>
              )}
            </div>

            {kyc.idDocumentFront ? (
              <a
                href={
                  kyc.idDocumentFront
                }
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                <img
                  src={
                    kyc.idDocumentFront
                  }
                  alt="Customer ID document"
                  className="h-[420px] w-full bg-white object-contain p-4"
                />
              </a>
            ) : (
              <div className="flex h-[420px] items-center justify-center text-sm text-gray-400">
                ID document not available
              </div>
            )}
          </div>

          {/* SELFIE */}
          <div className="overflow-hidden rounded-2xl border bg-gray-50">
            <div className="flex items-center justify-between border-b bg-white px-4 py-3">
              <div className="flex items-center gap-2">
                <Camera size={17} />

                <span className="text-sm font-semibold text-gray-800">
                  Selfie
                </span>
              </div>

              {kyc.selfie && (
                <a
                  href={kyc.selfie}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs font-semibold text-orange-600 hover:underline"
                >
                  Open
                  <ExternalLink
                    size={13}
                  />
                </a>
              )}
            </div>

            {kyc.selfie ? (
              <a
                href={kyc.selfie}
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                <img
                  src={kyc.selfie}
                  alt="Customer selfie"
                  className="h-[420px] w-full bg-white object-contain p-4"
                />
              </a>
            ) : (
              <div className="flex h-[420px] items-center justify-center text-sm text-gray-400">
                Selfie not available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===================================================
          REVIEW INFORMATION
          =================================================== */}

      {(kyc.status ===
          "verified" ||
        kyc.status === "rejected") && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-gray-900">
            Review Information
          </h2>

          {kyc.status ===
            "verified" && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle
                  size={21}
                  className="mt-0.5 text-green-600"
                />

                <div>
                  <p className="font-semibold text-green-800">
                    KYC Verified
                  </p>

                  <p className="mt-1 text-sm text-green-700">
                    Verified on{" "}
                    {formatDate(
                      kyc.verifiedAt
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {kyc.status ===
            "rejected" && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <XCircle
                  size={21}
                  className="mt-0.5 text-red-600"
                />

                <div>
                  <p className="font-semibold text-red-800">
                    KYC Rejected
                  </p>

                  <p className="mt-1 text-sm text-red-700">
                    {kyc.rejectionReason ||
                      "No rejection reason provided."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================
          BOTTOM ACTIONS
          =================================================== */}

      {canReview && (
        <div className="sticky bottom-4 rounded-2xl border bg-white/95 p-4 shadow-lg backdrop-blur">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold text-gray-900">
                Review this KYC application
              </p>

              <p className="text-sm text-gray-500">
                Verify the application if all
                submitted information is valid,
                or reject it with a reason.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={updating}
                onClick={() =>
                  void verifyKyc()
                }
                className="flex items-center justify-center gap-2 rounded-xl bg-green-500 px-5 py-3 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50"
              >
                <CheckCircle
                  size={17}
                />

                Verify
              </button>

              <button
                type="button"
                disabled={updating}
                onClick={() =>
                  void rejectKyc()
                }
                className="flex items-center justify-center gap-2 rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
              >
                <XCircle size={17} />

                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

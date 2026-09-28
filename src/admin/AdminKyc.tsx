
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  User,
} from "lucide-react";

import { toast } from "react-toastify";
import axios from "axios";
import { useNavigate } from "react-router-dom";

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
  data?: Kyc[];
}

/* =========================================================
   COMPONENT
   ========================================================= */

export default function AdminKyc() {
  const navigate = useNavigate();

  const [kycs, setKycs] = useState<Kyc[]>([]);
  const [loading, setLoading] = useState(true);

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
     LOAD ALL KYC
     ======================================================= */

  const loadKyc = useCallback(async () => {
    try {
      setLoading(true);

      const response =
        await API.get<KycResponse>(
          "/kyc/admin"
        );

      if (response.data?.success === false) {
        throw new Error(
          response.data.message ||
            "Failed to load KYC applications"
        );
      }

      setKycs(
        Array.isArray(response.data?.data)
          ? response.data.data
          : []
      );
    } catch (error: unknown) {
      console.error(
        "Failed to load KYC:",
        error
      );

      toast.error(
        getErrorMessage(error) ||
          "Failed to load KYC applications"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /* =======================================================
     INITIAL LOAD
     ======================================================= */

  useEffect(() => {
    void loadKyc();
  }, [loadKyc]);

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
        month: "short",
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
     RENDER
     ======================================================= */

  return (
    <div className="space-y-6">
      {/* ===================================================
          HEADER
          =================================================== */}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            KYC Applications
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            View and manage customer identity
            verification applications.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadKyc()}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-medium shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            size={17}
            className={
              loading
                ? "animate-spin"
                : ""
            }
          />

          Refresh
        </button>
      </div>

      {/* ===================================================
          SUMMARY
          =================================================== */}

      {!loading && kycs.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total */}
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Total
            </p>

            <p className="mt-1 text-2xl font-bold text-gray-900">
              {kycs.length}
            </p>
          </div>

          {/* Pending */}
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Pending Review
            </p>

            <p className="mt-1 text-2xl font-bold text-yellow-600">
              {
                kycs.filter(
                  (kyc) =>
                    kyc.status ===
                      "pending" ||
                    kyc.status ===
                      "submitted" ||
                    kyc.status ===
                      "under_review"
                ).length
              }
            </p>
          </div>

          {/* Verified */}
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Verified
            </p>

            <p className="mt-1 text-2xl font-bold text-green-600">
              {
                kycs.filter(
                  (kyc) =>
                    kyc.status ===
                    "verified"
                ).length
              }
            </p>
          </div>

          {/* Rejected */}
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Rejected
            </p>

            <p className="mt-1 text-2xl font-bold text-red-600">
              {
                kycs.filter(
                  (kyc) =>
                    kyc.status ===
                    "rejected"
                ).length
              }
            </p>
          </div>
        </div>
      )}

      {/* ===================================================
          KYC LIST
          =================================================== */}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center">
            <RefreshCw
              size={28}
              className="mx-auto animate-spin text-orange-500"
            />

            <p className="mt-3 text-sm text-gray-500">
              Loading KYC applications...
            </p>
          </div>
        ) : kycs.length === 0 ? (
          <div className="p-10 text-center">
            <CheckCircle
              size={42}
              className="mx-auto text-green-500"
            />

            <p className="mt-3 font-semibold text-gray-900">
              No KYC applications
            </p>

            <p className="mt-1 text-sm text-gray-500">
              There are currently no KYC
              applications.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {kycs.map((kyc) => (
              <div
                key={kyc._id}
                className="p-5 transition hover:bg-gray-50"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  {/* =====================================
                      CUSTOMER
                      ===================================== */}

                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                      <User size={21} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold text-gray-900">
                          {kyc.firstName}{" "}
                          {kyc.lastName}
                        </h2>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                            kyc.status
                          )}`}
                        >
                          {formatStatus(
                            kyc.status
                          )}
                        </span>
                      </div>

                      <p className="mt-1 break-all text-sm text-gray-500">
                        {kyc.user?.email ||
                          "No email"}
                      </p>
                    </div>
                  </div>

                  {/* =====================================
                      DETAILS
                      ===================================== */}

                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm md:grid-cols-3">
                    <div>
                      <p className="text-xs text-gray-400">
                        ID Type
                      </p>

                      <p className="font-medium text-gray-700">
                        {kyc.idType}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">
                        Submitted
                      </p>

                      <p className="font-medium text-gray-700">
                        {formatDate(
                          kyc.submittedAt
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">
                        Country
                      </p>

                      <p className="font-medium text-gray-700">
                        {kyc.country || "-"}
                      </p>
                    </div>
                  </div>

                  {/* =====================================
                      VIEW
                      ===================================== */}

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/admin/kyc/${kyc._id}`
                      )
                    }
                    className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
                  >
                    <Eye size={17} />

                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

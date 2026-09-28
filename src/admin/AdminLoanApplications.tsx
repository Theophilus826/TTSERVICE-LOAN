import { useEffect, useState } from "react";
import {
  CheckCircle,
  Clock,
  Eye,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "react-toastify";

import API from "../services/Api";

// =========================================================
// TYPES
// =========================================================

interface LoanProduct {
  _id: string;
  name: string;
  code?: string;
  currency?: string;

  minAmount?: number;
  maxAmount?: number;

  minDurationDays?: number;
  maxDurationDays?: number;

  interestRate?: number;
  interestType?: string;

  processingFee?: number;
  processingFeeType?: string;

  serviceFee?: number;

  repaymentFrequency?: string;
}

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
}

interface LoanApplication {
  _id: string;
  applicationNumber: string;

  user: Customer;
  loanProduct: LoanProduct;

  amountRequested: number;
  durationDays: number;

  purpose?: string;

  monthlyIncome: number;
  employmentStatus: string;

  status: string;

  creditDecision?: string;
  creditScore?: number | null;

  rejectionReason?: string | null;

  submittedAt?: string;
  createdAt: string;
  reviewedAt?: string | null;
}

interface ApplicationsResponse {
  success: boolean;
  count?: number;
  data: LoanApplication[];
  message?: string;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

// =========================================================
// STATUS OPTIONS
// =========================================================

const statuses = [
  "submitted",
  "pending",
  "under_review",
  "credit_check",
  "approved",
  "offer_created",
  "rejected",
  "cancelled",
  "disbursed",
  "completed",
];

// =========================================================
// COMPONENT
// =========================================================

export default function AdminLoanApplications() {
  const [applications, setApplications] = useState<
    LoanApplication[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  // =========================================================
  // FORMAT AMOUNT
  // =========================================================

  const formatAmount = (
    amount?: number,
    currency = "NGN"
  ) => {
    try {
      return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(amount || 0);
    } catch {
      return `${currency} ${(amount || 0).toLocaleString()}`;
    }
  };

  // =========================================================
  // FORMAT STATUS
  // =========================================================

  const formatStatus = (status?: string) => {
    if (!status) {
      return "-";
    }

    return status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  // =========================================================
  // STATUS COLOR
  // =========================================================

  const getStatusClass = (status: string) => {
    switch (status) {
      case "approved":
      case "disbursed":
      case "completed":
        return "bg-green-100 text-green-700";

      case "rejected":
      case "cancelled":
        return "bg-red-100 text-red-700";

      case "under_review":
      case "credit_check":
        return "bg-blue-100 text-blue-700";

      case "offer_created":
        return "bg-purple-100 text-purple-700";

      default:
        return "bg-yellow-100 text-yellow-700";
    }
  };

  // =========================================================
  // API ERROR MESSAGE
  // =========================================================

  const getErrorMessage = (
    error: any,
    fallback: string
  ) => {
    return (
      error?.response?.data?.message ||
      error?.message ||
      fallback
    );
  };

  // =========================================================
  // LOAD APPLICATIONS
  // =========================================================

  const loadApplications = async () => {
    try {
      setLoading(true);

      const response =
        await API.get<ApplicationsResponse>(
          "/loans/admin/applications"
        );

      if (!response.data.success) {
        throw new Error(
          response.data.message ||
            "Failed to load loan applications"
        );
      }

      setApplications(
        Array.isArray(response.data.data)
          ? response.data.data
          : []
      );
    } catch (error: any) {
      console.error(
        "ADMIN LOAD APPLICATIONS ERROR:",
        error
      );

      toast.error(
        getErrorMessage(
          error,
          "Failed to load loan applications."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  // =========================================================
  // UPDATE APPLICATION STATUS
  // =========================================================

  const updateStatus = async (
    applicationId: string,
    status: string
  ) => {
    try {
      setUpdatingId(applicationId);

      const response =
        await API.patch<
          ApiResponse<LoanApplication>
        >(
          `/loans/admin/applications/${applicationId}/status`,
          {
            status,
          }
        );

      if (!response.data.success) {
        throw new Error(
          response.data.message ||
            "Failed to update application"
        );
      }

      if (response.data.data) {
        setApplications((current) =>
          current.map((application) =>
            application._id === applicationId
              ? response.data.data!
              : application
          )
        );
      } else {
        await loadApplications();
      }

      toast.success(
        `Application ${formatStatus(
          status
        ).toLowerCase()} successfully.`
      );
    } catch (error: any) {
      console.error(
        "ADMIN UPDATE APPLICATION STATUS ERROR:",
        error
      );

      toast.error(
        getErrorMessage(
          error,
          "Failed to update application."
        )
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // =========================================================
  // CREATE OFFER
  // =========================================================

  const createOffer = async (
    applicationId: string
  ) => {
    try {
      setUpdatingId(applicationId);

      const response =
        await API.post<ApiResponse>(
          `/loan-offers/admin/applications/${applicationId}`,
          {
            approvedAmount: 0,
          }
        );

      if (!response.data.success) {
        throw new Error(
          response.data.message ||
            "Failed to create loan offer"
        );
      }

      toast.success(
        "Loan offer created successfully."
      );

      await loadApplications();
    } catch (error: any) {
      console.error(
        "ADMIN CREATE OFFER ERROR:",
        error
      );

      toast.error(
        getErrorMessage(
          error,
          "Failed to create loan offer."
        )
      );

      await loadApplications();
    } finally {
      setUpdatingId(null);
    }
  };

  // =========================================================
  // APPROVE APPLICATION
  // =========================================================

  const approveApplication = async (
    application: LoanApplication
  ) => {
    if (
      application.status === "offer_created"
    ) {
      toast.info(
        "A loan offer has already been created for this application."
      );

      return;
    }

    if (application.status === "approved") {
      toast.info(
        "Application is already approved. You can create the offer."
      );

      return;
    }

    const confirmed = window.confirm(
      "Approve this loan application?"
    );

    if (!confirmed) {
      return;
    }

    await updateStatus(
      application._id,
      "approved"
    );
  };

  // =========================================================
  // APPROVE + CREATE OFFER
  // =========================================================

  const approveAndCreateOffer = async (
    application: LoanApplication
  ) => {
    if (
      application.status === "offer_created"
    ) {
      toast.info(
        "This application already has an offer."
      );

      return;
    }

    const confirmed = window.confirm(
      "Approve this application and create a loan offer?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingId(application._id);

      // -----------------------------------------------------
      // STEP 1: APPROVE
      // -----------------------------------------------------

      let currentStatus =
        application.status;

      if (currentStatus !== "approved") {
        const approvalResponse =
          await API.patch<
            ApiResponse<LoanApplication>
          >(
            `/loans/admin/applications/${application._id}/status`,
            {
              status: "approved",
            }
          );

        if (
          !approvalResponse.data.success
        ) {
          throw new Error(
            approvalResponse.data.message ||
              "Failed to approve application"
          );
        }

        currentStatus = "approved";

        if (approvalResponse.data.data) {
          setApplications((current) =>
            current.map((item) =>
              item._id === application._id
                ? approvalResponse.data.data!
                : item
            )
          );
        }
      }

      // -----------------------------------------------------
      // STEP 2: CREATE OFFER
      // -----------------------------------------------------

      if (currentStatus === "approved") {
        const offerResponse =
          await API.post<ApiResponse>(
            `/loan-offers/admin/applications/${application._id}`,
            {
              approvedAmount: application.amountRequested,
            }
          );

        if (!offerResponse.data.success) {
          throw new Error(
            offerResponse.data.message ||
              "Application approved but offer creation failed"
          );
        }
      }

      toast.success(
        "Application approved and loan offer created."
      );

      // -----------------------------------------------------
      // STEP 3: REFRESH
      // -----------------------------------------------------

      await loadApplications();
    } catch (error: any) {
      console.error(
        "ADMIN APPROVE AND CREATE OFFER ERROR:",
        error
      );

      toast.error(
        getErrorMessage(
          error,
          "Failed to approve and create loan offer."
        )
      );

      // Always reload to reflect actual backend state.
      await loadApplications();
    } finally {
      setUpdatingId(null);
    }
  };

  // =========================================================
  // REJECT APPLICATION
  // =========================================================

  const rejectApplication = async (
    application: LoanApplication
  ) => {
    if (
      application.status === "offer_created"
    ) {
      toast.info(
        "An offer has already been created. This application cannot be rejected from here."
      );

      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to reject this loan application?"
    );

    if (!confirmed) {
      return;
    }

    await updateStatus(
      application._id,
      "rejected"
    );
  };

  // =========================================================
  // REVIEW APPLICATION
  // =========================================================

  const reviewApplication = async (
    application: LoanApplication
  ) => {
    if (
      application.status === "offer_created" ||
      application.status === "completed" ||
      application.status === "disbursed"
    ) {
      toast.info(
        "This application is no longer awaiting review."
      );

      return;
    }

    await updateStatus(
      application._id,
      "under_review"
    );
  };

  // =========================================================
  // CREATE OFFER ONLY
  // =========================================================

  const handleCreateOffer = async (
    application: LoanApplication
  ) => {
    if (
      application.status !== "approved"
    ) {
      toast.error(
        "The application must be approved before creating an offer."
      );

      return;
    }

    const confirmed = window.confirm(
      "Create a loan offer for this approved application?"
    );

    if (!confirmed) {
      return;
    }

    await createOffer(application._id);
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2
            size={36}
            className="mx-auto mb-3 animate-spin text-orange-500"
          />

          <p className="text-sm text-gray-500">
            Loading loan applications...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // COUNTS
  // =========================================================

  const totalApplications =
    applications.length;

  const pendingApplications =
    applications.filter((application) =>
      [
        "submitted",
        "pending",
        "under_review",
        "credit_check",
      ].includes(application.status)
    ).length;

  const approvedApplications =
    applications.filter((application) =>
      [
        "approved",
        "offer_created",
      ].includes(application.status)
    ).length;

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="space-y-6">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Loan Applications
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Review applications, approve loans,
            and create customer offers.
          </p>
        </div>

        <button
          type="button"
          onClick={loadApplications}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
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

      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Total Applications
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {totalApplications}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Pending Review
          </p>

          <p className="mt-2 text-2xl font-bold text-yellow-600">
            {pendingApplications}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Approved / Offers
          </p>

          <p className="mt-2 text-2xl font-bold text-green-600">
            {approvedApplications}
          </p>
        </div>
      </div>

      {/* =====================================================
          EMPTY
      ===================================================== */}

      {applications.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
          <Clock
            size={48}
            className="mx-auto mb-4 text-gray-300"
          />

          <h2 className="text-lg font-semibold text-gray-900">
            No loan applications
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            There are currently no loan
            applications to review.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map(
            (application) => {
              const currency =
                application.loanProduct
                  ?.currency || "NGN";

              const isUpdating =
                updatingId ===
                application._id;

              const hasOffer =
                application.status ===
                "offer_created";

              const isApproved =
                application.status ===
                "approved";

              const isRejected =
                application.status ===
                "rejected";

              const isCancelled =
                application.status ===
                "cancelled";

              return (
                <div
                  key={application._id}
                  className="rounded-2xl bg-white p-5 shadow-sm"
                >
                  {/* =========================================
                      TOP
                  ========================================= */}

                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="font-semibold text-gray-900">
                          {
                            application.applicationNumber
                          }
                        </h2>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClass(
                            application.status
                          )}`}
                        >
                          {formatStatus(
                            application.status
                          )}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-gray-500">
                        {
                          application.user
                            ?.name
                        }

                        {" · "}

                        {
                          application.user
                            ?.email
                        }
                      </p>

                      {application.user
                        ?.phone && (
                        <p className="mt-1 text-xs text-gray-400">
                          {
                            application.user
                              .phone
                          }
                        </p>
                      )}
                    </div>

                    <div className="text-left lg:text-right">
                      <p className="text-xs text-gray-400">
                        Requested Amount
                      </p>

                      <p className="text-xl font-bold text-gray-900">
                        {formatAmount(
                          application.amountRequested,
                          currency
                        )}
                      </p>
                    </div>
                  </div>

                  {/* =========================================
                      DETAILS
                  ========================================= */}

                  <div className="mt-5 grid grid-cols-2 gap-4 border-t pt-5 md:grid-cols-4">
                    <div>
                      <p className="text-xs text-gray-400">
                        Loan Product
                      </p>

                      <p className="mt-1 text-sm font-medium text-gray-800">
                        {
                          application
                            .loanProduct
                            ?.name
                        }
                      </p>

                      {application
                        .loanProduct
                        ?.code && (
                        <p className="mt-0.5 text-xs text-gray-400">
                          {
                            application
                              .loanProduct
                              .code
                          }
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">
                        Duration
                      </p>

                      <p className="mt-1 text-sm font-medium text-gray-800">
                        {
                          application.durationDays
                        }{" "}
                        days
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">
                        Monthly Income
                      </p>

                      <p className="mt-1 text-sm font-medium text-gray-800">
                        {formatAmount(
                          application.monthlyIncome,
                          currency
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">
                        Employment
                      </p>

                      <p className="mt-1 text-sm font-medium capitalize text-gray-800">
                        {formatStatus(
                          application.employmentStatus
                        )}
                      </p>
                    </div>
                  </div>

                  {/* =========================================
                      CREDIT
                  ========================================= */}

                  <div className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 md:grid-cols-3">
                    <div>
                      <p className="text-xs text-gray-400">
                        Credit Decision
                      </p>

                      <p className="mt-1 text-sm font-semibold capitalize text-gray-800">
                        {formatStatus(
                          application.creditDecision ||
                            "pending"
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">
                        Credit Score
                      </p>

                      <p className="mt-1 text-sm font-semibold text-gray-800">
                        {application.creditScore ??
                          "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400">
                        Created
                      </p>

                      <p className="mt-1 text-sm font-semibold text-gray-800">
                        {new Date(
                          application.createdAt
                        ).toLocaleDateString(
                          "en-NG"
                        )}
                      </p>
                    </div>
                  </div>

                  {/* =========================================
                      PURPOSE
                  ========================================= */}

                  {application.purpose && (
                    <div className="mt-5 rounded-xl bg-gray-50 p-4">
                      <p className="text-xs font-medium text-gray-400">
                        Loan Purpose
                      </p>

                      <p className="mt-1 text-sm text-gray-700">
                        {
                          application.purpose
                        }
                      </p>
                    </div>
                  )}

                  {/* =========================================
                      REJECTION REASON
                  ========================================= */}

                  {application.rejectionReason && (
                    <div className="mt-5 rounded-xl bg-red-50 p-4">
                      <p className="text-xs font-medium text-red-500">
                        Rejection Reason
                      </p>

                      <p className="mt-1 text-sm text-red-700">
                        {
                          application.rejectionReason
                        }
                      </p>
                    </div>
                  )}

                  {/* =========================================
                      ACTIONS
                  ========================================= */}

                  <div className="mt-5 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Eye size={16} />

                      <span>
                        Application Status:{" "}
                        <strong className="capitalize text-gray-700">
                          {formatStatus(
                            application.status
                          )}
                        </strong>
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {/* REVIEW */}

                      <button
                        type="button"
                        disabled={
                          isUpdating ||
                          hasOffer ||
                          isRejected ||
                          isCancelled
                        }
                        onClick={() =>
                          reviewApplication(
                            application
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
                        ) : (
                          <Clock size={16} />
                        )}

                        Review
                      </button>

                      {/* APPROVE */}

                      <button
                        type="button"
                        disabled={
                          isUpdating ||
                          isApproved ||
                          hasOffer ||
                          isRejected ||
                          isCancelled
                        }
                        onClick={() =>
                          approveApplication(
                            application
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
                        ) : (
                          <CheckCircle
                            size={16}
                          />
                        )}

                        {isApproved
                          ? "Approved"
                          : "Approve"}
                      </button>

                      {/* CREATE OFFER */}

                      <button
                        type="button"
                        disabled={
                          isUpdating ||
                          !isApproved ||
                          hasOffer
                        }
                        onClick={() =>
                          handleCreateOffer(
                            application
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 transition hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <Loader2
                            size={16}
                            className="animate-spin"
                          />
                        ) : (
                          <CheckCircle
                            size={16}
                          />
                        )}

                        {hasOffer
                          ? "Offer Created"
                          : "Create Offer"}
                      </button>

                      {/* APPROVE + CREATE OFFER */}

                      {!isApproved &&
                        !hasOffer &&
                        !isRejected &&
                        !isCancelled && (
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() =>
                              approveAndCreateOffer(
                                application
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isUpdating ? (
                              <Loader2
                                size={16}
                                className="animate-spin"
                              />
                            ) : (
                              <CheckCircle
                                size={16}
                              />
                            )}

                            Approve & Create
                          </button>
                        )}

                      {/* REJECT */}

                      <button
                        type="button"
                        disabled={
                          isUpdating ||
                          isRejected ||
                          hasOffer ||
                          isCancelled
                        }
                        onClick={() =>
                          rejectApplication(
                            application
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <XCircle size={16} />

                        Reject
                      </button>

                      {/* STATUS */}

                      <select
                        value={
                          application.status
                        }
                        disabled={
                          isUpdating
                        }
                        onChange={(event) =>
                          updateStatus(
                            application._id,
                            event.target.value
                          )
                        }
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm capitalize outline-none transition focus:border-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {statuses.map(
                          (status) => (
                            <option
                              key={status}
                              value={status}
                            >
                              {formatStatus(
                                status
                              )}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}
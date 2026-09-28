import { useEffect, useState } from "react";
import {
  Banknote,
  Clock3,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

import API from "../services/Api";

interface LoanApplication {
  _id: string;
  applicationNumber: string;
  amountRequested: number;
  durationDays: number;
  purpose?: string | null;
  monthlyIncome?: number | null;
  employmentStatus?: string | null;
  status: string;
  creditDecision?: string;
  rejectionReason?: string | null;
  submittedAt?: string | null;
  createdAt: string;
}

interface ApplicationsResponse {
  success: boolean;
  data: LoanApplication[];
  message?: string;
}

const formatAmount = (
  amount: number,
  currency = "NGN"
) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (date?: string | null) => {
  if (!date) return "-";

  return new Date(date).toLocaleDateString(
    "en-NG",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );
};

const getStatusClass = (status: string) => {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-700";

    case "rejected":
      return "bg-red-100 text-red-700";

    case "under_review":
      return "bg-blue-100 text-blue-700";

    case "submitted":
    default:
      return "bg-orange-100 text-orange-700";
  }
};

export default function MyLoanApplications() {
  const [applications, setApplications] =
    useState<LoanApplication[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const loadApplications = async () => {
      try {
        setLoading(true);

        const response =
          await API.get<ApplicationsResponse>(
            "/loans/applications/my"
          );

        setApplications(
          response.data.data || []
        );
      } catch (error: any) {
        console.error(
          "Failed to load loan applications:",
          error
        );

        toast.error(
          error?.response?.data?.message ||
            "Failed to load your loan applications."
        );
      } finally {
        setLoading(false);
      }
    };

    loadApplications();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2
            size={35}
            className="mx-auto mb-3 animate-spin text-orange-500"
          />

          <p className="text-sm text-gray-500">
            Loading your loan applications...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* HEADER */}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          My Loan Applications
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Track the status of your loan applications.
        </p>
      </div>

      {/* EMPTY */}

      {applications.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
          <Banknote
            size={48}
            className="mx-auto mb-4 text-gray-300"
          />

          <h2 className="text-lg font-semibold text-gray-900">
            No loan applications yet
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            You have not submitted a loan application.
          </p>

          <Link
            to="/loans"
            className="mt-5 inline-flex rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white"
          >
            Browse Loans
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map(
            (application) => (
              <div
                key={application._id}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >
                {/* TOP */}

                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs text-gray-400">
                      Application Number
                    </p>

                    <h2 className="mt-1 font-semibold text-gray-900">
                      {
                        application.applicationNumber
                      }
                    </h2>
                  </div>

                  <span
                    className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClass(
                      application.status
                    )}`}
                  >
                    {application.status.replace(
                      "_",
                      " "
                    )}
                  </span>
                </div>

                {/* DETAILS */}

                <div className="mt-5 grid grid-cols-2 gap-4 border-t pt-5 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-gray-400">
                      Amount
                    </p>

                    <p className="mt-1 font-semibold text-gray-900">
                      {formatAmount(
                        application.amountRequested
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">
                      Duration
                    </p>

                    <p className="mt-1 font-semibold text-gray-900">
                      {
                        application.durationDays
                      }{" "}
                      days
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">
                      Credit Decision
                    </p>

                    <p className="mt-1 font-semibold capitalize text-gray-900">
                      {(
                        application.creditDecision ||
                        "pending"
                      ).replace(
                        "_",
                        " "
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">
                      Submitted
                    </p>

                    <p className="mt-1 font-semibold text-gray-900">
                      {formatDate(
                        application.submittedAt ||
                          application.createdAt
                      )}
                    </p>
                  </div>
                </div>

                {/* REJECTION */}

                {application.status ===
                  "rejected" &&
                  application.rejectionReason && (
                    <div className="mt-5 flex gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                      <XCircle
                        size={20}
                        className="shrink-0"
                      />

                      <div>
                        <p className="font-semibold">
                          Application rejected
                        </p>

                        <p className="mt-1">
                          {
                            application.rejectionReason
                          }
                        </p>
                      </div>
                    </div>
                  )}

                {/* PENDING */}

                {application.status ===
                  "submitted" && (
                  <div className="mt-5 flex gap-3 rounded-xl bg-orange-50 p-4 text-sm text-orange-700">
                    <Clock3
                      size={20}
                      className="shrink-0"
                    />

                    <div>
                      <p className="font-semibold">
                        Application under processing
                      </p>

                      <p className="mt-1">
                        Your application has been
                        submitted and is waiting for
                        review.
                      </p>
                    </div>
                  </div>
                )}

                {/* APPROVED */}

                {application.status ===
                  "approved" && (
                  <div className="mt-5 flex gap-3 rounded-xl bg-green-50 p-4 text-sm text-green-700">
                    <CheckCircle2
                      size={20}
                      className="shrink-0"
                    />

                    <div>
                      <p className="font-semibold">
                        Loan approved
                      </p>

                      <p className="mt-1">
                        Your loan application has been
                        approved.
                      </p>
                    </div>
                  </div>
                )}

                {/* ACTION */}

                <div className="mt-5 flex justify-end border-t pt-5">
                  <Link
                    to={`/loans/applications/${application._id}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <Eye size={17} />
                    View Details
                  </Link>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
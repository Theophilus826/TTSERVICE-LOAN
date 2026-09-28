import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  XCircle,
} from "lucide-react";
import { toast } from "react-toastify";

import API from "../services/Api";

// =========================================================
// TYPES
// =========================================================

type RepaymentAllocation = {
  installmentId: string;
  installmentNumber: number;
  amount: number;
};

type Repayment = {
  _id: string;

  user: string;
  loanApplication: string;
  repaymentSchedule: string;

  paymentReference: string;

  amount: number;
  currency?: string;

  paymentMethod: string;

  provider?: string | null;
  providerReference?: string | null;

  status:
    | "pending"
    | "processing"
    | "successful"
    | "failed"
    | "reversed";

  failureReason?: string | null;

  providerData?: unknown;

  allocatedAmount: number;
  unallocatedAmount: number;

  allocation?: RepaymentAllocation[];

  paidAt?: string | null;

  createdAt?: string;
};

type RepaymentHistoryResponse = {
  success: boolean;
  count?: number;
  data?: Repayment[];
  message?: string;
};

// =========================================================
// HELPERS
// =========================================================

const formatMoney = (
  amount: number,
  currency = "NGN",
) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
};

const formatDateTime = (
  date?: string | null,
) => {
  if (!date) return "N/A";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "N/A";
  }

  return parsed.toLocaleString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatStatus = (
  status?: string | null,
) => {
  if (!status) return "N/A";

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getStatusClass = (
  status: Repayment["status"],
) => {
  switch (status) {
    case "successful":
      return "bg-green-100 text-green-700";

    case "processing":
      return "bg-blue-100 text-blue-700";

    case "pending":
      return "bg-yellow-100 text-yellow-700";

    case "failed":
    case "reversed":
      return "bg-red-100 text-red-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getStatusIcon = (
  status: Repayment["status"],
) => {
  switch (status) {
    case "successful":
      return <CheckCircle2 size={18} />;

    case "failed":
    case "reversed":
      return <XCircle size={18} />;

    case "processing":
    case "pending":
      return <Clock3 size={18} />;

    default:
      return <CreditCard size={18} />;
  }
};

// =========================================================
// COMPONENT
// =========================================================

export default function RepaymentHistory() {
  const navigate = useNavigate();

  const [repayments, setRepayments] =
    useState<Repayment[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [filter, setFilter] =
    useState<"all" | Repayment["status"]>(
      "all",
    );

  // =========================================================
  // LOAD HISTORY
  // =========================================================

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await API.get<RepaymentHistoryResponse>(
          "/repayments/history",
        );

      if (!response.data.success) {
        throw new Error(
          response.data.message ||
            "Unable to load repayment history.",
        );
      }

      setRepayments(
        response.data.data || [],
      );
    } catch (err: any) {
      console.error(
        "LOAD REPAYMENT HISTORY ERROR:",
        err?.response?.data || err,
      );

      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to load repayment history.";

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // =========================================================
  // FILTER
  // =========================================================

  const filteredRepayments =
    useMemo(() => {
      if (filter === "all") {
        return repayments;
      }

      return repayments.filter(
        (repayment) =>
          repayment.status === filter,
      );
    }, [repayments, filter]);

  // =========================================================
  // SUMMARY
  // =========================================================

  const totalSuccessful =
    useMemo(() => {
      return repayments
        .filter(
          (repayment) =>
            repayment.status ===
            "successful",
        )
        .reduce(
          (total, repayment) =>
            total + Number(repayment.amount || 0),
          0,
        );
    }, [repayments]);

  const successfulCount =
    repayments.filter(
      (repayment) =>
        repayment.status ===
        "successful",
    ).length;

  const pendingCount =
    repayments.filter((repayment) =>
      [
        "pending",
        "processing",
      ].includes(repayment.status),
    ).length;

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2
            size={35}
            className="mx-auto animate-spin text-orange-500"
          />

          <p className="mt-3 text-sm text-gray-500">
            Loading repayment history...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* BACK */}

      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-orange-500"
      >
        <ArrowLeft size={17} />
        Back
      </button>

      {/* HEADER */}

      <div className="mb-6">
        <p className="text-sm font-medium text-gray-500">
          Payments
        </p>

        <h1 className="mt-1 text-3xl font-bold text-gray-900">
          Repayment History
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          View all payments made toward your loans.
        </p>
      </div>

      {/* SUMMARY */}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Total Repaid"
          value={formatMoney(
            totalSuccessful,
          )}
          icon={
            <CheckCircle2 size={20} />
          }
        />

        <SummaryCard
          label="Successful Payments"
          value={String(
            successfulCount,
          )}
          icon={
            <CreditCard size={20} />
          }
        />

        <SummaryCard
          label="Pending Payments"
          value={String(pendingCount)}
          icon={<Clock3 size={20} />}
        />
      </div>

      {/* ERROR */}

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* FILTERS */}

      <div className="mb-5 flex flex-wrap gap-2">
        {[
          ["all", "All"],
          ["successful", "Successful"],
          ["pending", "Pending"],
          ["processing", "Processing"],
          ["failed", "Failed"],
          ["reversed", "Reversed"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() =>
              setFilter(
                value as
                  | "all"
                  | Repayment["status"],
              )
            }
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === value
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* EMPTY */}

      {filteredRepayments.length ===
        0 && (
        <div className="rounded-2xl border bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500">
            <CreditCard size={25} />
          </div>

          <h2 className="mt-4 text-xl font-bold text-gray-900">
            No repayments found
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            {filter === "all"
              ? "You have not made any repayments yet."
              : `There are no ${formatStatus(
                  filter,
                ).toLowerCase()} repayments.`}
          </p>
        </div>
      )}

      {/* LIST */}

      {filteredRepayments.length >
        0 && (
        <div className="space-y-4">
          {filteredRepayments.map(
            (repayment) => (
              <div
                key={repayment._id}
                className="rounded-2xl border bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                        repayment.status ===
                        "successful"
                          ? "bg-green-100 text-green-600"
                          : repayment.status ===
                              "failed" ||
                            repayment.status ===
                              "reversed"
                          ? "bg-red-100 text-red-600"
                          : "bg-yellow-100 text-yellow-600"
                      }`}
                    >
                      {getStatusIcon(
                        repayment.status,
                      )}
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">
                        Payment Reference
                      </p>

                      <p className="font-semibold text-gray-900">
                        {
                          repayment.paymentReference
                        }
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {formatDateTime(
                          repayment.paidAt ||
                            repayment.createdAt,
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-xl font-bold text-gray-900">
                      {formatMoney(
                        repayment.amount,
                        repayment.currency ||
                          "NGN",
                      )}
                    </p>

                    <span
                      className={`mt-2 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                        repayment.status,
                      )}`}
                    >
                      {formatStatus(
                        repayment.status,
                      )}
                    </span>
                  </div>
                </div>

                {/* DETAILS */}

                <div className="mt-5 grid gap-3 border-t pt-5 sm:grid-cols-3">
                  <HistoryDetail
                    label="Payment Method"
                    value={formatStatus(
                      repayment.paymentMethod,
                    )}
                  />

                  <HistoryDetail
                    label="Allocated"
                    value={formatMoney(
                      repayment.allocatedAmount,
                      repayment.currency ||
                        "NGN",
                    )}
                  />

                  <HistoryDetail
                    label="Unallocated"
                    value={formatMoney(
                      repayment.unallocatedAmount,
                      repayment.currency ||
                        "NGN",
                    )}
                  />
                </div>

                {/* INSTALLMENTS */}

                {repayment.allocation &&
                  repayment.allocation.length >
                    0 && (
                    <div className="mt-5 rounded-xl bg-gray-50 p-4">
                      <p className="mb-3 text-sm font-semibold text-gray-700">
                        Payment Allocation
                      </p>

                      <div className="space-y-2">
                        {repayment.allocation.map(
                          (allocation) => (
                            <div
                              key={`${repayment._id}-${allocation.installmentId}`}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-gray-500">
                                Installment #
                                {
                                  allocation.installmentNumber
                                }
                              </span>

                              <span className="font-semibold text-gray-900">
                                {formatMoney(
                                  allocation.amount,
                                  repayment.currency ||
                                    "NGN",
                                )}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                {/* FAILED */}

                {repayment.failureReason && (
                  <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                    <p className="font-semibold">
                      Payment failed
                    </p>

                    <p className="mt-1">
                      {
                        repayment.failureReason
                      }
                    </p>
                  </div>
                )}

                {/* PROVIDER */}

                {repayment.provider && (
                  <div className="mt-4 text-xs text-gray-400">
                    Provider:{" "}
                    {repayment.provider}
                    {repayment.providerReference
                      ? ` · ${repayment.providerReference}`
                      : ""}
                  </div>
                )}
              </div>
            ),
          )}
        </div>
      )}

      {/* BACK */}

      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mt-8 inline-flex items-center gap-2 rounded-lg border px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
      >
        <ArrowLeft size={17} />
        Back
      </button>
    </div>
  );
}

// =========================================================
// SUMMARY CARD
// =========================================================

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-600">
          {icon}
        </div>
      </div>

      <p className="mt-4 text-sm text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}

// =========================================================
// HISTORY DETAIL
// =========================================================

function HistoryDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-gray-900">
        {value}
      </p>
    </div>
  );
}
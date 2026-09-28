
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Clock3,
  Eye,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "react-toastify";

import autoDebitApi, {
  type AutoDebit,
} from "../services/autoDebitApi";

// =========================================================
// HELPERS
// =========================================================

const formatMoney = (
  amount?: number,
  currency = "NGN",
) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
};

const formatStatus = (
  status?: string,
) => {
  if (!status) return "Unknown";

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
};

const formatDate = (
  date?: string | null,
) => {
  if (!date) return "N/A";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "N/A";
  }

  return parsed.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getStatusClass = (
  status: AutoDebit["status"],
) => {
  switch (status) {
    case "successful":
      return "bg-green-100 text-green-700";

    case "processing":
      return "bg-blue-100 text-blue-700";

    case "pending":
      return "bg-yellow-100 text-yellow-700";

    case "failed":
      return "bg-red-100 text-red-700";

    case "reversed":
      return "bg-purple-100 text-purple-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getStatusIcon = (
  status: AutoDebit["status"],
) => {
  switch (status) {
    case "successful":
      return <CheckCircle2 size={16} />;

    case "processing":
      return <Loader2 size={16} />;

    case "pending":
      return <Clock3 size={16} />;

    case "failed":
    case "reversed":
      return <XCircle size={16} />;

    default:
      return <Clock3 size={16} />;
  }
};

// =========================================================
// COMPONENT
// =========================================================

export default function AutoDebitHistory() {
  const [debits, setDebits] =
    useState<AutoDebit[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  // =======================================================
  // LOAD
  // =======================================================

  const loadDebits = async (
    refresh = false,
  ) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response =
        await autoDebitApi.getAutoDebits();

      if (!response.success) {
        throw new Error(
          response.message ||
            "Unable to load auto debit history.",
        );
      }

      setDebits(
        response.data || [],
      );
    } catch (error: any) {
      console.error(
        "AUTO DEBIT HISTORY ERROR:",
        error?.response?.data || error,
      );

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to load auto debit history.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDebits();
  }, []);

  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2
            size={35}
            className="mx-auto animate-spin text-orange-500"
          />

          <p className="mt-3 text-sm text-gray-500">
            Loading auto debit history...
          </p>
        </div>
      </div>
    );
  }

  // =======================================================
  // STATS
  // =======================================================

  const successfulCount =
    debits.filter(
      (item) =>
        item.status ===
        "successful",
    ).length;

  const pendingCount =
    debits.filter(
      (item) =>
        [
          "pending",
          "processing",
        ].includes(item.status),
    ).length;

  const failedCount =
    debits.filter(
      (item) =>
        item.status === "failed",
    ).length;

  const totalPaid =
    debits
      .filter(
        (item) =>
          item.status ===
          "successful",
      )
      .reduce(
        (total, item) =>
          total +
          Number(item.amount || 0),
        0,
      );

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* HEADER */}

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link
            to="/repayments"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-orange-500"
          >
            <ArrowLeft size={16} />
            Back to Repayments
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <Banknote size={25} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Auto Debit History
              </h1>

              <p className="text-sm text-gray-500">
                View your automatic repayment transactions.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={refreshing}
          onClick={() =>
            loadDebits(true)
          }
          className="inline-flex items-center justify-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw
            size={17}
            className={
              refreshing
                ? "animate-spin"
                : ""
            }
          />

          Refresh
        </button>
      </div>

      {/* STATS */}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Auto Debits"
          value={debits.length}
          icon={<Banknote size={20} />}
        />

        <StatCard
          label="Successful"
          value={successfulCount}
          icon={
            <CheckCircle2 size={20} />
          }
        />

        <StatCard
          label="Pending"
          value={pendingCount}
          icon={<Clock3 size={20} />}
        />

        <StatCard
          label="Total Paid"
          value={formatMoney(totalPaid)}
          icon={
            <CheckCircle2 size={20} />
          }
        />
      </div>

      {/* FAILED NOTICE */}

      {failedCount > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-red-50 p-5 text-red-800">
          <XCircle
            size={21}
            className="mt-0.5 shrink-0"
          />

          <div>
            <p className="font-semibold">
              {failedCount} automatic payment
              {failedCount === 1
                ? ""
                : "s"} failed
            </p>

            <p className="mt-1 text-sm">
              Review the transaction details
              for the failure reason.
            </p>
          </div>
        </div>
      )}

      {/* EMPTY */}

      {debits.length === 0 ? (
        <div className="rounded-2xl border bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500">
            <Banknote size={25} />
          </div>

          <h2 className="mt-4 text-lg font-bold text-gray-900">
            No auto debit transactions
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            You have not made any automatic
            repayment transactions yet.
          </p>

          <Link
            to="/repayments"
            className="mt-6 inline-flex rounded-lg bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600"
          >
            View Repayments
          </Link>
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE */}

          <div className="hidden overflow-hidden rounded-2xl border bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Reference
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Amount
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Date
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {debits.map(
                    (debit) => (
                      <tr
                        key={
                          debit._id
                        }
                        className="hover:bg-gray-50"
                      >
                        <td className="px-5 py-5">
                          <p className="max-w-[220px] truncate text-sm font-semibold text-gray-900">
                            {
                              debit.debitReference
                            }
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {debit
                              .loanApplication
                              ?.applicationNumber ||
                              "Loan"}
                          </p>
                        </td>

                        <td className="px-5 py-5">
                          <p className="font-semibold text-gray-900">
                            {formatMoney(
                              debit.amount,
                              debit.currency ||
                                "NGN",
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusClass(
                              debit.status,
                            )}`}
                          >
                            {getStatusIcon(
                              debit.status,
                            )}

                            {formatStatus(
                              debit.status,
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-5">
                          <p className="text-sm text-gray-600">
                            {formatDate(
                              debit.createdAt,
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-5 text-right">
                          <Link
                            to={`/repayments/auto-debit/${debit._id}`}
                            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            <Eye
                              size={16}
                            />

                            View
                          </Link>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE CARDS */}

          <div className="space-y-4 md:hidden">
            {debits.map(
              (debit) => (
                <div
                  key={
                    debit._id
                  }
                  className="rounded-2xl border bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        Reference
                      </p>

                      <p className="mt-1 break-all text-sm font-bold text-gray-900">
                        {
                          debit.debitReference
                        }
                      </p>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusClass(
                        debit.status,
                      )}`}
                    >
                      {getStatusIcon(
                        debit.status,
                      )}

                      {formatStatus(
                        debit.status,
                      )}
                    </span>
                  </div>

                  <div className="mt-5">
                    <p className="text-xs text-gray-500">
                      Amount
                    </p>

                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      {formatMoney(
                        debit.amount,
                        debit.currency ||
                          "NGN",
                      )}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">
                        Loan
                      </p>

                      <p className="mt-1 truncate text-sm font-semibold">
                        {debit
                          .loanApplication
                          ?.applicationNumber ||
                          "N/A"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">
                        Date
                      </p>

                      <p className="mt-1 text-sm font-semibold">
                        {formatDate(
                          debit.createdAt,
                        )}
                      </p>
                    </div>
                  </div>

                  <Link
                    to={`/repayments/auto-debit/${debit._id}`}
                    className="mt-4 flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <Eye size={16} />
                    View Details
                  </Link>
                </div>
              ),
            )}
          </div>
        </>
      )}
    </div>
  );
}

// =========================================================
// STAT CARD
// =========================================================

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {label}
        </p>

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-2xl font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}


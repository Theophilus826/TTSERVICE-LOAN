import { useCallback, useEffect, useState } from "react";

import {
  CreditCard,
  Search,
  RefreshCw,
  Clock3,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
} from "lucide-react";

import adminRepaymentApi, {
  AdminRepayment,
  AdminRepaymentStatus,
} from "../services/adminRepaymentApi";

const formatMoney = (
  amount?: number,
  currency = "NGN"
) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
};

const formatLabel = (
  value?: string | null
) =>
  value
    ? value.replace(/_/g, " ")
    : "—";

const getBorrowerName = (
  repayment: AdminRepayment
) => {
  const user = repayment.user;

  if (!user) {
    return "Unknown borrower";
  }

  const fullName = [
    user.firstName,
    user.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    fullName ||
    user.name ||
    user.email ||
    "Unknown borrower"
  );
};

const getStatusClasses = (
  status: AdminRepaymentStatus
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
      return "bg-gray-100 text-gray-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
};

const AdminRepaymentsPage = () => {
  const [repayments, setRepayments] = useState<
    AdminRepayment[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [refreshing, setRefreshing] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [status, setStatus] = useState<
    AdminRepaymentStatus | ""
  >("");

  const [page, setPage] =
    useState(1);

  const [total, setTotal] =
    useState(0);

  const [totalPages, setTotalPages] =
    useState(1);

  const limit = 20;

  /*
   * ---------------------------------------------------------
   * RECONCILIATION STATE
   * ---------------------------------------------------------
   */

  const [reconciling, setReconciling] =
    useState(false);

  const [reconcileLoanId, setReconcileLoanId] =
    useState("");

  const [reconcileReference, setReconcileReference] =
    useState("");

  const [reconcileMessage, setReconcileMessage] =
    useState("");

  const [reconcileSuccess, setReconcileSuccess] =
    useState<boolean | null>(null);

  /*
   * ---------------------------------------------------------
   * LOAD REPAYMENTS
   * ---------------------------------------------------------
   */

  const loadRepayments = useCallback(
    async (showRefresh = false) => {
      try {
        setError("");

        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const result =
          await adminRepaymentApi.getRepayments({
            status,
            page,
            limit,
          });

        setRepayments(
          result.items || []
        );

        setTotal(
          result.total || 0
        );

        setTotalPages(
          result.totalPages || 1
        );
      } catch (error) {
        console.error(
          "Failed to load repayments:",
          error
        );

        const requestError = error as {
          response?: {
            data?: {
              message?: string;
            };
          };
          message?: string;
        };

        setError(
          requestError.response?.data?.message ||
            requestError.message ||
            "Unable to load repayments. Please try again."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [status, page]
  );

  useEffect(() => {
    void loadRepayments();
  }, [loadRepayments]);

  /*
   * ---------------------------------------------------------
   * RECONCILE PAYMENT
   * ---------------------------------------------------------
   */

  const handleReconcilePayment =
    async () => {
      const loanId =
        reconcileLoanId.trim();

      const providerReference =
        reconcileReference.trim();

      if (!loanId) {
        setReconcileSuccess(false);
        setReconcileMessage(
          "Loan ID is required."
        );
        return;
      }

      if (!providerReference) {
        setReconcileSuccess(false);
        setReconcileMessage(
          "Paystack provider reference is required."
        );
        return;
      }

      try {
        setReconciling(true);
        setReconcileMessage("");
        setReconcileSuccess(null);
        setError("");

        const result =
          await adminRepaymentApi.reconcilePayment(
            loanId,
            providerReference
          );

        if (result.alreadyProcessed) {
          setReconcileSuccess(true);
          setReconcileMessage(
            "This payment has already been reconciled."
          );
        } else {
          setReconcileSuccess(true);
          setReconcileMessage(
            `Payment reconciled successfully. ${formatMoney(
              result.amount,
              result.currency || "NGN"
            )} was applied to the loan.`
          );
        }

        /*
         * Refresh the repayment list so the
         * newly-created repayment appears.
         */
        await loadRepayments(true);

        /*
         * Clear the form after successful
         * reconciliation.
         */
        setReconcileLoanId("");
        setReconcileReference("");
      } catch (error) {
        console.error(
          "Failed to reconcile payment:",
          error
        );

        const requestError = error as {
          response?: {
            data?: {
              message?: string;
            };
          };
          message?: string;
        };

        setReconcileSuccess(false);

        setReconcileMessage(
          requestError.response?.data?.message ||
            requestError.message ||
            "Unable to reconcile payment. Please try again."
        );
      } finally {
        setReconciling(false);
      }
    };

  /*
   * ---------------------------------------------------------
   * SEARCH FILTER
   * ---------------------------------------------------------
   */

  const filteredRepayments =
    repayments.filter((repayment) => {
      if (!search.trim()) {
        return true;
      }

      const query =
        search.trim().toLowerCase();

      const borrower =
        getBorrowerName(
          repayment
        ).toLowerCase();

      const loanNumber =
        repayment.loan?.loanNumber?.toLowerCase() ||
        "";

      const paymentReference =
        repayment.paymentReference?.toLowerCase() ||
        "";

      const providerReference =
        repayment.providerReference?.toLowerCase() ||
        "";

      return (
        borrower.includes(query) ||
        loanNumber.includes(query) ||
        paymentReference.includes(query) ||
        providerReference.includes(query)
      );
    });

  /*
   * ---------------------------------------------------------
   * STATISTICS
   * ---------------------------------------------------------
   */

  const processingCount =
    repayments.filter(
      (item) =>
        item.status === "processing" ||
        item.status === "pending"
    ).length;

  const successfulCount =
    repayments.filter(
      (item) =>
        item.status === "successful"
    ).length;

  const failedCount =
    repayments.filter(
      (item) =>
        item.status === "failed" ||
        item.status === "reversed"
    ).length;

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  return (
    <div className="space-y-6">
      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-3">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Repayments
              </h1>

              <p className="text-sm text-gray-500">
                Monitor loan repayments,
                mandate collections, and
                payment reconciliation
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadRepayments(true)
          }
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing
                ? "animate-spin"
                : ""
            }`}
          />

          Refresh
        </button>
      </div>

      {/* =====================================================
          ERROR
          ===================================================== */}

      {error && (
        <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-red-700">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadRepayments(true)
            }
            disabled={
              loading || refreshing
            }
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing
                  ? "animate-spin"
                  : ""
              }`}
            />

            Retry
          </button>
        </div>
      )}

      {/* =====================================================
          STATS
          ===================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total */}
        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Total Repayments
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {total}
              </p>
            </div>

            <CreditCard className="h-7 w-7 text-gray-400" />
          </div>
        </div>

        {/* Processing */}
        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Processing
              </p>

              <p className="mt-2 text-2xl font-bold text-blue-600">
                {processingCount}
              </p>
            </div>

            <Clock3 className="h-7 w-7 text-blue-500" />
          </div>
        </div>

        {/* Successful */}
        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Successful
              </p>

              <p className="mt-2 text-2xl font-bold text-green-600">
                {successfulCount}
              </p>
            </div>

            <CheckCircle2 className="h-7 w-7 text-green-500" />
          </div>
        </div>

        {/* Failed */}
        <div className="rounded-xl border bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Failed
              </p>

              <p className="mt-2 text-2xl font-bold text-red-600">
                {failedCount}
              </p>
            </div>

            <XCircle className="h-7 w-7 text-red-500" />
          </div>
        </div>
      </div>

      {/* =====================================================
          PAYMENT RECONCILIATION
          ===================================================== */}

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-blue-100 p-2">
            <RotateCcw className="h-5 w-5 text-blue-600" />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Reconcile DVA Payment
            </h2>

            <p className="mt-1 text-xs leading-5 text-gray-600">
              Use this when a Paystack DVA
              payment was successfully credited
              to a repayment account but was not
              applied to the borrower&apos;s loan.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* Loan ID */}
          <div>
            <label
              htmlFor="reconcile-loan-id"
              className="mb-1.5 block text-xs font-medium text-gray-700"
            >
              Loan ID
            </label>

            <input
              id="reconcile-loan-id"
              type="text"
              value={reconcileLoanId}
              onChange={(event) =>
                setReconcileLoanId(
                  event.target.value
                )
              }
              placeholder="Enter loan ID"
              disabled={reconciling}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>

          {/* Provider reference */}
          <div>
            <label
              htmlFor="reconcile-provider-reference"
              className="mb-1.5 block text-xs font-medium text-gray-700"
            >
              Paystack Provider Reference
            </label>

            <input
              id="reconcile-provider-reference"
              type="text"
              value={reconcileReference}
              onChange={(event) =>
                setReconcileReference(
                  event.target.value
                )
              }
              placeholder="Enter Paystack reference"
              disabled={reconciling}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>

          {/* Button */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={() =>
                void handleReconcilePayment()
              }
              disabled={
                reconciling ||
                !reconcileLoanId.trim() ||
                !reconcileReference.trim()
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw
                className={`h-4 w-4 ${
                  reconciling
                    ? "animate-spin"
                    : ""
                }`}
              />

              {reconciling
                ? "Reconciling..."
                : "Reconcile Payment"}
            </button>
          </div>
        </div>

        {/* Reconciliation result */}
        {reconcileMessage && (
          <div
            className={`mt-4 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${
              reconcileSuccess
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {reconcileSuccess ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}

            <p>
              {reconcileMessage}
            </p>
          </div>
        )}

        <div className="mt-3 rounded-lg border border-blue-100 bg-white px-4 py-3">
          <p className="text-xs leading-5 text-gray-500">
            The reconciliation amount is
            determined by the original successful
            DVA funding transaction on the server.
            The admin does not enter an amount, which
            prevents accidentally applying the wrong
            amount to the loan.
          </p>
        </div>
      </div>

      {/* =====================================================
          FILTERS
          ===================================================== */}

      <div className="rounded-xl border bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search loan, borrower or reference..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Status */}
          <select
            value={status}
            onChange={(event) => {
              setStatus(
                event.target.value as
                  | AdminRepaymentStatus
                  | ""
              );

              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">
              All statuses
            </option>

            <option value="pending">
              Pending
            </option>

            <option value="processing">
              Processing
            </option>

            <option value="successful">
              Successful
            </option>

            <option value="failed">
              Failed
            </option>

            <option value="reversed">
              Reversed
            </option>
          </select>
        </div>
      </div>

      {/* =====================================================
          TABLE
          ===================================================== */}

      <div className="overflow-hidden rounded-xl border bg-white">
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : filteredRepayments.length ===
          0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
            <AlertCircle className="h-10 w-10 text-gray-300" />

            <h3 className="mt-4 text-sm font-semibold text-gray-900">
              No repayments found
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              There are no repayments matching
              your current filters.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Loan
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Borrower
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Amount
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Method
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Status
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Reference
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredRepayments.map(
                    (repayment) => (
                      <tr
                        key={repayment._id}
                        className="hover:bg-gray-50"
                      >
                        {/* Loan */}
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {repayment.loan
                              ?.loanNumber ||
                              "—"}
                          </div>

                          <div className="text-xs text-gray-500">
                            {formatLabel(
                              repayment.repaymentSource
                            )}
                          </div>
                        </td>

                        {/* Borrower */}
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {getBorrowerName(
                              repayment
                            )}
                          </div>

                          <div className="text-xs text-gray-500">
                            {repayment.user?.email ||
                              "—"}
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          {formatMoney(
                            repayment.amount,
                            repayment.currency
                          )}
                        </td>

                        {/* Method */}
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                          {formatLabel(
                            repayment.paymentMethod
                          )}
                        </td>

                        {/* Status */}
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getStatusClasses(
                              repayment.status
                            )}`}
                          >
                            {formatLabel(
                              repayment.status
                            )}
                          </span>
                        </td>

                        {/* Reference */}
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="max-w-[220px] truncate font-mono text-xs text-gray-600">
                            {repayment.providerReference ||
                              repayment.paymentReference ||
                              "—"}
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* =================================================
                PAGINATION
                ================================================= */}

            <div className="flex items-center justify-between border-t px-6 py-4">
              <p className="text-sm text-gray-500">
                Page {page} of{" "}
                {totalPages}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage((current) =>
                      Math.max(
                        1,
                        current - 1
                      )
                    )
                  }
                  className="rounded-lg border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <button
                  type="button"
                  disabled={
                    page >= totalPages
                  }
                  onClick={() =>
                    setPage((current) =>
                      Math.min(
                        totalPages,
                        current + 1
                      )
                    )
                  }
                  className="rounded-lg border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminRepaymentsPage;
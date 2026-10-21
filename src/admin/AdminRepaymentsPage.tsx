
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
  Wallet,
  Play,
  Eye,
} from "lucide-react";

import adminRepaymentApi, {
  AdminRepayment,
  AdminRepaymentStatus,
} from "../services/adminRepaymentApi";

// =========================================================
// HELPERS
// =========================================================

const formatMoney = (
  amount?: number,
  currency = "NGN"
) => {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  } catch {
    return `${currency} ${Number(amount || 0).toFixed(2)}`;
  }
};

const formatLabel = (value?: string | null) =>
  value ? value.replace(/_/g, " ") : "—";

const getBorrowerName = (repayment: AdminRepayment) => {
  const user = repayment.user;

  if (!user) return "Unknown borrower";

  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ");

  return fullName || user.name || user.email || "Unknown borrower";
};

const getStatusClasses = (status: AdminRepaymentStatus) => {
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

const getRequestErrorMessage = (error: unknown) => {
  const requestError = error as {
    response?: { data?: { message?: string } };
    message?: string;
  };

  return (
    requestError.response?.data?.message ||
    requestError.message ||
    "The request failed. Please try again."
  );
};

// =========================================================
// PAGE
// =========================================================

const AdminRepaymentsPage = () => {
  // -------------------------------------------------------
  // REPAYMENT LIST STATE
  // -------------------------------------------------------

  const [repayments, setRepayments] = useState<AdminRepayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AdminRepaymentStatus | "">("");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const limit = 20;

  // -------------------------------------------------------
  // RECONCILIATION STATE
  // -------------------------------------------------------

  const [reconciling, setReconciling] = useState(false);
  const [reconcileLoanId, setReconcileLoanId] = useState("");
  const [reconcileReference, setReconcileReference] = useState("");
  const [reconcileMessage, setReconcileMessage] = useState("");
  const [reconcileSuccess, setReconcileSuccess] = useState<boolean | null>(
    null
  );

  // -------------------------------------------------------
  // AUTO-DEBIT STATE
  // -------------------------------------------------------

  const [autoDebitLoading, setAutoDebitLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [autoDebitMessage, setAutoDebitMessage] = useState("");
  const [autoDebitSuccess, setAutoDebitSuccess] = useState<boolean | null>(
    null
  );

  const [autoDebitPreview, setAutoDebitPreview] = useState<{
    dueInstallments: number;
    totalAmount: number;
    currency?: string;
  } | null>(null);

  const [autoDebitResults, setAutoDebitResults] = useState<{
    attempted: number;
    successful: number;
    failed: number;
    skipped: number;
  } | null>(null);

  // -------------------------------------------------------
  // LOAD REPAYMENTS
  // -------------------------------------------------------

  const loadRepayments = useCallback(
    async (showRefresh = false) => {
      try {
        setError("");

        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const result = await adminRepaymentApi.getRepayments({
          status,
          page,
          limit,
        });

        setRepayments(result.items || []);
        setTotal(result.total || 0);
        setTotalPages(Math.max(1, result.totalPages || 1));
      } catch (requestError) {
        console.error("Failed to load repayments:", requestError);
        setError(getRequestErrorMessage(requestError));
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

  // -------------------------------------------------------
  // RECONCILE PAYMENT
  // -------------------------------------------------------

  const handleReconcilePayment = async () => {
    const loanId = reconcileLoanId.trim();
    const providerReference = reconcileReference.trim();

    if (!loanId || !providerReference) {
      setReconcileSuccess(false);
      setReconcileMessage(
        !loanId
          ? "Loan ID is required."
          : "Paystack provider reference is required."
      );
      return;
    }

    try {
      setReconciling(true);
      setReconcileMessage("");
      setReconcileSuccess(null);

      const result = await adminRepaymentApi.reconcilePayment(
        loanId,
        providerReference
      );

      setReconcileSuccess(true);

      if (result.alreadyProcessed) {
        setReconcileMessage(
          "This payment has already been reconciled."
        );
      } else if (result.repaymentApplied === false) {
        setReconcileMessage(
          result.message ||
            "The payment was checked, but no repayment was applied."
        );
      } else {
        setReconcileMessage(
          result.message ||
            `Reconciliation completed. Amount verified by the server: ${formatMoney(
              result.amount,
              result.currency || "NGN"
            )}.`
        );
      }

      setReconcileLoanId("");
      setReconcileReference("");

      await loadRepayments(true);
    } catch (requestError) {
      console.error("Failed to reconcile payment:", requestError);
      setReconcileSuccess(false);
      setReconcileMessage(getRequestErrorMessage(requestError));
    } finally {
      setReconciling(false);
    }
  };

  // -------------------------------------------------------
  // PREVIEW DUE AUTO-DEBITS
  // -------------------------------------------------------

  const handlePreviewAutoDebit = async () => {
    try {
      setPreviewLoading(true);
      setAutoDebitMessage("");
      setAutoDebitSuccess(null);
      setAutoDebitPreview(null);
      setAutoDebitResults(null);

      const result = await adminRepaymentApi.previewAutoDebit();

      setAutoDebitPreview(result);
      setAutoDebitSuccess(true);

      setAutoDebitMessage(
        "Preview completed. No payments were initiated."
      );
    } catch (requestError) {
      console.error("Failed to preview auto-debit:", requestError);
      setAutoDebitSuccess(false);
      setAutoDebitMessage(getRequestErrorMessage(requestError));
    } finally {
      setPreviewLoading(false);
    }
  };

  // -------------------------------------------------------
  // RUN AUTO-DEBIT
  // -------------------------------------------------------

  const handleRunAutoDebit = async () => {
    const confirmed = window.confirm(
      "Start collection processing for eligible due installments? Only valid, authorized mandates should be charged."
    );

    if (!confirmed) return;

    try {
      setAutoDebitLoading(true);
      setAutoDebitMessage("");
      setAutoDebitSuccess(null);
      setAutoDebitResults(null);

      const result = await adminRepaymentApi.runAutoDebit();

      setAutoDebitResults({
        attempted: result.attempted,
        successful: result.successful,
        failed: result.failed,
        skipped: result.skipped,
      });

      const allReportedOutcomes =
        result.successful + result.failed + result.skipped;

      const hasUnclassifiedAttempts =
        result.attempted > allReportedOutcomes;

      setAutoDebitSuccess(
        result.failed === 0 && !hasUnclassifiedAttempts
      );

      setAutoDebitMessage(
        hasUnclassifiedAttempts
          ? "The backend returned incomplete collection counts. Verify outstanding or pending provider transactions before retrying."
          : result.failed > 0
            ? "Collection processing finished with failures. Review failed and pending provider transactions before retrying."
            : "Collection processing request completed. Confirm provider outcomes before treating collections as settled."
      );

      await loadRepayments(true);
    } catch (requestError) {
      console.error("Failed to run auto-debit:", requestError);
      setAutoDebitSuccess(false);
      setAutoDebitMessage(getRequestErrorMessage(requestError));
    } finally {
      setAutoDebitLoading(false);
    }
  };

  // -------------------------------------------------------
  // FILTER CURRENT PAGE
  // -------------------------------------------------------

  const filteredRepayments = repayments.filter((repayment) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return [
      getBorrowerName(repayment),
      repayment.user?.email,
      repayment.loan?.loanNumber,
      repayment.paymentReference,
      repayment.providerReference,
    ].some((value) => value?.toLowerCase().includes(query));
  });

  // -------------------------------------------------------
  // STATISTICS FOR CURRENT PAGE
  // -------------------------------------------------------

  const processingCount = repayments.filter(
    (item) =>
      item.status === "processing" || item.status === "pending"
  ).length;

  const successfulCount = repayments.filter(
    (item) => item.status === "successful"
  ).length;

  const failedCount = repayments.filter(
    (item) =>
      item.status === "failed" || item.status === "reversed"
  ).length;

  // -------------------------------------------------------
  // RENDER
  // -------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-3">
            <CreditCard className="h-6 w-6 text-blue-600" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Repayments
            </h1>
            <p className="text-sm text-gray-500">
              Monitor repayments, mandate collections, and reconciliation.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadRepayments(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* ERROR */}

      {error && (
        <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-red-700">{error}</p>

          <button
            type="button"
            onClick={() => void loadRepayments(true)}
            disabled={loading || refreshing}
            className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-red-700 disabled:opacity-50"
          >
            Retry
          </button>
        </div>
      )}

      {/* STATS */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Repayments"
          value={total}
          icon={<CreditCard className="h-7 w-7 text-gray-400" />}
        />
        <StatCard
          label="Pending / Processing"
          value={processingCount}
          icon={<Clock3 className="h-7 w-7 text-blue-500" />}
          valueClass="text-blue-600"
        />
        <StatCard
          label="Successful"
          value={successfulCount}
          icon={<CheckCircle2 className="h-7 w-7 text-green-500" />}
          valueClass="text-green-600"
        />
        <StatCard
          label="Failed / Reversed"
          value={failedCount}
          icon={<XCircle className="h-7 w-7 text-red-500" />}
          valueClass="text-red-600"
        />
      </div>

      {/* RECONCILIATION */}

      <section className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="rounded-lg bg-blue-100 p-2">
            <RotateCcw className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">
              Reconcile DVA Payment
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Apply a verified Paystack DVA payment that was credited but not
              allocated to the borrower&apos;s loan.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label
              htmlFor="reconcile-loan-id"
              className="mb-1.5 block text-xs font-medium text-gray-700"
            >
              Loan ID
            </label>
            <input
              id="reconcile-loan-id"
              value={reconcileLoanId}
              onChange={(event) => setReconcileLoanId(event.target.value)}
              placeholder="Enter loan ID"
              disabled={reconciling}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="reconcile-reference"
              className="mb-1.5 block text-xs font-medium text-gray-700"
            >
              Paystack Provider Reference
            </label>
            <input
              id="reconcile-reference"
              value={reconcileReference}
              onChange={(event) =>
                setReconcileReference(event.target.value)
              }
              placeholder="Enter provider reference"
              disabled={reconciling}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void handleReconcilePayment()}
              disabled={
                reconciling ||
                !reconcileLoanId.trim() ||
                !reconcileReference.trim()
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {reconciling && (
                <RefreshCw className="h-4 w-4 animate-spin" />
              )}
              {reconciling ? "Reconciling..." : "Reconcile Payment"}
            </button>
          </div>
        </div>

        {reconcileMessage && (
          <div
            role="status"
            className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
              reconcileSuccess
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {reconcileMessage}
          </div>
        )}

        <p className="mt-3 text-xs leading-5 text-gray-500">
          The server must verify the original successful funding transaction
          and derive the amount. Do not trust a client-supplied amount for
          reconciliation.
        </p>
      </section>

      {/* AUTO-DEBIT */}

      <section className="rounded-xl border border-indigo-200 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-indigo-100 p-3">
              <Wallet className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">
                Daily Auto-Debit Collections
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Review due installments before requesting collection processing.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handlePreviewAutoDebit()}
              disabled={previewLoading || autoDebitLoading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {previewLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              {previewLoading ? "Loading..." : "Preview Due"}
            </button>

            <button
              type="button"
              onClick={() => void handleRunAutoDebit()}
              disabled={autoDebitLoading || previewLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {autoDebitLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {autoDebitLoading ? "Processing..." : "Run Collections"}
            </button>
          </div>
        </div>

        {autoDebitMessage && (
          <div
            role="status"
            className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
              autoDebitSuccess
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {autoDebitMessage}
          </div>
        )}

        {autoDebitPreview && (
          <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50 p-4">
            <p className="text-sm font-medium text-indigo-900">
              Eligible installment preview
            </p>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-600">Due installments</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {autoDebitPreview.dueInstallments}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">
                  Total eligible amount
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {formatMoney(
                    autoDebitPreview.totalAmount,
                    autoDebitPreview.currency || "NGN"
                  )}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Preview only. No payments were initiated by this request.
            </p>
          </div>
        )}

        {autoDebitResults && (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Attempted", value: autoDebitResults.attempted },
              { label: "Successful", value: autoDebitResults.successful },
              { label: "Failed", value: autoDebitResults.failed },
              { label: "Skipped", value: autoDebitResults.skipped },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-gray-200 p-4"
              >
                <p className="text-sm text-gray-500">{item.label}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 text-xs leading-5 text-gray-500">
          Only collect installments that are due, unpaid, and covered by a
          valid authorized mandate. The backend must prevent duplicate charges
          and distinguish confirmed, failed, and pending provider transactions.
        </p>
      </section>

      {/* FILTERS */}

      <section className="rounded-xl border bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search borrower, loan or payment reference..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm"
            />
          </div>

          <select
            value={status}
            onChange={(event) => {
              setStatus(
                event.target.value as AdminRepaymentStatus | ""
              );
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="successful">Successful</option>
            <option value="failed">Failed</option>
            <option value="reversed">Reversed</option>
          </select>
        </div>
      </section>

      {/* REPAYMENT TABLE */}

      <section className="overflow-hidden rounded-xl border bg-white">
        {loading ? (
          <div className="flex min-h-[250px] items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : filteredRepayments.length === 0 ? (
          <div className="flex min-h-[250px] flex-col items-center justify-center px-6 text-center">
            <AlertCircle className="h-10 w-10 text-gray-300" />
            <h3 className="mt-4 text-sm font-semibold text-gray-900">
              No repayments found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              No repayments match your current search and filters.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      "Loan",
                      "Borrower",
                      "Amount",
                      "Method",
                      "Status",
                      "Reference",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredRepayments.map((repayment) => (
                    <tr key={repayment._id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">
                          {repayment.loan?.loanNumber || "—"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatLabel(repayment.repaymentSource)}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">
                          {getBorrowerName(repayment)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {repayment.user?.email || "—"}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {formatMoney(repayment.amount, repayment.currency)}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                        {formatLabel(repayment.paymentMethod)}
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getStatusClasses(
                            repayment.status
                          )}`}
                        >
                          {formatLabel(repayment.status)}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        <p className="max-w-[220px] truncate font-mono text-xs text-gray-600">
                          {repayment.providerReference ||
                            repayment.paymentReference ||
                            "—"}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}

            <div className="flex items-center justify-between border-t px-6 py-4">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() =>
                    setPage((current) => Math.max(1, current - 1))
                  }
                  className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
                >
                  Previous
                </button>

                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() =>
                    setPage((current) =>
                      Math.min(totalPages, current + 1)
                    )
                  }
                  className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

// =========================================================
// STAT CARD
// =========================================================

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  valueClass?: string;
}

function StatCard({
  label,
  value,
  icon,
  valueClass = "text-gray-900",
}: StatCardProps) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className={`mt-2 text-2xl font-bold ${valueClass}`}>
            {value}
          </p>
        </div>
        {icon}
      </div>
    </div>
  );
}

export default AdminRepaymentsPage;

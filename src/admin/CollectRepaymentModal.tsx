import React, {
  FormEvent,
  useEffect,
  useState,
} from "react";

import adminRepaymentApi, {
  CollectMandateRepaymentResponse,
} from "../services/adminRepaymentApi";

interface CollectRepaymentModalProps {
  isOpen: boolean;
  loanId: string;
  loanNumber?: string;
  outstandingAmount: number;
  onClose: () => void;
  onSuccess?: (
    result: CollectMandateRepaymentResponse
  ) => void;
}

const formatMoney = (
  amount: number | undefined | null
) => {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return "₦0.00";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
};

const getErrorMessage = (error: any) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Unable to initiate repayment."
  );
};

const CollectRepaymentModal: React.FC<
  CollectRepaymentModalProps
> = ({
  isOpen,
  loanId,
  loanNumber,
  outstandingAmount,
  onClose,
  onSuccess,
}) => {
  const [amount, setAmount] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [result, setResult] =
    useState<CollectMandateRepaymentResponse | null>(
      null
    );

  const numericOutstandingAmount =
    Number(outstandingAmount || 0);

  const numericAmount = Number(amount);

  const hasOutstandingBalance =
    Number.isFinite(
      numericOutstandingAmount
    ) &&
    numericOutstandingAmount > 0;

  const isValidAmount =
    Number.isFinite(numericAmount) &&
    numericAmount > 0 &&
    numericAmount <=
      numericOutstandingAmount;

  // =====================================================
  // RESET
  // =====================================================

  useEffect(() => {
    if (!isOpen) {
      setAmount("");
      setLoading(false);
      setError("");
      setResult(null);
    }
  }, [isOpen]);

  // =====================================================
  // CLOSE
  // =====================================================

  const handleClose = () => {
    if (loading) {
      return;
    }

    onClose();
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");

    // ---------------------------------------------------
    // Validate loan
    // ---------------------------------------------------

    if (!loanId) {
      setError("Loan ID is missing.");
      return;
    }

    // ---------------------------------------------------
    // Validate outstanding balance
    // ---------------------------------------------------

    if (!hasOutstandingBalance) {
      setError(
        "This loan does not have a valid outstanding balance."
      );

      return;
    }

    // ---------------------------------------------------
    // Validate amount
    // ---------------------------------------------------

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError(
        "Enter a valid repayment amount."
      );

      return;
    }

    if (
      numericAmount >
      numericOutstandingAmount
    ) {
      setError(
        `Amount cannot exceed the outstanding balance of ${formatMoney(
          numericOutstandingAmount
        )}.`
      );

      return;
    }

    // ---------------------------------------------------
    // Submit
    // ---------------------------------------------------

    try {
      setLoading(true);

      const repaymentAmount = Number(
        numericAmount.toFixed(2)
      );

      const response =
        await adminRepaymentApi.collectMandateRepayment(
          loanId,
          repaymentAmount
        );

      setResult(response);

      /*
       * Important:
       *
       * This response means the mandate charge was
       * initiated. It does NOT mean the repayment has
       * successfully settled yet.
       *
       * The Paystack webhook is responsible for marking
       * the repayment successful and updating:
       *
       * - Repayment
       * - Loan.amountPaid
       * - Loan.outstandingAmount
       * - RepaymentSchedule
       */
      onSuccess?.(response);
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // DON'T RENDER
  // =====================================================

  if (!isOpen) {
    return null;
  }

  // =====================================================
  // PROCESSING RESULT
  // =====================================================

  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">

          {/* Header */}

          <div className="border-b border-gray-100 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 text-yellow-700">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                  />

                  <path d="M12 6v6l4 2" />
                </svg>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Repayment Initiated
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  The mandate charge is being processed.
                </p>
              </div>
            </div>
          </div>

          {/* Details */}

          <div className="p-6">
            <div className="space-y-3 rounded-xl bg-gray-50 p-4">

              {/* Loan */}

              <div className="flex items-start justify-between gap-4">
                <span className="text-sm text-gray-500">
                  Loan
                </span>

                <span className="text-right text-sm font-medium text-gray-900">
                  {loanNumber || loanId}
                </span>
              </div>

              {/* Amount */}

              <div className="flex items-start justify-between gap-4">
                <span className="text-sm text-gray-500">
                  Amount
                </span>

                <span className="text-right text-sm font-semibold text-gray-900">
                  {formatMoney(result.amount)}
                </span>
              </div>

              {/* Status */}

              <div className="flex items-start justify-between gap-4">
                <span className="text-sm text-gray-500">
                  Status
                </span>

                <span className="rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-1 text-xs font-semibold capitalize text-yellow-700">
                  {result.status}
                </span>
              </div>

              {/* Reference */}

              <div className="flex items-start justify-between gap-4">
                <span className="text-sm text-gray-500">
                  Reference
                </span>

                <span className="max-w-[220px] break-all text-right text-xs font-medium text-gray-900">
                  {result.paymentReference}
                </span>
              </div>

              {/* Provider */}

              {result.provider && (
                <div className="flex items-start justify-between gap-4">
                  <span className="text-sm text-gray-500">
                    Provider
                  </span>

                  <span className="text-sm font-medium capitalize text-gray-900">
                    {result.provider}
                  </span>
                </div>
              )}
            </div>

            {/* Processing Notice */}

            <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm font-semibold text-yellow-800">
                Waiting for payment confirmation
              </p>

              <p className="mt-1 text-sm leading-6 text-yellow-700">
                The repayment has not been marked
                successful yet. The loan balance will only
                be updated after Paystack confirms the
                charge through the payment webhook.
              </p>
            </div>

            {/* Done */}

            <button
              type="button"
              onClick={handleClose}
              className="mt-5 w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =====================================================
  // FORM
  // =====================================================

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">

        {/* Header */}

        <div className="border-b px-6 py-5">
          <h2 className="text-xl font-semibold text-gray-900">
            Collect Repayment
          </h2>

          <p className="mt-1 text-sm leading-6 text-gray-500">
            Collect repayment using the borrower's active
            mandate.
          </p>
        </div>

        {/* Body */}

        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-6"
        >
          {/* Loan */}

          <div>
            <label className="text-sm font-medium text-gray-700">
              Loan
            </label>

            <div className="mt-1 rounded-lg bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900">
              {loanNumber || loanId}
            </div>
          </div>

          {/* Outstanding */}

          <div>
            <label className="text-sm font-medium text-gray-700">
              Outstanding Balance
            </label>

            <div className="mt-1 rounded-lg bg-gray-50 px-4 py-3 text-lg font-semibold text-gray-900">
              {formatMoney(
                numericOutstandingAmount
              )}
            </div>
          </div>

          {/* Amount */}

          <div>
            <label
              htmlFor="repayment-amount"
              className="text-sm font-medium text-gray-700"
            >
              Repayment Amount
            </label>

            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                ₦
              </span>

              <input
                id="repayment-amount"
                type="number"
                min="0.01"
                max={
                  hasOutstandingBalance
                    ? numericOutstandingAmount
                    : undefined
                }
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(event) => {
                  setAmount(
                    event.target.value
                  );

                  if (error) {
                    setError("");
                  }
                }}
                disabled={
                  loading ||
                  !hasOutstandingBalance
                }
                placeholder="Enter amount"
                autoComplete="off"
                className="w-full rounded-lg border border-gray-300 py-3 pl-8 pr-4 text-sm outline-none transition focus:border-gray-900 focus:ring-1 focus:ring-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100"
              />
            </div>

            <p className="mt-1 text-xs text-gray-500">
              Maximum:{" "}
              {formatMoney(
                numericOutstandingAmount
              )}
            </p>
          </div>

          {/* Error */}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-700">
                {error}
              </p>
            </div>
          )}

          {/* Warning */}

          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
            <p className="text-sm leading-6 text-yellow-800">
              This will initiate a charge against the
              borrower's repayment mandate. Make sure the
              amount is correct before continuing.
            </p>
          </div>

          {/* Actions */}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                loading ||
                !hasOutstandingBalance ||
                !isValidAmount
              }
              className="flex-1 rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Initiating..."
                : "Collect Repayment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CollectRepaymentModal;
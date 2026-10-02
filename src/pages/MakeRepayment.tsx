import React, { useCallback, useEffect, useState } from "react";
import repaymentApi, {
  type PaymentMethod,
  type RepaymentAccount,
  type RepaymentSchedule,
} from "../services/repaymentApi";

const MakeRepayment: React.FC = () => {
  const [schedule, setSchedule] =
    useState<RepaymentSchedule | null>(null);

  const [repaymentAccount, setRepaymentAccount] =
    useState<RepaymentAccount | null>(null);

  const [loading, setLoading] = useState(true);
  const [repaying, setRepaying] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("account");

  const [amount, setAmount] = useState("");

  /* =========================================================
     LOAD REPAYMENT + DVA
  ========================================================= */

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        scheduleResponse,
        accountResponse,
      ] = await Promise.all([
        repaymentApi.getRepaymentSchedule(),
        repaymentApi.getRepaymentAccount(),
      ]);

      if (scheduleResponse?.success) {
        setSchedule(
          scheduleResponse.data ?? null,
        );
      } else {
        setSchedule(null);
      }

      if (accountResponse?.success) {
        setRepaymentAccount(
          accountResponse.data ?? null,
        );
      } else {
        setRepaymentAccount(null);
      }
    } catch (err: any) {
      console.error(
        "Failed to load repayment data:",
        err,
      );

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load repayment information.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  /* =========================================================
     MONEY FORMAT
  ========================================================= */

  const formatMoney = (
    value?: number | null,
  ) => {
    if (value == null) {
      return "₦0.00";
    }

    return new Intl.NumberFormat(
      "en-NG",
      {
        style: "currency",
        currency: "NGN",
        minimumFractionDigits: 2,
      },
    ).format(value);
  };

  /* =========================================================
     REPAYMENT VALUES
  ========================================================= */

  const availableBalance =
    repaymentAccount?.balance ?? 0;

  const payableAmount =
    schedule?.amountDue ??
    schedule?.remainingAmount ??
    schedule?.totalDue ??
    0;

  const repaymentAmount =
    amount.trim() === ""
      ? payableAmount
      : Number(amount);

  const isValidAmount =
    Number.isFinite(repaymentAmount) &&
    repaymentAmount > 0;

  const hasEnoughBalance =
    paymentMethod !== "account" ||
    availableBalance >= repaymentAmount;

  const dvaIsActive =
    repaymentAccount?.dvaStatus === "active";

  const canRepay =
    !repaying &&
    !!schedule &&
    isValidAmount &&
    hasEnoughBalance &&
    (
      paymentMethod !== "account" ||
      (
        !!repaymentAccount &&
        dvaIsActive
      )
    );

  /* =========================================================
     HANDLE REPAYMENT
  ========================================================= */

  const handleRepayment = async () => {
    try {
      setError(null);
      setSuccess(null);

      if (!schedule) {
        setError(
          "No repayment schedule is available.",
        );
        return;
      }

      if (!isValidAmount) {
        setError(
          "Enter a valid repayment amount.",
        );
        return;
      }

      if (
        paymentMethod === "account" &&
        !repaymentAccount
      ) {
        setError(
          "Your repayment account is not available.",
        );
        return;
      }

      if (
        paymentMethod === "account" &&
        !dvaIsActive
      ) {
        setError(
          "Your dedicated repayment account is not active yet.",
        );
        return;
      }

      if (
        paymentMethod === "account" &&
        availableBalance < repaymentAmount
      ) {
        setError(
          `Insufficient repayment account balance. Available balance is ${formatMoney(
            availableBalance,
          )}.`,
        );
        return;
      }

      setRepaying(true);

      /* =====================================================
         REPAY FROM DVA / REPAYMENT ACCOUNT
      ===================================================== */

      if (paymentMethod === "account") {
        await repaymentApi.repayFromAccount({
          amount: repaymentAmount,
        });
      }

      /* =====================================================
         CARD / BANK TRANSFER
      ===================================================== */

      else {
        await repaymentApi.initiateRepayment({
          amount: repaymentAmount,
          paymentMethod,
        });
      }

      setSuccess(
        "Repayment initiated successfully.",
      );

      setAmount("");

      await loadData();
    } catch (err: any) {
      console.error(
        "Repayment failed:",
        err,
      );

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to process repayment.",
      );
    } finally {
      setRepaying(false);
    }
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="text-sm text-gray-500">
          Loading repayment information...
        </div>
      </div>
    );
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Make Repayment
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Make a payment toward your outstanding loan.
        </p>
      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* =====================================================
          SUCCESS
      ===================================================== */}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* =====================================================
          REPAYMENT SUMMARY
      ===================================================== */}

      <div className="rounded-xl border bg-white p-5 shadow-sm">

        <h2 className="text-lg font-semibold text-gray-900">
          Repayment Summary
        </h2>

        {!schedule ? (
          <p className="mt-4 text-sm text-gray-500">
            No active repayment schedule was found.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">

            {/* Amount Due */}

            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500">
                Amount Due
              </p>

              <p className="mt-1 text-xl font-bold text-gray-900">
                {formatMoney(payableAmount)}
              </p>
            </div>

            {/* Due Date */}

            {schedule.dueDate && (
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">
                  Due Date
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {new Date(
                    schedule.dueDate,
                  ).toLocaleDateString(
                    "en-NG",
                  )}
                </p>
              </div>
            )}

            {/* Status */}

            {schedule.status && (
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">
                  Status
                </p>

                <p className="mt-1 font-semibold capitalize text-gray-900">
                  {String(
                    schedule.status,
                  ).replace(
                    /_/g,
                    " ",
                  )}
                </p>
              </div>
            )}

            {/* Remaining */}

            {schedule.remainingAmount != null && (
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">
                  Remaining
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {formatMoney(
                    schedule.remainingAmount,
                  )}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =====================================================
          DVA / REPAYMENT ACCOUNT
      ===================================================== */}

      <div className="rounded-xl border bg-white p-5 shadow-sm">

        <div className="flex items-start justify-between gap-4">

          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Repayment Account
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Your dedicated virtual account used
              for loan repayments.
            </p>
          </div>

          {repaymentAccount?.dvaStatus && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                repaymentAccount.dvaStatus ===
                "active"
                  ? "bg-green-100 text-green-700"
                  : repaymentAccount.dvaStatus ===
                      "pending"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
              }`}
            >
              {repaymentAccount.dvaStatus}
            </span>
          )}
        </div>

        {repaymentAccount ? (
          <div className="mt-5 space-y-4">

            {/* Balance */}

            <div className="rounded-xl bg-gray-50 p-5">
              <p className="text-sm text-gray-500">
                Available Balance
              </p>

              <p className="mt-1 text-3xl font-bold text-gray-900">
                {formatMoney(
                  repaymentAccount.balance,
                )}
              </p>
            </div>

            {/* DVA Details */}

            <div className="grid gap-4 sm:grid-cols-2">

              <div>
                <p className="text-xs text-gray-500">
                  Account Number
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {repaymentAccount.accountNumber ||
                    "Not available"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Account Name
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {repaymentAccount.accountName ||
                    "Not available"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Bank
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {repaymentAccount.bankName ||
                    "Not available"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Bank Code
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {repaymentAccount.bankCode ||
                    "Not available"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Currency
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  {repaymentAccount.currency ||
                    "NGN"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">
                  Provider
                </p>

                <p className="mt-1 font-semibold capitalize text-gray-900">
                  {repaymentAccount.provider ||
                    "Not available"}
                </p>
              </div>
            </div>

            {/* Pending */}

            {repaymentAccount.dvaStatus ===
              "pending" && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                Your dedicated virtual account
                is still being activated. Please
                wait for activation before using
                it for repayment.
              </div>
            )}

            {/* Failed */}

            {repaymentAccount.dvaStatus ===
              "failed" && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                Your dedicated virtual account
                could not be activated. Please
                contact support.
              </div>
            )}

            {/* Active */}

            {repaymentAccount.dvaStatus ===
              "active" && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                Transfer money to this account
                to fund your repayment balance.
              </div>
            )}
          </div>
        ) : (
          <div className="mt-5 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
            Your dedicated repayment account is
            not available yet.
          </div>
        )}
      </div>

      {/* =====================================================
          PAYMENT
      ===================================================== */}

      <div className="rounded-xl border bg-white p-5 shadow-sm">

        <h2 className="text-lg font-semibold text-gray-900">
          Payment
        </h2>

        <div className="mt-5 space-y-5">

          {/* Payment Method */}

          <div>
            <label
              htmlFor="payment-method"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Payment Method
            </label>

            <select
              id="payment-method"
              value={paymentMethod}
              onChange={(event) =>
                setPaymentMethod(
                  event.target.value as PaymentMethod,
                )
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-gray-500"
            >
              <option value="account">
                Repayment Account
              </option>

              <option value="card">
                Card
              </option>

              <option value="bank_transfer">
                Bank Transfer
              </option>
            </select>
          </div>

          {/* Amount */}

          <div>
            <label
              htmlFor="repayment-amount"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Amount
            </label>

            <input
              id="repayment-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              placeholder={String(
                payableAmount || "",
              )}
              onChange={(event) =>
                setAmount(event.target.value)
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500"
            />

            <p className="mt-2 text-xs text-gray-500">
              Leave empty to pay the current
              amount due.
            </p>
          </div>

          {/* DVA Balance */}

          {paymentMethod === "account" && (
            <div className="rounded-lg bg-gray-50 p-4">

              <div className="flex items-center justify-between gap-4">

                <span className="text-sm text-gray-500">
                  Account balance
                </span>

                <span className="font-semibold text-gray-900">
                  {formatMoney(
                    availableBalance,
                  )}
                </span>
              </div>

              {!dvaIsActive &&
                repaymentAccount && (
                  <p className="mt-2 text-sm text-yellow-700">
                    Your repayment account is not
                    active yet.
                  </p>
                )}

              {isValidAmount &&
                !hasEnoughBalance && (
                  <p className="mt-2 text-sm text-red-600">
                    Insufficient balance for this
                    repayment.
                  </p>
                )}
            </div>
          )}

          {/* Pay Button */}

          <button
            type="button"
            onClick={handleRepayment}
            disabled={!canRepay}
            className="w-full rounded-lg bg-black px-5 py-3 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {repaying
              ? "Processing..."
              : `Pay ${formatMoney(
                  repaymentAmount,
                )}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MakeRepayment;
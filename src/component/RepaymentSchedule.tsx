
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  History,
  Loader2,
  RefreshCw,
  AlertCircle,
  Banknote,
} from "lucide-react";
import toast from "react-hot-toast";

import repaymentApi, {
  RepaymentSchedule,
  RepaymentInstallment,
  RepaymentScheduleStatus,
} from "../services/repaymentApi";
import { getApiErrorMessage } from "../services/Api";

const formatMoney = (
  amount: number | string | null | undefined,
  currency = "NGN"
) => {
  const value = Number(amount ?? 0);

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
};

const formatDate = (
  value: string | Date | null | undefined,
  fallback = "—"
) => {
  if (!value) return fallback;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return fallback;

  return new Intl.DateTimeFormat("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const formatStatus = (status?: string | null) => {
  if (!status) return "Unknown";

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getStatusClasses = (status?: RepaymentScheduleStatus | string) => {
  switch (status) {
    case "paid":
      return "bg-green-100 text-green-700";
    case "partially_paid":
      return "bg-blue-100 text-blue-700";
    case "overdue":
      return "bg-red-100 text-red-700";
    case "defaulted":
      return "bg-red-100 text-red-700";
    case "cancelled":
      return "bg-gray-100 text-gray-600";
    case "active":
    default:
      return "bg-yellow-100 text-yellow-700";
  }
};

const getInstallmentClasses = (status?: string) => {
  switch (status) {
    case "paid":
      return "border-green-200 bg-green-50";
    case "partially_paid":
      return "border-blue-200 bg-blue-50";
    case "overdue":
    case "defaulted":
      return "border-red-200 bg-red-50";
    case "cancelled":
      return "border-gray-200 bg-gray-50";
    default:
      return "border-gray-200 bg-white";
  }
};

const getInstallmentIcon = (status?: string) => {
  switch (status) {
    case "paid":
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;

    case "overdue":
    case "defaulted":
      return <AlertCircle className="h-5 w-5 text-red-600" />;

    case "partially_paid":
      return <Clock3 className="h-5 w-5 text-blue-600" />;

    default:
      return <CalendarDays className="h-5 w-5 text-gray-500" />;
  }
};

const getInstallmentAmount = (installment: RepaymentInstallment) =>
  Number(
    installment.total ??
      installment.amount ??
      installment.remaining ??
      installment.outstanding ??
      0
  );

const getInstallmentPaid = (installment: RepaymentInstallment) =>
  Number(installment.paid ?? 0);

const getInstallmentRemaining = (installment: RepaymentInstallment) => {
  if (installment.remaining !== undefined) {
    return Math.max(Number(installment.remaining), 0);
  }

  if (installment.outstanding !== undefined) {
    return Math.max(Number(installment.outstanding), 0);
  }

  return Math.max(
    getInstallmentAmount(installment) - getInstallmentPaid(installment),
    0
  );
};

const RepaymentSchedule: React.FC = () => {
  const navigate = useNavigate();

  const { repaymentScheduleId } = useParams<{
    repaymentScheduleId?: string;
  }>();

  const [schedule, setSchedule] = useState<RepaymentSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadSchedule = useCallback(
    async (showRefreshState = false) => {
      if (!repaymentScheduleId) {
        toast.error("Repayment schedule was not specified.");
        setLoading(false);
        return;
      }

      try {
        if (showRefreshState) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response = await repaymentApi.getRepaymentSchedule(
          repaymentScheduleId
        );

        setSchedule(response.data);
      } catch (error) {
        toast.error(
          getApiErrorMessage(
            error,
            "Unable to load the repayment schedule."
          )
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [repaymentScheduleId]
  );

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const installments = useMemo(
    () => schedule?.installments ?? [],
    [schedule]
  );

  const totalScheduled = useMemo(() => {
    if (!schedule) return 0;

    if (schedule.totalRepayment !== undefined) {
      return Number(schedule.totalRepayment);
    }

    return installments.reduce(
      (total, installment) => total + getInstallmentAmount(installment),
      0
    );
  }, [schedule, installments]);

  const totalPaid = useMemo(() => {
    if (!schedule) return 0;

    if (schedule.amountPaid !== undefined) {
      return Number(schedule.amountPaid);
    }

    return installments.reduce(
      (total, installment) => total + getInstallmentPaid(installment),
      0
    );
  }, [schedule, installments]);

  const totalOutstanding = useMemo(() => {
    if (!schedule) return 0;

    if (schedule.amountOutstanding !== undefined) {
      return Math.max(Number(schedule.amountOutstanding), 0);
    }

    if (schedule.outstandingAmount !== undefined) {
      return Math.max(Number(schedule.outstandingAmount), 0);
    }

    return Math.max(totalScheduled - totalPaid, 0);
  }, [schedule, totalScheduled, totalPaid]);

  const progress = useMemo(() => {
    if (totalScheduled <= 0) return 0;

    return Math.min(
      Math.max((totalPaid / totalScheduled) * 100, 0),
      100
    );
  }, [totalPaid, totalScheduled]);

  const nextInstallment = useMemo(() => {
    return (
      installments.find(
        (installment) =>
          !["paid", "cancelled"].includes(String(installment.status))
      ) ?? null
    );
  }, [installments]);

  const nextPaymentAmount = useMemo(() => {
    if (!nextInstallment) return 0;

    return getInstallmentRemaining(nextInstallment);
  }, [nextInstallment]);

  const handleRefresh = async () => {
    await loadSchedule(true);
  };

  const handleMakeRepayment = () => {
    if (!repaymentScheduleId) {
      toast.error("Repayment schedule was not specified.");
      return;
    }

    if (!schedule || totalOutstanding <= 0) {
      toast.error("There is no outstanding balance to repay.");
      return;
    }

    navigate(
      `/loans/repayments/pay/${encodeURIComponent(repaymentScheduleId)}`
    );
  };

  const handlePayInstallment = (installment: RepaymentInstallment) => {
    if (!repaymentScheduleId) {
      toast.error("Repayment schedule was not specified.");
      return;
    }

    const remaining = getInstallmentRemaining(installment);

    if (remaining <= 0 || installment.status === "paid") {
      toast("This installment has already been paid.");
      return;
    }

    navigate(
      `/loans/repayments/pay/${encodeURIComponent(repaymentScheduleId)}`
    );
  };

  const handleViewHistory = () => {
    navigate("/loans/repayments/history");
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading repayment schedule...</span>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <button
          type="button"
          onClick={() => navigate("/my-loans")}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Loans
        </button>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />

          <h2 className="text-lg font-semibold text-gray-900">
            Repayment schedule unavailable
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            We could not load the repayment schedule for this loan.
          </p>

          <button
            type="button"
            onClick={() => loadSchedule()}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const currency = schedule.currency || "NGN";

  const canRepay =
    totalOutstanding > 0 &&
    !["paid", "cancelled", "defaulted"].includes(schedule.status);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => navigate("/my-loans")}
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Loans
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleViewHistory}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <History className="h-4 w-4" />
            Payment History
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Repayment Schedule
            </p>

            <h1 className="mt-1 text-2xl font-bold text-gray-900">
              Your Loan Repayments
            </h1>

            {schedule.loanApplication && (
              <p className="mt-1 text-sm text-gray-500">
                Application:{" "}
                {typeof schedule.loanApplication === "string"
                  ? schedule.loanApplication
                  : schedule.loanApplication.applicationNumber ||
                    schedule.loanApplication._id}
              </p>
            )}
          </div>

          <span
            className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-medium ${getStatusClasses(
              schedule.status
            )}`}
          >
            {formatStatus(schedule.status)}
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Repayment</p>
          <p className="mt-2 text-xl font-bold text-gray-900">
            {formatMoney(totalScheduled, currency)}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Amount Paid</p>
          <p className="mt-2 text-xl font-bold text-green-600">
            {formatMoney(totalPaid, currency)}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Outstanding</p>
          <p className="mt-2 text-xl font-bold text-gray-900">
            {formatMoney(totalOutstanding, currency)}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Installments</p>
          <p className="mt-2 text-xl font-bold text-gray-900">
            {installments.length}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-gray-900">
              Repayment Progress
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {progress.toFixed(0)}% of the scheduled repayment has been paid.
            </p>
          </div>

          <span className="text-sm font-semibold text-gray-900">
            {formatMoney(totalPaid, currency)}
          </span>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {nextInstallment && totalOutstanding > 0 && (
        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Clock3 className="h-5 w-5 text-blue-600" />

                <h2 className="font-semibold text-gray-900">
                  Next Payment
                </h2>
              </div>

              <p className="mt-2 text-sm text-gray-600">
                Due{" "}
                {formatDate(
                  nextInstallment.dueDate ||
                    nextInstallment.finalDueDate ||
                    nextInstallment.dueAt
                )}
              </p>

              <p className="mt-1 text-xl font-bold text-gray-900">
                {formatMoney(nextPaymentAmount, currency)}
              </p>
            </div>

            <button
              type="button"
              onClick={handleMakeRepayment}
              disabled={!canRepay || actionLoading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              Make Repayment
            </button>
          </div>
        </div>
      )}

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Installment Schedule
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Review each scheduled repayment and its current status.
            </p>
          </div>
        </div>

        {installments.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <CalendarDays className="mx-auto h-10 w-10 text-gray-400" />

            <h3 className="mt-3 font-semibold text-gray-900">
              No installments found
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Your repayment schedule does not contain any installments yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {installments.map(
              (installment: RepaymentInstallment, index: number) => {
                const amount = getInstallmentAmount(installment);
                const paid = getInstallmentPaid(installment);
                const remaining = getInstallmentRemaining(installment);

                return (
                  <div
                    key={
                      installment._id ||
                      installment.id ||
                      `installment-${index}`
                    }
                    className={`rounded-2xl border p-5 shadow-sm ${getInstallmentClasses(
                      installment.status
                    )}`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {getInstallmentIcon(installment.status)}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-gray-900">
                              Installment{" "}
                              {installment.installmentNumber ?? index + 1}
                            </h3>

                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClasses(
                                installment.status
                              )}`}
                            >
                              {formatStatus(installment.status)}
                            </span>
                          </div>

                          <div className="mt-2 grid gap-2 text-sm text-gray-600 sm:grid-cols-3">
                            <span>
                              Due:{" "}
                              <strong className="font-medium text-gray-900">
                                {formatDate(
                                  installment.dueDate ||
                                    installment.finalDueDate ||
                                    installment.dueAt
                                )}
                              </strong>
                            </span>

                            <span>
                              Paid:{" "}
                              <strong className="font-medium text-gray-900">
                                {formatMoney(paid, currency)}
                              </strong>
                            </span>

                            <span>
                              Remaining:{" "}
                              <strong className="font-medium text-gray-900">
                                {formatMoney(remaining, currency)}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="text-left sm:text-right">
                          <p className="text-xs text-gray-500">
                            Scheduled Amount
                          </p>

                          <p className="font-bold text-gray-900">
                            {formatMoney(amount, currency)}
                          </p>
                        </div>

                        {remaining > 0 &&
                          !["cancelled", "defaulted"].includes(
                            String(installment.status)
                          ) && (
                            <button
                              type="button"
                              onClick={() =>
                                handlePayInstallment(installment)
                              }
                              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                              <CreditCard className="h-4 w-4" />
                              Pay
                            </button>
                          )}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 border-t border-gray-200/70 pt-4 text-sm sm:grid-cols-3">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-gray-500" />
                        <span className="text-gray-500">Principal</span>
                        <span className="ml-auto font-medium text-gray-900">
                          {formatMoney(
                            installment.principal ?? 0,
                            currency
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Interest</span>
                        <span className="ml-auto font-medium text-gray-900">
                          {formatMoney(installment.interest ?? 0, currency)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Fees</span>
                        <span className="ml-auto font-medium text-gray-900">
                          {formatMoney(
                            installment.fees ??
                              installment.processingFee ??
                              0,
                            currency
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>

      {schedule.status === "paid" && (
        <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />

            <div>
              <h3 className="font-semibold text-green-900">
                Loan fully repaid
              </h3>

              <p className="mt-1 text-sm text-green-800">
                All scheduled repayments have been completed.
              </p>
            </div>
          </div>
        </div>
      )}

      {(schedule.status === "overdue" ||
        schedule.status === "defaulted") && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

            <div>
              <h3 className="font-semibold text-red-900">
                Repayment requires attention
              </h3>

              <p className="mt-1 text-sm text-red-800">
                Some repayment obligations are overdue. Please review the
                schedule and make any available payment.
              </p>

              {canRepay && (
                <button
                  type="button"
                  onClick={handleMakeRepayment}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  <CreditCard className="h-4 w-4" />
                  Make Repayment
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepaymentSchedule;

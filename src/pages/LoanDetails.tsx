import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  DollarSign,
  FileText,
  Loader2,
  RefreshCw,
  Wallet,
  AlertCircle,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import myLoanApi, {
  getRepaymentScheduleId,
} from "../services/myLoanApi";

import type {
  CustomerLoan,
  DisbursementStatus,
  LoanStatus,
} from "../services/myLoanApi";

import { getApiErrorMessage } from "../services/Api";

/* =========================================================
HELPERS
========================================================= */

const formatMoney = (
  amount: number | string | null | undefined,
  currency = "NGN",
) => {
  const value = Number(amount ?? 0);

  if (!Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatDate = (
  value: string | Date | null | undefined,
) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatDateTime = (
  value: string | Date | null | undefined,
) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const formatLabel = (
  value: string | null | undefined,
) => {
  if (!value) {
    return "—";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
};

const getCurrency = (loan: CustomerLoan) => {
  if (
    loan.loanProduct &&
    typeof loan.loanProduct !== "string" &&
    loan.loanProduct.currency
  ) {
    return loan.loanProduct.currency;
  }

  return "NGN";
};

const getLoanName = (loan: CustomerLoan) => {
  if (
    loan.loanProduct &&
    typeof loan.loanProduct !== "string"
  ) {
    return (
      loan.loanProduct.name ||
      loan.loanProduct.code ||
      "Loan"
    );
  }

  return "Loan";
};

/* =========================================================
STATUS HELPERS
========================================================= */

const getLoanStatusClasses = (
  status: LoanStatus,
) => {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "completed":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "overdue":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "defaulted":
      return "bg-red-50 text-red-700 border-red-200";

    case "cancelled":
      return "bg-slate-100 text-slate-600 border-slate-200";

    case "disbursing":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";

    case "pending_disbursement":
    default:
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
  }
};

const getDisbursementClasses = (
  status: DisbursementStatus | null,
) => {
  switch (status) {
    case "SUCCESS":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "FAILED":
    case "REVERSED":
      return "bg-red-50 text-red-700 border-red-200";

    case "PROCESSING":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";

    case "PENDING":
    default:
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
  }
};

const getDisbursementIcon = (
  status: DisbursementStatus | null,
) => {
  switch (status) {
    case "SUCCESS":
      return (
        <CheckCircle2 className="h-4 w-4" />
      );

    case "FAILED":
    case "REVERSED":
      return (
        <AlertCircle className="h-4 w-4" />
      );

    case "PROCESSING":
      return (
        <Loader2 className="h-4 w-4 animate-spin" />
      );

    case "PENDING":
    default:
      return <Clock3 className="h-4 w-4" />;
  }
};

/* =========================================================
STAT CARD
========================================================= */

type StatCardProps = {
  label: string;
  value: string;
  icon: React.ReactNode;
  description?: string;
};

function StatCard({
  label,
  value,
  icon,
  description,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-xl font-bold text-slate-900">
            {value}
          </p>

          {description && (
            <p className="mt-1 text-xs text-slate-500">
              {description}
            </p>
          )}
        </div>

        <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
          {icon}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
PAGE
========================================================= */

export default function LoanDetails() {
  const navigate = useNavigate();

  const { id } =
    useParams<{ id: string }>();

  const [loan, setLoan] =
    useState<CustomerLoan | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  /* =======================================================
  LOAD LOAN
  ======================================================= */

  const loadLoan = useCallback(
    async (showRefreshState = false) => {
      if (!id) {
        toast.error("Loan ID is missing.");

        navigate("/my-loans", {
          replace: true,
        });

        return;
      }

      try {
        if (showRefreshState) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response =
          await myLoanApi.getMyLoan(id);

        // getMyLoan() already returns CustomerLoan.
        setLoan(response);
      } catch (error) {
        const message =
          getApiErrorMessage(
            error,
            "Unable to load your loan.",
          );

        toast.error(message);

        if (
          error &&
          typeof error === "object" &&
          "response" in error
        ) {
          const response = (
            error as {
              response?: {
                status?: number;
              };
            }
          ).response;

          if (response?.status === 404) {
            navigate("/my-loans", {
              replace: true,
            });
          }
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, navigate],
  );

  useEffect(() => {
    void loadLoan();
  }, [loadLoan]);

  /* =======================================================
  DERIVED DATA
  ======================================================= */

  const currency = useMemo(
    () => (loan ? getCurrency(loan) : "NGN"),
    [loan],
  );

  const paymentProgress = useMemo(() => {
    if (!loan) {
      return 0;
    }

    const total = Number(
      loan.totalRepayment ?? 0,
    );

    const paid = Number(
      loan.amountPaid ?? 0,
    );

    if (total <= 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.max(0, (paid / total) * 100),
    );
  }, [loan]);

  const canRepay = useMemo(() => {
    if (!loan) {
      return false;
    }

    return (
      loan.status === "active" ||
      loan.status === "overdue"
    );
  }, [loan]);

  /*
   * IMPORTANT:
   *
   * This must come from:
   *
   * loan.repaymentSchedule
   *
   * NOT:
   *
   * loan.loanApplication
   */
  const repaymentScheduleId =
    useMemo(
      () => getRepaymentScheduleId(loan),
      [loan],
    );

  const hasSchedule =
    Boolean(repaymentScheduleId);

  const schedule =
    loan &&
    loan.repaymentSchedule &&
    typeof loan.repaymentSchedule !==
      "string"
      ? loan.repaymentSchedule
      : null;

  /* =======================================================
  LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600">
          <Loader2 className="h-6 w-6 animate-spin" />

          <span>
            Loading loan details...
          </span>
        </div>
      </div>
    );
  }

  /* =======================================================
  NOT FOUND
  ======================================================= */

  if (!loan) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto h-10 w-10 text-slate-400" />

          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Loan not found
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            We could not find this loan in your account.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/my-loans")
            }
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Loans
          </button>
        </div>
      </div>
    );
  }

  /* =======================================================
  PAGE
  ======================================================= */

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() =>
              navigate("/my-loans")
            }
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            My Loans
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              {getLoanName(loan)}
            </h1>

            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getLoanStatusClasses(
                loan.status,
              )}`}
            >
              {formatLabel(loan.status)}
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Loan #
            {loan.loanNumber ||
              loan._id ||
              loan.id}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadLoan(true)
          }
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
          LOAN SUMMARY
      ===================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Principal"
          value={formatMoney(
            loan.principalAmount,
            currency,
          )}
          icon={
            <Wallet className="h-5 w-5" />
          }
        />

        <StatCard
          label="Total Repayment"
          value={formatMoney(
            loan.totalRepayment,
            currency,
          )}
          icon={
            <DollarSign className="h-5 w-5" />
          }
        />

        <StatCard
          label="Amount Paid"
          value={formatMoney(
            loan.amountPaid,
            currency,
          )}
          icon={
            <CheckCircle2 className="h-5 w-5" />
          }
        />

        <StatCard
          label="Outstanding"
          value={formatMoney(
            loan.outstandingAmount,
            currency,
          )}
          icon={
            <CreditCard className="h-5 w-5" />
          }
        />
      </div>

      {/* =====================================================
          PROGRESS
      ===================================================== */}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-900">
              Repayment progress
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {formatMoney(
                loan.amountPaid,
                currency,
              )}{" "}
              paid of{" "}
              {formatMoney(
                loan.totalRepayment,
                currency,
              )}
            </p>
          </div>

          <span className="text-sm font-bold text-slate-900">
            {Math.round(paymentProgress)}%
          </span>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-slate-900 transition-all"
            style={{
              width: `${paymentProgress}%`,
            }}
          />
        </div>
      </div>

      {/* =====================================================
          REPAYMENT SCHEDULE STATUS
      ===================================================== */}

      {loan.disbursementStatus ===
        "SUCCESS" &&
        !hasSchedule && (
          <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
            <div className="flex items-start gap-3">
              <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-indigo-600" />

              <div>
                <h2 className="font-semibold text-indigo-900">
                  Repayment schedule
                  is being prepared
                </h2>

                <p className="mt-1 text-sm text-indigo-700">
                  Your loan has been
                  disbursed successfully.
                  Your repayment schedule
                  will appear here shortly.
                </p>
              </div>
            </div>
          </div>
        )}

      {schedule && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Repayment schedule
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {schedule.installments
                  ?.length ?? 0}{" "}
                installment
                {(
                  schedule.installments
                    ?.length ?? 0
                ) !== 1
                  ? "s"
                  : ""}
              </p>
            </div>

            <span className="inline-flex w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
              {formatLabel(
                schedule.status,
              )}
            </span>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Schedule total
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {formatMoney(
                  schedule.totalRepaymentAmount,
                  schedule.currency ||
                    currency,
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Amount outstanding
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {formatMoney(
                  schedule.amountOutstanding,
                  schedule.currency ||
                    currency,
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Final due date
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {formatDate(
                  schedule.finalDueDate,
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* ===================================================
            LOAN TERMS
        =================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-100 p-2.5">
              <FileText className="h-5 w-5 text-slate-700" />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Loan terms
              </h2>

              <p className="text-sm text-slate-500">
                Your approved loan structure
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Interest rate
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {Number(
                  loan.interestRate ?? 0,
                )}
                %
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Interest type
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {formatLabel(
                  loan.interestType,
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Interest amount
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {formatMoney(
                  loan.interestAmount,
                  currency,
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Fees
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {formatMoney(
                  loan.feeAmount,
                  currency,
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Duration
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {loan.durationDays} days
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Repayment frequency
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {formatLabel(
                  loan.repaymentFrequency,
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Installment
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {formatMoney(
                  loan.installmentAmount,
                  currency,
                )}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Number of installments
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {loan.numberOfInstallments}
              </p>
            </div>
          </div>
        </section>

        {/* ===================================================
            DISBURSEMENT
        =================================================== */}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-100 p-2.5">
              <Wallet className="h-5 w-5 text-slate-700" />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Disbursement
              </h2>

              <p className="text-sm text-slate-500">
                Loan funding status
              </p>
            </div>
          </div>

          <div className="mt-6">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${getDisbursementClasses(
                loan.disbursementStatus,
              )}`}
            >
              {getDisbursementIcon(
                loan.disbursementStatus,
              )}

              {formatLabel(
                loan.disbursementStatus,
              )}
            </span>
          </div>

          <dl className="mt-6 space-y-4">
            <div>
              <dt className="text-xs text-slate-500">
                Method
              </dt>

              <dd className="mt-1 font-medium text-slate-900">
                {formatLabel(
                  loan.disbursementMethod,
                )}
              </dd>
            </div>

            <div>
              <dt className="text-xs text-slate-500">
                Amount disbursed
              </dt>

              <dd className="mt-1 font-medium text-slate-900">
                {formatMoney(
                  loan.amountDisbursed,
                  currency,
                )}
              </dd>
            </div>

            <div>
              <dt className="text-xs text-slate-500">
                Disbursed on
              </dt>

              <dd className="mt-1 font-medium text-slate-900">
                {formatDateTime(
                  loan.disbursedAt,
                )}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {/* =====================================================
          DATES
      ===================================================== */}

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-slate-100 p-2.5">
            <CalendarDays className="h-5 w-5 text-slate-700" />
          </div>

          <div>
            <h2 className="font-semibold text-slate-900">
              Loan timeline
            </h2>

            <p className="text-sm text-slate-500">
              Important dates for this loan
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Created
            </p>

            <p className="mt-1 font-semibold text-slate-900">
              {formatDate(
                loan.createdAt,
              )}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Start date
            </p>

            <p className="mt-1 font-semibold text-slate-900">
              {formatDate(
                loan.startDate,
              )}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Maturity date
            </p>

            <p className="mt-1 font-semibold text-slate-900">
              {formatDate(
                loan.maturityDate,
              )}
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================
          ACTIONS
      ===================================================== */}

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">
          Loan actions
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          View your repayment information
          or make a payment.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          {hasSchedule && (
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/loans/repayments/${encodeURIComponent(
                    repaymentScheduleId,
                  )}`,
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <CalendarDays className="h-4 w-4" />
              View Repayment Schedule
            </button>
          )}

          {canRepay && hasSchedule && (
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/loans/repayments/${encodeURIComponent(
                    repaymentScheduleId,
                  )}`,
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <CreditCard className="h-4 w-4" />
              Repay Now
            </button>
          )}

          {loan.status ===
            "completed" && (
            <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Loan Completed
            </div>
          )}

          {loan.status ===
            "pending_disbursement" && (
            <div className="inline-flex items-center gap-2 rounded-xl bg-yellow-50 px-5 py-3 text-sm font-medium text-yellow-700">
              <Clock3 className="h-4 w-4" />
              Awaiting Disbursement
            </div>
          )}

          {loan.status ===
            "disbursing" && (
            <div className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-5 py-3 text-sm font-medium text-indigo-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              Disbursement Processing
            </div>
          )}

          {loan.disbursementStatus ===
            "SUCCESS" &&
            !hasSchedule &&
            loan.status ===
              "active" && (
              <div className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 px-5 py-3 text-sm font-medium text-indigo-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparing repayment schedule...
              </div>
            )}
        </div>
      </section>

      {/* =====================================================
          LOAN APPLICATION REFERENCE
      ===================================================== */}

      {loan.loanApplication &&
        typeof loan.loanApplication !==
          "string" && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">
              Application information
            </h2>

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Application number
                </p>

                <p className="mt-1 font-medium text-slate-900">
                  {loan.loanApplication
                    .applicationNumber ||
                    "—"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Application status
                </p>

                <p className="mt-1 font-medium text-slate-900">
                  {formatLabel(
                    loan.loanApplication
                      .status,
                  )}
                </p>
              </div>
            </div>
          </section>
        )}
    </div>
  );
}
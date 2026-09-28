import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Loader2,
  RefreshCw,
  WalletCards,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import myLoanApi, {
  type CustomerLoan,
  type LoanStatus,
  type DisbursementStatus,
} from "../services/myLoanApi";

import API, { getApiErrorMessage } from "../services/Api";

import type {
  LoanOffer,
  Mandate,
} from "../services/MandateService";

import RepaymentMandateStep from "../pages/RepaymentMandateStep";

// =========================================================
// TYPES
// =========================================================

type LoanFlowStep = 1 | 2;

interface LoanOfferResponse {
  success?: boolean;
  message?: string;
  data?: LoanOffer;
  offer?: LoanOffer;
}

interface LoanOffersResponse {
  success?: boolean;
  data?: LoanOffer[];
  offers?: LoanOffer[];
}

interface MandateResponse {
  success?: boolean;
  message?: string;
  data?: Mandate;
  mandate?: Mandate;
}

// =========================================================
// CONSTANTS
// =========================================================

const LOAN_OFFERS_BASE_URL = "/loan-offers";
const MANDATES_BASE_URL = "/mandates";

// =========================================================
// HELPERS
// =========================================================

const formatMoney = (
  amount: number | null | undefined,
  currency = "NGN",
): string => {
  if (
    amount === null ||
    amount === undefined ||
    !Number.isFinite(Number(amount))
  ) {
    return "—";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount));
};

const formatDate = (value?: string | null): string => {
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

const formatFrequency = (value?: string | null): string => {
  if (!value) {
    return "—";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatInterestType = (value?: string | null): string => {
  if (!value) {
    return "—";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

// =========================================================
// LOAN DATA HELPERS
// =========================================================

const getCurrency = (loan: CustomerLoan): string => {
  if (
    loan.loanProduct &&
    typeof loan.loanProduct === "object" &&
    loan.loanProduct.currency
  ) {
    return loan.loanProduct.currency;
  }

  if (
    loan.repaymentSchedule &&
    typeof loan.repaymentSchedule === "object" &&
    loan.repaymentSchedule.currency
  ) {
    return loan.repaymentSchedule.currency;
  }

  return "NGN";
};

const getLoanProductName = (loan: CustomerLoan): string => {
  if (
    loan.loanProduct &&
    typeof loan.loanProduct === "object" &&
    loan.loanProduct.name
  ) {
    return loan.loanProduct.name;
  }

  return "Loan";
};

const getLoanPrincipal = (loan: CustomerLoan): number => {
  if (Number.isFinite(Number(loan.principalAmount))) {
    return Number(loan.principalAmount);
  }

  if (
    loan.loanOffer &&
    typeof loan.loanOffer === "object" &&
    Number.isFinite(Number(loan.loanOffer.approvedAmount))
  ) {
    return Number(loan.loanOffer.approvedAmount);
  }

  return 0;
};

const getLoanTotalRepayment = (loan: CustomerLoan): number => {
  if (Number.isFinite(Number(loan.totalRepayment))) {
    return Number(loan.totalRepayment);
  }

  if (
    loan.repaymentSchedule &&
    typeof loan.repaymentSchedule === "object" &&
    Number.isFinite(Number(loan.repaymentSchedule.totalRepaymentAmount))
  ) {
    return Number(loan.repaymentSchedule.totalRepaymentAmount);
  }

  if (
    loan.loanOffer &&
    typeof loan.loanOffer === "object" &&
    Number.isFinite(Number(loan.loanOffer.totalRepayment))
  ) {
    return Number(loan.loanOffer.totalRepayment);
  }

  return 0;
};

const getLoanAmountPaid = (loan: CustomerLoan): number => {
  if (Number.isFinite(Number(loan.amountPaid))) {
    return Number(loan.amountPaid);
  }

  if (
    loan.repaymentSchedule &&
    typeof loan.repaymentSchedule === "object" &&
    Number.isFinite(Number(loan.repaymentSchedule.amountPaid))
  ) {
    return Number(loan.repaymentSchedule.amountPaid);
  }

  return 0;
};

const getLoanOutstanding = (loan: CustomerLoan): number => {
  if (Number.isFinite(Number(loan.outstandingAmount))) {
    return Math.max(0, Number(loan.outstandingAmount));
  }

  if (
    loan.repaymentSchedule &&
    typeof loan.repaymentSchedule === "object" &&
    Number.isFinite(Number(loan.repaymentSchedule.amountOutstanding))
  ) {
    return Math.max(0, Number(loan.repaymentSchedule.amountOutstanding));
  }

  return 0;
};

const getLoanInterestRate = (loan: CustomerLoan): number => {
  if (Number.isFinite(Number(loan.interestRate))) {
    return Number(loan.interestRate);
  }

  if (
    loan.loanOffer &&
    typeof loan.loanOffer === "object" &&
    Number.isFinite(Number(loan.loanOffer.interestRate))
  ) {
    return Number(loan.loanOffer.interestRate);
  }

  return 0;
};

const getLoanInterestAmount = (loan: CustomerLoan): number => {
  return Number.isFinite(Number(loan.interestAmount))
    ? Number(loan.interestAmount)
    : 0;
};

const getLoanFeeAmount = (loan: CustomerLoan): number => {
  return Number.isFinite(Number(loan.feeAmount))
    ? Number(loan.feeAmount)
    : 0;
};

const getLoanDurationDays = (loan: CustomerLoan): number => {
  if (Number.isFinite(Number(loan.durationDays))) {
    return Number(loan.durationDays);
  }

  if (
    loan.loanOffer &&
    typeof loan.loanOffer === "object" &&
    Number.isFinite(Number(loan.loanOffer.durationDays))
  ) {
    return Number(loan.loanOffer.durationDays);
  }

  return 0;
};

const getLoanRepaymentFrequency = (loan: CustomerLoan): string => {
  if (loan.repaymentFrequency) {
    return loan.repaymentFrequency;
  }

  if (
    loan.loanOffer &&
    typeof loan.loanOffer === "object" &&
    loan.loanOffer.repaymentFrequency
  ) {
    return loan.loanOffer.repaymentFrequency;
  }

  return "monthly";
};

const getLoanInstallmentAmount = (loan: CustomerLoan): number => {
  if (Number.isFinite(Number(loan.installmentAmount))) {
    return Number(loan.installmentAmount);
  }

  if (
    loan.loanOffer &&
    typeof loan.loanOffer === "object" &&
    Number.isFinite(Number(loan.loanOffer.installmentAmount))
  ) {
    return Number(loan.loanOffer.installmentAmount);
  }

  return 0;
};

const getLoanInstallmentCount = (loan: CustomerLoan): number => {
  if (Number.isFinite(Number(loan.numberOfInstallments))) {
    return Number(loan.numberOfInstallments);
  }

  if (
    loan.loanOffer &&
    typeof loan.loanOffer === "object" &&
    Number.isFinite(Number(loan.loanOffer.numberOfInstallments))
  ) {
    return Number(loan.loanOffer.numberOfInstallments);
  }

  return 0;
};

const getMaturityDate = (loan: CustomerLoan): string | null => {
  if (loan.maturityDate) {
    return loan.maturityDate;
  }

  if (
    loan.repaymentSchedule &&
    typeof loan.repaymentSchedule === "object" &&
    loan.repaymentSchedule.finalDueDate
  ) {
    return loan.repaymentSchedule.finalDueDate;
  }

  return null;
};

// =========================================================
// REPAYMENT PROGRESS
// =========================================================

const getPaymentPercentage = (loan: CustomerLoan): number => {
  const total = getLoanTotalRepayment(loan);
  const paid = getLoanAmountPaid(loan);

  if (total <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (paid / total) * 100));
};

// =========================================================
// LOAN STATUS
// =========================================================

const formatStatus = (status: LoanStatus): string => {
  switch (status) {
    case "pending_disbursement":
      return "Awaiting disbursement";

    case "disbursing":
      return "Disbursing";

    case "active":
      return "Active";

    case "completed":
      return "Completed";

    case "overdue":
      return "Overdue";

    case "defaulted":
      return "Defaulted";

    case "cancelled":
      return "Cancelled";

    default:
      return status;
  }
};

const getStatusClasses = (status: LoanStatus): string => {
  switch (status) {
    case "pending_disbursement":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "disbursing":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "completed":
      return "border-slate-200 bg-slate-100 text-slate-700";

    case "overdue":
      return "border-orange-200 bg-orange-50 text-orange-700";

    case "defaulted":
      return "border-red-200 bg-red-50 text-red-700";

    case "cancelled":
      return "border-slate-200 bg-slate-100 text-slate-500";

    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
};

function StatusIcon({ status }: { status: LoanStatus }) {
  switch (status) {
    case "active":
    case "completed":
      return <CheckCircle2 size={15} />;

    case "pending_disbursement":
      return <Clock3 size={15} />;

    case "disbursing":
      return <Loader2 size={15} className="animate-spin" />;

    case "overdue":
    case "defaulted":
      return <AlertCircle size={15} />;

    default:
      return <FileText size={15} />;
  }
}

function LoanStatusBadge({ status }: { status: LoanStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
        status,
      )}`}
    >
      <StatusIcon status={status} />
      {formatStatus(status)}
    </span>
  );
}

// =========================================================
// DISBURSEMENT
// =========================================================

const getDisbursementLabel = (
  status?: DisbursementStatus | null,
): string => {
  switch (status) {
    case "PENDING":
      return "Pending";

    case "PROCESSING":
      return "Processing";

    case "SUCCESS":
      return "Successful";

    case "FAILED":
      return "Failed";

    case "REVERSED":
      return "Reversed";

    default:
      return "Not started";
  }
};

// =========================================================
// DETAIL
// =========================================================

function Detail({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0 rounded-lg bg-slate-100 p-2 text-slate-600">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>

        <p className="mt-0.5 break-words text-sm font-semibold text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
}

// =========================================================
// LOAN STATUS MESSAGE
// =========================================================

function LoanStatusMessage({ status }: { status: LoanStatus }) {
  switch (status) {
    case "pending_disbursement":
      return (
        <div className="mt-6 flex gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
          <Clock3
            size={19}
            className="mt-0.5 shrink-0 text-amber-600"
          />

          <div>
            <p className="text-sm font-semibold text-amber-900">
              Your loan is awaiting disbursement
            </p>

            <p className="mt-1 text-xs leading-5 text-amber-700">
              Your loan has been created from your accepted offer.
              Disbursement is being handled separately.
            </p>
          </div>
        </div>
      );

    case "disbursing":
      return (
        <div className="mt-6 flex gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <Loader2
            size={19}
            className="mt-0.5 shrink-0 animate-spin text-blue-600"
          />

          <div>
            <p className="text-sm font-semibold text-blue-900">
              Disbursement in progress
            </p>

            <p className="mt-1 text-xs leading-5 text-blue-700">
              Your loan disbursement is being processed. The status
              will update once processing is completed.
            </p>
          </div>
        </div>
      );

    case "active":
      return (
        <div className="mt-6 flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <CheckCircle2
            size={19}
            className="mt-0.5 shrink-0 text-emerald-600"
          />

          <div>
            <p className="text-sm font-semibold text-emerald-900">
              Loan active
            </p>

            <p className="mt-1 text-xs leading-5 text-emerald-700">
              Your loan has been disbursed. Continue making repayments
              according to your repayment schedule.
            </p>
          </div>
        </div>
      );

    case "overdue":
      return (
        <div className="mt-6 flex gap-3 rounded-xl border border-orange-100 bg-orange-50 p-4">
          <AlertCircle
            size={19}
            className="mt-0.5 shrink-0 text-orange-600"
          />

          <div>
            <p className="text-sm font-semibold text-orange-900">
              Loan repayment is overdue
            </p>

            <p className="mt-1 text-xs leading-5 text-orange-700">
              Please review your repayment schedule and settle any
              overdue amount.
            </p>
          </div>
        </div>
      );

    case "completed":
      return (
        <div className="mt-6 flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <CheckCircle2
            size={19}
            className="mt-0.5 shrink-0 text-slate-600"
          />

          <div>
            <p className="text-sm font-semibold text-slate-900">
              Loan completed
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-600">
              This loan has been fully repaid.
            </p>
          </div>
        </div>
      );

    case "defaulted":
      return (
        <div className="mt-6 flex gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
          <AlertCircle
            size={19}
            className="mt-0.5 shrink-0 text-red-600"
          />

          <div>
            <p className="text-sm font-semibold text-red-900">
              Loan in default
            </p>

            <p className="mt-1 text-xs leading-5 text-red-700">
              Please contact support for assistance with this loan.
            </p>
          </div>
        </div>
      );

    case "cancelled":
      return (
        <div className="mt-6 flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <FileText
            size={19}
            className="mt-0.5 shrink-0 text-slate-500"
          />

          <div>
            <p className="text-sm font-semibold text-slate-900">
              Loan cancelled
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-600">
              This loan is no longer active.
            </p>
          </div>
        </div>
      );

    default:
      return null;
  }
}

// =========================================================
// REPAYMENT SCHEDULE
// =========================================================

function RepaymentSchedulePreview({
  loan,
}: {
  loan: CustomerLoan;
}) {
  if (
    !loan.repaymentSchedule ||
    typeof loan.repaymentSchedule !== "object"
  ) {
    return null;
  }

  const schedule = loan.repaymentSchedule;

  if (
    !Array.isArray(schedule.installments) ||
    schedule.installments.length === 0
  ) {
    return null;
  }

  const visibleInstallments = schedule.installments.slice(0, 5);

  return (
    <div className="mt-6 rounded-2xl border border-slate-200">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="text-sm font-bold text-slate-900">
          Repayment schedule
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          Upcoming and recent installments
        </p>
      </div>

      <div className="divide-y divide-slate-100">
        {visibleInstallments.map((installment) => (
          <div
            key={
              installment._id ||
              installment.id ||
              installment.installmentNumber
            }
            className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Installment {installment.installmentNumber}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Due {formatDate(installment.dueDate)}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-sm font-bold text-slate-900">
                {formatMoney(
                  installment.totalAmount,
                  schedule.currency || "NGN",
                )}
              </p>

              <p className="mt-1 text-xs capitalize text-slate-500">
                {installment.status.replace(/_/g, " ")}
              </p>
            </div>
          </div>
        ))}
      </div>

      {schedule.installments.length >
        visibleInstallments.length && (
        <div className="border-t border-slate-100 px-5 py-3 text-center">
          <p className="text-xs text-slate-500">
            {schedule.installments.length -
              visibleInstallments.length}{" "}
            more installments
          </p>
        </div>
      )}
    </div>
  );
}

// =========================================================
// LOAN CARD
// =========================================================

function LoanCard({ loan }: { loan: CustomerLoan }) {
  const currency = getCurrency(loan);
  const principal = getLoanPrincipal(loan);
  const totalRepayment = getLoanTotalRepayment(loan);
  const amountPaid = getLoanAmountPaid(loan);
  const outstanding = getLoanOutstanding(loan);
  const interestRate = getLoanInterestRate(loan);
  const interestAmount = getLoanInterestAmount(loan);
  const feeAmount = getLoanFeeAmount(loan);
  const durationDays = getLoanDurationDays(loan);
  const repaymentFrequency = getLoanRepaymentFrequency(loan);
  const installmentAmount = getLoanInstallmentAmount(loan);
  const installmentCount = getLoanInstallmentCount(loan);
  const maturityDate = getMaturityDate(loan);
  const paymentPercentage = getPaymentPercentage(loan);

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-900 p-2.5 text-white">
              <WalletCards size={20} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {getLoanProductName(loan)}
              </h2>

              {loan.loanNumber && (
                <p className="text-xs text-slate-500">
                  Loan #{loan.loanNumber}
                </p>
              )}
            </div>
          </div>

          <LoanStatusBadge status={loan.status} />
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-xs text-slate-500">Principal</p>

            <p className="mt-1 text-xl font-bold text-slate-900">
              {formatMoney(principal, currency)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-xs text-slate-500">
              Total repayment
            </p>

            <p className="mt-1 text-xl font-bold text-slate-900">
              {formatMoney(totalRepayment, currency)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-xs text-slate-500">Outstanding</p>

            <p className="mt-1 text-xl font-bold text-slate-900">
              {formatMoney(outstanding, currency)}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Detail
            icon={<Banknote size={17} />}
            label="Interest rate"
            value={`${interestRate}%`}
          />

          <Detail
            icon={<CreditCard size={17} />}
            label="Interest type"
            value={formatInterestType(loan.interestType)}
          />

          <Detail
            icon={<Banknote size={17} />}
            label="Interest amount"
            value={formatMoney(interestAmount, currency)}
          />

          <Detail
            icon={<FileText size={17} />}
            label="Fees"
            value={formatMoney(feeAmount, currency)}
          />

          <Detail
            icon={<CalendarDays size={17} />}
            label="Duration"
            value={
              durationDays > 0 ? `${durationDays} days` : "—"
            }
          />

          <Detail
            icon={<RefreshCw size={17} />}
            label="Repayment frequency"
            value={formatFrequency(repaymentFrequency)}
          />

          <Detail
            icon={<CreditCard size={17} />}
            label="Installment amount"
            value={formatMoney(installmentAmount, currency)}
          />

          <Detail
            icon={<FileText size={17} />}
            label="Number of installments"
            value={
              installmentCount > 0
                ? String(installmentCount)
                : "—"
            }
          />

          <Detail
            icon={<Banknote size={17} />}
            label="Amount paid"
            value={formatMoney(amountPaid, currency)}
          />

          <Detail
            icon={<CalendarDays size={17} />}
            label="Start date"
            value={formatDate(loan.startDate)}
          />

          <Detail
            icon={<CalendarDays size={17} />}
            label="Maturity date"
            value={formatDate(maturityDate)}
          />

          <Detail
            icon={<WalletCards size={17} />}
            label="Amount disbursed"
            value={formatMoney(loan.amountDisbursed, currency)}
          />
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Repayment progress
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {formatMoney(amountPaid, currency)} paid of{" "}
                {formatMoney(totalRepayment, currency)}
              </p>
            </div>

            <span className="text-sm font-bold text-slate-900">
              {Math.round(paymentPercentage)}%
            </span>
          </div>

          <div
            className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(paymentPercentage)}
          >
            <div
              className="h-full rounded-full bg-slate-900 transition-all duration-500"
              style={{
                width: `${paymentPercentage}%`,
              }}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">
              Disbursement status
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-900">
              {getDisbursementLabel(loan.disbursementStatus)}
            </p>

            {loan.disbursedAt && (
              <p className="mt-1 text-xs text-slate-500">
                Disbursed on {formatDate(loan.disbursedAt)}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">
              Disbursement method
            </p>

            <p className="mt-1 text-sm font-semibold capitalize text-slate-900">
              {loan.disbursementMethod || "—"}
            </p>

            {loan.disbursementReference && (
              <p className="mt-1 break-all text-xs text-slate-500">
                Ref: {loan.disbursementReference}
              </p>
            )}
          </div>
        </div>

        <LoanStatusMessage status={loan.status} />

        <RepaymentSchedulePreview loan={loan} />
      </div>
    </article>
  );
}

// =========================================================
// OFFER STEP INDICATOR
// =========================================================

function OfferStep({
  number,
  title,
  active,
  completed,
}: {
  number: number;
  title: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          active || completed
            ? "bg-slate-900 text-white"
            : "bg-slate-100 text-slate-500"
        }`}
      >
        {completed ? (
          <CheckCircle2 size={17} />
        ) : (
          <span className="text-xs font-bold">{number}</span>
        )}
      </div>

      <div className="hidden sm:block">
        <p className="text-xs font-semibold text-slate-900">
          {title}
        </p>
      </div>
    </div>
  );
}

// =========================================================
// OFFER DETAIL
// =========================================================

function OfferDetail({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 text-sm ${
          highlight
            ? "font-bold text-slate-900"
            : "font-semibold text-slate-700"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

// =========================================================
// OFFER STATUS
// =========================================================

function formatOfferStatusClass(
  status: string,
  expired: boolean,
) {
  if (expired && status === "pending") {
    return "bg-amber-100 text-amber-700";
  }

  switch (status) {
    case "pending":
      return "bg-blue-100 text-blue-700";

    case "accepted":
      return "bg-emerald-100 text-emerald-700";

    case "rejected":
    case "cancelled":
      return "bg-red-100 text-red-700";

    case "expired":
      return "bg-amber-100 text-amber-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getMandateStatusClass(status?: string) {
  switch (status?.toLowerCase()) {
    case "authorized":
    case "active":
      return "bg-emerald-100 text-emerald-700";

    case "authorization_required":
      return "bg-blue-100 text-blue-700";

    case "pending":
      return "bg-amber-100 text-amber-700";

    case "failed":
    case "cancelled":
    case "expired":
      return "bg-red-100 text-red-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

// =========================================================
// LOAN OFFER FLOW
// =========================================================

function LoanOfferFlow({
  offer,
  step,
  setStep,
  mandate,
  setMandate,
  mandateLoading,
  setMandateLoading,
  processing,
  onAccept,
  onReject,
  onRefreshMandate,
  onMandateSuccess,
}: {
  offer: LoanOffer;
  step: LoanFlowStep;
  setStep: (step: LoanFlowStep) => void;
  mandate: Mandate | null;
  setMandate: Dispatch<SetStateAction<Mandate | null>>;
  mandateLoading: boolean;
  setMandateLoading: Dispatch<SetStateAction<boolean>>;
  processing: boolean;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
  onRefreshMandate: () => Promise<void>;
  onMandateSuccess: (mandate: Mandate) => void;
}) {
  const offerStatus = offer.status || "unknown";

  const expired =
    Boolean(offer.expiresAt) &&
    new Date(offer.expiresAt as string).getTime() < Date.now();

  const currency =
    offer.loanProduct &&
    typeof offer.loanProduct === "object" &&
    offer.loanProduct.currency
      ? offer.loanProduct.currency
      : "NGN";

  const productName =
    offer.loanProduct &&
    typeof offer.loanProduct === "object" &&
    offer.loanProduct.name
      ? offer.loanProduct.name
      : "Loan Offer";

  return (
    <section className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* FLOW HEADER */}
      <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Loan application
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {step === 1
                ? "Review your loan offer"
                : "Set up repayment mandate"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {step === 1
                ? "Review the approved terms before accepting your offer."
                : "Authorize your repayment card to complete the loan setup."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <OfferStep
              number={1}
              title="Review offer"
              active={step === 1}
              completed={step === 2}
            />

            <div className="h-px w-8 bg-slate-200" />

            <OfferStep
              number={2}
              title="Repayment mandate"
              active={step === 2}
              completed={mandate?.status === "active"}
            />
          </div>
        </div>
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {productName}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Review the approved loan terms below.
              </p>
            </div>

            <span
              className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${formatOfferStatusClass(
                offerStatus,
                expired,
              )}`}
            >
              {expired && offerStatus === "pending"
                ? "Expired"
                : offerStatus
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (letter) =>
                      letter.toUpperCase(),
                    )}
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <OfferDetail
              label="Approved amount"
              value={formatMoney(offer.approvedAmount, currency)}
              highlight
            />

            <OfferDetail
              label="Interest rate"
              value={
                offer.interestRate !== undefined
                  ? `${offer.interestRate}%`
                  : "—"
              }
            />

            <OfferDetail
              label="Interest type"
              value={formatInterestType(offer.interestType)}
            />

            <OfferDetail
              label="Total interest"
              value={formatMoney(
                offer.totalInterest,
                currency,
              )}
            />

            <OfferDetail
              label="Processing fee"
              value={formatMoney(
                offer.processingFee,
                currency,
              )}
            />

            <OfferDetail
              label="Service fee"
              value={formatMoney(offer.serviceFee, currency)}
            />

            <OfferDetail
              label="Total fees"
              value={formatMoney(offer.totalFees, currency)}
            />

            <OfferDetail
              label="Total repayment"
              value={formatMoney(
                offer.totalRepayment,
                currency,
              )}
              highlight
            />

            <OfferDetail
              label="Duration"
              value={
                offer.durationDays
                  ? `${offer.durationDays} days`
                  : "—"
              }
            />

            <OfferDetail
              label="Repayment frequency"
              value={formatFrequency(
                offer.repaymentFrequency,
              )}
            />

            <OfferDetail
              label="Installment amount"
              value={formatMoney(
                offer.installmentAmount,
                currency,
              )}
              highlight
            />

            <OfferDetail
              label="Number of installments"
              value={
                offer.numberOfInstallments
                  ? String(offer.numberOfInstallments)
                  : "—"
              }
            />
          </div>

          {offer.expiresAt && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
              <Clock3
                size={18}
                className="mt-0.5 shrink-0 text-amber-600"
              />

              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Offer expiry
                </p>

                <p className="mt-1 text-xs text-amber-700">
                  This offer expires on{" "}
                  {formatDate(offer.expiresAt)}.
                </p>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {offerStatus === "pending" && !expired && (
              <>
                <button
                  type="button"
                  onClick={() => void onReject()}
                  disabled={processing}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {processing ? (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <XCircle size={17} />
                  )}

                  Reject offer
                </button>

                <button
                  type="button"
                  onClick={() => void onAccept()}
                  disabled={processing}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {processing ? (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <CheckCircle2 size={17} />
                  )}

                  Accept offer
                </button>
              </>
            )}

            {offerStatus === "accepted" && (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Continue to repayment mandate
                <CreditCard size={17} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={processing || mandateLoading}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft size={17} />
              Back to offer
            </button>

            <button
              type="button"
              onClick={() => void onRefreshMandate()}
              disabled={mandateLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={15}
                className={
                  mandateLoading ? "animate-spin" : ""
                }
              />
              Refresh status
            </button>
          </div>

          <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-slate-900 p-2.5 text-white">
                <CreditCard size={19} />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Repayment mandate
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Authorize your card so repayments can be
                  collected according to the agreed loan schedule.
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500">
                    Status:
                  </span>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getMandateStatusClass(
                      mandate?.status,
                    )}`}
                  >
                    {mandate?.status
                      ? mandate.status
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (letter) =>
                            letter.toUpperCase(),
                          )
                      : "Not created"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <RepaymentMandateStep
            offerId={offer._id}
            offer={offer}
            mandate={mandate}
            setMandate={setMandate}
            mandateLoading={mandateLoading}
            setMandateLoading={setMandateLoading}
            currency={currency}
            onMandateSuccess={onMandateSuccess}
          />
        </div>
      )}
    </section>
  );
}

// =========================================================
// PAGE
// =========================================================

export default function MyLoans() {
  const [loans, setLoans] = useState<CustomerLoan[]>([]);
  const [offers, setOffers] = useState<LoanOffer[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // =======================================================
  // OFFER FLOW STATE
  // =======================================================

  const [activeOffer, setActiveOffer] =
    useState<LoanOffer | null>(null);

  const [offerStep, setOfferStep] =
    useState<LoanFlowStep>(1);

  const [mandate, setMandate] =
    useState<Mandate | null>(null);

  const [mandateLoading, setMandateLoading] =
    useState(false);

  const [offerProcessing, setOfferProcessing] =
    useState(false);

  // =======================================================
  // LOAD LOANS
  // =======================================================

  const loadLoans = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const data = await myLoanApi.getMyLoans();

        setLoans(Array.isArray(data) ? data : []);
      } catch (error: unknown) {
        console.error(
          "Failed to load customer loans:",
          error,
        );

        toast.error(
          getApiErrorMessage(
            error,
            "Unable to load your loans.",
          ),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  // =======================================================
  // LOAD OFFERS
  // =======================================================

  const loadOffers = useCallback(async () => {
    try {
      const response =
        await API.get<LoanOffersResponse>(
          `${LOAN_OFFERS_BASE_URL}/my`,
        );

      const loadedOffers =
        response.data?.data ??
        response.data?.offers ??
        [];

      setOffers(
        Array.isArray(loadedOffers)
          ? loadedOffers
          : [],
      );
    } catch (error: unknown) {
      console.error(
        "Failed to load loan offers:",
        error,
      );

      setOffers([]);
    }
  }, []);

  // =======================================================
  // LOAD EVERYTHING
  // =======================================================

  const loadPage = useCallback(
    async (showRefresh = false) => {
      await Promise.all([
        loadLoans(showRefresh),
        loadOffers(),
      ]);
    },
    [loadLoans, loadOffers],
  );

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  // =======================================================
  // FIND PENDING OFFER
  // =======================================================

  const activeFlowOffer = useMemo(() => {
    const validOffers = offers.filter(
      (offer) =>
        offer.status === "pending" ||
        offer.status === "accepted",
    );

    if (validOffers.length === 0) {
      return null;
    }

    return [...validOffers].sort((a, b) => {
      const aTime = a.createdAt
        ? new Date(a.createdAt).getTime()
        : 0;

      const bTime = b.createdAt
        ? new Date(b.createdAt).getTime()
        : 0;

      return bTime - aTime;
    })[0];
  }, [offers]);

  // =======================================================
  // INITIALIZE OFFER FLOW
  // =======================================================

  useEffect(() => {
    if (!activeFlowOffer) {
      return;
    }

    if (activeOffer?._id === activeFlowOffer._id) {
      return;
    }

    setActiveOffer(activeFlowOffer);
    setOfferStep(
      activeFlowOffer.status === "accepted"
        ? 2
        : 1,
    );
    setMandate(null);
  }, [activeFlowOffer, activeOffer?._id]);

  // =======================================================
  // LOAD CURRENT MANDATE
  // =======================================================

  const loadCurrentMandate = useCallback(async () => {
    if (!activeOffer?._id) {
      return;
    }

    try {
      setMandateLoading(true);

      const response =
        await API.get<MandateResponse>(
          `${MANDATES_BASE_URL}/offer/${encodeURIComponent(
            activeOffer._id,
          )}/active`,
        );

      const loadedMandate =
        response.data?.data ??
        response.data?.mandate ??
        null;

      setMandate(loadedMandate);
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setMandate(null);
        return;
      }

      console.error(
        "Failed to load mandate:",
        error,
      );
    } finally {
      setMandateLoading(false);
    }
  }, [activeOffer?._id]);

  // =======================================================
  // LOAD MANDATE WHEN STEP 2 OPENS
  // =======================================================

  useEffect(() => {
    if (!activeOffer?._id || offerStep !== 2) {
      return;
    }

    void loadCurrentMandate();
  }, [
    activeOffer?._id,
    offerStep,
    loadCurrentMandate,
  ]);

  // =======================================================
  // ACCEPT OFFER
  // =======================================================

  const handleAcceptOffer = useCallback(async () => {
    if (!activeOffer) {
      return;
    }

    if (activeOffer.status !== "pending") {
      toast.error(
        "This offer can no longer be accepted.",
      );
      return;
    }

    if (
      activeOffer.expiresAt &&
      new Date(activeOffer.expiresAt).getTime() <
        Date.now()
    ) {
      toast.error("This loan offer has expired.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to accept this loan offer?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setOfferProcessing(true);

      const response =
        await API.patch<LoanOfferResponse>(
          `${LOAN_OFFERS_BASE_URL}/${encodeURIComponent(
            activeOffer._id,
          )}/accept`,
        );

      const acceptedOffer =
        response.data?.data ??
        response.data?.offer ??
        ({
          ...activeOffer,
          status: "accepted",
          acceptedAt: new Date().toISOString(),
        } as LoanOffer);

      // Keep both activeOffer and offers in sync.
      setActiveOffer(acceptedOffer);

      setOffers((current) =>
        current.map((offer) =>
          offer._id === acceptedOffer._id
            ? acceptedOffer
            : offer,
        ),
      );

      // Move directly to repayment mandate.
      setMandate(null);
      setOfferStep(2);

      toast.success(
        "Loan offer accepted successfully.",
      );
    } catch (error: unknown) {
      toast.error(
        getApiErrorMessage(
          error,
          "Unable to accept loan offer.",
        ),
      );
    } finally {
      setOfferProcessing(false);
    }
  }, [activeOffer]);

  // =======================================================
  // REJECT OFFER
  // =======================================================

  const handleRejectOffer = useCallback(async () => {
    if (!activeOffer) {
      return;
    }

    if (activeOffer.status !== "pending") {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to reject this loan offer?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setOfferProcessing(true);

      const response =
        await API.patch<LoanOfferResponse>(
          `${LOAN_OFFERS_BASE_URL}/${encodeURIComponent(
            activeOffer._id,
          )}/reject`,
        );

      const rejectedOffer =
        response.data?.data ??
        response.data?.offer ??
        ({
          ...activeOffer,
          status: "rejected",
          rejectedAt: new Date().toISOString(),
        } as LoanOffer);

      setActiveOffer(null);
      setOfferStep(1);
      setMandate(null);

      setOffers((current) =>
        current.map((offer) =>
          offer._id === activeOffer._id
            ? rejectedOffer
            : offer,
        ),
      );

      toast.success("Loan offer rejected.");
    } catch (error: unknown) {
      toast.error(
        getApiErrorMessage(
          error,
          "Unable to reject loan offer.",
        ),
      );
    } finally {
      setOfferProcessing(false);
    }
  }, [activeOffer]);

  // =======================================================
  // MANDATE SUCCESS
  // =======================================================

  const handleMandateSuccess = useCallback(
    (completedMandate: Mandate) => {
      setMandate(completedMandate);

      toast.success(
        "Repayment mandate completed successfully.",
      );

      /*
       * The backend should create/finalize the loan when
       * the mandate becomes active.
       *
       * Refreshing the loans here makes the newly-created
       * loan appear as soon as the backend has completed
       * that operation.
       */
      void loadLoans(true);

      /*
       * Keep the mandate state synchronized with the backend.
       */
      void loadCurrentMandate();
    },
    [loadLoans, loadCurrentMandate],
  );

  // =======================================================
  // SUMMARY
  // =======================================================

  const activeLoans = useMemo(
    () =>
      loans.filter((loan) =>
        [
          "active",
          "overdue",
          "defaulted",
          "pending_disbursement",
          "disbursing",
        ].includes(loan.status),
      ),
    [loans],
  );

  const totalOutstanding = useMemo(
    () =>
      activeLoans.reduce(
        (total, loan) =>
          total +
          Math.max(0, getLoanOutstanding(loan)),
        0,
      ),
    [activeLoans],
  );

  const totalPaid = useMemo(
    () =>
      loans.reduce(
        (total, loan) =>
          total +
          Math.max(0, getLoanAmountPaid(loan)),
        0,
      ),
    [loans],
  );

  const completedLoans = useMemo(
    () =>
      loans.filter(
        (loan) => loan.status === "completed",
      ).length,
    [loans],
  );

  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600">
          <Loader2
            size={24}
            className="animate-spin"
          />

          <span className="text-sm font-medium">
            Loading your loans...
          </span>
        </div>
      </div>
    );
  }

  // =======================================================
  // PAGE
  // =======================================================

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {/* HEADER */}
      <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-900 p-2.5 text-white">
              <WalletCards size={21} />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              My Loans
            </h1>
          </div>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            View your loans, loan offers, disbursement
            status, repayment progress, schedules, and
            outstanding balances.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadPage(true)}
          disabled={refreshing}
          className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw
            size={16}
            className={
              refreshing ? "animate-spin" : ""
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </section>

      {/* =====================================================
          LOAN OFFER + STEP 2 MANDATE
      ===================================================== */}

      {activeOffer && (
        <LoanOfferFlow
          offer={activeOffer}
          step={offerStep}
          setStep={setOfferStep}
          mandate={mandate}
          setMandate={setMandate}
          mandateLoading={mandateLoading}
          setMandateLoading={setMandateLoading}
          processing={offerProcessing}
          onAccept={handleAcceptOffer}
          onReject={handleRejectOffer}
          onRefreshMandate={loadCurrentMandate}
          onMandateSuccess={handleMandateSuccess}
        />
      )}

      {/* =====================================================
          SUMMARY
      ===================================================== */}

      {loans.length > 0 && (
        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500">
              Total loans
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {loans.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500">
              Active loans
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {activeLoans.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500">
              Outstanding
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {formatMoney(totalOutstanding)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500">
              Total paid
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {formatMoney(totalPaid)}
            </p>

            {completedLoans > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                {completedLoans} completed
              </p>
            )}
          </div>
        </section>
      )}

      {/* =====================================================
          EMPTY STATE
      ===================================================== */}

      {loans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <WalletCards
              size={24}
              className="text-slate-500"
            />
          </div>

          <h2 className="mt-4 text-lg font-bold text-slate-900">
            No loans yet
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Once you accept a loan offer, complete your
            repayment mandate, and your loan is created, it
            will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {loans.map((loan) => (
            <LoanCard
              key={
                loan._id ||
                loan.id ||
                loan.loanNumber
              }
              loan={loan}
            />
          ))}
        </div>
      )}
    </div>
  );
}
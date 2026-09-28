import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Landmark,
  Mail,
  Phone,
  Receipt,
  RefreshCw,
  ShieldCheck,
  User,
  WalletCards,
  XCircle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate, useParams } from "react-router-dom";

import adminLoanApi, {
  type AdminLoan,
  type AdminRepaymentSchedule,
} from "../services/adminLoanApi";

const formatMoney = (
  amount?: number | null,
  currency = "NGN"
) => {
  if (
    amount === null ||
    amount === undefined ||
    Number.isNaN(Number(amount))
  ) {
    return "—";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount));
};

const formatDate = (date?: string | null) => {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatDateTime = (date?: string | null) => {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatStatus = (status?: string | null) => {
  if (!status) return "—";

  return status
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
};

const getLoanStatusClasses = (
  status?: AdminLoan["status"]
) => {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "completed":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "overdue":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "defaulted":
      return "border-red-200 bg-red-50 text-red-700";

    case "disbursing":
      return "border-purple-200 bg-purple-50 text-purple-700";

    case "pending_disbursement":
      return "border-slate-200 bg-slate-50 text-slate-700";

    case "cancelled":
      return "border-gray-200 bg-gray-100 text-gray-600";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
};

const getDisbursementStatusClasses = (
  status?: AdminLoan["disbursementStatus"]
) => {
  switch (status) {
    case "SUCCESS":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "PROCESSING":
      return "border-purple-200 bg-purple-50 text-purple-700";

    case "FAILED":
    case "REVERSED":
      return "border-red-200 bg-red-50 text-red-700";

    case "PENDING":
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
};

const getScheduleStatusClasses = (
  status?: string
) => {
  switch (status) {
    case "paid":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "partially_paid":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "overdue":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "defaulted":
      return "border-red-200 bg-red-50 text-red-700";

    case "cancelled":
      return "border-gray-200 bg-gray-100 text-gray-600";

    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
};

const getErrorMessage = (error: any) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
};

const getUser = (loan: AdminLoan) => {
  if (
    loan.user &&
    typeof loan.user !== "string"
  ) {
    return loan.user;
  }

  return null;
};

const getProduct = (loan: AdminLoan) => {
  if (
    loan.loanProduct &&
    typeof loan.loanProduct !== "string"
  ) {
    return loan.loanProduct;
  }

  return null;
};

const getSchedule = (
  loan: AdminLoan
): AdminRepaymentSchedule | null => {
  if (
    loan.repaymentSchedule &&
    typeof loan.repaymentSchedule !== "string"
  ) {
    return loan.repaymentSchedule;
  }

  return null;
};

interface SectionProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}

const Section = ({
  title,
  icon,
  children,
  action,
}: SectionProps) => {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            {icon}
          </div>

          <h2 className="text-base font-semibold text-slate-900">
            {title}
          </h2>
        </div>

        {action}
      </div>

      <div className="px-6 py-3">{children}</div>
    </section>
  );
};

interface InfoRowProps {
  label: string;
  value: ReactNode;
}

const InfoRow = ({
  label,
  value,
}: InfoRowProps) => {
  return (
    <div className="flex items-start justify-between gap-5 border-b border-slate-100 py-3 last:border-b-0">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="text-right text-sm font-medium text-slate-900">
        {value}
      </span>
    </div>
  );
};

const AdminLoanDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loan, setLoan] =
    useState<AdminLoan | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] =
    useState(false);

  const [error, setError] = useState("");

  const [showManualModal, setShowManualModal] =
    useState(false);

  const [showCancelModal, setShowCancelModal] =
    useState(false);

  const [manualReference, setManualReference] =
    useState("");

  const [cancelReason, setCancelReason] =
    useState("");

  const loadLoan = useCallback(async () => {
    if (!id) {
      setError("Loan ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data =
        await adminLoanApi.getLoan(id);

      setLoan(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadLoan();
  }, [loadLoan]);

  const currency = useMemo(() => {
    return getProduct(loan)?.currency || "NGN";
  }, [loan]);

  const applicant = loan
    ? getUser(loan)
    : null;

  const product = loan
    ? getProduct(loan)
    : null;

  const schedule = loan
    ? getSchedule(loan)
    : null;

  const isPendingDisbursement =
    loan?.status === "pending_disbursement";

  const isDisbursing =
    loan?.status === "disbursing";

  const isManualDisbursement =
    isDisbursing &&
    loan?.disbursementMethod === "manual";

  const isPaystackDisbursement =
    isDisbursing &&
    loan?.disbursementMethod === "paystack";

  const isSuccessfullyDisbursed =
    loan?.disbursementStatus === "SUCCESS";

  const canCancel =
    !!loan &&
    ![
      "active",
      "completed",
      "cancelled",
    ].includes(loan.status) &&
    loan.disbursementStatus !== "SUCCESS";

  /**
   * Start the manual disbursement.
   *
   * This does NOT complete the transfer.
   * It only claims the loan for manual processing
   * and changes the loan/disbursement status to PROCESSING.
   */
  const handleStartManualDisbursement =
    async () => {
      if (!id) return;

      try {
        setActionLoading(true);
        setError("");

        const response =
          await adminLoanApi.startManualDisbursement(
            id
          );

        setLoan(response.loan);

        setShowManualModal(true);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setActionLoading(false);
      }
    };

  /**
   * Complete the manual disbursement after
   * the administrator has actually transferred
   * the money to the customer's bank account.
   */
  const handleCompleteManualDisbursement =
    async () => {
      if (!id) return;

      const reference =
        manualReference.trim();

      if (!reference) {
        setError(
          "Manual disbursement reference is required."
        );
        return;
      }

      try {
        setActionLoading(true);
        setError("");

        const response =
          await adminLoanApi.completeManualDisbursement(
            id,
            {
              reference,
            }
          );

        setLoan(response.loan);

        setShowManualModal(false);
        setManualReference("");

        /**
         * The backend creates the repayment schedule
         * during successful completion. Refetch so the
         * populated schedule is immediately available.
         */
        await loadLoan();
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setActionLoading(false);
      }
    };

  const handlePaystackDisbursement =
    async () => {
      if (!id) return;

      try {
        setActionLoading(true);
        setError("");

        const response =
          await adminLoanApi.initiatePaystackDisbursement(
            id
          );

        setLoan(response.loan);

        /**
         * Paystack completion is webhook-driven.
         * Do not mark the loan successful here.
         */
        if (response.waitingForWebhook) {
          setError(
            ""
          );
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setActionLoading(false);
      }
    };

  const handleCancelLoan = async () => {
    if (!id) return;

    try {
      setActionLoading(true);
      setError("");

      const updated =
        await adminLoanApi.cancelLoan(
          id,
          cancelReason.trim() || undefined
        );

      setLoan(updated);

      setShowCancelModal(false);
      setCancelReason("");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * Open the manual modal.
   *
   * If the loan is still pending, the modal starts
   * with the "Start Manual Disbursement" action.
   *
   * If the loan is already PROCESSING via manual
   * disbursement, the modal shows the completion form.
   */
  const openManualModal = () => {
    setError("");
    setManualReference("");
    setShowManualModal(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
          Loading loan...
        </div>
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="p-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={18} />
          Back to loans
        </button>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error || "Loan not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={18} />
            Back to loans
          </button>

          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">
                  {loan.loanNumber}
                </h1>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${getLoanStatusClasses(
                    loan.status
                  )}`}
                >
                  {formatStatus(loan.status)}
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                {product?.name || "Loan"} · Created{" "}
                {formatDate(loan.createdAt)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={loading || actionLoading}
                onClick={loadLoan}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw size={16} />
                Refresh
              </button>

              {canCancel && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => {
                    setError("");
                    setShowCancelModal(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <XCircle size={16} />
                  Cancel Loan
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="text-lg font-semibold"
            >
              ×
            </button>
          </div>
        )}

        {/* Summary */}
        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Principal"
            value={formatMoney(
              loan.principalAmount,
              currency
            )}
            icon={<WalletCards size={20} />}
          />

          <SummaryCard
            title="Disbursed"
            value={formatMoney(
              loan.amountDisbursed,
              currency
            )}
            icon={<Banknote size={20} />}
          />

          <SummaryCard
            title="Amount Paid"
            value={formatMoney(
              loan.amountPaid,
              currency
            )}
            icon={<CheckCircle2 size={20} />}
          />

          <SummaryCard
            title="Outstanding"
            value={formatMoney(
              loan.outstandingAmount,
              currency
            )}
            icon={<AlertTriangle size={20} />}
          />
        </div>

        {/* Main */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Customer */}
            <Section
              title="Customer"
              icon={<User size={18} />}
            >
              <InfoRow
                label="Name"
                value={
                  applicant?.name ||
                  "Unknown customer"
                }
              />

              <InfoRow
                label="Email"
                value={
                  applicant?.email ? (
                    <span className="inline-flex items-center gap-2">
                      <Mail size={14} />
                      {applicant.email}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />

              <InfoRow
                label="Phone"
                value={
                  applicant?.phone ? (
                    <span className="inline-flex items-center gap-2">
                      <Phone size={14} />
                      {applicant.phone}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
            </Section>

            {/* Loan terms */}
            <Section
              title="Loan Terms"
              icon={<CreditCard size={18} />}
            >
              <InfoRow
                label="Loan Product"
                value={
                  product?.name || "—"
                }
              />

              <InfoRow
                label="Product Code"
                value={
                  product?.code || "—"
                }
              />

              <InfoRow
                label="Principal"
                value={formatMoney(
                  loan.principalAmount,
                  currency
                )}
              />

              <InfoRow
                label="Interest"
                value={formatMoney(
                  loan.interestAmount,
                  currency
                )}
              />

              <InfoRow
                label="Fees"
                value={formatMoney(
                  loan.feeAmount,
                  currency
                )}
              />

              <InfoRow
                label="Total Repayment"
                value={formatMoney(
                  loan.totalRepayment,
                  currency
                )}
              />

              <InfoRow
                label="Interest Rate"
                value={`${loan.interestRate}%`}
              />

              <InfoRow
                label="Interest Type"
                value={formatStatus(
                  loan.interestType
                )}
              />

              <InfoRow
                label="Duration"
                value={`${loan.durationDays} days`}
              />

              <InfoRow
                label="Repayment Frequency"
                value={formatStatus(
                  loan.repaymentFrequency
                )}
              />

              <InfoRow
                label="Installments"
                value={loan.numberOfInstallments}
              />

              <InfoRow
                label="Installment Amount"
                value={formatMoney(
                  loan.installmentAmount,
                  currency
                )}
              />
            </Section>

            {/* Disbursement */}
            <Section
              title="Disbursement"
              icon={<Banknote size={18} />}
              action={
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getDisbursementStatusClasses(
                    loan.disbursementStatus
                  )}`}
                >
                  {loan.disbursementStatus}
                </span>
              }
            >
              <InfoRow
                label="Method"
                value={formatStatus(
                  loan.disbursementMethod
                )}
              />

              <InfoRow
                label="Status"
                value={
                  <span
                    className={`rounded-full border px-2 py-1 text-xs font-semibold ${getDisbursementStatusClasses(
                      loan.disbursementStatus
                    )}`}
                  >
                    {loan.disbursementStatus}
                  </span>
                }
              />

              <InfoRow
                label="Amount Disbursed"
                value={formatMoney(
                  loan.amountDisbursed,
                  currency
                )}
              />

              <InfoRow
                label="Disbursement Reference"
                value={
                  loan.disbursementReference ||
                  loan.manualDisbursementReference ||
                  "—"
                }
              />

              <InfoRow
                label="Paystack Transfer Code"
                value={
                  loan.paystackTransferCode || "—"
                }
              />

              <InfoRow
                label="Paystack Transfer ID"
                value={
                  loan.paystackTransferId || "—"
                }
              />

              <InfoRow
                label="Disbursed At"
                value={formatDateTime(
                  loan.disbursedAt
                )}
              />

              {loan.disbursementReason && (
                <InfoRow
                  label="Reason"
                  value={
                    loan.disbursementReason
                  }
                />
              )}

              {/* Pending */}
              {isPendingDisbursement && (
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex gap-3">
                    <AlertTriangle
                      size={20}
                      className="mt-0.5 shrink-0 text-amber-600"
                    />

                    <div>
                      <p className="font-semibold text-amber-800">
                        Loan is awaiting
                        disbursement
                      </p>

                      <p className="mt-1 text-sm leading-6 text-amber-700">
                        Choose a disbursement method
                        below. A repayment schedule
                        is created only after successful
                        disbursement.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={
                        handlePaystackDisbursement
                      }
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      <ShieldCheck size={17} />

                      {actionLoading
                        ? "Processing..."
                        : "Disburse with Paystack"}
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={openManualModal}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Landmark size={17} />
                      Manual Disbursement
                    </button>
                  </div>
                </div>
              )}

              {/* Processing */}
              {isDisbursing && (
                <div className="mt-5 rounded-xl border border-purple-200 bg-purple-50 p-4">
                  <div className="flex gap-3">
                    <Clock3
                      size={20}
                      className="mt-0.5 shrink-0 text-purple-600"
                    />

                    <div className="flex-1">
                      <p className="font-semibold text-purple-800">
                        {isManualDisbursement
                          ? "Manual disbursement is in progress"
                          : "Paystack disbursement is processing"}
                      </p>

                      <p className="mt-1 text-sm leading-6 text-purple-700">
                        {isManualDisbursement
                          ? "The loan has been claimed for manual processing. Complete the transfer and record the bank reference."
                          : "The transfer has been initiated. Wait for the Paystack result/webhook before treating the loan as successfully disbursed."}
                      </p>

                      {isManualDisbursement && (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={openManualModal}
                          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                        >
                          <Landmark size={16} />
                          Complete Manual Disbursement
                        </button>
                      )}

                      {isPaystackDisbursement && (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={loadLoan}
                          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-purple-200 bg-white px-4 py-2.5 text-sm font-semibold text-purple-700 hover:bg-purple-50 disabled:opacity-50"
                        >
                          <RefreshCw size={16} />
                          Check Status
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Successful */}
              {isSuccessfullyDisbursed && (
                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex gap-3">
                    <CheckCircle2
                      size={20}
                      className="mt-0.5 shrink-0 text-emerald-600"
                    />

                    <div>
                      <p className="font-semibold text-emerald-800">
                        Disbursement successful
                      </p>

                      <p className="mt-1 text-sm leading-6 text-emerald-700">
                        The loan has been successfully
                        disbursed.
                        {schedule
                          ? " The repayment schedule is available below."
                          : " The repayment schedule should now be available; refresh if it is not yet shown."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </Section>

            {/* Repayment schedule */}
            <Section
              title="Repayment Schedule"
              icon={<CalendarDays size={18} />}
            >
              {!schedule ? (
                <div className="py-8 text-center">
                  <CalendarDays
                    size={32}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 text-sm font-medium text-slate-600">
                    No repayment schedule available
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    A schedule is created after a
                    successful disbursement.
                  </p>
                </div>
              ) : (
                <RepaymentScheduleView
                  schedule={schedule}
                  currency={currency}
                />
              )}
            </Section>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Repayment summary */}
            <Section
              title="Repayment Summary"
              icon={<Receipt size={18} />}
            >
              <InfoRow
                label="Total Repayment"
                value={formatMoney(
                  loan.totalRepayment,
                  currency
                )}
              />

              <InfoRow
                label="Amount Paid"
                value={formatMoney(
                  loan.amountPaid,
                  currency
                )}
              />

              <InfoRow
                label="Outstanding"
                value={formatMoney(
                  loan.outstandingAmount,
                  currency
                )}
              />

              <InfoRow
                label="Installment"
                value={formatMoney(
                  loan.installmentAmount,
                  currency
                )}
              />

              <InfoRow
                label="Frequency"
                value={formatStatus(
                  loan.repaymentFrequency
                )}
              />

              <InfoRow
                label="Installments"
                value={loan.numberOfInstallments}
              />
            </Section>

            {/* Dates */}
            <Section
              title="Loan Dates"
              icon={<CalendarDays size={18} />}
            >
              <InfoRow
                label="Created"
                value={formatDate(
                  loan.createdAt
                )}
              />

              <InfoRow
                label="Start Date"
                value={formatDate(
                  loan.startDate
                )}
              />

              <InfoRow
                label="Maturity Date"
                value={formatDate(
                  loan.maturityDate
                )}
              />

              <InfoRow
                label="Disbursed At"
                value={formatDateTime(
                  loan.disbursedAt
                )}
              />
            </Section>

            {/* Schedule status */}
            {schedule && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Schedule Status
                </p>

                <div className="mt-3">
                  <span
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${getScheduleStatusClasses(
                      schedule.status
                    )}`}
                  >
                    {formatStatus(
                      schedule.status
                    )}
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  <MiniMetric
                    label="Schedule Total"
                    value={formatMoney(
                      schedule.totalRepaymentAmount,
                      currency
                    )}
                  />

                  <MiniMetric
                    label="Schedule Paid"
                    value={formatMoney(
                      schedule.amountPaid,
                      currency
                    )}
                  />

                  <MiniMetric
                    label="Schedule Outstanding"
                    value={formatMoney(
                      schedule.amountOutstanding,
                      currency
                    )}
                  />

                  <MiniMetric
                    label="Final Due Date"
                    value={formatDate(
                      schedule.finalDueDate
                    )}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual disbursement modal */}
      {showManualModal && (
        <Modal
          title={
            isManualDisbursement
              ? "Complete Manual Disbursement"
              : "Start Manual Disbursement"
          }
          description={
            isManualDisbursement
              ? "Confirm the bank transfer by recording the reference used for the completed transfer."
              : "Start the manual disbursement process. This will reserve the loan for manual processing."
          }
          onClose={() => {
            if (!actionLoading) {
              setShowManualModal(false);
            }
          }}
        >
          {!isManualDisbursement ? (
            <>
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex gap-3">
                    <Landmark
                      size={20}
                      className="mt-0.5 shrink-0 text-slate-600"
                    />

                    <div>
                      <p className="font-semibold text-slate-800">
                        Manual processing
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Starting this process will move
                        the loan into processing status.
                        It does not mark the money as
                        disbursed.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex gap-3">
                    <AlertTriangle
                      size={19}
                      className="mt-0.5 shrink-0 text-amber-600"
                    />

                    <p className="text-sm leading-6 text-amber-700">
                      Start this only when an
                      administrator is ready to process
                      the transfer manually. The actual
                      completion must be recorded after
                      the money has been transferred.
                    </p>
                  </div>
                </div>
              </div>

              <ModalActions
                cancelLabel="Cancel"
                confirmLabel={
                  actionLoading
                    ? "Starting..."
                    : "Start Manual Disbursement"
                }
                onCancel={() =>
                  setShowManualModal(false)
                }
                onConfirm={
                  handleStartManualDisbursement
                }
                disabled={actionLoading}
              />
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex gap-3">
                    <CheckCircle2
                      size={20}
                      className="mt-0.5 shrink-0 text-emerald-600"
                    />

                    <div>
                      <p className="font-semibold text-emerald-800">
                        Manual disbursement started
                      </p>

                      <p className="mt-1 text-sm leading-6 text-emerald-700">
                        The loan is now reserved for
                        manual processing. After the
                        transfer has actually been made,
                        enter its reference below.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Transfer Details
                  </p>

                  <InfoRow
                    label="Customer"
                    value={
                      applicant?.name ||
                      "Unknown customer"
                    }
                  />

                  <InfoRow
                    label="Amount"
                    value={formatMoney(
                      loan.principalAmount,
                      currency
                    )}
                  />

                  <InfoRow
                    label="Bank Account"
                    value="Use the customer's verified primary bank account"
                  />
                </div>

                <div>
                  <label
                    htmlFor="manualReference"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Disbursement Reference
                  </label>

                  <input
                    id="manualReference"
                    type="text"
                    value={manualReference}
                    onChange={(event) =>
                      setManualReference(
                        event.target.value
                      )
                    }
                    placeholder="e.g. BANK-TRANSFER-001"
                    autoComplete="off"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Enter the reference from the actual
                    bank transfer.
                  </p>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-700">
                  Only complete this step after the money
                  has actually been transferred. Successful
                  completion activates the loan and creates
                  its repayment schedule.
                </div>
              </div>

              <ModalActions
                cancelLabel="Close"
                confirmLabel={
                  actionLoading
                    ? "Completing..."
                    : "Complete Disbursement"
                }
                onCancel={() =>
                  setShowManualModal(false)
                }
                onConfirm={
                  handleCompleteManualDisbursement
                }
                disabled={
                  actionLoading ||
                  !manualReference.trim()
                }
              />
            </>
          )}
        </Modal>
      )}

      {/* Cancel modal */}
      {showCancelModal && (
        <Modal
          title="Cancel Loan"
          description="This will cancel the loan before disbursement."
          onClose={() => {
            if (!actionLoading) {
              setShowCancelModal(false);
            }
          }}
        >
          <div>
            <label
              htmlFor="cancelReason"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Reason
            </label>

            <textarea
              id="cancelReason"
              value={cancelReason}
              onChange={(event) =>
                setCancelReason(event.target.value)
              }
              rows={4}
              placeholder="Optional cancellation reason..."
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            />
          </div>

          <ModalActions
            cancelLabel="Keep Loan"
            confirmLabel={
              actionLoading
                ? "Cancelling..."
                : "Cancel Loan"
            }
            onCancel={() =>
              setShowCancelModal(false)
            }
            onConfirm={handleCancelLoan}
            disabled={actionLoading}
          />
        </Modal>
      )}
    </div>
  );
};

const SummaryCard = ({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: ReactNode;
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        {icon}
      </div>

      <p className="text-sm text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
};

const MiniMetric = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="text-sm font-semibold text-slate-900">
        {value}
      </span>
    </div>
  );
};

const RepaymentScheduleView = ({
  schedule,
  currency,
}: {
  schedule: AdminRepaymentSchedule;
  currency: string;
}) => {
  const installments = (
    schedule as AdminRepaymentSchedule & {
      installments?: Array<{
        installmentNumber: number;
        dueDate: string;
        principalAmount: number;
        interestAmount: number;
        feeAmount: number;
        totalAmount: number;
        paidAmount: number;
        remainingAmount: number;
        status: string;
        paidAt?: string | null;
        overdueAt?: string | null;
      }>;
    }
  ).installments;

  if (!installments?.length) {
    return (
      <div className="py-8 text-center text-sm text-slate-500">
        No installments found in this schedule.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px]">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              #
            </th>

            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Due Date
            </th>

            <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              Principal
            </th>

            <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              Interest
            </th>

            <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total
            </th>

            <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              Paid
            </th>

            <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              Remaining
            </th>

            <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {installments.map((installment) => (
            <tr
              key={installment.installmentNumber}
              className="hover:bg-slate-50"
            >
              <td className="px-3 py-4 text-sm font-semibold text-slate-900">
                {installment.installmentNumber}
              </td>

              <td className="px-3 py-4 text-sm text-slate-600">
                {formatDate(
                  installment.dueDate
                )}
              </td>

              <td className="px-3 py-4 text-right text-sm text-slate-700">
                {formatMoney(
                  installment.principalAmount,
                  currency
                )}
              </td>

              <td className="px-3 py-4 text-right text-sm text-slate-700">
                {formatMoney(
                  installment.interestAmount,
                  currency
                )}
              </td>

              <td className="px-3 py-4 text-right text-sm font-semibold text-slate-900">
                {formatMoney(
                  installment.totalAmount,
                  currency
                )}
              </td>

              <td className="px-3 py-4 text-right text-sm text-emerald-600">
                {formatMoney(
                  installment.paidAmount,
                  currency
                )}
              </td>

              <td className="px-3 py-4 text-right text-sm font-semibold text-amber-600">
                {formatMoney(
                  installment.remainingAmount,
                  currency
                )}
              </td>

              <td className="px-3 py-4">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getScheduleStatusClasses(
                    installment.status
                  )}`}
                >
                  {formatStatus(
                    installment.status
                  )}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Modal = ({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {title}
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
};

const ModalActions = ({
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  disabled,
}: {
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  disabled?: boolean;
}) => {
  return (
    <div className="mt-6 flex justify-end gap-3">
      <button
        type="button"
        disabled={disabled}
        onClick={onCancel}
        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {cancelLabel}
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={onConfirm}
        className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {confirmLabel}
      </button>
    </div>
  );
};

export default AdminLoanDetails;
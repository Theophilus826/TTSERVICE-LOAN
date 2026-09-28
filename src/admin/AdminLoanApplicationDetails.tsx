import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Landmark,
  Mail,
  Phone,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useNavigate, useParams } from "react-router-dom";

import adminLoanApplicationApi, {
  type AdminApplicant,
  type AdminApplicationStatus,
  type AdminLoanApplication,
  type AdminLoanProduct,
} from "../services/adminLoanApplicationApi";

const formatMoney = (
  amount?: number | null,
  currency = "NGN"
) => {
  if (amount === null || amount === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatNumber = (amount?: number | null) => {
  if (amount === null || amount === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("en-NG").format(amount);
};

const formatDate = (date?: string | null) => {
  if (!date) {
    return "—";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return parsedDate.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatDateTime = (date?: string | null) => {
  if (!date) {
    return "—";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return parsedDate.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatStatus = (status?: AdminApplicationStatus) => {
  if (!status) return "Unknown";

  return status
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
};

const getStatusClasses = (
  status?: AdminApplicationStatus
) => {
  switch (status) {
    case "approved":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "rejected":
      return "bg-red-50 text-red-700 border-red-200";

    case "cancelled":
      return "bg-gray-100 text-gray-700 border-gray-200";

    case "disbursed":
    case "completed":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "credit_check":
      return "bg-purple-50 text-purple-700 border-purple-200";

    case "under_review":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "offer_created":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";

    case "pending":
    case "submitted":
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
};

const getApplicant = (
  user: AdminLoanApplication["user"]
): AdminApplicant | null => {
  if (!user || typeof user === "string") {
    return null;
  }

  return user;
};

const getProduct = (
  product: AdminLoanApplication["loanProduct"]
): AdminLoanProduct | null => {
  if (!product || typeof product === "string") {
    return null;
  }

  return product;
};

const getErrorMessage = (error: any) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Something went wrong. Please try again."
  );
};

interface InfoRowProps {
  label: string;
  value: ReactNode;
}

const InfoRow = ({ label, value }: InfoRowProps) => {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <span className="text-right text-sm font-medium text-slate-900">
        {value}
      </span>
    </div>
  );
};

interface SectionProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}

const Section = ({
  title,
  icon,
  children,
}: SectionProps) => {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          {icon}
        </div>

        <h2 className="text-base font-semibold text-slate-900">
          {title}
        </h2>
      </div>

      <div className="px-6 py-2">{children}</div>
    </section>
  );
};

const AdminLoanApplicationDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [application, setApplication] =
    useState<AdminLoanApplication | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const [showRejectModal, setShowRejectModal] =
    useState(false);

  const [rejectionReason, setRejectionReason] =
    useState("");

  const loadApplication = useCallback(async () => {
    if (!id) {
      setError("Application ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data =
        await adminLoanApplicationApi.getApplication(id);

      setApplication(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadApplication();
  }, [loadApplication]);

  const runAction = async (
    action: () => Promise<AdminLoanApplication>
  ) => {
    try {
      setActionLoading(true);
      setError("");

      const updated = await action();

      setApplication(updated);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartReview = async () => {
    if (!id) return;

    await runAction(() =>
      adminLoanApplicationApi.startReview(id)
    );
  };

  const handleCreditCheck = async () => {
    if (!id) return;

    await runAction(() =>
      adminLoanApplicationApi.sendToCreditCheck(id)
    );
  };

  const handleApprove = async () => {
    if (!id) return;

    await runAction(() =>
      adminLoanApplicationApi.approveApplication(id)
    );
  };

  const handleReject = async () => {
    if (!id) return;

    const reason = rejectionReason.trim();

    if (!reason) {
      setError("Please provide a rejection reason.");
      return;
    }

    await runAction(() =>
      adminLoanApplicationApi.rejectApplication(
        id,
        reason
      )
    );

    setShowRejectModal(false);
    setRejectionReason("");
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
          <span>Loading application...</span>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="p-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error || "Loan application not found."}
        </div>
      </div>
    );
  }

  const applicant = getApplicant(application.user);
  const product = getProduct(application.loanProduct);

  const currency = product?.currency || "NGN";

  const status = application.status;

  const canStartReview =
    status === "submitted" || status === "pending";

  const canSendToCreditCheck =
    status === "under_review";

  const canApprove =
    status === "under_review" ||
    status === "credit_check";

  const canReject =
    status === "submitted" ||
    status === "pending" ||
    status === "under_review" ||
    status === "credit_check" ||
    status === "approved";

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft size={18} />
            Back to applications
          </button>

          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">
                  Loan Application
                </h1>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                    status
                  )}`}
                >
                  {formatStatus(status)}
                </span>
              </div>

              <p className="text-sm text-slate-500">
                Application #{application.applicationNumber}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {canStartReview && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleStartReview}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FileText size={17} />
                  {actionLoading
                    ? "Processing..."
                    : "Start Review"}
                </button>
              )}

              {canSendToCreditCheck && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleCreditCheck}
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ShieldCheck size={17} />
                  {actionLoading
                    ? "Processing..."
                    : "Credit Check"}
                </button>
              )}

              {canApprove && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleApprove}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle2 size={17} />
                  {actionLoading
                    ? "Processing..."
                    : "Approve"}
                </button>
              )}

              {canReject && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => {
                    setError("");
                    setShowRejectModal(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <XCircle size={17} />
                  Reject
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="font-semibold text-red-700 hover:text-red-900"
            >
              ×
            </button>
          </div>
        )}

        {/* Summary cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <WalletIcon />
            </div>

            <p className="text-sm text-slate-500">
              Requested Amount
            </p>

            <p className="mt-1 text-xl font-bold text-slate-900">
              {formatMoney(
                application.amountRequested,
                currency
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Clock3 size={20} />
            </div>

            <p className="text-sm text-slate-500">
              Duration
            </p>

            <p className="mt-1 text-xl font-bold text-slate-900">
              {application.durationDays} days
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CreditCard size={20} />
            </div>

            <p className="text-sm text-slate-500">
              Total Repayment
            </p>

            <p className="mt-1 text-xl font-bold text-slate-900">
              {formatMoney(
                application.totalRepayment,
                currency
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Landmark size={20} />
            </div>

            <p className="text-sm text-slate-500">
              Installment
            </p>

            <p className="mt-1 text-xl font-bold text-slate-900">
              {formatMoney(
                application.installmentAmount,
                currency
              )}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {application.repaymentFrequency}
            </p>
          </div>
        </div>

        {/* Main content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left */}
          <div className="space-y-6 lg:col-span-2">
            {/* Applicant */}
            <Section
              title="Applicant Information"
              icon={<User size={18} />}
            >
              <InfoRow
                label="Full Name"
                value={
                  applicant?.name ||
                  "Applicant information unavailable"
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

              <InfoRow
                label="Employment Status"
                value={
                  application.employmentStatus
                    ? application.employmentStatus
                        .replaceAll("_", " ")
                        .replace(/\b\w/g, (letter) =>
                          letter.toUpperCase()
                        )
                    : "—"
                }
              />

              <InfoRow
                label="Monthly Income"
                value={formatMoney(
                  application.monthlyIncome,
                  currency
                )}
              />
            </Section>

            {/* Loan details */}
            <Section
              title="Loan Details"
              icon={<Landmark size={18} />}
            >
              <InfoRow
                label="Loan Product"
                value={
                  product?.name ||
                  "Product information unavailable"
                }
              />

              <InfoRow
                label="Product Code"
                value={product?.code || "—"}
              />

              <InfoRow
                label="Amount Requested"
                value={formatMoney(
                  application.amountRequested,
                  currency
                )}
              />

              <InfoRow
                label="Duration"
                value={`${application.durationDays} days`}
              />

              <InfoRow
                label="Purpose"
                value={
                  application.purpose || "Not provided"
                }
              />
            </Section>

            {/* Financial terms */}
            <Section
              title="Calculated Loan Terms"
              icon={<CreditCard size={18} />}
            >
              <InfoRow
                label="Interest Rate"
                value={`${application.interestRate}%`}
              />

              <InfoRow
                label="Interest Type"
                value={
                  application.interestType
                    .replaceAll("_", " ")
                    .replace(/\b\w/g, (letter) =>
                      letter.toUpperCase()
                    )
                }
              />

              <InfoRow
                label="Interest Amount"
                value={formatMoney(
                  application.interestAmount,
                  currency
                )}
              />

              <InfoRow
                label="Processing Fee"
                value={formatMoney(
                  application.processingFee,
                  currency
                )}
              />

              <InfoRow
                label="Service Fee"
                value={formatMoney(
                  application.serviceFee,
                  currency
                )}
              />

              <InfoRow
                label="Total Fees"
                value={formatMoney(
                  application.feeAmount,
                  currency
                )}
              />

              <InfoRow
                label="Total Repayment"
                value={formatMoney(
                  application.totalRepayment,
                  currency
                )}
              />

              <InfoRow
                label="Repayment Frequency"
                value={
                  application.repaymentFrequency
                    .replaceAll("_", " ")
                    .replace(/\b\w/g, (letter) =>
                      letter.toUpperCase()
                    )
                }
              />

              <InfoRow
                label="Number of Installments"
                value={formatNumber(
                  application.numberOfInstallments
                )}
              />

              <InfoRow
                label="Installment Amount"
                value={formatMoney(
                  application.installmentAmount,
                  currency
                )}
              />
            </Section>

            {/* Credit information */}
            <Section
              title="Credit Information"
              icon={<ShieldCheck size={18} />}
            >
              <InfoRow
                label="Credit Score"
                value={
                  application.creditScore ?? "Not available"
                }
              />

              <InfoRow
                label="Credit Decision"
                value={
                  application.creditDecision
                    ? application.creditDecision
                        .replaceAll("_", " ")
                        .replace(/\b\w/g, (letter) =>
                          letter.toUpperCase()
                        )
                    : "Pending"
                }
              />

              <InfoRow
                label="Credit Assessment"
                value={
                  application.creditAssessment &&
                  typeof application.creditAssessment !==
                    "string"
                    ? application.creditAssessment.reason ||
                      "Assessment available"
                    : application.creditAssessment
                    ? "Assessment available"
                    : "Not available"
                }
              />
            </Section>

            {/* Rejection reason */}
            {application.rejectionReason && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                <div className="mb-2 flex items-center gap-2 text-red-700">
                  <XCircle size={18} />

                  <h2 className="font-semibold">
                    Rejection Reason
                  </h2>
                </div>

                <p className="text-sm leading-6 text-red-700">
                  {application.rejectionReason}
                </p>
              </div>
            )}
          </div>

          {/* Right */}
          <div className="space-y-6">
            {/* Product */}
            <Section
              title="Product Limits"
              icon={<BriefcaseBusiness size={18} />}
            >
              <InfoRow
                label="Currency"
                value={product?.currency || currency}
              />

              <InfoRow
                label="Minimum Amount"
                value={formatMoney(
                  product?.minAmount,
                  currency
                )}
              />

              <InfoRow
                label="Maximum Amount"
                value={formatMoney(
                  product?.maxAmount,
                  currency
                )}
              />

              <InfoRow
                label="Minimum Duration"
                value={
                  product?.minDurationDays !== undefined
                    ? `${product.minDurationDays} days`
                    : "—"
                }
              />

              <InfoRow
                label="Maximum Duration"
                value={
                  product?.maxDurationDays !== undefined
                    ? `${product.maxDurationDays} days`
                    : "—"
                }
              />
            </Section>

            {/* Timeline */}
            <Section
              title="Application Timeline"
              icon={<Clock3 size={18} />}
            >
              <InfoRow
                label="Submitted"
                value={formatDateTime(
                  application.submittedAt
                )}
              />

              <InfoRow
                label="Last Reviewed"
                value={formatDateTime(
                  application.reviewedAt
                )}
              />

              <InfoRow
                label="Created"
                value={formatDateTime(
                  application.createdAt
                )}
              />

              <InfoRow
                label="Last Updated"
                value={formatDateTime(
                  application.updatedAt
                )}
              />
            </Section>

            {/* Current state */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Current Status
              </p>

              <div className="mt-3 flex items-center gap-3">
                <span
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${getStatusClasses(
                    status
                  )}`}
                >
                  {formatStatus(status)}
                </span>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-500">
                {getStatusDescription(status)}
              </p>
            </div>

            {/* Admin actions */}
            {(canStartReview ||
              canSendToCreditCheck ||
              canApprove ||
              canReject) && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-semibold text-slate-900">
                  Review Actions
                </h3>

                <div className="mt-4 space-y-2">
                  {canStartReview && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleStartReview}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      <FileText size={17} />
                      Start Review
                    </button>
                  )}

                  {canSendToCreditCheck && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleCreditCheck}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                    >
                      <ShieldCheck size={17} />
                      Send to Credit Check
                    </button>
                  )}

                  {canApprove && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleApprove}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle2 size={17} />
                      Approve Application
                    </button>
                  )}

                  {canReject && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => {
                        setError("");
                        setShowRejectModal(true);
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <XCircle size={17} />
                      Reject Application
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Reject Application
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Provide a reason for rejecting this
                    application.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowRejectModal(false)
                  }
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="px-6 py-5">
              <label
                htmlFor="rejectionReason"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Rejection Reason
              </label>

              <textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(event) =>
                  setRejectionReason(event.target.value)
                }
                rows={5}
                placeholder="Enter the reason for rejecting this application..."
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />

              <p className="mt-2 text-xs text-slate-400">
                This reason will be stored with the application.
              </p>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() =>
                  setShowRejectModal(false)
                }
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  actionLoading ||
                  !rejectionReason.trim()
                }
                onClick={handleReject}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading
                  ? "Rejecting..."
                  : "Reject Application"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const WalletIcon = () => {
  return (
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
      <path d="M20 7V6a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v8a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V7" />
      <path d="M16 14h.01" />
    </svg>
  );
};

const getStatusDescription = (
  status: AdminApplicationStatus
) => {
  switch (status) {
    case "submitted":
      return "The customer has submitted this application and it is waiting for an admin review.";

    case "pending":
      return "The application is pending processing by the loan team.";

    case "under_review":
      return "An admin is currently reviewing the application and its supporting information.";

    case "credit_check":
      return "The application has been sent for credit assessment.";

    case "approved":
      return "The application has been approved. The next stage can proceed to offer creation.";

    case "offer_created":
      return "A loan offer has been created for this application.";

    case "rejected":
      return "This application has been rejected.";

    case "cancelled":
      return "This application has been cancelled.";

    case "disbursed":
      return "The approved loan has been disbursed.";

    case "completed":
      return "The loan associated with this application has been completed.";

    default:
      return "Application status information.";
  }
};

export default AdminLoanApplicationDetails;
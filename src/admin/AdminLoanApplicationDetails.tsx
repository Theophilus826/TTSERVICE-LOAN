import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import adminLoanApplicationApi, {
  type AdminLoanApplication,
} from "../services/adminLoanApplicationApi";

const formatAmount = (amount?: number | null, currency = "NGN") => {
  if (amount == null || !Number.isFinite(Number(amount))) return "—";

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount));
};

const formatLabel = (value?: string | null) =>
  value
    ? value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "—";

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
};

export default function AdminLoanApplicationDetails() {
  const { applicationId = "" } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const [application, setApplication] =
    useState<AdminLoanApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadApplication = useCallback(async () => {
    if (!applicationId) {
      setError("Loan application ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const result = await adminLoanApplicationApi.getApplication(applicationId);
      setApplication(result);
    } catch (requestError) {
      const failure = requestError as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setError(
        failure.response?.data?.message ||
          failure.message ||
          "Unable to load this loan application.",
      );
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    void loadApplication();
  }, [loadApplication]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-gray-600">
        <RefreshCw size={20} className="animate-spin" />
        Loading application...
      </div>
    );
  }

  if (!application) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-6">
        <button
          type="button"
          onClick={() => navigate("/admin/loan-applications")}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={16} /> Back to applications
        </button>
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error || "Loan application not found."}
        </div>
        <button
          type="button"
          onClick={() => void loadApplication()}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Retry
        </button>
      </main>
    );
  }

  const applicant =
    typeof application.user === "string" ? null : application.user;
  const product =
    typeof application.loanProduct === "string"
      ? null
      : application.loanProduct;
  const currency = product?.currency || "NGN";

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <button
        type="button"
        onClick={() => navigate("/admin/loan-applications")}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={16} /> Back to applications
      </button>

      <header className="flex flex-col justify-between gap-4 rounded-xl border border-gray-200 bg-white p-6 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm text-gray-500">Loan application</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            {application.applicationNumber}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {applicant?.name || "Applicant"}
            {applicant?.email ? ` · ${applicant.email}` : ""}
          </p>
        </div>
        <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">
          {formatLabel(application.status)}
        </span>
      </header>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Metric label="Requested Amount" value={formatAmount(application.amountRequested, currency)} />
        <Metric label="Total Repayment" value={formatAmount(application.totalRepayment, currency)} />
        <Metric label="Installment Amount" value={formatAmount(application.installmentAmount, currency)} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <InfoSection title="Application">
          <InfoRow label="Product" value={product?.name || "—"} />
          <InfoRow label="Product Code" value={product?.code || "—"} />
          <InfoRow label="Duration" value={`${application.durationDays} days`} />
          <InfoRow label="Purpose" value={application.purpose || "—"} />
          <InfoRow label="Repayment Frequency" value={formatLabel(application.repaymentFrequency)} />
          <InfoRow label="Installments" value={String(application.numberOfInstallments)} />
          <InfoRow label="Submitted" value={formatDate(application.submittedAt || application.createdAt)} />
        </InfoSection>

        <InfoSection title="Applicant & Review">
          <InfoRow label="Name" value={applicant?.name || "—"} />
          <InfoRow label="Email" value={applicant?.email || "—"} />
          <InfoRow label="Phone" value={applicant?.phone || "—"} />
          <InfoRow label="Monthly Income" value={formatAmount(application.monthlyIncome, currency)} />
          <InfoRow label="Employment" value={formatLabel(application.employmentStatus)} />
          <InfoRow label="Credit Decision" value={formatLabel(application.creditDecision)} />
          <InfoRow label="Credit Score" value={String(application.creditScore ?? "—")} />
          <InfoRow label="Reviewed" value={formatDate(application.reviewedAt)} />
          {application.rejectionReason && (
            <InfoRow label="Rejection Reason" value={application.rejectionReason} />
          )}
        </InfoSection>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-gray-900">{value}</p>
    </section>
  );
}

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="mb-3 font-semibold text-gray-900">{title}</h2>
      <div className="divide-y divide-gray-100">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="max-w-[65%] break-words text-right font-medium text-gray-900">
        {value}
      </span>
    </div>
  );
}
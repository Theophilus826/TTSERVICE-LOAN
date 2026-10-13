
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Landmark,
  RefreshCw,
  Sparkles,
  WalletCards,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";

import { useAuth } from "../context/AuthContext";
import API from "../services/Api";
import onboardingApi, {
  type OnboardingStatus,
} from "../services/onboarding";
import myLoanApi, {
  type CustomerLoan,
  type LoanDashboard,
  getRepaymentSchedule,
} from "../services/myLoanApi";

import Header from "../component/Header";
import KycAppDownloadPrompt from "../layout/KycAppDownloadPrompt";

// =========================================================
// TYPES
// =========================================================

type CurrentApplication = {
  _id?: string;
  applicationNumber?: string;
  status?: string;
  createdAt?: string;
};

type CurrentApplicationProfileResponse = {
  success: boolean;
  data?: {
    loanSummary?: {
      activeApplication?: CurrentApplication | null;
    };
  };
};

type ApplicationStep = OnboardingStatus["nextStep"];

type DashboardData = {
  onboarding: OnboardingStatus | null;
  loans: LoanDashboard | null;
  application: CurrentApplication | null;
  profileResolved: boolean;
};

type StatusAction = {
  label: string;
  onClick: () => void;
};

type StatusItemProps = {
  icon: ReactNode;
  title: string;
  status: string;
  complete?: boolean;
  completed?: boolean;
  action?: StatusAction;
};

// =========================================================
// CONSTANTS
// =========================================================

const INITIAL_DATA: DashboardData = {
  onboarding: null,
  loans: null,
  application: null,
  profileResolved: false,
};

const EMPTY_ERROR = "";

// =========================================================
// STATUS HELPERS
// =========================================================

function normalizeStatus(value?: string | null): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function formatStatus(value?: string | null): string {
  if (!value) return "";

  return value
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isCompletedLoan(
  loan?: CustomerLoan | null,
): boolean {
  if (!loan) return false;

  return [
    "COMPLETED",
    "FULLY_REPAID",
    "REPAID",
  ].includes(normalizeStatus(loan.status));
}

function getApplicationStep(
  applicationStatus?: string | null,
): ApplicationStep | null {
  switch (normalizeStatus(applicationStatus)) {
    case "SUBMITTED":
    case "UNDER_REVIEW":
    case "CREDIT_CHECK":
      return "REVIEW";

    case "APPROVED":
    case "OFFER_CREATED":
      return "OFFER";

    case "ACCEPTED":
      return "MANDATE";

    default:
      return null;
  }
}

function formatCurrency(
  amount: number | string | null | undefined,
  currency = "NGN",
): string {
  const numericAmount =
    typeof amount === "number"
      ? amount
      : typeof amount === "string" && amount.trim() !== ""
        ? Number(amount)
        : 0;

  const safeAmount = Number.isFinite(numericAmount)
    ? numericAmount
    : 0;

  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(safeAmount);
  } catch {
    return `${currency} ${safeAmount.toLocaleString("en-NG")}`;
  }
}

function formatDate(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function safeAmount(
  value: number | string | null | undefined,
): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : 0;

  return Number.isFinite(parsed) ? parsed : 0;
}

// =========================================================
// DASHBOARD
// =========================================================

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] =
    useState<DashboardData>(INITIAL_DATA);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(EMPTY_ERROR);
  const [retryKey, setRetryKey] = useState(0);
  const [showKycAppPrompt, setShowKycAppPrompt] =
    useState(false);

  // =======================================================
  // LOAD DASHBOARD DATA
  // =======================================================

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      setLoading(true);
      setError(EMPTY_ERROR);

      const [
        onboardingResult,
        loansResult,
        profileResult,
      ] = await Promise.allSettled([
        onboardingApi.getStatus(),
        myLoanApi.getLoanDashboard(),
        API.get<CurrentApplicationProfileResponse>(
          "/users/me/profile",
        ),
      ]);

      if (!mounted) return;

      const onboarding =
        onboardingResult.status === "fulfilled"
          ? onboardingResult.value
          : null;

      const loans =
        loansResult.status === "fulfilled"
          ? loansResult.value
          : null;

      const profileSucceeded =
        profileResult.status === "fulfilled" &&
        profileResult.value.data?.success === true;

      const application = profileSucceeded
        ? profileResult.value.data.data?.loanSummary
            ?.activeApplication ?? null
        : null;

      setData({
        onboarding,
        loans,
        application,
        profileResolved: profileSucceeded,
      });

      const failedRequests = [
        onboardingResult.status === "rejected",
        loansResult.status === "rejected",
        profileResult.status === "rejected" ||
          (
            profileResult.status === "fulfilled" &&
            profileResult.value.data?.success !== true
          ),
      ].filter(Boolean).length;

      if (failedRequests === 3) {
        setError(
          "We couldn't load your dashboard. Please check your connection and try again.",
        );
      } else if (failedRequests > 0) {
        setError(
          "Some dashboard information couldn't be loaded. The information shown may be incomplete.",
        );
      }

      if (onboardingResult.status === "rejected") {
        console.error(
          "Failed to load onboarding status:",
          onboardingResult.reason,
        );
      }

      if (loansResult.status === "rejected") {
        console.error(
          "Failed to load loan dashboard:",
          loansResult.reason,
        );
      }

      if (
        profileResult.status === "rejected" ||
        (
          profileResult.status === "fulfilled" &&
          profileResult.value.data?.success !== true
        )
      ) {
        console.error(
          "Failed to load current application.",
          profileResult.status === "rejected"
            ? profileResult.reason
            : profileResult.value.data,
        );
      }

      setLoading(false);
      setRefreshing(false);
    }

    void loadDashboard().catch((cause: unknown) => {
      console.error("Unexpected dashboard error:", cause);

      if (mounted) {
        setError(
          "We couldn't load your dashboard. Please try again.",
        );
        setLoading(false);
        setRefreshing(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [retryKey]);

  const retryDashboard = useCallback(() => {
    setRefreshing(true);
    setRetryKey((current) => current + 1);
  }, []);

  // =======================================================
  // SOURCE DATA
  // =======================================================

  const status = data.onboarding;
  const loanDashboard = data.loans;
  const currentApplication = data.application;

  const loans = loanDashboard?.loans ?? [];
  const loanCount = loans.length;

  const activeLoans = useMemo(
    () =>
      (loanDashboard?.activeLoans ?? []).filter(
        (loan) => !isCompletedLoan(loan),
      ),
    [loanDashboard],
  );

  const dashboardLoan = loanDashboard?.activeLoan ?? null;

  const activeLoan =
    dashboardLoan && !isCompletedLoan(dashboardLoan)
      ? dashboardLoan
      : activeLoans[0] ?? null;

  const hasActiveLoan = Boolean(activeLoan);

  const repaymentSchedule = getRepaymentSchedule(activeLoan);

  // =======================================================
  // CURRENT APPLICATION
  // =======================================================

  /*
   * A successfully loaded profile is authoritative, including
   * when it explicitly reports no active application.
   *
   * If the profile request failed, fall back to onboarding data.
   */

  const currentApplicationId = data.profileResolved
    ? currentApplication?._id ?? null
    : status?.loan?.applicationId ?? null;

  const currentApplicationStatus = data.profileResolved
    ? currentApplication?.status ?? null
    : status?.loan?.applicationStatus ?? null;

  const hasCurrentApplication = Boolean(
    currentApplicationId ||
      currentApplication?.applicationNumber,
  );

  const currentApplicationStep = getApplicationStep(
    currentApplicationStatus,
  );

  const effectiveNextStep: ApplicationStep =
    currentApplicationStep ?? status?.nextStep ?? "KYC";

  // =======================================================
  // KYC AND BANK
  // =======================================================

  const kycStatus = status?.kyc?.status;

  const kycComplete =
    status !== null &&
    status !== undefined &&
    onboardingApi.isKycComplete(status);

  const kycStepLabel = kycComplete
    ? "All 5 steps completed"
    : normalizeStatus(kycStatus) === "SUBMITTED"
      ? "Submitted"
      : normalizeStatus(kycStatus) === "REJECTED"
        ? "Rejected"
        : normalizeStatus(kycStatus) === "PENDING"
          ? "In progress"
          : "Not started";

  const bankComplete =
    status?.bank?.completed === true &&
    status?.bank?.verified === true;

  // =======================================================
  // REPAYMENT
  // =======================================================

  const repaymentStatus = status?.repayment?.status ?? null;

  const repaymentScheduleId =
    status?.repayment?.repaymentScheduleId ?? null;

  const repaymentStatusLabel = repaymentStatus
    ? formatStatus(repaymentStatus)
    : hasActiveLoan
      ? formatStatus(activeLoan?.status)
      : "Not started";

  // =======================================================
  // COMPLETED LOAN AND ELIGIBILITY
  // =======================================================

  const completedLoanFromStatus =
    normalizeStatus(status?.currentStatus) === "COMPLETED" ||
    status?.loan?.completed === true ||
    normalizeStatus(status?.loan?.completedLoanStatus) ===
      "COMPLETED";

  const completedLoanFromHistory = loans.some(isCompletedLoan);

  const completedLoanFromDashboard =
    isCompletedLoan(dashboardLoan);

  const hasRepaymentWorkflow =
    status?.nextStep === "REPAYMENT" ||
    status?.repayment?.exists === true;

  const isEarlyOnboarding =
    status?.nextStep === "KYC" ||
    status?.nextStep === "BANK" ||
    status?.nextStep === "LOAN";

  /*
   * Do not use a historical completed loan to override an
   * explicit current application, active loan, or repayment flow.
   * Early onboarding also takes precedence over loan history.
   */

  const loanCompleted =
    !hasCurrentApplication &&
    !hasActiveLoan &&
    !hasRepaymentWorkflow &&
    !isEarlyOnboarding &&
    (
      completedLoanFromStatus ||
      completedLoanFromHistory ||
      completedLoanFromDashboard
    );

  const canApplyForNewLoan =
    loanCompleted &&
    (
      status?.canApplyForNewLoan === true ||
      status?.loan?.canApplyForNewLoan === true
    );

  // =======================================================
  // WORKFLOW STATE
  // =======================================================

  const loanExists =
    hasCurrentApplication ||
    status?.loan?.exists === true ||
    loanCount > 0 ||
    loanCompleted;

  const reviewActive =
    !loanCompleted && effectiveNextStep === "REVIEW";

  const offerActive =
    !loanCompleted && effectiveNextStep === "OFFER";

  const mandateActive =
    !loanCompleted && effectiveNextStep === "MANDATE";

  const repaymentActive =
    !loanCompleted &&
    !hasCurrentApplication &&
    (
      effectiveNextStep === "REPAYMENT" ||
      status?.repayment?.exists === true ||
      hasActiveLoan
    );

  // =======================================================
  // SUMMARY
  // =======================================================

  const summary = loanDashboard?.summary;

  const totalBorrowed =
    summary?.totalBorrowed ?? summary?.totalPrincipal ?? 0;

  const totalPaid = summary?.totalPaid ?? 0;

  const totalOutstanding =
    summary?.totalOutstanding ??
    activeLoan?.outstandingAmount ??
    0;

  const currency = repaymentSchedule?.currency ?? "NGN";

  // =======================================================
  // KYC NAVIGATION
  // =======================================================

  const handleContinueKyc = useCallback(() => {
    if (!Capacitor.isNativePlatform()) {
      setShowKycAppPrompt(true);
      return;
    }

    navigate("/kyc");
  }, [navigate]);

  // =======================================================
  // APPLICATION NAVIGATION
  // =======================================================

  const applyForNewLoan = useCallback(() => {
    if (!canApplyForNewLoan) return;

    navigate("/loans");
  }, [canApplyForNewLoan, navigate]);

  const continueApplication = useCallback(() => {
    if (loanCompleted) {
      if (canApplyForNewLoan) {
        applyForNewLoan();
      }
      return;
    }

    if (status && !kycComplete) {
      handleContinueKyc();
      return;
    }

    /*
     * Current application always takes priority over historical
     * loan records.
     */

    if (hasCurrentApplication) {
      switch (effectiveNextStep) {
        case "OFFER":
          navigate("/loan-offers");
          return;

        case "MANDATE": {
          const offerId =
            status?.mandate?.offerId ??
            status?.loanOffer?.offerId;

          navigate(
            offerId
              ? `/loan-offers/${encodeURIComponent(offerId)}`
              : "/loan-offers",
          );
          return;
        }

        case "REVIEW": {
          const applicationId =
            currentApplicationId ??
            status?.loan?.applicationId;

          navigate(
            applicationId
              ? `/loans/applications/${encodeURIComponent(applicationId)}`
              : "/loans/applications",
          );
          return;
        }

        case "REPAYMENT":
          navigate(
            repaymentScheduleId
              ? `/loans/repayments/${encodeURIComponent(repaymentScheduleId)}`
              : "/my-loans",
          );
          return;

        default:
          navigate("/loans/applications");
          return;
      }
    }

    if (repaymentActive) {
      navigate(
        repaymentScheduleId
          ? `/loans/repayments/${encodeURIComponent(repaymentScheduleId)}`
          : "/my-loans",
      );
      return;
    }

    if (hasActiveLoan) {
      navigate("/my-loans");
      return;
    }

    if (!status) {
      handleContinueKyc();
      return;
    }

    switch (effectiveNextStep) {
      case "KYC":
        handleContinueKyc();
        return;

      case "BANK":
        navigate("/bank-accounts");
        return;

      case "LOAN":
        if (!kycComplete) {
          handleContinueKyc();
        } else if (!bankComplete) {
          navigate("/bank-accounts");
        } else {
          navigate("/loans");
        }
        return;

      case "OFFER":
        navigate("/loan-offers");
        return;

      case "MANDATE": {
        const offerId =
          status.mandate?.offerId ??
          status.loanOffer?.offerId;

        navigate(
          offerId
            ? `/loan-offers/${encodeURIComponent(offerId)}`
            : "/loan-offers",
        );
        return;
      }

      case "REPAYMENT":
        navigate(
          repaymentScheduleId
            ? `/loans/repayments/${encodeURIComponent(repaymentScheduleId)}`
            : "/my-loans",
        );
        return;

      case "REVIEW": {
        const applicationId = status.loan?.applicationId;

        navigate(
          applicationId
            ? `/loans/applications/${encodeURIComponent(applicationId)}`
            : "/loans/applications",
        );
        return;
      }

      default:
        if (!kycComplete) {
          handleContinueKyc();
        } else if (!bankComplete) {
          navigate("/bank-accounts");
        } else {
          navigate("/loans");
        }
    }
  }, [
    loanCompleted,
    canApplyForNewLoan,
    applyForNewLoan,
    status,
    kycComplete,
    bankComplete,
    handleContinueKyc,
    hasCurrentApplication,
    currentApplicationId,
    effectiveNextStep,
    repaymentActive,
    repaymentScheduleId,
    hasActiveLoan,
    navigate,
  ]);

  // =======================================================
  // PRIMARY BUTTON LABEL
  // =======================================================

  const buttonText = useMemo(() => {
    if (loanCompleted) {
      return canApplyForNewLoan
        ? "Apply for New Loan"
        : "Loan Completed";
    }

    if (status && !kycComplete) {
      return "Complete KYC";
    }

    if (effectiveNextStep === "BANK" ||
        (
          effectiveNextStep === "LOAN" &&
          kycComplete &&
          !bankComplete
        )) {
      return "Add Bank Account";
    }

    if (hasCurrentApplication) {
      switch (effectiveNextStep) {
        case "OFFER":
          return "View Offer";
        case "MANDATE":
          return "Create Mandate";
        case "REVIEW":
          return "View Application";
        case "REPAYMENT":
          return "View Repayment";
        default:
          return "Continue Application";
      }
    }

    if (repaymentActive) return "View Repayment";
    if (hasActiveLoan) return "View Loan";
    if (!status) return "Start Application";

    switch (effectiveNextStep) {
      case "KYC":
        return "Complete KYC";
      
      case "LOAN":
        return "Apply for a Loan";
      case "OFFER":
        return "View Offer";
      case "MANDATE":
        return "Create Mandate";
      case "REPAYMENT":
        return "View Repayment";
      case "REVIEW":
        return "View Application";
      default:
        return "Continue";
    }
  }, [
    loanCompleted,
    canApplyForNewLoan,
    status,
    kycComplete,
    bankComplete,
    effectiveNextStep,
    hasCurrentApplication,
    repaymentActive,
    hasActiveLoan,
  ]);

  // =======================================================
  // CONTENT
  // =======================================================

  const applicationTitle = loanCompleted
    ? "Loan fully repaid"
    : repaymentActive
      ? "Your loan is in repayment"
      : mandateActive
        ? "Create your repayment mandate"
        : offerActive
          ? normalizeStatus(status?.loanOffer?.status) === "ACCEPTED"
            ? "Your offer has been accepted"
            : "Your offer is waiting for action"
          : reviewActive
            ? "Your application is under review"
            : loanExists
              ? "Your loan application"
              : "Get started with your loan";

  const applicationDescription = loanCompleted
    ? canApplyForNewLoan
      ? "Congratulations! Your previous loan has been fully repaid. You can apply for a new loan."
      : "Your previous loan is fully repaid. Your eligibility must be confirmed before starting another application."
    : repaymentActive
      ? `Your repayment status is ${repaymentStatusLabel || "Active"}. Review your repayment details and outstanding balance.`
      : mandateActive
        ? "Your offer has been accepted. Authorize your repayment mandate to continue."
        : offerActive
          ? normalizeStatus(status?.loanOffer?.status) === "ACCEPTED"
            ? "Your offer has been accepted and your application is progressing to the next stage."
            : "A loan offer is available. Review its terms and follow the instructions to continue."
          : reviewActive
            ? "Your application has been submitted. You can check its status while it is being reviewed."
            : !kycComplete
              ? "Complete all 5 KYC verification steps, including face verification, before continuing."
              : !bankComplete
                ? "Verify your bank account before continuing with your loan application."
                : loanExists
                  ? "Continue to your current application to view its status."
                  : "Complete your verification and banking details before submitting your application.";

  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-slate-50"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />
          <p className="text-sm text-slate-500">
            Loading your dashboard...
          </p>
        </div>
      </div>
    );
  }

  // =======================================================
  // PAGE
  // =======================================================

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {/* ERROR / PARTIAL FAILURE */}

        {error && (
          <section
            className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                size={21}
                className="mt-0.5 shrink-0 text-amber-700"
              />

              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-amber-950">
                  {data.onboarding || data.loans || data.profileResolved
                    ? "Some information is unavailable"
                    : "Dashboard unavailable"}
                </h3>

                <p className="mt-1 text-sm leading-6 text-amber-900">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={retryDashboard}
                  disabled={refreshing}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-950 transition hover:bg-amber-100 disabled:cursor-wait disabled:opacity-60"
                >
                  <RefreshCw
                    size={15}
                    className={refreshing ? "animate-spin" : ""}
                  />
                  {refreshing ? "Refreshing..." : "Try again"}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* WELCOME */}

        <section className="mb-8">
          <p className="text-sm font-medium text-slate-500">
            Welcome back
          </p>

          <h1 className="mt-1 break-words text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Hi{user?.firstName ? `, ${user.firstName}` : " there"}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Manage your verification, loan application, repayments,
            and loans from one place.
          </p>
        </section>

        {/* COMPLETED LOAN BANNER */}

        {loanCompleted && (
          <section className="relative mb-8 overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 p-6 shadow-sm sm:p-7">
            <div className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-emerald-100/70 blur-2xl" />

            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 sm:h-14 sm:w-14">
                  <Sparkles size={26} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-emerald-700">
                    Previous loan completed
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-emerald-950 sm:text-2xl">
                    Congratulations!
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-800">
                    {applicationDescription}
                  </p>
                </div>
              </div>

              {canApplyForNewLoan && (
                <button
                  type="button"
                  onClick={applyForNewLoan}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  Apply for New Loan
                  <ArrowRight size={17} />
                </button>
              )}
            </div>
          </section>
        )}

        {/* FINANCIAL SUMMARY */}

        {!loanCompleted && loanCount > 0 && (
          <section
            className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            aria-label="Loan summary"
          >
            <SummaryCard
              label="Total borrowed"
              value={formatCurrency(totalBorrowed, currency)}
              icon={<WalletCards size={19} />}
            />

            <SummaryCard
              label="Total paid"
              value={formatCurrency(totalPaid, currency)}
              icon={<CheckCircle2 size={19} />}
            />

            <SummaryCard
              label="Outstanding balance"
              value={formatCurrency(totalOutstanding, currency)}
              icon={<Landmark size={19} />}
            />
          </section>
        )}

        {/* PRIMARY CONTENT */}

        <section className="grid items-start gap-6 lg:grid-cols-3">
          {/* APPLICATION CARD */}

          <div
            className={`relative overflow-hidden rounded-3xl p-6 text-white shadow-sm sm:p-7 lg:col-span-2 ${
              loanCompleted
                ? "bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950"
                : "bg-gradient-to-br from-slate-950 via-slate-950 to-slate-800"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p
                  className={
                    loanCompleted
                      ? "text-sm text-emerald-300"
                      : "text-sm text-slate-400"
                  }
                >
                  Loan application
                </p>

                <h2 className="mt-2 text-xl font-bold sm:text-2xl">
                  {loanCompleted && "🎉 "}
                  {applicationTitle}
                </h2>

                {hasCurrentApplication &&
                  currentApplication?.applicationNumber && (
                    <p className="mt-2 break-all text-xs text-slate-400">
                      Application: {currentApplication.applicationNumber}
                    </p>
                  )}
              </div>

              {loanCompleted ? (
                <CheckCircle2
                  size={32}
                  className="shrink-0 text-emerald-300"
                  aria-hidden="true"
                />
              ) : (
                <WalletCards
                  size={31}
                  className="shrink-0 text-slate-400"
                  aria-hidden="true"
                />
              )}
            </div>

            <p
              className={`mt-4 max-w-2xl text-sm leading-6 ${
                loanCompleted
                  ? "text-emerald-100"
                  : "text-slate-300"
              }`}
            >
              {applicationDescription}
            </p>

            <button
              type="button"
              onClick={continueApplication}
              disabled={loanCompleted && !canApplyForNewLoan}
              className={`mt-7 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                loanCompleted
                  ? "bg-emerald-400 text-emerald-950 hover:bg-emerald-300 focus:ring-emerald-400"
                  : "bg-white text-slate-950 hover:bg-slate-100 focus:ring-white"
              }`}
            >
              {buttonText}
              <ArrowRight size={18} />
            </button>
          </div>

          {/* APPLICATION PROGRESS */}

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-base font-bold text-slate-950">
              Application progress
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Track your verification and loan journey.
            </p>

            <div className="mt-6 space-y-5">
              {!kycComplete && (
                <StatusItem
                  icon={<FileCheck2 size={19} />}
                  title="KYC verification"
                  status={kycStepLabel}
                  complete={false}
                />
              )}

              <StatusItem
                icon={<Landmark size={19} />}
                title="Bank account"
                complete={bankComplete}
                status={
                  bankComplete
                    ? "Verified"
                    : status?.bank?.verified
                      ? "Verification complete"
                      : "Pending verification"
                }
              />

              <StatusItem
                icon={<WalletCards size={19} />}
                title={loanCompleted ? "Previous loan" : "Loan application"}
                complete={loanExists && !loanCompleted}
                completed={loanCompleted}
                status={
                  loanCompleted
                    ? "Previous loan completed"
                    : hasCurrentApplication
                      ? formatStatus(currentApplicationStatus) ||
                        "Application in progress"
                      : loanExists
                        ? formatStatus(status?.loan?.status) ||
                          "Application exists"
                        : !kycComplete
                          ? "Complete KYC first"
                          : !bankComplete
                            ? "Verify bank account first"
                            : "Not started"
                }
              />

              {!loanCompleted && (
                <StatusItem
                  icon={<Clock3 size={19} />}
                  title="Application review"
                  complete={offerActive || mandateActive}
                  status={
                    reviewActive
                      ? "Under review"
                      : offerActive || mandateActive
                        ? "Review stage passed"
                        : hasCurrentApplication
                          ? "Application in progress"
                          : "Not started"
                  }
                />
              )}

              {offerActive && (
                <StatusItem
                  icon={<FileCheck2 size={19} />}
                  title="Loan offer"
                  complete={
                    normalizeStatus(status?.loanOffer?.status) ===
                    "ACCEPTED"
                  }
                  status={
                    normalizeStatus(status?.loanOffer?.status) ===
                    "ACCEPTED"
                      ? "Accepted"
                      : "Action required"
                  }
                />
              )}

              {mandateActive && (
                <StatusItem
                  icon={<CheckCircle2 size={19} />}
                  title="Repayment mandate"
                  complete={false}
                  status={
                    formatStatus(status?.mandate?.status) || "Pending"
                  }
                />
              )}

              <StatusItem
                icon={<WalletCards size={19} />}
                title={loanCompleted ? "Loan completed" : "Repayment"}
                complete={loanCompleted || repaymentActive}
                completed={loanCompleted}
                status={
                  loanCompleted
                    ? "Fully repaid"
                    : repaymentStatus
                      ? formatStatus(repaymentStatus)
                      : repaymentActive
                        ? "Active"
                        : "Not started"
                }
                action={
                  canApplyForNewLoan
                    ? {
                        label: "Apply again",
                        onClick: applyForNewLoan,
                      }
                    : undefined
                }
              />
            </div>
          </section>
        </section>

        {/* REPAYMENT DETAILS */}

        {repaymentActive && !loanCompleted && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Repayment status
                </p>

                <h2 className="mt-1 text-lg font-bold text-slate-950">
                  {repaymentStatusLabel}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {repaymentScheduleId
                    ? "Your repayment schedule is available."
                    : "View your loan details to review your repayment information."}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    repaymentScheduleId
                      ? `/loans/repayments/${encodeURIComponent(repaymentScheduleId)}`
                      : "/my-loans",
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
              >
                View repayment
                <ArrowRight size={17} />
              </button>
            </div>
          </section>
        )}

        {/* KYC REMINDER */}

        {!kycComplete && !loanCompleted && (
          <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <Clock3 size={20} />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-blue-950">
                  Complete your KYC
                </h2>

                <p className="mt-1 text-sm leading-6 text-blue-800">
                  Complete all 5 verification steps, including face
                  verification, to continue your loan application.
                </p>

                <button
                  type="button"
                  onClick={handleContinueKyc}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Continue KYC
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ACTIVE LOAN */}

        {activeLoan &&
          !loanCompleted &&
          !hasCurrentApplication && (
            <ActiveLoanCard
              loan={activeLoan}
              onView={() => navigate("/my-loans")}
            />
          )}
      </main>

      {/* KYC APP DOWNLOAD PROMPT */}
      {showKycAppPrompt && (
        <KycAppDownloadPrompt />
      )}
    </div>
  );
}

// =========================================================
// SUMMARY CARD
// =========================================================

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>

        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          {icon}
        </span>
      </div>

      <p className="mt-3 break-words text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
        {value}
      </p>
    </article>
  );
}

// =========================================================
// STATUS ITEM
// =========================================================

function StatusItem({
  icon,
  title,
  status,
  complete = false,
  completed = false,
  action,
}: StatusItemProps) {
  if (completed) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={21} />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-bold text-emerald-950">
                {title}
              </p>

              <p className="mt-0.5 text-xs font-medium text-emerald-700">
                {status}
              </p>
            </div>
          </div>

          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              {action.label}
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          complete
            ? "bg-emerald-100 text-emerald-700"
            : "bg-slate-100 text-slate-500"
        }`}
        aria-hidden="true"
      >
        {complete ? <CheckCircle2 size={19} /> : icon}
      </div>

      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-900">
          {title}
        </p>

        <p className="mt-0.5 break-words text-xs leading-5 text-slate-500">
          {status}
        </p>
      </div>
    </div>
  );
}

// =========================================================
// ACTIVE LOAN CARD
// =========================================================

function ActiveLoanCard({
  loan,
  onView,
}: {
  loan: CustomerLoan;
  onView: () => void;
}) {
  const schedule = getRepaymentSchedule(loan);
  const currency = schedule?.currency ?? "NGN";

  const outstanding = Math.max(
    0,
    safeAmount(
      loan.outstandingAmount ??
        schedule?.amountOutstanding ??
        0,
    ),
  );

  const amountPaid = Math.max(
    0,
    safeAmount(
      loan.amountPaid ??
        schedule?.amountPaid ??
        0,
    ),
  );

  const totalRepayment = Math.max(
    0,
    safeAmount(
      loan.totalRepayment ??
        schedule?.totalRepaymentAmount ??
        0,
    ),
  );

  const progress =
    totalRepayment > 0
      ? Math.min(100, (amountPaid / totalRepayment) * 100)
      : 0;

  const principal = safeAmount(loan.principalAmount);

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-slate-500">Active loan</p>

          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="break-all text-xl font-bold text-slate-950">
              {loan.loanNumber || "Current loan"}
            </h2>

            <LoanStatusBadge status={loan.status} />
          </div>

          <p className="mt-2 text-sm text-slate-500">
            {loan.repaymentFrequency
              ? `${formatStatus(loan.repaymentFrequency)} repayment`
              : "Repayment plan available"}
          </p>
        </div>

        <button
          type="button"
          onClick={onView}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
        >
          View loan
          <ArrowRight size={17} />
        </button>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <LoanMetric
          label="Principal"
          value={formatCurrency(principal, currency)}
        />

        <LoanMetric
          label="Amount paid"
          value={formatCurrency(amountPaid, currency)}
        />

        <LoanMetric
          label="Outstanding"
          value={formatCurrency(outstanding, currency)}
        />
      </div>

      <div className="mt-7">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-slate-600">
            Repayment progress
          </p>

          <p className="text-xs font-semibold tabular-nums text-slate-600">
            {Math.round(progress)}%
          </p>
        </div>

        <div
          className="h-2.5 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-label="Loan repayment progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <div
            className="h-full rounded-full bg-emerald-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {totalRepayment <= 0 && (
          <p className="mt-2 text-xs text-slate-500">
            Repayment progress will appear when the repayment total is available.
          </p>
        )}
      </div>

      {schedule && (
        <div className="mt-6 flex flex-wrap gap-x-3 gap-y-2 text-xs text-slate-500">
          <span>
            {schedule.installments.length} installments
          </span>

          <span aria-hidden="true">•</span>

          <span>
            Final due date: {formatDate(schedule.finalDueDate)}
          </span>
        </div>
      )}
    </section>
  );
}

// =========================================================
// LOAN METRIC
// =========================================================

function LoanMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 break-words text-lg font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

// =========================================================
// LOAN STATUS BADGE
// =========================================================

function LoanStatusBadge({
  status,
}: {
  status?: string | null;
}) {
  const normalized = normalizeStatus(status);

  const isPositive = [
    "ACTIVE",
    "COMPLETED",
    "FULLY_REPAID",
    "REPAID",
  ].includes(normalized);

  const isWarning = [
    "OVERDUE",
    "PENDING",
    "PENDING_DISBURSEMENT",
    "DISBURSING",
    "DEFAULTED",
  ].includes(normalized);

  const className = isPositive
    ? "bg-emerald-100 text-emerald-800"
    : isWarning
      ? "bg-amber-100 text-amber-800"
      : "bg-slate-100 text-slate-700";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      {formatStatus(status) || "Unknown status"}
    </span>
  );
}


import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Landmark,
  WalletCards,
  AlertCircle,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import onboardingApi, {
  type OnboardingStatus,
  type OnboardingStep,
} from "../services/onboarding";
import myLoanApi, {
  type CustomerLoan,
  type LoanDashboard,
  getRepaymentSchedule,
} from "../services/myLoanApi";
import API from "../services/Api";
import Header from "../component/Header";

// =========================================================
// PROFILE API TYPES
// =========================================================

interface DashboardProfile {
  firstName?: string;
  lastName?: string;
  accountStatus?: string;
  borrowerStatus?: string;
  kycStatus?: string;
  isVerified?: boolean;
  kyc?: {
    status?: string;
    completed?: boolean;
    isVerified?: boolean;
  };
}

interface ProfileApplication {
  _id?: string;
  status?: string;
}

interface ProfileOffer {
  status?: string;
  loanApplication?: {
    _id?: string;
  };
}

interface DashboardProfilePayload {
  profile?: DashboardProfile;
  loanSummary?: {
    totalApplications?: number;
    totalOffers?: number;
    pendingOffers?: number;
    applicationStatus?: string;
    offerStatus?: string;
    activeApplication?: ProfileApplication | null;
  };
  offers?: ProfileOffer[];
}

interface DashboardProfileResponse {
  success?: boolean;
  data?: DashboardProfilePayload;
  profile?: DashboardProfile;
  loanSummary?: DashboardProfilePayload["loanSummary"];
  offers?: ProfileOffer[];
}

// =========================================================
// STATUS HELPERS
// =========================================================

function normalizeStatus(value?: string | null): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function formatStatus(value?: string | null): string {
  if (!value) return "";

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isOneOf(
  value: string | null | undefined,
  statuses: string[],
): boolean {
  return statuses.includes(normalizeStatus(value));
}

function isCompletedLoan(loan?: CustomerLoan | null): boolean {
  return isOneOf(loan?.status, [
    "completed",
    "fully_repaid",
    "repaid",
    "closed",
    "settled",
  ]);
}

function isKycStatusComplete(value?: string | null): boolean {
  return isOneOf(value, ["completed", "complete", "approved", "verified"]);
}

function isKycStatusSubmitted(value?: string | null): boolean {
  return isOneOf(value, [
    "submitted",
    "pending",
    "under_review",
    "in_review",
    "processing",
  ]);
}

function isTerminalApplication(value?: string | null): boolean {
  return isOneOf(value, [
    "completed",
    "cancelled",
    "canceled",
    "rejected",
    "declined",
    "withdrawn",
  ]);
}

function formatCurrency(
  amount: number | null | undefined,
  currency?: string,
): string {
  const code = currency || "NGN";
  const value = Number(amount ?? 0);

  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(Number.isFinite(value) ? value : 0);
  } catch {
    return `${code} ${
      (Number.isFinite(value) ? value : 0).toLocaleString("en-NG")
    }`;
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

function getProfilePayload(
  response: unknown,
): DashboardProfilePayload | null {
  const result = response as Record<string, any> | null;

  if (!result || typeof result !== "object") return null;

  let payload = result.data ?? result;

  if (payload?.data?.profile) {
    payload = payload.data;
  }

  if (!payload?.profile) return null;

  return payload as DashboardProfilePayload;
}

// =========================================================
// APPLICATION STATUS CONSTANTS
// =========================================================

const REVIEW_STATUSES = [
  "submitted",
  "under_review",
  "in_review",
  "pending_review",
  "credit_check",
  "processing",
  "review",
];

const OFFER_STATUSES = [
  "approved",
  "offer_created",
  "offer_pending",
  "pending_offer",
  "offer_sent",
  "accepted",
];

const MANDATE_STATUSES = [
  "mandate_required",
  "mandate_pending",
  "pending_mandate",
  "mandate_created",
];

// =========================================================
// COMPONENT
// =========================================================

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loanDashboard, setLoanDashboard] = useState<LoanDashboard | null>(
    null,
  );
  const [profileData, setProfileData] =
    useState<DashboardProfilePayload | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestInProgress = useRef(false);
  const refreshQueued = useRef(false);
  const mountedRef = useRef(false);

  // =========================================================
  // LOAD AND REFRESH DASHBOARD
  // =========================================================

  const loadDashboard = useCallback(async (showLoading = false) => {
    if (requestInProgress.current) {
      refreshQueued.current = true;
      return;
    }

    requestInProgress.current = true;

    if (showLoading) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError(null);

    try {
      let shouldRefreshAgain = true;

      while (shouldRefreshAgain && mountedRef.current) {
        refreshQueued.current = false;

        const [onboardingResult, loanResult, profileResult] =
          await Promise.allSettled([
            onboardingApi.getStatus(),
            myLoanApi.getLoanDashboard(),
            API.get<DashboardProfileResponse>("/users/me/profile"),
          ]);

        if (!mountedRef.current) return;

        let successfulRequests = 0;

        if (onboardingResult.status === "fulfilled") {
          setStatus(onboardingResult.value);
          successfulRequests++;
        } else {
          console.error(
            "Failed to load onboarding status:",
            onboardingResult.reason,
          );
        }

        if (loanResult.status === "fulfilled") {
          setLoanDashboard(loanResult.value);
          successfulRequests++;
        } else {
          console.error("Failed to load loan dashboard:", loanResult.reason);
        }

        if (profileResult.status === "fulfilled") {
          const payload = getProfilePayload(profileResult.value);

          if (payload) {
            setProfileData(payload);
            successfulRequests++;
          } else {
            console.error(
              "Profile API returned an unexpected response:",
              profileResult.value,
            );
          }
        } else {
          console.error("Failed to load user profile:", profileResult.reason);
        }

        if (successfulRequests === 0) {
          setError("Unable to load your dashboard. Please try again.");
        }

        shouldRefreshAgain = refreshQueued.current;
      }
    } catch (err) {
      if (mountedRef.current) {
        console.error("Dashboard refresh failed:", err);
        setError("Unable to refresh your dashboard. Please try again.");
      }
    } finally {
      requestInProgress.current = false;

      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    void loadDashboard(true);

    const handleFocus = () => void loadDashboard();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadDashboard();
      }
    };

    const handleKycUpdated = () => void loadDashboard();

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("kyc-updated", handleKycUpdated);

    return () => {
      mountedRef.current = false;

      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("kyc-updated", handleKycUpdated);
    };
  }, [loadDashboard]);

  // =========================================================
  // PROFILE AND APPLICATION DATA
  // =========================================================

  const profile = profileData?.profile ?? null;
  const profileApplication =
    profileData?.loanSummary?.activeApplication ?? null;

  const profileApplicationStatus = normalizeStatus(
    profileApplication?.status ||
      profileData?.loanSummary?.applicationStatus,
  );

  const onboardingApplicationStatus = normalizeStatus(
    status?.loan?.applicationStatus,
  );

  const onboardingLoanStatus = normalizeStatus(status?.loan?.status);

  const applicationId =
    profileApplication?._id || status?.loan?.applicationId || undefined;

  const effectiveApplicationStatus =
    onboardingApplicationStatus ||
    profileApplicationStatus ||
    onboardingLoanStatus;

  const profileOffer = useMemo(() => {
    const offers = profileData?.offers ?? [];

    if (profileApplication?._id) {
      const matchingOffer = offers.find(
        (offer) => offer.loanApplication?._id === profileApplication._id,
      );

      if (matchingOffer) return matchingOffer;
    }

    return offers.find((offer) =>
      OFFER_STATUSES.includes(normalizeStatus(offer.status)),
    );
  }, [profileData?.offers, profileApplication?._id]);

  const profileOfferStatus = normalizeStatus(
    profileOffer?.status || profileData?.loanSummary?.offerStatus,
  );

  // =========================================================
  // KYC AND BANK
  // =========================================================

  const profileKycStatus = normalizeStatus(
    profile?.kycStatus || profile?.kyc?.status,
  );

  const onboardingKycStatus = normalizeStatus(status?.kyc?.status);

  const profileKycComplete =
    isKycStatusComplete(profileKycStatus) ||
    profile?.kyc?.completed === true ||
    profile?.kyc?.isVerified === true ||
    profile?.isVerified === true;

  const onboardingKycComplete =
    status !== null && onboardingApi.isKycComplete(status);

  const kycComplete = profileKycComplete || onboardingKycComplete;

  const kycStatus = kycComplete
    ? "verified"
    : profileKycStatus || onboardingKycStatus;

  const kycSubmitted = isKycStatusSubmitted(kycStatus);
  const kycRejected = !kycComplete && kycStatus === "rejected";

  // Verified KYC automatically marks the bank step complete.
  const bankComplete = kycComplete;

  // Prevent a stale backend BANK nextStep from blocking a verified user.
  const effectiveNextStep: OnboardingStep | undefined =
    kycComplete && status?.nextStep === "BANK"
      ? "LOAN"
      : status?.nextStep;

  const kycStepLabel = kycComplete
    ? "Verified"
    : kycRejected
      ? "Rejected"
      : kycSubmitted
        ? "Submitted / under review"
        : kycStatus === "pending"
          ? "In progress"
          : "Not started";

  // =========================================================
  // LOAN DATA
  // =========================================================

  const loans = loanDashboard?.loans ?? [];

  const activeLoans = useMemo(
    () =>
      (loanDashboard?.activeLoans ?? []).filter(
        (loan) => !isCompletedLoan(loan),
      ),
    [loanDashboard],
  );

  const dashboardActiveLoan = loanDashboard?.activeLoan ?? null;

  const activeLoan =
    dashboardActiveLoan && !isCompletedLoan(dashboardActiveLoan)
      ? dashboardActiveLoan
      : (activeLoans[0] ?? null);

  const loanCount = loans.length;
  const hasActiveLoan = Boolean(activeLoan);
  const repaymentSchedule = getRepaymentSchedule(activeLoan);

  // =========================================================
  // COMPLETED LOAN
  // =========================================================

  const completedLoanFromStatus =
    status?.loan?.completed === true ||
    isOneOf(status?.loan?.completedLoanStatus, [
      "completed",
      "fully_repaid",
      "repaid",
      "closed",
      "settled",
    ]);

  const completedLoanFromLoans = loans.some(isCompletedLoan);

  const completedLoanFromDashboard = Boolean(
    dashboardActiveLoan && isCompletedLoan(dashboardActiveLoan),
  );

  const hasCurrentApplication = Boolean(
    (status?.loan?.exists &&
      !isTerminalApplication(effectiveApplicationStatus)) ||
      (profileApplication &&
        !isTerminalApplication(profileApplication.status)),
  );

  const loanCompleted =
    !hasCurrentApplication &&
    (completedLoanFromStatus ||
      completedLoanFromLoans ||
      completedLoanFromDashboard);

  const canApplyForNewLoan =
    status?.canApplyForNewLoan === true ||
    status?.loan?.canApplyForNewLoan === true;

  // =========================================================
  // APPLICATION STAGES
  // =========================================================

  const loanExists =
    status?.loan?.exists === true ||
    loanCount > 0 ||
    Boolean(profileApplication) ||
    Boolean(status?.loan?.applicationId) ||
    (profileData?.loanSummary?.totalApplications ?? 0) > 0;

  const reviewActive =
    !loanCompleted &&
    (REVIEW_STATUSES.includes(profileApplicationStatus) ||
      REVIEW_STATUSES.includes(onboardingApplicationStatus) ||
      REVIEW_STATUSES.includes(onboardingLoanStatus) ||
      effectiveNextStep === "REVIEW");

  const offerActive =
    !loanCompleted &&
    (OFFER_STATUSES.includes(profileApplicationStatus) ||
      OFFER_STATUSES.includes(onboardingApplicationStatus) ||
      OFFER_STATUSES.includes(profileOfferStatus) ||
      effectiveNextStep === "OFFER" ||
      status?.loanOffer?.exists === true);

  const mandateStatus = normalizeStatus(status?.mandate?.status);

  const mandateActive =
    !loanCompleted &&
    (effectiveNextStep === "MANDATE" ||
      status?.mandate?.exists === true ||
      MANDATE_STATUSES.includes(profileApplicationStatus) ||
      MANDATE_STATUSES.includes(onboardingApplicationStatus) ||
      MANDATE_STATUSES.includes(profileOfferStatus) ||
      MANDATE_STATUSES.includes(mandateStatus));

  const repaymentStatus = status?.repayment?.status ?? null;

  const repaymentScheduleId =
    status?.repayment?.repaymentScheduleId ?? null;

  const repaymentActive =
    !loanCompleted &&
    (effectiveNextStep === "REPAYMENT" ||
      status?.repayment?.exists === true ||
      hasActiveLoan);

  const displayedApplicationStatus =
    effectiveApplicationStatus ||
    normalizeStatus(status?.currentStatus) ||
    "";

  const repaymentStatusLabel = repaymentStatus
    ? formatStatus(repaymentStatus)
    : hasActiveLoan
      ? formatStatus(activeLoan?.status)
      : "Not started";

  // =========================================================
  // SUMMARY
  // =========================================================

  const summary = loanDashboard?.summary;

  const totalBorrowed =
    summary?.totalBorrowed ?? summary?.totalPrincipal ?? 0;

  const totalPaid = summary?.totalPaid ?? 0;

  const totalOutstanding =
    summary?.totalOutstanding ?? activeLoan?.outstandingAmount ?? 0;

  const currency = repaymentSchedule?.currency ?? "NGN";

  // =========================================================
  // BUTTON TEXT
  // =========================================================

  const buttonText = useMemo(() => {
    if (loanCompleted && canApplyForNewLoan) {
      return "Apply for New Loan";
    }

    if (!kycComplete) return "Complete KYC";

    if (repaymentActive) return "View Repayment";
    if (hasActiveLoan) return "View Loan";
    if (mandateActive) return "Create Mandate";
    if (offerActive) return "View Offer";
    if (reviewActive) return "View Application";

    // A verified user never needs to complete a separate bank step.
    if (!status && !profile) return "Start Application";

    switch (effectiveNextStep) {
      case "KYC":
        return "Complete KYC";
      case "BANK":
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
        return loanExists ? "View Application" : "Apply for a Loan";
    }
  }, [
    loanCompleted,
    canApplyForNewLoan,
    kycComplete,
    repaymentActive,
    hasActiveLoan,
    mandateActive,
    offerActive,
    reviewActive,
    effectiveNextStep,
    status,
    profile,
    loanExists,
  ]);

  // =========================================================
  // NAVIGATION
  // =========================================================

  const applyForNewLoan = () => {
    if (!canApplyForNewLoan) return;

    navigate("/loans");
  };

  const continueApplication = () => {
    if (loanCompleted) {
      if (canApplyForNewLoan) {
        applyForNewLoan();
      }
      return;
    }

    if (!kycComplete) {
      navigate("/kyc");
      return;
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

    if (mandateActive) {
      const offerId =
        status?.mandate?.offerId || status?.loanOffer?.offerId;

      navigate(
        offerId
          ? `/loan-offers/${encodeURIComponent(offerId)}`
          : "/loan-offers",
      );
      return;
    }

    if (offerActive) {
      navigate("/loan-offers");
      return;
    }

    if (reviewActive || loanExists) {
      navigate(
        applicationId
          ? `/loans/applications/${encodeURIComponent(applicationId)}`
          : "/loans/applications",
      );
      return;
    }

    if (!status && !profile) {
      navigate("/kyc");
      return;
    }

    // Verified KYC means bank is complete: skip BANK.
    if (effectiveNextStep === "BANK" || effectiveNextStep === "LOAN") {
      navigate("/loans");
      return;
    }

    switch (effectiveNextStep) {
      case "KYC":
        navigate("/kyc");
        break;
      case "OFFER":
        navigate("/loan-offers");
        break;
      case "MANDATE": {
        const offerId =
          status?.loanOffer?.offerId || status?.mandate?.offerId;

        navigate(
          offerId
            ? `/loan-offers/${encodeURIComponent(offerId)}`
            : "/loan-offers",
        );
        break;
      }
      case "REPAYMENT":
        navigate(
          repaymentScheduleId
            ? `/loans/repayments/${encodeURIComponent(repaymentScheduleId)}`
            : "/my-loans",
        );
        break;
      case "REVIEW":
        navigate(
          applicationId
            ? `/loans/applications/${encodeURIComponent(applicationId)}`
            : "/loans/applications",
        );
        break;
      default:
        navigate("/loans");
    }
  };

  // =========================================================
  // APPLICATION TITLE AND DESCRIPTION
  // =========================================================

  const applicationTitle = loanCompleted
    ? "🎉 Loan fully repaid"
    : repaymentActive
      ? "Your loan is in repayment"
      : mandateActive
        ? "Create your repayment mandate"
        : offerActive
          ? profileOfferStatus === "accepted" ||
            effectiveApplicationStatus === "accepted"
            ? "Your offer has been accepted"
            : "Your offer is waiting for action"
          : reviewActive
            ? "Your application is under review"
            : loanExists
              ? `Application ${
                  formatStatus(displayedApplicationStatus) || "In Progress"
                }`
              : "Get started with your loan";

  const applicationDescription = loanCompleted
    ? canApplyForNewLoan
      ? "Your previous loan has been completed. You can now apply for a new loan."
      : "Your previous loan is completed. Check your account eligibility before applying again."
    : repaymentActive
      ? `Your repayment status is ${
          repaymentStatusLabel || "Active"
        }. Review your repayment details and outstanding balance.`
      : mandateActive
        ? "Your application has reached the mandate stage. Continue to review and authorize your repayment mandate."
        : offerActive
          ? profileOfferStatus === "accepted" ||
            effectiveApplicationStatus === "accepted"
            ? "Your offer has been accepted. Review your offer details and follow the next steps."
            : "Your loan offer or approval is being processed. Open your offers to review the details and next action."
          : reviewActive
            ? "Your application is being reviewed. Open your application to check its latest status."
            : !kycComplete
              ? "Complete your KYC verification before continuing with your loan application."
              : loanExists
                ? "Your application exists. Open it to view its current status and next steps."
                : "Your KYC is verified. Continue to the loan application.";

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950"
          aria-label="Loading"
        />
      </div>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="mx-auto max-w-7xl px-6 py-10">
        {error && (
          <section className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="mt-0.5 text-red-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900">
                  Dashboard update failed
                </h3>
                <p className="mt-1 text-sm text-red-800">{error}</p>
                <button
                  type="button"
                  onClick={() => void loadDashboard()}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800"
                >
                  <RefreshCw size={15} />
                  Try again
                </button>
              </div>
            </div>
          </section>
        )}

        <section className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Welcome back</p>
            <h2 className="mt-1 text-3xl font-bold text-slate-950">
              Hi, {profile?.firstName || user?.firstName || "there"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Manage your verification, loan application, repayments, and loans
              from your dashboard.
            </p>
          </div>

          <button
            type="button"
            disabled={refreshing}
            onClick={() => void loadDashboard()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "Refreshing..." : "Refresh status"}
          </button>
        </section>

        {loanCompleted && (
          <section className="relative mb-8 overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 p-7 shadow-sm">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-100/60 blur-2xl" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <Sparkles size={27} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-600">
                    Loan completed
                  </p>
                  <h3 className="mt-1 text-2xl font-bold text-emerald-950">
                    Congratulations! 🎉
                  </h3>
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

        <section className="grid gap-6 lg:grid-cols-3">
          <div
            className={`rounded-3xl p-7 text-white lg:col-span-2 ${
              loanCompleted
                ? "bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950"
                : "bg-slate-950"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p
                  className={
                    loanCompleted
                      ? "text-sm text-emerald-300"
                      : "text-sm text-slate-400"
                  }
                >
                  Loan application
                </p>
                <h3 className="mt-2 text-2xl font-bold">{applicationTitle}</h3>
              </div>
              {loanCompleted ? (
                <CheckCircle2
                  size={34}
                  className="shrink-0 text-emerald-300"
                />
              ) : (
                <WalletCards
                  size={32}
                  className="shrink-0 text-slate-400"
                />
              )}
            </div>

            <p
              className={`mt-4 max-w-xl text-sm leading-6 ${
                loanCompleted ? "text-emerald-100" : "text-slate-400"
              }`}
            >
              {applicationDescription}
            </p>

            <button
              type="button"
              onClick={continueApplication}
              disabled={loanCompleted && !canApplyForNewLoan}
              className={`mt-7 inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                loanCompleted
                  ? "bg-emerald-400 text-emerald-950 hover:bg-emerald-300 focus:ring-emerald-400"
                  : "bg-white text-slate-950 hover:bg-slate-100 focus:ring-white"
              }`}
            >
              {buttonText}
              <ArrowRight size={18} />
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-7">
            <h3 className="font-bold text-slate-950">Application progress</h3>

            <div className="mt-6 space-y-5">
              <StatusItem
                icon={<FileCheck2 size={19} />}
                title="KYC"
                complete={kycComplete}
                status={kycStepLabel}
              />

              <StatusItem
                icon={<Landmark size={19} />}
                title="Bank account"
                complete={bankComplete}
                status={bankComplete ? "Completed with KYC" : "Pending"}
              />

              <StatusItem
                icon={<WalletCards size={19} />}
                title={loanCompleted ? "Previous loan" : "Loan application"}
                complete={loanCompleted || loanExists}
                status={
                  loanCompleted
                    ? "Completed"
                    : displayedApplicationStatus
                      ? formatStatus(displayedApplicationStatus)
                      : loanExists
                        ? "Application exists"
                        : !kycComplete
                          ? "Complete KYC first"
                          : "Ready to apply"
                }
              />

              {!loanCompleted && (
                <StatusItem
                  icon={<Clock3 size={19} />}
                  title="Review"
                  complete={reviewActive || hasActiveLoan}
                  status={
                    hasActiveLoan
                      ? "Loan active"
                      : reviewActive
                        ? "In progress"
                        : loanExists
                          ? "Application received"
                          : "Not started"
                  }
                />
              )}

              <StatusItem
                icon={<WalletCards size={19} />}
                title={loanCompleted ? "Loan completed" : "Repayment"}
                complete={loanCompleted || repaymentActive}
                status={
                  loanCompleted
                    ? "Fully repaid"
                    : repaymentStatus
                      ? formatStatus(repaymentStatus)
                      : repaymentActive
                        ? "Active"
                        : "Not started"
                }
                completed={loanCompleted}
                action={
                  loanCompleted && canApplyForNewLoan
                    ? {
                        label: "Apply for New Loan",
                        onClick: applyForNewLoan,
                      }
                    : undefined
                }
              />
            </div>
          </div>
        </section>

        {!loanCompleted && loanCount > 0 && (
          <section className="mb-8 mt-6 grid gap-4 sm:grid-cols-3">
            <SummaryCard
              label="Total borrowed"
              value={formatCurrency(totalBorrowed, currency)}
            />
            <SummaryCard
              label="Total paid"
              value={formatCurrency(totalPaid, currency)}
            />
            <SummaryCard
              label="Outstanding"
              value={formatCurrency(totalOutstanding, currency)}
            />
          </section>
        )}

        {!kycComplete && !loanCompleted && (
          <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <div className="flex items-start gap-3">
              <Clock3 size={20} className="mt-0.5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-blue-900">
                  {kycRejected
                    ? "KYC verification rejected"
                    : "Complete your KYC"}
                </h3>
                <p className="mt-1 text-sm leading-6 text-blue-800">
                  {kycRejected
                    ? "Your KYC verification was rejected. Open KYC to review the issue and follow the next steps."
                    : "Complete your KYC verification before continuing with your loan application."}
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/kyc")}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Continue KYC
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </section>
        )}

        {activeLoan && !loanCompleted && (
          <ActiveLoanCard
            loan={activeLoan}
            onView={() => navigate("/my-loans")}
          />
        )}
      </main>
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
  const currency = schedule?.currency;

  const outstanding =
    loan.outstandingAmount ?? schedule?.amountOutstanding ?? 0;

  const amountPaid = loan.amountPaid ?? schedule?.amountPaid ?? 0;

  const totalRepayment =
    loan.totalRepayment ?? schedule?.totalRepaymentAmount ?? 0;

  const progress =
    totalRepayment > 0
      ? Math.min(100, Math.max(0, (amountPaid / totalRepayment) * 100))
      : 0;

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-slate-500">Active loan</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-bold text-slate-950">
              {loan.loanNumber || "Current loan"}
            </h3>
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
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          View loan
          <ArrowRight size={17} />
        </button>
      </div>

      <div className="mt-7 grid gap-5 sm:grid-cols-3">
        <LoanMetric
          label="Principal"
          value={formatCurrency(loan.principalAmount, currency)}
        />
        <LoanMetric label="Paid" value={formatCurrency(amountPaid, currency)} />
        <LoanMetric
          label="Outstanding"
          value={formatCurrency(outstanding, currency)}
        />
      </div>

      <div className="mt-7">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-600">
            Repayment progress
          </p>
          <p className="text-xs font-semibold text-slate-500">
            {Math.round(progress)}%
          </p>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-slate-950 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {schedule && (
        <div className="mt-6 flex flex-wrap gap-3 text-xs text-slate-500">
          <span>{schedule.installments.length} installments</span>
          <span>•</span>
          <span>Due {formatDate(schedule.finalDueDate)}</span>
        </div>
      )}
    </section>
  );
}

// =========================================================
// SUMMARY CARD
// =========================================================

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

// =========================================================
// STATUS ITEM
// =========================================================

function StatusItem({
  icon,
  title,
  complete,
  status,
  completed = false,
  action,
}: {
  icon: ReactNode;
  title: string;
  complete: boolean;
  status: string;
  completed?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}) {
  if (completed) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 p-4 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 size={21} />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-950">{title}</p>
              <p className="mt-0.5 text-xs font-medium text-emerald-700">
                {status}
              </p>
            </div>
          </div>

          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              {action.label}
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full ${
          complete
            ? "bg-green-100 text-green-700"
            : "bg-slate-100 text-slate-400"
        }`}
      >
        {complete ? <CheckCircle2 size={19} /> : icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{status}</p>
      </div>
    </div>
  );
}

// =========================================================
// LOAN METRIC
// =========================================================

function LoanMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-950">{value}</p>
    </div>
  );
}

// =========================================================
// LOAN STATUS BADGE
// =========================================================

function LoanStatusBadge({ status }: { status: string }) {
  const normalized = normalizeStatus(status);

  const isPositive = ["active", "disbursed", "repaying"].includes(normalized);

  const isWarning = [
    "overdue",
    "pending_disbursement",
    "disbursing",
  ].includes(normalized);

  const className = isPositive
    ? "bg-green-100 text-green-700"
    : isWarning
      ? "bg-amber-100 text-amber-700"
      : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      {formatStatus(status) || "Unknown"}
    </span>
  );
}

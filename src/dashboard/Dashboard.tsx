import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Landmark,
  WalletCards,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import onboardingApi, { type OnboardingStatus } from "../services/onboarding";
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

interface DashboardProfileResponse {
  success?: boolean;
  data?: {
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
  };
}

// =========================================================
// STATUS HELPERS
// =========================================================

function normalizeStatus(value?: string | null): string {
  return (
    value
      ?.trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_") ?? ""
  );
}

function isCompletedLoan(loan?: CustomerLoan | null): boolean {
  if (!loan) {
    return false;
  }

  return ["completed", "fully_repaid", "repaid", "closed", "settled"].includes(
    normalizeStatus(loan.status),
  );
}

function isKycStatusComplete(value?: string | null): boolean {
  return ["completed", "complete", "approved", "verified"].includes(
    normalizeStatus(value),
  );
}

function isKycStatusSubmitted(value?: string | null): boolean {
  return [
    "submitted",
    "pending",
    "under_review",
    "in_review",
    "processing",
  ].includes(normalizeStatus(value));
}

function formatStatus(value?: string | null): string {
  if (!value) {
    return "";
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCurrency(amount: number, currency?: string): string {
  const code = currency || "NGN";

  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  } catch {
    return `${code} ${(amount || 0).toLocaleString("en-NG")}`;
  }
}

function formatDate(value?: string | null): string {
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
}

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

  const [profileData, setProfileData] = useState<
    DashboardProfileResponse["data"] | null
  >(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  // =========================================================
  // LOAD DASHBOARD, ONBOARDING AND PROFILE DATA
  // =========================================================

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      setLoading(true);
      setError(null);

      const [onboardingResult, loanResult, profileResult] =
        await Promise.allSettled([
          onboardingApi.getStatus(),
          myLoanApi.getLoanDashboard(),
          API.get<DashboardProfileResponse>("/users/me/profile"),
        ]);

      if (!mounted) {
        return;
      }

      let successfulRequests = 0;

      // -----------------------------------------------------
      // ONBOARDING STATUS
      // -----------------------------------------------------

      if (onboardingResult.status === "fulfilled") {
        setStatus(onboardingResult.value);
        successfulRequests += 1;
      } else {
        console.error(
          "Failed to load onboarding status:",
          onboardingResult.reason,
        );
      }

      // -----------------------------------------------------
      // LOAN DASHBOARD
      // -----------------------------------------------------

      if (loanResult.status === "fulfilled") {
        setLoanDashboard(loanResult.value);
        successfulRequests += 1;
      } else {
        console.error("Failed to load loan dashboard:", loanResult.reason);
      }

      // -----------------------------------------------------
      // PROFILE
      // -----------------------------------------------------

      if (profileResult.status === "fulfilled") {
        const response = profileResult.value as any;

        // Support both an Axios response and an unwrapped API response.
        const payload = response?.data ?? response;

        // Some APIs wrap the payload one additional level.
        const profilePayload = payload?.data?.profile ? payload.data : payload;

        if (profilePayload?.profile) {
          setProfileData(profilePayload);
          successfulRequests += 1;
        } else {
          console.error(
            "Profile response did not contain a profile:",
            response,
          );
        }
      } else {
        console.error("Failed to load user profile:", profileResult.reason);
      }

      // -----------------------------------------------------
      // SHOW ERROR ONLY IF ALL REQUESTS FAILED
      // -----------------------------------------------------

      if (successfulRequests === 0) {
        setError("Unable to load your dashboard. Please try again.");
      }

      setLoading(false);
    }

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  // =========================================================
  // PROFILE STATUS
  // =========================================================

  const profile = profileData?.profile ?? null;

  const profileApplication =
    profileData?.loanSummary?.activeApplication ?? null;

  const profileApplicationStatus = normalizeStatus(
    profileApplication?.status || profileData?.loanSummary?.applicationStatus,
  );

  const profileOffer = useMemo(() => {
    const offers = profileData?.offers ?? [];
    const applicationId = profileApplication?._id;

    if (!applicationId) {
      return undefined;
    }

    return offers.find((offer) => offer.loanApplication?._id === applicationId);
  }, [profileData?.offers, profileApplication?._id]);

  const profileOfferStatus = normalizeStatus(
    profileOffer?.status || profileData?.loanSummary?.offerStatus,
  );

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
  //
  // Do not infer a completed loan from an accepted offer,
  // approved application, or profile borrower status.
  // A completed loan must be confirmed by loan/onboarding
  // data that explicitly identifies completion.
  // =========================================================

  // =========================================================
  // COMPLETED LOAN
  // =========================================================

  const completedLoanFromStatus =
    status?.loan?.completed === true ||
    normalizeStatus(status?.loan?.completedLoanStatus) === "completed";

  const completedLoanFromLoans = loans.some(isCompletedLoan);

  const completedLoanFromDashboard = Boolean(
    loanDashboard?.activeLoan && isCompletedLoan(loanDashboard.activeLoan),
  );

  const hasNewApplicationInProgress = Boolean(
    profileApplication &&
    !["completed", "cancelled", "rejected", "declined"].includes(
      normalizeStatus(profileApplication.status),
    ),
  );

  const loanCompleted =
    !hasNewApplicationInProgress &&
    (completedLoanFromStatus ||
      completedLoanFromLoans ||
      completedLoanFromDashboard);

  const canApplyForNewLoan = loanCompleted;

  // =========================================================
  // KYC
  // =========================================================

  const profileKycStatus = normalizeStatus(profile?.kycStatus);
  const onboardingKycStatus = normalizeStatus(status?.kyc?.status);

  // Treat either API's explicit verified status as complete.
  const profileKycComplete = isKycStatusComplete(profileKycStatus);
  const onboardingKycComplete =
    status !== null && onboardingApi.isKycComplete(status);

  const kycComplete = profileKycComplete || onboardingKycComplete;

  // Prefer a verified result over a stale pending result.
  const kycStatus = kycComplete
    ? "verified"
    : profileKycStatus || onboardingKycStatus;

  const kycSubmitted =
    kycStatus === "submitted" || isKycStatusSubmitted(kycStatus);

  const kycRejected = !kycComplete && kycStatus === "rejected";

  // =========================================================
  // BANK
  // =========================================================

  const bankComplete =
    status?.bank?.completed === true && status?.bank?.verified === true;

  // =========================================================
  // APPLICATION STATE
  // =========================================================

  const loanExists =
    status?.loan?.exists === true ||
    loanCount > 0 ||
    Boolean(profileApplication) ||
    (profileData?.loanSummary?.totalApplications ?? 0) > 0 ||
    loanCompleted;

  const reviewStatuses = [
    "submitted",
    "under_review",
    "in_review",
    "pending_review",
    "credit_check",
    "processing",
    "review",
  ];

  const offerStatuses = [
    "approved",
    "offer_created",
    "offer_pending",
    "pending_offer",
    "offer_sent",
    "accepted",
  ];

  const mandateStatuses = [
    "mandate_required",
    "mandate_pending",
    "pending_mandate",
    "mandate_created",
  ];

  const reviewActive =
    !loanCompleted &&
    (reviewStatuses.includes(profileApplicationStatus) ||
      status?.nextStep === "REVIEW");

  const offerActive =
    !loanCompleted &&
    (offerStatuses.includes(profileApplicationStatus) ||
      offerStatuses.includes(profileOfferStatus) ||
      status?.nextStep === "OFFER");

  /*
   * An accepted offer by itself does not prove that the
   * user has reached the mandate stage. Use an explicit
   * mandate state from the API.
   */
  const mandateActive =
    !loanCompleted &&
    (status?.nextStep === "MANDATE" ||
      mandateStatuses.includes(profileApplicationStatus) ||
      mandateStatuses.includes(profileOfferStatus));

  const repaymentStatus = status?.repayment?.status ?? null;

  const repaymentScheduleId = status?.repayment?.repaymentScheduleId ?? null;

  const repaymentActive =
    !loanCompleted &&
    (status?.nextStep === "REPAYMENT" ||
      status?.repayment?.exists === true ||
      hasActiveLoan);

  // =========================================================
  // KYC STEP DISPLAY
  // =========================================================

  const kycStepLabel = kycComplete
    ? "All 5 steps completed"
    : kycRejected
      ? "Rejected"
      : kycSubmitted
        ? "Submitted / under review"
        : kycStatus === "pending"
          ? "In progress"
          : "Not started";

  // =========================================================
  // REPAYMENT STATUS
  // =========================================================

  const repaymentStatusLabel = repaymentStatus
    ? formatStatus(repaymentStatus)
    : hasActiveLoan
      ? formatStatus(activeLoan?.status)
      : "Not started";

  // =========================================================
  // SUMMARY
  // =========================================================

  const summary = loanDashboard?.summary;

  const totalBorrowed = summary?.totalBorrowed ?? summary?.totalPrincipal ?? 0;

  const totalPaid = summary?.totalPaid ?? 0;

  const totalOutstanding =
    summary?.totalOutstanding ?? activeLoan?.outstandingAmount ?? 0;

  const currency = repaymentSchedule?.currency ?? "NGN";

  // =========================================================
  // BUTTON TEXT
  // =========================================================

  const buttonText = useMemo(() => {
    if (loanCompleted) {
      return "Apply for New Loan";
    }

    if (!kycComplete) {
      return "Complete KYC";
    }

    if (repaymentActive) {
      return "View Repayment";
    }

    if (hasActiveLoan) {
      return "View Loan";
    }

    if (mandateActive) {
      return "Create Mandate";
    }

    if (offerActive) {
      return "View Offer";
    }

    if (reviewActive) {
      return "View Application";
    }

    if (!status && !profile) {
      return "Start Application";
    }

    if (!bankComplete) {
      return "Add Bank Account";
    }

    switch (status?.nextStep) {
      case "KYC":
        return "Complete KYC";

      case "BANK":
        return "Add Bank Account";

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
    kycComplete,
    repaymentActive,
    hasActiveLoan,
    mandateActive,
    offerActive,
    reviewActive,
    status,
    profile,
    bankComplete,
    loanExists,
  ]);

  // =========================================================
  // APPLY FOR NEW LOAN
  // =========================================================

  const applyForNewLoan = () => {
    if (!loanCompleted) {
      return;
    }

    navigate("/loans", {
      replace: true,
    });
  };

  // =========================================================
  // CONTINUE APPLICATION
  // =========================================================

  const continueApplication = () => {
    // A completed loan takes priority over stale nextStep data.
    if (loanCompleted) {
      applyForNewLoan();
      return;
    }

    // KYC must be completed before proceeding.
    if (!kycComplete) {
      navigate("/kyc", {
        replace: true,
      });
      return;
    }

    // Repayment takes priority over application status.
    if (repaymentActive) {
      if (repaymentScheduleId) {
        navigate(
          `/loans/repayments/${encodeURIComponent(repaymentScheduleId)}`,
          { replace: true },
        );
      } else {
        navigate("/my-loans", {
          replace: true,
        });
      }

      return;
    }

    if (hasActiveLoan) {
      navigate("/my-loans", {
        replace: true,
      });
      return;
    }

    // Profile-backed application review.
    if (reviewActive) {
      if (profileApplication?._id) {
        navigate(
          `/loans/applications/${encodeURIComponent(profileApplication._id)}`,
          { replace: true },
        );
      } else if (status?.loan?.loanId) {
        navigate(
          `/loans/applications/${encodeURIComponent(status.loan.loanId)}`,
          { replace: true },
        );
      } else {
        navigate("/loans/applications", {
          replace: true,
        });
      }

      return;
    }

    // Profile-backed offers.
    if (offerActive) {
      navigate("/loan-offers", {
        replace: true,
      });
      return;
    }

    // Only enter the mandate flow when the API indicates it.
    if (mandateActive) {
      if (status?.loanOffer?.offerId) {
        navigate(
          `/loan-offers/${encodeURIComponent(status.loanOffer.offerId)}`,
          { replace: true },
        );
      } else {
        navigate("/loan-offers", {
          replace: true,
        });
      }

      return;
    }

    if (!status && !profile) {
      navigate("/kyc", {
        replace: true,
      });
      return;
    }

    if (!bankComplete) {
      navigate("/bank-accounts", {
        replace: true,
      });
      return;
    }

    switch (status?.nextStep) {
      case "KYC":
        navigate("/kyc", {
          replace: true,
        });
        break;

      case "BANK":
        navigate("/bank-accounts", {
          replace: true,
        });
        break;

      case "LOAN":
        navigate("/loans", {
          replace: true,
        });
        break;

      case "OFFER":
        navigate("/loan-offers", {
          replace: true,
        });
        break;

      case "MANDATE":
        if (status.loanOffer?.offerId) {
          navigate(
            `/loan-offers/${encodeURIComponent(status.loanOffer.offerId)}`,
            { replace: true },
          );
        } else {
          navigate("/loan-offers", {
            replace: true,
          });
        }
        break;

      case "REPAYMENT":
        if (repaymentScheduleId) {
          navigate(
            `/loans/repayments/${encodeURIComponent(repaymentScheduleId)}`,
            { replace: true },
          );
        } else {
          navigate("/my-loans", {
            replace: true,
          });
        }
        break;

      case "REVIEW":
        if (status.loan?.loanId) {
          navigate(
            `/loans/applications/${encodeURIComponent(status.loan.loanId)}`,
            { replace: true },
          );
        } else {
          navigate("/loans/applications", {
            replace: true,
          });
        }
        break;

      default:
        navigate("/loans", {
          replace: true,
        });
    }
  };

  // =========================================================
  // APPLICATION TITLE
  // =========================================================

  const applicationTitle = loanCompleted
    ? "🎉 Loan fully repaid"
    : repaymentActive
      ? "Your loan is in repayment"
      : mandateActive
        ? "Create your repayment mandate"
        : offerActive
          ? profileOfferStatus === "accepted" ||
            profileApplicationStatus === "accepted"
            ? "Your offer has been accepted"
            : "Your offer is waiting for action"
          : reviewActive
            ? "Your application is under review"
            : profileApplication
              ? `Application ${formatStatus(profileApplication.status)}`
              : loanExists
                ? "Your loan application"
                : "Get started with your loan";

  // =========================================================
  // APPLICATION DESCRIPTION
  // =========================================================

  const applicationDescription = loanCompleted
    ? "Congratulations! Your previous loan has been completed. You can now apply for a new loan."
    : repaymentActive
      ? `Your repayment status is ${
          repaymentStatusLabel || "Active"
        }. Review your repayment details and outstanding balance.`
      : mandateActive
        ? "Your application has reached the mandate stage. Continue to the offer page to review and authorize your repayment mandate."
        : offerActive
          ? profileOfferStatus === "accepted" ||
            profileApplicationStatus === "accepted"
            ? "Your offer has been accepted. Review your offer details and follow the next steps shown in your account."
            : "Your loan offer or approval is being processed. Open your offers to review the available details and next action."
          : reviewActive
            ? "Your application has been submitted and is being reviewed. You can open it to check its current status."
            : !kycComplete
              ? "Complete your KYC verification before continuing with your loan application."
              : !bankComplete
                ? "Verify your bank account before continuing with your loan application."
                : loanExists
                  ? "Continue to your application to view its current status."
                  : "Complete your verification and banking details before submitting a loan application.";

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
        {/* ERROR */}

        {error && (
          <section className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="mt-0.5 text-red-600" />

              <div>
                <h3 className="font-semibold text-red-900">
                  Dashboard unavailable
                </h3>

                <p className="mt-1 text-sm text-red-800">{error}</p>
              </div>
            </div>
          </section>
        )}

        {/* WELCOME */}

        <section className="mb-8">
          <p className="text-sm font-medium text-slate-500">Welcome back</p>

          <h2 className="mt-1 text-3xl font-bold text-slate-950">
            Hi, {profile?.firstName || user?.firstName || "there"}
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Manage your verification, loan application, repayments, and loans
            from your dashboard.
          </p>
        </section>

        {/* COMPLETED LOAN CELEBRATION */}

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
                    Your previous loan has been completed. You can now apply for
                    a new loan.
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

        {/* MAIN CARDS */}

        <section className="grid gap-6 lg:grid-cols-3">
          {/* APPLICATION CARD */}

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
                <CheckCircle2 size={34} className="shrink-0 text-emerald-300" />
              ) : (
                <WalletCards size={32} className="shrink-0 text-slate-400" />
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
              className={`mt-7 inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
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

          <div className="rounded-3xl border border-slate-200 bg-white p-7">
            <h3 className="font-bold text-slate-950">Application progress</h3>

            <div className="mt-6 space-y-5">
              {!kycComplete && (
                <StatusItem
                  icon={<FileCheck2 size={19} />}
                  title="KYC"
                  complete={false}
                  status={kycStepLabel}
                />
              )}

              <StatusItem
                icon={<Landmark size={19} />}
                title="Bank account"
                complete={bankComplete}
                status={bankComplete ? "Verified" : "Pending"}
              />

              <StatusItem
                icon={<WalletCards size={19} />}
                title={loanCompleted ? "Previous loan" : "Loan application"}
                complete={loanExists}
                status={
                  loanCompleted
                    ? "Completed"
                    : profileApplication?.status
                      ? formatStatus(profileApplication.status)
                      : loanExists
                        ? "Application exists"
                        : !kycComplete
                          ? "Complete KYC first"
                          : !bankComplete
                            ? "Verify bank account first"
                            : "Pending"
                }
              />

              {!loanCompleted && (
                <StatusItem
                  icon={<Clock3 size={19} />}
                  title="Review"
                  complete={reviewActive || hasActiveLoan}
                  status={
                    hasActiveLoan
                      ? "Completed"
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
                    ? "🎉 Fully repaid"
                    : repaymentStatus
                      ? formatStatus(repaymentStatus)
                      : repaymentActive
                        ? "Active"
                        : "Not started"
                }
                completed={loanCompleted}
                action={
                  loanCompleted
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

        {/* LOAN SUMMARY */}

        {!loanCompleted && loanCount > 0 && (
          <section className="mb-8 grid gap-4 sm:grid-cols-3">
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
        {/* REPAYMENT INFORMATION */}

        {repaymentActive && !loanCompleted && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Repayment status
                </p>

                <h3 className="mt-1 text-lg font-bold text-slate-950">
                  {repaymentStatusLabel}
                </h3>

                {repaymentScheduleId && (
                  <p className="mt-1 text-xs text-slate-500">
                    Repayment schedule available
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (repaymentScheduleId) {
                    navigate(
                      `/loans/repayments/${encodeURIComponent(
                        repaymentScheduleId,
                      )}`,
                    );
                  } else {
                    navigate("/my-loans");
                  }
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                View repayment
                <ArrowRight size={17} />
              </button>
            </div>
          </section>
        )}

        {/* KYC INFORMATION */}

        {!kycComplete && !loanCompleted && (
          <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <div className="flex items-start gap-3">
              <Clock3 size={20} className="mt-0.5 text-blue-600" />

              <div>
                <h3 className="font-semibold text-blue-900">
                  Complete your KYC
                </h3>

                <p className="mt-1 text-sm leading-6 text-blue-800">
                  Complete your KYC verification before applying for a loan.
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

        {/* ACTIVE LOAN */}

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

  const isWarning = ["overdue", "pending_disbursement", "disbursing"].includes(
    normalized,
  );

  const className = isPositive
    ? "bg-green-100 text-green-700"
    : isWarning
      ? "bg-amber-100 text-amber-700"
      : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      {formatStatus(status)}
    </span>
  );
}

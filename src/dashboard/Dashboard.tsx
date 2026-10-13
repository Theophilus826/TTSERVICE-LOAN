
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
  data: {
    loanSummary: {
      activeApplication: CurrentApplication | null;
    };
  };
};

type ApplicationStep = OnboardingStatus["nextStep"];

// =========================================================
// APPLICATION STATUS HELPERS
// =========================================================

function normalizeStatus(value?: string | null): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

/**
 * Map application statuses from the Profile endpoint to
 * the dashboard's workflow stages.
 *
 * Unknown statuses deliberately fall back to onboarding's
 * nextStep rather than guessing a stage.
 */
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

function isCompletedLoan(loan?: CustomerLoan | null): boolean {
  if (!loan) {
    return false;
  }

  const status = normalizeStatus(loan.status);

  return [
    "COMPLETED",
    "FULLY_REPAID",
    "REPAID",
  ].includes(status);
}

// =========================================================
// DASHBOARD
// =========================================================

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [status, setStatus] = useState<OnboardingStatus | null>(null);

  const [loanDashboard, setLoanDashboard] =
    useState<LoanDashboard | null>(null);

  const [currentApplication, setCurrentApplication] =
    useState<CurrentApplication | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // =======================================================
  // LOAD DASHBOARD DATA
  // =======================================================

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const [
          onboardingResult,
          loanResult,
          profileResult,
        ] = await Promise.allSettled([
          onboardingApi.getStatus(),
          myLoanApi.getLoanDashboard(),
          API.get<CurrentApplicationProfileResponse>(
            "/users/me/profile",
          ),
        ]);

        if (!mounted) {
          return;
        }

        if (onboardingResult.status === "fulfilled") {
          setStatus(onboardingResult.value);
        } else {
          console.error(
            "Failed to load onboarding status:",
            onboardingResult.reason,
          );
        }

        if (loanResult.status === "fulfilled") {
          setLoanDashboard(loanResult.value);
        } else {
          console.error(
            "Failed to load loan dashboard:",
            loanResult.reason,
          );
        }

        if (profileResult.status === "fulfilled") {
          const profileResponse = profileResult.value.data;

          if (profileResponse?.success) {
            setCurrentApplication(
              profileResponse.data?.loanSummary?.activeApplication ??
                null,
            );
          } else {
            console.error(
              "Profile endpoint returned an unsuccessful response.",
            );
          }
        } else {
          console.error(
            "Failed to load current application:",
            profileResult.reason,
          );
        }

        const allRequestsFailed =
          onboardingResult.status === "rejected" &&
          loanResult.status === "rejected" &&
          profileResult.status === "rejected";

        if (allRequestsFailed) {
          setError(
            "Unable to load your dashboard. Please try again.",
          );
        }
      } catch (err) {
        console.error("Failed to load dashboard:", err);

        if (mounted) {
          setError(
            "Unable to load your dashboard. Please try again.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  // =======================================================
  // LOAN DATA
  // =======================================================

  const loans = loanDashboard?.loans ?? [];
  const loanCount = loans.length;

  /*
   * Never consider a completed loan to be an active loan.
   */
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
      : activeLoans[0] ?? null;

  const hasActiveLoan = Boolean(activeLoan);

  const repaymentSchedule = getRepaymentSchedule(activeLoan);

  // =======================================================
  // CURRENT APPLICATION
  // =======================================================

  /*
   * The Profile endpoint is preferred because it identifies
   * the current application shown correctly on the Profile page.
   */
  const currentApplicationId =
    currentApplication?._id ??
    status?.loan?.applicationId ??
    null;

  const currentApplicationStatus =
    currentApplication?.status ??
    status?.loan?.applicationStatus ??
    null;

  const hasCurrentApplication = Boolean(currentApplicationId);

  const currentApplicationStep = getApplicationStep(
    currentApplicationStatus,
  );

  /*
   * Use the current application's stage before onboarding's
   * nextStep. This prevents a previous loan's stale status
   * from overriding the current application.
   */
  const effectiveNextStep: ApplicationStep =
    currentApplicationStep ?? status?.nextStep ?? "KYC";

  // =======================================================
  // COMPLETED LOAN DETECTION
  // =======================================================

  const completedLoanFromStatus =
    normalizeStatus(status?.currentStatus) === "COMPLETED" ||
    status?.loan?.completed === true ||
    normalizeStatus(status?.loan?.completedLoanStatus) ===
      "COMPLETED";

  const completedLoanFromHistory = loans.some((loan) =>
    isCompletedLoan(loan),
  );

  const completedLoanFromDashboard = Boolean(
    loanDashboard?.activeLoan &&
      isCompletedLoan(loanDashboard.activeLoan),
  );

  /*
   * Completion from historical records is only relevant when
   * no current application or active loan takes priority.
   */
  const hasRepaymentWorkflow =
    status?.nextStep === "REPAYMENT" ||
    status?.repayment?.exists === true;

  const loanCompleted =
    !hasCurrentApplication &&
    !hasActiveLoan &&
    !hasRepaymentWorkflow &&
    (
      completedLoanFromStatus ||
      completedLoanFromHistory ||
      completedLoanFromDashboard
    );

  /*
   * Eligibility must come from the backend.
   * A completed loan does not automatically guarantee
   * eligibility for another application.
   */
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

  /*
   * Do not allow an unrelated active loan to push a current
   * application back into repayment.
   */
  const repaymentActive =
    !loanCompleted &&
    !hasCurrentApplication &&
    (
      effectiveNextStep === "REPAYMENT" ||
      status?.repayment?.exists === true ||
      hasActiveLoan
    );

  // =======================================================
  // KYC
  // =======================================================

  const kycStatus = status?.kyc?.status;

  const kycComplete =
    status !== null && onboardingApi.isKycComplete(status);

  const kycSubmitted = kycStatus === "SUBMITTED";

  const kycStepLabel = kycComplete
    ? "All 5 steps completed"
    : kycSubmitted
      ? "Submitted"
      : kycStatus === "REJECTED"
        ? "Rejected"
        : kycStatus === "PENDING"
          ? "In progress"
          : "Not started";

  // =======================================================
  // BANK
  // =======================================================

  const bankComplete =
    status?.bank?.completed === true &&
    status?.bank?.verified === true;

  // =======================================================
  // REPAYMENT STATUS
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
  // SUMMARY
  // =======================================================

  const summary = loanDashboard?.summary;

  const totalBorrowed =
    summary?.totalBorrowed ?? summary?.totalPrincipal ?? 0;

  const totalPaid = summary?.totalPaid ?? 0;

  const totalOutstanding =
    summary?.totalOutstanding ?? activeLoan?.outstandingAmount ?? 0;

  const currency = repaymentSchedule?.currency ?? "NGN";

  // =======================================================
  // BUTTON TEXT
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

    if (
      effectiveNextStep === "LOAN" &&
      kycComplete &&
      !bankComplete
    ) {
      return "Add Bank Account";
    }

    /*
     * A current application takes priority over a loan
     * returned by the historical loan dashboard.
     */
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
          break;
      }
    }

    if (repaymentActive) {
      return "View Repayment";
    }

    if (hasActiveLoan && !hasCurrentApplication) {
      return "View Loan";
    }

    if (!status) {
      return "Start Application";
    }

    switch (effectiveNextStep) {
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
  // APPLY FOR NEW LOAN
  // =======================================================

  const applyForNewLoan = () => {
    if (!loanCompleted || !canApplyForNewLoan) {
      return;
    }

    navigate("/loans", { replace: true });
  };

  // =======================================================
  // CONTINUE APPLICATION
  // =======================================================

  const continueApplication = () => {
    /*
     * Only enter the new-loan flow if the backend confirms
     * the user is eligible and there is no current application.
     */
    if (loanCompleted) {
      if (canApplyForNewLoan) {
        applyForNewLoan();
      }
      return;
    }

    if (status && !kycComplete) {
      navigate("/kyc", { replace: true });
      return;
    }

    /*
     * Prioritize the current application before checking
     * for an unrelated active loan.
     */
    if (hasCurrentApplication) {
      switch (effectiveNextStep) {
        case "OFFER":
          navigate("/loan-offers", { replace: true });
          return;

        case "MANDATE":
          if (status?.mandate?.offerId || status?.loanOffer?.offerId) {
            const offerId =
              status?.mandate?.offerId ??
              status?.loanOffer?.offerId;

            navigate(
              `/loan-offers/${encodeURIComponent(offerId!)}`,
              { replace: true },
            );
          } else {
            navigate("/loan-offers", { replace: true });
          }
          return;

        case "REVIEW":
          navigate(
            status?.loan?.applicationId
              ? `/loans/applications/${encodeURIComponent(
                  status.loan.applicationId,
                )}`
              : "/loans/applications",
            { replace: true },
          );
          return;

        case "REPAYMENT":
          if (repaymentScheduleId) {
            navigate(
              `/loans/repayments/${encodeURIComponent(
                repaymentScheduleId,
              )}`,
              { replace: true },
            );
          } else {
            navigate("/my-loans", { replace: true });
          }
          return;

        default:
          break;
      }
    }

    if (repaymentActive && repaymentScheduleId) {
      navigate(
        `/loans/repayments/${encodeURIComponent(
          repaymentScheduleId,
        )}`,
        { replace: true },
      );
      return;
    }

    if (hasActiveLoan && !hasCurrentApplication) {
      navigate("/my-loans", { replace: true });
      return;
    }

    if (!status) {
      navigate("/kyc", { replace: true });
      return;
    }

    switch (effectiveNextStep) {
      case "KYC":
        navigate("/kyc", { replace: true });
        break;

      case "BANK":
        navigate("/bank-accounts", { replace: true });
        break;

      case "LOAN":
        if (!kycComplete) {
          navigate("/kyc", { replace: true });
          return;
        }

        if (!bankComplete) {
          navigate("/bank-accounts", { replace: true });
          return;
        }

        navigate("/loans", { replace: true });
        break;

      case "OFFER":
        navigate("/loan-offers", { replace: true });
        break;

      case "MANDATE": {
        const offerId =
          status.mandate?.offerId ?? status.loanOffer?.offerId;

        if (offerId) {
          navigate(
            `/loan-offers/${encodeURIComponent(offerId)}`,
            { replace: true },
          );
        } else {
          navigate("/loan-offers", { replace: true });
        }
        break;
      }

      case "REPAYMENT":
        if (repaymentScheduleId) {
          navigate(
            `/loans/repayments/${encodeURIComponent(
              repaymentScheduleId,
            )}`,
            { replace: true },
          );
        } else {
          navigate("/my-loans", { replace: true });
        }
        break;

      case "REVIEW":
        navigate(
          status.loan?.applicationId
            ? `/loans/applications/${encodeURIComponent(
                status.loan.applicationId,
              )}`
            : "/loans/applications",
          { replace: true },
        );
        break;

      default:
        if (!kycComplete) {
          navigate("/kyc", { replace: true });
        } else if (!bankComplete) {
          navigate("/bank-accounts", { replace: true });
        } else {
          navigate("/loans", { replace: true });
        }
    }
  };

  // =======================================================
  // APPLICATION HEADING AND DESCRIPTION
  // =======================================================

  const applicationTitle = loanCompleted
    ? "🎉 Loan fully repaid"
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
      : "Your previous loan is fully repaid. Check your eligibility before starting another application."
    : repaymentActive
      ? `Your repayment status is ${
          repaymentStatusLabel || "Active"
        }. Review your repayment details and keep track of your outstanding balance.`
      : mandateActive
        ? "Your offer has been accepted. Continue to authorize the repayment mandate and complete the next step."
        : offerActive
          ? normalizeStatus(status?.loanOffer?.status) === "ACCEPTED"
            ? "Your offer has been accepted and your application is progressing toward the next stage."
            : "A loan offer is available. Review the details and follow the instructions to continue."
          : reviewActive
            ? "Your current application has been submitted. You can check its status while it is being reviewed."
            : !kycComplete
              ? "Complete all 5 KYC verification steps, including Face Verification, before continuing to your loan application."
              : !bankComplete
                ? "Verify your bank account before continuing with your loan application."
                : loanExists
                  ? "Continue to your current application to view its status."
                  : "Complete your verification and banking details before submitting your loan application.";

  // =======================================================
  // LOADING
  // =======================================================

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

  // =======================================================
  // PAGE
  // =======================================================

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* ERROR */}

        {error && (
          <section className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={20}
                className="mt-0.5 text-red-600"
              />

              <div>
                <h3 className="font-semibold text-red-900">
                  Dashboard unavailable
                </h3>
                <p className="mt-1 text-sm text-red-800">
                  {error}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* WELCOME */}

        <section className="mb-8">
          <p className="text-sm font-medium text-slate-500">
            Welcome back
          </p>

          <h2 className="mt-1 text-3xl font-bold text-slate-950">
            Hi, {user?.firstName}
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Manage your verification, loan application, repayments,
            and loans from your dashboard.
          </p>
        </section>

        {/* COMPLETED LOAN */}

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
                    Previous loan completed
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

                <h3 className="mt-2 text-2xl font-bold">
                  {applicationTitle}
                </h3>

                {hasCurrentApplication &&
                  currentApplication?.applicationNumber && (
                    <p className="mt-2 text-xs text-slate-400">
                      Application: {currentApplication.applicationNumber}
                    </p>
                  )}
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
                loanCompleted
                  ? "text-emerald-100"
                  : "text-slate-400"
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

          {/* APPLICATION PROGRESS */}

          <div className="rounded-3xl border border-slate-200 bg-white p-7">
            <h3 className="font-bold text-slate-950">
              Application progress
            </h3>

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
                complete={loanExists && !loanCompleted}
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
                  title="Review"
                  complete={reviewActive}
                  status={
                    reviewActive
                      ? "In progress"
                      : offerActive || mandateActive
                        ? "Completed"
                        : hasCurrentApplication
                          ? "Pending"
                          : "Not started"
                  }
                />
              )}

              {offerActive && !loanCompleted && (
                <StatusItem
                  icon={<FileCheck2 size={19} />}
                  title="Loan offer"
                  complete={false}
                  status={
                    normalizeStatus(status?.loanOffer?.status) === "ACCEPTED"
                      ? "Accepted"
                      : "Action required"
                  }
                />
              )}

              {mandateActive && !loanCompleted && (
                <StatusItem
                  icon={<CheckCircle2 size={19} />}
                  title="Repayment mandate"
                  complete={false}
                  status={formatStatus(status?.mandate?.status) || "Pending"}
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
                  canApplyForNewLoan
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

              {repaymentScheduleId && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/loans/repayments/${encodeURIComponent(
                        repaymentScheduleId,
                      )}`,
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  View repayment
                  <ArrowRight size={17} />
                </button>
              )}
            </div>
          </section>
        )}

        {/* KYC INFORMATION */}

        {!kycComplete && !loanCompleted && (
          <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <div className="flex items-start gap-3">
              <Clock3
                size={20}
                className="mt-0.5 text-blue-600"
              />

              <div>
                <h3 className="font-semibold text-blue-900">
                  Complete your KYC
                </h3>

                <p className="mt-1 text-sm leading-6 text-blue-800">
                  Complete all 5 KYC verification steps, including Face
                  Verification, before applying for a loan.
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

        {activeLoan && !loanCompleted && !hasCurrentApplication && (
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

  const amountPaid =
    loan.amountPaid ?? schedule?.amountPaid ?? 0;

  const totalRepayment =
    loan.totalRepayment ?? schedule?.totalRepaymentAmount ?? 0;

  const progress =
    totalRepayment > 0
      ? Math.min(
          100,
          Math.max(0, (amountPaid / totalRepayment) * 100),
        )
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

        <LoanMetric
          label="Paid"
          value={formatCurrency(amountPaid, currency)}
        />

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

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold text-slate-950">
        {value}
      </p>
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
        <p className="text-sm font-semibold text-slate-900">
          {title}
        </p>

        <p className="text-xs text-slate-500">{status}</p>
      </div>
    </div>
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
      <p className="text-xs text-slate-500">{label}</p>

      <p className="mt-1 text-lg font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

// =========================================================
// LOAN STATUS BADGE
// =========================================================

function LoanStatusBadge({ status }: { status: string }) {
  const normalized = normalizeStatus(status);

  const isPositive = normalized === "ACTIVE";

  const isWarning = [
    "OVERDUE",
    "PENDING_DISBURSEMENT",
    "DISBURSING",
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
      {formatStatus(status)}
    </span>
  );
}

// =========================================================
// FORMAT STATUS
// =========================================================

function formatStatus(value?: string | null): string {
  if (!value) {
    return "";
  }

  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

// =========================================================
// FORMAT CURRENCY
// =========================================================

function formatCurrency(
  amount: number,
  currency?: string,
): string {
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

// =========================================================
// FORMAT DATE
// =========================================================

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

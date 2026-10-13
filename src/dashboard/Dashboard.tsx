
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
// COMPONENT
// =========================================================

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [status, setStatus] =
    useState<OnboardingStatus | null>(null);

  const [loanDashboard, setLoanDashboard] =
    useState<LoanDashboard | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] =
    useState<string | null>(null);

  // =========================================================
  // LOAD DASHBOARD DATA
  // =========================================================

  useEffect(() => {
    let mounted = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const [
          onboardingResult,
          loanResult,
        ] = await Promise.allSettled([
          onboardingApi.getStatus(),
          myLoanApi.getLoanDashboard(),
        ]);

        if (!mounted) {
          return;
        }

        // ---------------------------------------------------
        // ONBOARDING
        // ---------------------------------------------------

        if (onboardingResult.status === "fulfilled") {
          setStatus(onboardingResult.value);
        } else {
          console.error(
            "Failed to load onboarding status:",
            onboardingResult.reason,
          );
        }

        // ---------------------------------------------------
        // LOAN DASHBOARD
        // ---------------------------------------------------

        if (loanResult.status === "fulfilled") {
          setLoanDashboard(loanResult.value);
        } else {
          console.error(
            "Failed to load loan dashboard:",
            loanResult.reason,
          );
        }

        // ---------------------------------------------------
        // ONLY SHOW ERROR IF BOTH REQUESTS FAILED
        // ---------------------------------------------------

        if (
          onboardingResult.status === "rejected" &&
          loanResult.status === "rejected"
        ) {
          setError(
            "Unable to load your dashboard. Please try again.",
          );
        }
      } catch (err) {
        console.error(
          "Failed to load dashboard:",
          err,
        );

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

  // =========================================================
  // LOAN DATA
  // =========================================================

  const loans = loanDashboard?.loans ?? [];

  /*
   * A completed loan must NEVER be treated as an active loan.
   */
  const activeLoans = useMemo(
    () =>
      (loanDashboard?.activeLoans ?? []).filter(
        (loan) =>
          !isCompletedLoan(loan),
      ),
    [loanDashboard],
  );

  /*
   * The backend may return an activeLoan even when that loan
   * has already been completed.
   *
   * Never allow a completed loan to become the active loan.
   */
  const dashboardActiveLoan =
    loanDashboard?.activeLoan ?? null;

  const activeLoan =
    dashboardActiveLoan &&
    !isCompletedLoan(dashboardActiveLoan)
      ? dashboardActiveLoan
      : activeLoans[0] ?? null;

  const loanCount = loans.length;

  const hasActiveLoan = Boolean(activeLoan);

  const repaymentSchedule =
    getRepaymentSchedule(activeLoan);

  // =========================================================
  // COMPLETED LOAN
  // =========================================================

  /*
   * Completed status can come from different parts of the
   * backend response.
   *
   * We intentionally support multiple possible response
   * shapes so that a stale nextStep such as OFFER cannot
   * override the actual completed-loan state.
   */

  const completedLoanFromStatus =
    status?.currentStatus?.toLowerCase() ===
      "completed" ||
    status?.loan?.completed === true ||
    status?.loan?.completedLoanStatus?.toLowerCase() ===
      "completed";

  const completedLoanFromLoans =
    loans.some((loan) =>
      isCompletedLoan(loan),
    );

  const completedLoanFromDashboard =
    Boolean(
      loanDashboard?.activeLoan &&
        isCompletedLoan(
          loanDashboard.activeLoan,
        ),
    );

  /*
   * IMPORTANT:
   *
   * This is the single source of truth used by the UI
   * for the completed-loan flow.
   */
  const loanCompleted =
    completedLoanFromStatus ||
    completedLoanFromLoans ||
    completedLoanFromDashboard;

  /*
   * Once the previous loan is completed, the customer can
   * start a new loan application.
   *
   * We deliberately do NOT use status.nextStep here because
   * the backend may still return an old value such as OFFER.
   */
  const canApplyForNewLoan = loanCompleted;

  // =========================================================
  // APPLICATION STATE
  // =========================================================

  const loanExists =
    status?.loan?.exists === true ||
    loanCount > 0 ||
    loanCompleted;

  const reviewActive =
    !loanCompleted &&
    status?.nextStep === "REVIEW";

  const offerActive =
    !loanCompleted &&
    status?.nextStep === "OFFER";

  const mandateActive =
    !loanCompleted &&
    status?.nextStep === "MANDATE";

  /*
   * A completed loan must never be considered repayment.
   */
  const repaymentActive =
    !loanCompleted &&
    (status?.nextStep === "REPAYMENT" ||
      status?.repayment?.exists === true ||
      hasActiveLoan);

  // =========================================================
  // KYC
  // =========================================================

  const kycStatus = status?.kyc?.status;

  const kycComplete =
    status !== null &&
    onboardingApi.isKycComplete(status);

  const kycSubmitted =
    kycStatus === "SUBMITTED";

  // =========================================================
  // BANK
  // =========================================================

  const bankComplete =
    status?.bank?.completed === true &&
    status?.bank?.verified === true;

  // =========================================================
  // KYC STEP DISPLAY
  // =========================================================

  const kycStepLabel = kycComplete
    ? "All 5 steps completed"
    : kycSubmitted
      ? "Submitted"
      : kycStatus === "REJECTED"
        ? "Rejected"
        : kycStatus === "PENDING"
          ? "In progress"
          : "Not started";

  // =========================================================
  // REPAYMENT STATUS
  // =========================================================

  const repaymentStatus =
    status?.repayment?.status ?? null;

  const repaymentScheduleId =
    status?.repayment?.repaymentScheduleId ?? null;

  const repaymentStatusLabel =
    repaymentStatus
      ? formatStatus(repaymentStatus)
      : hasActiveLoan
        ? formatStatus(activeLoan?.status)
        : "Not started";

  // =========================================================
  // CURRENT STATUS
  // =========================================================

  const currentStatusLabel =
    loanCompleted
      ? "Completed"
      : repaymentActive
        ? repaymentStatusLabel
        : status?.currentStatus
          ? formatStatus(status.currentStatus)
          : activeLoan
            ? formatStatus(activeLoan.status)
            : null;

  void currentStatusLabel;
  void repaymentSchedule;

  // =========================================================
  // SUMMARY
  // =========================================================

  const summary = loanDashboard?.summary;

  const totalBorrowed =
    summary?.totalBorrowed ??
    summary?.totalPrincipal ??
    0;

  const totalPaid =
    summary?.totalPaid ?? 0;

  const totalOutstanding =
    summary?.totalOutstanding ??
    activeLoan?.outstandingAmount ??
    0;

  const currency = activeLoan
    ? getRepaymentSchedule(
        activeLoan,
      )?.currency
    : undefined;

  // =========================================================
  // BUTTON TEXT
  // =========================================================

  const buttonText = useMemo(() => {
    /*
     * COMPLETED LOAN MUST ALWAYS WIN.
     *
     * Do not allow KYC, active loan, OFFER, MANDATE,
     * REVIEW, or any other state to override this.
     */
    if (loanCompleted) {
      return "Apply for New Loan";
    }

    if (status && !kycComplete) {
      return "Complete KYC";
    }

    if (hasActiveLoan) {
      return "View Loan";
    }

    if (!status) {
      return "Start Application";
    }

    if (
      status.nextStep === "LOAN" &&
      kycComplete &&
      !bankComplete
    ) {
      return "Add Bank Account";
    }

    switch (status.nextStep) {
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
    hasActiveLoan,
    status,
    kycComplete,
    bankComplete,
  ]);

  // =========================================================
  // APPLY FOR NEW LOAN
  // =========================================================

  const applyForNewLoan = () => {
    /*
     * This action is ONLY for a completed previous loan.
     *
     * We intentionally do not inspect status.nextStep here.
     * The previous loan may still have a stale OFFER or
     * MANDATE nextStep from the old application.
     */
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
    // -------------------------------------------------------
    // COMPLETED LOAN
    // -------------------------------------------------------
    //
    // THIS MUST BE THE FIRST CONDITION.
    //
    // Otherwise a stale OFFER / REVIEW / MANDATE state can
    // incorrectly redirect the user to the previous loan.
    // -------------------------------------------------------

    if (loanCompleted) {
      applyForNewLoan();
      return;
    }

    // -------------------------------------------------------
    // KYC
    // -------------------------------------------------------

    if (status && !kycComplete) {
      navigate("/kyc", {
        replace: true,
      });

      return;
    }

    // -------------------------------------------------------
    // REPAYMENT
    // -------------------------------------------------------

    if (
      repaymentActive &&
      repaymentScheduleId
    ) {
      navigate(
        `/loans/repayments/${encodeURIComponent(
          repaymentScheduleId,
        )}`,
        {
          replace: true,
        },
      );

      return;
    }

    // -------------------------------------------------------
    // EXISTING ACTIVE LOAN
    // -------------------------------------------------------

    if (hasActiveLoan) {
      navigate("/my-loans", {
        replace: true,
      });

      return;
    }

    // -------------------------------------------------------
    // NO ONBOARDING STATUS
    // -------------------------------------------------------

    if (!status) {
      navigate("/kyc", {
        replace: true,
      });

      return;
    }

    // -------------------------------------------------------
    // NEXT STEP
    // -------------------------------------------------------

    switch (status.nextStep) {
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
        if (!kycComplete) {
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
            `/loan-offers/${encodeURIComponent(
              status.loanOffer.offerId,
            )}`,
            {
              replace: true,
            },
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
            `/loans/repayments/${encodeURIComponent(
              repaymentScheduleId,
            )}`,
            {
              replace: true,
            },
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
            `/loans/applications/${encodeURIComponent(
              status.loan.loanId,
            )}`,
            {
              replace: true,
            },
          );
        } else {
          navigate("/loans/applications", {
            replace: true,
          });
        }
        break;

      default:
        if (!kycComplete) {
          navigate("/kyc", {
            replace: true,
          });
        } else if (!bankComplete) {
          navigate("/bank-accounts", {
            replace: true,
          });
        } else {
          navigate("/loans", {
            replace: true,
          });
        }
    }
  };

  // =========================================================
  // LOAN HEADING
  // =========================================================

  const applicationTitle =
    loanCompleted
      ? "🎉 Loan fully repaid"
      : repaymentActive
        ? "Your loan is in repayment"
        : mandateActive
          ? "Create your repayment mandate"
          : offerActive
            ? status?.loanOffer?.status ===
              "accepted"
              ? "Your offer has been accepted"
              : "Your offer is waiting for action"
            : reviewActive
              ? "Your application is under review"
              : loanExists
                ? "Your loan application"
                : "Get started with your loan";

  // =========================================================
  // LOAN DESCRIPTION
  // =========================================================

  const applicationDescription =
    loanCompleted
      ? "Congratulations! You have successfully completed your loan repayment. Your previous loan is now fully repaid and you can apply for a new loan."
      : repaymentActive
        ? `Your repayment status is ${
            repaymentStatusLabel ||
            "Active"
          }. Review your repayment details and keep track of your outstanding balance.`
        : mandateActive
          ? "Your offer has been accepted. Create and authorize the repayment mandate to continue with disbursement."
          : offerActive
            ? status?.loanOffer?.status ===
              "accepted"
              ? "Your offer has been accepted and your loan is progressing toward disbursement."
              : "A loan offer is available. Review the details and accept or decline it before continuing."
            : reviewActive
              ? "Your application has been submitted. You can view its current status while it is being reviewed."
              : !kycComplete
                ? "Complete all 5 KYC verification steps, including Face Verification, before continuing to your loan application."
                : !bankComplete
                  ? "Verify your bank account before continuing to your loan application."
                  : loanExists
                    ? "Continue to your application to view its current status."
                    : "Complete your verification and banking details before submitting your loan application.";

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
        {/* ===================================================
            ERROR
        =================================================== */}

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

        {/* ===================================================
            WELCOME
        =================================================== */}

        <section className="mb-8">
          <p className="text-sm font-medium text-slate-500">
            Welcome back
          </p>

          <h2 className="mt-1 text-3xl font-bold text-slate-950">
            Hi, {user?.firstName}
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Manage your verification, loan application,
            repayments, and loans from your dashboard.
          </p>
        </section>

        {/* ===================================================
            COMPLETED LOAN CELEBRATION
        =================================================== */}

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
                    You have successfully paid off your
                    previous loan. You can now apply for
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

        {/* ===================================================
            LOAN SUMMARY
        =================================================== */}

        {!loanCompleted &&
          loanCount > 0 && (
            <section className="mb-8 grid gap-4 sm:grid-cols-3">
              <SummaryCard
                label="Total borrowed"
                value={formatCurrency(
                  totalBorrowed,
                  currency,
                )}
              />

              <SummaryCard
                label="Total paid"
                value={formatCurrency(
                  totalPaid,
                  currency,
                )}
              />

              <SummaryCard
                label="Outstanding"
                value={formatCurrency(
                  totalOutstanding,
                  currency,
                )}
              />
            </section>
          )}

        {/* ===================================================
            MAIN CARDS
        =================================================== */}

        <section className="grid gap-6 lg:grid-cols-3">
          {/* =================================================
              APPLICATION CARD
          ================================================= */}

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

          {/* =================================================
              APPLICATION PROGRESS
          ================================================= */}

          <div className="rounded-3xl border border-slate-200 bg-white p-7">
            <h3 className="font-bold text-slate-950">
              Application progress
            </h3>

            <div className="mt-6 space-y-5">
              {/* KYC */}

              {!kycComplete && (
                <StatusItem
                  icon={<FileCheck2 size={19} />}
                  title="KYC"
                  complete={false}
                  status={kycStepLabel}
                />
              )}

              {/* BANK */}

              <StatusItem
                icon={<Landmark size={19} />}
                title="Bank account"
                complete={bankComplete}
                status={
                  bankComplete
                    ? "Verified"
                    : "Pending"
                }
              />

              {/* LOAN */}

              <StatusItem
                icon={<WalletCards size={19} />}
                title={
                  loanCompleted
                    ? "Previous loan"
                    : "Loan application"
                }
                complete={loanExists}
                status={
                  loanCompleted
                    ? "Completed"
                    : loanExists
                      ? "Submitted"
                      : !kycComplete
                        ? "Complete KYC first"
                        : !bankComplete
                          ? "Verify bank account first"
                          : "Pending"
                }
              />

              {/* REVIEW */}

              {!loanCompleted && (
                <StatusItem
                  icon={<Clock3 size={19} />}
                  title="Review"
                  complete={
                    reviewActive ||
                    hasActiveLoan
                  }
                  status={
                    hasActiveLoan
                      ? "Completed"
                      : reviewActive
                        ? "In progress"
                        : loanExists
                          ? "Pending"
                          : "Not started"
                  }
                />
              )}

              {/* REPAYMENT / COMPLETED */}

              <StatusItem
                icon={<WalletCards size={19} />}
                title={
                  loanCompleted
                    ? "Loan completed"
                    : "Repayment"
                }
                complete={
                  loanCompleted ||
                  repaymentActive
                }
                status={
                  loanCompleted
                    ? "🎉 Fully repaid"
                    : repaymentStatus
                      ? formatStatus(
                          repaymentStatus,
                        )
                      : repaymentActive
                        ? "Active"
                        : "Not started"
                }
                completed={loanCompleted}
                action={
                  loanCompleted &&
                  canApplyForNewLoan
                    ? {
                        label:
                          "Apply for New Loan",
                        onClick:
                          applyForNewLoan,
                      }
                    : undefined
                }
              />
            </div>
          </div>
        </section>

        {/* ===================================================
            REPAYMENT INFORMATION
        =================================================== */}

        {repaymentActive &&
          !loanCompleted && (
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

        {/* ===================================================
            KYC INFORMATION
        =================================================== */}

        {!kycComplete &&
          !loanCompleted && (
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
                    Complete all 5 KYC verification
                    steps, including Face
                    Verification, before applying
                    for a loan.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      navigate("/kyc")
                    }
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Continue KYC
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </section>
          )}

        {/* ===================================================
            ACTIVE LOAN
        =================================================== */}

        {activeLoan && !loanCompleted && (
          <ActiveLoanCard
            loan={activeLoan}
            onView={() =>
              navigate("/my-loans")
            }
          />
        )}
      </main>
    </div>
  );
}

// =========================================================
// COMPLETED LOAN HELPER
// =========================================================

function isCompletedLoan(
  loan?: CustomerLoan | null,
): boolean {
  if (!loan) {
    return false;
  }

  const normalizedStatus =
    loan.status?.toLowerCase();

  return (
    normalizedStatus === "completed" ||
    normalizedStatus === "fully_repaid" ||
    normalizedStatus === "fully-repaid" ||
    normalizedStatus === "repaid"
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
  const schedule =
    getRepaymentSchedule(loan);

  const currency = schedule?.currency;

  const outstanding =
    loan.outstandingAmount ??
    schedule?.amountOutstanding ??
    0;

  const amountPaid =
    loan.amountPaid ??
    schedule?.amountPaid ??
    0;

  const totalRepayment =
    loan.totalRepayment ??
    schedule?.totalRepaymentAmount ??
    0;

  const progress =
    totalRepayment > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (amountPaid /
              totalRepayment) *
              100,
          ),
        )
      : 0;

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-slate-500">
            Active loan
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-bold text-slate-950">
              {loan.loanNumber ||
                "Current loan"}
            </h3>

            <LoanStatusBadge
              status={loan.status}
            />
          </div>

          <p className="mt-2 text-sm text-slate-500">
            {loan.repaymentFrequency
              ? `${formatStatus(
                  loan.repaymentFrequency,
                )} repayment`
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
          value={formatCurrency(
            loan.principalAmount,
            currency,
          )}
        />

        <LoanMetric
          label="Paid"
          value={formatCurrency(
            amountPaid,
            currency,
          )}
        />

        <LoanMetric
          label="Outstanding"
          value={formatCurrency(
            outstanding,
            currency,
          )}
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
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      </div>

      {schedule && (
        <div className="mt-6 flex flex-wrap gap-3 text-xs text-slate-500">
          <span>
            {schedule.installments.length}{" "}
            installments
          </span>

          <span>•</span>

          <span>
            Due{" "}
            {formatDate(
              schedule.finalDueDate,
            )}
          </span>
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
  /*
   * Special completed state.
   *
   * The completed loan gets its own success card and
   * explicit new-loan action.
   */
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

  // ---------------------------------------------------------
  // NORMAL STATUS ITEM
  // ---------------------------------------------------------

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full ${
          complete
            ? "bg-green-100 text-green-700"
            : "bg-slate-100 text-slate-400"
        }`}
      >
        {complete ? (
          <CheckCircle2 size={19} />
        ) : (
          icon
        )}
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-900">
          {title}
        </p>

        <p className="text-xs text-slate-500">
          {status}
        </p>
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
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold text-slate-950">
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
  status: string;
}) {
  const normalized =
    status.toLowerCase();

  const isPositive =
    normalized === "active";

  const isWarning =
    normalized === "overdue" ||
    normalized ===
      "pending_disbursement" ||
    normalized === "disbursing";

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

function formatStatus(
  value?: string | null,
): string {
  if (!value) {
    return "";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
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
    return new Intl.NumberFormat(
      "en-NG",
      {
        style: "currency",
        currency: code,
        maximumFractionDigits: 2,
      },
    ).format(amount || 0);
  } catch {
    return `${code} ${(
      amount || 0
    ).toLocaleString("en-NG")}`;
  }
}

// =========================================================
// FORMAT DATE
// =========================================================

function formatDate(
  value?: string | null,
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-NG",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}


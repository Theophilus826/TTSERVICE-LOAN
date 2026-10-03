import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Landmark,
  WalletCards,
  AlertCircle,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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

// =========================================================
// COMPONENT
// =========================================================

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [status, setStatus] =
    useState<OnboardingStatus | null>(null);

  const [loanDashboard, setLoanDashboard] =
    useState<LoanDashboard | null>(null);

  const [loading, setLoading] =
    useState(true);

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

        if (
          onboardingResult.status === "fulfilled"
        ) {
          setStatus(
            onboardingResult.value,
          );
        } else {
          console.error(
            "Failed to load onboarding status:",
            onboardingResult.reason,
          );
        }

        // ---------------------------------------------------
        // LOAN DASHBOARD
        // ---------------------------------------------------

        if (
          loanResult.status === "fulfilled"
        ) {
          setLoanDashboard(
            loanResult.value,
          );
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
          onboardingResult.status ===
            "rejected" &&
          loanResult.status ===
            "rejected"
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

  const loans =
    loanDashboard?.loans ?? [];

  const activeLoans =
    loanDashboard?.activeLoans ?? [];

  const activeLoan =
    loanDashboard?.activeLoan ??
    activeLoans[0] ??
    null;

  const loanCount = loans.length;

  const hasActiveLoan =
    Boolean(activeLoan);

  const repaymentSchedule =
    getRepaymentSchedule(
      activeLoan,
    );

  // =========================================================
  // APPLICATION STATE
  // =========================================================

  const loanExists =
    status?.loan?.exists === true ||
    loanCount > 0;

  const reviewActive =
    status?.nextStep === "REVIEW";

  const offerActive =
    status?.nextStep === "OFFER";

  const mandateActive =
    status?.nextStep === "MANDATE";

  const repaymentActive =
    status?.nextStep === "REPAYMENT" ||
    status?.repayment?.exists === true ||
    hasActiveLoan;

  // =========================================================
  // KYC
  // =========================================================

  const kycStatus =
    status?.kyc?.status;

  /*
   * KYC is considered complete only when:
   *
   * kyc.completed === true
   * AND
   * kyc.status === "VERIFIED"
   *
   * This is the hard gate before entering the
   * loan application.
   */
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

  /*
   * User can proceed to the loan application
   * only after KYC is completely verified.
   *
   * Bank verification is also required by the
   * onboarding API helper.
   */
  const canProceedToLoan =
    status !== null &&
    onboardingApi.canProceedToLoan(status);

  // =========================================================
  // KYC STEP DISPLAY
  // =========================================================

  /*
   * Your OnboardingStatus type does not currently expose
   * individual KYC steps/currentStep.
   *
   * Therefore:
   *
   * VERIFIED = all 5 KYC steps completed.
   *
   * For incomplete KYC, we show the backend KYC status
   * instead of inventing a step number.
   */
  const kycStepLabel =
    kycComplete
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
    status?.repayment
      ?.repaymentScheduleId ?? null;

  const repaymentStatusLabel =
    repaymentStatus
      ? formatStatus(
          repaymentStatus,
        )
      : hasActiveLoan
        ? formatStatus(
            activeLoan.status,
          )
        : "Not started";

  // =========================================================
  // CURRENT STATUS
  // =========================================================

  const currentStatusLabel =
    repaymentActive
      ? repaymentStatusLabel
      : status?.currentStatus
        ? formatStatus(
            status.currentStatus,
          )
        : activeLoan
          ? formatStatus(
              activeLoan.status,
            )
          : null;

  void currentStatusLabel;

  // =========================================================
  // SUMMARY
  // =========================================================

  const summary =
    loanDashboard?.summary;

  const totalBorrowed =
    summary?.totalBorrowed ?? 0;

  const totalPaid =
    summary?.totalPaid ?? 0;

  const totalOutstanding =
    summary?.totalOutstanding ??
    activeLoan?.outstandingAmount ??
    0;

  const currency =
    activeLoan
      ? getRepaymentSchedule(
          activeLoan,
        )?.currency
      : undefined;

  // =========================================================
  // BUTTON TEXT
  // =========================================================

  const buttonText =
    useMemo(() => {
      if (status && !kycComplete) {
        return "Complete KYC";
      }

      if (hasActiveLoan) {
        return "View loan";
      }

      if (!status) {
        return "Start application";
      }

      if (
        status.nextStep === "LOAN" &&
        kycComplete &&
        !bankComplete
      ) {
        return "Add bank account";
      }

      switch (status.nextStep) {
        case "KYC":
          return "Complete KYC";

        case "BANK":
          return "Add bank account";

        case "LOAN":
          return "Apply for a loan";

        case "OFFER":
          return "View offer";

        case "MANDATE":
          return "Create mandate";

        case "REPAYMENT":
          return "View repayment";

        case "REVIEW":
          return "View application";

        default:
          return "Continue";
      }
    }, [
      hasActiveLoan,
      status,
      kycComplete,
      bankComplete,
    ]);

  // =========================================================
  // CONTINUE APPLICATION
  // =========================================================

  const continueApplication = () => {
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
    // HARD KYC GATE
    // -------------------------------------------------------

    // -------------------------------------------------------
    // NEXT STEP
    // -------------------------------------------------------

    switch (status.nextStep) {
      case "KYC":
        navigate("/kyc", {
          replace: true,
        });
        break;

      case "LOAN":
        /*
         * KYC is already verified here because of
         * the hard gate above.
         *
         * Still keep this guard as a second safety check.
         */
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
        if (
          status.loanOffer?.offerId
        ) {
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
        if (
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
        /*
         * Never default directly to /loans.
         * KYC must always be verified first.
         */
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
    repaymentActive
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
    repaymentActive
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
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-black text-slate-950">
              Toans
            </h1>

            <p className="text-xs text-slate-500">
              Loan platform
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-900">
                {user?.firstName}{" "}
                {user?.lastName}
              </p>

              <p className="text-xs text-slate-500">
                {user?.email}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void logout()
              }
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

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
            Manage your verification, loan
            application, repayments, and loans
            from your dashboard.
          </p>
        </section>

        {/* ===================================================
            LOAN SUMMARY
        =================================================== */}

        {loanCount > 0 && (
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

          <div className="rounded-3xl bg-slate-950 p-7 text-white lg:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">
                  Loan application
                </p>

                <h3 className="mt-2 text-2xl font-bold">
                  {applicationTitle}
                </h3>
              </div>

              <WalletCards
                size={32}
                className="shrink-0 text-slate-400"
              />
            </div>

            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400">
              {applicationDescription}
            </p>

            <button
              type="button"
              onClick={
                continueApplication
              }
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-slate-100"
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

              <StatusItem
                icon={
                  <FileCheck2
                    size={19}
                  />
                }
                title="KYC"
                complete={kycComplete}
                status={kycStepLabel}
              />

              {/* BANK */}

              <StatusItem
                icon={
                  <Landmark
                    size={19}
                  />
                }
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
                icon={
                  <WalletCards
                    size={19}
                  />
                }
                title="Loan application"
                complete={loanExists}
                status={
                  loanExists
                    ? "Submitted"
                    : !kycComplete
                      ? "Complete KYC first"
                      : !bankComplete
                        ? "Verify bank account first"
                        : "Pending"
                }
              />

              {/* REVIEW */}

              <StatusItem
                icon={
                  <Clock3 size={19} />
                }
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

              {/* REPAYMENT */}

              <StatusItem
                icon={
                  <WalletCards
                    size={19}
                  />
                }
                title="Repayment"
                complete={
                  repaymentActive
                }
                status={
                  repaymentStatus
                    ? formatStatus(
                        repaymentStatus,
                      )
                    : repaymentActive
                      ? "Active"
                      : "Not started"
                }
              />
            </div>
          </div>
        </section>

        {/* ===================================================
            REPAYMENT INFORMATION
        =================================================== */}

        {repaymentActive && (
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
                  <ArrowRight
                    size={17}
                  />
                </button>
              )}
            </div>
          </section>
        )}

        {/* ===================================================
            KYC INFORMATION
        =================================================== */}

        {!kycComplete && (
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
                  steps, including Face Verification,
                  before applying for a loan.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    navigate("/kyc")
                  }
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Continue KYC
                  <ArrowRight
                    size={16}
                  />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ===================================================
            ACTIVE LOAN
        =================================================== */}

        {activeLoan && (
          <ActiveLoanCard
            loan={activeLoan}
            onView={() =>
              navigate("/my-loans")
            }
          />
        )}

        {/* ===================================================
            MY LOANS
        =================================================== */}

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-7">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm text-slate-500">
                Loan account
              </p>

              <h3 className="mt-1 text-xl font-bold text-slate-950">
                My Loans
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                View your active and previous
                loans, repayment schedules, and
                payment history.
              </p>

              {loanCount > 0 && (
                <p className="mt-2 text-xs font-medium text-slate-400">
                  {loanCount}{" "}
                  {loanCount === 1
                    ? "loan"
                    : "loans"}{" "}
                  on your account
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                navigate("/my-loans")
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              View My Loans
              <ArrowRight size={17} />
            </button>
          </div>
        </section>

        {/* ===================================================
            INFORMATION CARDS
        =================================================== */}

        <section className="mt-8 grid gap-6 md:grid-cols-3">
          <InfoCard
            icon={
              <FileCheck2 size={22} />
            }
            title="Secure verification"
            text="Your identity information is securely processed."
          />

          <InfoCard
            icon={
              <Landmark size={22} />
            }
            title="Bank verification"
            text="Verify your Nigerian bank account before applying."
          />

          <InfoCard
            icon={
              <CheckCircle2 size={22} />
            }
            title="Loan review"
            text="Once submitted, your application can be reviewed by the loan team."
          />
        </section>
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
  const schedule =
    getRepaymentSchedule(loan);

  const currency =
    schedule?.currency;

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
}: {
  icon: ReactNode;
  title: string;
  complete: boolean;
  status: string;
}) {
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

  const className =
    isPositive
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
// INFORMATION CARD
// =========================================================

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
        {icon}
      </div>

      <h3 className="font-bold text-slate-950">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        {text}
      </p>
    </div>
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
  const code =
    currency || "NGN";

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
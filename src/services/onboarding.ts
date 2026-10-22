
import API from "./Api";

export type OnboardingStep =
  | "KYC"
  | "BANK"
  | "LOAN"
  | "REVIEW"
  | "OFFER"
  | "MANDATE"
  | "REPAYMENT";

export interface OnboardingStatus {
  nextStep: OnboardingStep;
  currentStatus: string | null;

  canApplyForNewLoan: boolean;

  kyc: {
    completed: boolean;
    status: "NOT_STARTED" | "PENDING" | "SUBMITTED" | "VERIFIED" | "REJECTED";
  };

  // Retained for compatibility with the existing API response.
  // Bank completion is derived from KYC verification in this service.
  bank: {
    completed: boolean;
    verified: boolean;
  };

  loan: {
    exists: boolean;
    status: string | null;
    loanId: string | null;
    applicationId: string | null;
    applicationStatus: string | null;
    loanProduct: unknown | null;
    completed: boolean;
    completedLoanId: string | null;
    completedLoanStatus: string | null;
    canApplyForNewLoan: boolean;
  };

  loanOffer: {
    exists: boolean;
    status: string | null;
    offerId: string | null;
    acceptedAt: string | null;
  };

  repayment: {
    exists: boolean;
    status: string | null;
    repaymentScheduleId: string | null;
  };

  mandate: {
    exists: boolean;
    status: string | null;
    mandateId: string | null;
    offerId: string | null;
  };
}

const onboardingApi = {
  async getStatus(): Promise<OnboardingStatus> {
    const response = await API.get("/onboarding/status");
    const onboarding = response.data?.onboarding;

    if (!onboarding) {
      throw new Error(
        "Invalid onboarding status response: missing onboarding data",
      );
    }

    return onboarding as OnboardingStatus;
  },

  /**
   * KYC is complete only when the backend confirms
   * completion and the status is VERIFIED.
   */
  isKycComplete(status: OnboardingStatus): boolean {
    return (
      status.kyc?.completed === true &&
      String(status.kyc?.status ?? "").trim().toUpperCase() === "VERIFIED"
    );
  },

  /**
   * A verified KYC automatically completes the bank step.
   * No separate bank verification check is required here.
   */
  isBankComplete(status: OnboardingStatus): boolean {
    return this.isKycComplete(status);
  },

  /**
   * Proceed to the loan stage once KYC is verified.
   */
  canProceedToLoan(status: OnboardingStatus): boolean {
    return this.isKycComplete(status);
  },

  /**
   * Checks whether the user is eligible to apply for a new loan.
   */
  canApplyForNewLoan(status: OnboardingStatus): boolean {
    return (
      status.canApplyForNewLoan === true ||
      status.loan?.canApplyForNewLoan === true
    );
  },

  /**
   * Checks whether the user's previous loan is completed.
   */
  isLoanCompleted(status: OnboardingStatus): boolean {
    return (
      String(status.currentStatus ?? "").toUpperCase() === "COMPLETED" ||
      status.loan?.completed === true ||
      String(status.loan?.completedLoanStatus ?? "").toUpperCase() ===
        "COMPLETED" ||
      String(status.loan?.status ?? "").toUpperCase() === "COMPLETED"
    );
  },
};

export default onboardingApi;

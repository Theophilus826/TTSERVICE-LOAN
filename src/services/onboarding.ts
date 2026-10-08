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

  /**
   * True when the user has fully repaid a previous loan
   * and does not currently have another active loan,
   * offer, or application.
   */
  canApplyForNewLoan: boolean;

  kyc: {
    completed: boolean;
    status:
      | "NOT_STARTED"
      | "PENDING"
      | "SUBMITTED"
      | "VERIFIED"
      | "REJECTED";
  };

  bank: {
    completed: boolean;
    verified: boolean;
  };

  loan: {
    exists: boolean;
    status: string | null;

    /**
     * Current loan ID, or the completed loan ID when
     * there is no active loan.
     */
    loanId: string | null;

    /**
     * Current loan application ID.
     */
    applicationId: string | null;

    /**
     * Status of the current loan application.
     */
    applicationStatus: string | null;

    /**
     * Loan product associated with the application/loan.
     */
    loanProduct: unknown | null;

    /**
     * True when the user has a completed loan.
     */
    completed: boolean;

    /**
     * ID of the most recently completed loan.
     */
    completedLoanId: string | null;

    /**
     * Status of the completed loan.
     */
    completedLoanStatus: string | null;

    /**
     * Same eligibility flag exposed at the loan level.
     */
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

    return response.data.onboarding;
  },

  /**
   * KYC is considered fully completed only when:
   * 1. The backend says kyc.completed === true
   * 2. The KYC status is VERIFIED
   *
   * This prevents the application from entering the LOAN stage
   * while any of the KYC steps are still incomplete.
   */
  isKycComplete(status: OnboardingStatus): boolean {
    return (
      status.kyc.completed === true &&
      String(status.kyc.status).trim().toUpperCase() === "VERIFIED"
    );
  },

  /**
   * The user can only proceed to the loan stage after
   * completing KYC and verifying a bank account.
   */
  canProceedToLoan(status: OnboardingStatus): boolean {
    return (
      this.isKycComplete(status) &&
      status.bank.completed === true &&
      status.bank.verified === true
    );
  },

  /**
   * The user has completely repaid a previous loan and
   * is eligible to start a new loan application.
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
      status.currentStatus === "COMPLETED" ||
      status.loan?.completed === true ||
      status.loan?.completedLoanStatus === "completed" ||
      status.loan?.status === "completed"
    );
  },
};

export default onboardingApi;
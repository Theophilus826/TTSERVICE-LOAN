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
    loanId: string | null;
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
      status.kyc.status === "VERIFIED"
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
};

export default onboardingApi;
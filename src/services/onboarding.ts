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
    const response = await API.get(
      "/onboarding/status",
    );

    return response.data.onboarding;
  },
};

export default onboardingApi;
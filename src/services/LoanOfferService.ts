
import API from "./Api";

export type LoanOfferStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "expired"
  | "cancelled";

export type InterestType =
  | "flat"
  | "reducing_balance";

export type RepaymentFrequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly";

export interface LoanProductSummary {
  _id: string;
  name: string;
  code: string;
  currency?: string;
}

export interface LoanApplicationSummary {
  _id: string;
  applicationNumber?: string;
  amountRequested?: number;
  durationDays?: number;
  purpose?: string | null;
  status?: string;
}

export interface CreditAssessmentSummary {
  _id: string;
  creditScore?: number;
  decision?: string;
  riskLevel?: string;
}

export interface LoanOffer {
  _id: string;

  user:
    | string
    | {
        _id: string;
        name?: string;
        email?: string;
      };

  loanApplication:
    | string
    | LoanApplicationSummary;

  creditAssessment:
    | string
    | CreditAssessmentSummary;

  loanProduct:
    | string
    | LoanProductSummary;

  approvedAmount: number;

  interestRate: number;
  interestType: InterestType;

  processingFee: number;
  serviceFee: number;

  totalInterest: number;
  totalFees: number;
  totalRepayment: number;

  durationDays: number;

  repaymentFrequency: RepaymentFrequency;

  installmentAmount: number;
  numberOfInstallments: number;

  status: LoanOfferStatus;

  expiresAt: string;

  acceptedAt?: string | null;
  rejectedAt?: string | null;

  createdBy?: string | null;

  createdAt?: string;
  updatedAt?: string;
}

export interface LoanCreatedFromOffer {
  _id: string;
  loanNumber?: string;

  user?: string;

  loanOffer:
    | string
    | {
        _id: string;
      };

  loanApplication?: string;
  loanProduct?: string;

  principalAmount?: number;
  interestAmount?: number;
  feeAmount?: number;
  totalRepayment?: number;

  amountDisbursed?: number;
  amountPaid?: number;
  outstandingAmount?: number;

  interestRate?: number;
  interestType?: InterestType;

  durationDays?: number;
  repaymentFrequency?: RepaymentFrequency;

  numberOfInstallments?: number;
  installmentAmount?: number;

  status?:
    | "pending_disbursement"
    | "disbursing"
    | "active"
    | "completed"
    | "overdue"
    | "defaulted"
    | "cancelled";

  disbursementMethod?: "manual" | "paystack";

  disbursementStatus?:
    | "PENDING"
    | "PROCESSING"
    | "SUCCESS"
    | "FAILED"
    | "REVERSED";

  disbursementReference?: string | null;
  manualDisbursementReference?: string | null;

  disbursedAt?: string | null;
  startDate?: string | null;
  maturityDate?: string | null;

  createdAt?: string;
  updatedAt?: string;
}

export interface AcceptOfferResult {
  offer: LoanOffer;
  loan: LoanCreatedFromOffer;
  alreadyCreated: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

const validateOfferId = (offerId: string): void => {
  if (!offerId || !offerId.trim()) {
    throw new Error("Loan offer ID is required");
  }
};

const getMyOffers = async (): Promise<LoanOffer[]> => {
  const { data } = await API.get<ApiResponse<LoanOffer[]>>(
    "/loan-offers/my",
  );

  return data.data;
};

const getOffer = async (
  offerId: string,
): Promise<LoanOffer> => {
  validateOfferId(offerId);

  const { data } = await API.get<ApiResponse<LoanOffer>>(
    `/loan-offers/${offerId}`,
  );

  return data.data;
};

const acceptOffer = async (
  offerId: string,
): Promise<AcceptOfferResult> => {
  validateOfferId(offerId);

  const { data } =
    await API.patch<ApiResponse<AcceptOfferResult>>(
      `/loan-offers/${offerId}/accept`,
    );

  return data.data;
};

const rejectOffer = async (
  offerId: string,
): Promise<LoanOffer> => {
  validateOfferId(offerId);

  const { data } = await API.patch<ApiResponse<LoanOffer>>(
    `/loan-offers/${offerId}/reject`,
  );

  return data.data;
};

const loanOfferApi = {
  getMyOffers,
  getOffer,
  acceptOffer,
  rejectOffer,
};

export default loanOfferApi;


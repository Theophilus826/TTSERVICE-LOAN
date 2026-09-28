
import API from "./Api";

// =========================================================
// TYPES
// =========================================================

export type LoanProductStatus =
  | "draft"
  | "active"
  | "inactive"
  | "archived";

export type InterestType =
  | "flat"
  | "reducing_balance";

export type ProcessingFeeType =
  | "fixed"
  | "percentage";

export type LateFeeType =
  | "fixed"
  | "percentage";

export type RepaymentFrequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly";

export type EmploymentStatus =
  | "employed"
  | "self_employed"
  | "business_owner"
  | "student"
  | "unemployed"
  | "retired"
  | "other";

export type LoanApplicationStatus =
  | "submitted"
  | "pending"
  | "under_review"
  | "credit_check"
  | "approved"
  | "offer_created"
  | "rejected"
  | "cancelled"
  | "disbursed"
  | "completed";

export type CreditDecision =
  | "pending"
  | "approved"
  | "rejected"
  | "manual_review";

// =========================================================
// PRODUCT
// =========================================================

export interface EligibilityRules {
  minAge: number;
  maxAge: number;
  minMonthlyIncome: number;
  requireKyc: boolean;
  requireBankAccount: boolean;
}

export interface LoanProductUser {
  _id: string;
  name: string;
  email?: string | null;
}

export interface LoanProduct {
  _id: string;
  name: string;
  code: string;
  description?: string | null;

  currency: string;

  minAmount: number;
  maxAmount: number;

  minDurationDays: number;
  maxDurationDays: number;

  interestRate: number;
  interestType: InterestType;

  processingFee: number;
  processingFeeType: ProcessingFeeType;

  serviceFee: number;

  lateFee: number;
  lateFeeType: LateFeeType;

  status: LoanProductStatus;

  repaymentFrequency: RepaymentFrequency;

  eligibilityRules: EligibilityRules;

  gracePeriodDays?: number;
  defaultAfterDays?: number;

  createdBy?: LoanProductUser | null;
  updatedBy?: LoanProductUser | null;

  createdAt?: string;
  updatedAt?: string;
}

// =========================================================
// LOAN TERMS
// =========================================================

export interface LoanTerms {
  principalAmount: number;

  interestAmount: number;

  feeAmount: number;

  processingFee: number;

  serviceFee: number;

  totalRepayment: number;

  numberOfInstallments: number;

  installmentAmount: number;

  interestRate: number;

  interestType: InterestType;

  durationDays: number;

  repaymentFrequency: RepaymentFrequency;

  currency: string;
}

// =========================================================
// LOAN PREVIEW
// =========================================================

export interface LoanPreview {
  product: {
    _id: string;
    name: string;
    code: string;
    currency: string;
  };

  terms: LoanTerms;
}

// =========================================================
// LOAN APPLICATION
// =========================================================

export interface LoanApplication {
  _id: string;

  applicationNumber: string;

  user: string;

  loanProduct:
    | string
    | LoanProduct;

  amountRequested: number;

  durationDays: number;

  purpose?: string | null;

  monthlyIncome?: number | null;

  employmentStatus?:
    | EmploymentStatus
    | null;

  interestRate: number;

  interestType: InterestType;

  interestAmount: number;

  feeAmount: number;

  processingFee?: number;

  serviceFee?: number;

  totalRepayment: number;

  repaymentFrequency: RepaymentFrequency;

  numberOfInstallments: number;

  installmentAmount: number;

  status: LoanApplicationStatus;

  rejectionReason?: string | null;

  submittedAt?: string | null;

  reviewedAt?: string | null;

  reviewedBy?: string | null;

  creditScore?: number | null;

  creditAssessment?: string | null;

  creditDecision?: CreditDecision;

  createdAt?: string;

  updatedAt?: string;
}

// =========================================================
// CREATE APPLICATION
// =========================================================

export interface CreateLoanApplicationData {
  loanProductId: string;

  amountRequested: number;

  durationDays: number;

  purpose?: string;

  monthlyIncome?: number;

  employmentStatus?: EmploymentStatus;
}

// =========================================================
// PREVIEW REQUEST
// =========================================================

export type LoanPreviewRequest = Pick<
  CreateLoanApplicationData,
  | "loanProductId"
  | "amountRequested"
  | "durationDays"
>;

// =========================================================
// API RESPONSE
// =========================================================

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// =========================================================
// GET ACTIVE LOAN PRODUCTS
// GET /api/loans/products
// =========================================================

const getLoanProducts =
  async (): Promise<LoanProduct[]> => {
    const { data } =
      await API.get<
        ApiResponse<LoanProduct[]>
      >("/loans/products");

    return data.data;
  };

// =========================================================
// GET SINGLE LOAN PRODUCT
// GET /api/loans/products/:id
// =========================================================

const getLoanProduct = async (
  productId: string,
): Promise<LoanProduct> => {
  if (!productId) {
    throw new Error(
      "Loan product ID is required",
    );
  }

  const { data } =
    await API.get<
      ApiResponse<LoanProduct>
    >(
      `/loans/products/${productId}`,
    );

  return data.data;
};

// =========================================================
// PREVIEW LOAN
// POST /api/loans/applications/preview
// =========================================================
//
// The backend calculates:
// - interest
// - processing fee
// - service fee
// - total repayment
// - installment amount
// - number of installments
//
// Never calculate authoritative pricing on the frontend.
//

const previewLoan = async (
  applicationData: LoanPreviewRequest,
): Promise<LoanPreview> => {
  if (
    !applicationData.loanProductId
  ) {
    throw new Error(
      "Loan product is required",
    );
  }

  if (
    !Number.isFinite(
      applicationData.amountRequested,
    ) ||
    applicationData.amountRequested <= 0
  ) {
    throw new Error(
      "A valid loan amount is required",
    );
  }

  if (
    !Number.isFinite(
      applicationData.durationDays,
    ) ||
    applicationData.durationDays <= 0
  ) {
    throw new Error(
      "A valid loan duration is required",
    );
  }

  const { data } =
    await API.post<
      ApiResponse<LoanPreview>
    >(
      "/loans/applications/preview",
      applicationData,
    );

  return data.data;
};

// =========================================================
// CREATE LOAN APPLICATION
// POST /api/loans/applications
// =========================================================
//
// The backend remains authoritative for:
// - eligibility
// - KYC verification
// - primary bank verification
// - product validation
// - pricing
// - fees
// - repayment terms
//

const createLoanApplication =
  async (
    applicationData: CreateLoanApplicationData,
  ): Promise<LoanApplication> => {
    if (
      !applicationData.loanProductId
    ) {
      throw new Error(
        "Loan product is required",
      );
    }

    if (
      !Number.isFinite(
        applicationData.amountRequested,
      ) ||
      applicationData.amountRequested <= 0
    ) {
      throw new Error(
        "A valid loan amount is required",
      );
    }

    if (
      !Number.isFinite(
        applicationData.durationDays,
      ) ||
      applicationData.durationDays <= 0
    ) {
      throw new Error(
        "A valid loan duration is required",
      );
    }

    const { data } =
      await API.post<
        ApiResponse<LoanApplication>
      >(
        "/loans/applications",
        applicationData,
      );

    return data.data;
  };

// =========================================================
// GET USER LOAN APPLICATIONS
// GET /api/loans/applications/my
// =========================================================

const getUserApplications =
  async (): Promise<LoanApplication[]> => {
    const { data } =
      await API.get<
        ApiResponse<LoanApplication[]>
      >(
        "/loans/applications/my",
      );

    return data.data;
  };

// =========================================================
// GET SINGLE USER APPLICATION
// GET /api/loans/applications/:id
// =========================================================

const getUserApplication = async (
  applicationId: string,
): Promise<LoanApplication> => {
  if (!applicationId) {
    throw new Error(
      "Loan application ID is required",
    );
  }

  const { data } =
    await API.get<
      ApiResponse<LoanApplication>
    >(
      `/loans/applications/${applicationId}`,
    );

  return data.data;
};

// =========================================================
// API
// =========================================================

const loanApi = {
  getLoanProducts,
  getLoanProduct,
  previewLoan,
  createLoanApplication,
  getUserApplications,
  getUserApplication,
};

export default loanApi;


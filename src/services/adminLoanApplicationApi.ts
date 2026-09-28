import API from "./Api";

// =========================================================
// TYPES
// =========================================================

export type AdminApplicationStatus =
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
// LOAN PRODUCT
// =========================================================

export interface AdminLoanProduct {
  _id: string;
  id?: string;

  name?: string;
  code?: string;
  currency?: string;

  minAmount?: number;
  maxAmount?: number;

  minDurationDays?: number;
  maxDurationDays?: number;

  interestRate?: number;
  interestType?:
    | "flat"
    | "reducing_balance"
    | string;

  repaymentFrequency?:
    | "daily"
    | "weekly"
    | "biweekly"
    | "monthly"
    | string;
}

// =========================================================
// APPLICANT
// =========================================================

export interface AdminApplicant {
  _id: string;
  id?: string;

  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

// =========================================================
// REVIEWED BY
// =========================================================

export interface AdminReviewedBy {
  _id: string;
  id?: string;

  name?: string;
  email?: string;
}

// =========================================================
// CREDIT ASSESSMENT
// =========================================================

export interface AdminCreditAssessment {
  _id: string;
  id?: string;

  score?: number;
  decision?:
    | "approved"
    | "rejected"
    | "manual_review"
    | "pending"
    | string;

  reason?: string | null;

  createdAt?: string;
  updatedAt?: string;
}

// =========================================================
// LOAN APPLICATION
// =========================================================

export interface AdminLoanApplication {
  _id: string;
  id?: string;

  applicationNumber: string;

  user:
    | string
    | AdminApplicant;

  loanProduct:
    | string
    | AdminLoanProduct;

  // -------------------------------------------------------
  // REQUESTED LOAN
  // -------------------------------------------------------

  amountRequested: number;

  durationDays: number;

  purpose?: string | null;

  // -------------------------------------------------------
  // FINANCIAL INFORMATION
  // -------------------------------------------------------

  monthlyIncome?: number | null;

  employmentStatus?:
    | "employed"
    | "self_employed"
    | "business_owner"
    | "student"
    | "unemployed"
    | "retired"
    | "other"
    | string
    | null;

  // -------------------------------------------------------
  // CALCULATED LOAN TERMS
  // -------------------------------------------------------

  interestRate: number;

  interestType:
    | "flat"
    | "reducing_balance"
    | string;

  interestAmount: number;

  feeAmount: number;

  processingFee?: number;

  serviceFee?: number;

  totalRepayment: number;

  repaymentFrequency:
    | "daily"
    | "weekly"
    | "biweekly"
    | "monthly"
    | string;

  numberOfInstallments: number;

  installmentAmount: number;

  // -------------------------------------------------------
  // APPLICATION STATUS
  // -------------------------------------------------------

  status: AdminApplicationStatus;

  rejectionReason?: string | null;

  // -------------------------------------------------------
  // REVIEW
  // -------------------------------------------------------

  submittedAt?: string | null;

  reviewedAt?: string | null;

  reviewedBy?:
    | string
    | AdminReviewedBy
    | null;

  // -------------------------------------------------------
  // CREDIT
  // -------------------------------------------------------

  creditScore?: number | null;

  creditAssessment?:
    | string
    | AdminCreditAssessment
    | null;

  creditDecision: CreditDecision;

  // -------------------------------------------------------
  // TIMESTAMPS
  // -------------------------------------------------------

  createdAt: string;

  updatedAt: string;
}

// =========================================================
// PAGINATION
// =========================================================

export interface ApplicationPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// =========================================================
// APPLICATION LIST RESPONSE
// =========================================================

export interface AdminApplicationsResponse {
  applications: AdminLoanApplication[];

  pagination: ApplicationPagination;
}

// =========================================================
// APPLICATION STATISTICS
// =========================================================

export interface ApplicationStats {
  total: number;

  submitted: number;
  pending: number;
  underReview: number;
  creditCheck: number;

  approved: number;
  offerCreated: number;

  rejected: number;
  cancelled: number;

  disbursed: number;
  completed: number;
}

// =========================================================
// API
// =========================================================

const adminLoanApplicationApi = {
  // =======================================================
  // GET APPLICATIONS
  // =======================================================

  async getApplications(
    params?: {
      status?: AdminApplicationStatus | "";
      search?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<AdminApplicationsResponse> {
    const response =
      await API.get(
        "/admin/loan-applications",
        {
          params,
        }
      );

    return response.data.data;
  },

  // =======================================================
  // GET SINGLE APPLICATION
  // =======================================================

  async getApplication(
    id: string
  ): Promise<AdminLoanApplication> {
    const response =
      await API.get(
        `/admin/loan-applications/${encodeURIComponent(
          id
        )}`
      );

    return response.data.data;
  },

  // =======================================================
  // GET STATISTICS
  // =======================================================

  async getStats(): Promise<ApplicationStats> {
    const response =
      await API.get(
        "/admin/loan-applications/stats"
      );

    return response.data.data;
  },

  // =======================================================
  // START REVIEW
  // =======================================================

  async startReview(
    id: string
  ): Promise<AdminLoanApplication> {
    const response =
      await API.patch(
        `/admin/loan-applications/${encodeURIComponent(
          id
        )}/review`
      );

    return response.data.data;
  },

  // =======================================================
  // SEND TO CREDIT CHECK
  // =======================================================

  async sendToCreditCheck(
    id: string
  ): Promise<AdminLoanApplication> {
    const response =
      await API.patch(
        `/admin/loan-applications/${encodeURIComponent(
          id
        )}/credit-check`
      );

    return response.data.data;
  },

  // =======================================================
  // APPROVE APPLICATION
  // =======================================================

  async approveApplication(
    id: string
  ): Promise<AdminLoanApplication> {
    const response =
      await API.patch(
        `/admin/loan-applications/${encodeURIComponent(
          id
        )}/approve`
      );

    return response.data.data;
  },

  // =======================================================
  // REJECT APPLICATION
  // =======================================================

  async rejectApplication(
    id: string,
    rejectionReason: string
  ): Promise<AdminLoanApplication> {
    const response =
      await API.patch(
        `/admin/loan-applications/${encodeURIComponent(
          id
        )}/reject`,
        {
          rejectionReason,
        }
      );

    return response.data.data;
  },

  // =======================================================
  // CANCEL APPLICATION
  // =======================================================

  async cancelApplication(
    id: string
  ): Promise<AdminLoanApplication> {
    const response =
      await API.patch(
        `/admin/loan-applications/${encodeURIComponent(
          id
        )}/cancel`
      );

    return response.data.data;
  },

  // =======================================================
  // GENERIC STATUS UPDATE
  // =======================================================

  async updateApplicationStatus(
    id: string,
    status: AdminApplicationStatus,
    rejectionReason?: string
  ): Promise<AdminLoanApplication> {
    const response =
      await API.patch(
        `/admin/loan-applications/${encodeURIComponent(
          id
        )}/status`,
        {
          status,
          rejectionReason,
        }
      );

    return response.data.data;
  },
};

export default adminLoanApplicationApi;
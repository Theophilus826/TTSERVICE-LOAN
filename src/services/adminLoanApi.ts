import API from "./Api";

export type AdminLoanStatus =
  | "pending_disbursement"
  | "disbursing"
  | "active"
  | "completed"
  | "overdue"
  | "defaulted"
  | "cancelled";

export type DisbursementStatus =
  | "PENDING"
  | "PROCESSING"
  | "SUCCESS"
  | "FAILED"
  | "REVERSED";

export type DisbursementMethod =
  | "manual"
  | "paystack";

export interface AdminLoanUser {
  _id: string;
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

export interface AdminLoanProduct {
  _id: string;
  id?: string;
  name?: string;
  code?: string;
  currency?: string;
}

export interface AdminLoanApplication {
  _id: string;
  id?: string;
  applicationNumber?: string;
}

export type AdminRepaymentInstallmentStatus =
  | "pending"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "waived"
  | string;

export interface AdminRepaymentInstallment {
  installmentNumber: number;
  dueDate: string;

  principalAmount: number;
  interestAmount: number;
  feeAmount: number;

  totalAmount: number;

  paidAmount: number;
  remainingAmount: number;

  status: AdminRepaymentInstallmentStatus;

  paidAt?: string | null;
  overdueAt?: string | null;
}

export type AdminRepaymentScheduleStatus =
  | "active"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "defaulted"
  | "cancelled"
  | string;

export interface AdminRepaymentSchedule {
  _id: string;
  id?: string;

  status?: AdminRepaymentScheduleStatus;

  totalInterest?: number;
  totalFees?: number;
  totalRepaymentAmount?: number;

  amountPaid?: number;
  amountOutstanding?: number;

  startDate?: string;
  finalDueDate?: string;

  installments?: AdminRepaymentInstallment[];
}

export interface AdminLoan {
  _id: string;
  id?: string;

  user: string | AdminLoanUser;

  loanOffer?: string | null;

  loanApplication:
    | string
    | AdminLoanApplication
    | null;

  loanProduct:
    | string
    | AdminLoanProduct
    | null;

  loanNumber: string;

  principalAmount: number;
  interestAmount: number;
  feeAmount: number;
  totalRepayment: number;

  amountDisbursed: number;
  amountPaid: number;
  outstandingAmount: number;

  interestRate: number;

  interestType:
    | "flat"
    | "reducing_balance"
    | string;

  durationDays: number;

  repaymentFrequency:
    | "daily"
    | "weekly"
    | "biweekly"
    | "monthly"
    | string;

  numberOfInstallments: number;
  installmentAmount: number;

  status: AdminLoanStatus;

  disbursementMethod: DisbursementMethod;

  disbursementStatus: DisbursementStatus;

  disbursementReference?: string | null;

  manualDisbursementReference?: string | null;

  paystackTransferCode?: string | null;

  paystackTransferId?: string | null;

  disbursementReason?: string | null;

  disbursedAt?: string | null;

  startDate?: string | null;

  maturityDate?: string | null;

  repaymentSchedule?:
    | string
    | AdminRepaymentSchedule
    | null;

  createdAt: string;
  updatedAt: string;
}

export interface LoanPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface AdminLoansResponse {
  loans: AdminLoan[];
  pagination: LoanPagination;
}

export interface AdminLoanStats {
  total: number;

  pendingDisbursement: number;
  disbursing: number;

  active: number;
  completed: number;

  overdue: number;
  defaulted: number;
  cancelled: number;

  totalPrincipal: number;
  totalDisbursed: number;
  totalPaid: number;
  totalOutstanding: number;
}

export interface ManualDisbursementStartResponse {
  started?: boolean;
  alreadyCompleted?: boolean;
  alreadyProcessing?: boolean;

  reference?: string;

  loan: AdminLoan;

  bankAccount?: {
    bankName?: string;
    accountName?: string;
    accountNumberLast4?: string;
  };

  disbursement?: unknown;
}

export interface ManualDisbursementCompleteResponse {
  alreadyCompleted?: boolean;

  loan: AdminLoan;

  bankAccount?: {
    bankName?: string;
    accountName?: string;
    accountNumberLast4?: string;
  };
}

export interface PaystackDisbursementResponse {
  initiated?: boolean;
  waitingForWebhook?: boolean;
  alreadyCompleted?: boolean;
  alreadyProcessing?: boolean;

  reference?: string;

  providerResult?: unknown;

  loan: AdminLoan;
}

const adminLoanApi = {
  /**
   * Get paginated admin loans.
   */
  async getLoans(params?: {
    status?: AdminLoanStatus | "";
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<AdminLoansResponse> {
    const response = await API.get("/admin/loans", {
      params,
    });

    return response.data.data;
  },

  /**
   * Get one admin loan.
   */
  async getLoan(id: string): Promise<AdminLoan> {
    const response = await API.get(
      `/admin/loans/${encodeURIComponent(id)}`
    );

    return response.data.data;
  },

  /**
   * Get loan statistics.
   */
  async getStats(): Promise<AdminLoanStats> {
    const response = await API.get(
      "/admin/loans/stats"
    );

    return response.data.data;
  },

  /**
   * Start Paystack disbursement.
   *
   * The loan remains PROCESSING until the
   * Paystack webhook confirms success.
   */
  async initiatePaystackDisbursement(
    id: string
  ): Promise<PaystackDisbursementResponse> {
    const response = await API.post(
      `/admin/loans/${encodeURIComponent(
        id
      )}/disburse/paystack`
    );

    return response.data.data;
  },

  /**
   * Start manual disbursement.
   *
   * This changes the loan to:
   *
   * disbursing / PROCESSING
   *
   * It does NOT mark the loan as successful.
   */
  async startManualDisbursement(
    id: string
  ): Promise<ManualDisbursementStartResponse> {
    const response = await API.post(
      `/admin/loans/${encodeURIComponent(
        id
      )}/disburse/manual/start`
    );

    return response.data.data;
  },

  /**
   * Complete manual disbursement.
   *
   * The admin should only call this after
   * actually sending the money.
   */
  async completeManualDisbursement(
    id: string,
    data: {
      reference: string;
    }
  ): Promise<ManualDisbursementCompleteResponse> {
    const response = await API.post(
      `/admin/loans/${encodeURIComponent(
        id
      )}/disburse/manual`,
      data
    );

    return response.data.data;
  },

  /**
   * Cancel a loan.
   */
  async cancelLoan(
    id: string,
    reason?: string
  ): Promise<AdminLoan> {
    const response = await API.patch(
      `/admin/loans/${encodeURIComponent(id)}/cancel`,
      {
        reason,
      }
    );

    return response.data.data;
  },
};

export default adminLoanApi;
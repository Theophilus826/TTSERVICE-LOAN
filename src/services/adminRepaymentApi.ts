import API from "./Api";

export type AdminRepaymentStatus =
  | "pending"
  | "processing"
  | "successful"
  | "failed"
  | "reversed";

export type AdminRepaymentSource =
  | "repayment_account"
  | "customer_payment"
  | "mandate"
  | "admin_adjustment";

export type AdminRepaymentPaymentMethod =
  | "bank_transfer"
  | "card"
  | "direct_debit"
  | "wallet"
  | "cash"
  | "other";

export interface AdminRepaymentUser {
  _id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
}

export interface AdminRepaymentLoan {
  _id: string;
  loanNumber?: string;
  principalAmount?: number;
  totalRepayment?: number;
  amountPaid?: number;
  outstandingAmount?: number;
  status?: string;
  repaymentFrequency?: string;
}

export interface AdminRepaymentSchedule {
  _id: string;
  principalAmount?: number;
  totalRepaymentAmount?: number;
  amountPaid?: number;
  amountOutstanding?: number;
  status?: string;
  startDate?: string;
  finalDueDate?: string;
}

export interface AdminRepayment {
  _id: string;

  user?: AdminRepaymentUser;

  loan?: AdminRepaymentLoan;

  loanApplication?: {
    _id: string;
    applicationNumber?: string;
    amountRequested?: number;
    status?: string;
  };

  repaymentSchedule?: AdminRepaymentSchedule;

  repaymentAccount?: {
    _id: string;
    accountNumber?: string;
    accountName?: string;
    bankName?: string;
    currency?: string;
    balance?: number;
    status?: string;
  };

  mandate?: {
    _id: string;
    mandateReference?: string;
    provider?: string;
    status?: string;
    amountLimit?: number;
    frequency?: string;
    startDate?: string;
    endDate?: string;
  };

  amount: number;
  currency: string;

  paymentReference: string;

  repaymentSource?: AdminRepaymentSource;

  paymentMethod?: AdminRepaymentPaymentMethod;

  provider?: string;
  providerReference?: string;

  status: AdminRepaymentStatus;

  failureReason?: string;

  allocatedAmount?: number;
  unallocatedAmount?: number;

  paidAt?: string;

  createdAt?: string;
  updatedAt?: string;
}

export interface AdminRepaymentsPagination {
  items: AdminRepayment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetAdminRepaymentsParams {
  status?: AdminRepaymentStatus | "";
  repaymentSource?: AdminRepaymentSource | "";
  userId?: string;
  loanId?: string;
  page?: number;
  limit?: number;
}

export interface CollectMandateRepaymentResponse {
  repaymentId: string;

  loanId: string;

  paymentReference: string;

  providerReference?: string;

  amount: number;

  currency: string;

  status: AdminRepaymentStatus;

  provider: string;

  providerStatus?: string | null;

  providerTransactionId?: string | null;

  providerResponse?: {
    status?: string | null;
    reference?: string | null;
    transactionId?: string | null;
    gatewayResponse?: string | null;
    gatewayResponseCode?: string | null;
    responseCode?: string | null;
    amount?: number | null;
    currency?: string | null;
  };

  failureReason?: string | null;
}

/**
 * Response returned when an admin reconciles an existing
 * Paystack DVA payment against a loan.
 */
export interface ReconcilePaymentResponse {
  loanId: string;

  repaymentId?: string;

  provider: string;

  providerReference: string;

  amount: number;

  currency: string;

  repaymentScheduleId?: string;

  repaymentApplied?: boolean;

  alreadyProcessed?: boolean;

  accountId?: string;

  fundingTransactionId?: string;

  message?: string;
}

const adminRepaymentApi = {
  async getRepayments(
    params: GetAdminRepaymentsParams = {}
  ): Promise<AdminRepaymentsPagination> {
    const response = await API.get("/admin/repayments", {
      params,
    });

    return response.data.data;
  },

  async collectMandateRepayment(
    loanId: string,
    amount: number
  ): Promise<CollectMandateRepaymentResponse> {
    const response = await API.post(
      `/admin/repayments/loans/${encodeURIComponent(
        loanId
      )}/repayments/collect`,
      {
        amount,
      }
    );

    return response.data.data;
  },

  /**
   * Reconcile a Paystack DVA payment that was credited to the
   * repayment account but was not applied to the loan.
   */
  async reconcilePayment(
    loanId: string,
    providerReference: string
  ): Promise<ReconcilePaymentResponse> {
    const response = await API.post(
      `/admin/repayments/loans/${encodeURIComponent(
        loanId
      )}/repayments/reconcile`,
      {
        providerReference,
      }
    );

    return response.data.data;
  },
};

export default adminRepaymentApi;
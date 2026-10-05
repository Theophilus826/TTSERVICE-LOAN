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
  paymentReference: string;
  amount: number;
  status: AdminRepaymentStatus;
  provider: string;
  providerResponse?: unknown;
}

const adminRepaymentApi = {
  async getRepayments(
    params: GetAdminRepaymentsParams = {}
  ): Promise<AdminRepaymentsPagination> {
    const response = await API.get(
      "/admin/repayments",
      {
        params,
      }
    );

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
};

export default adminRepaymentApi;
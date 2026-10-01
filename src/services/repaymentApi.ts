
import API from "./Api";

/* =========================================================
TYPES
========================================================= */

export type RepaymentStatus =
  | "pending"
  | "processing"
  | "successful"
  | "failed"
  | "reversed";

export type PaymentMethod =
  | "bank_transfer"
  | "card"
  | "direct_debit"
  | "wallet"
  | "cash"
  | "other";

export type RepaymentSource =
  | "repayment_account"
  | "customer_payment"
  | "mandate"
  | "admin_adjustment";

/* =========================================================
INSTALLMENT
========================================================= */

export type RepaymentInstallment = {
  _id: string;
  installmentNumber: number;
  dueDate: string;
  principalAmount: number;
  interestAmount: number;
  feeAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;

  status:
    | "active"
    | "partially_paid"
    | "paid"
    | "overdue"
    | "defaulted"
    | "cancelled";

  paidAt?: string | null;
  overdueAt?: string | null;
};

/* =========================================================
REPAYMENT SCHEDULE
========================================================= */

export type RepaymentScheduleStatus =
  | "active"
  | "partially_paid"
  | "overdue"
  | "paid"
  | "defaulted"
  | "cancelled";

export type RepaymentSchedule = {
  _id: string;

  user?: string;

  loan?: string | null;

  loanApplication?:
    | string
    | {
        _id?: string;
        applicationNumber?: string;
        amountRequested?: number;
        status?: string;
      }
    | null;

  loanOffer?:
    | string
    | {
        _id?: string;
        approvedAmount?: number;
        interestRate?: number;
      }
    | null;

  disbursement?:
    | string
    | {
        _id?: string;
        amount?: number;
        status?: string;
      }
    | null;

  currency?: string;

  principalAmount: number;
  totalInterest: number;
  totalFees: number;
  totalRepaymentAmount: number;
  amountPaid: number;
  amountOutstanding: number;

  status: RepaymentScheduleStatus;

  startDate: string;
  finalDueDate: string;

  installments: RepaymentInstallment[];

  createdAt?: string;
  updatedAt?: string;
};

/* =========================================================
REPAYMENT
========================================================= */

export type RepaymentAllocation = {
  installmentId: string;
  installmentNumber: number;
  amount: number;
};

export type Repayment = {
  _id: string;

  user?: string;
  loan?: string | null;

  loanApplication?:
    | string
    | {
        _id?: string;
        applicationNumber?: string;
        amountRequested?: number;
        status?: string;
      }
    | null;

  repaymentSchedule?:
    | string
    | {
        _id?: string;
        principalAmount?: number;
        totalInterest?: number;
        totalFees?: number;
        totalRepaymentAmount?: number;
        amountPaid?: number;
        amountOutstanding?: number;
        status?: string;
      }
    | null;

  paymentReference: string;

  amount: number;

  currency?: string;

  paymentMethod: PaymentMethod;

  repaymentSource?: RepaymentSource;

  repaymentAccount?: string | null;

  mandate?: string | null;

  provider?: string | null;

  providerReference?: string | null;

  status: RepaymentStatus;

  failureReason?: string | null;

  allocatedAmount?: number;

  unallocatedAmount?: number;

  allocation?: RepaymentAllocation[];

  paidAt?: string | null;

  reversedAt?: string | null;

  reversalReason?: string | null;

  createdAt?: string;
  updatedAt?: string;
};

/* =========================================================
PAYMENT INITIALIZATION
========================================================= */

export type InitiateRepaymentPayload = {
  repaymentScheduleId: string;
  amount: number;
  paymentMethod: PaymentMethod;
};

export type RepaymentPayment = {
  reference: string;

  authorizationUrl?: string | null;

  accessCode?: string | null;

  provider?: string | null;

  status?: string | null;
};

/* =========================================================
REPAYMENT ACCOUNT
========================================================= */

export type RepaymentAccountStatus =
  | "active"
  | "suspended"
  | "closed";

export type RepaymentAccount = {
  _id: string;

  user: string;

  accountNumber?: string | null;

  accountName?: string | null;

  bankName?: string | null;

  currency: string;

  balance: number;

  totalCredited: number;

  totalRepaid: number;

  status: RepaymentAccountStatus;

  provider?: string | null;

  providerCustomerCode?: string | null;

  providerAccountId?: string | null;

  createdAt?: string;

  updatedAt?: string;
};

/* =========================================================
REPAYMENT ACCOUNT TRANSACTION
========================================================= */

export type RepaymentAccountTransactionType =
  | "credit"
  | "debit"
  | "reversal"
  | "refund";

export type RepaymentAccountTransactionStatus =
  | "pending"
  | "successful"
  | "failed"
  | "reversed";

export type RepaymentAccountTransactionPurpose =
  | "account_funding"
  | "loan_repayment"
  | "repayment_reversal"
  | "refund"
  | "manual_adjustment";

export type RepaymentAccountTransaction = {
  _id: string;

  repaymentAccount: string;

  user: string;

  type: RepaymentAccountTransactionType;

  status: RepaymentAccountTransactionStatus;

  amount: number;

  currency: string;

  balanceBefore: number;

  balanceAfter: number;

  purpose: RepaymentAccountTransactionPurpose;

  loan?: string | null;

  loanApplication?: string | null;

  repaymentSchedule?: string | null;

  repayment?: string | null;

  provider?: string | null;

  providerReference?: string | null;

  providerData?: unknown;

  description?: string | null;

  failureReason?: string | null;

  reversalReason?: string | null;

  processedAt?: string | null;

  failedAt?: string | null;

  reversedAt?: string | null;

  createdAt?: string;

  updatedAt?: string;
};

/* =========================================================
ACCOUNT FUNDING
========================================================= */

export type FundRepaymentAccountPayload = {
  amount: number;
};

export type FundRepaymentAccountResponse = {
  success: boolean;

  message?: string;

  data?: {
    transaction?: RepaymentAccountTransaction;

    paymentReference?: string;

    providerReference?: string;

    authorizationUrl?: string | null;

    accessCode?: string | null;
  };
};

/* =========================================================
ACCOUNT RESPONSE TYPES
========================================================= */

export type RepaymentAccountResponse = {
  success: boolean;

  message?: string;

  data?: RepaymentAccount;
};

/* =========================================================
BALANCE RESPONSE
========================================================= */

export type RepaymentAccountBalance = {
  accountId?: string;

  balance: number;

  currency?: string;

  totalCredited?: number;

  totalRepaid?: number;

  status?: RepaymentAccountStatus;

  // DVA details
  accountNumber?: string | null;

  accountName?: string | null;

  bankName?: string | null;

  provider?: string | null;

  providerCustomerCode?: string | null;

  providerAccountId?: string | null;
};

export type RepaymentAccountBalanceResponse = {
  success: boolean;

  message?: string;

  data?: RepaymentAccountBalance;
};

/* =========================================================
TRANSACTION RESPONSES
========================================================= */

export type RepaymentAccountTransactionsResponse = {
  success: boolean;

  message?: string;

  data?: {
    transactions: RepaymentAccountTransaction[];

    page?: number;

    limit?: number;

    total?: number;

    totalPages?: number;
  };
};

export type RepaymentAccountTransactionResponse = {
  success: boolean;

  message?: string;

  data?: RepaymentAccountTransaction;
};

/* =========================================================
REPAYMENT RESPONSES
========================================================= */

export type RepaymentResponse = {
  success: boolean;

  message?: string;

  data?: {
    repayment?: Repayment;

    payment?: RepaymentPayment;
  };
};

export type RepaymentScheduleResponse = {
  success: boolean;

  message?: string;

  data?: RepaymentSchedule;
};

export type RepaymentHistoryResponse = {
  success: boolean;

  message?: string;

  count?: number;

  data?: Repayment[];
};

export type RepaymentDetailsResponse = {
  success: boolean;

  message?: string;

  data?: Repayment;
};

/* =========================================================
BASE URLS
========================================================= */

const BASE_URL = "/repayments";

const REPAYMENT_ACCOUNT_URL =
  "/repayment-account";

/* =========================================================
VALIDATION
========================================================= */

const requireId = (
  value: string,
  fieldName: string,
) => {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${fieldName} is required.`,
    );
  }

  return value.trim();
};

const requireAmount = (
  value: number,
) => {
  const amount = Number(value);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "Amount must be greater than zero.",
    );
  }

  return amount;
};

/* =========================================================
GET REPAYMENT SCHEDULE
========================================================= */

const getRepaymentSchedule = async (
  repaymentScheduleId: string,
): Promise<RepaymentScheduleResponse> => {
  const id = requireId(
    repaymentScheduleId,
    "Repayment schedule ID",
  );

  const response =
    await API.get<RepaymentScheduleResponse>(
      `${BASE_URL}/schedule/${encodeURIComponent(id)}`,
    );

  return response.data;
};

/* =========================================================
INITIATE REPAYMENT
========================================================= */

const initiateRepayment = async (
  payload: InitiateRepaymentPayload,
): Promise<RepaymentResponse> => {
  const repaymentScheduleId =
    requireId(
      payload.repaymentScheduleId,
      "Repayment schedule ID",
    );

  const amount =
    requireAmount(payload.amount);

  if (!payload.paymentMethod) {
    throw new Error(
      "Payment method is required.",
    );
  }

  const response =
    await API.post<RepaymentResponse>(
      `${BASE_URL}/initiate`,
      {
        repaymentScheduleId,
        amount,
        paymentMethod:
          payload.paymentMethod,
      },
    );

  return response.data;
};

/* =========================================================
REPAY FROM REPAYMENT ACCOUNT
========================================================= */

const repayFromAccount = async (
  repaymentScheduleId: string,
  amount: number,
): Promise<RepaymentResponse> => {
  const id = requireId(
    repaymentScheduleId,
    "Repayment schedule ID",
  );

  const numericAmount =
    requireAmount(amount);

  const response =
    await API.post<RepaymentResponse>(
      `${BASE_URL}/account`,
      {
        repaymentScheduleId: id,
        amount: numericAmount,
      },
    );

  return response.data;
};

/* =========================================================
REPAYMENT HISTORY
========================================================= */

const getRepaymentHistory =
  async (): Promise<RepaymentHistoryResponse> => {
    const response =
      await API.get<RepaymentHistoryResponse>(
        `${BASE_URL}/history`,
      );

    return response.data;
  };

/* =========================================================
REPAYMENT DETAILS
========================================================= */

const getRepayment = async (
  repaymentId: string,
): Promise<RepaymentDetailsResponse> => {
  const id = requireId(
    repaymentId,
    "Repayment ID",
  );

  const response =
    await API.get<RepaymentDetailsResponse>(
      `${BASE_URL}/${encodeURIComponent(id)}`,
    );

  return response.data;
};

/* =========================================================
GET REPAYMENT ACCOUNT
========================================================= */

const getRepaymentAccount =
  async (): Promise<RepaymentAccountResponse> => {
    const response =
      await API.get<RepaymentAccountResponse>(
        REPAYMENT_ACCOUNT_URL,
      );

    return response.data;
  };

/* =========================================================
GET REPAYMENT ACCOUNT BALANCE
========================================================= */

const getRepaymentAccountBalance =
  async (): Promise<RepaymentAccountBalanceResponse> => {
    const response =
      await API.get<RepaymentAccountBalanceResponse>(
        `${REPAYMENT_ACCOUNT_URL}/balance`,
      );

    return response.data;
  };

/* =========================================================
FUND REPAYMENT ACCOUNT
========================================================= */

const fundRepaymentAccount =
  async (
    payload: FundRepaymentAccountPayload,
  ): Promise<FundRepaymentAccountResponse> => {
    const amount =
      requireAmount(payload.amount);

    const response =
      await API.post<FundRepaymentAccountResponse>(
        `${REPAYMENT_ACCOUNT_URL}/fund`,
        {
          amount,
        },
      );

    return response.data;
  };

/* =========================================================
GET REPAYMENT ACCOUNT TRANSACTIONS
========================================================= */

const getRepaymentAccountTransactions =
  async ({
    page = 1,
    limit = 20,
    type,
    status,
    purpose,
  }: {
    page?: number;

    limit?: number;

    type?: RepaymentAccountTransactionType;

    status?: RepaymentAccountTransactionStatus;

    purpose?: RepaymentAccountTransactionPurpose;
  } = {}): Promise<RepaymentAccountTransactionsResponse> => {
    const response =
      await API.get<RepaymentAccountTransactionsResponse>(
        `${REPAYMENT_ACCOUNT_URL}/transactions`,
        {
          params: {
            page,
            limit,
            ...(type ? { type } : {}),
            ...(status ? { status } : {}),
            ...(purpose ? { purpose } : {}),
          },
        },
      );

    return response.data;
  };

/* =========================================================
GET REPAYMENT ACCOUNT TRANSACTION
========================================================= */

const getRepaymentAccountTransaction =
  async (
    transactionId: string,
  ): Promise<RepaymentAccountTransactionResponse> => {
    const id = requireId(
      transactionId,
      "Transaction ID",
    );

    const response =
      await API.get<RepaymentAccountTransactionResponse>(
        `${REPAYMENT_ACCOUNT_URL}/transactions/${encodeURIComponent(id)}`,
      );

    return response.data;
  };

/* =========================================================
EXPORT
========================================================= */

const repaymentApi = {
  // Repayments
  getRepaymentSchedule,
  initiateRepayment,
  repayFromAccount,
  getRepaymentHistory,
  getRepayment,

  // Repayment account
  getRepaymentAccount,
  getRepaymentAccountBalance,
  fundRepaymentAccount,
  getRepaymentAccountTransactions,
  getRepaymentAccountTransaction,
};

export default repaymentApi;


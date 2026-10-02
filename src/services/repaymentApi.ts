import API from "./Api";

/* =========================================================
   REPAYMENT TYPES
========================================================= */

export type RepaymentStatus =
  | "pending"
  | "processing"
  | "successful"
  | "failed"
  | "reversed"
  | "cancelled";

export type PaymentMethod =
  | "account"
  | "card"
  | "bank_transfer";

export type RepaymentSource =
  | "manual"
  | "automatic"
  | "account"
  | "paystack"
  | "admin";

export type RepaymentScheduleStatus =
  | "pending"
  | "due"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

/* =========================================================
   REPAYMENT SCHEDULE
========================================================= */

export type RepaymentSchedule = {
  _id: string;

  loan?: string;

  loanApplication?: string;

  user?: string;

  installmentNumber?: number;

  amountDue: number;

  amountPaid?: number;

  remainingAmount?: number;

  totalDue?: number;

  principal?: number;

  interest?: number;

  penalty?: number;

  dueDate?: string;

  paidAt?: string | null;

  status?: RepaymentScheduleStatus | string;

  createdAt?: string;

  updatedAt?: string;
};

/* =========================================================
   REPAYMENT
========================================================= */

export type Repayment = {
  _id: string;

  user?: string;

  loan?: string;

  loanApplication?: string;

  repaymentSchedule?: string;

  amount: number;

  currency?: string;

  status: RepaymentStatus;

  paymentMethod?: PaymentMethod;

  source?: RepaymentSource;

  reference?: string | null;

  providerReference?: string | null;

  description?: string | null;

  createdAt?: string;

  updatedAt?: string;

  processedAt?: string | null;

  failedAt?: string | null;
};

/* =========================================================
   REPAYMENT RESPONSE
========================================================= */

export type RepaymentResponse = {
  success: boolean;

  message?: string;

  data?: Repayment | null;
};

/* =========================================================
   REPAYMENT LIST RESPONSE
========================================================= */

export type RepaymentsResponse = {
  success: boolean;

  message?: string;

  data?: {
    repayments: Repayment[];

    page?: number;

    limit?: number;

    total?: number;

    totalPages?: number;
  };
};

/* =========================================================
   REPAYMENT SCHEDULE RESPONSE
========================================================= */

export type RepaymentScheduleResponse = {
  success: boolean;

  message?: string;

  data?: RepaymentSchedule | null;
};

/* =========================================================
   REPAYMENT ACCOUNT / DVA TYPES
========================================================= */

export type DvaStatus =
  | "pending"
  | "active"
  | "failed";

export type RepaymentAccountStatus =
  | "active"
  | "suspended"
  | "closed";

/* =========================================================
   REPAYMENT ACCOUNT / DVA
========================================================= */

export type RepaymentAccount = {
  _id: string;

  user?: string;

  accountNumber?: string | null;

  accountName?: string | null;

  bankName?: string | null;

  bankCode?: string | null;

  currency: string;

  balance: number;

  totalCredited: number;

  totalRepaid: number;

  status: RepaymentAccountStatus;

  provider?: string | null;

  providerCustomerCode?: string | null;

  providerAccountId?: string | null;

  dvaStatus?: DvaStatus;

  createdAt?: string;

  updatedAt?: string;
};

/* =========================================================
   DVA RESPONSE
========================================================= */

export type RepaymentAccountResponse = {
  success: boolean;

  message?: string;

  data?: RepaymentAccount | null;
};

/* =========================================================
   DVA BALANCE
========================================================= */

export type RepaymentAccountBalance = {
  accountId?: string;

  balance: number;

  currency?: string;

  totalCredited?: number;

  totalRepaid?: number;

  status?: RepaymentAccountStatus;

  dvaStatus?: DvaStatus;

  accountNumber?: string | null;

  accountName?: string | null;

  bankName?: string | null;

  bankCode?: string | null;

  provider?: string | null;

  providerCustomerCode?: string | null;

  providerAccountId?: string | null;
};

export type RepaymentAccountBalanceResponse = {
  success: boolean;

  message?: string;

  data?: RepaymentAccountBalance | null;
};

/* =========================================================
   DVA TRANSACTIONS
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
   DVA TRANSACTION RESPONSES
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

  data?: RepaymentAccountTransaction | null;
};

/* =========================================================
   URLS
========================================================= */

const REPAYMENT_URL = "/repayments";

const DVA_URL = "/repayment-account";

/* =========================================================
   REPAYMENT SCHEDULE
========================================================= */

const getRepaymentSchedule =
  async (): Promise<RepaymentScheduleResponse> => {
    const response =
      await API.get<RepaymentScheduleResponse>(
        `${REPAYMENT_URL}/schedule`,
      );

    return response.data;
  };

/* =========================================================
   INITIATE REPAYMENT
========================================================= */

const initiateRepayment = async ({
  amount,
  paymentMethod,
}: {
  amount: number;

  paymentMethod: PaymentMethod;
}): Promise<RepaymentResponse> => {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("A valid repayment amount is required.");
  }

  const response =
    await API.post<RepaymentResponse>(
      `${REPAYMENT_URL}/initiate`,
      {
        amount,
        paymentMethod,
      },
    );

  return response.data;
};

/* =========================================================
   REPAY FROM REPAYMENT ACCOUNT / DVA
========================================================= */

const repayFromAccount = async ({
  amount,
}: {
  amount: number;
}): Promise<RepaymentResponse> => {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("A valid repayment amount is required.");
  }

  const response =
    await API.post<RepaymentResponse>(
      `${REPAYMENT_URL}/account`,
      {
        amount,
      },
    );

  return response.data;
};

/* =========================================================
   GET REPAYMENTS
========================================================= */

const getRepayments = async ({
  page = 1,
  limit = 20,
  status,
}: {
  page?: number;

  limit?: number;

  status?: RepaymentStatus;
} = {}): Promise<RepaymentsResponse> => {
  const response =
    await API.get<RepaymentsResponse>(
      REPAYMENT_URL,
      {
        params: {
          page,
          limit,

          ...(status ? { status } : {}),
        },
      },
    );

  return response.data;
};

/* =========================================================
   GET SINGLE REPAYMENT
========================================================= */

const getRepayment = async (
  repaymentId: string,
): Promise<RepaymentResponse> => {
  if (
    typeof repaymentId !== "string" ||
    !repaymentId.trim()
  ) {
    throw new Error("Repayment ID is required.");
  }

  const response =
    await API.get<RepaymentResponse>(
      `${REPAYMENT_URL}/${encodeURIComponent(
        repaymentId.trim(),
      )}`,
    );

  return response.data;
};

/* =========================================================
   GET MY DVA
========================================================= */

const getRepaymentAccount =
  async (): Promise<RepaymentAccountResponse> => {
    const response =
      await API.get<RepaymentAccountResponse>(
        DVA_URL,
      );

    return response.data;
  };

/* =========================================================
   GET DVA BALANCE
========================================================= */

const getRepaymentAccountBalance =
  async (): Promise<RepaymentAccountBalanceResponse> => {
    const response =
      await API.get<RepaymentAccountBalanceResponse>(
        `${DVA_URL}/balance`,
      );

    return response.data;
  };

/* =========================================================
   GET DVA TRANSACTIONS
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
        `${DVA_URL}/transactions`,
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
   GET SINGLE DVA TRANSACTION
========================================================= */

const getRepaymentAccountTransaction =
  async (
    transactionId: string,
  ): Promise<RepaymentAccountTransactionResponse> => {
    if (
      typeof transactionId !== "string" ||
      !transactionId.trim()
    ) {
      throw new Error(
        "Transaction ID is required.",
      );
    }

    const response =
      await API.get<RepaymentAccountTransactionResponse>(
        `${DVA_URL}/transactions/${encodeURIComponent(
          transactionId.trim(),
        )}`,
      );

    return response.data;
  };

/* =========================================================
   EXPORT
========================================================= */

const repaymentApi = {
  /* Loan repayment */
  getRepaymentSchedule,
  initiateRepayment,
  repayFromAccount,
  getRepayments,
  getRepayment,

  /* DVA / repayment account */
  getRepaymentAccount,
  getRepaymentAccountBalance,
  getRepaymentAccountTransactions,
  getRepaymentAccountTransaction,
};

export default repaymentApi;
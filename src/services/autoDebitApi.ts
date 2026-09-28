
import API from "./Api";

/* =========================================================
   AUTO-DEBIT STATUS
========================================================= */

export type AutoDebitStatus =
  | "pending"
  | "processing"
  | "successful"
  | "failed"
  | "reversed";

/* =========================================================
   AUTO-DEBIT
========================================================= */

export interface AutoDebit {
  _id: string;

  user?: string | null;

  loanApplication?: {
    _id?: string;

    applicationNumber?: string;

    amountRequested?: number;

    status?: string;
  } | null;

  repaymentSchedule?: {
    _id?: string;

    principalAmount?: number;

    totalRepaymentAmount?: number;

    amountPaid?: number;

    amountOutstanding?: number;

    status?: string;
  } | null;

  mandate?: {
    _id?: string;

    status?: string;
  } | null;

  bankAccount?: {
    _id?: string;

    bankName?: string;

    bankCode?: string;

    accountName?: string;

    accountNumberLast4?: string;
  } | null;

  repayment?: string | null;

  debitReference: string;

  amount: number;

  currency?: string;

  provider?: string | null;

  providerReference?: string | null;

  status: AutoDebitStatus;

  failureReason?: string | null;

  /*
   * Provider data should normally be restricted
   * by the backend. It is kept optional here because
   * some admin responses may include it.
   */
  providerData?: unknown;

  retryCount?: number;

  nextRetryAt?: string | null;

  initiatedAt?: string | null;

  completedAt?: string | null;

  failedAt?: string | null;

  createdAt?: string;

  updatedAt?: string;
}

/* =========================================================
   INITIATE AUTO-DEBIT REQUEST
========================================================= */

export interface InitiateAutoDebitPayload {
  repaymentScheduleId: string;

  amount: number;
}

/* =========================================================
   SINGLE RESPONSE
========================================================= */

export interface AutoDebitResponse {
  success: boolean;

  data?: AutoDebit | null;

  message?: string;
}

/* =========================================================
   LIST RESPONSE
========================================================= */

export interface AutoDebitListResponse {
  success: boolean;

  data?: AutoDebit[];

  count?: number;

  message?: string;
}

/* =========================================================
   BASE URL
========================================================= */

const BASE_URL = "/auto-debits";

/* =========================================================
   VALIDATE DEBIT AMOUNT
========================================================= */

const validateAmount = (
  amount: number,
): void => {
  if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "A valid debit amount is required.",
    );
  }
};

/* =========================================================
   INITIATE AUTO-DEBIT
========================================================= */

const initiateAutoDebit = async (
  payload: InitiateAutoDebitPayload,
): Promise<AutoDebitResponse> => {
  if (!payload?.repaymentScheduleId) {
    throw new Error(
      "Repayment schedule ID is required.",
    );
  }

  validateAmount(
    payload.amount,
  );

  const response =
    await API.post<AutoDebitResponse>(
      BASE_URL,
      {
        repaymentScheduleId:
          payload.repaymentScheduleId,

        amount:
          payload.amount,
      },
    );

  return response.data;
};

/* =========================================================
   GET AUTO-DEBIT HISTORY
========================================================= */

const getAutoDebits =
  async (): Promise<AutoDebitListResponse> => {
    const response =
      await API.get<AutoDebitListResponse>(
        BASE_URL,
      );

    return response.data;
  };

/* =========================================================
   GET AUTO-DEBIT DETAILS
========================================================= */

const getAutoDebit = async (
  debitId: string,
): Promise<AutoDebitResponse> => {
  if (!debitId) {
    throw new Error(
      "Auto-debit ID is required.",
    );
  }

  const response =
    await API.get<AutoDebitResponse>(
      `${BASE_URL}/${encodeURIComponent(
        debitId,
      )}`,
    );

  return response.data;
};

/* =========================================================
   EXPORT
========================================================= */

const autoDebitApi = {
  initiateAutoDebit,
  getAutoDebits,
  getAutoDebit,
};

export default autoDebitApi;


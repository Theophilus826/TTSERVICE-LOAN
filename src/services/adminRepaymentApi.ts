import API from "./Api";

// =========================================================
// REPAYMENT TYPES
// =========================================================

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

// =========================================================
// USER
// =========================================================

export interface AdminRepaymentUser {
  _id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
}

// =========================================================
// LOAN
// =========================================================

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

// =========================================================
// REPAYMENT SCHEDULE
// =========================================================

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

// =========================================================
// REPAYMENT
// =========================================================

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

// =========================================================
// REPAYMENT PAGINATION
// =========================================================

export interface AdminRepaymentsPagination {
  items: AdminRepayment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// =========================================================
// REPAYMENT QUERY PARAMETERS
// =========================================================

export interface GetAdminRepaymentsParams {
  status?: AdminRepaymentStatus | "";
  repaymentSource?: AdminRepaymentSource | "";
  userId?: string;
  loanId?: string;
  page?: number;
  limit?: number;
}

// =========================================================
// MANDATE COLLECTION RESPONSE
// =========================================================

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

// =========================================================
// RECONCILIATION RESPONSE
// =========================================================

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

// =========================================================
// AUTO-DEBIT PREVIEW RESPONSE
// =========================================================

export interface AutoDebitPreviewResponse {
  dueInstallments: number;
  totalAmount: number;
  currency?: string;
}

// =========================================================
// AUTO-DEBIT RUN RESPONSE
// =========================================================

export interface AutoDebitRunResponse {
  attempted: number;
  successful: number;
  failed: number;
  skipped: number;
}

// =========================================================
// FLOATING REMINDER TYPES
// =========================================================

export type FloatingReminderStatus =
  | "active"
  | "cooldown"
  | "disabled"
  | "permission_denied"
  | "error";

export interface FloatingReminderUser {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  accountStatus?: string;
}

export interface FloatingReminder {
  _id: string;

  user: FloatingReminderUser | null;

  enabled: boolean;
  consentGranted: boolean;
  overlayPermissionGranted: boolean;

  status: FloatingReminderStatus;

  unpaidInstallments: number;
  unpaidAmount: number;
  currency: string;

  cooldownUntil?: string | null;
  lastPaymentAt?: string | null;
  lastReminderAt?: string | null;

  lastEvent?: string | null;
  lastError?: string | null;

  createdAt?: string;
  updatedAt?: string;
}

export interface FloatingReminderPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// =========================================================
// FLOATING REMINDER APPEARANCE SETTINGS
// =========================================================

export interface FloatingReminderAppearance {
  reminderWidth: number;
  reminderBackgroundHex: string;
  reminderTextColor: string;
  reminderTextSize: number;
  reminderCornerRadius: number;
  reminderHorizontalPadding: number;
  reminderVerticalPadding: number;
  reminderPositionY: number;
}
export interface GetFloatingRemindersParams {
  status?: FloatingReminderStatus | "";
  search?: string;
  page?: number;
  limit?: number;
}

export interface FloatingReminderListResponse {
  reminders: FloatingReminder[];
  pagination: FloatingReminderPagination;
}

export interface FloatingReminderSummary {
  total: number;
  enabled: number;
  active: number;
  cooldown: number;
  disabled: number;
  permissionDenied: number;
  errors: number;
  unpaidInstallments: number;
  unpaidAmount: number;
}

// =========================================================
// ADMIN REPAYMENT API
// =========================================================

const adminRepaymentApi = {
  // -------------------------------------------------------
  // GET REPAYMENTS
  // -------------------------------------------------------

  /**
   * Get paginated repayments with optional filters.
   */
  async getRepayments(
    params: GetAdminRepaymentsParams = {},
  ): Promise<AdminRepaymentsPagination> {
    const response = await API.get("/admin/repayments", {
      params,
    });

    return response.data.data;
  },

  // -------------------------------------------------------
  // FLOATING REMINDER DASHBOARD
  // -------------------------------------------------------

  /**
   * Get paginated floating reminder records.
   *
   * Optional filters:
   * - status
   * - search
   * - page
   * - limit
   */
  async getFloatingReminders(
    params: GetFloatingRemindersParams = {},
  ): Promise<FloatingReminderListResponse> {
    const response = await API.get("/admin/repayments/floating-reminders", {
      params,
    });

    return response.data.data;
  },

  /**
   * Get floating reminder dashboard statistics.
   */
  async getFloatingReminderSummary(): Promise<FloatingReminderSummary> {
    const response = await API.get(
      "/admin/repayments/floating-reminders/summary",
    );

    return response.data.data;
  },

  // -------------------------------------------------------
  // FLOATING REMINDER APPEARANCE
  // -------------------------------------------------------

  /**
   * Get the global floating reminder appearance settings.
   */
  async getFloatingReminderAppearance(): Promise<FloatingReminderAppearance> {
    const response = await API.get(
      "/admin/repayments/floating-reminders/appearance",
    );

    return response.data.data;
  },

  async updateFloatingReminderAppearance(
    settings: FloatingReminderAppearance,
  ): Promise<FloatingReminderAppearance> {
    const response = await API.put(
      "/admin/repayments/floating-reminders/appearance",
      settings,
    );

    return response.data.data;
  },

  // -------------------------------------------------------
  // MANDATE COLLECTION
  // -------------------------------------------------------

  /**
   * Collect a repayment using an authorized mandate.
   */
  async collectMandateRepayment(
    loanId: string,
    amount: number,
  ): Promise<CollectMandateRepaymentResponse> {
    const response = await API.post(
      `/admin/repayments/loans/${encodeURIComponent(
        loanId,
      )}/repayments/collect`,
      {
        amount,
      },
    );

    return response.data.data;
  },

  // -------------------------------------------------------
  // PAYMENT RECONCILIATION
  // -------------------------------------------------------

  /**
   * Reconcile a Paystack DVA payment against a loan.
   */
  async reconcilePayment(
    loanId: string,
    providerReference: string,
  ): Promise<ReconcilePaymentResponse> {
    const response = await API.post(
      `/admin/repayments/loans/${encodeURIComponent(
        loanId,
      )}/repayments/reconcile`,
      {
        providerReference,
      },
    );

    return response.data.data;
  },

  // -------------------------------------------------------
  // AUTO-DEBIT PREVIEW
  // -------------------------------------------------------

  /**
   * Preview installments eligible for auto-debit.
   * This endpoint must not initiate any payments.
   */
  async previewAutoDebit(): Promise<AutoDebitPreviewResponse> {
    const response = await API.get("/admin/repayments/auto-debit/preview");

    return response.data.data;
  },

  // -------------------------------------------------------
  // AUTO-DEBIT RUN
  // -------------------------------------------------------

  /**
   * Request backend processing of eligible auto-debit
   * collections.
   *
   * The backend must validate mandates, prevent duplicate
   * charges, and verify provider outcomes.
   */
  async runAutoDebit(): Promise<AutoDebitRunResponse> {
    const response = await API.post("/admin/repayments/auto-debit/run");

    return response.data.data;
  },
};

export default adminRepaymentApi;

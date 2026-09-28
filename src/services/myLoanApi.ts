
import API from "./Api";

// =========================================================
// LOAN TYPES
// =========================================================

export type LoanStatus =
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

export type RepaymentFrequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly";

export type RepaymentScheduleStatus =
  | "active"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "defaulted"
  | "cancelled";

export type RepaymentInstallmentStatus =
  | "pending"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "waived";

// =========================================================
// RELATED TYPES
// =========================================================

export interface LoanProductSummary {
  _id: string;
  id?: string;
  name?: string;
  code?: string;
  currency?: string;
}

export interface LoanApplicationSummary {
  _id: string;
  id?: string;
  applicationNumber?: string;
  amountRequested?: number;
  durationDays?: number;
  purpose?: string;
  monthlyIncome?: number;
  employmentStatus?: string;
  status?: string;
}

export interface LoanOfferSummary {
  _id: string;
  id?: string;

  approvedAmount?: number;
  interestRate?: number;
  interestType?: string;

  processingFee?: number;
  serviceFee?: number;

  totalInterest?: number;
  totalFees?: number;
  totalRepayment?: number;

  durationDays?: number;

  repaymentFrequency?:
    | RepaymentFrequency
    | string;

  installmentAmount?: number;
  numberOfInstallments?: number;

  status?: string;

  expiresAt?: string | null;
  acceptedAt?: string | null;
}

// =========================================================
// REPAYMENT INSTALLMENT
// =========================================================
//
// Installments are embedded subdocuments inside the
// RepaymentSchedule document.
//
// They are NOT ObjectId references.
// =========================================================

export interface RepaymentInstallment {
  _id?: string;
  id?: string;

  installmentNumber: number;

  dueDate: string;

  principalAmount: number;
  interestAmount: number;
  feeAmount: number;

  totalAmount: number;

  paidAmount: number;
  remainingAmount: number;

  status:
    | RepaymentInstallmentStatus
    | string;

  paidAt?: string | null;
  overdueAt?: string | null;

  createdAt?: string;
  updatedAt?: string;
}

// =========================================================
// REPAYMENT SCHEDULE
// =========================================================

export interface CustomerRepaymentSchedule {
  _id: string;
  id?: string;

  // -------------------------------------------------------
  // RELATIONSHIPS
  // -------------------------------------------------------

  user?: string;
  loan?: string;
  loanApplication?: string;
  loanOffer?: string;
  disbursement?: string;

  // -------------------------------------------------------
  // CURRENCY
  // -------------------------------------------------------

  currency?: string;

  // -------------------------------------------------------
  // LOAN TOTALS
  // -------------------------------------------------------

  principalAmount: number;
  totalInterest: number;
  totalFees: number;
  totalRepaymentAmount: number;

  // -------------------------------------------------------
  // PAYMENT TRACKING
  // -------------------------------------------------------

  amountPaid: number;
  amountOutstanding: number;

  // -------------------------------------------------------
  // STATUS
  // -------------------------------------------------------

  status:
    | RepaymentScheduleStatus
    | string;

  // -------------------------------------------------------
  // DATES
  // -------------------------------------------------------

  startDate: string;
  finalDueDate: string;

  // -------------------------------------------------------
  // INSTALLMENTS
  // -------------------------------------------------------

  installments: RepaymentInstallment[];

  // -------------------------------------------------------
  // TIMESTAMPS
  // -------------------------------------------------------

  createdAt?: string;
  updatedAt?: string;
}

// =========================================================
// CUSTOMER LOAN
// =========================================================

export interface CustomerLoan {
  _id: string;
  id?: string;

  // -------------------------------------------------------
  // IDENTIFICATION
  // -------------------------------------------------------

  loanNumber?: string;

  // -------------------------------------------------------
  // RELATIONSHIPS
  // -------------------------------------------------------

  user?: string;

  loanOffer:
    | string
    | LoanOfferSummary;

  loanApplication?:
    | string
    | LoanApplicationSummary
    | null;

  loanProduct?:
    | string
    | LoanProductSummary
    | null;

  repaymentSchedule?:
    | string
    | CustomerRepaymentSchedule
    | null;

  // -------------------------------------------------------
  // FINANCIAL INFORMATION
  // -------------------------------------------------------

  principalAmount: number;

  interestAmount: number;

  feeAmount: number;

  totalRepayment: number;

  amountDisbursed: number;

  amountPaid: number;

  outstandingAmount: number;

  // -------------------------------------------------------
  // PRICING
  // -------------------------------------------------------

  interestRate: number;

  interestType:
    | "flat"
    | "reducing_balance";

  // -------------------------------------------------------
  // REPAYMENT TERMS
  // -------------------------------------------------------

  durationDays: number;

  repaymentFrequency:
    RepaymentFrequency;

  numberOfInstallments: number;

  installmentAmount: number;

  // -------------------------------------------------------
  // LOAN STATUS
  // -------------------------------------------------------

  status: LoanStatus;

  // -------------------------------------------------------
  // DISBURSEMENT
  // -------------------------------------------------------

  disbursementMethod:
    | DisbursementMethod
    | null;

  disbursementStatus:
    | DisbursementStatus
    | null;

  disbursementReference?: string | null;

  manualDisbursementReference?: string | null;

  disbursedBy?: string | null;

  paystackTransferCode?: string | null;

  paystackTransferId?: string | null;

  // Backward-compatible aliases.
  transferCode?: string | null;
  transferId?: string | null;

  disbursementReason?: string | null;

  // -------------------------------------------------------
  // DATES
  // -------------------------------------------------------

  disbursedAt?: string | null;

  startDate?: string | null;

  maturityDate?: string | null;

  // -------------------------------------------------------
  // TIMESTAMPS
  // -------------------------------------------------------

  createdAt?: string;
  updatedAt?: string;
}

// =========================================================
// LOAN DASHBOARD
// =========================================================

export interface LoanDashboardSummary {
  totalLoans?: number;
  activeLoans?: number;
  completedLoans?: number;

  totalBorrowed?: number;
  totalPaid?: number;
  totalOutstanding?: number;
}

export interface LoanDashboard {
  loans: CustomerLoan[];

  activeLoans: CustomerLoan[];

  activeLoan?: CustomerLoan | null;

  applications?: unknown[];

  activeApplication?: unknown | null;

  summary?: LoanDashboardSummary;
}

// =========================================================
// API RESPONSE
// =========================================================

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

// =========================================================
// INTERNAL RESPONSE HELPER
// =========================================================

const unwrapResponse = <T>(
  response: {
    data: ApiResponse<T>;
  },
): T => {
  const payload = response.data;

  if (!payload?.success) {
    throw new Error(
      payload?.message ||
        "Unable to process loan request.",
    );
  }

  return payload.data;
};

// =========================================================
// GET MY LOANS
// =========================================================
//
// GET /api/loans/my
//
// Returns loans belonging to the authenticated customer.
//
// The backend may populate:
//
//   repaymentSchedule
//   loanOffer
//   loanApplication
//   loanProduct
// =========================================================

const getMyLoans = async (): Promise<
  CustomerLoan[]
> => {
  const response =
    await API.get<
      ApiResponse<CustomerLoan[]>
    >("/loans/my");

  return unwrapResponse(response);
};

// =========================================================
// GET SINGLE LOAN
// =========================================================
//
// GET /api/loans/:id
//
// The backend should verify that the requested loan
// belongs to the authenticated customer.
// =========================================================

const getMyLoan = async (
  loanId: string,
): Promise<CustomerLoan> => {
  if (
    typeof loanId !== "string" ||
    !loanId.trim()
  ) {
    throw new Error(
      "Loan ID is required.",
    );
  }

  const id = loanId.trim();

  const response =
    await API.get<
      ApiResponse<CustomerLoan>
    >(
      `/loans/${encodeURIComponent(id)}`,
    );

  return unwrapResponse(response);
};

// =========================================================
// GET LOAN DASHBOARD
// =========================================================
//
// GET /api/loans/dashboard
//
// Returns:
//
//   - customer loans
//   - active loans
//   - active loan
//   - loan applications
//   - dashboard summary
//
// Loan repayment schedules may be populated by the
// backend repository.
// =========================================================

const getLoanDashboard =
  async (): Promise<LoanDashboard> => {
    const response =
      await API.get<
        ApiResponse<LoanDashboard>
      >("/loans/dashboard");

    return unwrapResponse(response);
  };

// =========================================================
// REPAYMENT SCHEDULE HELPERS
// =========================================================

/**
 * Returns the repayment schedule ID associated
 * with a loan.
 *
 * Supports:
 *
 * 1. ObjectId string
 * 2. Populated repayment schedule
 * 3. null
 * 4. undefined
 */
export const getRepaymentScheduleId = (
  loan:
    | CustomerLoan
    | null
    | undefined,
): string => {
  const schedule =
    loan?.repaymentSchedule;

  if (!schedule) {
    return "";
  }

  if (typeof schedule === "string") {
    return schedule;
  }

  return (
    schedule._id ||
    schedule.id ||
    ""
  );
};

/**
 * Determines whether a loan has a repayment
 * schedule attached to it.
 */
export const hasRepaymentSchedule = (
  loan:
    | CustomerLoan
    | null
    | undefined,
): boolean => {
  return (
    getRepaymentScheduleId(loan)
      .length > 0
  );
};

/**
 * Returns the populated repayment schedule.
 *
 * If repaymentSchedule is only an ID, this
 * returns null because the schedule has not
 * been populated.
 */
export const getRepaymentSchedule = (
  loan:
    | CustomerLoan
    | null
    | undefined,
): CustomerRepaymentSchedule | null => {
  const schedule =
    loan?.repaymentSchedule;

  if (
    !schedule ||
    typeof schedule === "string"
  ) {
    return null;
  }

  return schedule;
};

// =========================================================
// INSTALLMENT HELPERS
// =========================================================

/**
 * Returns the next unpaid installment.
 *
 * An installment is considered unpaid when its
 * status is not "paid" or "waived".
 */
export const getNextInstallment = (
  loan:
    | CustomerLoan
    | null
    | undefined,
): RepaymentInstallment | null => {
  const schedule =
    getRepaymentSchedule(loan);

  if (!schedule?.installments?.length) {
    return null;
  }

  return (
    schedule.installments.find(
      (installment) =>
        installment.status !== "paid" &&
        installment.status !== "waived",
    ) || null
  );
};

/**
 * Returns all unpaid installments.
 */
export const getUnpaidInstallments = (
  loan:
    | CustomerLoan
    | null
    | undefined,
): RepaymentInstallment[] => {
  const schedule =
    getRepaymentSchedule(loan);

  if (!schedule?.installments?.length) {
    return [];
  }

  return schedule.installments.filter(
    (installment) =>
      installment.status !== "paid" &&
      installment.status !== "waived",
  );
};

/**
 * Returns all overdue installments.
 */
export const getOverdueInstallments = (
  loan:
    | CustomerLoan
    | null
    | undefined,
): RepaymentInstallment[] => {
  const schedule =
    getRepaymentSchedule(loan);

  if (!schedule?.installments?.length) {
    return [];
  }

  return schedule.installments.filter(
    (installment) =>
      installment.status === "overdue",
  );
};

// =========================================================
// LOAN STATUS HELPERS
// =========================================================

/**
 * Determines whether the loan is currently active.
 */
export const isLoanActive = (
  loan:
    | CustomerLoan
    | null
    | undefined,
): boolean => {
  return loan?.status === "active";
};

/**
 * Determines whether the loan has been completed.
 */
export const isLoanCompleted = (
  loan:
    | CustomerLoan
    | null
    | undefined,
): boolean => {
  return loan?.status === "completed";
};

/**
 * Determines whether the loan is overdue.
 */
export const isLoanOverdue = (
  loan:
    | CustomerLoan
    | null
    | undefined,
): boolean => {
  return (
    loan?.status === "overdue" ||
    loan?.status === "defaulted"
  );
};

/**
 * Determines whether the loan has been successfully
 * disbursed.
 */
export const isLoanDisbursed = (
  loan:
    | CustomerLoan
    | null
    | undefined,
): boolean => {
  if (!loan) {
    return false;
  }

  return (
    loan.disbursementStatus ===
      "SUCCESS" ||
    loan.status === "active" ||
    loan.status === "completed" ||
    loan.status === "overdue" ||
    loan.status === "defaulted"
  );
};

// =========================================================
// EXPORT API
// =========================================================

const myLoanApi = {
  getMyLoans,
  getMyLoan,
  getLoanDashboard,
};

export default myLoanApi;


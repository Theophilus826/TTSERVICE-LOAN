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
// APPLICATION TYPES
// =========================================================

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

export interface CustomerLoanProduct {
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
  interestType?: string;

  repaymentFrequency?:
    | RepaymentFrequency
    | string;
}

export interface LoanApplicationSummary {
  _id: string;
  id?: string;

  applicationNumber?: string;

  amountRequested?: number;
  durationDays?: number;

  purpose?: string | null;

  monthlyIncome?: number | null;
  employmentStatus?: string | null;

  status?: LoanApplicationStatus;

  loanProduct?:
    | string
    | CustomerLoanProduct
    | null;
}

export interface CustomerLoanApplication {
  _id: string;
  id?: string;

  applicationNumber?: string;

  loanProduct?:
    | string
    | CustomerLoanProduct
    | null;

  amountRequested?: number;
  durationDays?: number;

  purpose?: string | null;

  monthlyIncome?: number | null;
  employmentStatus?: string | null;

  status: LoanApplicationStatus;

  submittedAt?: string | null;

  createdAt?: string;
  updatedAt?: string;
}

export interface CreateLoanApplicationPayload {
  loanProductId: string;

  amountRequested: number;

  durationDays: number;

  purpose?: string;

  monthlyIncome?: number;

  employmentStatus?: string;
}

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

  user?: string;
  loan?: string;
  loanApplication?: string;
  loanOffer?: string;
  disbursement?: string;

  currency?: string;

  principalAmount: number;
  totalInterest: number;
  totalFees: number;
  totalRepaymentAmount: number;

  amountPaid: number;
  amountOutstanding: number;

  status:
    | RepaymentScheduleStatus
    | string;

  startDate: string;
  finalDueDate: string;

  installments: RepaymentInstallment[];

  createdAt?: string;
  updatedAt?: string;
}

// =========================================================
// CUSTOMER LOAN
// =========================================================

export interface CustomerLoan {
  _id: string;
  id?: string;

  loanNumber?: string;

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
    | "reducing_balance";

  durationDays: number;

  repaymentFrequency:
    RepaymentFrequency;

  numberOfInstallments: number;

  installmentAmount: number;

  status: LoanStatus;

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

  transferCode?: string | null;
  transferId?: string | null;

  disbursementReason?: string | null;

  disbursedAt?: string | null;

  startDate?: string | null;

  maturityDate?: string | null;

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
  totalPrincipal?: number;
  totalPaid?: number;
  totalOutstanding?: number;
}

export interface LoanDashboard {
  loans: CustomerLoan[];

  activeLoans: CustomerLoan[];

  activeLoan?: CustomerLoan | null;

  applications?: CustomerLoanApplication[];

  activeApplication?:
    | CustomerLoanApplication
    | null;

  availableProducts?: CustomerLoanProduct[];

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

const getLoanDashboard =
  async (): Promise<LoanDashboard> => {
    const response =
      await API.get<
        ApiResponse<LoanDashboard>
      >("/loans/dashboard");

    return unwrapResponse(response);
  };

// =========================================================
// APPLICATION API
// =========================================================

/**
 * Get all applications belonging
 * to the authenticated customer.
 */
const getMyApplications = async (): Promise<
  CustomerLoanApplication[]
> => {
  const response =
    await API.get<
      ApiResponse<CustomerLoanApplication[]>
    >("/loan-applications/my");

  return unwrapResponse(response);
};

/**
 * Get the customer's active application.
 *
 * Returns null when the customer has
 * no active application.
 */
const getMyActiveApplication =
  async (): Promise<
    CustomerLoanApplication | null
  > => {
    const response =
      await API.get<
        ApiResponse<
          CustomerLoanApplication | null
        >
      >(
        "/loan-applications/my/active",
      );

    return unwrapResponse(response);
  };

/**
 * Get products available for a new
 * application.
 *
 * A completed previous application
 * does not block this request.
 */
const getAvailableLoanProducts =
  async (): Promise<
    CustomerLoanProduct[]
  > => {
    const response =
      await API.get<
        ApiResponse<CustomerLoanProduct[]>
      >(
        "/loan-applications/available-products",
      );

    return unwrapResponse(response);
  };

/**
 * Get a single customer application.
 */
const getMyApplication = async (
  applicationId: string,
): Promise<CustomerLoanApplication> => {
  if (
    typeof applicationId !== "string" ||
    !applicationId.trim()
  ) {
    throw new Error(
      "Application ID is required.",
    );
  }

  const response =
    await API.get<
      ApiResponse<CustomerLoanApplication>
    >(
      `/loan-applications/${encodeURIComponent(
        applicationId.trim(),
      )}`,
    );

  return unwrapResponse(response);
};

/**
 * Create a NEW loan application.
 *
 * The backend generates the application
 * number.
 */
const createLoanApplication = async (
  payload: CreateLoanApplicationPayload,
): Promise<CustomerLoanApplication> => {
  if (!payload.loanProductId) {
    throw new Error(
      "Loan product is required.",
    );
  }

  if (
    !Number.isFinite(
      Number(payload.amountRequested),
    ) ||
    Number(payload.amountRequested) <= 0
  ) {
    throw new Error(
      "A valid loan amount is required.",
    );
  }

  if (
    !Number.isFinite(
      Number(payload.durationDays),
    ) ||
    Number(payload.durationDays) <= 0
  ) {
    throw new Error(
      "A valid loan duration is required.",
    );
  }

  const response =
    await API.post<
      ApiResponse<CustomerLoanApplication>
    >(
      "/loan-applications",
      payload,
    );

  return unwrapResponse(response);
};

// =========================================================
// APPLICATION STATUS HELPERS
// =========================================================

export const ACTIVE_APPLICATION_STATUSES:
  LoanApplicationStatus[] = [
    "submitted",
    "pending",
    "under_review",
    "credit_check",
    "approved",
    "offer_created",
    "disbursed",
];

export const isApplicationActive = (
  application:
    | CustomerLoanApplication
    | null
    | undefined,
): boolean => {
  if (!application) {
    return false;
  }

  return ACTIVE_APPLICATION_STATUSES.includes(
    application.status,
  );
};

export const isApplicationCompleted = (
  application:
    | CustomerLoanApplication
    | null
    | undefined,
): boolean => {
  return (
    application?.status ===
    "completed"
  );
};

// =========================================================
// REPAYMENT SCHEDULE HELPERS
// =========================================================

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

export const isLoanActive = (
  loan:
    | CustomerLoan
    | null
    | undefined,
): boolean => {
  return loan?.status === "active";
};

export const isLoanCompleted = (
  loan:
    | CustomerLoan
    | null
    | undefined,
): boolean => {
  return loan?.status === "completed";
};

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
  // Loans
  getMyLoans,
  getMyLoan,
  getLoanDashboard,

  // Applications
  getMyApplications,
  getMyApplication,
  getMyActiveApplication,
  getAvailableLoanProducts,
  createLoanApplication,
};

export default myLoanApi;
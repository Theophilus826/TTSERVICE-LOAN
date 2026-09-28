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

provider?: string | null;

providerReference?: string | null;

status: RepaymentStatus;

failureReason?: string | null;

allocatedAmount?: number;

unallocatedAmount?: number;

allocation?: RepaymentAllocation[];

paidAt?: string | null;

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
RESPONSE TYPES
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
BASE URL
========================================================= */

const BASE_URL = "/repayments";

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
throw new Error(`${fieldName} is required.`);
}

return value.trim();
};

/* =========================================================
GET REPAYMENT SCHEDULE
========================================================= */

/**

* Loads a customer's repayment schedule.
*
* IMPORTANT:
* The identifier here is the RepaymentSchedule ID.
*
* Backend authorization must ensure that the authenticated
* customer owns the schedule.
  */

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

/**

* Starts a repayment through the configured payment
* provider.
*
* The backend remains authoritative for:
* * amount validation
* * outstanding balance
* * payment reference
* * provider initialization
* * repayment status
* * successful payment confirmation
*
* The frontend must never mark a repayment successful
* itself.
  */

const initiateRepayment = async (
payload: InitiateRepaymentPayload,
): Promise<RepaymentResponse> => {
const repaymentScheduleId = requireId(
payload.repaymentScheduleId,
"Repayment schedule ID",
);

const amount = Number(payload.amount);

if (
!Number.isFinite(amount) ||
amount <= 0
) {
throw new Error(
"Repayment amount must be greater than zero.",
);
}

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
paymentMethod: payload.paymentMethod,
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
EXPORT
========================================================= */

const repaymentApi = {
getRepaymentSchedule,

initiateRepayment,

getRepaymentHistory,

getRepayment,
};

export default repaymentApi;

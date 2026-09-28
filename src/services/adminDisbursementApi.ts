
import API from "./Api";

// =========================================================
// TYPES
// =========================================================

/**
 * These are the LOCAL disbursement statuses stored in MongoDB.
 *
 * Paystack may return "otp" as its PROVIDER status.
 * An OTP-required Paystack transfer should therefore remain
 * locally "processing", with otpRequired === true.
 */
export type DisbursementStatus =
  | "pending"
  | "processing"
  | "successful"
  | "failed"
  | "reversed";

// =========================================================
// USER
// =========================================================

export type AdminDisbursementUser = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
};

// =========================================================
// LOAN APPLICATION
// =========================================================

export type AdminDisbursementLoanApplication = {
  _id?: string;
  applicationNumber?: string;
  amountRequested?: number;
  status?: string;
};

// =========================================================
// LOAN OFFER
// =========================================================

export type AdminDisbursementLoanOffer = {
  _id?: string;
  approvedAmount?: number;
  interestRate?: number;
  status?: string;
};

// =========================================================
// BANK ACCOUNT
// =========================================================

export type AdminDisbursementBankAccount = {
  _id?: string;
  bankName?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
};

// =========================================================
// PROVIDER DATA
// =========================================================

export type AdminDisbursementProviderData = {
  status?: string;

  provider?: string;

  reference?: string | null;

  transferCode?: string | null;

  transfer_code?: string | null;

  transferId?: string | number | null;

  id?: string | number | null;

  amount?: number | null;

  currency?: string | null;

  message?: string | null;

  finalized?: boolean;

  finalizedAt?: string | null;

  finalizedBy?: string | null;

  previousStatus?: string | null;

  paystackStatus?: string | null;

  raw?: {
    status?: string;
    reference?: string;
    transfer_code?: string;
    id?: string | number;
    amount?: number;
    currency?: string;
    [key: string]: unknown;
  } | null;

  [key: string]: unknown;
};

// =========================================================
// ADMIN DISBURSEMENT
// =========================================================

export type AdminDisbursement = {
  _id: string;

  user?: AdminDisbursementUser | null;

  loan?: {
    _id?: string;
    status?: string;
    principalAmount?: number;
  } | null;

  loanApplication?:
    | AdminDisbursementLoanApplication
    | null;

  loanOffer?:
    | AdminDisbursementLoanOffer
    | null;

  bankAccount?:
    | AdminDisbursementBankAccount
    | null;

  amount: number;

  currency?: string;

  provider?: string | null;

  providerReference?: string | null;

  providerTransferCode?: string | null;

  providerTransferId?: string | null;

  reference?: string | null;

  method?: "manual" | "paystack";

  failureReason?: string | null;

  status: DisbursementStatus;

  /**
   * True when:
   *
   * local status = processing
   * provider status = otp
   * providerTransferCode exists
   */
  otpRequired?: boolean;

  /**
   * Whether the admin is allowed to submit
   * an OTP for this transfer.
   */
  canFinalizeOtp?: boolean;

  providerData?:
    | AdminDisbursementProviderData
    | null;

  initiatedAt?: string | null;

  completedAt?: string | null;

  failedAt?: string | null;

  reversedAt?: string | null;

  retryCount?: number;

  retryRequestedAt?: string | null;

  createdAt?: string;

  updatedAt?: string;
};

// =========================================================
// CREATE TYPES
// =========================================================

export type CreateDisbursementPayload = {
  offerId: string;
};

export type CreateDisbursementOptionUser =
  AdminDisbursementUser;

export type CreateDisbursementOptionLoanApplication =
  AdminDisbursementLoanApplication & {
    user?: AdminDisbursementUser | null;
    loanOffer?:
      | AdminDisbursementLoanOffer
      | null;
  };

export type CreateDisbursementOptionLoanOffer =
  AdminDisbursementLoanOffer & {
    _id: string;
    loanApplication?: string;
    user?: string;
  };

export type CreateDisbursementOptionBankAccount =
  AdminDisbursementBankAccount & {
    _id: string;
    user?: string;
  };

// =========================================================
// CREATE OPTION
// =========================================================

export type AdminDisbursementCreateOption = {
  offerId: string;

  loanId?: string;

  loanApplication?: {
    _id?: string;
    applicationNumber?: string;
    amountRequested?: number;
    status?: string;
  } | null;

  borrower: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };

  approvedAmount: number;

  interestRate?: number;

  bankAccount: {
    _id: string;
    bankName?: string;
    bankCode?: string;
    accountNumber?: string;
    accountName?: string;
  };

  mandate: {
    _id: string;
    status: string;
  };
};

// =========================================================
// OTP FINALIZATION
// =========================================================

export type FinalizeDisbursementOtpPayload = {
  otp: string;
};

// =========================================================
// PAGINATION
// =========================================================

export type AdminDisbursementPagination = {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
};

// =========================================================
// RESPONSE TYPES
// =========================================================

export type AdminDisbursementResponse = {
  success: boolean;

  data?: AdminDisbursement[];

  count?: number;

  pagination?: AdminDisbursementPagination;

  message?: string;
};

export type AdminDisbursementDetailResponse = {
  success: boolean;

  data?: AdminDisbursement;

  message?: string;
};

export type AdminDisbursementOptionsResponse = {
  success: boolean;

  data?: AdminDisbursementCreateOption[];

  message?: string;
};

// =========================================================
// RAW API DATA TYPES
// =========================================================

type RawDisbursementListContainer = {
  disbursements?: AdminDisbursement[];

  items?: AdminDisbursement[];

  data?:
    | AdminDisbursement[]
    | RawDisbursementListContainer;

  count?: number;

  pagination?: AdminDisbursementPagination;
};

type RawDisbursementListData =
  | AdminDisbursement[]
  | RawDisbursementListContainer
  | null
  | undefined;

type RawCreateOptionsData =
  | AdminDisbursementCreateOption[]
  | {
      options?: AdminDisbursementCreateOption[];

      data?: AdminDisbursementCreateOption[];
    }
  | null
  | undefined;

// =========================================================
// NORMALIZE DISBURSEMENTS
// =========================================================

const normalizeDisbursements = (
  data: RawDisbursementListData,
): AdminDisbursement[] => {
  if (!data) {
    return [];
  }

  // Direct array
  if (Array.isArray(data)) {
    return data;
  }

  // data.disbursements
  if (Array.isArray(data.disbursements)) {
    return data.disbursements;
  }

  // data.items
  if (Array.isArray(data.items)) {
    return data.items;
  }

  // data.data
  if (Array.isArray(data.data)) {
    return data.data;
  }

  // Nested data.data
  if (
    data.data &&
    typeof data.data === "object" &&
    !Array.isArray(data.data)
  ) {
    return normalizeDisbursements(
      data.data,
    );
  }

  return [];
};

// =========================================================
// NORMALIZE CREATE OPTIONS
// =========================================================

const normalizeCreateOptions = (
  data: RawCreateOptionsData,
): AdminDisbursementCreateOption[] => {
  if (!data) {
    return [];
  }

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data.options)) {
    return data.options;
  }

  if (Array.isArray(data.data)) {
    return data.data;
  }

  return [];
};

// =========================================================
// EXTRACT PAGINATION
// =========================================================

const extractPagination = (
  data: RawDisbursementListData,
): AdminDisbursementPagination | undefined => {
  if (!data || Array.isArray(data)) {
    return undefined;
  }

  if (data.pagination) {
    return data.pagination;
  }

  if (
    data.data &&
    typeof data.data === "object" &&
    !Array.isArray(data.data)
  ) {
    return extractPagination(data.data);
  }

  return undefined;
};

// =========================================================
// EXTRACT COUNT
// =========================================================

const extractCount = (
  data: RawDisbursementListData,
): number | undefined => {
  if (!data || Array.isArray(data)) {
    return undefined;
  }

  if (typeof data.count === "number") {
    return data.count;
  }

  if (
    data.data &&
    typeof data.data === "object" &&
    !Array.isArray(data.data)
  ) {
    return extractCount(data.data);
  }

  return undefined;
};

// =========================================================
// BASE URL
// =========================================================

const ADMIN_DISBURSEMENTS_BASE_URL =
  "/admin/disbursements";

// =========================================================
// VALIDATE ID
// =========================================================

const isValidId = (
  value: string | undefined | null,
): boolean => {
  return Boolean(
    typeof value === "string" &&
      value.trim(),
  );
};

// =========================================================
// CLEAN OTP
// =========================================================

const cleanOtp = (
  otp: string | number,
): string => {
  return String(otp ?? "")
    .replace(/\D/g, "")
    .trim();
};

// =========================================================
// GET ALL DISBURSEMENTS
// =========================================================

const getDisbursements =
  async (): Promise<AdminDisbursementResponse> => {
    const response =
      await API.get<{
        success?: boolean;
        data?: RawDisbursementListData;
        count?: number;
        pagination?: AdminDisbursementPagination;
        message?: string;
      }>(ADMIN_DISBURSEMENTS_BASE_URL);

    const payload = response.data;

    const rawData = payload?.data;

    const normalizedData =
      normalizeDisbursements(rawData);

    const nestedCount =
      extractCount(rawData);

    const nestedPagination =
      extractPagination(rawData);

    return {
      success: Boolean(
        payload?.success,
      ),

      data: normalizedData,

      count:
        typeof payload?.count === "number"
          ? payload.count
          : nestedCount ??
            normalizedData.length,

      pagination:
        payload?.pagination ??
        nestedPagination,

      message: payload?.message,
    };
  };

// =========================================================
// GET ONE DISBURSEMENT
// =========================================================

const getDisbursement = async (
  disbursementId: string,
): Promise<AdminDisbursementDetailResponse> => {
  if (!isValidId(disbursementId)) {
    return {
      success: false,
      message:
        "Disbursement ID is required.",
    };
  }

  const response =
    await API.get<AdminDisbursementDetailResponse>(
      `${ADMIN_DISBURSEMENTS_BASE_URL}/${encodeURIComponent(
        disbursementId.trim(),
      )}`,
    );

  return response.data;
};

// =========================================================
// GET CREATE OPTIONS
// =========================================================

const getCreateOptions =
  async (): Promise<AdminDisbursementOptionsResponse> => {
    const response =
      await API.get<{
        success?: boolean;
        data?: RawCreateOptionsData;
        message?: string;
      }>(
        `${ADMIN_DISBURSEMENTS_BASE_URL}/create-options`,
      );

    const payload = response.data;

    return {
      success: Boolean(
        payload?.success,
      ),

      data: normalizeCreateOptions(
        payload?.data,
      ),

      message: payload?.message,
    };
  };

// =========================================================
// CREATE DISBURSEMENT
// =========================================================

const createDisbursement =
  async (
    offerId: string,
  ): Promise<AdminDisbursementDetailResponse> => {
    if (!isValidId(offerId)) {
      return {
        success: false,
        message:
          "Loan offer ID is required.",
      };
    }

    const response =
      await API.post<AdminDisbursementDetailResponse>(
        `${ADMIN_DISBURSEMENTS_BASE_URL}/offer/${encodeURIComponent(
          offerId.trim(),
        )}`,
      );

    return response.data;
  };

// =========================================================
// FINALIZE PAYSTACK OTP
// =========================================================
//
// Backend:
//
// POST
// /api/admin/disbursements/:disbursementId/finalize
//
// Body:
//
// {
//   otp: "123456"
// }
//
// IMPORTANT:
//
// The OTP is NOT stored locally.
// The backend retrieves the stored
// providerTransferCode and sends:
//
// POST /transfer/finalize_transfer
//
// to Paystack.
// =========================================================

const finalizeDisbursement =
  async (
    disbursementId: string,
    otp: string,
  ): Promise<AdminDisbursementDetailResponse> => {
    if (!isValidId(disbursementId)) {
      return {
        success: false,
        message:
          "Disbursement ID is required.",
      };
    }

    const normalizedOtp =
      cleanOtp(otp);

    if (!normalizedOtp) {
      return {
        success: false,
        message:
          "Paystack OTP is required.",
      };
    }

    if (
      normalizedOtp.length < 4
    ) {
      return {
        success: false,
        message:
          "Please enter a valid Paystack OTP.",
      };
    }

    const response =
      await API.post<AdminDisbursementDetailResponse>(
        `${ADMIN_DISBURSEMENTS_BASE_URL}/${encodeURIComponent(
          disbursementId.trim(),
        )}/finalize`,
        {
          otp: normalizedOtp,
        },
      );

    return response.data;
  };

// =========================================================
// BACKWARD-COMPATIBLE OTP METHOD
// =========================================================
//
// Keep this because other components may already call:
//
// adminDisbursementApi.finalizeDisbursementOtp(...)
//
// New code should use:
//
// adminDisbursementApi.finalizeDisbursement(...)
// =========================================================

const finalizeDisbursementOtp =
  async (
    disbursementId: string,
    otp: string,
  ): Promise<AdminDisbursementDetailResponse> => {
    return finalizeDisbursement(
      disbursementId,
      otp,
    );
  };

// =========================================================
// RETRY FAILED DISBURSEMENT
// =========================================================
//
// IMPORTANT:
//
// Retry is ONLY intended for failed
// disbursements.
//
// Do NOT retry a processing transfer
// that is waiting for OTP.
// Doing so can create a duplicate
// Paystack transfer.
// =========================================================

const retryDisbursement =
  async (
    disbursementId: string,
  ): Promise<AdminDisbursementDetailResponse> => {
    if (!isValidId(disbursementId)) {
      return {
        success: false,
        message:
          "Disbursement ID is required.",
      };
    }

    const response =
      await API.post<AdminDisbursementDetailResponse>(
        `${ADMIN_DISBURSEMENTS_BASE_URL}/${encodeURIComponent(
          disbursementId.trim(),
        )}/retry`,
      );

    return response.data;
  };

// =========================================================
// EXPORT
// =========================================================

const adminDisbursementApi = {
  getDisbursements,

  getDisbursement,

  getCreateOptions,

  createDisbursement,

  finalizeDisbursement,

  // Keep for backward compatibility.
  finalizeDisbursementOtp,

  retryDisbursement,
};

export default adminDisbursementApi;


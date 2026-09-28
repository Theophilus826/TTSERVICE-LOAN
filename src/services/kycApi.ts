
import API from "./Api";

// =========================================================
// TYPES
// =========================================================

export type KycStatus =
  | "pending"
  | "submitted"
  | "under_review"
  | "verified"
  | "rejected";

export type KycGender =
  | "male"
  | "female"
  | "other";

export type KycIdType =
  | "nin"
  | "passport"
  | "drivers_license"
  | "voters_card";

export interface KycUser {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface KycData {
  _id?: string;

  // User information
  user?: KycUser;

  firstName?: string;
  lastName?: string;

  dateOfBirth?: string;

  gender?: KycGender;

  address?: string;
  city?: string;
  state?: string;
  country?: string;

  // Identification
  idType?: KycIdType;
  idNumber?: string;

  idDocumentFront?: string | null;
  selfie?: string | null;

  // Status
  status?: KycStatus;

  rejectionReason?: string | null;

  // Verification
  submittedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;

  createdAt?: string;
  updatedAt?: string;
}

// =========================================================
// RESPONSE TYPES
// =========================================================

export interface KycResponse {
  success: boolean;
  message?: string;
  data?: KycData | null;
}

export interface KycListResponse {
  success: boolean;
  message?: string;
  data?: KycData[];
}

// =========================================================
// CUSTOMER
// =========================================================

/**
 * Get the currently authenticated user's KYC.
 *
 * Backend:
 * GET /api/kyc/me
 */
const getMyKyc = async (): Promise<KycResponse> => {
  const response =
    await API.get<KycResponse>("/kyc/me");

  return response.data;
};

/**
 * Submit / update KYC.
 *
 * Backend:
 * POST /api/kyc
 *
 * Content-Type:
 * multipart/form-data
 */
const submitKyc = async (
  formData: FormData,
): Promise<KycResponse> => {
  const response =
    await API.post<KycResponse>(
      "/kyc",
      formData,
      {
        headers: {
          "Content-Type":
            "multipart/form-data",
        },
      },
    );

  return response.data;
};

// =========================================================
// ADMIN
// =========================================================

/**
 * Get ALL KYC records.
 *
 * Includes:
 * - pending
 * - submitted
 * - under_review
 * - verified
 * - rejected
 *
 * Backend:
 * GET /api/kyc/admin
 */
const getAllKyc = async (): Promise<KycListResponse> => {
  const response =
    await API.get<KycListResponse>(
      "/kyc/admin",
    );

  return response.data;
};

/**
 * Get a single KYC record by ID.
 *
 * Backend:
 * GET /api/kyc/admin/:id
 */
const getKycById = async (
  id: string,
): Promise<KycResponse> => {
  const response =
    await API.get<KycResponse>(
      `/kyc/admin/${id}`,
    );

  return response.data;
};

/**
 * Get pending/submitted KYC records.
 *
 * Backend:
 * GET /api/kyc/admin/pending
 */
const getPendingKyc = async (): Promise<KycListResponse> => {
  const response =
    await API.get<KycListResponse>(
      "/kyc/admin/pending",
    );

  return response.data;
};

/**
 * Verify a KYC record.
 *
 * Backend:
 * PATCH /api/kyc/admin/:id/verify
 */
const verifyKyc = async (
  id: string,
): Promise<KycResponse> => {
  const response =
    await API.patch<KycResponse>(
      `/kyc/admin/${id}/verify`,
    );

  return response.data;
};

/**
 * Reject a KYC record.
 *
 * Backend:
 * PATCH /api/kyc/admin/:id/reject
 */
const rejectKyc = async (
  id: string,
  rejectionReason: string,
): Promise<KycResponse> => {
  const response =
    await API.patch<KycResponse>(
      `/kyc/admin/${id}/reject`,
      {
        rejectionReason,
      },
    );

  return response.data;
};

// =========================================================
// EXPORT
// =========================================================

const kycApi = {
  // Customer
  getMyKyc,
  submitKyc,

  // Admin
  getAllKyc,
  getKycById,
  getPendingKyc,
  verifyKyc,
  rejectKyc,
};

export default kycApi;

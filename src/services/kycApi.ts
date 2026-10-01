
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

export type BvnVerificationStatus =
  | "not_started"
  | "pending"
  | "verified"
  | "failed";

export type CustomerVerificationStatus =
  | "not_started"
  | "pending"
  | "verified"
  | "failed";

export type FaceVerificationStatus =
  | "not_started"
  | "pending"
  | "verified"
  | "failed";

// =========================================================
// USER
// =========================================================

export interface KycUser {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  name?: string;
}

// =========================================================
// KYC DATA
// =========================================================

export interface KycData {
  _id?: string;

  // =======================================================
  // USER INFORMATION
  // =======================================================

  user?: KycUser | string;

  firstName?: string;
  lastName?: string;

  dateOfBirth?: string;

  gender?: KycGender;

  address?: string;
  city?: string;
  state?: string;
  country?: string;

  // =======================================================
  // IDENTIFICATION
  // =======================================================

  idType?: KycIdType;

  /**
   * Sensitive identification number.
   *
   * The backend may intentionally omit this field because
   * the database stores it with select:false.
   */
  idNumber?: string;

  // =======================================================
  // BVN
  // =======================================================

  /**
   * Only the last four digits should ever be returned
   * by the backend.
   */
  bvnLast4?: string | null;

  bvnVerificationStatus?: BvnVerificationStatus;

  bvnVerificationReference?: string | null;

  bvnVerificationReason?: string | null;

  bvnVerifiedAt?: string | null;

  // =======================================================
  // PAYSTACK CUSTOMER VERIFICATION
  // =======================================================

  customerVerificationStatus?: CustomerVerificationStatus;

  customerVerificationReference?: string | null;

  customerVerificationReason?: string | null;

  customerVerifiedAt?: string | null;

  verificationProvider?: string | null;

  // =======================================================
  // FACE VERIFICATION
  // =======================================================

  faceVerificationStatus?: FaceVerificationStatus;

  faceVerificationReference?: string | null;

  faceVerificationReason?: string | null;

  faceVerifiedAt?: string | null;

  faceVerificationProvider?: string | null;

  // =======================================================
  // KYC REVIEW STATUS
  // =======================================================

  status?: KycStatus;

  rejectionReason?: string | null;

  submittedAt?: string | null;

  verifiedAt?: string | null;

  verifiedBy?: string | null;

  // =======================================================
  // TIMESTAMPS
  // =======================================================

  createdAt?: string;

  updatedAt?: string;
}

// =========================================================
// KYC VERIFICATION STATUS
// =========================================================

export interface KycVerificationStatus {
  exists?: boolean;

  kycStatus?: KycStatus;

  kycVerified?: boolean;

  // BVN
  bvnVerificationStatus?: BvnVerificationStatus;

  bvnVerified?: boolean;

  bvnLast4?: string | null;

  bvnVerificationReference?: string | null;

  bvnVerificationReason?: string | null;

  bvnVerifiedAt?: string | null;

  // Paystack customer
  customerVerificationStatus?: CustomerVerificationStatus;

  customerVerified?: boolean;

  customerVerificationReference?: string | null;

  customerVerificationReason?: string | null;

  customerVerifiedAt?: string | null;

  verificationProvider?: string | null;

  // Face
  faceVerificationStatus?: FaceVerificationStatus;

  faceVerified?: boolean;

  faceVerificationReference?: string | null;

  faceVerificationReason?: string | null;

  faceVerifiedAt?: string | null;

  faceVerificationProvider?: string | null;

  // Overall
  complete?: boolean;

  isKycComplete?: boolean;

  isBvnVerified?: boolean;

  isCustomerVerified?: boolean;

  isFaceVerified?: boolean;
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

export interface KycVerificationStatusResponse {
  success: boolean;
  message?: string;
  data?: KycVerificationStatus | null;
}

// =========================================================
// KYC SUBMIT PAYLOAD
// =========================================================

export interface SubmitKycPayload {
  firstName: string;
  lastName: string;

  dateOfBirth: string;

  gender: KycGender;

  address: string;
  city: string;
  state: string;
  country?: string;

  idType: KycIdType;
  idNumber: string;

  /**
   * Optional.
   *
   * BVN verification is normally performed separately
   * through /kyc/bvn/verify.
   */
  bvn?: string;
}

// =========================================================
// BVN REQUEST
// =========================================================

export interface StartBvnVerificationPayload {
  /**
   * Exactly 11 digits.
   */
  bvn: string;

  /**
   * Optional bank account ID.
   *
   * If omitted, the backend uses the user's verified
   * primary bank account.
   */
  bankAccountId?: string;
}

// =========================================================
// BVN RESPONSE
// =========================================================

export interface StartBvnVerificationData {
  bvnLast4?: string | null;

  bvnVerificationStatus: BvnVerificationStatus;

  customerVerificationStatus: CustomerVerificationStatus;

  verificationProvider?: string | null;

  verificationReference?: string | null;

  reference?: string | null;

  status?: "pending" | "verified" | "failed";

  testMode?: boolean;
}

export interface StartBvnVerificationResponse {
  success: boolean;

  message?: string;

  data?: StartBvnVerificationData | null;
}

// =========================================================
// FACE VERIFICATION REQUEST
// =========================================================

export interface StartFaceVerificationPayload {
  /**
   * Selfie captured by the frontend.
   *
   * Usually sent as a base64 data URL unless the backend
   * is changed to accept multipart/form-data.
   */
  selfie: string;
}

// =========================================================
// FACE VERIFICATION RESPONSE
// =========================================================

export interface StartFaceVerificationData {
  status?: "pending" | "verified" | "failed";

  reference?: string | null;

  faceVerificationStatus: FaceVerificationStatus;

  faceVerificationReason?: string | null;

  faceVerificationProvider?: string | null;

  testMode?: boolean;
}

export interface StartFaceVerificationResponse {
  success: boolean;

  message?: string;

  data?: StartFaceVerificationData | null;
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
    await API.get<KycResponse>(
      "/kyc/me",
    );

  return response.data;
};

/**
 * Submit / update customer KYC.
 *
 * Backend:
 * POST /api/kyc
 *
 * This endpoint uses JSON.
 *
 * The unified onboarding flow does NOT upload:
 * - idDocumentFront
 * - selfie
 *
 * BVN verification is handled separately through:
 * POST /api/kyc/bvn/verify
 */
const submitKyc = async (
  payload: SubmitKycPayload,
): Promise<KycResponse> => {
  const response =
    await API.post<KycResponse>(
      "/kyc",
      payload,
    );

  return response.data;
};

// =========================================================
// BVN VERIFICATION
// =========================================================

/**
 * Start BVN / Paystack customer identity verification.
 *
 * Backend:
 * POST /api/kyc/bvn/verify
 *
 * Body:
 * {
 *   bvn: "12345678901",
 *   bankAccountId?: "..."
 * }
 *
 * If bankAccountId is omitted, the backend uses the
 * user's verified primary bank account.
 *
 * The full BVN is never returned.
 */
const startBvnVerification = async (
  payload: StartBvnVerificationPayload,
): Promise<StartBvnVerificationResponse> => {
  const response =
    await API.post<StartBvnVerificationResponse>(
      "/kyc/bvn/verify",
      payload,
    );

  return response.data;
};

// =========================================================
// FACE VERIFICATION
// =========================================================

/**
 * Start face verification.
 *
 * Backend:
 * POST /api/kyc/face/verify
 *
 * Body:
 * {
 *   selfie: "data:image/jpeg;base64,..."
 * }
 */
const startFaceVerification = async (
  payload: StartFaceVerificationPayload,
): Promise<StartFaceVerificationResponse> => {
  const response =
    await API.post<StartFaceVerificationResponse>(
      "/kyc/face/verify",
      payload,
    );

  return response.data;
};

// =========================================================
// VERIFICATION STATUS
// =========================================================

/**
 * Get current KYC/BVN/Paystack/Face verification status.
 *
 * Backend:
 * GET /api/kyc/verification-status
 */
const getVerificationStatus =
  async (): Promise<KycVerificationStatusResponse> => {
    const response =
      await API.get<KycVerificationStatusResponse>(
        "/kyc/verification-status",
      );

    return response.data;
  };

// =========================================================
// ADMIN
// =========================================================

/**
 * Get ALL KYC records.
 *
 * Backend:
 * GET /api/kyc/admin
 */
const getAllKyc =
  async (): Promise<KycListResponse> => {
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
const getPendingKyc =
  async (): Promise<KycListResponse> => {
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
  startBvnVerification,
  startFaceVerification,
  getVerificationStatus,

  // Admin
  getAllKyc,
  getKycById,
  getPendingKyc,
  verifyKyc,
  rejectKyc,
};

export {
  getMyKyc,
  submitKyc,
  startBvnVerification,
  startFaceVerification,
  getVerificationStatus,

  getAllKyc,
  getKycById,
  getPendingKyc,
  verifyKyc,
  rejectKyc,
};

export default kycApi;


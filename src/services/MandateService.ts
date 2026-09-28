import API from "./Api";

// =====================================================
// TYPES
// =====================================================

export type MandateStatus =
  | "pending"
  | "authorization_required"
  | "authorized"
  | "active"
  | "cancelled"
  | "failed"
  | "expired";

export type ActivationChargeStatus =
  | "pending"
  | "successful"
  | "failed"
  | "refunded";

export type MandateCard = {
  brand?: string | null;
  type?: string | null;
  last4?: string | null;
  expMonth?: string | null;
  expYear?: string | null;
  reusable?: boolean | null;
};

export type Mandate = {
  _id: string;

  mandateReference?: string;

  providerMandateId?: string | null;

  authorizationUrl?: string | null;

  authorizationReference?: string | null;

  authorizationCode?: string | null;

  card?: MandateCard | null;

  cardBrand?: string | null;
  cardType?: string | null;
  cardLast4?: string | null;
  cardExpMonth?: string | null;
  cardExpYear?: string | null;

  loanOffer?:
    | string
    | {
        _id?: string;
      }
    | null;

  loanApplication?:
    | string
    | {
        _id?: string;
      }
    | null;

  offerId?: string | null;

  amountLimit?: number;
  frequency?: string;

  startDate?: string | null;
  endDate?: string | null;

  status: MandateStatus;

  authorizedAt?: string | null;
  activatedAt?: string | null;
  cancelledAt?: string | null;
  failedAt?: string | null;
  expiredAt?: string | null;

  failureReason?: string | null;

  activationChargeAmount?: number | null;
  activationChargeStatus?: ActivationChargeStatus | null;
  activationChargeReference?: string | null;

  activationChargeData?: Record<string, unknown> | null;

  activationChargeInitiatedAt?: string | null;
  activationChargeCompletedAt?: string | null;
  activationChargeRefundedAt?: string | null;

  providerData?: Record<string, unknown> | null;

  createdAt?: string;
  updatedAt?: string;
};

export type LoanProduct = {
  _id?: string;
  name?: string;
  code?: string;
  currency?: string;
  interestRate?: number;
  interestType?: string;
  repaymentFrequency?: string;
};

export type LoanApplication = {
  _id?: string;
  applicationNumber?: string;
  amountRequested?: number;
  durationDays?: number;
  purpose?: string;
  status?: string;
  createdAt?: string;
};

export type LoanOffer = {
  _id: string;

  user?: string;

  loanApplication?:
    | string
    | LoanApplication
    | null;

  loanProduct?:
    | string
    | LoanProduct
    | null;

  creditAssessment?: unknown;

  approvedAmount?: number;

  interestRate?: number;

  interestType?: string;

  processingFee?: number;

  serviceFee?: number;

  totalInterest?: number;

  totalFees?: number;

  totalRepayment?: number;

  durationDays?: number;

  repaymentFrequency?: string;

  installmentAmount?: number;

  numberOfInstallments?: number;

  status?: string;

  expiresAt?: string;

  acceptedAt?: string | null;

  rejectedAt?: string | null;

  createdAt?: string;
};

export type MandateResponse = {
  success: boolean;

  data?: Mandate | null;

  message?: string;
};

// =====================================================
// CONSTANTS
// =====================================================

export const MANDATES_BASE_URL = "/mandates";

export const TERMINAL_MANDATE_STATUSES: MandateStatus[] = [
  "cancelled",
  "failed",
  "expired",
];

export const POLL_INTERVAL_MS = 10_000;

export const MAX_POLL_ATTEMPTS = 6;

// =====================================================
// ERROR HELPER
// =====================================================

export const getApiErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  const typedError = error as {
    response?: {
      data?: {
        message?: string;
      };
    };

    message?: string;
  };

  return (
    typedError?.response?.data?.message ||
    typedError?.message ||
    fallback
  );
};

// =====================================================
// MANDATE STATUS
// =====================================================

export const getMandateStatus = async (
  mandateId: string,
): Promise<Mandate> => {
  if (!mandateId) {
    throw new Error("Mandate ID is missing.");
  }

  const response =
    await API.get<MandateResponse>(
      `${MANDATES_BASE_URL}/${encodeURIComponent(
        mandateId,
      )}/status`,
    );

  if (
    !response.data.success ||
    !response.data.data
  ) {
    throw new Error(
      response.data.message ||
        "Unable to update card authorization status.",
    );
  }

  return response.data.data;
};

// =====================================================
// CREATE CARD AUTHORIZATION
// =====================================================

export const createMandate = async (
  offerId: string,
): Promise<Mandate> => {
  if (!offerId) {
    throw new Error(
      "Loan offer ID is missing.",
    );
  }

  const response =
    await API.post<MandateResponse>(
      `${MANDATES_BASE_URL}/offer/${encodeURIComponent(
        offerId,
      )}`,
    );

  if (
    !response.data.success ||
    !response.data.data
  ) {
    throw new Error(
      response.data.message ||
        "Unable to create card authorization.",
    );
  }

  return response.data.data;
};

// =====================================================
// MANDATE HELPERS
// =====================================================

export const isMandateTerminal = (
  status?: MandateStatus,
): boolean => {
  return Boolean(
    status &&
      TERMINAL_MANDATE_STATUSES.includes(status),
  );
};

export const isMandateActive = (
  status?: MandateStatus,
): boolean => {
  return status === "active";
};

export const isMandatePendingAuthorization = (
  status?: MandateStatus,
): boolean => {
  return (
    status === "pending" ||
    status === "authorization_required" ||
    status === "authorized"
  );
};

// =====================================================
// AUTHORIZATION URL
// =====================================================

/**
 * Validates the Paystack hosted authorization URL
 * before redirecting the customer.
 *
 * The actual debit/credit card form is hosted by
 * Paystack. The loan frontend does not collect:
 * - card number
 * - CVV
 * - PIN
 */
export const validateAuthorizationUrl = (
  authorizationUrl?: string | null,
): string | null => {
  if (!authorizationUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(
      authorizationUrl,
      window.location.origin,
    );

    if (
      parsedUrl.protocol !== "https:" &&
      parsedUrl.protocol !== "http:"
    ) {
      return null;
    }

    return parsedUrl.toString();
  } catch {
    return null;
  }
};

// =====================================================
// PROVIDER RETURN DETECTION
// =====================================================

/**
 * Detects whether the customer has returned from
 * Paystack authorization.
 *
 * These query parameters only indicate that the browser
 * returned from the provider. They are NOT proof that
 * the card authorization succeeded.
 *
 * The backend must verify the transaction with Paystack.
 */
export const isProviderReturn = (): boolean => {
  const searchParams = new URLSearchParams(
    window.location.search,
  );

  return Boolean(
    searchParams.get("reference") ||
      searchParams.get("trxref") ||
      searchParams.get("mandate") === "success",
  );
};

// =====================================================
// PROVIDER REFERENCE
// =====================================================

/**
 * Gets the Paystack/internal mandate reference from
 * the current callback URL.
 */
export const getProviderReturnReference =
  (): string | null => {
    const searchParams = new URLSearchParams(
      window.location.search,
    );

    return (
      searchParams.get("reference") ||
      searchParams.get("trxref")
    );
  };

// =====================================================
// POLLING
// =====================================================

export const wait = (
  milliseconds: number,
): Promise<void> =>
  new Promise((resolve) =>
    setTimeout(resolve, milliseconds),
  );

/**
 * Polls the backend for the latest card authorization
 * status.
 *
 * The backend remains responsible for verifying Paystack.
 */
export const pollMandateStatus = async (
  mandateId: string,
  onStatus?: (mandate: Mandate) => void,
): Promise<Mandate | null> => {
  if (!mandateId) {
    return null;
  }

  for (
    let attempt = 0;
    attempt < MAX_POLL_ATTEMPTS;
    attempt += 1
  ) {
    try {
      const current =
        await getMandateStatus(mandateId);

      onStatus?.(current);

      // -------------------------------------------------
      // ACTIVE
      // -------------------------------------------------

      if (
        current.status === "active"
      ) {
        return current;
      }

      // -------------------------------------------------
      // TERMINAL FAILURE
      // -------------------------------------------------

      if (
        current.status === "failed" ||
        current.status === "cancelled" ||
        current.status === "expired"
      ) {
        return current;
      }

      // -------------------------------------------------
      // CONTINUE POLLING
      // -------------------------------------------------

      if (
        attempt <
        MAX_POLL_ATTEMPTS - 1
      ) {
        await wait(POLL_INTERVAL_MS);
      }
    } catch (error) {
      console.error(
        "POLL CARD AUTHORIZATION STATUS ERROR:",
        error,
      );

      return null;
    }
  }

  return null;
};

// =====================================================
// GET MANDATE BY REFERENCE
// =====================================================

export const getMandateByReference =
  async (
    reference: string,
  ): Promise<Mandate> => {
    if (!reference) {
      throw new Error(
        "Mandate reference is missing.",
      );
    }

    const response =
      await API.get<MandateResponse>(
        `${MANDATES_BASE_URL}/reference/${encodeURIComponent(
          reference,
        )}`,
      );

    if (
      !response.data.success ||
      !response.data.data
    ) {
      throw new Error(
        response.data.message ||
          "Unable to find repayment mandate.",
      );
    }

    return response.data.data;
  };

// =====================================================
// CARD DETAILS HELPERS
// =====================================================

export const getMandateCardLast4 = (
  mandate?: Mandate | null,
): string | null => {
  if (!mandate) {
    return null;
  }

  return (
    mandate.cardLast4 ||
    mandate.card?.last4 ||
    null
  );
};

export const getMandateCardBrand = (
  mandate?: Mandate | null,
): string | null => {
  if (!mandate) {
    return null;
  }

  return (
    mandate.cardBrand ||
    mandate.card?.brand ||
    null
  );
};

// =====================================================
// ACTIVATION CHARGE HELPERS
// =====================================================

export const getActivationChargeAmount = (
  mandate?: Mandate | null,
): number | null => {
  if (
    !mandate ||
    mandate.activationChargeAmount ===
      undefined ||
    mandate.activationChargeAmount === null
  ) {
    return null;
  }

  const amount = Number(
    mandate.activationChargeAmount,
  );

  return Number.isFinite(amount)
    ? amount
    : null;
};

export const isActivationChargeSuccessful = (
  mandate?: Mandate | null,
): boolean => {
  return (
    mandate?.activationChargeStatus ===
    "successful"
  );
};

// =====================================================
// SAFE AUTHORIZATION CODE CHECK
// =====================================================

/**
 * The authorization code is sensitive provider data.
 * Never display it in the UI.
 */
export const hasReusableAuthorization = (
  mandate?: Mandate | null,
): boolean => {
  return Boolean(
    mandate?.authorizationCode,
  );
};
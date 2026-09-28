
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { toast } from "react-toastify";

import RepaymentMandateStep from "./RepaymentMandateStep";

import type { Mandate } from "../services/MandateService";

import API from "../services/Api";

// =========================================================
// TYPES
// =========================================================

type LoanProduct = {
  _id?: string;
  name?: string;
  code?: string;
  currency?: string;
  interestRate?: number;
  interestType?: string;
  repaymentFrequency?: string;
};

type LoanApplication = {
  _id?: string;
  applicationNumber?: string;
  amountRequested?: number;
  durationDays?: number;
  purpose?: string;
  status?: string;
  createdAt?: string;
};

type LoanOffer = {
  _id: string;
  user?: string;
  loanApplication?: LoanApplication | null;
  loanProduct?: LoanProduct | null;
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

type LoanOfferResponse = {
  success: boolean;
  data?: LoanOffer;
  message?: string;
};

type MandateResponse = {
  success: boolean;
  data?: Mandate | null;
  message?: string;
};

type Step = 1 | 2;

// =========================================================
// CONSTANTS
// =========================================================

const LOAN_OFFERS_BASE_URL = "/loan-offers";
const MANDATES_BASE_URL = "/mandates";

const CURRENT_MANDATE_STATUSES = [
  "pending",
  "authorization_required",
  "authorized",
  "active",
];

// =========================================================
// HELPERS
// =========================================================

const formatMoney = (
  amount?: number,
  currency = "NGN",
) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const formatStatus = (status?: string | null) => {
  if (!status) return "N/A";

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getStatusClass = (status?: string) => {
  switch (status?.toLowerCase()) {
    case "accepted":
    case "active":
      return "bg-green-100 text-green-700";

    case "authorized":
      return "bg-blue-100 text-blue-700";

    case "authorization_required":
      return "bg-orange-100 text-orange-700";

    case "rejected":
      return "bg-red-100 text-red-700";

    case "expired":
    case "cancelled":
      return "bg-gray-100 text-gray-600";

    case "pending":
      return "bg-yellow-100 text-yellow-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
};

const formatDateTime = (date?: string | null) => {
  if (!date) return "N/A";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "N/A";
  }

  return parsedDate.toLocaleString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getApiErrorMessage = (
  error: any,
  fallback: string,
) =>
  error?.response?.data?.message ||
  error?.message ||
  fallback;

// =========================================================
// COMPONENT
// =========================================================

export default function LoanOfferDetails() {
  const navigate = useNavigate();

  const { offerId } = useParams<{
    offerId?: string;
  }>();

  const [offer, setOffer] = useState<LoanOffer | null>(null);

  const [mandate, setMandate] =
    useState<Mandate | null>(null);

  const [loading, setLoading] = useState(true);

  const [mandateLoading, setMandateLoading] =
    useState(false);

  const [processing, setProcessing] =
    useState(false);

  const [error, setError] = useState("");

  const [currentStep, setCurrentStep] =
    useState<Step>(1);

  // =========================================================
  // LOAD OFFER
  // =========================================================

  useEffect(() => {
    let mounted = true;

    const loadOffer = async () => {
      if (!offerId) {
        if (mounted) {
          setError(
            "Loan offer ID is missing. Please open the loan offer again.",
          );
          setLoading(false);
        }

        return;
      }

      try {
        setLoading(true);
        setError("");

        const response =
          await API.get<LoanOfferResponse>(
            `${LOAN_OFFERS_BASE_URL}/${offerId}`,
          );

        if (
          !response.data.success ||
          !response.data.data
        ) {
          throw new Error(
            response.data.message ||
              "Unable to load loan offer.",
          );
        }

        if (!mounted) return;

        const loadedOffer =
          response.data.data;

        setOffer(loadedOffer);

        setCurrentStep(
          loadedOffer.status === "accepted"
            ? 2
            : 1,
        );
      } catch (error: any) {
        console.error(
          "LOAD OFFER ERROR:",
          error?.response?.data || error,
        );

        if (mounted) {
          setError(
            getApiErrorMessage(
              error,
              "Unable to load loan offer.",
            ),
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadOffer();

    return () => {
      mounted = false;
    };
  }, [offerId]);

  // =========================================================
  // LOAD CURRENT MANDATE
  //
  // GET /api/mandates/offer/:offerId/active
  //
  // Backend includes:
  // pending
  // authorization_required
  // authorized
  // active
  // =========================================================

  const loadCurrentMandate = useCallback(
    async (
      showLoading = true,
      targetOfferId = offerId,
    ) => {
      if (!targetOfferId) {
        setMandate(null);
        return;
      }

      try {
        if (showLoading) {
          setMandateLoading(true);
        }

        const response =
          await API.get<MandateResponse>(
            `${MANDATES_BASE_URL}/offer/${targetOfferId}/active`,
          );

        if (!response.data.success) {
          setMandate(null);
          return;
        }

        setMandate(
          response.data.data ?? null,
        );
      } catch (error: any) {
        console.error(
          "LOAD CURRENT MANDATE ERROR:",
          error?.response?.data || error,
        );

        /*
         * Do not destroy an already-loaded mandate
         * because of a temporary network failure.
         */
      } finally {
        if (showLoading) {
          setMandateLoading(false);
        }
      }
    },
    [offerId],
  );

  // =========================================================
  // LOAD MANDATE AFTER OFFER BECOMES ACCEPTED
  // =========================================================

  useEffect(() => {
    if (offer?.status !== "accepted") {
      setMandate(null);
      return;
    }

    setCurrentStep(2);

    void loadCurrentMandate();
  }, [
    offer?.status,
    loadCurrentMandate,
  ]);

  // =========================================================
  // ACCEPT OFFER
  // =========================================================

  const handleAccept = async () => {
    if (!offerId || !offer) {
      toast.error("Loan offer ID is missing.");
      return;
    }

    if (offer.status !== "pending") {
      toast.error(
        "This loan offer is no longer available for acceptance.",
      );
      return;
    }

    if (offer.expiresAt) {
      const expiresAt =
        new Date(offer.expiresAt);

      if (
        !Number.isNaN(expiresAt.getTime()) &&
        expiresAt <= new Date()
      ) {
        toast.error(
          "This loan offer has expired.",
        );
        return;
      }
    }

    const confirmed = window.confirm(
      "Are you sure you want to accept this loan offer?",
    );

    if (!confirmed) return;

    try {
      setProcessing(true);
      setError("");

      const response =
        await API.patch<LoanOfferResponse>(
          `${LOAN_OFFERS_BASE_URL}/${offerId}/accept`,
        );

      if (!response.data.success) {
        throw new Error(
          response.data.message ||
            "Unable to accept loan offer.",
        );
      }

      const acceptedOffer =
        response.data.data ??
        ({
          ...offer,
          status: "accepted",
          acceptedAt:
            new Date().toISOString(),
        } as LoanOffer);

      /*
       * Important:
       *
       * Do NOT call loadCurrentMandate() here.
       *
       * React state updates are asynchronous and the
       * current callback still has the old offer.status.
       *
       * The effect watching offer.status will load the
       * mandate after the accepted state has been applied.
       */

      setOffer(acceptedOffer);
      setCurrentStep(2);

      toast.success(
        response.data.message ||
          "Loan offer accepted successfully.",
      );
    } catch (error: any) {
      console.error(
        "ACCEPT OFFER ERROR:",
        error?.response?.data || error,
      );

      const message =
        getApiErrorMessage(
          error,
          "Unable to accept loan offer.",
        );

      setError(message);
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  // =========================================================
  // REJECT OFFER
  // =========================================================

  const handleReject = async () => {
    if (!offerId || !offer) {
      toast.error("Loan offer ID is missing.");
      return;
    }

    if (offer.status !== "pending") {
      toast.error(
        "This loan offer is no longer available for rejection.",
      );
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to reject this loan offer? This action cannot be undone.",
    );

    if (!confirmed) return;

    try {
      setProcessing(true);
      setError("");

      const response =
        await API.patch<LoanOfferResponse>(
          `${LOAN_OFFERS_BASE_URL}/${offerId}/reject`,
        );

      if (!response.data.success) {
        throw new Error(
          response.data.message ||
            "Unable to reject loan offer.",
        );
      }

      if (response.data.data) {
        setOffer(response.data.data);
      } else {
        setOffer((current) =>
          current
            ? {
                ...current,
                status: "rejected",
                rejectedAt:
                  new Date().toISOString(),
              }
            : current,
        );
      }

      toast.success(
        response.data.message ||
          "Loan offer rejected.",
      );
    } catch (error: any) {
      console.error(
        "REJECT OFFER ERROR:",
        error?.response?.data || error,
      );

      const message =
        getApiErrorMessage(
          error,
          "Unable to reject loan offer.",
        );

      setError(message);
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  // =========================================================
  // DERIVED DATA
  // =========================================================

  const currency =
    offer?.loanProduct?.currency ||
    "NGN";

  const expiresAt = useMemo(
    () =>
      offer?.expiresAt
        ? new Date(offer.expiresAt)
        : null,
    [offer?.expiresAt],
  );

  const isExpired = Boolean(
    expiresAt &&
      !Number.isNaN(
        expiresAt.getTime(),
      ) &&
      expiresAt <= new Date(),
  );

  const canRespond =
    offer?.status === "pending" &&
    !isExpired;

  const isStep1 =
    currentStep === 1;

  const isStep2 =
    currentStep === 2;

  const mandateStatus =
    mandate?.status?.toLowerCase();

  const hasCurrentMandate =
    Boolean(
      mandate &&
        CURRENT_MANDATE_STATUSES.includes(
          mandateStatus || "",
        ),
    );

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2
            size={35}
            className="mx-auto animate-spin text-orange-500"
          />

          <p className="mt-3 text-sm text-gray-500">
            Loading loan offer...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error && !offer) {
    return (
      <div className="mx-auto w-full max-w-4xl px-3 py-4 sm:px-6 sm:py-6">
        <div className="rounded-xl bg-red-50 p-5 text-red-700">
          <p className="font-semibold">
            Unable to load loan offer
          </p>

          <p className="mt-1 text-sm">
            {error}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate(
              "/loans/applications",
            )
          }
          className="mt-4 w-full rounded-lg bg-black px-5 py-3 font-semibold text-white hover:bg-gray-800 sm:w-auto"
        >
          Back to Applications
        </button>
      </div>
    );
  }

  // =========================================================
  // NO OFFER
  // =========================================================

  if (!offer) {
    return (
      <div className="mx-auto w-full max-w-4xl px-3 py-4 sm:px-6 sm:py-6">
        <div className="rounded-xl bg-gray-50 p-8 text-center">
          <h2 className="text-xl font-semibold">
            Loan offer not found
          </h2>

          <p className="mt-2 text-gray-500">
            This loan offer may no longer exist.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/loans/applications",
              )
            }
            className="mt-5 w-full rounded-lg bg-black px-5 py-3 font-semibold text-white hover:bg-gray-800 sm:w-auto"
          >
            Back to Applications
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="mx-auto w-full max-w-4xl px-3 py-4 sm:px-6 sm:py-6">
      {/* BACK */}

      <button
        type="button"
        onClick={() =>
          navigate(
            "/loans/applications",
          )
        }
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-orange-500"
      >
        <ArrowLeft size={17} />
        Back to Applications
      </button>

      {/* =====================================================
          TWO-STEP PROGRESS
          ===================================================== */}

      {(offer.status === "pending" ||
        offer.status === "accepted") && (
        <div className="mb-6 rounded-2xl border bg-white p-4 shadow-sm sm:mb-8 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* STEP 1 */}

            <div className="flex min-w-0 flex-1 items-center">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-bold ${
                  currentStep >= 1
                    ? "bg-orange-500 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {currentStep > 1 ? (
                  <CheckCircle2 size={22} />
                ) : (
                  "1"
                )}
              </div>

              <div className="ml-3">
                <p className="text-sm font-bold text-gray-900">
                  Loan Offer
                </p>

                <p className="text-xs text-gray-500">
                  Review & accept
                </p>
              </div>
            </div>

            {/* CONNECTING LINE */}

            <div
              className={`mx-3 h-1 flex-1 rounded-full ${
                currentStep >= 2
                  ? "bg-orange-500"
                  : "bg-gray-200"
              }`}
            />

            {/* STEP 2 */}

            <div className="flex min-w-0 flex-1 items-center">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-bold ${
                  currentStep >= 2
                    ? "bg-orange-500 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                2
              </div>

              <div className="ml-3">
                <p className="text-sm font-bold text-gray-900">
                  Repayment Mandate
                </p>

                <p className="text-xs text-gray-500">
                  Authorize repayment
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="mb-5 rounded-2xl border bg-white p-4 shadow-sm sm:mb-6 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">
              {isStep2
                ? "Step 2 of 2"
                : "Step 1 of 2"}
            </p>

            <h1 className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
              {isStep2
                ? "Set Up Repayment Mandate"
                : "Your Loan Offer"}
            </h1>

            {offer.loanApplication
              ?.applicationNumber && (
              <p className="mt-2 text-sm text-gray-500">
                Application #{" "}
                {
                  offer.loanApplication
                    .applicationNumber
                }
              </p>
            )}

            {offer.loanProduct?.name && (
              <p className="mt-1 text-sm text-gray-500">
                {offer.loanProduct.name}
              </p>
            )}
          </div>

          <span
            className={`w-fit rounded-full px-4 py-2 text-sm font-semibold ${getStatusClass(
              offer.status,
            )}`}
          >
            {formatStatus(
              offer.status,
            )}
          </span>
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* =====================================================
          STEP 1 — LOAN OFFER
          ===================================================== */}

      {isStep1 &&
        offer.status === "pending" && (
          <>
            {/* APPROVED AMOUNT */}

            <div className="mb-5 rounded-2xl bg-black p-5 text-white shadow-sm sm:mb-6 sm:p-6">
              <p className="text-sm text-gray-300">
                Approved Loan Amount
              </p>

              <p className="mt-2 text-3xl font-bold sm:text-4xl">
                {formatMoney(
                  offer.approvedAmount,
                  currency,
                )}
              </p>

              <p className="mt-2 text-sm text-gray-300">
                {formatStatus(
                  offer.interestType,
                )}{" "}
                interest ·{" "}
                {offer.interestRate || 0}%
              </p>
            </div>

            {/* FINANCIAL DETAILS */}

            <div className="mb-5 rounded-2xl border bg-white p-4 shadow-sm sm:mb-6 sm:p-6">
              <h2 className="mb-5 text-xl font-bold">
                Offer Details
              </h2>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Detail
                  label="Approved Amount"
                  value={formatMoney(
                    offer.approvedAmount,
                    currency,
                  )}
                />

                <Detail
                  label="Interest Rate"
                  value={`${offer.interestRate || 0}%`}
                />

                <Detail
                  label="Interest Type"
                  value={formatStatus(
                    offer.interestType,
                  )}
                />

                <Detail
                  label="Total Interest"
                  value={formatMoney(
                    offer.totalInterest,
                    currency,
                  )}
                />

                <Detail
                  label="Processing Fee"
                  value={formatMoney(
                    offer.processingFee,
                    currency,
                  )}
                />

                <Detail
                  label="Service Fee"
                  value={formatMoney(
                    offer.serviceFee,
                    currency,
                  )}
                />

                <Detail
                  label="Total Fees"
                  value={formatMoney(
                    offer.totalFees,
                    currency,
                  )}
                />

                <Detail
                  label="Total Repayment"
                  value={formatMoney(
                    offer.totalRepayment,
                    currency,
                  )}
                />

                <Detail
                  label="Duration"
                  value={`${offer.durationDays || 0} days`}
                />
              </div>
            </div>

            {/* REPAYMENT */}

            <div className="mb-5 rounded-2xl border bg-white p-4 shadow-sm sm:mb-6 sm:p-6">
              <h2 className="mb-5 text-xl font-bold">
                Repayment
              </h2>

              <div className="grid gap-4 md:grid-cols-3">
                <Detail
                  label="Repayment Frequency"
                  value={formatStatus(
                    offer.repaymentFrequency,
                  )}
                />

                <Detail
                  label="Number of Installments"
                  value={String(
                    offer.numberOfInstallments ||
                      0,
                  )}
                />

                <Detail
                  label="Installment Amount"
                  value={formatMoney(
                    offer.installmentAmount,
                    currency,
                  )}
                />
              </div>
            </div>

            {/* APPLICATION */}

            {offer.loanApplication && (
              <div className="mb-5 rounded-2xl border bg-white p-4 shadow-sm sm:mb-6 sm:p-6">
                <h2 className="mb-5 text-xl font-bold">
                  Application Information
                </h2>

                <div className="grid gap-4 md:grid-cols-2">
                  <Detail
                    label="Application Number"
                    value={
                      offer.loanApplication
                        .applicationNumber ||
                      "N/A"
                    }
                  />

                  <Detail
                    label="Requested Amount"
                    value={formatMoney(
                      offer.loanApplication
                        .amountRequested,
                      currency,
                    )}
                  />

                  <Detail
                    label="Application Duration"
                    value={`${offer.loanApplication.durationDays || 0} days`}
                  />

                  <Detail
                    label="Application Status"
                    value={formatStatus(
                      offer.loanApplication
                        .status,
                    )}
                  />

                  {offer.loanApplication
                    .purpose && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-500">
                        Loan Purpose
                      </p>

                      <p className="mt-1 font-medium text-gray-900">
                        {
                          offer.loanApplication
                            .purpose
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* EXPIRATION */}

            {offer.expiresAt && (
              <div
                className={`mb-6 rounded-2xl p-5 ${
                  isExpired
                    ? "bg-red-50 text-red-700"
                    : "bg-yellow-50 text-yellow-800"
                }`}
              >
                <p className="text-sm font-medium">
                  {isExpired
                    ? "Offer Expired"
                    : "Offer Expires"}
                </p>

                <p className="mt-1 font-semibold">
                  {formatDateTime(
                    offer.expiresAt,
                  )}
                </p>
              </div>
            )}

            {/* ACCEPT / REJECT */}

            {canRespond && (
              <div className="mb-6 rounded-2xl border bg-white p-4 shadow-sm sm:mb-8 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                    <CheckCircle2 size={23} />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold">
                      Review & Accept
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Please review all loan
                      terms carefully. Once you
                      accept the offer, you will
                      continue to Step 2 to set
                      up your repayment mandate.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    disabled={processing}
                    onClick={handleAccept}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-4 font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {processing ? (
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                    ) : (
                      <CheckCircle2 size={18} />
                    )}

                    {processing
                      ? "Accepting..."
                      : "Accept Offer & Continue"}
                  </button>

                  <button
                    type="button"
                    disabled={processing}
                    onClick={handleReject}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 px-6 py-4 font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {processing ? (
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                    ) : (
                      <XCircle size={18} />
                    )}

                    Reject Offer
                  </button>
                </div>
              </div>
            )}
          </>
        )}

      {/* =====================================================
          STEP 2 — REPAYMENT MANDATE
          ===================================================== */}

      {isStep2 &&
        offer.status === "accepted" && (
          <>
            {/* CURRENT MANDATE STATUS */}

            {mandateLoading && (
              <div className="mb-5 flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-sm">
                <Loader2
                  size={20}
                  className="animate-spin text-orange-500"
                />

                <p className="text-sm text-gray-600">
                  Checking your repayment mandate...
                </p>
              </div>
            )}

            {!mandateLoading &&
              hasCurrentMandate &&
              mandateStatus && (
                <div className="mb-5 rounded-2xl border bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-500">
                        Repayment Mandate Status
                      </p>

                      <p className="mt-1 text-lg font-bold text-gray-900">
                        {formatStatus(
                          mandateStatus,
                        )}
                      </p>
                    </div>

                    <span
                      className={`w-fit rounded-full px-4 py-2 text-sm font-semibold ${getStatusClass(
                        mandateStatus,
                      )}`}
                    >
                      {formatStatus(
                        mandateStatus,
                      )}
                    </span>
                  </div>
                </div>
              )}

            <RepaymentMandateStep
              offerId={offerId}
              offer={offer}
              mandate={mandate}
              setMandate={setMandate}
              mandateLoading={mandateLoading}
              setMandateLoading={
                setMandateLoading
              }
              currency={currency}
            />
          </>
        )}

      {/* =====================================================
          OTHER TERMINAL OFFER STATES
          ===================================================== */}

      {offer.status === "rejected" && (
        <div className="mb-6 rounded-2xl bg-red-50 p-6 text-red-800">
          <div className="flex items-start gap-3">
            <XCircle
              size={30}
              className="shrink-0"
            />

            <div>
              <h2 className="text-lg font-bold">
                Loan Offer Rejected
              </h2>

              <p className="mt-1 text-sm">
                You rejected this loan offer.
              </p>

              {offer.rejectedAt && (
                <p className="mt-2 text-sm">
                  Rejected on{" "}
                  {formatDateTime(
                    offer.rejectedAt,
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {offer.status === "expired" && (
        <div className="mb-6 rounded-2xl bg-gray-100 p-6 text-gray-700">
          <h2 className="text-lg font-bold">
            Loan Offer Expired
          </h2>

          <p className="mt-1 text-sm">
            This offer is no longer available
            for acceptance.
          </p>
        </div>
      )}

      {offer.status === "cancelled" && (
        <div className="mb-6 rounded-2xl bg-gray-100 p-6 text-gray-700">
          <h2 className="text-lg font-bold">
            Loan Offer Cancelled
          </h2>

          <p className="mt-1 text-sm">
            This loan offer has been cancelled.
          </p>
        </div>
      )}

      {/* BACK */}

      <button
        type="button"
        onClick={() =>
          navigate(
            "/loans/applications",
          )
        }
        className="mb-8 inline-flex items-center gap-2 rounded-lg border px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
      >
        <ArrowLeft size={17} />
        Back to Applications
      </button>
    </div>
  );
}

// =========================================================
// DETAIL COMPONENT
// =========================================================

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-sm text-gray-500">
        {label}
      </p>

      <p className="mt-1 font-semibold text-gray-900">
        {value}
      </p>
    </div>
  );
}


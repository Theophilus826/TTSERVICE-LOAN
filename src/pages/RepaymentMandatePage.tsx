import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import API from "../services/Api";

import {
  getApiErrorMessage,
  getMandateByReference,
  getMandateStatus,
  isMandateTerminal,
  pollMandateStatus,
  type LoanOffer,
  type Mandate,
} from "../services/MandateService";

import RepaymentMandateStep from "./RepaymentMandateStep";

// =========================================================
// TYPES
// =========================================================

type LoanOfferResponse = {
  success: boolean;
  message?: string;
  data?: LoanOffer | null;
};

// =========================================================
// CONSTANTS
// =========================================================

const LOAN_OFFERS_BASE_URL = "/loan-offers";

// =========================================================
// HELPERS
// =========================================================

const normalizeId = (value: unknown): string | null => {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "_id" in value
  ) {
    const id = (value as { _id?: unknown })._id;

    return id ? String(id) : null;
  }

  return String(value);
};

const getMandateOfferId = (
  mandate: Mandate,
): string | null => {
  if (mandate.offerId) {
    return String(mandate.offerId);
  }

  return normalizeId(mandate.loanOffer);
};

// =========================================================
// PAGE
// =========================================================

const RepaymentMandatePage = () => {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  // -------------------------------------------------------
  // PAYSTACK RETURN PARAMETERS
  // -------------------------------------------------------

  const reference =
    searchParams.get("reference") ||
    searchParams.get("trxref");

  const mandateReturn =
    searchParams.get("mandate_return") === "1";

  // -------------------------------------------------------
  // STATE
  // -------------------------------------------------------

  const [offer, setOffer] =
    useState<LoanOffer | null>(null);

  const [mandate, setMandate] =
    useState<Mandate | null>(null);

  const [
    mandateLoading,
    setMandateLoading,
  ] = useState(true);

  const [
    pageLoading,
    setPageLoading,
  ] = useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [currency, setCurrency] =
    useState("NGN");

  // =======================================================
  // LOAD PAGE
  // =======================================================

  useEffect(() => {
    let mounted = true;

    const loadPage = async () => {
      // ---------------------------------------------------
      // REFERENCE REQUIRED
      // ---------------------------------------------------

      if (!reference) {
        if (!mounted) {
          return;
        }

        setError(
          "Repayment mandate reference is missing.",
        );

        setPageLoading(false);
        setMandateLoading(false);

        return;
      }

      try {
        setPageLoading(true);
        setMandateLoading(true);
        setError(null);

        // =================================================
        // 1. FIND MANDATE
        // =================================================

        const resolvedMandate =
          await getMandateByReference(reference);

        if (!mounted) {
          return;
        }

        setMandate(resolvedMandate);

        // =================================================
        // 2. GET LINKED LOAN OFFER
        // =================================================

        const offerId =
          getMandateOfferId(resolvedMandate);

        if (!offerId) {
          throw new Error(
            "This card authorization is not linked to a loan offer.",
          );
        }

        const offerResponse =
          await API.get<LoanOfferResponse>(
            `${LOAN_OFFERS_BASE_URL}/${encodeURIComponent(
              offerId,
            )}`,
          );

        if (
          !offerResponse.data.success ||
          !offerResponse.data.data
        ) {
          throw new Error(
            offerResponse.data.message ||
              "Unable to load the loan offer.",
          );
        }

        if (!mounted) {
          return;
        }

        const loadedOffer =
          offerResponse.data.data;

        setOffer(loadedOffer);

        // =================================================
        // 3. DETERMINE CURRENCY
        // =================================================

        const loanProduct =
          loadedOffer.loanProduct;

        if (
          typeof loanProduct === "object" &&
          loanProduct !== null &&
          loanProduct.currency
        ) {
          setCurrency(
            loanProduct.currency,
          );
        } else if (
          loadedOffer.currency
        ) {
          setCurrency(
            loadedOffer.currency,
          );
        }

        // =================================================
        // 4. PAYSTACK RETURN
        // =================================================

        /*
         * Returning from Paystack does NOT automatically
         * mean that authorization succeeded.
         *
         * The backend must verify the transaction and
         * update the mandate status.
         */

        if (
          mandateReturn &&
          resolvedMandate._id &&
          !isMandateTerminal(
            resolvedMandate.status,
          ) &&
          resolvedMandate.status !== "active"
        ) {
          const updatedMandate =
            await pollMandateStatus(
              resolvedMandate._id,
              (currentMandate) => {
                if (mounted) {
                  setMandate(
                    currentMandate,
                  );
                }
              },
            );

          if (
            mounted &&
            updatedMandate
          ) {
            setMandate(
              updatedMandate,
            );
          }
        }

        // =================================================
        // 5. NORMAL PAGE LOAD
        // =================================================

        if (
          !mandateReturn &&
          resolvedMandate._id &&
          !isMandateTerminal(
            resolvedMandate.status,
          ) &&
          resolvedMandate.status !== "active"
        ) {
          try {
            const refreshed =
              await getMandateStatus(
                resolvedMandate._id,
              );

            if (mounted) {
              setMandate(
                refreshed,
              );
            }
          } catch (statusError) {
            console.warn(
              "MANDATE STATUS REFRESH WARNING:",
              statusError,
            );
          }
        }
      } catch (loadError) {
        console.error(
          "LOAD REPAYMENT MANDATE PAGE ERROR:",
          loadError,
        );

        if (mounted) {
          setError(
            getApiErrorMessage(
              loadError,
              "Unable to load the card authorization.",
            ),
          );
        }
      } finally {
        if (mounted) {
          setPageLoading(false);
          setMandateLoading(false);
        }
      }
    };

    void loadPage();

    return () => {
      mounted = false;
    };
  }, [reference, mandateReturn]);

  // =======================================================
  // MANDATE SUCCESS
  // =======================================================

  const handleMandateSuccess = (
    completedMandate: Mandate,
  ) => {
    setMandate(completedMandate);

    navigate("/my-loans", {
      replace: true,
    });
  };

  // =======================================================
  // LOADING
  // =======================================================

  if (pageLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-black" />

          <h2 className="text-lg font-semibold">
            Loading card authorization...
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            We are retrieving your loan
            offer and secure card
            authorization.
          </p>
        </div>
      </div>
    );
  }

  // =======================================================
  // ERROR
  // =======================================================

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-700">
            Unable to continue
          </h2>

          <p className="mt-2 text-sm text-red-600">
            {error}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
            >
              Try Again
            </button>

            <button
              type="button"
              onClick={() =>
                navigate("/loan-offers")
              }
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium"
            >
              Back to Loan Offers
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =======================================================
  // SAFETY
  // =======================================================

  if (!offer) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <div className="rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold">
            Loan offer not found
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            We could not determine which
            loan offer this card
            authorization belongs to.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/loan-offers")
            }
            className="mt-6 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Back to Loan Offers
          </button>
        </div>
      </div>
    );
  }

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <RepaymentMandateStep
        offerId={offer._id}
        offer={offer}
        mandate={mandate}
        setMandate={setMandate}
        mandateLoading={mandateLoading}
        setMandateLoading={setMandateLoading}
        currency={currency}
        onMandateSuccess={
          handleMandateSuccess
        }
      />
    </div>
  );
};

export default RepaymentMandatePage;
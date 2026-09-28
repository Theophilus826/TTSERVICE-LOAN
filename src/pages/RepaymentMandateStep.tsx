import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  Dispatch,
  ReactNode,
  SetStateAction,
} from "react";

import {
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  LockKeyhole,
} from "lucide-react";

import { toast } from "react-toastify";

import {
  createMandate,
  getApiErrorMessage,
  getMandateStatus,
  isMandateTerminal,
  pollMandateStatus,
  validateAuthorizationUrl,
  type LoanOffer,
  type Mandate,
} from "../services/MandateService";

// =====================================================
// TYPES
// =====================================================

type Props = {
  offerId?: string;
  offer?: LoanOffer | null;

  mandate: Mandate | null;
  setMandate: Dispatch<
    SetStateAction<Mandate | null>
  >;

  mandateLoading: boolean;
  setMandateLoading: Dispatch<
    SetStateAction<boolean>
  >;

  currency: string;

  /*
   * Called when the mandate becomes active.
   *
   * The parent page can use this to finalize the
   * loan flow and navigate the customer to My Loans.
   */
  onMandateSuccess?: (
    mandate: Mandate,
  ) => void;
};

// =====================================================
// HELPERS
// =====================================================

const formatMoney = (
  amount?: number,
  currency = "NGN",
) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const formatStatus = (
  status?: string | null,
) => {
  if (!status) {
    return "N/A";
  }

  return status
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (letter) => letter.toUpperCase(),
    );
};

const formatDateTime = (
  date?: string | null,
) => {
  if (!date) {
    return "N/A";
  }

  const parsedDate = new Date(date);

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return "N/A";
  }

  return parsedDate.toLocaleString(
    "en-NG",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
  );
};

const getMandateStatusClass = (
  status?: Mandate["status"],
) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-700";

    case "authorized":
      return "bg-blue-100 text-blue-700";

    case "authorization_required":
    case "pending":
      return "bg-yellow-100 text-yellow-700";

    case "failed":
      return "bg-red-100 text-red-700";

    case "cancelled":
    case "expired":
      return "bg-gray-100 text-gray-600";

    default:
      return "bg-gray-100 text-gray-700";
  }
};

// =====================================================
// COMPONENT
// =====================================================

export default function RepaymentMandateStep({
  offerId,
  offer,
  mandate,
  setMandate,
  mandateLoading,
  setMandateLoading,
  currency,
  onMandateSuccess,
}: Props) {
  const [
    creatingMandate,
    setCreatingMandate,
  ] = useState(false);

  const [
    polling,
    setPolling,
  ] = useState(false);

  /*
   * Prevent duplicate mandate creation.
   */
  const creationInProgressRef =
    useRef(false);

  /*
   * Prevent duplicate provider-return processing.
   */
  const providerReturnHandledRef =
    useRef(false);

  /*
   * Prevent the success callback from firing
   * multiple times during polling/effects.
   */
  const successHandledRef =
    useRef(false);

  // ===================================================
  // OFFER
  // ===================================================

  const hasOffer = Boolean(offer);

  const offerAccepted =
    offer?.status === "accepted";

  // ===================================================
  // MANDATE SUCCESS
  // ===================================================

  const handleMandateActivated =
    useCallback(
      (activeMandate: Mandate) => {
        if (
          activeMandate.status !==
          "active"
        ) {
          return;
        }

        setMandate(activeMandate);

        /*
         * Do not execute the success callback more
         * than once for the same page flow.
         */
        if (
          successHandledRef.current
        ) {
          return;
        }

        successHandledRef.current =
          true;

        onMandateSuccess?.(
          activeMandate,
        );
      },
      [
        onMandateSuccess,
        setMandate,
      ],
    );

  // ===================================================
  // REFRESH STATUS
  // ===================================================

  const handleRefreshMandate =
    useCallback(
      async (
        showToast = true,
      ) => {
        if (!mandate?._id) {
          if (showToast) {
            toast.error(
              "Mandate ID is missing.",
            );
          }

          return null;
        }

        try {
          setMandateLoading(true);

          const refreshedMandate =
            await getMandateStatus(
              mandate._id,
            );

          setMandate(
            refreshedMandate,
          );

          if (
            refreshedMandate.status ===
            "active"
          ) {
            handleMandateActivated(
              refreshedMandate,
            );

            return refreshedMandate;
          }

          if (showToast) {
            toast.success(
              "Mandate status updated.",
            );
          }

          return refreshedMandate;
        } catch (error) {
          console.error(
            "REFRESH MANDATE ERROR:",
            error,
          );

          if (showToast) {
            toast.error(
              getApiErrorMessage(
                error,
                "Unable to refresh mandate status.",
              ),
            );
          }

          return null;
        } finally {
          setMandateLoading(false);
        }
      },
      [
        mandate?._id,
        setMandate,
        setMandateLoading,
        handleMandateActivated,
      ],
    );

  // ===================================================
  // PROVIDER AUTHORIZATION
  // ===================================================

  const handleExternalAuthorization =
    useCallback(
      (authorizationUrl: string) => {
        const validatedUrl =
          validateAuthorizationUrl(
            authorizationUrl,
          );

        if (!validatedUrl) {
          toast.error(
            "The Paystack authorization link is invalid.",
          );

          return false;
        }

        /*
         * Paystack handles the card-entry form.
         * Card details are not collected by this app.
         */
        window.location.assign(
          validatedUrl,
        );

        return true;
      },
      [],
    );

  // ===================================================
  // AUTHORIZE CARD
  // ===================================================

  const handleAuthorizeCard =
    useCallback(() => {
      if (
        !mandate?.authorizationUrl
      ) {
        toast.error(
          "Paystack card authorization link is not available.",
        );

        return;
      }

      handleExternalAuthorization(
        mandate.authorizationUrl,
      );
    }, [
      mandate?.authorizationUrl,
      handleExternalAuthorization,
    ]);

  // ===================================================
  // CREATE MANDATE
  // ===================================================

  const handleCreateMandate =
    async () => {
      if (
        creationInProgressRef.current
      ) {
        return;
      }

      if (!offerId) {
        toast.error(
          "Loan offer ID is missing.",
        );

        return;
      }

      if (!offer) {
        toast.error(
          "Loan offer is not loaded yet.",
        );

        return;
      }

      if (
        offer.status !== "accepted"
      ) {
        toast.error(
          "You must accept the loan offer before authorizing your card.",
        );

        return;
      }

      // =================================================
      // EXISTING MANDATE
      // =================================================

      if (mandate) {
        switch (mandate.status) {
          case "authorization_required":
          case "pending":
            if (
              mandate.authorizationUrl
            ) {
              handleAuthorizeCard();
            } else {
              await handleRefreshMandate();
            }

            return;

          case "authorized":
            toast.info(
              "Your card authorization has been received. We are confirming it.",
            );

            return;

          case "active":
            handleMandateActivated(
              mandate,
            );

            return;

          case "failed":
          case "expired":
            toast.info(
              "This authorization is no longer active. Please contact support if you need to authorize a new card.",
            );

            return;

          case "cancelled":
            toast.info(
              "This repayment authorization has been cancelled.",
            );

            return;

          default:
            toast.info(
              "A repayment authorization already exists.",
            );

            return;
        }
      }

      // =================================================
      // CREATE
      // =================================================

      creationInProgressRef.current =
        true;

      try {
        setCreatingMandate(true);
        setMandateLoading(true);

        const createdMandate =
          await createMandate(
            offerId,
          );

        setMandate(
          createdMandate,
        );

        /*
         * Handle the unlikely case where the backend
         * immediately returns an active mandate.
         */
        if (
          createdMandate.status ===
          "active"
        ) {
          handleMandateActivated(
            createdMandate,
          );

          return;
        }

        toast.success(
          "Card authorization initialized.",
        );

        /*
         * Immediately redirect the customer to Paystack.
         */
        if (
          createdMandate.authorizationUrl
        ) {
          handleExternalAuthorization(
            createdMandate.authorizationUrl,
          );

          return;
        }

        toast.info(
          "Card authorization was initialized. Please refresh the status.",
        );
      } catch (error) {
        console.error(
          "CREATE CARD MANDATE ERROR:",
          error,
        );

        toast.error(
          getApiErrorMessage(
            error,
            "Unable to initialize card authorization.",
          ),
        );
      } finally {
        setCreatingMandate(false);
        setMandateLoading(false);
        creationInProgressRef.current =
          false;
      }
    };

  // ===================================================
  // POLL STATUS
  // ===================================================

  const startMandatePolling =
    useCallback(async () => {
      if (
        !mandate?._id ||
        isMandateTerminal(
          mandate.status,
        ) ||
        mandate.status === "active"
      ) {
        return;
      }

      if (polling) {
        return;
      }

      setPolling(true);

      try {
        const result =
          await pollMandateStatus(
            mandate._id,
            (current) => {
              setMandate(current);

              if (
                current.status ===
                "active"
              ) {
                handleMandateActivated(
                  current,
                );
              }
            },
          );

        if (
          result?.status === "active"
        ) {
          handleMandateActivated(
            result,
          );

          return;
        }

        if (
          result?.status ===
          "authorization_required"
        ) {
          toast.info(
            "Card authorization is still required.",
          );
        } else if (
          result?.status ===
          "failed"
        ) {
          toast.error(
            result.failureReason ||
              "Card authorization failed.",
          );
        }
      } catch (error) {
        console.error(
          "CARD AUTHORIZATION POLLING ERROR:",
          error,
        );

        toast.error(
          getApiErrorMessage(
            error,
            "Unable to check card authorization.",
          ),
        );
      } finally {
        setPolling(false);
      }
    }, [
      mandate?._id,
      mandate?.status,
      polling,
      setMandate,
      handleMandateActivated,
    ]);

  // ===================================================
  // PROVIDER RETURN
  // ===================================================

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search,
      );

    const reference =
      params.get("reference") ||
      params.get("trxref");

    const mandateReturn =
      params.get(
        "mandate_return",
      ) === "1";

    if (
      !reference ||
      !mandateReturn
    ) {
      providerReturnHandledRef.current =
        false;

      return;
    }

    if (
      providerReturnHandledRef.current
    ) {
      return;
    }

    /*
     * Wait until the mandate has been loaded
     * from the parent page.
     */
    if (!mandate?._id) {
      return;
    }

    providerReturnHandledRef.current =
      true;

    const verifyReturnedCard =
      async () => {
        try {
          setMandateLoading(true);

          const refreshed =
            await getMandateStatus(
              mandate._id,
            );

          setMandate(
            refreshed,
          );

          if (
            refreshed.status ===
            "active"
          ) {
            handleMandateActivated(
              refreshed,
            );

            return;
          }

          if (
            refreshed.status ===
            "authorization_required"
          ) {
            toast.info(
              "The card authorization still needs to be completed.",
            );
          } else if (
            refreshed.status ===
            "failed"
          ) {
            toast.error(
              refreshed.failureReason ||
                "Card authorization failed.",
            );
          }
        } catch (error) {
          console.error(
            "VERIFY PAYSTACK RETURN ERROR:",
            error,
          );

          toast.error(
            getApiErrorMessage(
              error,
              "Unable to verify your card authorization.",
            ),
          );
        } finally {
          setMandateLoading(
            false,
          );
        }
      };

    void verifyReturnedCard();
  }, [
    mandate?._id,
    setMandate,
    setMandateLoading,
    handleMandateActivated,
  ]);

  // ===================================================
  // AUTO POLL AFTER RETURN
  // ===================================================

  useEffect(() => {
    if (
      !mandate?._id ||
      mandate.status === "active" ||
      isMandateTerminal(
        mandate.status,
      )
    ) {
      return;
    }

    const params =
      new URLSearchParams(
        window.location.search,
      );

    if (
      params.get(
        "mandate_return",
      ) !== "1"
    ) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        void startMandatePolling();
      }, 1500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    mandate?._id,
    mandate?.status,
    startMandatePolling,
  ]);

  // ===================================================
  // LOADING
  // ===================================================

  if (!hasOffer) {
    return (
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2
            size={22}
            className="animate-spin"
          />

          <div>
            <h2 className="font-semibold text-gray-900">
              Loading loan offer...
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Please wait while we load your
              accepted loan offer.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ===================================================
  // OFFER NOT ACCEPTED
  // ===================================================

  if (!offerAccepted) {
    return (
      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck
            size={24}
            className="mt-0.5 shrink-0 text-yellow-600"
          />

          <div>
            <h2 className="font-bold text-yellow-900">
              Loan Offer Not Yet Accepted
            </h2>

            <p className="mt-1 text-sm leading-6 text-yellow-800">
              Accept your loan offer before
              authorizing a repayment card.
            </p>

            {offer?.status && (
              <p className="mt-2 text-xs font-medium text-yellow-700">
                Current offer status:{" "}
                {formatStatus(
                  offer.status,
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ===================================================
  // MAIN
  // ===================================================

  return (
    <>
      {/* =================================================
          OFFER ACCEPTED
          ================================================= */}

      <div className="mb-5 rounded-2xl bg-green-50 p-4 text-green-800 sm:mb-6 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
            <CheckCircle2 size={22} />
          </div>

          <div className="flex-1">
            <h2 className="text-lg font-bold">
              Loan Offer Accepted
            </h2>

            <p className="mt-1 text-sm">
              Your loan offer has been accepted.
              The next step is to authorize a
              card for loan repayment.
            </p>

            {offer.acceptedAt && (
              <p className="mt-2 text-sm">
                Accepted on{" "}
                {formatDateTime(
                  offer.acceptedAt,
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* =================================================
          OFFER SUMMARY
          ================================================= */}

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {offer.totalRepayment !==
          undefined && (
          <Detail
            label="Total Repayment"
            value={formatMoney(
              offer.totalRepayment,
              currency,
            )}
          />
        )}

        {offer.durationDays !==
          undefined && (
          <Detail
            label="Loan Duration"
            value={`${offer.durationDays} days`}
          />
        )}

        {offer.repaymentFrequency && (
          <Detail
            label="Repayment Frequency"
            value={formatStatus(
              offer.repaymentFrequency,
            )}
          />
        )}

        {offer.installmentAmount !==
          undefined && (
          <Detail
            label="Installment Amount"
            value={formatMoney(
              offer.installmentAmount,
              currency,
            )}
          />
        )}
      </div>

      {/* =================================================
          CARD AUTHORIZATION EXPLANATION
          ================================================= */}

      <div className="mb-6 rounded-2xl border border-orange-100 bg-orange-50 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
            <CreditCard size={24} />
          </div>

          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">
              Authorize Your Repayment Card
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-700">
              We will securely redirect you to
              Paystack to enter your debit or credit
              card details and authorize the card for
              loan repayments.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <SecurityItem
                icon={
                  <LockKeyhole size={17} />
                }
                text="Secure Paystack card page"
              />

              <SecurityItem
                icon={
                  <ShieldCheck size={17} />
                }
                text="Your card details are handled by Paystack"
              />
            </div>

            <p className="mt-4 text-xs leading-5 text-gray-500">
              You will enter your card number, expiry
              date, CVV and other required details on
              Paystack's secure payment page.
            </p>
          </div>
        </div>
      </div>

      {/* =================================================
          MANDATE
          ================================================= */}

      <div className="mb-6 rounded-2xl border bg-white p-4 shadow-sm sm:mb-8 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
            <CreditCard size={23} />
          </div>

          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900 sm:text-xl">
              Card Repayment Authorization
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Authorize your card so eligible loan
              repayments can be processed using the
              reusable Paystack authorization.
            </p>
          </div>
        </div>

        {mandateLoading && !mandate ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
            <Loader2
              size={18}
              className="animate-spin"
            />

            Checking card authorization...
          </div>
        ) : mandate ? (
          <MandateDetails
            mandate={mandate}
            currency={currency}
            mandateLoading={
              mandateLoading
            }
            polling={polling}
            onAuthorize={
              handleAuthorizeCard
            }
            onRefresh={() =>
              void handleRefreshMandate()
            }
            onCheckActivation={() =>
              void startMandatePolling()
            }
          />
        ) : (
          <div className="mt-5 rounded-xl bg-gray-50 p-4 sm:mt-6 sm:p-6">
            <div className="flex items-start gap-3">
              <CreditCard
                size={24}
                className="mt-0.5 shrink-0 text-orange-600"
              />

              <div>
                <h3 className="font-bold text-gray-900">
                  Ready to Authorize Your Card
                </h3>

                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Click the button below. You will
                  be redirected to Paystack's secure
                  card form where you can enter your
                  card details.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={
                mandateLoading ||
                creatingMandate
              }
              onClick={() =>
                void handleCreateMandate()
              }
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {mandateLoading ||
              creatingMandate ? (
                <Loader2
                  size={18}
                  className="animate-spin"
                />
              ) : (
                <CreditCard size={18} />
              )}

              {mandateLoading ||
              creatingMandate
                ? "Preparing Secure Card Form..."
                : "Authorize Card with Paystack"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// =====================================================
// MANDATE DETAILS
// =====================================================

function MandateDetails({
  mandate,
  currency,
  mandateLoading,
  polling,
  onAuthorize,
  onRefresh,
  onCheckActivation,
}: {
  mandate: Mandate;
  currency: string;
  mandateLoading: boolean;
  polling: boolean;
  onAuthorize: () => void;
  onRefresh: () => void;
  onCheckActivation: () => void;
}) {
  const canRefresh =
    !mandateLoading &&
    !polling;

  const canCheckActivation =
    mandate.status === "authorized" &&
    !mandateLoading &&
    !polling;

  return (
    <div className="mt-6">
      {/* =================================================
          STATUS
          ================================================= */}

      <div className="flex flex-col gap-3 rounded-xl bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-500">
            Card Authorization Status
          </p>

          <span
            className={`mt-1 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getMandateStatusClass(
              mandate.status,
            )}`}
          >
            {formatStatus(
              mandate.status,
            )}
          </span>
        </div>

        {mandate.mandateReference && (
          <div>
            <p className="text-sm text-gray-500">
              Reference
            </p>

            <p className="mt-1 break-all font-semibold text-gray-900">
              {mandate.mandateReference}
            </p>
          </div>
        )}
      </div>

      {/* =================================================
          LOAN MANDATE DETAILS
          ================================================= */}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {mandate.amountLimit !==
          undefined && (
          <Detail
            label="Repayment Limit"
            value={formatMoney(
              mandate.amountLimit,
              currency,
            )}
          />
        )}

        {mandate.frequency && (
          <Detail
            label="Frequency"
            value={formatStatus(
              mandate.frequency,
            )}
          />
        )}

        {mandate.startDate && (
          <Detail
            label="Start Date"
            value={formatDateTime(
              mandate.startDate,
            )}
          />
        )}

        {mandate.endDate && (
          <Detail
            label="End Date"
            value={formatDateTime(
              mandate.endDate,
            )}
          />
        )}
      </div>

      {/* =================================================
          CARD INFORMATION
          ================================================= */}

      {mandate.card && (
        <div className="mt-5 rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <CreditCard
              size={20}
              className="text-gray-700"
            />

            <div>
              <p className="text-sm font-semibold text-gray-900">
                Authorized Card
              </p>

              {mandate.card.last4 && (
                <p className="mt-1 text-sm text-gray-500">
                  •••• •••• ••••{" "}
                  {mandate.card.last4}
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {mandate.card.brand && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                {mandate.card.brand}
              </span>
            )}

            {mandate.card.type && (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                {mandate.card.type}
              </span>
            )}

            {mandate.card.reusable && (
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                Reusable authorization
              </span>
            )}
          </div>
        </div>
      )}

      {/* =================================================
          AUTHORIZATION REQUIRED
          ================================================= */}

      {mandate.status ===
        "authorization_required" && (
        <div className="mt-5 rounded-xl bg-yellow-50 p-4 text-yellow-800 sm:p-5">
          <div className="flex items-start gap-3">
            <CreditCard
              size={22}
              className="mt-0.5 shrink-0"
            />

            <div>
              <h3 className="font-bold">
                Card Authorization Required
              </h3>

              <p className="mt-1 text-sm leading-6">
                Continue to Paystack to enter your
                debit or credit card details.
              </p>
            </div>
          </div>

          {mandate.authorizationUrl ? (
            <button
              type="button"
              disabled={mandateLoading}
              onClick={onAuthorize}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CreditCard size={16} />
              Enter Card Details
              <ExternalLink size={15} />
            </button>
          ) : (
            <p className="mt-3 text-xs font-medium text-yellow-700">
              The Paystack authorization link is
              currently unavailable. Refresh the
              status and try again.
            </p>
          )}
        </div>
      )}

      {/* =================================================
          PENDING
          ================================================= */}

      {mandate.status === "pending" && (
        <div className="mt-5 rounded-xl bg-yellow-50 p-4 text-yellow-800 sm:p-5">
          <h3 className="font-bold">
            Preparing Card Authorization
          </h3>

          <p className="mt-1 text-sm leading-6">
            Your card authorization session is
            being prepared.
          </p>

          {mandate.authorizationUrl && (
            <button
              type="button"
              disabled={mandateLoading}
              onClick={onAuthorize}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CreditCard size={16} />
              Continue to Paystack
              <ExternalLink size={15} />
            </button>
          )}
        </div>
      )}

      {/* =================================================
          AUTHORIZED
          ================================================= */}

      {mandate.status ===
        "authorized" && (
        <div className="mt-5 rounded-xl bg-blue-50 p-4 text-blue-800 sm:p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2
              size={23}
              className="mt-0.5 shrink-0"
            />

            <div>
              <h3 className="font-bold">
                Card Authorization Received
              </h3>

              <p className="mt-1 text-sm leading-6">
                Paystack has returned an
                authorization response. We are
                confirming the reusable card
                authorization.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          ACTIVE
          ================================================= */}

      {mandate.status === "active" && (
        <div className="mt-5 rounded-xl bg-green-50 p-4 text-green-800 sm:p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2
              size={24}
              className="mt-0.5 shrink-0"
            />

            <div>
              <h3 className="font-bold">
                Card Authorization Active
              </h3>

              <p className="mt-1 text-sm leading-6">
                Your reusable Paystack card
                authorization is active. Eligible loan
                repayments can now be processed using
                this authorization.
              </p>

              {mandate.activatedAt && (
                <p className="mt-2 text-sm">
                  Activated on{" "}
                  {formatDateTime(
                    mandate.activatedAt,
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          FAILED
          ================================================= */}

      {mandate.status === "failed" && (
        <div className="mt-5 rounded-xl bg-red-50 p-4 text-red-800 sm:p-5">
          <h3 className="font-bold">
            Card Authorization Failed
          </h3>

          <p className="mt-1 text-sm leading-6">
            {mandate.failureReason ||
              "The card authorization was not completed successfully."}
          </p>

          {mandate.authorizationUrl && (
            <button
              type="button"
              disabled={mandateLoading}
              onClick={onAuthorize}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white"
            >
              Try Card Authorization Again
              <ExternalLink size={15} />
            </button>
          )}
        </div>
      )}

      {/* =================================================
          CANCELLED
          ================================================= */}

      {mandate.status ===
        "cancelled" && (
        <div className="mt-5 rounded-xl bg-gray-100 p-4 text-gray-700 sm:p-5">
          <h3 className="font-bold">
            Authorization Cancelled
          </h3>

          <p className="mt-1 text-sm">
            This repayment card authorization has
            been cancelled.
          </p>

          {mandate.cancelledAt && (
            <p className="mt-2 text-sm">
              Cancelled on{" "}
              {formatDateTime(
                mandate.cancelledAt,
              )}
            </p>
          )}
        </div>
      )}

      {/* =================================================
          EXPIRED
          ================================================= */}

      {mandate.status === "expired" && (
        <div className="mt-5 rounded-xl bg-gray-100 p-4 text-gray-700 sm:p-5">
          <h3 className="font-bold">
            Authorization Expired
          </h3>

          <p className="mt-1 text-sm">
            This repayment card authorization has
            expired.
          </p>

          {mandate.expiredAt && (
            <p className="mt-2 text-sm">
              Expired on{" "}
              {formatDateTime(
                mandate.expiredAt,
              )}
            </p>
          )}
        </div>
      )}

      {/* =================================================
          ACTIONS
          ================================================= */}

      {!isMandateTerminal(
        mandate.status,
      ) &&
        mandate.status !== "active" && (
          <div className="mt-5 grid gap-3 sm:flex sm:flex-row">
            <button
              type="button"
              disabled={!canRefresh}
              onClick={onRefresh}
              className="inline-flex items-center justify-center gap-2 rounded-lg border px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mandateLoading ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <RefreshCw size={16} />
              )}

              Refresh Status
            </button>

            {mandate.status ===
              "authorized" && (
              <button
                type="button"
                disabled={
                  !canCheckActivation
                }
                onClick={
                  onCheckActivation
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {polling ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <RefreshCw size={16} />
                )}

                {polling
                  ? "Checking..."
                  : "Check Authorization"}
              </button>
            )}
          </div>
        )}
    </div>
  );
}

// =====================================================
// SECURITY ITEM
// =====================================================

function SecurityItem({
  icon,
  text,
}: {
  icon: ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium text-gray-700">
      <span className="text-green-600">
        {icon}
      </span>

      {text}
    </div>
  );
}

// =====================================================
// DETAIL
// =====================================================

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <p className="text-sm text-gray-500">
        {label}
      </p>

      <p className="mt-1 font-semibold text-gray-900">
        {value}
      </p>
    </div>
  );
}
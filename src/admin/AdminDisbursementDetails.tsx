
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Clock3,
  Copy,
  KeyRound,
  Loader2,
  RefreshCw,
  UserRound,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { toast } from "react-toastify";

import adminDisbursementApi, {
  type AdminDisbursement,
  type DisbursementStatus,
} from "../services/adminDisbursementApi";

// =========================================================
// HELPERS
// =========================================================

const formatMoney = (
  amount?: number | null,
  currency = "NGN",
) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
};

const formatStatus = (status?: string | null) => {
  if (!status) return "Unknown";

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatDate = (date?: string | null) => {
  if (!date) return "N/A";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "N/A";
  }

  return parsed.toLocaleString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getStatusClass = (status?: DisbursementStatus) => {
  switch (status) {
    case "successful":
      return "bg-green-100 text-green-700";

    case "processing":
      return "bg-blue-100 text-blue-700";

    case "pending":
      return "bg-yellow-100 text-yellow-700";

    case "failed":
      return "bg-red-100 text-red-700";

    case "reversed":
      return "bg-purple-100 text-purple-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getStatusIcon = (status?: DisbursementStatus) => {
  switch (status) {
    case "successful":
      return <CheckCircle2 size={17} />;

    case "processing":
      return (
        <Loader2
          size={17}
          className="animate-spin"
        />
      );

    case "pending":
      return <Clock3 size={17} />;

    case "failed":
      return <XCircle size={17} />;

    case "reversed":
      return <RotateCcw size={17} />;

    default:
      return null;
  }
};

const copyText = async (value?: string | null) => {
  if (!value) return;

  try {
    await navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard.");
  } catch {
    toast.error("Unable to copy.");
  }
};

const formatProviderData = (value: unknown) => {
  if (value == null) return "null";

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const isOtpRequiredDisbursement = (
  disbursement?: AdminDisbursement | null,
) => {
  if (!disbursement) return false;

  const providerStatus = String(
    disbursement.providerData?.status ||
      disbursement.providerData?.paystackStatus ||
      disbursement.providerData?.raw?.status ||
      "",
  )
    .trim()
    .toLowerCase();

  return (
    disbursement.status === "processing" &&
    (
      disbursement.otpRequired === true ||
      disbursement.canFinalizeOtp === true ||
      providerStatus === "otp"
    ) &&
    Boolean(disbursement.providerTransferCode)
  );
};

// =========================================================
// COMPONENT
// =========================================================

export default function AdminDisbursementDetails() {
  const navigate = useNavigate();

  const { disbursementId } = useParams<{
    disbursementId?: string;
  }>();

  const [disbursement, setDisbursement] =
    useState<AdminDisbursement | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [otp, setOtp] = useState("");
  const [finalizing, setFinalizing] = useState(false);

  // =======================================================
  // LOAD DISBURSEMENT
  // =======================================================

  const loadDisbursement = useCallback(
    async (refresh = false) => {
      if (!disbursementId) {
        toast.error("Disbursement ID is missing.");
        setLoading(false);
        return;
      }

      try {
        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response =
          await adminDisbursementApi.getDisbursement(
            disbursementId,
          );

        if (!response.success || !response.data) {
          throw new Error(
            response.message ||
              "Disbursement not found.",
          );
        }

        setDisbursement(response.data);
      } catch (error: any) {
        console.error(
          "LOAD ADMIN DISBURSEMENT ERROR:",
          error?.response?.data || error,
        );

        toast.error(
          error?.response?.data?.message ||
            error?.message ||
            "Unable to load disbursement.",
        );

        setDisbursement(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [disbursementId],
  );

  useEffect(() => {
    loadDisbursement();
  }, [loadDisbursement]);

  // =======================================================
  // RETRY
  // =======================================================

  const handleRetry = async () => {
    if (!disbursementId) {
      toast.error("Disbursement ID is missing.");
      return;
    }

    if (disbursement?.status !== "failed") {
      toast.error(
        "Only failed disbursements can be retried.",
      );
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to retry this disbursement?",
    );

    if (!confirmed) return;

    try {
      setRetrying(true);

      const response =
        await adminDisbursementApi.retryDisbursement(
          disbursementId,
        );

      if (!response.success || !response.data) {
        throw new Error(
          response.message ||
            "Unable to retry disbursement.",
        );
      }

      setDisbursement(response.data);

      await loadDisbursement(true);

      toast.success(
        response.message ||
          "Disbursement retry initiated.",
      );
    } catch (error: any) {
      console.error(
        "RETRY DISBURSEMENT ERROR:",
        error?.response?.data || error,
      );

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to retry disbursement.",
      );
    } finally {
      setRetrying(false);
    }
  };

  // =======================================================
  // FINALIZE OTP
  // =======================================================

  const handleFinalizeOtp = async () => {
    if (!disbursementId) {
      toast.error("Disbursement ID is missing.");
      return;
    }

    const cleanOtp = otp.replace(/\D/g, "");

    if (cleanOtp.length < 4) {
      toast.error("Enter a valid Paystack OTP.");
      return;
    }

    if (
      disbursement?.status !== "processing" ||
      !disbursement?.canFinalizeOtp
    ) {
      toast.error(
        "This disbursement is not currently waiting for OTP.",
      );
      return;
    }

    try {
      setFinalizing(true);

      const response =
        await adminDisbursementApi.finalizeDisbursement(
          disbursementId,
          cleanOtp,
        );

      if (!response.success || !response.data) {
        throw new Error(
          response.message ||
            "Unable to finalize disbursement.",
        );
      }

      setDisbursement(response.data);
      setOtp("");

      toast.success(
        response.message ||
          "Disbursement OTP submitted successfully.",
      );

      await loadDisbursement(true);
    } catch (error: any) {
      console.error(
        "FINALIZE DISBURSEMENT OTP ERROR:",
        error?.response?.data || error,
      );

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to finalize disbursement.",
      );
    } finally {
      setFinalizing(false);
    }
  };

  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2
            size={35}
            className="mx-auto animate-spin text-orange-500"
          />

          <p className="mt-3 text-sm text-gray-500">
            Loading disbursement...
          </p>
        </div>
      </div>
    );
  }

  // =======================================================
  // NOT FOUND
  // =======================================================

  if (!disbursement) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-2xl border bg-white p-10 text-center shadow-sm">
          <XCircle
            size={45}
            className="mx-auto text-red-400"
          />

          <h2 className="mt-4 text-xl font-bold">
            Disbursement not found
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            The disbursement could not be found.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/admin/disbursements")
            }
            className="mt-6 rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Back to Disbursements
          </button>
        </div>
      </div>
    );
  }

  // =======================================================
  // DERIVED VALUES
  // =======================================================

  const borrowerName =
    `${disbursement.user?.firstName || ""} ${
      disbursement.user?.lastName || ""
    }`.trim() || "Unknown borrower";

  const currency = disbursement.currency || "NGN";

  const isFailed =
    disbursement.status === "failed";

  const isSuccessful =
    disbursement.status === "successful";

  const isReversed =
    disbursement.status === "reversed";

  const isProcessing =
    disbursement.status === "processing";

  const otpRequired =
    isOtpRequiredDisbursement(disbursement);

  const canFinalizeOtp = otpRequired;

  const canRetry = isFailed;

  const providerResponseText =
    formatProviderData(
      disbursement.providerData,
    );

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* HEADER */}

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link
            to="/admin/disbursements"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-orange-500"
          >
            <ArrowLeft size={16} />
            Back to Disbursements
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <Banknote size={25} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Disbursement Details
              </h1>

              <p className="text-sm text-gray-500">
                Review loan disbursement transaction
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={refreshing}
            onClick={() => loadDisbursement(true)}
            className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>

          {canRetry && (
            <button
              type="button"
              disabled={retrying}
              onClick={handleRetry}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {retrying ? (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <RefreshCw size={17} />
              )}

              Retry
            </button>
          )}
        </div>
      </div>

      {/* OTP ACTION PANEL */}

      {otpRequired && (
        <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <KeyRound size={22} />
              </div>

              <div>
                <h2 className="font-bold text-orange-900">
                  Paystack OTP Required
                </h2>

                <p className="mt-1 text-sm text-orange-800">
                  This transfer has been created successfully
                  but Paystack requires an OTP before the
                  transfer can be completed.
                </p>

                {disbursement.providerTransferCode && (
                  <p className="mt-2 text-xs text-orange-700">
                    Transfer code:{" "}
                    <span className="font-semibold">
                      {disbursement.providerTransferCode}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {canFinalizeOtp && (
              <div className="w-full md:max-w-sm">
                <label
                  htmlFor="disbursement-otp"
                  className="mb-2 block text-sm font-semibold text-orange-900"
                >
                  Enter OTP
                </label>

                <div className="flex gap-2">
                  <input
                    id="disbursement-otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={8}
                    value={otp}
                    onChange={(event) =>
                      setOtp(
                        event.target.value
                          .replace(/\D/g, ""),
                      )
                    }
                    placeholder="Enter OTP"
                    disabled={finalizing}
                    className="min-w-0 flex-1 rounded-lg border border-orange-300 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 disabled:opacity-50"
                  />

                  <button
                    type="button"
                    disabled={
                      finalizing ||
                      otp.replace(/\D/g, "").length < 4
                    }
                    onClick={handleFinalizeOtp}
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {finalizing ? (
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                    ) : (
                      <CheckCircle2 size={17} />
                    )}

                    {finalizing
                      ? "Submitting..."
                      : "Submit OTP"}
                  </button>
                </div>

                <p className="mt-2 text-xs text-orange-700">
                  Do not refresh or create another transfer
                  while this OTP request is being processed.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STATUS + AMOUNT */}

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl bg-black p-6 text-white shadow-sm lg:col-span-2">
          <p className="text-sm text-gray-400">
            Disbursement Amount
          </p>

          <p className="mt-2 text-4xl font-bold">
            {formatMoney(
              disbursement.amount,
              currency,
            )}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${getStatusClass(
                disbursement.status,
              )}`}
            >
              {getStatusIcon(
                disbursement.status,
              )}

              {formatStatus(
                disbursement.status,
              )}
            </span>

            {otpRequired && (
              <span className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-700">
                <KeyRound size={16} />
                OTP Required
              </span>
            )}

            {disbursement.provider && (
              <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-gray-200">
                Provider: {disbursement.provider}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            Disbursement ID
          </p>

          <div className="mt-2 flex items-start gap-2">
            <p className="break-all text-sm font-semibold text-gray-900">
              {disbursement._id}
            </p>

            <button
              type="button"
              aria-label="Copy disbursement ID"
              onClick={() =>
                copyText(disbursement._id)
              }
              className="shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
            >
              <Copy size={15} />
            </button>
          </div>

          <p className="mt-5 text-sm text-gray-500">
            Created
          </p>

          <p className="mt-1 font-semibold text-gray-900">
            {formatDate(
              disbursement.createdAt,
            )}
          </p>
        </div>
      </div>

      {/* BORROWER */}

      <div className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
            <UserRound size={20} />
          </div>

          <div>
            <h2 className="text-lg font-bold">
              Borrower
            </h2>

            <p className="text-sm text-gray-500">
              Customer receiving the loan
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Detail
            label="Name"
            value={borrowerName}
          />

          <Detail
            label="Email"
            value={
              disbursement.user?.email || "N/A"
            }
          />

          <Detail
            label="Phone"
            value={
              disbursement.user?.phone || "N/A"
            }
          />
        </div>
      </div>

      {/* BANK ACCOUNT */}

      <div className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-bold">
          Destination Bank Account
        </h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Detail
            label="Bank"
            value={
              disbursement.bankAccount
                ?.bankName || "N/A"
            }
          />

          <Detail
            label="Account Name"
            value={
              disbursement.bankAccount
                ?.accountName || "N/A"
            }
          />

          <Detail
            label="Account Number"
            value={
              disbursement.bankAccount
                ?.accountNumber || "N/A"
            }
          />

          <Detail
            label="Bank Code"
            value={
              disbursement.bankAccount
                ?.bankCode || "N/A"
            }
          />
        </div>
      </div>

      {/* LOAN */}

      <div className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-bold">
          Loan Information
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          <Detail
            label="Application Number"
            value={
              disbursement.loanApplication
                ?.applicationNumber || "N/A"
            }
          />

          <Detail
            label="Requested Amount"
            value={formatMoney(
              disbursement.loanApplication
                ?.amountRequested,
              currency,
            )}
          />

          <Detail
            label="Approved Amount"
            value={formatMoney(
              disbursement.loanOffer
                ?.approvedAmount,
              currency,
            )}
          />

          <Detail
            label="Interest Rate"
            value={
              disbursement.loanOffer
                ?.interestRate !== undefined
                ? `${disbursement.loanOffer.interestRate}%`
                : "N/A"
            }
          />

          <Detail
            label="Application Status"
            value={formatStatus(
              disbursement.loanApplication
                ?.status,
            )}
          />

          <Detail
            label="Currency"
            value={currency}
          />
        </div>
      </div>

      {/* PROVIDER */}

      <div className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-bold">
          Provider Information
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <Detail
            label="Provider"
            value={
              disbursement.provider || "N/A"
            }
          />

          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-sm text-gray-500">
              Provider Reference
            </p>

            <div className="mt-1 flex items-center gap-2">
              <p className="break-all font-semibold text-gray-900">
                {disbursement.providerReference ||
                  "N/A"}
              </p>

              {disbursement.providerReference && (
                <button
                  type="button"
                  aria-label="Copy provider reference"
                  onClick={() =>
                    copyText(
                      disbursement.providerReference,
                    )
                  }
                  className="shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-gray-200"
                >
                  <Copy size={15} />
                </button>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-sm text-gray-500">
              Transfer Code
            </p>

            <div className="mt-1 flex items-center gap-2">
              <p className="break-all font-semibold text-gray-900">
                {disbursement.providerTransferCode ||
                  "N/A"}
              </p>

              {disbursement.providerTransferCode && (
                <button
                  type="button"
                  aria-label="Copy transfer code"
                  onClick={() =>
                    copyText(
                      disbursement.providerTransferCode,
                    )
                  }
                  className="shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-gray-200"
                >
                  <Copy size={15} />
                </button>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <p className="text-sm text-gray-500">
              Transfer ID
            </p>

            <div className="mt-1 flex items-center gap-2">
              <p className="break-all font-semibold text-gray-900">
                {disbursement.providerTransferId ||
                  "N/A"}
              </p>

              {disbursement.providerTransferId && (
                <button
                  type="button"
                  aria-label="Copy transfer ID"
                  onClick={() =>
                    copyText(
                      disbursement.providerTransferId,
                    )
                  }
                  className="shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-gray-200"
                >
                  <Copy size={15} />
                </button>
              )}
            </div>
          </div>
        </div>

        {disbursement.providerData && (
          <details className="mt-5 rounded-xl bg-gray-50 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-gray-700">
              View Provider Response
            </summary>

            <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100">
              {providerResponseText}
            </pre>
          </details>
        )}
      </div>

      {/* FAILURE */}

      {isFailed && (
        <div className="mb-6 rounded-2xl bg-red-50 p-6 text-red-800">
          <div className="flex items-start gap-3">
            <XCircle
              size={24}
              className="shrink-0"
            />

            <div>
              <h2 className="font-bold">
                Disbursement Failed
              </h2>

              <p className="mt-1 text-sm">
                {disbursement.failureReason ||
                  "No failure reason was provided."}
              </p>

              <p className="mt-2 text-sm font-medium text-red-700">
                This transfer can be retried from the admin
                dashboard once the underlying issue is resolved.
              </p>

              {disbursement.failedAt && (
                <p className="mt-2 text-sm">
                  Failed on{" "}
                  {formatDate(
                    disbursement.failedAt,
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* REVERSED */}

      {isReversed && (
        <div className="mb-6 rounded-2xl bg-purple-50 p-6 text-purple-800">
          <div className="flex items-start gap-3">
            <RotateCcw
              size={24}
              className="shrink-0"
            />

            <div>
              <h2 className="font-bold">
                Disbursement Reversed
              </h2>

              <p className="mt-1 text-sm">
                This transfer was completed earlier and
                later reversed by the provider or system
                workflow.
              </p>

              {disbursement.failureReason && (
                <p className="mt-2 text-sm font-medium text-purple-700">
                  Reason: {disbursement.failureReason}
                </p>
              )}

              {disbursement.reversedAt && (
                <p className="mt-2 text-sm">
                  Reversed on{" "}
                  {formatDate(
                    disbursement.reversedAt,
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS */}

      {isSuccessful && (
        <div className="mb-6 rounded-2xl bg-green-50 p-6 text-green-800">
          <div className="flex items-start gap-3">
            <CheckCircle2
              size={24}
              className="shrink-0"
            />

            <div>
              <h2 className="font-bold">
                Disbursement Successful
              </h2>

              <p className="mt-1 text-sm">
                The loan disbursement was successfully
                completed by the payment provider.
              </p>

              {disbursement.completedAt && (
                <p className="mt-2 text-sm">
                  Completed on{" "}
                  {formatDate(
                    disbursement.completedAt,
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PROCESSING */}

      {isProcessing && !otpRequired && (
        <div className="mb-6 rounded-2xl bg-blue-50 p-6 text-blue-800">
          <div className="flex items-start gap-3">
            <Clock3
              size={24}
              className="shrink-0"
            />

            <div>
              <h2 className="font-bold">
                Disbursement Processing
              </h2>

              <p className="mt-1 text-sm">
                The transfer has been submitted and is
                currently being processed. Refresh this
                page for the latest provider status.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TIMELINE */}

      <div className="mb-8 rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-bold">
          Transaction Timeline
        </h2>

        <TimelineItem
          title="Disbursement Created"
          date={disbursement.createdAt}
          active
        />

        <TimelineItem
          title="Processing Started"
          date={disbursement.initiatedAt}
          active={!!disbursement.initiatedAt}
        />

        {otpRequired && (
          <TimelineItem
            title="Waiting for Provider OTP"
            date={disbursement.initiatedAt}
            active
            otp
          />
        )}

        <TimelineItem
          title="Disbursement Completed"
          date={disbursement.completedAt}
          active={
            (isSuccessful || isReversed) &&
            !!disbursement.completedAt
          }
          success
        />

        <TimelineItem
          title="Disbursement Failed"
          date={disbursement.failedAt}
          active={
            isFailed &&
            !!disbursement.failedAt
          }
          failure
          last={!isReversed}
        />

        {isReversed && (
          <TimelineItem
            title="Disbursement Reversed"
            date={disbursement.reversedAt}
            active={!!disbursement.reversedAt}
            reversed
            last
          />
        )}
      </div>

      <Link
        to="/admin/disbursements"
        className="mb-8 inline-flex items-center gap-2 rounded-lg border px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
      >
        <ArrowLeft size={17} />
        Back to Disbursements
      </Link>
    </div>
  );
}

// =========================================================
// DETAIL
// =========================================================

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

      <p className="mt-1 break-words font-semibold text-gray-900">
        {value}
      </p>
    </div>
  );
}

// =========================================================
// TIMELINE
// =========================================================

function TimelineItem({
  title,
  date,
  active,
  success,
  failure,
  reversed,
  otp,
  last,
}: {
  title: string;
  date?: string | null;
  active: boolean;
  success?: boolean;
  failure?: boolean;
  reversed?: boolean;
  otp?: boolean;
  last?: boolean;
}) {
  const icon = failure ? (
    <XCircle size={18} />
  ) : success ? (
    <CheckCircle2 size={18} />
  ) : reversed ? (
    <RotateCcw size={18} />
  ) : otp ? (
    <KeyRound size={18} />
  ) : (
    <Clock3 size={18} />
  );

  const iconClass = failure
    ? "bg-red-100 text-red-600"
    : success
      ? "bg-green-100 text-green-600"
      : reversed
        ? "bg-purple-100 text-purple-600"
        : otp
          ? "bg-orange-100 text-orange-600"
          : active
            ? "bg-orange-100 text-orange-600"
            : "bg-gray-100 text-gray-400";

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full ${iconClass}`}
        >
          {icon}
        </div>

        {!last && (
          <div className="h-10 w-px bg-gray-200" />
        )}
      </div>

      <div className="pb-5">
        <p
          className={`font-semibold ${
            active
              ? "text-gray-900"
              : "text-gray-400"
          }`}
        >
          {title}
        </p>

        <p className="mt-1 text-sm text-gray-500">
          {date
            ? formatDate(date)
            : "Not reached"}
        </p>
      </div>
    </div>
  );
}

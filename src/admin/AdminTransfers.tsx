
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  CheckCircle,
  Clock,
  KeyRound,
  RefreshCw,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { toast } from "react-toastify";

import adminDisbursementApi, {
  type AdminDisbursement,
} from "../services/adminDisbursementApi";

// =========================================================
// HELPERS
// =========================================================

const getErrorMessage = (
  error: any,
  fallback: string,
) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};

const formatAmount = (
  amount?: number,
  currency = "NGN",
) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
};

const formatType = (value?: string) => {
  if (!value) {
    return "-";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const getUserName = (
  user?: AdminDisbursement["user"],
) => {
  if (!user) {
    return "Unknown";
  }

  const fullName = [
    user.firstName,
    user.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    user.email ||
    "Unknown"
  );
};

// =========================================================
// STATUS HELPERS
// =========================================================

const getProviderStatus = (
  transfer: AdminDisbursement,
) => {
  const providerData =
    transfer.providerData as any;

  return String(
    providerData?.status ||
      providerData?.paystackStatus ||
      providerData?.raw?.status ||
      "",
  )
    .trim()
    .toLowerCase();
};

const isOtpRequired = (
  transfer: AdminDisbursement,
) => {
  if (
    transfer.otpRequired === true ||
    transfer.canFinalizeOtp === true
  ) {
    return true;
  }

  return (
    transfer.status === "processing" &&
    getProviderStatus(transfer) === "otp" &&
    Boolean(
      transfer.providerTransferCode,
    )
  );
};

const statusClass = (
  transfer: AdminDisbursement,
) => {
  const status =
    transfer.status?.toLowerCase();

  if (status === "successful") {
    return "bg-green-100 text-green-700";
  }

  if (status === "failed") {
    return "bg-red-100 text-red-700";
  }

  if (status === "reversed") {
    return "bg-purple-100 text-purple-700";
  }

  if (isOtpRequired(transfer)) {
    return "bg-orange-100 text-orange-700";
  }

  if (
    status === "pending" ||
    status === "processing"
  ) {
    return "bg-yellow-100 text-yellow-700";
  }

  return "bg-gray-100 text-gray-600";
};

const displayStatus = (
  transfer: AdminDisbursement,
) => {
  if (isOtpRequired(transfer)) {
    return "OTP Required";
  }

  return formatType(
    transfer.status || "unknown",
  );
};

const statusIcon = (
  transfer: AdminDisbursement,
) => {
  if (isOtpRequired(transfer)) {
    return <KeyRound size={14} />;
  }

  switch (
    transfer.status?.toLowerCase()
  ) {
    case "successful":
      return <CheckCircle size={14} />;

    case "failed":
      return <XCircle size={14} />;

    case "reversed":
      return <RotateCcw size={14} />;

    default:
      return <Clock size={14} />;
  }
};

// =========================================================
// COMPONENT
// =========================================================

export default function AdminTransfers() {
  const [transfers, setTransfers] =
    useState<AdminDisbursement[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState<string | null>(null);

  // =======================================================
  // OTP STATE
  // =======================================================

  const [otpTransfer, setOtpTransfer] =
    useState<AdminDisbursement | null>(null);

  const [otp, setOtp] =
    useState("");

  const [finalizingOtp, setFinalizingOtp] =
    useState(false);

  // =======================================================
  // LOAD TRANSFERS
  // =======================================================

  const loadTransfers = async (
    showRefreshLoader = false,
  ) => {
    try {
      if (showRefreshLoader) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response =
        await adminDisbursementApi.getDisbursements();

      if (!response.success) {
        throw new Error(
          response.message ||
            "Failed to load disbursements",
        );
      }

      setTransfers(response.data || []);
    } catch (error: any) {
      console.error(
        "Failed to load disbursements:",
        getErrorMessage(
          error,
          "Failed to load transfers",
        ),
      );

      toast.error(
        getErrorMessage(
          error,
          "Failed to load transfers",
        ),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // =======================================================
  // INITIAL LOAD
  // =======================================================

  useEffect(() => {
    loadTransfers();
  }, []);

  // =======================================================
  // FINALIZE OTP
  // =======================================================

  const handleFinalizeOtp = async () => {
    if (!otpTransfer) {
      return;
    }

    const cleanOtp = otp.trim();

    if (!cleanOtp) {
      toast.error(
        "Please enter the Paystack OTP.",
      );
      return;
    }

    if (!/^\d{4,8}$/.test(cleanOtp)) {
      toast.error(
        "Enter a valid numeric Paystack OTP.",
      );
      return;
    }

    try {
      setFinalizingOtp(true);

      const response =
        await adminDisbursementApi.finalizeDisbursementOtp(
          otpTransfer._id,
          cleanOtp,
        );

      if (!response.success) {
        throw new Error(
          response.message ||
            "Failed to finalize transfer",
        );
      }

      toast.success(
        "Paystack transfer finalized successfully.",
      );

      setOtp("");
      setOtpTransfer(null);

      await loadTransfers(true);
    } catch (error: any) {
      console.error(
        "OTP finalization failed:",
        getErrorMessage(
          error,
          "Failed to finalize Paystack transfer",
        ),
      );

      toast.error(
        getErrorMessage(
          error,
          "Failed to finalize Paystack transfer",
        ),
      );
    } finally {
      setFinalizingOtp(false);
    }
  };

  // =======================================================
  // RETRY FAILED DISBURSEMENT
  // =======================================================

  const retryTransfer = async (
    transfer: AdminDisbursement,
  ) => {
    if (transfer.status !== "failed") {
      toast.info(
        "Only failed transfers can be retried.",
      );
      return;
    }

    try {
      setActionLoading(transfer._id);

      const response =
        await adminDisbursementApi.retryDisbursement(
          transfer._id,
        );

      if (!response.success) {
        throw new Error(
          response.message ||
            "Failed to retry transfer",
        );
      }

      toast.success(
        "Transfer retry initiated.",
      );

      await loadTransfers(true);
    } catch (error: any) {
      console.error(
        "Transfer retry failed:",
        getErrorMessage(
          error,
          "Failed to retry transfer",
        ),
      );

      toast.error(
        getErrorMessage(
          error,
          "Failed to retry transfer",
        ),
      );
    } finally {
      setActionLoading(null);
    }
  };

  // =======================================================
  // SUMMARY
  // =======================================================

  const summary = useMemo(() => {
    const completed = transfers.filter(
      (item) =>
        item.status === "successful",
    ).length;

    const pending = transfers.filter(
      (item) =>
        item.status === "pending" ||
        item.status === "processing",
    ).length;

    const otpRequired = transfers.filter(
      (item) => isOtpRequired(item),
    ).length;

    const failed = transfers.filter(
      (item) =>
        item.status === "failed",
    ).length;

    const reversed = transfers.filter(
      (item) =>
        item.status === "reversed",
    ).length;

    const totalAmount =
      transfers.reduce(
        (total, item) =>
          total + Number(item.amount || 0),
        0,
      );

    return {
      completed,
      pending,
      otpRequired,
      failed,
      reversed,
      totalAmount,
    };
  }, [transfers]);

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="space-y-6">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Transfers
          </h1>

          <p className="text-sm text-gray-500">
            Monitor and manage loan disbursements.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadTransfers(true)}
          disabled={
            loading || refreshing
          }
          className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:bg-gray-400"
        >
          <RefreshCw
            size={17}
            className={
              loading || refreshing
                ? "animate-spin"
                : ""
            }
          />

          Refresh
        </button>

      </div>

      {/* =================================================
          SUMMARY
      ================================================= */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Total Transfers
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {transfers.length}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Total Amount
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatAmount(
              summary.totalAmount,
            )}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Completed
          </p>

          <p className="mt-2 text-2xl font-bold text-green-600">
            {summary.completed}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Processing
          </p>

          <p className="mt-2 text-2xl font-bold text-yellow-600">
            {summary.pending}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            OTP Required
          </p>

          <p className="mt-2 text-2xl font-bold text-orange-600">
            {summary.otpRequired}
          </p>

          {summary.failed > 0 && (
            <p className="mt-1 text-xs text-red-500">
              {summary.failed} failed
            </p>
          )}
        </div>

      </div>

      {/* =================================================
          TABLE
      ================================================= */}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

        <div className="flex items-center gap-2 border-b px-5 py-4">

          <ArrowRightLeft
            size={20}
            className="text-orange-500"
          />

          <h2 className="font-semibold text-gray-900">
            Transfer History
          </h2>

        </div>

        <div className="overflow-x-auto">

          <table className="min-w-[1250px] w-full text-sm">

            <thead className="border-b bg-gray-50">

              <tr>

                <th className="px-5 py-4 text-left font-semibold text-gray-600">
                  Reference
                </th>

                <th className="px-5 py-4 text-left font-semibold text-gray-600">
                  Customer
                </th>

                <th className="px-5 py-4 text-left font-semibold text-gray-600">
                  Amount
                </th>

                <th className="px-5 py-4 text-left font-semibold text-gray-600">
                  Bank
                </th>

                <th className="px-5 py-4 text-left font-semibold text-gray-600">
                  Status
                </th>

                <th className="px-5 py-4 text-left font-semibold text-gray-600">
                  Date
                </th>

                <th className="px-5 py-4 text-left font-semibold text-gray-600">
                  Action
                </th>

              </tr>

            </thead>

            <tbody className="divide-y">

              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-gray-500"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw
                        size={18}
                        className="animate-spin"
                      />

                      Loading transfers...
                    </div>
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center"
                  >
                    <ArrowRightLeft
                      className="mx-auto mb-3 text-gray-300"
                      size={40}
                    />

                    <p className="font-medium text-gray-600">
                      No transfers found
                    </p>

                    <p className="mt-1 text-sm text-gray-400">
                      Disbursement records will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                transfers.map(
                  (transfer) => {
                    const otpRequired =
                      isOtpRequired(
                        transfer,
                      );

                    const busy =
                      actionLoading ===
                        transfer._id ||
                      finalizingOtp;

                    return (
                      <tr
                        key={
                          transfer._id
                        }
                        className="hover:bg-gray-50"
                      >

                        {/* REFERENCE */}

                        <td className="px-5 py-4">

                          <p className="font-medium text-gray-900">
                            {transfer.reference ||
                              transfer._id}
                          </p>

                          {transfer.providerReference && (
                            <p className="mt-1 text-xs text-gray-400">
                              Provider:{" "}
                              {
                                transfer.providerReference
                              }
                            </p>
                          )}

                          {transfer.providerTransferCode && (
                            <p className="mt-1 text-xs text-gray-400">
                              Transfer:{" "}
                              {
                                transfer.providerTransferCode
                              }
                            </p>
                          )}

                        </td>

                        {/* CUSTOMER */}

                        <td className="px-5 py-4">

                          <p className="font-medium text-gray-900">
                            {getUserName(
                              transfer.user,
                            )}
                          </p>

                          <p className="text-xs text-gray-500">
                            {
                              transfer.user
                                ?.email
                            }
                          </p>

                        </td>

                        {/* AMOUNT */}

                        <td className="px-5 py-4 font-semibold text-gray-900">
                          {formatAmount(
                            transfer.amount,
                            transfer.currency,
                          )}
                        </td>

                        {/* BANK */}

                        <td className="px-5 py-4">

                          <p className="font-medium text-gray-700">
                            {
                              transfer.bankAccount
                                ?.bankName ||
                              "-"
                            }
                          </p>

                          <p className="text-xs text-gray-500">
                            {
                              transfer.bankAccount
                                ?.accountNumber ||
                              "-"
                            }
                          </p>

                          <p className="text-xs text-gray-400">
                            {
                              transfer.bankAccount
                                ?.accountName ||
                              ""
                            }
                          </p>

                        </td>

                        {/* STATUS */}

                        <td className="px-5 py-4">

                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                              transfer,
                            )}`}
                          >
                            {statusIcon(
                              transfer,
                            )}

                            {displayStatus(
                              transfer,
                            )}
                          </span>

                        </td>

                        {/* DATE */}

                        <td className="whitespace-nowrap px-5 py-4 text-gray-500">
                          {formatDate(
                            transfer.createdAt,
                          )}
                        </td>

                        {/* ACTION */}

                        <td className="px-5 py-4">

                          <div className="flex items-center gap-2">

                            {/* OTP */}

                            {otpRequired && (
                              <button
                                type="button"
                                disabled={
                                  busy
                                }
                                onClick={() => {
                                  setOtpTransfer(
                                    transfer,
                                  );
                                  setOtp("");
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-600 hover:bg-orange-100 disabled:opacity-50"
                              >
                                <KeyRound
                                  size={14}
                                />

                                Enter OTP
                              </button>
                            )}

                            {/* PROCESSING */}

                            {transfer.status ===
                              "processing" &&
                              !otpRequired && (
                                <span className="inline-flex items-center gap-1 rounded-lg bg-yellow-50 px-3 py-1.5 text-xs font-semibold text-yellow-700">
                                  <Clock
                                    size={14}
                                  />

                                  Processing
                                </span>
                              )}

                            {/* FAILED */}

                            {transfer.status ===
                              "failed" && (
                              <button
                                type="button"
                                disabled={
                                  busy
                                }
                                onClick={() =>
                                  retryTransfer(
                                    transfer,
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 disabled:opacity-50"
                              >
                                <RotateCcw
                                  size={14}
                                />

                                Retry
                              </button>
                            )}

                            {/* SUCCESSFUL */}

                            {transfer.status ===
                              "successful" && (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                                <CheckCircle
                                  size={14}
                                />

                                Completed
                              </span>
                            )}

                            {/* REVERSED */}

                            {transfer.status ===
                              "reversed" && (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700">
                                <RotateCcw
                                  size={14}
                                />

                                Reversed
                              </span>
                            )}

                            {actionLoading ===
                              transfer._id && (
                              <RefreshCw
                                size={15}
                                className="animate-spin text-gray-400"
                              />
                            )}

                          </div>

                        </td>

                      </tr>
                    );
                  },
                )
              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* =================================================
          OTP MODAL
      ================================================= */}

      {otpTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">

          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">

            <div className="mb-5 flex items-start justify-between">

              <div>

                <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-orange-100">
                  <KeyRound
                    className="text-orange-600"
                    size={22}
                  />
                </div>

                <h3 className="text-lg font-bold text-gray-900">
                  Finalize Paystack Transfer
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Enter the OTP sent by Paystack to
                  finalize this transfer.
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setOtpTransfer(null)
                }
                disabled={
                  finalizingOtp
                }
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <XCircle size={22} />
              </button>

            </div>

            {/* TRANSFER DETAILS */}

            <div className="mb-5 rounded-xl bg-gray-50 p-4">

              <div className="flex justify-between gap-4">

                <span className="text-sm text-gray-500">
                  Amount
                </span>

                <span className="font-semibold text-gray-900">
                  {formatAmount(
                    otpTransfer.amount,
                    otpTransfer.currency,
                  )}
                </span>

              </div>

              <div className="mt-2 flex justify-between gap-4">

                <span className="text-sm text-gray-500">
                  Reference
                </span>

                <span className="max-w-[220px] break-all text-right text-xs font-medium text-gray-700">
                  {
                    otpTransfer.reference ||
                    "-"
                  }
                </span>

              </div>

              <div className="mt-2 flex justify-between gap-4">

                <span className="text-sm text-gray-500">
                  Transfer Code
                </span>

                <span className="max-w-[220px] break-all text-right text-xs font-medium text-gray-700">
                  {
                    otpTransfer.providerTransferCode ||
                    "-"
                  }
                </span>

              </div>

            </div>

            {/* OTP INPUT */}

            <label className="block">

              <span className="mb-2 block text-sm font-semibold text-gray-700">
                Paystack OTP
              </span>

              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={otp}
                onChange={(event) =>
                  setOtp(
                    event.target.value.replace(
                      /\D/g,
                      "",
                    ),
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    handleFinalizeOtp();
                  }
                }}
                placeholder="Enter OTP"
                disabled={
                  finalizingOtp
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-center text-lg font-semibold tracking-[0.35em] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100"
              />

            </label>

            {/* BUTTONS */}

            <div className="mt-6 flex gap-3">

              <button
                type="button"
                onClick={() =>
                  setOtpTransfer(null)
                }
                disabled={
                  finalizingOtp
                }
                className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleFinalizeOtp
                }
                disabled={
                  finalizingOtp ||
                  otp.trim().length <
                    4
                }
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:bg-gray-400"
              >
                {finalizingOtp ? (
                  <>
                    <RefreshCw
                      size={16}
                      className="animate-spin"
                    />

                    Finalizing...
                  </>
                ) : (
                  <>
                    <CheckCircle
                      size={16}
                    />

                    Finalize Transfer
                  </>
                )}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}


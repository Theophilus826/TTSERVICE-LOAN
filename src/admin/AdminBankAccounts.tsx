import { useEffect, useState } from "react";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "react-toastify";

import API from "../services/Api";

interface BankAccount {
  _id: string;

  user?: {
    _id: string;
    name?: string;
    email?: string;
    phone?: string;
  };

  bankName: string;
  bankCode: string;
  accountName: string;
  accountNumberLast4: string;
  accountType?: string;

  isPrimary?: boolean;

  verificationStatus?:
    | "pending"
    | "verified"
    | "failed";

  createdAt?: string;
}

export default function AdminBankAccounts() {
  const [accounts, setAccounts] =
    useState<BankAccount[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [processingId, setProcessingId] =
    useState<string | null>(null);

  const loadAccounts = async () => {
    try {
      setLoading(true);

      const response =
        await API.get(
          "/banks/admin/all",
        );

      setAccounts(
        response.data.data || [],
      );
    } catch (error: any) {
      console.error(
        "Failed to load bank accounts:",
        error,
      );

      toast.error(
        error?.response?.data?.message ||
          "Failed to load bank accounts",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const verifyAccount = async (
    accountId: string,
  ) => {
    try {
      setProcessingId(accountId);

      await API.patch(
        `/banks/admin/${accountId}/verify`,
      );

      toast.success(
        "Bank account verified successfully",
      );

      await loadAccounts();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to verify account",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const rejectAccount = async (
    accountId: string,
  ) => {
    const reason = window.prompt(
      "Enter rejection reason:",
    );

    if (!reason?.trim()) {
      return;
    }

    try {
      setProcessingId(accountId);

      await API.patch(
        `/banks/admin/${accountId}/reject`,
        {
          reason: reason.trim(),
        },
      );

      toast.success(
        "Bank account rejected",
      );

      await loadAccounts();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to reject account",
      );
    } finally {
      setProcessingId(null);
    }
  };

  const statusBadge = (
    status?: string,
  ) => {
    if (status === "verified") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
          <CheckCircle size={13} />
          Verified
        </span>
      );
    }

    if (status === "failed") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
          <XCircle size={13} />
          Failed
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
        <Clock size={13} />
        Pending
      </span>
    );
  };

  const pendingCount =
    accounts.filter(
      (account) =>
        account.verificationStatus ===
        "pending",
    ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bank Accounts
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Review and verify customer bank
            accounts.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAccounts}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm"
        >
          <RefreshCw
            size={17}
            className={
              loading
                ? "animate-spin"
                : ""
            }
          />

          Refresh
        </button>
      </div>

      {/* STATS */}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Total Accounts
          </p>

          <p className="mt-2 text-2xl font-bold">
            {accounts.length}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Pending
          </p>

          <p className="mt-2 text-2xl font-bold text-yellow-600">
            {pendingCount}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Verified
          </p>

          <p className="mt-2 text-2xl font-bold text-green-600">
            {
              accounts.filter(
                (account) =>
                  account.verificationStatus ===
                  "verified",
              ).length
            }
          </p>
        </div>
      </div>

      {/* TABLE */}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-60 items-center justify-center">
            <RefreshCw
              size={28}
              className="animate-spin text-orange-500"
            />
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            No bank accounts found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Customer
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Bank
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Account
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Status
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {accounts.map((account) => {
                  const processing =
                    processingId ===
                    account._id;

                  return (
                    <tr
                      key={account._id}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900">
                          {account.user?.name ||
                            "Unknown"}
                        </p>

                        <p className="text-xs text-gray-500">
                          {account.user
                            ?.email ||
                            account.user
                              ?.phone ||
                            "-"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900">
                          {account.bankName}
                        </p>

                        <p className="text-xs text-gray-500">
                          Code:{" "}
                          {account.bankCode}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">
                          {account.accountName}
                        </p>

                        <p className="font-mono text-xs text-gray-500">
                          ****
                          {
                            account.accountNumberLast4
                          }
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-col items-start gap-1">
                          {statusBadge(
                            account.verificationStatus,
                          )}

                          {account.isPrimary && (
                            <span className="text-xs font-semibold text-orange-600">
                              Primary
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {account.verificationStatus ===
                          "pending" && (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={
                                processing
                              }
                              onClick={() =>
                                verifyAccount(
                                  account._id,
                                )
                              }
                              className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              <CheckCircle
                                size={14}
                              />

                              Verify
                            </button>

                            <button
                              type="button"
                              disabled={
                                processing
                              }
                              onClick={() =>
                                rejectAccount(
                                  account._id,
                                )
                              }
                              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                            >
                              <XCircle
                                size={14}
                              />

                              Reject
                            </button>
                          </div>
                        )}

                        {account.verificationStatus ===
                          "verified" && (
                          <span className="text-sm font-medium text-green-600">
                            Verified
                          </span>
                        )}

                        {account.verificationStatus ===
                          "failed" && (
                          <span className="text-sm font-medium text-red-600">
                            Rejected
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
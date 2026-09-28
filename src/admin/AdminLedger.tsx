import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  CircleDollarSign,
} from "lucide-react";
import { toast } from "react-hot-toast";

import API from "../services/Api";

interface LedgerUser {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
}

interface LedgerEntry {
  _id: string;
  reference: string;
  type: string;
  direction: "debit" | "credit";
  amount: number;
  currency: string;
  balanceBefore: number;
  balanceAfter: number;
  description?: string | null;
  status: string;
  createdAt: string;
  user?: LedgerUser;
}

interface LedgerResponse {
  success: boolean;
  data: LedgerEntry[];
}

export default function AdminLedger() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLedger = async () => {
    try {
      setLoading(true);

      const response =
        await API.get<LedgerResponse>(
          "/ledger/admin"
        );

      setEntries(
        response.data?.data || []
      );
    } catch (error: any) {
      console.error(
        "Failed to load ledger:",
        error
      );

      toast.error(
        error?.response?.data?.message ||
          "Failed to load ledger"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, []);

  const totals = useMemo(() => {
    let debit = 0;
    let credit = 0;

    entries.forEach((entry) => {
      if (entry.direction === "debit") {
        debit += entry.amount;
      } else {
        credit += entry.amount;
      }
    });

    return {
      debit,
      credit,
      net: credit - debit,
    };
  }, [entries]);

  const formatAmount = (
    amount: number,
    currency = "NGN"
  ) => {
    return new Intl.NumberFormat(
      "en-NG",
      {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }
    ).format(amount);
  };

  const formatType = (
    type: string
  ) => {
    return type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  const formatDate = (
    date: string
  ) => {
    return new Date(
      date
    ).toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Ledger
          </h1>

          <p className="text-sm text-gray-500">
            View and manage financial ledger entries.
          </p>
        </div>

        <button
          type="button"
          onClick={loadLedger}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
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

      {/* SUMMARY */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">
              Total Debits
            </p>

            <div className="rounded-xl bg-red-50 p-2 text-red-600">
              <ArrowUpRight size={20} />
            </div>
          </div>

          <p className="text-2xl font-bold text-gray-900">
            {formatAmount(
              totals.debit
            )}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">
              Total Credits
            </p>

            <div className="rounded-xl bg-green-50 p-2 text-green-600">
              <ArrowDownLeft size={20} />
            </div>
          </div>

          <p className="text-2xl font-bold text-gray-900">
            {formatAmount(
              totals.credit
            )}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">
              Net Position
            </p>

            <div className="rounded-xl bg-orange-50 p-2 text-orange-600">
              <CircleDollarSign
                size={20}
              />
            </div>
          </div>

          <p
            className={`text-2xl font-bold ${
              totals.net >= 0
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {formatAmount(
              totals.net
            )}
          </p>
        </div>
      </div>

      {/* LEDGER TABLE */}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <BookOpen
              size={22}
              className="text-orange-500"
            />

            <div>
              <h2 className="font-semibold text-gray-900">
                Financial Ledger
              </h2>

              <p className="text-xs text-gray-500">
                {entries.length} ledger{" "}
                {entries.length === 1
                  ? "entry"
                  : "entries"}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <RefreshCw
              size={28}
              className="animate-spin text-orange-500"
            />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
            <BookOpen
              size={42}
              className="mb-4 text-gray-300"
            />

            <h3 className="font-semibold text-gray-900">
              No ledger entries
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Financial transactions will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Reference
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    User
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Type
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Direction
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Amount
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>

                  <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Date
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {entries.map(
                  (entry) => (
                    <tr
                      key={entry._id}
                      className="transition hover:bg-gray-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-mono text-xs font-semibold text-gray-900">
                          {entry.reference}
                        </p>

                        {entry.description && (
                          <p className="mt-1 text-xs text-gray-500">
                            {
                              entry.description
                            }
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-gray-900">
                          {entry.user
                            ?.name ||
                            "Unknown User"}
                        </p>

                        <p className="text-xs text-gray-500">
                          {entry.user
                            ?.email ||
                            entry.user
                              ?.phone ||
                            "—"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-700">
                        {formatType(
                          entry.type
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            entry.direction ===
                            "credit"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {entry.direction
                            .toUpperCase()}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <p
                          className={`text-sm font-bold ${
                            entry.direction ===
                            "credit"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {entry.direction ===
                          "credit"
                            ? "+"
                            : "-"}
                          {formatAmount(
                            entry.amount,
                            entry.currency
                          )}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium capitalize text-gray-700">
                          {entry.status}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-500">
                        {formatDate(
                          entry.createdAt
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
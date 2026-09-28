import { useEffect, useState } from "react";
import { Landmark, RefreshCw, Eye } from "lucide-react";
import { toast } from "react-toastify";

import API from "../services/Api";

interface User {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
}

interface LoanOffer {
  _id: string;
  approvedAmount?: number;
  status?: string;
}

interface BankAccount {
  _id: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
}

interface Mandate {
  _id: string;
  mandateReference: string;
  provider?: string | null;
  providerMandateId?: string | null;

  status:
    | "pending"
    | "authorization_required"
    | "authorized"
    | "active"
    | "failed"
    | "cancelled"
    | "expired";

  amountLimit: number;
  frequency: string;

  startDate?: string | null;
  endDate?: string | null;
  authorizedAt?: string | null;
  activatedAt?: string | null;
  cancelledAt?: string | null;
  failedAt?: string | null;
  expiredAt?: string | null;

  failureReason?: string | null;

  user?: User;
  loanOffer?: LoanOffer;
  bankAccount?: BankAccount;

  createdAt: string;
  updatedAt: string;
}

interface MandatesResponse {
  success: boolean;
  message?: string;
  data?: Mandate[];
}

const formatMoney = (amount?: number) => {
  if (typeof amount !== "number") {
    return "₦0";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (date?: string | null) => {
  if (!date) {
    return "—";
  }

  return new Date(date).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatStatus = (status: Mandate["status"]) => {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getStatusClass = (status: Mandate["status"]) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-700";

    case "authorized":
      return "bg-blue-100 text-blue-700";

    case "authorization_required":
      return "bg-yellow-100 text-yellow-700";

    case "pending":
      return "bg-gray-100 text-gray-700";

    case "failed":
    case "cancelled":
      return "bg-red-100 text-red-700";

    case "expired":
      return "bg-orange-100 text-orange-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
};

export default function AdminMandates() {
  const [mandates, setMandates] = useState<Mandate[]>([]);

  const [loading, setLoading] = useState(true);

  const [selectedMandate, setSelectedMandate] = useState<Mandate | null>(null);

  const loadMandates = async () => {
    try {
      setLoading(true);

      console.log("TEST: Requesting GET /mandates/admin...");

      const response = await API.get<MandatesResponse>("/mandates/admin");

      console.log("TEST: Mandates response status:", response.status);

      console.log("TEST: Mandates response:", response.data);

      const result = response.data;

      if (!result.success) {
        console.warn("TEST: API returned success=false:", result.message);
      }

      const data = Array.isArray(result.data) ? result.data : [];

      console.log("TEST: Mandates count:", data.length);

      setMandates(data);
    } catch (error: any) {
      console.error("TEST: Failed to load mandates:", error);

      console.error("TEST: HTTP status:", error?.response?.status);

      console.error("TEST: Server response:", error?.response?.data);

      console.error("TEST: Request URL:", error?.config?.url);

      console.error("TEST: Request method:", error?.config?.method);

      toast.error(error?.response?.data?.message || "Failed to load mandates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMandates();
  }, []);

  return (
    <div className="space-y-6">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mandates</h1>

          <p className="text-sm text-gray-500">
            Manage customer repayment mandates.
          </p>
        </div>

        <button
          type="button"
          onClick={loadMandates}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* =================================================
          SUMMARY
      ================================================= */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Mandates</p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {mandates.length}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Active</p>

          <p className="mt-2 text-2xl font-bold text-green-600">
            {mandates.filter((mandate) => mandate.status === "active").length}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Pending</p>

          <p className="mt-2 text-2xl font-bold text-yellow-600">
            {
              mandates.filter(
                (mandate) =>
                  mandate.status === "pending" ||
                  mandate.status === "authorization_required",
              ).length
            }
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Failed / Cancelled</p>

          <p className="mt-2 text-2xl font-bold text-red-600">
            {
              mandates.filter(
                (mandate) =>
                  mandate.status === "failed" || mandate.status === "cancelled",
              ).length
            }
          </p>
        </div>
      </div>

      {/* =================================================
          TABLE
      ================================================= */}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <Landmark size={22} className="text-orange-500" />

            <div>
              <h2 className="font-semibold text-gray-900">
                Repayment Mandates
              </h2>

              <p className="text-xs text-gray-500">
                Customer bank debit authorizations
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-60 items-center justify-center">
            <div className="text-center">
              <RefreshCw
                size={28}
                className="mx-auto animate-spin text-orange-500"
              />

              <p className="mt-3 text-sm text-gray-500">Loading mandates...</p>
            </div>
          </div>
        ) : mandates.length === 0 ? (
          <div className="flex min-h-60 items-center justify-center px-6">
            <div className="text-center">
              <Landmark size={42} className="mx-auto text-gray-300" />

              <h3 className="mt-4 font-semibold text-gray-900">
                No mandates found
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                There are currently no repayment mandates.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-6 py-4">Customer</th>

                  <th className="px-6 py-4">Reference</th>

                  <th className="px-6 py-4">Bank Account</th>

                  <th className="px-6 py-4">Limit</th>

                  <th className="px-6 py-4">Frequency</th>

                  <th className="px-6 py-4">Status</th>

                  <th className="px-6 py-4">Created</th>

                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>

              <tbody>
                {mandates.map((mandate) => (
                  <tr
                    key={mandate._id}
                    className="border-b last:border-0 hover:bg-gray-50"
                  >
                    {/* CUSTOMER */}

                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">
                        {mandate.user?.name || "Unknown User"}
                      </p>

                      <p className="text-xs text-gray-500">
                        {mandate.user?.email || mandate.user?.phone || "—"}
                      </p>
                    </td>

                    {/* REFERENCE */}

                    <td className="px-6 py-4">
                      <p className="font-mono text-xs text-gray-700">
                        {mandate.mandateReference}
                      </p>
                    </td>

                    {/* BANK */}

                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">
                        {mandate.bankAccount?.bankName || "—"}
                      </p>

                      <p className="text-xs text-gray-500">
                        {mandate.bankAccount?.accountNumber || "—"}
                      </p>
                    </td>

                    {/* LIMIT */}

                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {formatMoney(mandate.amountLimit)}
                    </td>

                    {/* FREQUENCY */}

                    <td className="px-6 py-4">
                      <span className="capitalize text-sm text-gray-600">
                        {mandate.frequency}
                      </span>
                    </td>

                    {/* STATUS */}

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                          mandate.status,
                        )}`}
                      >
                        {formatStatus(mandate.status)}
                      </span>
                    </td>

                    {/* CREATED */}

                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(mandate.createdAt)}
                    </td>

                    {/* ACTION */}

                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => setSelectedMandate(mandate)}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                      >
                        <Eye size={15} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =================================================
          DETAILS MODAL
      ================================================= */}

      {selectedMandate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Mandate Details
                </h2>

                <p className="font-mono text-xs text-gray-500">
                  {selectedMandate.mandateReference}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMandate(null)}
                className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <div>
                <p className="text-xs text-gray-500">Customer</p>

                <p className="mt-1 font-semibold text-gray-900">
                  {selectedMandate.user?.name || "Unknown"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Status</p>

                <span
                  className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                    selectedMandate.status,
                  )}`}
                >
                  {formatStatus(selectedMandate.status)}
                </span>
              </div>

              <div>
                <p className="text-xs text-gray-500">Amount Limit</p>

                <p className="mt-1 font-semibold text-gray-900">
                  {formatMoney(selectedMandate.amountLimit)}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Frequency</p>

                <p className="mt-1 capitalize font-semibold text-gray-900">
                  {selectedMandate.frequency}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Bank</p>

                <p className="mt-1 font-semibold text-gray-900">
                  {selectedMandate.bankAccount?.bankName || "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Account Number</p>

                <p className="mt-1 font-semibold text-gray-900">
                  {selectedMandate.bankAccount?.accountNumber || "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Provider</p>

                <p className="mt-1 font-semibold text-gray-900">
                  {selectedMandate.provider || "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Provider Mandate ID</p>

                <p className="mt-1 break-all font-mono text-xs text-gray-700">
                  {selectedMandate.providerMandateId || "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">Start Date</p>

                <p className="mt-1 font-semibold text-gray-900">
                  {formatDate(selectedMandate.startDate)}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-500">End Date</p>

                <p className="mt-1 font-semibold text-gray-900">
                  {formatDate(selectedMandate.endDate)}
                </p>
              </div>

              {selectedMandate.failureReason && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-500">Failure Reason</p>

                  <p className="mt-1 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {selectedMandate.failureReason}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

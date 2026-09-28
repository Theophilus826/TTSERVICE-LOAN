import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock3,
  Search,
  WalletCards,
  AlertTriangle,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";

import adminLoanApi, {
  type AdminLoan,
  type AdminLoanStatus,
  type AdminLoanStats,
} from "../services/adminLoanApi";

const formatMoney = (
  amount?: number | null,
  currency = "NGN"
) => {
  if (amount === null || amount === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (date?: string | null) => {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatStatus = (status: AdminLoanStatus) => {
  return status
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
};

const getStatusClasses = (
  status: AdminLoanStatus
) => {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "completed":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "overdue":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "defaulted":
      return "bg-red-50 text-red-700 border-red-200";

    case "disbursing":
      return "bg-purple-50 text-purple-700 border-purple-200";

    case "pending_disbursement":
      return "bg-slate-50 text-slate-700 border-slate-200";

    case "cancelled":
      return "bg-gray-100 text-gray-600 border-gray-200";

    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
};

const getUser = (loan: AdminLoan) => {
  if (
    loan.user &&
    typeof loan.user !== "string"
  ) {
    return loan.user;
  }

  return null;
};

const getProductName = (loan: AdminLoan) => {
  if (
    loan.loanProduct &&
    typeof loan.loanProduct !== "string"
  ) {
    return loan.loanProduct.name || "Loan";
  }

  return "Loan";
};

const getCurrency = (loan: AdminLoan) => {
  if (
    loan.loanProduct &&
    typeof loan.loanProduct !== "string"
  ) {
    return loan.loanProduct.currency || "NGN";
  }

  return "NGN";
};

const getErrorMessage = (error: any) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Unable to load loans."
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
}

const StatCard = ({
  title,
  value,
  icon,
  description,
}: StatCardProps) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          {icon}
        </div>
      </div>

      <p className="text-sm text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-2xl font-bold text-slate-900">
        {value}
      </p>

      {description && (
        <p className="mt-1 text-xs text-slate-400">
          {description}
        </p>
      )}
    </div>
  );
};

const AdminLoans = () => {
  const navigate = useNavigate();

  const [loans, setLoans] = useState<AdminLoan[]>(
    []
  );

  const [stats, setStats] =
    useState<AdminLoanStats | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [status, setStatus] = useState<
    AdminLoanStatus | ""
  >("");

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const limit = 10;

  const loadLoans = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [loanData, statsData] =
        await Promise.all([
          adminLoanApi.getLoans({
            status,
            search: search.trim(),
            page,
            limit,
          }),
          adminLoanApi.getStats(),
        ]);

      setLoans(loanData.loans);
      setPages(loanData.pagination.pages);
      setStats(statsData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  const handleStatusChange = (
    value: AdminLoanStatus | ""
  ) => {
    setPage(1);
    setStatus(value);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Loans
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage approved loans, disbursements and
            repayment status.
          </p>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Loans"
            value={stats?.total ?? "—"}
            icon={<WalletCards size={20} />}
          />

          <StatCard
            title="Pending Disbursement"
            value={stats?.pendingDisbursement ?? "—"}
            icon={<Clock3 size={20} />}
          />

          <StatCard
            title="Active Loans"
            value={stats?.active ?? "—"}
            icon={<CheckCircle2 size={20} />}
          />

          <StatCard
            title="Overdue Loans"
            value={stats?.overdue ?? "—"}
            icon={<AlertTriangle size={20} />}
          />
        </div>

        {/* Financial summary */}
        {stats && (
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Total Disbursed
              </p>

              <p className="mt-2 text-xl font-bold text-slate-900">
                {formatMoney(stats.totalDisbursed)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Total Paid
              </p>

              <p className="mt-2 text-xl font-bold text-emerald-600">
                {formatMoney(stats.totalPaid)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">
                Outstanding
              </p>

              <p className="mt-2 text-xl font-bold text-amber-600">
                {formatMoney(stats.totalOutstanding)}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Search loan number..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <select
              value={status}
              onChange={(event) =>
                handleStatusChange(
                  event.target.value as
                    | AdminLoanStatus
                    | ""
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-400"
            >
              <option value="">All statuses</option>
              <option value="pending_disbursement">
                Pending Disbursement
              </option>
              <option value="disbursing">
                Disbursing
              </option>
              <option value="active">
                Active
              </option>
              <option value="overdue">
                Overdue
              </option>
              <option value="defaulted">
                Defaulted
              </option>
              <option value="completed">
                Completed
              </option>
              <option value="cancelled">
                Cancelled
              </option>
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Loan
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Customer
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Principal
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Paid
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Outstanding
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-sm text-slate-500"
                    >
                      <div className="flex items-center justify-center gap-3">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                        Loading loans...
                      </div>
                    </td>
                  </tr>
                ) : loans.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-sm text-slate-500"
                    >
                      No loans found.
                    </td>
                  </tr>
                ) : (
                  loans.map((loan) => {
                    const user = getUser(loan);
                    const currency =
                      getCurrency(loan);

                    return (
                      <tr
                        key={loan._id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {loan.loanNumber}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {getProductName(loan)}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-slate-900">
                            {user?.name || "Unknown customer"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {user?.email || "—"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm font-medium text-slate-900">
                          {formatMoney(
                            loan.principalAmount,
                            currency
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm font-medium text-emerald-600">
                          {formatMoney(
                            loan.amountPaid,
                            currency
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm font-medium text-amber-600">
                          {formatMoney(
                            loan.outstandingAmount,
                            currency
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                              loan.status
                            )}`}
                          >
                            {formatStatus(
                              loan.status
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/admin/loans/${loan._id}`
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            View
                            <ArrowRight size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && loans.length > 0 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
              <p className="text-sm text-slate-500">
                Page {page} of {pages}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage((current) =>
                      Math.max(1, current - 1)
                    )
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <button
                  type="button"
                  disabled={page >= pages}
                  onClick={() =>
                    setPage((current) =>
                      Math.min(pages, current + 1)
                    )
                  }
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLoans;
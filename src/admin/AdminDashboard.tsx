import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CreditCard,
  FileText,
  RefreshCw,
  Users,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import API from "../services/Api";
import adminLoanApi from "../services/adminLoanApi";
import adminLoanApplicationApi from "../services/adminLoanApplicationApi";
import { useAppSelector } from "../layout/hooks";

interface AdminUsersResponse {
  count?: number;
  data?: unknown[];
}

interface FraudAlert {
  _id: string;
  status?: string;
}

interface AuditLog {
  _id: string;
  action?: string;
  event?: string;
  description?: string;
  resource?: string;
  createdAt?: string;
  performedBy?: { name?: string };
  user?: { name?: string };
}

interface DashboardData {
  totalUsers: number | null;
  applications: number | null;
  activeLoans: number | null;
  riskAlerts: number | null;
  totalDisbursed: number | null;
  totalPaid: number | null;
  recentActivity: AuditLog[];
  apiStatus: string;
  databaseStatus: string;
  fraudStatus: string;
}

const formatCurrency = (value: number | null) => {
  if (value === null) return "—";

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(value);
};

const formatActivity = (entry: AuditLog) =>
  (entry.action || entry.event || "System activity")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDate = (value?: string) => {
  if (!value) return "Date unavailable";

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      });
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    const results = await Promise.allSettled([
      API.get<AdminUsersResponse>("/users"),
      adminLoanApi.getStats(),
      adminLoanApplicationApi.getStats(),
      API.get<{ data?: FraudAlert[]; alerts?: FraudAlert[] }>("/fraud/admin"),
      API.get<{ data?: AuditLog[]; logs?: AuditLog[] }>("/audit/admin"),
    ]);

    const [usersResult, loansResult, applicationsResult, fraudResult, auditResult] =
      results;

    const users =
      usersResult.status === "fulfilled"
        ? usersResult.value.data
        : null;
    const loanStats =
      loansResult.status === "fulfilled" ? loansResult.value : null;
    const applicationStats =
      applicationsResult.status === "fulfilled"
        ? applicationsResult.value
        : null;
    const fraudAlerts =
      fraudResult.status === "fulfilled"
        ? fraudResult.value.data.data || fraudResult.value.data.alerts || []
        : null;
    const auditLogs =
      auditResult.status === "fulfilled"
        ? auditResult.value.data.data || auditResult.value.data.logs || []
        : [];

    setDashboard({
      totalUsers:
        users === null ? null : users.count ?? users.data?.length ?? 0,
      applications: applicationStats?.total ?? null,
      activeLoans: loanStats?.active ?? null,
      riskAlerts:
        fraudAlerts === null
          ? null
          : fraudAlerts.filter(
              (alert) =>
                !["resolved", "cleared", "false_positive", "closed"].includes(
                  String(alert.status || "open").toLowerCase(),
                ),
            ).length,
      totalDisbursed: loanStats?.totalDisbursed ?? null,
      totalPaid: loanStats?.totalPaid ?? null,
      recentActivity: auditLogs.slice(0, 5),
      apiStatus:
        loansResult.status === "fulfilled" ||
        applicationsResult.status === "fulfilled"
          ? "Connected"
          : "Unavailable",
      databaseStatus:
        results.some((result) => result.status === "fulfilled")
          ? "Connected"
          : "Unavailable",
      fraudStatus:
        fraudResult.status === "fulfilled" ? "Connected" : "Unavailable",
    });

    const failedCount = results.filter(
      (result) => result.status === "rejected",
    ).length;

    if (failedCount === results.length) {
      setError("Dashboard data could not be loaded. Check your connection and try again.");
    } else if (failedCount > 0) {
      setError("Some dashboard data is unavailable. Retry to refresh all sections.");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const stats = [
    {
      title: "Total Users",
      value: dashboard?.totalUsers,
      icon: Users,
      route: "/admin/users",
    },
    {
      title: "Loan Applications",
      value: dashboard?.applications,
      icon: FileText,
      route: "/admin/loan-applications",
    },
    {
      title: "Active Loans",
      value: dashboard?.activeLoans,
      icon: CreditCard,
      route: "/admin/loans",
    },
    {
      title: "Open Risk Alerts",
      value: dashboard?.riskAlerts,
      icon: AlertTriangle,
      route: "/admin/fraud",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, <span className="font-medium text-gray-700">{user?.name || "Administrator"}</span>.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadDashboard()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <button
              key={stat.title}
              type="button"
              onClick={() => navigate(stat.route)}
              className="rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-orange-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {loading && dashboard === null
                      ? "..."
                      : stat.value?.toLocaleString("en-NG") ?? "—"}
                  </p>
                </div>
                <span className="rounded-lg bg-orange-50 p-3 text-orange-600">
                  <Icon size={21} />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-gray-200 bg-white p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Financial Overview</h2>
              <p className="text-sm text-gray-500">Recorded loan disbursements and repayments</p>
            </div>
            <Wallet size={23} className="text-orange-500" />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Total Disbursed</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(dashboard?.totalDisbursed ?? null)}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                <ArrowUpRight size={14} /> Across recorded loans
              </p>
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Total Repayments</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {formatCurrency(dashboard?.totalPaid ?? null)}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                <ArrowDownRight size={14} /> Applied to loan balances
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="font-semibold text-gray-900">Service Connections</h2>
          <div className="mt-5 space-y-4">
            <Status label="Admin API" status={dashboard?.apiStatus || "Checking"} />
            <Status label="Database-backed data" status={dashboard?.databaseStatus || "Checking"} />
            <Status label="Fraud alerts" status={dashboard?.fraudStatus || "Checking"} />
            <Status label="Transfer provider" status="Not monitored" />
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Recent Activity</h2>
            <p className="mt-1 text-sm text-gray-500">Latest recorded audit events</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/admin/audit")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-orange-700"
          >
            View audit log <ArrowRight size={16} />
          </button>
        </div>

        {loading && !dashboard ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading activity...</div>
        ) : dashboard?.recentActivity.length ? (
          <div className="divide-y divide-gray-100">
            {dashboard.recentActivity.map((entry) => (
              <div key={entry._id} className="flex items-start gap-3 px-6 py-4">
                <span className="mt-0.5 rounded-lg bg-gray-100 p-2 text-gray-600">
                  <Activity size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{formatActivity(entry)}</p>
                  <p className="mt-1 truncate text-xs text-gray-500">
                    {entry.description || entry.resource || "Administrative event"}
                    {entry.performedBy?.name ? ` · ${entry.performedBy.name}` : entry.user?.name ? ` · ${entry.user.name}` : ""}
                  </p>
                </div>
                <time className="shrink-0 text-xs text-gray-500">{formatDate(entry.createdAt)}</time>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-gray-500">
            No audit activity has been recorded yet.
          </div>
        )}
      </section>
    </div>
  );
}

interface StatusProps {
  label: string;
  status: string;
}

function Status({ label, status }: StatusProps) {
  const tone =
    status === "Connected"
      ? "bg-green-100 text-green-700"
      : status === "Unavailable"
        ? "bg-red-100 text-red-700"
        : "bg-gray-100 text-gray-600";

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tone}`}>
        {status}
      </span>
    </div>
  );
}
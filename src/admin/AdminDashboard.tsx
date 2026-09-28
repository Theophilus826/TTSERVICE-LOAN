import {
  Users,
  CreditCard,
  FileText,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
} from "lucide-react";

import { useAppSelector } from "../layout/hooks";

const stats = [
  {
    title: "Total Users",
    value: "0",
    icon: Users,
  },
  {
    title: "Loan Applications",
    value: "0",
    icon: FileText,
  },
  {
    title: "Active Loans",
    value: "0",
    icon: CreditCard,
  },
  {
    title: "Risk Alerts",
    value: "0",
    icon: AlertTriangle,
  },
];

export default function AdminDashboard() {
  const user = useAppSelector(
    (state) => state.auth.user
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Admin Dashboard
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Welcome back,{" "}
          <span className="font-medium text-gray-700">
            {user?.name || "Administrator"}
          </span>
          .
        </p>
      </div>

      {/* STAT CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="rounded-2xl bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    {stat.title}
                  </p>

                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </div>

                <div className="rounded-xl bg-orange-50 p-3">
                  <Icon
                    size={22}
                    className="text-orange-500"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FINANCIAL OVERVIEW */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">
                Financial Overview
              </h2>

              <p className="text-sm text-gray-500">
                Current lending activity
              </p>
            </div>

            <Wallet
              size={24}
              className="text-orange-500"
            />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">
                Total Disbursed
              </p>

              <p className="mt-2 text-2xl font-bold">
                ₦0.00
              </p>

              <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                <ArrowUpRight size={14} />
                Awaiting transaction data
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">
                Total Repayments
              </p>

              <p className="mt-2 text-2xl font-bold">
                ₦0.00
              </p>

              <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                <ArrowDownRight size={14} />
                Awaiting transaction data
              </p>
            </div>
          </div>
        </div>

        {/* SYSTEM STATUS */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900">
            System Status
          </h2>

          <div className="mt-5 space-y-4">
            <Status
              label="API"
              status="Operational"
            />

            <Status
              label="Database"
              status="Operational"
            />

            <Status
              label="Transfer Provider"
              status="Pending"
            />

            <Status
              label="Fraud Engine"
              status="Pending"
            />
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY */}
      <div className="rounded-2xl bg-white shadow-sm">
        <div className="border-b px-6 py-5">
          <h2 className="font-semibold text-gray-900">
            Recent Activity
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Latest administrative activity will appear here.
          </p>
        </div>

        <div className="p-10 text-center text-sm text-gray-500">
          No recent activity.
        </div>
      </div>
    </div>
  );
}

interface StatusProps {
  label: string;
  status: string;
}

function Status({
  label,
  status,
}: StatusProps) {
  const operational =
    status === "Operational";

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">
        {label}
      </span>

      <span
        className={`
          rounded-full px-2.5 py-1 text-xs font-medium
          ${
            operational
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }
        `}
      >
        {status}
      </span>
    </div>
  );
}
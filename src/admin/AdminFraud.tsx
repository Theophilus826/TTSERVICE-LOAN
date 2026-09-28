
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserX,
} from "lucide-react";
import { toast } from "react-toastify";

import API from "../services/Api";

// =========================================================
// TYPES
// =========================================================

interface RiskUser {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
}

interface FraudAlert {
  _id: string;
  user?: RiskUser;

  type?: string;

  severity?: string;

  status?: string;

  score?: number;

  reason?: string;

  description?: string;

  reference?: string;

  createdAt?: string;

  resolvedAt?: string | null;
}

interface FraudResponse {
  success: boolean;
  data?: FraudAlert[];
  alerts?: FraudAlert[];
  message?: string;
}

// =========================================================
// COMPONENT
// =========================================================

export default function AdminFraud() {
  const [alerts, setAlerts] =
    useState<FraudAlert[]>([]);

  const [loading, setLoading] =
    useState(false);

  // =======================================================
  // LOAD ALERTS
  // =======================================================

  const loadAlerts = async () => {
    try {
      setLoading(true);

      const response =
        await API.get<FraudResponse>(
          "/fraud/admin"
        );

      const result = response.data;

      setAlerts(
        result.data ||
          result.alerts ||
          []
      );
    } catch (error: any) {
      console.error(
        "Failed to load fraud alerts:",
        error
      );

      toast.error(
        error?.response?.data?.message ||
          "Failed to load fraud alerts"
      );
    } finally {
      setLoading(false);
    }
  };

  // =======================================================
  // INITIAL LOAD
  // =======================================================

  useEffect(() => {
    loadAlerts();
  }, []);

  // =======================================================
  // FORMAT
  // =======================================================

  const formatText = (
    value?: string
  ) => {
    if (!value) {
      return "Unknown";
    }

    return value
      .replace(/_/g, " ")
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      );
  };

  // =======================================================
  // SEVERITY
  // =======================================================

  const severityClass = (
    severity?: string
  ) => {
    switch (
      severity?.toLowerCase()
    ) {
      case "critical":
        return "bg-red-100 text-red-700";

      case "high":
        return "bg-orange-100 text-orange-700";

      case "medium":
        return "bg-yellow-100 text-yellow-700";

      case "low":
        return "bg-blue-100 text-blue-700";

      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  // =======================================================
  // STATUS
  // =======================================================

  const statusClass = (
    status?: string
  ) => {
    switch (
      status?.toLowerCase()
    ) {
      case "open":
      case "pending":
      case "investigating":
        return "bg-yellow-100 text-yellow-700";

      case "confirmed":
      case "blocked":
        return "bg-red-100 text-red-700";

      case "resolved":
      case "cleared":
        return "bg-green-100 text-green-700";

      case "false_positive":
        return "bg-gray-100 text-gray-600";

      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  // =======================================================
  // SUMMARY
  // =======================================================

  const criticalCount =
    alerts.filter(
      (item) =>
        item.severity?.toLowerCase() ===
        "critical"
    ).length;

  const highCount =
    alerts.filter(
      (item) =>
        item.severity?.toLowerCase() ===
        "high"
    ).length;

  const openCount =
    alerts.filter(
      (item) =>
        item.status?.toLowerCase() ===
          "open" ||
        item.status?.toLowerCase() ===
          "pending" ||
        item.status?.toLowerCase() ===
          "investigating"
    ).length;

  const resolvedCount =
    alerts.filter(
      (item) =>
        item.status?.toLowerCase() ===
          "resolved" ||
        item.status?.toLowerCase() ===
          "cleared"
    ).length;

  // =======================================================
  // ACTION
  // =======================================================

  const resolveAlert = async (
    id: string
  ) => {
    try {
      await API.patch(
        `/fraud/${id}/resolve`
      );

      toast.success(
        "Risk alert resolved"
      );

      await loadAlerts();
    } catch (error: any) {
      console.error(error);

      toast.error(
        error?.response?.data?.message ||
          "Failed to resolve alert"
      );
    }
  };

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

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100">
              <ShieldAlert
                className="text-orange-500"
                size={24}
              />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Fraud & Risk
              </h1>

              <p className="text-sm text-gray-500">
                Monitor suspicious activity and borrower risk.
              </p>
            </div>

          </div>

        </div>

        <button
          type="button"
          onClick={loadAlerts}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:bg-gray-400"
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

      {/* =================================================
          SUMMARY
      ================================================= */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <div className="rounded-2xl bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm text-gray-500">
                Total Alerts
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {alerts.length}
              </p>
            </div>

            <ShieldAlert
              className="text-orange-500"
              size={28}
            />

          </div>

        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">

          <p className="text-sm text-gray-500">
            Critical
          </p>

          <p className="mt-2 text-2xl font-bold text-red-600">
            {criticalCount}
          </p>

        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">

          <p className="text-sm text-gray-500">
            High Risk
          </p>

          <p className="mt-2 text-2xl font-bold text-orange-600">
            {highCount}
          </p>

        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">

          <p className="text-sm text-gray-500">
            Open Alerts
          </p>

          <p className="mt-2 text-2xl font-bold text-yellow-600">
            {openCount}
          </p>

          <p className="mt-1 text-xs text-green-600">
            {resolvedCount} resolved
          </p>

        </div>

      </div>

      {/* =================================================
          RISK NOTICE
      ================================================= */}

      <div className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-5">

        <AlertTriangle
          className="mt-0.5 shrink-0 text-orange-500"
          size={22}
        />

        <div>

          <h2 className="font-semibold text-orange-800">
            Risk Monitoring
          </h2>

          <p className="mt-1 text-sm text-orange-700">
            Review high-risk and critical alerts before approving loans, offers, or transfers.
          </p>

        </div>

      </div>

      {/* =================================================
          TABLE
      ================================================= */}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

        <div className="flex items-center gap-2 border-b px-5 py-4">

          <ShieldCheck
            size={20}
            className="text-orange-500"
          />

          <h2 className="font-semibold text-gray-900">
            Risk Alerts
          </h2>

        </div>

        <div className="overflow-x-auto">

          <table className="min-w-[1100px] w-full text-sm">

            <thead className="border-b bg-gray-50">

              <tr>

                <th className="px-5 py-4 text-left font-semibold text-gray-600">
                  Customer
                </th>

                <th className="px-5 py-4 text-left font-semibold text-gray-600">
                  Alert
                </th>

                <th className="px-5 py-4 text-left font-semibold text-gray-600">
                  Risk Score
                </th>

                <th className="px-5 py-4 text-left font-semibold text-gray-600">
                  Severity
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

                      Loading risk alerts...

                    </div>

                  </td>

                </tr>
              ) : alerts.length === 0 ? (
                <tr>

                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center"
                  >

                    <ShieldCheck
                      className="mx-auto mb-3 text-green-300"
                      size={42}
                    />

                    <p className="font-medium text-gray-600">
                      No risk alerts
                    </p>

                    <p className="mt-1 text-sm text-gray-400">
                      No suspicious activity has been reported.
                    </p>

                  </td>

                </tr>
              ) : (
                alerts.map(
                  (alert) => (
                    <tr
                      key={alert._id}
                      className="hover:bg-gray-50"
                    >

                      {/* CUSTOMER */}

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-3">

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100">
                            <UserX
                              size={17}
                              className="text-gray-500"
                            />
                          </div>

                          <div>

                            <p className="font-medium text-gray-900">
                              {alert.user
                                ?.name ||
                                "Unknown"}
                            </p>

                            <p className="text-xs text-gray-500">
                              {alert.user
                                ?.email ||
                                alert.user
                                  ?.phone ||
                                "-"}
                            </p>

                          </div>

                        </div>

                      </td>

                      {/* ALERT */}

                      <td className="px-5 py-4">

                        <p className="font-medium text-gray-900">
                          {formatText(
                            alert.type
                          )}
                        </p>

                        <p className="mt-1 max-w-xs truncate text-xs text-gray-500">
                          {alert.reason ||
                            alert.description ||
                            "No description"}
                        </p>

                        {alert.reference && (
                          <p className="mt-1 text-[11px] text-gray-400">
                            Ref:{" "}
                            {
                              alert.reference
                            }
                          </p>
                        )}

                      </td>

                      {/* SCORE */}

                      <td className="px-5 py-4">

                        {typeof alert.score ===
                        "number" ? (
                          <span
                            className={`font-bold ${
                              alert.score >=
                              80
                                ? "text-red-600"
                                : alert.score >=
                                    60
                                  ? "text-orange-600"
                                  : "text-green-600"
                            }`}
                          >
                            {alert.score}
                          </span>
                        ) : (
                          "-"
                        )}

                      </td>

                      {/* SEVERITY */}

                      <td className="px-5 py-4">

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${severityClass(
                            alert.severity
                          )}`}
                        >
                          {formatText(
                            alert.severity
                          )}
                        </span>

                      </td>

                      {/* STATUS */}

                      <td className="px-5 py-4">

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                            alert.status
                          )}`}
                        >
                          {formatText(
                            alert.status
                          )}
                        </span>

                      </td>

                      {/* DATE */}

                      <td className="whitespace-nowrap px-5 py-4 text-gray-500">

                        {alert.createdAt
                          ? new Date(
                              alert.createdAt
                            ).toLocaleString(
                              "en-NG",
                              {
                                dateStyle:
                                  "medium",
                                timeStyle:
                                  "short",
                              }
                            )
                          : "-"}

                      </td>

                      {/* ACTION */}

                      <td className="px-5 py-4">

                        {alert.status !==
                            "resolved" &&
                        alert.status !==
                            "cleared" ? (
                          <button
                            type="button"
                            onClick={() =>
                              resolveAlert(
                                alert._id
                              )
                            }
                            className="rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-600 hover:bg-green-100"
                          >
                            Resolve
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                            <CheckCircle
                              size={15}
                            />
                            Resolved
                          </span>
                        )}

                      </td>

                    </tr>
                  )
                )
              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}


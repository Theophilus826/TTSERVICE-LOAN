import { useEffect, useState } from "react";
import {
  ClipboardList,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "react-toastify";

import API from "../services/Api";

interface AuditLog {
  _id: string;
  action?: string;
  event?: string;
  description?: string;
  resource?: string;
  resourceId?: string;

  status?: string;

  user?: {
    _id?: string;
    name?: string;
    email?: string;
  };

  performedBy?: {
    _id?: string;
    name?: string;
    email?: string;
  };

  createdAt?: string;
}

interface AuditResponse {
  success: boolean;
  data?: AuditLog[];
  logs?: AuditLog[];
  message?: string;
}

export default function AdminAudit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // =========================================================
  // LOAD AUDIT LOGS
  // =========================================================

  const loadAuditLogs = async () => {
    try {
      setLoading(true);

      const response =
        await API.get<AuditResponse>(
          "/audit/admin",
        );

      const result = response.data;

      setLogs(
        result.data ||
          result.logs ||
          [],
      );
    } catch (error: any) {
      console.error(
        "Failed to load audit logs:",
        error,
      );

      toast.error(
        error?.response?.data?.message ||
          "Failed to load audit logs",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  // =========================================================
  // SEARCH
  // =========================================================

  const filteredLogs = logs.filter(
    (log) => {
      const query =
        search.toLowerCase().trim();

      if (!query) {
        return true;
      }

      return (
        log.action
          ?.toLowerCase()
          .includes(query) ||
        log.event
          ?.toLowerCase()
          .includes(query) ||
        log.description
          ?.toLowerCase()
          .includes(query) ||
        log.resource
          ?.toLowerCase()
          .includes(query) ||
        log.user?.name
          ?.toLowerCase()
          .includes(query) ||
        log.user?.email
          ?.toLowerCase()
          .includes(query) ||
        log.performedBy?.name
          ?.toLowerCase()
          .includes(query) ||
        log.performedBy?.email
          ?.toLowerCase()
          .includes(query)
      );
    },
  );

  // =========================================================
  // STATUS STYLE
  // =========================================================

  const statusClass = (
    status?: string,
  ) => {
    switch (
      status?.toLowerCase()
    ) {
      case "success":
      case "successful":
      case "completed":
        return "bg-green-100 text-green-700";

      case "failed":
      case "error":
        return "bg-red-100 text-red-700";

      case "pending":
        return "bg-yellow-100 text-yellow-700";

      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  // =========================================================
  // ACTION STYLE
  // =========================================================

  const formatAction = (
    log: AuditLog,
  ) => {
    const action =
      log.action ||
      log.event ||
      "System action";

    return action
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase(),
      );
  };

  // =========================================================
  // ADMIN NAME
  // =========================================================

  const getActor = (
    log: AuditLog,
  ) => {
    return (
      log.performedBy?.name ||
      log.user?.name ||
      "System"
    );
  };

  return (
    <div className="space-y-6">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Audit Logs
          </h1>

          <p className="text-sm text-gray-500">
            Track administrative actions
            across the platform.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAuditLogs}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:bg-gray-400"
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

      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Total Logs
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {logs.length}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Successful
          </p>

          <p className="mt-2 text-2xl font-bold text-green-600">
            {
              logs.filter(
                (log) =>
                  [
                    "success",
                    "successful",
                    "completed",
                  ].includes(
                    log.status
                      ?.toLowerCase() ||
                      "",
                  ),
              ).length
            }
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Failed
          </p>

          <p className="mt-2 text-2xl font-bold text-red-600">
            {
              logs.filter(
                (log) =>
                  [
                    "failed",
                    "error",
                  ].includes(
                    log.status
                      ?.toLowerCase() ||
                      "",
                  ),
              ).length
            }
          </p>
        </div>
      </div>

      {/* =====================================================
          SEARCH
      ===================================================== */}

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Search audit logs..."
            className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
        </div>
      </div>

      {/* =====================================================
          TABLE
      ===================================================== */}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-5 py-4 text-left font-semibold text-gray-600">
                  Action
                </th>

                <th className="px-5 py-4 text-left font-semibold text-gray-600">
                  Performed By
                </th>

                <th className="px-5 py-4 text-left font-semibold text-gray-600">
                  Resource
                </th>

                <th className="px-5 py-4 text-left font-semibold text-gray-600">
                  Description
                </th>

                <th className="px-5 py-4 text-left font-semibold text-gray-600">
                  Status
                </th>

                <th className="px-5 py-4 text-left font-semibold text-gray-600">
                  Date
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-gray-500"
                  >
                    Loading audit logs...
                  </td>
                </tr>
              ) : filteredLogs.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center"
                  >
                    <ClipboardList
                      className="mx-auto mb-3 text-gray-300"
                      size={40}
                    />

                    <p className="font-medium text-gray-600">
                      No audit logs found
                    </p>

                    <p className="mt-1 text-sm text-gray-400">
                      Administrative actions
                      will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map(
                  (log) => (
                    <tr
                      key={log._id}
                      className="hover:bg-gray-50"
                    >
                      {/* ACTION */}

                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900">
                          {formatAction(
                            log,
                          )}
                        </p>

                        {log.event &&
                          log.action &&
                          log.event !==
                            log.action && (
                            <p className="mt-1 text-xs text-gray-400">
                              {
                                log.event
                              }
                            </p>
                          )}
                      </td>

                      {/* ACTOR */}

                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">
                          {getActor(log)}
                        </p>

                        <p className="text-xs text-gray-500">
                          {log.performedBy
                            ?.email ||
                            log.user
                              ?.email ||
                            "-"}
                        </p>
                      </td>

                      {/* RESOURCE */}

                      <td className="px-5 py-4">
                        <p className="font-medium capitalize text-gray-900">
                          {log.resource
                            ?.replace(
                              /_/g,
                              " ",
                            ) ||
                            "-"}
                        </p>

                        {log.resourceId && (
                          <p className="max-w-[160px] truncate text-xs text-gray-400">
                            {
                              log.resourceId
                            }
                          </p>
                        )}
                      </td>

                      {/* DESCRIPTION */}

                      <td className="max-w-[280px] px-5 py-4 text-gray-600">
                        {log.description ||
                          "No description"}
                      </td>

                      {/* STATUS */}

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass(
                            log.status,
                          )}`}
                        >
                          {log.status ||
                            "recorded"}
                        </span>
                      </td>

                      {/* DATE */}

                      <td className="whitespace-nowrap px-5 py-4 text-gray-500">
                        {log.createdAt
                          ? new Date(
                              log.createdAt,
                            ).toLocaleString()
                          : "-"}
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
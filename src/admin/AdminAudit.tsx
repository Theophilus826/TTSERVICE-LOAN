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
  actorType?: "user" | "admin" | "system" | "provider" | string;
  actor?: {
    _id?: string;
    name?: string;
    email?: string;
  } | null;
  resource?: string;
  resourceId?: string;
  method?: string | null;
  route?: string | null;
  metadata?: {
    outcome?: string;
    statusCode?: number;
    [key: string]: unknown;
  } | null;
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
  const [actorFilter, setActorFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);

  // =========================================================
  // LOAD AUDIT LOGS
  // =========================================================

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response =
        await API.get<AuditResponse>(
          "/audit/admin",
        );

      const result = response.data;

      setLogs(
        Array.isArray(result.data)
          ? result.data
          : Array.isArray(result.logs)
            ? result.logs
            : [],
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
      setError(
        error?.response?.data?.message ||
          "Unable to load audit logs. Refresh to try again.",
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

      const matchesActor =
        actorFilter === "all" ||
        log.actorType === actorFilter;

      if (!query) {
        return matchesActor;
      }

      const matchesSearch = (
        log.action
          ?.toLowerCase()
          .includes(query) ||
        log.resource
          ?.toLowerCase()
          .includes(query) ||
        log.resourceId
          ?.toLowerCase()
          .includes(query) ||
        log.actorType
          ?.toLowerCase()
          .includes(query) ||
        log.actor?.name
          ?.toLowerCase()
          .includes(query) ||
        log.actor?.email
          ?.toLowerCase()
          .includes(query) ||
        log.route
          ?.toLowerCase()
          .includes(query) ||
        log.method
          ?.toLowerCase()
          .includes(query)
      );

      return matchesActor && matchesSearch;
    },
  );

  // =========================================================
  // STATUS STYLE
  // =========================================================

  // =========================================================
  // ACTION STYLE
  // =========================================================

  const formatAction = (
    log: AuditLog,
  ) => {
    const action = log.action || "System action";

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
      log.actor?.name ||
      log.actor?.email ||
      log.actorType ||
      "System"
    );
  };

  const adminCount = logs.filter(
    (log) => log.actorType === "admin",
  ).length;

  const systemCount = logs.filter(
    (log) => log.actorType === "system",
  ).length;

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
        <button
          type="button"
          aria-pressed={actorFilter === "all"}
          onClick={() => setActorFilter("all")}
          className={`rounded-2xl bg-white p-5 text-left shadow-sm transition hover:ring-2 hover:ring-orange-200 ${actorFilter === "all" ? "ring-2 ring-orange-400" : ""}`}
        >
          <p className="text-sm text-gray-500">
            Total Logs
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {logs.length}
          </p>
        </button>

        <button
          type="button"
          aria-pressed={actorFilter === "admin"}
          onClick={() => setActorFilter("admin")}
          className={`rounded-2xl bg-white p-5 text-left shadow-sm transition hover:ring-2 hover:ring-orange-200 ${actorFilter === "admin" ? "ring-2 ring-orange-400" : ""}`}
        >
          <p className="text-sm text-gray-500">
            Admin Actions
          </p>

          <p className="mt-2 text-2xl font-bold text-green-600">
            {
              adminCount
            }
          </p>
        </button>

        <button
          type="button"
          aria-pressed={actorFilter === "system"}
          onClick={() => setActorFilter("system")}
          className={`rounded-2xl bg-white p-5 text-left shadow-sm transition hover:ring-2 hover:ring-orange-200 ${actorFilter === "system" ? "ring-2 ring-orange-400" : ""}`}
        >
          <p className="text-sm text-gray-500">
            System Actions
          </p>

          <p className="mt-2 text-2xl font-bold text-red-600">
            {
              systemCount
            }
          </p>
        </button>
      </div>

      {/* =====================================================
          SEARCH
      ===================================================== */}

      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row">
        <div className="relative flex-1">
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
        <select
          aria-label="Filter audit logs by actor type"
          value={actorFilter}
          onChange={(event) => setActorFilter(event.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        >
          <option value="all">All actors</option>
          <option value="admin">Admins</option>
          <option value="user">Users</option>
          <option value="system">System</option>
          <option value="provider">Providers</option>
        </select>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

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
                  Request
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
                    colSpan={5}
                    className="px-5 py-12 text-center text-gray-500"
                  >
                    Loading audit logs...
                  </td>
                </tr>
              ) : filteredLogs.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={5}
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
                      {error
                        ? "Audit records could not be loaded."
                        : "Try a different search or actor filter."}
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

                        <p className="mt-1 text-xs capitalize text-gray-400">
                          {log.actorType || "unknown actor"}
                        </p>
                      </td>

                      {/* ACTOR */}

                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">
                          {getActor(log)}
                        </p>

                        <p className="text-xs text-gray-500">
                          {log.actor?.email || "-"}
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

                      {/* REQUEST */}
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-700">
                          {log.method || "-"}
                        </p>
                        <p className="max-w-[280px] truncate text-xs text-gray-500">
                          {log.route || log.resourceId || "-"}
                        </p>
                        {log.metadata?.outcome && (
                          <p className="mt-1 text-xs capitalize text-gray-500">
                            {log.metadata.outcome}
                            {log.metadata.statusCode
                              ? ` · ${log.metadata.statusCode}`
                              : ""}
                          </p>
                        )}
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
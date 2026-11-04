import React, { useEffect, useState } from "react";
import adminRepaymentApi, {
  FloatingReminder,
  FloatingReminderStatus,
  FloatingReminderSummary,
} from "../services/adminRepaymentApi";
import FloatingReminderAppearanceEditor from "./FloatingReminderAppearanceEditor";

// =========================================================
// HELPERS
// =========================================================

const formatCurrency = (amount: number, currency = "NGN") => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const safeCurrency = currency || "NGN";

  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: 2,
    }).format(safeAmount);
  } catch {
    return `${safeCurrency} ${safeAmount.toLocaleString("en-NG", {
      maximumFractionDigits: 2,
    })}`;
  }
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error !== "object" || error === null) return fallback;

  const response = "response" in error ? error.response : undefined;

  if (typeof response === "object" && response !== null && "data" in response) {
    const data = response.data;

    if (typeof data === "object" && data !== null && "message" in data) {
      if (typeof data.message === "string" && data.message.trim()) {
        return data.message;
      }
    }
  }

  return "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
    ? error.message
    : fallback;
};

const formatDate = (date?: string | null) => {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const getStatusStyle = (status: FloatingReminderStatus) => {
  const styles: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    cooldown: "bg-amber-100 text-amber-700",
    disabled: "bg-gray-100 text-gray-700",
    permission_denied: "bg-orange-100 text-orange-700",
    error: "bg-red-100 text-red-700",
  };

  return styles[status] || "bg-gray-100 text-gray-700";
};

const getStatusLabel = (status: FloatingReminderStatus) => {
  const labels: Record<string, string> = {
    active: "Active",
    cooldown: "Cooldown",
    disabled: "Disabled",
    permission_denied: "Permission denied",
    error: "Error",
  };

  return labels[status] || status;
};

// =========================================================
// SUMMARY CARD
// =========================================================

interface SummaryCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: string;
  color: string;
}

const SummaryCard = ({
  title,
  value,
  description,
  icon,
  color,
}: SummaryCardProps) => (
  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>

        <h3 className="mt-2 text-2xl font-bold text-gray-900">{value}</h3>

        <p className="mt-1 text-xs text-gray-500">{description}</p>
      </div>

      <div className={`rounded-lg p-3 text-xl ${color}`}>{icon}</div>
    </div>
  </div>
);

// =========================================================
// MAIN PAGE
// =========================================================

const FloatingRemindersPage: React.FC = () => {
  // -------------------------------------------------------
  // STATES
  // -------------------------------------------------------

  const [summary, setSummary] = useState<FloatingReminderSummary | null>(null);

  const [reminders, setReminders] = useState<FloatingReminder[]>([]);

  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [error, setError] = useState("");
  const [summaryError, setSummaryError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [status, setStatus] = useState<FloatingReminderStatus | "">("");

  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [refreshKey, setRefreshKey] = useState(0);

  const [diagnosticsRunning, setDiagnosticsRunning] = useState(false);

  // -------------------------------------------------------
  // LOAD SUMMARY
  // -------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    setSummaryLoading(true);
    setSummaryError("");

    const loadSummary = async () => {
      try {
        const result = await adminRepaymentApi.getFloatingReminderSummary();

        if (cancelled) return;

        setSummary(result);
      } catch (err) {
        if (cancelled) return;

        console.error("Failed to load reminder summary:", err);

        setSummary(null);

        setSummaryError(
          getErrorMessage(err, "Unable to load reminder summary."),
        );
      } finally {
        if (!cancelled) {
          setSummaryLoading(false);
        }
      }
    };

    void loadSummary();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // -------------------------------------------------------
  // SEARCH DEBOUNCE
  // -------------------------------------------------------

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim());
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  // -------------------------------------------------------
  // LOAD REMINDERS
  // -------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const loadReminders = async () => {
      setLoading(true);
      setError("");

      try {
        const result = await adminRepaymentApi.getFloatingReminders({
          search: search.trim(),
          status,
          page,
          limit,
        });

        if (cancelled) return;

        const nextTotalPages = Math.max(1, result.pagination?.totalPages ?? 1);

        setTotalRecords(result.pagination?.total ?? 0);
        setTotalPages(nextTotalPages);

        if (page > nextTotalPages) {
          setPage(nextTotalPages);
          return;
        }

        setReminders(result.reminders ?? []);
      } catch (err: unknown) {
        if (cancelled) return;

        console.error("Failed to load floating reminders:", err);

        setError(getErrorMessage(err, "Unable to load floating reminders."));

        setReminders([]);
        setTotalRecords(0);
        setTotalPages(1);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadReminders();

    return () => {
      cancelled = true;
    };
  }, [search, status, page, limit, refreshKey]);

  // =======================================================
  // FILTER HANDLERS
  // =======================================================

  const handleSearch = (value: string) => {
    setSearchInput(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value as FloatingReminderStatus | "");
    setPage(1);
  };

  // =======================================================
  // REFRESH HANDLER
  // =======================================================

  const handleRefresh = () => {
    setRefreshKey((current) => current + 1);
  };

  // =======================================================
  // DEVICE & BACKEND DIAGNOSTICS
  // =======================================================

  const handleRunDiagnostics = async () => {
    if (diagnosticsRunning) return;

    setDiagnosticsRunning(true);

    console.clear();

    console.log("====================================");
    console.log("[FLOATING_REMINDER] DEVICE DIAGNOSTICS");
    console.log("====================================");

    try {
      // ---------------------------------------------------
      // DEVICE INFORMATION
      // ---------------------------------------------------

      console.log("[DEVICE] Browser information:", {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        online: navigator.onLine,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        currentUrl: window.location.href,
        timestamp: new Date().toISOString(),
      });

      // ---------------------------------------------------
      // NETWORK CHECK
      // ---------------------------------------------------

      console.log("[NETWORK] Online:", navigator.onLine);

      if (!navigator.onLine) {
        console.error("[NETWORK] Device is offline");

        console.log("====================================");
        console.log("[FLOATING_REMINDER] DIAGNOSTICS FINISHED");
        console.log("====================================");

        return;
      }

      // ---------------------------------------------------
      // TEST 1: SUMMARY API
      // ---------------------------------------------------

      try {
        console.log("[TEST 1] Testing reminder summary API...");

        const summary = await adminRepaymentApi.getFloatingReminderSummary();

        console.log("[TEST 1] SUMMARY API SUCCESS:", summary);
      } catch (error) {
        console.error("[TEST 1] SUMMARY API FAILED:", error);
      }

      // ---------------------------------------------------
      // TEST 2: REMINDER LIST API
      // ---------------------------------------------------

      try {
        console.log("[TEST 2] Testing reminder list API...");

        const result = await adminRepaymentApi.getFloatingReminders({
          page: 1,
          limit: 5,
          search: "",
          status: "",
        });

        console.log("[TEST 2] REMINDER API SUCCESS:", {
          total: result.pagination?.total,
          totalPages: result.pagination?.totalPages,
          records: result.reminders?.length,
        });

        // -----------------------------------------------
        // CUSTOMER DIAGNOSTICS TABLE
        // -----------------------------------------------

        console.log("[TEST 2] CUSTOMER REMINDER DETAILS:");

        console.table(
          (result.reminders || []).map((reminder) => ({
            customer: reminder.user?.name || "Unknown",
            enabled: reminder.enabled,
            consent: reminder.consentGranted,
            overlayPermission: reminder.overlayPermissionGranted,
            status: reminder.status,
            unpaidInstallments: reminder.unpaidInstallments,
            lastError: reminder.lastError || "None",
          })),
        );
      } catch (error) {
        console.error("[TEST 2] REMINDER API FAILED:", error);
      }
    } catch (error) {
      console.error("[DIAGNOSTICS] Unexpected failure:", error);
    } finally {
      console.log("====================================");
      console.log("[FLOATING_REMINDER] DIAGNOSTICS FINISHED");
      console.log("====================================");

      setDiagnosticsRunning(false);
    }
  };

  // =======================================================
  // SUMMARY VALUE
  // =======================================================

  const summaryValue = (value: number | undefined) => {
    if (summaryLoading) return "...";
    if (summaryError) return "—";

    return value ?? 0;
  };

  // =======================================================
  // CUSTOMER NAME
  // =======================================================

  const getCustomerName = (reminder: FloatingReminder) => {
    const user = reminder.user;

    if (!user) return "Unknown customer";

    return user.name || user.email || "Unnamed customer";
  };

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* PAGE HEADER */}

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔔</span>

              <h1 className="text-2xl font-bold text-gray-900">
                Floating Reminder Monitor
              </h1>
            </div>

            <p className="mt-2 text-sm text-gray-500">
              Monitor customer loan repayment reminders, cooldowns, permissions
              and errors.
            </p>
          </div>

          {/* HEADER ACTIONS */}

          <div className="flex flex-wrap items-center gap-3">
            {/* RUN DIAGNOSTICS */}

            <button
              onClick={handleRunDiagnostics}
              disabled={diagnosticsRunning}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-purple-300 bg-purple-50 px-5 py-2.5 text-sm font-semibold text-purple-700 transition hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>🧪</span>

              {diagnosticsRunning
                ? "Running Diagnostics..."
                : "Run Diagnostics"}
            </button>

            {/* REFRESH */}

            <button
              onClick={handleRefresh}
              disabled={loading || summaryLoading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span>↻</span>
              Refresh
            </button>
          </div>
        </div>

        {/* SUMMARY ERROR */}

        {summaryError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <p className="font-semibold">Unable to load reminder summary</p>

            <p className="mt-1">{summaryError}</p>

            <button
              onClick={handleRefresh}
              className="mt-3 font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* SUMMARY CARDS */}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <SummaryCard
            title="Total reminders"
            value={summaryValue(summary?.total)}
            description="Registered reminder records"
            icon="📊"
            color="bg-blue-50"
          />

          <SummaryCard
            title="Enabled"
            value={summaryValue(summary?.enabled)}
            description="Customers with reminders enabled"
            icon="🔔"
            color="bg-indigo-50"
          />

          <SummaryCard
            title="Active"
            value={summaryValue(summary?.active)}
            description="Currently active reminders"
            icon="🟢"
            color="bg-green-50"
          />

          <SummaryCard
            title="Cooldown"
            value={summaryValue(summary?.cooldown)}
            description="Temporarily hidden reminders"
            icon="⏳"
            color="bg-amber-50"
          />

          <SummaryCard
            title="Errors"
            value={summaryValue(summary?.errors)}
            description="Reminders requiring attention"
            icon="⚠️"
            color="bg-red-50"
          />
        </div>

        {/* SECONDARY SUMMARY */}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Disabled reminders</p>

            <h3 className="mt-2 text-xl font-bold text-gray-900">
              {summaryValue(summary?.disabled)}
            </h3>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Permission denied</p>

            <h3 className="mt-2 text-xl font-bold text-orange-600">
              {summaryValue(summary?.permissionDenied)}
            </h3>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-sm text-gray-500">Total unpaid installments</p>

            <h3 className="mt-2 text-xl font-bold text-gray-900">
              {summaryValue(summary?.unpaidInstallments)}
            </h3>

            <p className="mt-1 text-xs text-gray-500">
              Across registered reminder records
            </p>
          </div>
        </div>

        {/* GLOBAL APPEARANCE SETTINGS */}

        <FloatingReminderAppearanceEditor />
        
        {/* UNPAID AMOUNT */}

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">
            Total outstanding amount tracked
          </p>

          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            {summaryLoading
              ? "Loading..."
              : summaryError
                ? "Unavailable"
                : formatCurrency(summary?.unpaidAmount ?? 0)}
          </h2>
        </div>

        {/* CUSTOMER TABLE */}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {/* TABLE HEADER */}

          <div className="border-b border-gray-200 p-5">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Customer reminders
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {loading
                    ? "Loading reminder records..."
                    : `${totalRecords} reminder records found`}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                {/* SEARCH */}

                <input
                  type="search"
                  placeholder="Search name, email or phone..."
                  value={searchInput}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-72"
                />

                {/* STATUS FILTER */}

                <select
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="cooldown">Cooldown</option>
                  <option value="disabled">Disabled</option>
                  <option value="permission_denied">Permission denied</option>
                  <option value="error">Error</option>
                </select>
              </div>
            </div>
          </div>

          {/* TABLE ERROR */}

          {error && (
            <div className="m-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-semibold">Unable to load reminders</p>

              <p className="mt-1">{error}</p>

              <button
                onClick={handleRefresh}
                className="mt-3 font-semibold underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* LOADING */}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />

              <p className="mt-4 text-sm text-gray-500">
                Loading customer reminders...
              </p>
            </div>
          ) : !error && reminders.length === 0 ? (
            <div className="py-20 text-center">
              <div className="text-4xl">🔔</div>

              <h3 className="mt-4 font-semibold text-gray-900">
                No reminders found
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                There are no reminder records matching your filters.
              </p>
            </div>
          ) : !error ? (
            /* TABLE */

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-4">Customer</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Overlay permission</th>
                    <th className="px-5 py-4">Unpaid installments</th>
                    <th className="px-5 py-4">Outstanding</th>
                    <th className="px-5 py-4">Last payment</th>
                    <th className="px-5 py-4">Reminder timing</th>
                    <th className="px-5 py-4">Last error</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {reminders.map((reminder) => (
                    <tr
                      key={reminder._id}
                      className="transition hover:bg-gray-50"
                    >
                      {/* CUSTOMER */}

                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900">
                          {getCustomerName(reminder)}
                        </div>

                        <div className="mt-1 text-xs text-gray-500">
                          {reminder.user?.email || "No email"}
                        </div>

                        <div className="mt-1 text-xs text-gray-500">
                          {reminder.user?.phone || "No phone"}
                        </div>
                      </td>

                      {/* STATUS */}

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                            reminder.status,
                          )}`}
                        >
                          {getStatusLabel(reminder.status)}
                        </span>

                        <div className="mt-2 text-xs text-gray-500">
                          {reminder.enabled ? "Enabled" : "Not enabled"}
                        </div>
                      </td>

                      {/* OVERLAY PERMISSION */}

                      <td className="px-5 py-4">
                        <span
                          className={
                            reminder.overlayPermissionGranted
                              ? "font-semibold text-green-600"
                              : "font-semibold text-red-600"
                          }
                        >
                          {reminder.overlayPermissionGranted
                            ? "Granted"
                            : "Not granted"}
                        </span>

                        <div className="mt-1 text-xs text-gray-500">
                          Consent: {reminder.consentGranted ? "Yes" : "No"}
                        </div>
                      </td>

                      {/* UNPAID INSTALLMENTS */}

                      <td className="px-5 py-4">
                        <span className="font-semibold text-gray-900">
                          {reminder.unpaidInstallments}
                        </span>
                      </td>

                      {/* OUTSTANDING */}

                      <td className="px-5 py-4 font-semibold text-gray-900">
                        {formatCurrency(
                          reminder.unpaidAmount,
                          reminder.currency,
                        )}
                      </td>

                      {/* LAST PAYMENT */}

                      <td className="px-5 py-4 text-gray-600">
                        {formatDate(reminder.lastPaymentAt)}
                      </td>

                      {/* REMINDER TIMING */}

                      <td className="px-5 py-4 text-gray-600">
                        <div>
                          Last shown: {formatDate(reminder.lastReminderAt)}
                        </div>

                        {reminder.status === "cooldown" && (
                          <div className="mt-1 text-xs text-gray-500">
                            Cooldown until: {formatDate(reminder.cooldownUntil)}
                          </div>
                        )}
                      </td>

                      {/* LAST ERROR */}

                      <td className="max-w-xs px-5 py-4">
                        {reminder.lastError ? (
                          <span
                            className="block truncate text-xs text-red-600"
                            title={reminder.lastError}
                          >
                            {reminder.lastError}
                          </span>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {/* PAGINATION */}

          {!loading && !error && reminders.length > 0 && (
            <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-200 px-5 py-4 sm:flex-row">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} · {totalRecords} records
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <button
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={page >= totalPages}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER NOTE */}

        <p className="text-center text-xs text-gray-400">
          Floating reminder information is provided by registered backend
          reminder records. Last refreshed when this page loads or when you
          select Refresh.
        </p>
      </div>
    </div>
  );
};

export default FloatingRemindersPage;

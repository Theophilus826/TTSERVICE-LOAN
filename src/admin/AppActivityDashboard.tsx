import { useCallback, useEffect, useState } from "react";
import API from "../services/Api";

// =========================================================
// TYPES
// =========================================================

type ActivityStatus = "active_recently" | "stale" | "unknown";

interface ActivityCustomer {
  id: string;
  name?: string;
  email?: string;
}

interface AppActivityItem {
  installationId: string;
  customer: ActivityCustomer | null;
  appVersion: string;
  platform?: string;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  status: ActivityStatus;
}

interface ActivityResponse {
  items: AppActivityItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface SummaryProps {
  label: string;
  value: number;
}

interface StatusProps {
  status: ActivityStatus;
}

// =========================================================
// HELPERS
// =========================================================

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Unknown"
    : date.toLocaleString();
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (
      error as {
        response?: {
          status?: number;
          data?: { message?: string };
        };
      }
    ).response;

    if (response?.status === 401 || response?.status === 403) {
      return "Your session is invalid or you do not have admin access.";
    }

    if (response?.data?.message) {
      return response.data.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load monitoring records.";
}

// =========================================================
// STATUS BADGE
// =========================================================

function Status({ status }: StatusProps) {
  const styles: Record<
    ActivityStatus,
    { background: string; color: string; label: string }
  > = {
    active_recently: {
      background: "#dcfce7",
      color: "#166534",
      label: "Active recently",
    },
    stale: {
      background: "#fef3c7",
      color: "#92400e",
      label: "Stale",
    },
    unknown: {
      background: "#e5e7eb",
      color: "#374151",
      label: "Unknown",
    },
  };

  const item = styles[status] ?? styles.unknown;

  return (
    <span
      style={{
        display: "inline-block",
        background: item.background,
        color: item.color,
        padding: "5px 9px",
        borderRadius: 20,
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      {item.label}
    </span>
  );
}

// =========================================================
// SUMMARY CARD
// =========================================================

function Summary({ label, value }: SummaryProps) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 12,
        padding: 16,
        minWidth: 140,
        flex: "1 1 140px",
      }}
    >
      <div style={{ fontSize: 13, color: "#666" }}>{label}</div>
      <strong style={{ fontSize: 24 }}>{value}</strong>
    </div>
  );
}

// =========================================================
// STYLES
// =========================================================

const cellStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: "1px solid #eee",
  textAlign: "left",
  verticalAlign: "top",
};

// =========================================================
// DASHBOARD
// =========================================================

export default function AppActivityDashboard() {
  const [items, setItems] = useState<AppActivityItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [pages, setPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);

  // -------------------------------------------------------
  // LOAD ACTIVITY
  // -------------------------------------------------------

  const loadActivity = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError("");

    try {
      // Api.ts handles the base URL and Bearer token.
      const response = await API.get<ActivityResponse>(
        "/app-activity/admin",
        {
          params: {
            page,
            limit: 20,
          },
        },
      );

      const data = response.data;

      setItems(Array.isArray(data.items) ? data.items : []);
      setPages(Math.max(1, data.pagination?.pages || 1));
      setTotal(data.pagination?.total || 0);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  // -------------------------------------------------------
  // INITIAL LOAD AND PAGINATION
  // -------------------------------------------------------

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  // -------------------------------------------------------
  // COUNTS FOR THE CURRENT PAGE
  // -------------------------------------------------------

  const activeCount = items.filter(
    (item) => item.status === "active_recently",
  ).length;

  const staleCount = items.filter(
    (item) => item.status === "stale",
  ).length;

  const unknownCount = items.filter(
    (item) => item.status === "unknown",
  ).length;

  // -------------------------------------------------------
  // RENDER
  // -------------------------------------------------------

  return (
    <main
      style={{
        padding: 20,
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      <header style={{ marginBottom: 24 }}>
        <h1>TTSERVICE-LOAN</h1>
        <h2>App Activity Monitoring</h2>

        <p style={{ color: "#666", lineHeight: 1.6 }}>
          Recent activity is based on the last successful server
          heartbeat. It does not guarantee that the app is currently open.
        </p>
      </header>

      {/* Summary cards */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          margin: "20px 0",
        }}
      >
        <Summary label="Total installations" value={total} />
        <Summary label="Records on this page" value={items.length} />
        <Summary label="Active recently" value={activeCount} />
        <Summary label="Stale" value={staleCount} />
        <Summary label="Unknown" value={unknownCount} />
      </div>

      {/* Actions */}
      <div style={{ marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => void loadActivity()}
          disabled={loading}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "1px solid #ddd",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          style={{
            padding: 12,
            marginBottom: 16,
            borderRadius: 8,
            background: "#fee2e2",
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      )}

      {/* Activity table */}
      {loading && items.length === 0 ? (
        <p role="status">Loading monitoring records...</p>
      ) : (
        <div style={{ overflowX: "auto", marginTop: 20 }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 850,
            }}
          >
            <thead>
              <tr>
                {[
                  "Customer",
                  "Email",
                  "Installation ID",
                  "Platform",
                  "App version",
                  "First seen",
                  "Last check-in",
                  "Status",
                ].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    style={{
                      textAlign: "left",
                      padding: 12,
                      borderBottom: "1px solid #ddd",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {items.map((item) => (
                <tr key={item.installationId}>
                  <td style={cellStyle}>
                    {item.customer?.name || "Unknown customer"}
                  </td>

                  <td style={cellStyle}>
                    {item.customer?.email || "Unavailable"}
                  </td>

                  <td
                    style={{
                      ...cellStyle,
                      fontSize: 12,
                      overflowWrap: "anywhere",
                      maxWidth: 180,
                    }}
                  >
                    {item.installationId}
                  </td>

                  <td style={cellStyle}>
                    {item.platform || "android"}
                  </td>

                  <td style={cellStyle}>
                    {item.appVersion || "unknown"}
                  </td>

                  <td style={cellStyle}>
                    {formatDate(item.firstSeenAt)}
                  </td>

                  <td style={cellStyle}>
                    {formatDate(item.lastSeenAt)}
                  </td>

                  <td style={cellStyle}>
                    <Status status={item.status} />
                  </td>
                </tr>
              ))}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={8} style={cellStyle}>
                    No monitoring records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
          marginTop: 20,
        }}
      >
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => setPage((current) => current - 1)}
        >
          Previous
        </button>

        <span>
          Page {page} of {pages} · {total} total installations
        </span>

        <button
          type="button"
          disabled={page >= pages || loading}
          onClick={() => setPage((current) => current + 1)}
        >
          Next
        </button>
      </div>
    </main>
  );
}
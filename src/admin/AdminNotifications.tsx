
import { useEffect } from "react";
import {
  Bell,
  CheckCheck,
  Clock,
  Trash2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useNotifications } from "../context/NotificationContext";

function formatDate(date: string) {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export default function AdminNotifications() {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications]);

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <Bell size={22} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Notifications
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Stay updated on loan applications and account activity.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void refreshNotifications()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void markAllAsRead().catch(() => {})}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              <CheckCheck size={16} />
              Mark all as read
            </button>
          )}
        </div>
      </section>

      {/* SUMMARY */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Total loaded
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {notifications.length}
          </p>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5 shadow-sm">
          <p className="text-sm font-medium text-orange-700">
            Unread notifications
          </p>
          <p className="mt-2 text-3xl font-bold text-orange-700">
            {unreadCount}
          </p>
        </div>
      </section>

      {/* ERROR */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">
              Unable to load notifications
            </p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* NOTIFICATION LIST */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="font-semibold text-slate-900">
            Recent activity
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Your latest notifications appear here.
          </p>
        </div>

        {loading && notifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-orange-500" />
            <p className="mt-3 text-sm text-slate-500">
              Loading notifications...
            </p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <Bell className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-4 font-semibold text-slate-800">
              No notifications yet
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              New notifications will appear here when available.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((notification) => (
              <article
                key={notification._id}
                className={[
                  "flex items-start gap-3 p-5 transition sm:gap-4",
                  notification.isRead
                    ? "bg-white"
                    : "bg-orange-50/50",
                ].join(" ")}
              >
                <div
                  className={[
                    "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    notification.isRead
                      ? "bg-slate-100 text-slate-500"
                      : "bg-orange-100 text-orange-600",
                  ].join(" ")}
                >
                  <Bell size={19} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-slate-900">
                      {notification.title}
                    </h4>

                    {!notification.isRead && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                        Unread
                      </span>
                    )}
                  </div>

                  <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                    {notification.message}
                  </p>

                  <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock size={13} />
                    {formatDate(notification.createdAt)}
                  </p>

                  <p className="mt-1 text-xs capitalize text-slate-400">
                    Type: {notification.type.replace(/_/g, " ")}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  {!notification.isRead && (
                    <button
                      type="button"
                      onClick={() =>
                        void markAsRead(notification._id).catch(() => {})
                      }
                      title="Mark as read"
                      aria-label={`Mark ${notification.title} as read`}
                      className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-white hover:text-orange-600"
                    >
                      <CheckCheck size={17} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      void deleteNotification(notification._id).catch(() => {})
                    }
                    title="Delete notification"
                    aria-label={`Delete ${notification.title}`}
                    className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

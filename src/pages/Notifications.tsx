
import { useEffect, useState } from "react";
import {
  Bell,
  CheckCheck,
  Clock,
  Trash2,
  ArrowLeft,
  Inbox,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";

const STAFF_ROLES = [
  "admin",
  "super_admin",
  "loan_officer",
  "risk_officer",
  "finance",
  "support",
] as const;

function formatNotificationDate(date: string) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

export default function Notifications() {
  const navigate = useNavigate();

  const { user } = useAuth();

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  } = useNotifications();

  const [actionLoading, setActionLoading] =
    useState<string | null>(null);

  const isStaffUser =
    !!user &&
    STAFF_ROLES.includes(
      user.role as (typeof STAFF_ROLES)[number]
    );

  useEffect(() => {
    void refreshNotifications();
  }, []);

  const handleMarkAllAsRead = async () => {
    setActionLoading("all");

    try {
      await markAllAsRead();
    } catch (error) {
      console.error("Unable to mark all as read:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleNotificationClick = async (notification: {
    _id: string;
    isRead: boolean;
    relatedLoan?: string | null;
  }) => {
    if (!notification.isRead) {
      setActionLoading(notification._id);

      try {
        await markAsRead(notification._id);
      } catch (error) {
        console.error("Unable to mark as read:", error);
      } finally {
        setActionLoading(null);
      }
    }

    if (notification.relatedLoan) {
      navigate(isStaffUser ? "/admin" : "/loans");
    }
  };

  const handleDelete = async (
    event: React.MouseEvent<HTMLButtonElement>,
    id: string
  ) => {
    event.stopPropagation();

    setActionLoading(id);

    try {
      await deleteNotification(id);
    } catch (error) {
      console.error("Unable to delete notification:", error);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">

        {/* PAGE HEADER */}

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">

          <div>
            <button
              onClick={() => navigate(-1)}
              className="mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-orange-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Go back
            </button>

            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Notifications
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Stay updated on your loans, repayments and account activity.
            </p>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={actionLoading === "all"}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
            >
              <CheckCheck className="h-4 w-4" />
              {actionLoading === "all"
                ? "Updating..."
                : "Mark all as read"}
            </button>
          )}
        </div>

        {/* SUMMARY */}

        <div className="mb-6 grid grid-cols-2 gap-4">

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Total notifications
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              {notifications.length}
            </p>
          </div>

          <div className="rounded-xl border border-orange-100 bg-orange-50 p-5 shadow-sm">
            <p className="text-sm text-orange-700">
              Unread notifications
            </p>

            <p className="mt-2 text-2xl font-bold text-orange-600">
              {unreadCount}
            </p>
          </div>

        </div>

        {/* NOTIFICATION LIST */}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="font-semibold text-gray-900">
              All notifications
            </h2>

            <Bell className="h-5 w-5 text-orange-500" />
          </div>

          {loading && notifications.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />

              <p className="mt-4 text-sm text-gray-500">
                Loading notifications...
              </p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <Inbox className="mx-auto h-12 w-12 text-gray-300" />

              <h3 className="mt-4 font-semibold text-gray-800">
                No notifications yet
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Updates about your loans and repayments will appear here.
              </p>
            </div>
          ) : (
            <div>
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={[
                    "group relative border-b border-gray-100 transition hover:bg-gray-50",
                    !notification.isRead ? "bg-orange-50/50" : "",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    onClick={() =>
                      void handleNotificationClick(notification)
                    }
                    disabled={actionLoading === notification._id}
                    className="w-full px-5 py-5 pr-16 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500 disabled:opacity-60"
                  >
                    <div className="flex items-start gap-4">

                      <span
                        className={[
                          "mt-2 h-2.5 w-2.5 shrink-0 rounded-full",
                          notification.isRead
                            ? "bg-gray-200"
                            : "bg-orange-500",
                        ].join(" ")}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-gray-900">
                            {notification.title}
                          </h3>

                          {!notification.isRead && (
                            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                              New
                            </span>
                          )}
                        </div>

                        <p className="mt-2 break-words text-sm leading-6 text-gray-600">
                          {notification.message}
                        </p>

                        <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
                          <Clock className="h-3.5 w-3.5" />
                          {formatNotificationDate(
                            notification.createdAt
                          )}
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={(event) =>
                      void handleDelete(event, notification._id)
                    }
                    disabled={actionLoading === notification._id}
                    className="absolute right-4 top-5 rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    aria-label={`Delete ${notification.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}

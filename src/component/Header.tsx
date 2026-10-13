
import { useState } from "react";
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Bell,
  CheckCheck,
  X,
  Clock,
  Trash2,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";

/* =========================================================
   STAFF ROLES
========================================================= */

const STAFF_ROLES = [
  "admin",
  "super_admin",
  "loan_officer",
  "risk_officer",
  "finance",
  "support",
] as const;

/* =========================================================
   HELPERS
========================================================= */

function formatNotificationDate(date: string) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

/* =========================================================
   HEADER
========================================================= */

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    user,
    loading,
    isAuthenticated,
    logout,
  } = useAuth();

  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  } = useNotifications();

  const [notificationsOpen, setNotificationsOpen] =
    useState(false);

  const [notificationActionLoading, setNotificationActionLoading] =
    useState<string | null>(null);

  /* =======================================================
     STAFF CHECK
  ======================================================= */

  const isStaffUser =
    !!user &&
    STAFF_ROLES.includes(
      user.role as (typeof STAFF_ROLES)[number],
    );

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/login", {
        replace: true,
        state: {
          from: location,
        },
      });
    }
  };

  /* =======================================================
     NOTIFICATION ACTIONS
  ======================================================= */

  const handleOpenNotifications = () => {
    const opening = !notificationsOpen;

    setNotificationsOpen(opening);

    if (opening) {
      void refreshNotifications();
    }
  };

  const handleMarkAllAsRead = async () => {
    setNotificationActionLoading("all");

    try {
      await markAllAsRead();
    } catch (error) {
      console.error("Unable to mark notifications as read:", error);
    } finally {
      setNotificationActionLoading(null);
    }
  };

  const handleNotificationClick = async (notification: {
    _id: string;
    isRead: boolean;
    relatedLoan?: string | null;
  }) => {
    if (!notification.isRead) {
      setNotificationActionLoading(notification._id);

      try {
        await markAsRead(notification._id);
      } catch (error) {
        console.error("Unable to mark notification as read:", error);
      } finally {
        setNotificationActionLoading(null);
      }
    }

    setNotificationsOpen(false);

    if (notification.relatedLoan) {
      navigate(isStaffUser ? "/admin" : "/loans");
    }
  };

  const handleDeleteNotification = async (
    event: React.MouseEvent<HTMLButtonElement>,
    notificationId: string,
  ) => {
    event.stopPropagation();

    setNotificationActionLoading(notificationId);

    try {
      await deleteNotification(notificationId);
    } catch (error) {
      console.error("Unable to delete notification:", error);
    } finally {
      setNotificationActionLoading(null);
    }
  };

  /* =======================================================
     NAV LINK CLASS
  ======================================================= */

  const navLinkClass = ({
    isActive,
  }: {
    isActive: boolean;
  }) =>
    [
      "text-sm",
      "font-medium",
      "transition-colors",
      "duration-200",
      "hover:text-orange-500",
      "focus:outline-none",
      "focus-visible:ring-2",
      "focus-visible:ring-orange-500",
      "focus-visible:ring-offset-2",
      isActive ? "text-orange-500" : "text-gray-700",
    ].join(" ");

  /* =======================================================
     LOADING HEADER
  ======================================================= */

  if (loading) {
    return (
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/dashboard"
            className="text-xl font-bold text-orange-500"
            aria-label="Toans dashboard"
          >
            LISTEN
          </Link>

          <div
            className="h-9 w-24 animate-pulse rounded-lg bg-gray-100"
            aria-hidden="true"
          />
        </div>
      </header>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <header className="sticky top-0 z-40 border-b bg-white">
      <div className="mx-auto flex min-h-[68px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* LOGO */}

        <Link
          to={isStaffUser ? "/admin" : "/dashboard"}
          className="shrink-0 text-xl font-bold text-orange-500"
          aria-label={
            isStaffUser
              ? "Toans admin dashboard"
              : "Toans dashboard"
          }
        >
          LISTEN
        </Link>

        {/* DESKTOP NAVIGATION */}

        <nav
          className="hidden items-center gap-6 md:flex"
          aria-label="Main navigation"
        >
          <NavLink
            to="/dashboard"
            end
            className={navLinkClass}
          >
            Home
          </NavLink>

          <NavLink
            to="/loans"
            end
            className={navLinkClass}
          >
            Loans
          </NavLink>

          <NavLink
            to="/loans/repayments/history"
            className={navLinkClass}
          >
            Repayments
          </NavLink>

          <NavLink
            to="/bank-accounts"
            className={navLinkClass}
          >
            Bank Accounts
          </NavLink>

          <NavLink
            to="/profile"
            className={navLinkClass}
          >
            Profile
          </NavLink>

          {isStaffUser && (
            <NavLink
              to="/admin"
              end
              className={({ isActive }) =>
                [
                  "text-sm",
                  "font-semibold",
                  "transition-colors",
                  "duration-200",
                  "hover:text-orange-700",
                  "focus:outline-none",
                  "focus-visible:ring-2",
                  "focus-visible:ring-orange-500",
                  "focus-visible:ring-offset-2",
                  isActive ? "text-orange-700" : "text-orange-600",
                ].join(" ")
              }
            >
              Admin
            </NavLink>
          )}
        </nav>

        {/* USER AREA */}

        <div className="flex items-center gap-2 sm:gap-3">
          {/* NOTIFICATION BELL */}

          {isAuthenticated && (
            <div className="relative">
              <button
                type="button"
                onClick={handleOpenNotifications}
                className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                aria-label={
                  unreadCount > 0
                    ? `Notifications, ${unreadCount} unread`
                    : "Notifications"
                }
                aria-expanded={notificationsOpen}
                aria-haspopup="dialog"
              >
                <Bell className="h-5 w-5" />

                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {/* NOTIFICATION DROPDOWN */}

              {notificationsOpen && (
                <div
                  role="dialog"
                  aria-label="Notifications"
                  className="absolute right-0 top-full z-50 mt-3 w-[min(92vw,400px)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
                >
                  {/* DROPDOWN HEADER */}

                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">
                        Notifications
                      </h2>

                      <p className="mt-0.5 text-xs text-gray-500">
                        {unreadCount} unread
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllAsRead}
                          disabled={notificationActionLoading === "all"}
                          className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-orange-600 transition hover:bg-orange-50 disabled:opacity-50"
                          title="Mark all as read"
                        >
                          <CheckCheck className="h-4 w-4" />
                          <span className="hidden sm:inline">
                            Mark all read
                          </span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setNotificationsOpen(false)}
                        className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                        aria-label="Close notifications"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* NOTIFICATION LIST */}

                  <div className="max-h-[min(65vh,440px)] overflow-y-auto">
                    {notificationsLoading && notifications.length === 0 ? (
                      <div className="px-4 py-10 text-center">
                        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                        <p className="mt-3 text-sm text-gray-500">
                          Loading notifications...
                        </p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-10 text-center">
                        <Bell className="mx-auto h-8 w-8 text-gray-300" />

                        <p className="mt-3 text-sm font-medium text-gray-700">
                          No notifications yet
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          Updates about your loans and repayments will appear here.
                        </p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
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
                            disabled={
                              notificationActionLoading === notification._id
                            }
                            className="w-full px-4 py-3 pr-12 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500 disabled:opacity-60"
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className={[
                                  "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                                  notification.isRead
                                    ? "bg-transparent"
                                    : "bg-orange-500",
                                ].join(" ")}
                                aria-hidden="true"
                              />

                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-gray-900">
                                  {notification.title}
                                </p>

                                <p className="mt-1 break-words text-sm leading-5 text-gray-600">
                                  {notification.message}
                                </p>

                                <p className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                                  <Clock className="h-3 w-3" />
                                  {formatNotificationDate(
                                    notification.createdAt,
                                  )}
                                </p>
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={(event) =>
                              void handleDeleteNotification(
                                event,
                                notification._id,
                              )
                            }
                            disabled={
                              notificationActionLoading === notification._id
                            }
                            className="absolute right-3 top-3 rounded-md p-1.5 text-gray-400 opacity-100 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 disabled:opacity-40"
                            aria-label={`Delete notification: ${notification.title}`}
                            title="Delete notification"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* DROPDOWN FOOTER */}

                  <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                    <span className="text-xs text-gray-500">
                      Latest {notifications.length} notifications
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setNotificationsOpen(false);
                        navigate(
                          isStaffUser
                            ? "/admin"
                            : "/dashboard",
                        );
                      }}
                      className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                    >
                      Back to dashboard
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* USER INFORMATION */}

          <div className="hidden text-right sm:block">
            <p className="max-w-[160px] truncate text-sm font-medium text-gray-900">
              {user?.name || "User"}
            </p>

            <p className="text-xs capitalize text-gray-500">
              {user?.role?.replace(/_/g, " ") || "customer"}
            </p>
          </div>

          {/* PROFILE AND LOGOUT */}

          {isAuthenticated && (
            <>
              
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

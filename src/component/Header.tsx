
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Bell, Download } from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import KycAppDownloadPrompt from "../layout/KycAppDownloadPrompt";

import { useState } from "react";

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

  const { unreadCount } = useNotifications();

  const [appDownloadOpen, setAppDownloadOpen] =
    useState(false);

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
    <>
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
                    isActive
                      ? "text-orange-700"
                      : "text-orange-600",
                  ].join(" ")
                }
              >
                Admin
              </NavLink>
            )}
          </nav>

          {/* USER AREA */}

          <div className="flex items-center gap-2 sm:gap-3">

            {/* DOWNLOAD APP BUTTON */}

            {isAuthenticated && (
              <button
                type="button"
                onClick={() => setAppDownloadOpen(true)}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-orange-500 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                aria-label="Download Android app"
                title="Download Android app"
              >
                <Download className="h-4 w-4" />

                <span className="hidden sm:inline">
                  Download App
                </span>
              </button>
            )}

            {/* NOTIFICATION BELL */}

            {isAuthenticated && (
              <button
                type="button"
                onClick={() => navigate("/notifications")}
                className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                aria-label={
                  unreadCount > 0
                    ? `Notifications, ${unreadCount} unread`
                    : "Notifications"
                }
                title="View notifications"
              >
                <Bell className="h-5 w-5" />

                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                    {unreadCount > 99
                      ? "99+"
                      : unreadCount}
                  </span>
                )}
              </button>
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

            {/* LOGOUT */}

            {isAuthenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
              >
                Logout
              </button>
            )}

          </div>
        </div>
      </header>

      {/* ANDROID APP DOWNLOAD MODAL */}

      <KycAppDownloadPrompt
        open={appDownloadOpen}
        onClose={() => setAppDownloadOpen(false)}
      />
    </>
  );
}

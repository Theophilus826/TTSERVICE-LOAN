
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

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
            Toans App
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
      isActive
        ? "text-orange-500"
        : "text-gray-700",
    ].join(" ");

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <header className="sticky top-0 z-40 border-b bg-white">
      <div className="mx-auto flex min-h-[68px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* =================================================
            LOGO
        ================================================= */}

        <Link
          to={isStaffUser ? "/admin" : "/dashboard"}
          className="shrink-0 text-xl font-bold text-orange-500"
          aria-label={
            isStaffUser
              ? "Toans admin dashboard"
              : "Toans dashboard"
          }
        >
          Toans App
        </Link>

        {/* =================================================
            DESKTOP NAVIGATION
        ================================================= */}

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

        {/* =================================================
            USER AREA
        ================================================= */}

        <div className="flex items-center gap-2 sm:gap-3">
          {/* USER INFORMATION */}

          <div className="hidden text-right sm:block">
            <p className="max-w-[160px] truncate text-sm font-medium text-gray-900">
              {user?.name || "User"}
            </p>

            <p className="text-xs capitalize text-gray-500">
              {user?.role?.replace(/_/g, " ") || "customer"}
            </p>
          </div>

          {/* PROFILE */}

          {isAuthenticated && (
            <>
              <Link
                to="/profile"
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
              >
                <span className="hidden sm:inline">
                  Profile
                </span>

                <span className="sm:hidden">
                  Account
                </span>
              </Link>

              {/* LOGOUT */}

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


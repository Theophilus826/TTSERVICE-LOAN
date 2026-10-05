
import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from "react";

import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import type { LucideProps } from "lucide-react";

import {
  LayoutDashboard,
  Users,
  FileText,
  CreditCard,
  Landmark,
  ArrowRightLeft,
  BookOpen,
  ShieldAlert,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  Bell,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import {
  hasPermission,
  type AdminPermission,
} from "./adminPermissions";

import type { UserRole } from "../services/AuthService";

/* =========================================================
   TYPES
========================================================= */

type NavigationItem = {
  name: string;
  path: string;
  icon: ComponentType<LucideProps>;
  end?: boolean;
  permission: AdminPermission;
};

/* =========================================================
   ADMIN / STAFF ROLES
========================================================= */

const ADMIN_ROLES: readonly UserRole[] = [
  "admin",
  "super_admin",
  "loan_officer",
  "risk_officer",
  "finance",
  "support",
];

/* =========================================================
   NAVIGATION
========================================================= */

const navigation: readonly NavigationItem[] = [
  {
    name: "Dashboard",
    path: "/admin",
    icon: LayoutDashboard,
    end: true,
    permission: "dashboard:view",
  },
  {
    name: "Users",
    path: "/admin/users",
    icon: Users,
    permission: "users:view",
  },
  {
    name: "Loan Applications",
    path: "/admin/loan-applications",
    icon: FileText,
    permission: "applications:view",
  },
  {
    name: "Loan Products",
    path: "/admin/loan-products",
    icon: FileText,
    permission: "applications:view",
  },
  {
    name: "Loan Offers",
    path: "/admin/offers",
    icon: CreditCard,
    permission: "loans:view",
  },
  {
    name: "Mandates",
    path: "/admin/mandates",
    icon: Landmark,
    permission: "transfers:view",
  },
  {
    name: "Transfers",
    path: "/admin/transfers",
    icon: ArrowRightLeft,
    permission: "transfers:view",
  },
  {
    name: "Ledger",
    path: "/admin/ledger",
    icon: BookOpen,
    permission: "ledger:view",
  },
  {
    name: "Fraud & Risk",
    path: "/admin/fraud",
    icon: ShieldAlert,
    permission: "risk:view",
  },
  {
    name: "Audit Logs",
    path: "/admin/audit",
    icon: ClipboardList,
    permission: "audit:view",
  },
  {
    name: "KYC",
    path: "/admin/kyc",
    icon: ClipboardList,
    permission: "kyc:view",
  },
  {
    name: "Bank Verification",
    path: "/admin/bank-accounts",
    icon: Landmark,
    permission: "kyc:view",
  },
  {
    name: "Disbursements",
    path: "/admin/disbursements",
    icon: ArrowRightLeft,
    permission: "transfers:view",
  },
  {
  name: "Repayments",
  path: "/admin/repayments",
  icon: CreditCard,
  permission: "transfers:view",
},
  {
    name: "Settings",
    path: "/admin/settings",
    icon: Settings,
    permission: "settings:view",
  },
];

/* =========================================================
   ROLE CHECK
========================================================= */

function isAdminRole(
  role: UserRole | undefined,
): boolean {
  if (!role) {
    return false;
  }

  return ADMIN_ROLES.includes(role);
}

/* =========================================================
   ROLE LABEL
========================================================= */

function getRoleLabel(
  role: UserRole | undefined,
): string {
  switch (role) {
    case "super_admin":
      return "Super Admin";

    case "admin":
      return "Administrator";

    case "loan_officer":
      return "Loan Officer";

    case "risk_officer":
      return "Risk Officer";

    case "finance":
      return "Finance";

    case "support":
      return "Support";

    default:
      return "Administrator";
  }
}

/* =========================================================
   PAGE TITLE
========================================================= */

function getPageTitle(pathname: string): string {
  if (pathname === "/admin") {
    return "Dashboard";
  }

  const pageTitles: Record<string, string> = {
    "/admin/users": "Users",
    "/admin/loan-applications": "Loan Applications",
    "/admin/loan-products": "Loan Products",
    "/admin/offers": "Loan Offers",
    "/admin/mandates": "Mandates",
    "/admin/transfers": "Transfers",
    "/admin/ledger": "Ledger",
    "/admin/fraud": "Fraud & Risk",
    "/admin/audit": "Audit Logs",
    "/admin/kyc": "KYC",
    "/admin/bank-accounts": "Bank Verification",
    "/admin/disbursements": "Disbursements",
    "/admin/repayments": "Repayments",
    "/admin/settings": "Settings",
    "/admin/notifications": "Notifications",
  };

  if (pageTitles[pathname]) {
    return pageTitles[pathname];
  }

  // Handle nested routes such as:
  // /admin/loan-applications/123
  if (pathname.startsWith("/admin/loan-applications/")) {
    return "Loan Application";
  }

  if (pathname.startsWith("/admin/users/")) {
    return "User Details";
  }

  return "Administration";
}

/* =========================================================
   INITIALS
========================================================= */

function getInitials(
  name?: string,
  email?: string,
): string {
  const value = name?.trim() || email?.trim();

  if (!value) {
    return "AD";
  }

  const parts = value
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return value
    .slice(0, 2)
    .toUpperCase();
}

/* =========================================================
   LOADING VIEW
========================================================= */

function AdminLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <div
          className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500"
          aria-hidden="true"
        />

        <p className="mt-4 text-sm text-gray-500">
          Loading admin panel...
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   ADMIN LAYOUT
========================================================= */

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { user, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [profileOpen, setProfileOpen] =
    useState(false);

  /*
   * Change this if your AuthContext exposes a different
   * loading property.
   */
  const authLoading =
    (user as typeof user & {
      isLoading?: boolean;
    } | null)?.isLoading ?? false;

  const role = user?.role as
    | UserRole
    | undefined;

  const pageTitle = useMemo(
    () => getPageTitle(location.pathname),
    [location.pathname],
  );

  const adminName =
    user?.name?.trim() ||
    user?.email ||
    "Administrator";

  const roleLabel = getRoleLabel(role);

  const initials = getInitials(
    user?.name,
      );

  /*
   * Only show users that:
   * 1. belong to an admin/staff role
   * 2. have the required permission
   */
  const visibleNavigation = useMemo(() => {
    if (!role || !isAdminRole(role)) {
      return [];
    }

    return navigation.filter((item) =>
      hasPermission(role, item.permission),
    );
  }, [role]);

  /* =======================================================
     CLOSE MOBILE SIDEBAR / PROFILE ON ROUTE CHANGE
  ====================================================== */

  useEffect(() => {
    setSidebarOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  /* =======================================================
     ESCAPE KEY
  ====================================================== */

  useEffect(() => {
    const handleEscape = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
        setProfileOpen(false);
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, []);

  /* =======================================================
     LOGOUT
  ====================================================== */

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/login", {
        replace: true,
      });
    }
  };

  /* =======================================================
     AUTH LOADING
  ====================================================== */

  if (authLoading) {
    return <AdminLoading />;
  }

  /* =======================================================
     AUTHORIZATION
  ====================================================== */

  if (!user) {
    return null;
  }

  if (!isAdminRole(role)) {
    navigate("/login", {
      replace: true,
    });

    return null;
  }

  /* =======================================================
     RENDER
  ====================================================== */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* ===================================================
          MOBILE OVERLAY
      ==================================================== */}

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          onClick={() =>
            setSidebarOpen(false)
          }
        />
      )}

      {/* ===================================================
          SIDEBAR
      ==================================================== */}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col",
          "border-r border-slate-200 bg-white",
          "transition-transform duration-300 ease-in-out",
          "lg:translate-x-0",
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full",
        ].join(" ")}
      >
        {/* Brand */}

        <div className="flex h-[76px] items-center justify-between border-b border-slate-200 px-5">
          <button
            type="button"
            onClick={() =>
              navigate("/admin")
            }
            className="flex items-center gap-3"
            aria-label="Go to admin dashboard"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
              <Landmark
                size={20}
                strokeWidth={2}
              />
            </div>

            <div className="text-left">
              <div className="text-[15px] font-bold tracking-tight text-slate-950">
                LoanFlow
              </div>

              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                Administration
              </div>
            </div>
          </button>

          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() =>
              setSidebarOpen(false)
            }
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          >
            <X size={19} />
          </button>
        </div>

        {/* Navigation */}

        <nav
          className="flex-1 overflow-y-auto px-3 py-5"
          aria-label="Admin navigation"
        >
          <div className="space-y-1">
            {visibleNavigation.map(
              (item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    className={({
                      isActive,
                    }) =>
                      [
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5",
                        "text-sm font-medium transition-all duration-150",
                        isActive
                          ? "bg-slate-950 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                      ].join(" ")
                    }
                  >
                    {({
                      isActive,
                    }) => (
                      <>
                        <Icon
                          size={18}
                          strokeWidth={
                            isActive
                              ? 2.2
                              : 1.9
                          }
                        />

                        <span className="flex-1">
                          {item.name}
                        </span>

                        {isActive && (
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-white"
                            aria-hidden="true"
                          />
                        )}
                      </>
                    )}
                  </NavLink>
                );
              },
            )}
          </div>
        </nav>

        {/* Security status */}

        <div className="border-t border-slate-200 p-4">
          <div className="rounded-2xl bg-slate-50 p-3.5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm ring-1 ring-slate-200">
                <ShieldCheck size={16} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800">
                  Secure workspace
                </p>

                <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                  Admin activity is monitored
                  and recorded.
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ===================================================
          MAIN AREA
      ==================================================== */}

      <div className="lg:pl-[280px]">
        {/* =================================================
            TOP BAR
        ================================================== */}

        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-[76px] items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Left */}

            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Open navigation"
                aria-expanded={sidebarOpen}
                onClick={() =>
                  setSidebarOpen(true)
                }
                className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden"
              >
                <Menu size={21} />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Home
                    size={14}
                    className="hidden text-slate-400 sm:block"
                  />

                  <span className="hidden text-xs font-medium text-slate-400 sm:block">
                    Administration
                  </span>

                  <span className="hidden text-slate-300 sm:block">
                    /
                  </span>

                  <h1 className="truncate text-lg font-bold tracking-tight text-slate-950 sm:text-xl">
                    {pageTitle}
                  </h1>
                </div>
              </div>
            </div>

            {/* Right */}

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Notifications */}

              <button
                type="button"
                aria-label="Notifications"
                onClick={() =>
                  navigate(
                    "/admin/notifications",
                  )
                }
                className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <Bell size={19} />

                <span
                  className="absolute right-2.5 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"
                  aria-hidden="true"
                />
              </button>

              <div className="hidden h-8 w-px bg-slate-200 sm:block" />

              {/* Profile */}

              <div className="relative">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                  onClick={() =>
                    setProfileOpen(
                      (current) =>
                        !current,
                    )
                  }
                  className="flex items-center gap-2.5 rounded-xl p-1.5 pr-2 transition hover:bg-slate-100"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-xs font-bold text-white">
                    {initials}
                  </div>

                  <div className="hidden text-left md:block">
                    <p className="max-w-[150px] truncate text-sm font-semibold text-slate-800">
                      {adminName}
                    </p>

                    <p className="text-[11px] font-medium text-slate-400">
                      {roleLabel}
                    </p>
                  </div>

                  <ChevronDown
                    size={15}
                    className={[
                      "hidden text-slate-400 transition-transform md:block",
                      profileOpen
                        ? "rotate-180"
                        : "",
                    ].join(" ")}
                  />
                </button>

                {profileOpen && (
                  <>
                    {/* Click-away layer */}

                    <button
                      type="button"
                      aria-label="Close profile menu"
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() =>
                        setProfileOpen(
                          false,
                        )
                      }
                    />

                    {/* Dropdown */}

                    <div
                      className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
                      role="menu"
                    >
                      <div className="border-b border-slate-100 p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white">
                            {initials}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {adminName}
                            </p>

                            <p className="truncate text-xs text-slate-400">
                              {user.email ||
                                "Administrator"}
                            </p>

                            <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                              {roleLabel}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-2">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setProfileOpen(
                              false,
                            );

                            navigate(
                              "/admin/settings",
                            );
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                        >
                          <Settings
                            size={17}
                          />

                          Settings
                        </button>

                        <button
                          type="button"
                          role="menuitem"
                          onClick={
                            handleLogout
                          }
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                        >
                          <LogOut
                            size={17}
                          />

                          Sign out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* =================================================
            PAGE CONTENT
        ================================================== */}

        <main className="min-h-[calc(100vh-76px)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;



import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import type { UserRole } from "../services/AuthService";

/* =========================================================
   PROPS
========================================================= */

interface RoleRouteProps {
  allowedRoles: UserRole[];
}

/* =========================================================
   LOADING VIEW
========================================================= */

function LoadingView() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      aria-live="polite"
      aria-busy="true"
    >
      <span>Loading...</span>
    </div>
  );
}

/* =========================================================
   ROLE ROUTE
========================================================= */

function RoleRoute({
  allowedRoles,
}: RoleRouteProps) {
  const {
    user,
    loading,
    isAuthenticated,
  } = useAuth();

  const location = useLocation();

  /* =======================================================
     WAIT FOR AUTH RESTORATION
  ======================================================= */

  if (loading) {
    return <LoadingView />;
  }

  /* =======================================================
     REQUIRE AUTHENTICATION
  ======================================================= */

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: {
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
          },
        }}
      />
    );
  }

  /* =======================================================
     CHECK ROLE
  ======================================================= */

  const hasRequiredRole =
    allowedRoles.includes(user.role);

  if (!hasRequiredRole) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  /* =======================================================
     AUTHORIZED
  ======================================================= */

  return <Outlet />;
}

export default RoleRoute;


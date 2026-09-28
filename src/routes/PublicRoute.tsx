
import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

/* =========================================================
   PUBLIC ROUTE
========================================================= */

function PublicRoute() {
  const location = useLocation();

  const {
    user,
    loading,
    isAuthenticated,
  } = useAuth();

  /* =======================================================
     AUTHENTICATION INITIALIZATION
  ======================================================= */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div
            className="
              mx-auto
              mb-3
              h-8
              w-8
              animate-spin
              rounded-full
              border-4
              border-gray-300
              border-t-blue-600
            "
          />

          <p className="text-gray-600">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     ALREADY AUTHENTICATED
  ======================================================= */

  if (
    isAuthenticated &&
    user
  ) {
    const from =
      location.state?.from?.pathname ||
      "/dashboard";

    /*
     * Prevent authenticated users from being
     * redirected to another public authentication
     * page accidentally.
     */
    const destination =
      from.startsWith("/login") ||
      from.startsWith("/register") ||
      from.startsWith("/resetpassword")
        ? "/dashboard"
        : from;

    return (
      <Navigate
        to={destination}
        replace
      />
    );
  }

  /* =======================================================
     PUBLIC ACCESS
  ======================================================= */

  return <Outlet />;
}

export default PublicRoute;


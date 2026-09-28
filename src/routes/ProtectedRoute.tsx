
import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

/* =========================================================
   PROTECTED ROUTE
========================================================= */

function ProtectedRoute() {
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
     NOT AUTHENTICATED
  ======================================================= */

  if (
    !isAuthenticated ||
    !user
  ) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
        }}
      />
    );
  }

  /* =======================================================
     AUTHENTICATED
  ======================================================= */

  return <Outlet />;
}

export default ProtectedRoute;


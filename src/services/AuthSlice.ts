
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import authService from "./AuthService";

import type {
  AuthUser,
  UserRole,
} from "./AuthService";

// =========================================================
// TYPES
// =========================================================

interface AuthState {
  /**
   * Kept for backwards compatibility with components
   * that still read state.auth.user.
   *
   * New code should use AuthContext / useAuth().
   */
  user: AuthUser | null;

  /**
   * Kept for backwards compatibility.
   *
   * New code should use authService.getToken() or
   * AuthContext instead.
   */
  token: string | null;

  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  message: string;
}

// =========================================================
// HELPERS
// =========================================================

const getStoredUser = (): AuthUser | null => {
  try {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      return null;
    }

    return JSON.parse(storedUser) as AuthUser;
  } catch {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("userId");

    return null;
  }
};

// =========================================================
// INITIAL STATE
// =========================================================

const initialState: AuthState = {
  user: getStoredUser(),
  token: authService.getToken(),

  isLoading: false,
  isSuccess: false,
  isError: false,
  message: "",
};

// =========================================================
// SLICE
// =========================================================

/**
 * Compatibility-only Redux slice.
 *
 * Authentication is now managed by AuthContext.
 *
 * Do not add login/register/getMe/logout thunks here.
 * Doing so would create a second authentication state.
 */
const authSlice = createSlice({
  name: "auth",

  initialState,

  reducers: {
    // -------------------------------------------------------
    // RESET STATUS
    // -------------------------------------------------------

    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = "";
    },

    // -------------------------------------------------------
    // CLEAR LOCAL AUTH STATE
    // -------------------------------------------------------

    clearAuth: (state) => {
      state.user = null;
      state.token = null;

      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = "";

      void authService.logout();
    },

    // -------------------------------------------------------
    // UPDATE USER
    // -------------------------------------------------------

    setUser: (
      state,
      action: PayloadAction<Partial<AuthUser>>,
    ) => {
      if (!state.user) {
        return;
      }

      state.user = {
        ...state.user,
        ...action.payload,
      };

      if (action.payload.token) {
        state.token = action.payload.token;
      }

      localStorage.setItem(
        "user",
        JSON.stringify(state.user),
      );
    },

    // -------------------------------------------------------
    // SET ROLE
    // -------------------------------------------------------

    setRole: (
      state,
      action: PayloadAction<UserRole>,
    ) => {
      if (!state.user) {
        return;
      }

      state.user.role = action.payload;

      state.user.isAdmin =
        action.payload === "admin" ||
        action.payload === "super_admin";

      localStorage.setItem(
        "user",
        JSON.stringify(state.user),
      );
    },
  },
});

// =========================================================
// ACTIONS
// =========================================================

export const {
  reset,
  clearAuth,
  setUser,
  setRole,
} = authSlice.actions;

// =========================================================
// REDUCER
// =========================================================

export default authSlice.reducer;


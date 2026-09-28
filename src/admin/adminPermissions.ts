
import type { UserRole } from "../services/AuthService";

/* =========================================================
   ADMIN PERMISSIONS
========================================================= */

export type AdminPermission =
  | "dashboard:view"
  | "users:view"
  | "users:manage"
  | "loans:view"
  | "loans:manage"
  | "applications:view"
  | "applications:manage"
  | "transfers:view"
  | "transfers:manage"
  | "ledger:view"
  | "risk:view"
  | "risk:manage"
  | "audit:view"
  | "kyc:view"
  | "kyc:manage"
  | "settings:view";

/* =========================================================
   PERMISSION MAP
========================================================= */

const permissions: Record<
  UserRole,
  AdminPermission[]
> = {
  /* =======================================================
     CUSTOMER
  ======================================================= */

  customer: [],

  /* =======================================================
     ADMIN
  ======================================================= */

  admin: [
    "dashboard:view",

    "users:view",
    "users:manage",

    "loans:view",
    "loans:manage",

    "applications:view",
    "applications:manage",

    "transfers:view",
    "transfers:manage",

    "ledger:view",

    "risk:view",
    "risk:manage",

    "audit:view",

    "kyc:view",
    "kyc:manage",

    "settings:view",
  ],

  /* =======================================================
     SUPER ADMIN
  ======================================================= */

  super_admin: [
    "dashboard:view",

    "users:view",
    "users:manage",

    "loans:view",
    "loans:manage",

    "applications:view",
    "applications:manage",

    "transfers:view",
    "transfers:manage",

    "ledger:view",

    "risk:view",
    "risk:manage",

    "audit:view",

    "kyc:view",
    "kyc:manage",

    "settings:view",
  ],

  /* =======================================================
     LOAN OFFICER
  ======================================================= */

  loan_officer: [
    "dashboard:view",

    "users:view",

    "loans:view",
    "loans:manage",

    "applications:view",
    "applications:manage",
  ],

  /* =======================================================
     RISK OFFICER
  ======================================================= */

  risk_officer: [
    "dashboard:view",

    "users:view",

    "applications:view",

    "risk:view",
    "risk:manage",

    "audit:view",

    "kyc:view",
    "kyc:manage",
  ],

  /* =======================================================
     FINANCE
  ======================================================= */

  finance: [
    "dashboard:view",

    "loans:view",

    "transfers:view",
    "transfers:manage",

    "ledger:view",
  ],

  /* =======================================================
     SUPPORT
  ======================================================= */

  support: [
    "dashboard:view",

    "users:view",

    "kyc:view",
  ],
};

/* =========================================================
   CHECK PERMISSION
========================================================= */

export const hasPermission = (
  role: UserRole | undefined,
  permission: AdminPermission,
): boolean => {
  if (!role) {
    return false;
  }

  return (
    permissions[role]?.includes(permission) ??
    false
  );
};

/* =========================================================
   GET PERMISSIONS
========================================================= */

export const getPermissions = (
  role: UserRole | undefined,
): AdminPermission[] => {
  if (!role) {
    return [];
  }

  return permissions[role] ?? [];
};

/* =========================================================
   EXPORT PERMISSION MAP
========================================================= */

export default permissions;


import type { ReactNode } from "react";

import { useAppSelector } from "../layout/hooks";

import {
  hasPermission,
  type AdminPermission,
} from "./adminPermissions";

interface PermissionGuardProps {
  permission: AdminPermission;
  children: ReactNode;
  fallback?: ReactNode;
}

export default function PermissionGuard({
  permission,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const user = useAppSelector(
    (state) => state.auth.user
  );

  const allowed = hasPermission(
    user?.role,
    permission
  );

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
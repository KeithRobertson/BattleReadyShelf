import { useContext, useMemo } from "react";
import { AuthContext } from "@/auth/AuthContext";
import type { UserRole } from "@/generated";

const ADMIN_ROLES = new Set<UserRole>(["ADMIN", "SUPERADMIN"]);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  const { user } = context;

  const isAdmin = useMemo(() => {
    return ADMIN_ROLES.has((user?.role ?? "GUEST") as UserRole);
  }, [user?.role]);

  return {
    ...context,
    isAdmin,
  };
}

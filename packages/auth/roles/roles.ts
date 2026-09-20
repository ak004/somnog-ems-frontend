import type { AuthUser } from "@/packages/auth/context/context";

export const STAFF_ROLES = ["ADMIN", "ORGANIZER"] as const;
export const ADMIN_ROLES = ["ADMIN"] as const;

export function isStaff(role?: AuthUser["role"] | null) {
  return role === "ADMIN" || role === "ORGANIZER";
}

export function isAdmin(role?: AuthUser["role"] | null) {
  return role === "ADMIN";
}

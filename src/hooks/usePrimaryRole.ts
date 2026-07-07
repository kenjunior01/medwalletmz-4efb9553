import { useUserRoles } from "@/hooks/useUserRole";
import type { RoleKey } from "@/config/navigation";

/** Priority order when a user has multiple roles. */
const PRIORITY: RoleKey[] = [
  "admin", "doctor", "clinic", "hospital", "lab",
  "store_owner", "driver", "customer",
];

export function usePrimaryRole(): { role: RoleKey; loading: boolean } {
  const { roles, loading } = useUserRoles();
  const rset = new Set(roles.map(String));
  const role = (PRIORITY.find((r) => rset.has(r)) ?? "customer") as RoleKey;
  return { role, loading };
}
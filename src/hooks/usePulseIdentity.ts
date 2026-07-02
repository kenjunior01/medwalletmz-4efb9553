import { useMemo } from "react";
import { useUserRoles } from "@/hooks/useUserRole";
import { resolvePulseIdentity } from "@/lib/pulseIdentity";

export function usePulseIdentity() {
  const { roles } = useUserRoles();
  return useMemo(() => resolvePulseIdentity(roles), [roles]);
}
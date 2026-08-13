import type { Tables } from "@/integrations/supabase/types";
import type { LucideIcon } from "lucide-react";

export type Profile = Tables<"profiles">;

export interface Stats {
  orders: number;
  prescriptions: number;
  coupons: number;
  documents: number;
}

export interface MenuItem {
  icon: LucideIcon;
  label: string;
  href: string;
  highlight?: boolean;
  reward?: boolean;
}

export interface CompletionStep {
  done: boolean;
  label: string;
}

export interface InstitutionRole {
  role: "doctor" | "clinic" | "store_owner" | "lab" | "driver";
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  gradient: string;
  dashboard: string;
  register: string;
  labelKey: string;
  descKey: string;
}

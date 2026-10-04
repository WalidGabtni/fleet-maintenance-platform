import type { Role } from "./types";

// admin and directeur_service have identical permissions everywhere.
export const ADMIN_ROLES: Role[] = ["admin", "directeur_service"];

export function isAdminTier(role: Role | null | undefined): boolean {
  return !!role && ADMIN_ROLES.includes(role);
}

// customers, vehicles, work_orders, work_order_notes, maintenance_templates,
// vehicle_maintenance_schedules, technicians
export function canManageFleetOps(role: Role | null | undefined): boolean {
  return isAdminTier(role) || role === "superviseur";
}

// parts, work_order_parts
export function canManageParts(role: Role | null | undefined): boolean {
  return isAdminTier(role) || role === "commis_pieces";
}

// invoices, shop_settings, team/profile management, reports — admin-tier only.
export function isBackOffice(role: Role | null | undefined): boolean {
  return isAdminTier(role);
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrateur",
  directeur_service: "Directeur de service",
  superviseur: "Superviseur",
  commis_pieces: "Commis pièces",
  technicien: "Technicien",
};

export const ALL_ROLES: Role[] = ["admin", "directeur_service", "superviseur", "commis_pieces", "technicien"];

import type { Enums, Tables } from "./database.types";

export type Customer = Tables<"customers">;
export type Vehicle = Tables<"vehicles">;
export type Technician = Tables<"technicians">;
export type WorkOrder = Tables<"work_orders">;
export type WorkOrderNote = Tables<"work_order_notes">;
export type Profile = Tables<"profiles">;
export type Part = Tables<"parts">;
export type WorkOrderPart = Tables<"work_order_parts">;
export type Invoice = Tables<"invoices">;
export type ShopSettings = Tables<"shop_settings">;
export type InspectionCategory = Tables<"inspection_categories">;
export type WorkOrderStatus = Enums<"work_order_status">;
export type InvoiceStatus = Enums<"invoice_status">;
export type Role = "admin" | "directeur_service" | "superviseur" | "commis_pieces" | "technicien";

export const WORK_ORDER_STATUSES: WorkOrderStatus[] = [
  "open",
  "in_progress",
  "waiting_on_parts",
  "completed",
  "cancelled",
];

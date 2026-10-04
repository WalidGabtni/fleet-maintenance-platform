"use client";

import { SortableTable } from "./SortableTable";
import type { Database } from "@/lib/database.types";

type TechnicianRow = Database["public"]["Functions"]["report_technician_productivity"]["Returns"][number];
type VehicleRow = Database["public"]["Functions"]["report_vehicle_cost_history"]["Returns"][number];
type PartRow = Database["public"]["Functions"]["report_parts_usage"]["Returns"][number];

export function ReportsTables({
  technicians,
  vehicles,
  parts,
}: {
  technicians: TechnicianRow[];
  vehicles: VehicleRow[];
  parts: PartRow[];
}) {
  return (
    <>
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Productivité des techniciens</h2>
        <SortableTable
          rows={technicians}
          rowKey={(row) => row.technician_id}
          initialSortKey="completed_count"
          emptyMessage="Aucun bon de travail terminé sur cette période."
          ariaLabel="Productivité des techniciens"
          columns={[
            { key: "technician_name", label: "Technicien" },
            { key: "completed_count", label: "Terminés", align: "right" },
            {
              key: "avg_labor_hours",
              label: "Moy. heures main-d'œuvre",
              align: "right",
              render: (row) => (row.avg_labor_hours != null ? row.avg_labor_hours.toFixed(2) : "—"),
            },
            {
              key: "avg_turnaround_hours",
              label: "Délai moyen",
              align: "right",
              render: (row) =>
                row.avg_turnaround_hours != null ? `${(row.avg_turnaround_hours / 24).toFixed(1)} j` : "—",
            },
          ]}
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Historique des coûts par véhicule</h2>
        <SortableTable
          rows={vehicles}
          rowKey={(row) => row.vehicle_id}
          initialSortKey="total_cost"
          emptyMessage="Aucune facture sur cette période."
          ariaLabel="Historique des coûts par véhicule"
          columns={[
            {
              key: "unit_number",
              label: "Véhicule",
              render: (row) => row.unit_number ?? ([row.make, row.model].filter(Boolean).join(" ") || "—"),
            },
            { key: "customer_name", label: "Client" },
            { key: "work_order_count", label: "Bons de travail", align: "right" },
            { key: "total_labor", label: "Main-d'œuvre", align: "right", render: (row) => row.total_labor.toFixed(2) },
            { key: "total_parts", label: "Pièces", align: "right", render: (row) => row.total_parts.toFixed(2) },
            { key: "total_cost", label: "Total", align: "right", render: (row) => row.total_cost.toFixed(2) },
          ]}
        />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Utilisation des pièces</h2>
        <SortableTable
          rows={parts}
          rowKey={(row) => row.part_id}
          initialSortKey="total_spend"
          emptyMessage="Aucune pièce utilisée sur cette période."
          ariaLabel="Utilisation des pièces"
          columns={[
            { key: "part_name", label: "Pièce" },
            { key: "part_number", label: "Numéro", render: (row) => row.part_number ?? "—" },
            { key: "total_quantity", label: "Quantité utilisée", align: "right" },
            { key: "total_spend", label: "Dépense totale", align: "right", render: (row) => row.total_spend.toFixed(2) },
          ]}
        />
      </div>
    </>
  );
}

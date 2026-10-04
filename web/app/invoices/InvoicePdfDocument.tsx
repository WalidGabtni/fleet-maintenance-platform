"use client";

import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { invoiceStatusLabels } from "./InvoiceStatusBadge";
import type { Invoice, InvoiceStatus, ShopSettings } from "@/lib/types";

type PdfCustomer = { name: string; phone: string | null; email: string | null };
type PdfVehicle = {
  unit_number: string | null;
  vin: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
};
type PdfPart = {
  name: string;
  part_number: string | null;
  quantity_used: number;
  unit_price_at_time: number;
};

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#27272a" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  shopName: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  muted: { color: "#71717a" },
  invoiceTitle: { fontSize: 20, fontWeight: 700, textAlign: "right", marginBottom: 4 },
  metaLine: { textAlign: "right" },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  sectionBlock: { width: "48%" },
  sectionLabel: { fontSize: 9, textTransform: "uppercase", color: "#71717a", marginBottom: 4 },
  table: { marginTop: 12, borderTop: "1 solid #e4e4e7" },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f4f4f5",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottom: "1 solid #e4e4e7",
  },
  colDescription: { width: "46%" },
  colQty: { width: "14%", textAlign: "right" },
  colUnit: { width: "20%", textAlign: "right" },
  colTotal: { width: "20%", textAlign: "right" },
  tableHeaderText: { fontSize: 8, textTransform: "uppercase", color: "#71717a" },
  totalsBlock: { marginTop: 16, alignSelf: "flex-end", width: "45%" },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    marginTop: 4,
    borderTop: "1 solid #27272a",
  },
  grandTotalText: { fontWeight: 700, fontSize: 12 },
  footer: { marginTop: 32, paddingTop: 12, borderTop: "1 solid #e4e4e7" },
  statusBadge: { fontSize: 10, fontWeight: 700 },
});

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR");
}

export function InvoicePdfDocument({
  shop,
  invoice,
  customer,
  vehicle,
  parts,
}: {
  shop: Pick<ShopSettings, "shop_name" | "shop_address" | "shop_phone" | "shop_email">;
  invoice: Invoice;
  customer: PdfCustomer;
  vehicle: PdfVehicle;
  parts: PdfPart[];
}) {
  const isOverdue =
    invoice.status === "sent" && invoice.due_at != null && new Date(invoice.due_at).getTime() < Date.now();
  const displayStatus: InvoiceStatus = isOverdue ? "overdue" : invoice.status;
  const vehicleLabel =
    vehicle.unit_number ?? ([vehicle.make, vehicle.model].filter(Boolean).join(" ") || "—");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.shopName}>{shop.shop_name ?? "Atelier"}</Text>
            {shop.shop_address && <Text style={styles.muted}>{shop.shop_address}</Text>}
            {shop.shop_phone && <Text style={styles.muted}>{shop.shop_phone}</Text>}
            {shop.shop_email && <Text style={styles.muted}>{shop.shop_email}</Text>}
          </View>
          <View>
            <Text style={styles.invoiceTitle}>FACTURE</Text>
            <Text style={styles.metaLine}>{invoice.invoice_number}</Text>
            <Text style={[styles.metaLine, styles.muted]}>Émise le {formatDate(invoice.issued_at)}</Text>
            <Text style={[styles.metaLine, styles.muted]}>Échéance {formatDate(invoice.due_at)}</Text>
          </View>
        </View>

        <View style={styles.sectionRow}>
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>Facturé à</Text>
            <Text>{customer.name}</Text>
            {customer.phone && <Text style={styles.muted}>{customer.phone}</Text>}
            {customer.email && <Text style={styles.muted}>{customer.email}</Text>}
          </View>
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionLabel}>Véhicule</Text>
            <Text>{vehicleLabel}</Text>
            {vehicle.vin && <Text style={styles.muted}>NIV : {vehicle.vin}</Text>}
            {(vehicle.make || vehicle.model || vehicle.year) && (
              <Text style={styles.muted}>
                {[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(" · ")}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colDescription, styles.tableHeaderText]}>Description</Text>
            <Text style={[styles.colQty, styles.tableHeaderText]}>Qté</Text>
            <Text style={[styles.colUnit, styles.tableHeaderText]}>Prix unitaire</Text>
            <Text style={[styles.colTotal, styles.tableHeaderText]}>Total</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.colDescription}>Main-d&apos;œuvre</Text>
            <Text style={styles.colQty}>{invoice.labor_hours} h</Text>
            <Text style={styles.colUnit}>{invoice.labor_rate.toFixed(2)}</Text>
            <Text style={styles.colTotal}>{invoice.labor_total.toFixed(2)}</Text>
          </View>
          {parts.map((part, i) => (
            <View style={styles.tableRow} key={i}>
              <Text style={styles.colDescription}>
                {part.name}
                {part.part_number ? ` (${part.part_number})` : ""}
              </Text>
              <Text style={styles.colQty}>{part.quantity_used}</Text>
              <Text style={styles.colUnit}>{part.unit_price_at_time.toFixed(2)}</Text>
              <Text style={styles.colTotal}>{(part.quantity_used * part.unit_price_at_time).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text>Sous-total main-d&apos;œuvre</Text>
            <Text>{invoice.labor_total.toFixed(2)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>Sous-total pièces</Text>
            <Text>{invoice.parts_total.toFixed(2)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>Taxes ({(invoice.tax_rate * 100).toFixed(2)}%)</Text>
            <Text>{invoice.tax_total.toFixed(2)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalText}>Total général</Text>
            <Text style={styles.grandTotalText}>{invoice.grand_total.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.statusBadge}>Statut : {invoiceStatusLabels[displayStatus]}</Text>
          {invoice.status !== "paid" && invoice.due_at && (
            <Text style={[styles.muted, { marginTop: 4 }]}>
              Merci de régler avant le {formatDate(invoice.due_at)}.
            </Text>
          )}
          {invoice.status === "paid" && invoice.paid_at && (
            <Text style={[styles.muted, { marginTop: 4 }]}>Payée le {formatDate(invoice.paid_at)}.</Text>
          )}
        </View>
      </Page>
    </Document>
  );
}

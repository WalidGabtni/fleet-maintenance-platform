"use client";

import { pdf } from "@react-pdf/renderer";
import { useState } from "react";
import { InvoicePdfDocument } from "./InvoicePdfDocument";
import { secondaryButtonClass } from "@/lib/ui";
import type { Invoice, ShopSettings } from "@/lib/types";

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

export function DownloadInvoiceButton({
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
  const [generating, setGenerating] = useState(false);

  async function handleDownload() {
    setGenerating(true);
    try {
      const blob = await pdf(
        <InvoicePdfDocument shop={shop} invoice={invoice} customer={customer} vehicle={vehicle} parts={parts} />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${invoice.invoice_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <button type="button" onClick={handleDownload} disabled={generating} className={`${secondaryButtonClass} w-full disabled:cursor-not-allowed disabled:opacity-60`}>
      {generating ? "Génération…" : "Télécharger le PDF"}
    </button>
  );
}

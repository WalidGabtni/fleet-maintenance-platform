"use client";

import { useState, useTransition } from "react";
import { fetchExchangeRates } from "./actions";
import { SUPPORTED_CURRENCIES, formatCurrency, type CurrencyCode } from "@/lib/currency";
import {
  rowTableWrapperClass,
  rowTableBodyClass,
  rowTableHeaderRowClass,
  rowTableHeaderCellClass,
  rowCardClass,
  rowCardBgClass,
  rowCardCellClass,
  rowCardFooterClass,
} from "@/lib/ui";

type PartLine = {
  id: string;
  name: string;
  part_number: string | null;
  quantity: number;
  unitPrice: number;
};

export function InvoiceCurrencyTable({
  homeCurrency,
  laborHours,
  laborRate,
  laborTotal,
  parts,
  partsTotal,
  taxRatePercent,
  taxTotal,
  grandTotal,
}: {
  homeCurrency: CurrencyCode;
  laborHours: number;
  laborRate: number;
  laborTotal: number;
  parts: PartLine[];
  partsTotal: number;
  taxRatePercent: number;
  taxTotal: number;
  grandTotal: number;
}) {
  const [currency, setCurrency] = useState<CurrencyCode>(homeCurrency);
  const [rate, setRate] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleChange(next: CurrencyCode) {
    setError(null);
    if (next === homeCurrency) {
      setCurrency(next);
      setRate(1);
      return;
    }
    startTransition(async () => {
      const result = await fetchExchangeRates(homeCurrency);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setRate(result.rates[next] ?? 1);
      setCurrency(next);
    });
  }

  const convert = (value: number) => value * rate;
  const fmt = (value: number) => formatCurrency(convert(value), currency);

  const gridCols = "minmax(200px,3fr) 90px 140px 140px";
  const gridStyle = { gridTemplateColumns: gridCols };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-end gap-2">
        <label htmlFor="display_currency" className="text-xs text-app-fg-muted dark:text-brand-fg-muted">
          Afficher en
        </label>
        <select
          id="display_currency"
          value={currency}
          onChange={(e) => handleChange(e.target.value as CurrencyCode)}
          disabled={pending}
          className="rounded-md border border-app-border bg-app-surface px-2 py-1 text-xs text-app-fg disabled:opacity-60 dark:border-brand-border dark:bg-brand-bg-raised dark:text-brand-fg-muted"
        >
          {SUPPORTED_CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </div>
      {(currency !== homeCurrency || pending) && (
        <p className="text-right text-xs text-app-fg-faint dark:text-brand-fg-faint">
          {pending
            ? "Conversion en cours…"
            : error
              ? error
              : `Converti depuis ${homeCurrency} — taux indicatif du jour. La facture reste émise en ${homeCurrency}.`}
        </p>
      )}

      <div role="table" aria-label="Détail de la facture" className={rowTableWrapperClass}>
        <div role="rowgroup">
          <div role="row" style={gridStyle} className={rowTableHeaderRowClass}>
            <div role="columnheader" className={rowTableHeaderCellClass}>Description</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Qté</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Prix unitaire</div>
            <div role="columnheader" className={rowTableHeaderCellClass}>Total</div>
          </div>
        </div>
        <div role="rowgroup" className={rowTableBodyClass}>
          <div role="row" style={gridStyle} className={`${rowCardClass} ${rowCardBgClass}`}>
            <div role="cell" className="text-app-fg dark:text-brand-fg">Main-d&apos;œuvre</div>
            <div role="cell" className={rowCardCellClass}>{laborHours} h</div>
            <div role="cell" className={rowCardCellClass}>{fmt(laborRate)}</div>
            <div role="cell" className={rowCardCellClass}>{fmt(laborTotal)}</div>
          </div>
          {parts.map((part) => (
            <div key={part.id} role="row" style={gridStyle} className={`${rowCardClass} ${rowCardBgClass}`}>
              <div role="cell" className="text-app-fg dark:text-brand-fg">
                {part.name}
                {part.part_number && (
                  <span className="ml-1 text-xs text-app-fg-faint dark:text-brand-fg-faint">({part.part_number})</span>
                )}
              </div>
              <div role="cell" className={rowCardCellClass}>{part.quantity}</div>
              <div role="cell" className={rowCardCellClass}>{fmt(part.unitPrice)}</div>
              <div role="cell" className={rowCardCellClass}>{fmt(part.quantity * part.unitPrice)}</div>
            </div>
          ))}
        </div>
        <div role="rowgroup" className="flex flex-col gap-2 pt-2">
          <div role="row" style={gridStyle} className={rowCardFooterClass}>
            <div role="cell" style={{ gridColumn: "1 / span 3" }}>Sous-total pièces</div>
            <div role="cell" style={{ gridColumn: "4 / span 1" }}>{fmt(partsTotal)}</div>
          </div>
          <div role="row" style={gridStyle} className={rowCardFooterClass}>
            <div role="cell" style={{ gridColumn: "1 / span 3" }}>Taxes ({taxRatePercent.toFixed(2)}%)</div>
            <div role="cell" style={{ gridColumn: "4 / span 1" }}>{fmt(taxTotal)}</div>
          </div>
          <div role="row" style={gridStyle} className={`${rowCardFooterClass} font-semibold`}>
            <div role="cell" style={{ gridColumn: "1 / span 3" }}>Total général</div>
            <div role="cell" style={{ gridColumn: "4 / span 1" }}>{fmt(grandTotal)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

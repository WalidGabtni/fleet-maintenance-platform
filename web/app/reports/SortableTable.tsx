"use client";

import { useMemo, useState } from "react";
import {
  rowTableWrapperClass,
  rowTableBodyClass,
  rowTableHeaderRowClass,
  rowCardClass,
  rowCardBgClass,
  rowCardCellClass,
  rowTableEmptyClass,
} from "@/lib/ui";

type Column<T> = {
  key: keyof T;
  label: string;
  align?: "left" | "right";
  render?: (row: T) => React.ReactNode;
};

export function SortableTable<T extends Record<string, unknown>>({
  columns,
  rows,
  initialSortKey,
  initialDirection = "desc",
  rowKey,
  emptyMessage,
  ariaLabel,
}: {
  columns: Column<T>[];
  rows: T[];
  initialSortKey: keyof T;
  initialDirection?: "asc" | "desc";
  rowKey: (row: T) => string;
  emptyMessage: string;
  ariaLabel: string;
}) {
  const [sortKey, setSortKey] = useState<keyof T>(initialSortKey);
  const [direction, setDirection] = useState<"asc" | "desc">(initialDirection);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return direction === "asc" ? av - bv : bv - av;
      }
      const as = String(av);
      const bs = String(bv);
      return direction === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return copy;
  }, [rows, sortKey, direction]);

  function handleSort(key: keyof T) {
    if (key === sortKey) {
      setDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setDirection("desc");
    }
  }

  const gridStyle = { gridTemplateColumns: columns.map(() => "minmax(0,1fr)").join(" ") };

  return (
    <div className="flex flex-col gap-2">
      <div role="table" aria-label={ariaLabel} className={rowTableWrapperClass}>
        <div role="rowgroup">
          <div role="row" style={gridStyle} className={rowTableHeaderRowClass}>
            {columns.map((col) => (
              <div
                key={String(col.key)}
                role="columnheader"
                aria-sort={sortKey === col.key ? (direction === "asc" ? "ascending" : "descending") : "none"}
                onClick={() => handleSort(col.key)}
                className={`cursor-pointer select-none py-2 transition-colors duration-150 hover:text-app-fg dark:hover:text-brand-fg ${
                  col.align === "right" ? "text-right" : ""
                }`}
              >
                {col.label}
                {sortKey === col.key && (direction === "asc" ? " ▲" : " ▼")}
              </div>
            ))}
          </div>
        </div>
        <div role="rowgroup" className={rowTableBodyClass}>
          {sorted.map((row) => (
            <div key={rowKey(row)} role="row" style={gridStyle} className={`${rowCardClass} ${rowCardBgClass}`}>
              {columns.map((col) => (
                <div
                  key={String(col.key)}
                  role="cell"
                  className={`${rowCardCellClass} ${col.align === "right" ? "text-right" : ""}`}
                >
                  {col.render ? col.render(row) : String(row[col.key] ?? "—")}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      {sorted.length === 0 && <p className={rowTableEmptyClass}>{emptyMessage}</p>}
    </div>
  );
}

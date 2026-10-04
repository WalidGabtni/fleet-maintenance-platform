import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/profile";
import { isAdminTier } from "@/lib/permissions";
import { ENTITIES, fetchEntityRows } from "@/lib/dataExplorer";
import {
  inputClass,
  labelClass,
  buttonClass,
  pageSubtextClass,
  secondaryButtonClass,
  rowTableWrapperClass,
  rowTableBodyClass,
  rowTableHeaderRowClass,
  rowTableHeaderCellClass,
  rowCardClass,
  rowCardBgClass,
  rowCardCellClass,
  rowTableEmptyClass,
} from "@/lib/ui";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | undefined>;

function buildUrl(current: SearchParams, overrides: Record<string, string | null>) {
  const params = new URLSearchParams();
  const merged = { ...current, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    if (value != null && value !== "") params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/data-explorer?${qs}` : "/data-explorer";
}

export default async function DataExplorerPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const profile = await getCurrentProfile();
  if (!isAdminTier(profile?.role)) redirect("/");

  const params = await searchParams;
  const entity = ENTITIES.find((e) => e.key === params.entity) ?? ENTITIES[0];

  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const sort = params.sort ?? entity.defaultSort.key;
  const dir = params.dir === "asc" || params.dir === "desc" ? params.dir : entity.defaultSort.direction;
  const q = params.q ?? "";

  const filters: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key.startsWith("f_") && value) filters[key.slice(2)] = value;
  }

  const { rows, count, pageSize } = await fetchEntityRows(entity, profile!.tenantId, {
    page,
    sort,
    dir,
    q,
    filters,
  });

  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const hasFilterUi = entity.searchColumns.length > 0 || entity.filters.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Vue complète des données</h1>
        <p className={pageSubtextClass}>Parcourir toutes les données de votre organisation, en un seul endroit</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {ENTITIES.map((e) => (
          <Link
            key={e.key}
            href={`/data-explorer?entity=${e.key}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
              entity.key === e.key
                ? "bg-app-fg text-app-bg dark:bg-brand-fg dark:text-brand-bg"
                : "bg-app-surface-sunk text-app-fg-muted hover:bg-app-border-soft dark:bg-brand-bg-raised dark:text-brand-fg-muted dark:hover:bg-brand-bg-inset"
            }`}
          >
            {e.label}
          </Link>
        ))}
      </div>

      {hasFilterUi && (
        <form
          action="/data-explorer"
          method="get"
          className="flex flex-wrap items-end gap-3 rounded-lg border border-app-border bg-app-surface p-4 dark:border-brand-border-soft dark:bg-brand-bg-raised"
        >
          <input type="hidden" name="entity" value={entity.key} />
          <input type="hidden" name="sort" value={sort} />
          <input type="hidden" name="dir" value={dir} />

          {entity.searchColumns.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className={labelClass} htmlFor="q">Recherche</label>
              <input className={inputClass} id="q" name="q" defaultValue={q} placeholder="Rechercher…" />
            </div>
          )}

          {entity.filters.map((filter) => {
            if (filter.kind === "date") {
              return (
                <div key={filter.key} className="flex flex-col gap-1">
                  <label className={labelClass}>{filter.label}</label>
                  <div className="flex items-center gap-2">
                    <input
                      className={inputClass}
                      type="date"
                      name={`f_${filter.key}_from`}
                      defaultValue={filters[`${filter.key}_from`] ?? ""}
                    />
                    <span className="text-app-fg-muted dark:text-brand-fg-muted">à</span>
                    <input
                      className={inputClass}
                      type="date"
                      name={`f_${filter.key}_to`}
                      defaultValue={filters[`${filter.key}_to`] ?? ""}
                    />
                  </div>
                </div>
              );
            }
            const options =
              filter.kind === "enum"
                ? filter.options
                : [
                    { value: "true", label: "Oui" },
                    { value: "false", label: "Non" },
                  ];
            return (
              <div key={filter.key} className="flex flex-col gap-1">
                <label className={labelClass} htmlFor={`f_${filter.key}`}>{filter.label}</label>
                <select
                  className={inputClass}
                  id={`f_${filter.key}`}
                  name={`f_${filter.key}`}
                  defaultValue={filters[filter.key] ?? ""}
                >
                  <option value="">Tous</option>
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            );
          })}

          <div className="flex gap-2">
            <button type="submit" className={buttonClass}>Filtrer</button>
            <Link href={`/data-explorer?entity=${entity.key}`} className={secondaryButtonClass}>
              Réinitialiser
            </Link>
          </div>
        </form>
      )}

      <p className={pageSubtextClass}>{count} résultat{count === 1 ? "" : "s"}</p>

      {(() => {
        const gridStyle = { gridTemplateColumns: entity.columns.map(() => "minmax(0,1fr)").join(" ") };
        return (
          <div role="table" aria-label={entity.label} className={rowTableWrapperClass}>
            <div role="rowgroup">
              <div role="row" style={gridStyle} className={rowTableHeaderRowClass}>
                {entity.columns.map((col) => {
                  const isSorted = col.sortKey === sort;
                  const nextDir = isSorted && dir === "asc" ? "desc" : "asc";
                  return (
                    <div
                      key={col.label}
                      role="columnheader"
                      aria-sort={col.sortKey ? (isSorted ? (dir === "asc" ? "ascending" : "descending") : "none") : undefined}
                      className={`${rowTableHeaderCellClass} ${col.align === "right" ? "text-right" : ""}`}
                    >
                      {col.sortKey ? (
                        <Link
                          href={buildUrl(params, { entity: entity.key, sort: col.sortKey, dir: nextDir, page: null })}
                          className="inline-flex items-center gap-1 transition-colors duration-150 hover:text-app-fg dark:hover:text-brand-fg"
                        >
                          {col.label}
                          {isSorted && (dir === "asc" ? " ▲" : " ▼")}
                        </Link>
                      ) : (
                        col.label
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div role="rowgroup" className={rowTableBodyClass}>
              {rows.map((row) => (
                <div key={String(row.id)} role="row" style={gridStyle} className={`${rowCardClass} ${rowCardBgClass}`}>
                  {entity.columns.map((col) => (
                    <div
                      key={col.label}
                      role="cell"
                      className={`${rowCardCellClass} ${col.align === "right" ? "text-right" : ""}`}
                    >
                      {col.render(row)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      })()}
      {rows.length === 0 && <p className={rowTableEmptyClass}>Aucun résultat.</p>}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className={pageSubtextClass}>
            Page {page} sur {totalPages}
          </p>
          <div className="flex gap-2">
            <Link
              href={buildUrl(params, { entity: entity.key, page: String(Math.max(1, page - 1)) })}
              aria-disabled={page <= 1}
              className={`${secondaryButtonClass} ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
            >
              Précédent
            </Link>
            <Link
              href={buildUrl(params, { entity: entity.key, page: String(Math.min(totalPages, page + 1)) })}
              aria-disabled={page >= totalPages}
              className={`${secondaryButtonClass} ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}
            >
              Suivant
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

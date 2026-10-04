export const inputClass =
  "w-full rounded-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-fg transition-colors duration-150 focus:border-accent-500 focus:outline-none dark:border-brand-border dark:bg-brand-bg-raised dark:text-brand-fg";
export const labelClass = "text-sm font-medium text-app-fg dark:text-brand-fg-muted";
export const requiredMarkClass = "text-red-600 dark:text-red-400";
export const buttonClass =
  "rounded-md bg-accent-500 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-accent-900/20 transition-all duration-150 hover:bg-accent-600 hover:shadow-md hover:shadow-accent-900/25 active:scale-[0.97] active:shadow-sm";
export const secondaryButtonClass =
  "rounded-md border border-app-border px-4 py-2 text-sm font-medium text-app-fg transition-all duration-150 hover:bg-app-surface-sunk active:scale-[0.97] dark:border-brand-border dark:text-brand-fg-muted dark:hover:bg-brand-bg-raised";
export const dangerButtonClass =
  "rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-red-900/20 transition-all duration-150 hover:bg-red-700 hover:shadow-md active:scale-[0.97] active:shadow-sm dark:bg-red-700 dark:hover:bg-red-600";
export const iconButtonDangerClass =
  "flex h-8 w-8 items-center justify-center rounded-full text-app-fg-muted transition-colors duration-150 hover:bg-red-50 hover:text-red-600 dark:text-brand-fg-muted dark:hover:bg-red-950/40 dark:hover:text-red-400";

// Auth pages (login, set-password) are always-brand (dark, cinematic) overlays regardless of
// the app's theme — use these instead of inputClass/labelClass so a light preference never leaks in.
export const authInputClass =
  "w-full rounded-md border border-brand-border bg-brand-bg-raised px-3 py-2 text-sm text-brand-fg transition-colors duration-150 focus:border-accent-500 focus:outline-none";
export const authLabelClass = "text-sm font-medium text-brand-fg-muted";

export const cardClass =
  "rounded-lg border border-app-border bg-app-surface dark:border-brand-border-soft dark:bg-brand-bg-raised";
export const pageSubtextClass = "mt-1 text-sm text-app-fg-muted dark:text-brand-fg-muted";

// Row-card table system — CSS Grid <div>s standing in for <table>, because
// box-shadow never renders on <tr>. Each page keeps writing its own markup
// (same "shared classes, page owns the JSX" pattern the old table*Class
// constants used), just swapping <table>/<tr>/<td> for these plus explicit
// ARIA roles (role="table"/"rowgroup"/"row"/"columnheader"/"cell").
export const rowTableWrapperClass = "flex flex-col gap-2 overflow-x-auto";
export const rowTableBodyClass = "flex flex-col gap-3";
export const rowTableHeaderRowClass =
  "grid gap-4 px-4 text-xs uppercase tracking-wide text-app-fg-muted dark:text-brand-fg-muted";
export const rowTableHeaderCellClass = "py-2";
export const rowCardClass =
  "grid items-center gap-4 rounded-lg border border-app-border px-4 py-3 text-sm shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-app-fg-faint hover:shadow-md active:translate-y-0 active:shadow-sm dark:border-brand-border-soft dark:hover:border-brand-fg-faint";
export const rowCardBgClass = "bg-app-surface dark:bg-brand-bg-raised";
export const rowCardBgWarnClass = "bg-amber-50 dark:bg-amber-950/30";
export const rowCardBgDangerClass = "bg-red-50 dark:bg-red-950/30";
export const rowCardCellClass = "text-app-fg-muted dark:text-brand-fg-muted";
export const rowCardCellPrimaryClass = "font-medium text-app-fg dark:text-brand-fg";
export const rowCardFooterClass =
  "grid items-center gap-4 rounded-lg border border-app-border bg-app-surface-sunk px-4 py-3 text-sm font-medium text-app-fg dark:border-brand-border dark:bg-brand-bg-inset dark:text-brand-fg";
export const rowTableEmptyClass =
  "rounded-lg border border-dashed border-app-border p-4 text-center text-sm text-app-fg-muted dark:border-brand-border dark:text-brand-fg-muted";

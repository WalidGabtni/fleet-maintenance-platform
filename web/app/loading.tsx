export default function Loading() {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-app-fg-muted dark:text-brand-fg-muted">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <p className="text-sm">Chargement…</p>
      </div>
    </div>
  );
}

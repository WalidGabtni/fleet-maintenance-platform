import { ImageIcon } from "./icons";

export function EntityThumbnail({
  photoUrl,
  title,
  subtitle,
  size = "md",
}: {
  photoUrl?: string | null;
  title: string;
  subtitle?: string | null;
  size?: "sm" | "md";
}) {
  const box = size === "sm" ? "h-9 w-9" : "h-10 w-10";
  const icon = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div className="flex items-center gap-3">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt=""
          className={`${box} shrink-0 rounded-md border border-app-border object-cover dark:border-brand-border`}
        />
      ) : (
        <div
          className={`flex ${box} shrink-0 items-center justify-center rounded-md border border-dashed border-app-border text-app-border dark:border-brand-border dark:text-brand-fg-faint`}
        >
          <ImageIcon className={icon} />
        </div>
      )}
      <div>
        <p className="font-medium text-app-fg dark:text-brand-fg">{title}</p>
        {subtitle && <p className="text-xs text-app-fg-muted dark:text-brand-fg-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

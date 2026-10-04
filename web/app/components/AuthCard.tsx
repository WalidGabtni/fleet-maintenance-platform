import { TruckIcon } from "./icons";

export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full max-w-[380px] flex-col items-center">
      <div className="mb-2.5 flex items-center gap-3">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[11px] bg-accent-500"
          style={{ animation: "glow-pulse 3.5s ease-in-out infinite" }}
        >
          <TruckIcon className="h-6 w-6 text-brand-bg" />
        </span>
        <span
          className="text-[clamp(32px,8vw,44px)] font-bold tracking-wide text-brand-fg"
          style={{ textShadow: "0 2px 24px oklch(0.165 0.014 45 / 0.8), 0 1px 2px oklch(0.1 0.01 45 / 0.9)" }}
        >
          Fleet Data
        </span>
      </div>
      <div className="mb-3.5 h-[3px] w-16 rounded-full bg-accent-500" />
      <p className="mb-9 text-center text-[13px] font-semibold uppercase tracking-[0.16em] text-accent-400">
        Garder le Canada en mouvement
      </p>

      <div className="w-full rounded-lg border border-brand-border bg-brand-bg-raised/70 p-7 shadow-lg backdrop-blur-md">
        {children}
      </div>
    </div>
  );
}

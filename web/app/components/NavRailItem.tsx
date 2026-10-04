"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export type NavSubsection = {
  label: string;
  href?: string;
  comingSoon?: boolean;
};

export function NavRailItem({
  icon: Icon,
  label,
  isActive,
  subsections,
}: {
  icon: (props: { className?: string }) => React.ReactElement;
  label: string;
  isActive: boolean;
  subsections: NavSubsection[];
}) {
  const [open, setOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors duration-200 ${
          isActive || open
            ? "bg-brand-bg-raised text-accent-400"
            : "text-brand-fg-muted hover:bg-brand-bg-raised hover:text-brand-fg"
        }`}
      >
        <Icon className="h-5 w-5" />
      </button>

      {hovering && !open && (
        <div
          role="tooltip"
          className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-brand-bg-inset px-2.5 py-1.5 text-xs font-medium text-brand-fg shadow-lg"
        >
          {label}
        </div>
      )}

      {open && (
        <div
          role="menu"
          className="absolute left-full top-0 z-50 ml-2 w-56 overflow-hidden rounded-md border border-brand-border-soft bg-brand-bg-raised shadow-xl"
        >
          <p className="border-b border-brand-border-soft px-3 py-2 text-xs font-semibold uppercase tracking-wider text-brand-fg-faint">
            {label}
          </p>
          <div className="flex flex-col py-1">
            {subsections.map((sub) =>
              sub.href ? (
                <Link
                  key={sub.label}
                  href={sub.href}
                  onClick={() => setOpen(false)}
                  role="menuitem"
                  className="px-3 py-2 text-sm text-brand-fg-muted transition-colors duration-150 hover:bg-brand-bg-inset hover:text-brand-fg"
                >
                  {sub.label}
                </Link>
              ) : (
                <span
                  key={sub.label}
                  role="menuitem"
                  aria-disabled="true"
                  className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-brand-fg-faint"
                >
                  {sub.label}
                  <span className="shrink-0 rounded-full bg-brand-bg-inset px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                    Bientôt
                  </span>
                </span>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import type { ModuleCardData, ModuleUrgency } from "@/lib/dashboardModules";
import {
  AlertTriangleIcon,
  CheckIcon,
  DashedCircleIcon,
  HourglassIcon,
  XIcon,
} from "./icons";

const URGENCY_ICON: Record<ModuleUrgency, (props: { className?: string }) => React.ReactElement> = {
  good: CheckIcon,
  neutral: DashedCircleIcon,
  waiting: HourglassIcon,
  urgent: AlertTriangleIcon,
};

// Optional photo per module key (served from /public). A module with no entry
// falls back to the dashed-circle icon.
const MODULE_PHOTO: Record<string, string> = {};

export function ModuleCard({
  module,
  onDismiss,
}: {
  module: ModuleCardData;
  onDismiss: (key: string) => void;
}) {
  const photoSrc = MODULE_PHOTO[module.key];

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow duration-150 hover:shadow-md">
      <Link href={module.href} className="block">
        <div className="flex items-center bg-slate-800 px-6 py-4 pr-12">
          <span className="text-sm font-semibold uppercase tracking-wider text-white">{module.label}</span>
        </div>
        <div className="relative h-52 w-full overflow-hidden bg-slate-100">
          {photoSrc ? (
            <Image
              src={photoSrc}
              alt={module.label}
              fill
              sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <DashedCircleIcon className="h-20 w-20 text-slate-400" />
            </div>
          )}
        </div>
        <ul className="flex flex-col gap-3 px-6 py-6">
          {module.stats.map((stat) => {
            const StatIcon = URGENCY_ICON[stat.urgency];
            const isUrgent = stat.urgency === "urgent";
            return (
              <li key={stat.label} className="flex items-center gap-3 text-base">
                <StatIcon className={`h-5 w-5 shrink-0 ${isUrgent ? "text-slate-800" : "text-slate-400"}`} />
                <span className={`flex-1 ${isUrgent ? "font-bold text-slate-800" : "text-slate-600"}`}>
                  {stat.label}
                </span>
                <span className={isUrgent ? "font-bold text-slate-800" : "font-medium text-slate-700"}>
                  {stat.value}
                </span>
              </li>
            );
          })}
        </ul>
      </Link>
      <button
        type="button"
        onClick={() => onDismiss(module.key)}
        aria-label={`Masquer ${module.label}`}
        className="absolute right-3 top-2.5 rounded p-1 text-white/70 transition-colors duration-150 hover:bg-white/10 hover:text-white"
      >
        <XIcon className="h-5 w-5" />
      </button>
    </div>
  );
}

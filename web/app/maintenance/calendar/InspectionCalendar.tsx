"use client";

import { useMemo, useState } from "react";
import { AlertTriangleIcon, CheckIcon, ChevronDownIcon, HourglassIcon } from "../../components/icons";
import { SubmitButton } from "../../components/SubmitButton";
import { secondaryButtonClass, inputClass, labelClass } from "@/lib/ui";
import { updateInspectionDueDate } from "./actions";

export type InspectionEvent = {
  scheduleId: string;
  vehicleId: string;
  vehicleLabel: string;
  categoryName: string;
  dueDate: string;
  isOverride: boolean;
  isDue: boolean;
  isDueSoon: boolean;
};

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTH_LABELS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getMonthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  const mondayIndexed = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const gridStart = new Date(year, month, 1 - mondayIndexed);
  const totalCells = Math.ceil((mondayIndexed + daysInMonth) / 7) * 7;
  return Array.from({ length: totalCells }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

function urgencyOf(event: InspectionEvent): "urgent" | "waiting" | "good" {
  if (event.isDue) return "urgent";
  if (event.isDueSoon) return "waiting";
  return "good";
}

const URGENCY_ICON = {
  urgent: AlertTriangleIcon,
  waiting: HourglassIcon,
  good: CheckIcon,
};

const URGENCY_LABEL = {
  urgent: "En retard",
  waiting: "Bientôt dû (14 j)",
  good: "À jour",
};

export function InspectionCalendar({ events, canEdit }: { events: InspectionEvent[]; canEdit: boolean }) {
  const today = useMemo(() => new Date(), []);
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [editingEvent, setEditingEvent] = useState<InspectionEvent | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const grid = useMemo(() => getMonthGrid(year, month), [year, month]);
  const todayKey = toDateKey(today);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, InspectionEvent[]>();
    for (const event of events) {
      const list = map.get(event.dueDate) ?? [];
      list.push(event);
      map.set(event.dueDate, list);
    }
    return map;
  }, [events]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            aria-label="Mois précédent"
            className={`${secondaryButtonClass} px-2 py-1`}
          >
            <ChevronDownIcon className="h-4 w-4 rotate-90" />
          </button>
          <h2 className="w-44 text-center text-lg font-semibold text-app-fg dark:text-brand-fg">
            {MONTH_LABELS[month]} {year}
          </h2>
          <button
            type="button"
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            aria-label="Mois suivant"
            className={`${secondaryButtonClass} px-2 py-1`}
          >
            <ChevronDownIcon className="h-4 w-4 -rotate-90" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))}
          className={secondaryButtonClass}
        >
          Aujourd&apos;hui
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-app-fg-muted dark:text-brand-fg-muted">
        {(["urgent", "waiting", "good"] as const).map((level) => {
          const Icon = URGENCY_ICON[level];
          return (
            <span key={level} className="flex items-center gap-1.5">
              <Icon className={`h-3.5 w-3.5 ${level === "urgent" ? "text-slate-800 dark:text-slate-200" : "text-slate-400"}`} />
              {URGENCY_LABEL[level]}
            </span>
          );
        })}
        {canEdit && <span>· Cliquez une échéance pour la modifier manuellement</span>}
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[720px] grid-cols-7 gap-px overflow-hidden rounded-lg border border-app-border bg-app-border dark:border-brand-border-soft dark:bg-brand-border-soft">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="bg-slate-100 px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              {label}
            </div>
          ))}
          {grid.map((day) => {
            const key = toDateKey(day);
            const dayEvents = eventsByDay.get(key) ?? [];
            const isCurrentMonth = day.getMonth() === month;
            const isToday = key === todayKey;
            return (
              <div
                key={key}
                className={`flex min-h-[104px] flex-col gap-1 p-1.5 ${
                  isCurrentMonth
                    ? "bg-app-surface dark:bg-brand-bg-raised"
                    : "bg-app-surface-sunk text-app-fg-faint dark:bg-brand-bg-inset"
                }`}
              >
                <span
                  className={`self-end text-xs ${
                    isToday
                      ? "flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 font-semibold text-white dark:bg-slate-200 dark:text-slate-900"
                      : "text-app-fg-muted dark:text-brand-fg-muted"
                  }`}
                >
                  {day.getDate()}
                </span>
                <div className="flex flex-col gap-1">
                  {dayEvents.map((event) => {
                    const level = urgencyOf(event);
                    const Icon = URGENCY_ICON[level];
                    const chipClass = `flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-left text-xs ${
                      level === "urgent"
                        ? "bg-slate-800 font-semibold text-white dark:bg-slate-200 dark:text-slate-900"
                        : level === "waiting"
                          ? "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`;
                    const title = `${event.vehicleLabel} — ${event.categoryName} — ${URGENCY_LABEL[level]}${
                      event.isOverride ? " (date modifiée manuellement)" : ""
                    }`;
                    return canEdit ? (
                      <button
                        key={event.scheduleId}
                        type="button"
                        title={title}
                        onClick={() => setEditingEvent(event)}
                        className={`${chipClass} transition-transform duration-100 hover:scale-[1.03] active:scale-[0.97]`}
                      >
                        <Icon className="h-3 w-3 shrink-0" />
                        <span className="truncate">{event.vehicleLabel}</span>
                        {event.isOverride && <span aria-hidden>*</span>}
                      </button>
                    ) : (
                      <div key={event.scheduleId} title={title} className={chipClass}>
                        <Icon className="h-3 w-3 shrink-0" />
                        <span className="truncate">{event.vehicleLabel}</span>
                        {event.isOverride && <span aria-hidden>*</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-lg bg-app-surface p-5 dark:bg-brand-bg-raised">
            <div>
              <h2 className="text-lg font-semibold text-app-fg dark:text-brand-fg">Modifier l&apos;échéance</h2>
              <p className="mt-1 text-sm text-app-fg-muted dark:text-brand-fg-muted">
                {editingEvent.vehicleLabel} — {editingEvent.categoryName}
              </p>
            </div>
            <form
              action={async (formData) => {
                await updateInspectionDueDate(editingEvent.scheduleId, formData);
                setEditingEvent(null);
              }}
              className="flex flex-col gap-3"
            >
              <div className="flex flex-col gap-1">
                <label className={labelClass} htmlFor="next_due_override">Prochaine échéance</label>
                <input
                  className={inputClass}
                  id="next_due_override"
                  name="next_due_override"
                  type="date"
                  defaultValue={editingEvent.dueDate}
                  required
                />
              </div>
              {editingEvent.isOverride && (
                <p className="text-xs text-app-fg-muted dark:text-brand-fg-muted">
                  Cette date a été modifiée manuellement — elle ne sera pas recalculée automatiquement.
                </p>
              )}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setEditingEvent(null)} className={secondaryButtonClass}>
                  Annuler
                </button>
                {editingEvent.isOverride && (
                  <button type="submit" name="reset" value="1" formNoValidate className={secondaryButtonClass}>
                    Réinitialiser
                  </button>
                )}
                <SubmitButton>Enregistrer</SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

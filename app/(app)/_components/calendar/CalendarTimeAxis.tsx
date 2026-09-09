"use client";

import { formatHourLabel } from "../../_lib/calendar-time";

type CalendarTimeAxisProps = Readonly<{ hourHeightPx: number }>;

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

// The label column sitting to the left of CalendarTimeGrid's day columns -
// a separate component only because it's rendered once (not once per day
// column) while the grid lines themselves are per-column background CSS.
export default function CalendarTimeAxis({ hourHeightPx }: CalendarTimeAxisProps) {
  return (
    <div className="w-12 shrink-0 sm:w-14">
      {HOURS.map((hour) => (
        <div key={hour} style={{ height: hourHeightPx }} className="relative">
          {hour > 0 ? <span className="absolute -top-2 right-1.5 text-[10px] text-slate-500">{formatHourLabel(hour)}</span> : null}
        </div>
      ))}
    </div>
  );
}

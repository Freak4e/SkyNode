import { CalendarDays, MapPin } from "lucide-react";
import type { ItineraryDay } from "../../../shared/types.js";
import { cleanDayTitle, cleanTime, tripDate } from "../planner/plannerUtils.js";

type Props = {
  days: ItineraryDay[];
  startDate: string;
};

export function CommunityItineraryView({ days, startDate }: Props) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {days.map((day) => {
        const date = tripDate(startDate, day.dayNumber);

        return (
          <article key={day.dayNumber} className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-card">
            <div className="border-b border-slate-100 bg-linear-to-r from-blue-600 to-cyan-500 px-5 py-4 text-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-100">Day {day.dayNumber}</p>
                  <h3 className="mt-1 text-xl font-black">{cleanDayTitle(day.title, day.dayNumber)}</h3>
                </div>
                <div className="rounded-full bg-white/15 px-3 py-1 text-xs font-black">${day.estimatedCost}</div>
              </div>
              <p className="mt-2 flex items-center gap-2 text-xs font-bold text-blue-100">
                <CalendarDays className="h-3.5 w-3.5" />
                {date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
              </p>
            </div>

            <div className="space-y-3 p-5">
              {day.items.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm font-semibold text-slate-500">
                  No activities planned yet.
                </p>
              ) : day.items.map((item, index) => (
                <div key={`${day.dayNumber}-${item.title}-${index}`} className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-mono text-xs font-black text-blue-600">{cleanTime(item.timeOfDay)}</span>
                      <p className="font-black text-slate-950">{item.title}</p>
                    </div>
                    <span className="text-sm font-black text-slate-700">{item.estimatedCost > 0 ? `$${item.estimatedCost}` : "Free"}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
                  {(item.location?.name || item.attractionName) && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600">
                      <MapPin className="h-3.5 w-3.5" />
                      {item.location?.name || item.attractionName}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}

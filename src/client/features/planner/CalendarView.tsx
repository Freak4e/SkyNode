import { Card } from "../../components/ui";
import type { GeneratedItinerary, ItineraryDay } from "../../../shared/types.js";
import { tripDate } from "./plannerUtils";

export function CalendarView({ itinerary }: { itinerary: GeneratedItinerary }) {
  const start = new Date(`${itinerary.startDate}T00:00:00`);
  const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);
  const monthEnd = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  const cells = Array.from({ length: monthStart.getDay() + monthEnd.getDate() }, (_, index) => {
    const dayOfMonth = index - monthStart.getDay() + 1;
    return dayOfMonth > 0 ? new Date(start.getFullYear(), start.getMonth(), dayOfMonth) : null;
  });
  const daysByDate = new globalThis.Map<string, ItineraryDay>();
  itinerary.days.forEach((day) => daysByDate.set(tripDate(itinerary.startDate, day.dayNumber).toISOString().slice(0, 10), day));

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="border-b border-slate-100 p-6">
        <h2 className="text-3xl font-black text-slate-950">{start.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2>
        <p className="mt-1 text-sm font-bold text-slate-500">{itinerary.days.length} planned days</p>
      </div>
      <div className="grid grid-cols-7 gap-2 p-5">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => <div key={label} className="pb-3 text-center text-xs font-black uppercase tracking-widest text-slate-500">{label}</div>)}
        {cells.map((date, index) => {
          const key = date?.toISOString().slice(0, 10) || `pad-${index}`;
          const day = date ? daysByDate.get(key) : undefined;

          return (
            <div key={key} className={`min-h-28 rounded-3xl border p-3 ${day ? "border-blue-300 bg-blue-50 shadow-sm shadow-blue-100" : "border-slate-100 bg-slate-50"}`}>
              {date && <>
                <div className="mb-8 flex items-start justify-between">
                  <span className="text-base font-black text-slate-600">{date.getDate()}</span>
                  {day && <span className="rounded-full bg-linear-to-r from-blue-500 to-cyan-400 px-2 py-1 text-[10px] font-black text-white">D{day.dayNumber}</span>}
                </div>
                {day && <div className="space-y-1">
                  {day.items.slice(0, 2).map((item, itemIndex) => <p key={`${day.dayNumber}-${itemIndex}`} className="truncate text-xs font-bold text-slate-500"><span className={itemIndex % 2 === 0 ? "text-blue-500" : "text-emerald-500"}>*</span> {item.title}</p>)}
                  {day.items.length > 2 && <p className="text-xs font-black text-blue-600">+{day.items.length - 2} more</p>}
                </div>}
              </>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

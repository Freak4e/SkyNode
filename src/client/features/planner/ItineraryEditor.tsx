import { Plus, X } from "lucide-react";
import { Button } from "../../components/ui";
import type { ItineraryDay, ItineraryItem } from "../../../shared/types.js";
import { cleanTime } from "./plannerUtils";

type ItineraryEditorProps = {
  addActivity: (dayIndex: number) => void;
  addDay: () => void;
  days: ItineraryDay[];
  removeActivity: (dayIndex: number, itemIndex: number) => void;
  updateActivity: (dayIndex: number, itemIndex: number, patch: Partial<ItineraryItem>) => void;
  updateDay: (dayIndex: number, patch: Partial<Pick<ItineraryDay, "title" | "summary">>) => void;
};

export function ItineraryEditor(props: ItineraryEditorProps) {
  return (
    <div className="space-y-4">
      {props.days.map((day, dayIndex) => (
        <div key={day.dayNumber} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_1.5fr]">
            <input value={day.title} onChange={(event) => props.updateDay(dayIndex, { title: event.target.value })} className="form-field" placeholder="Day title" />
            <input value={day.summary} onChange={(event) => props.updateDay(dayIndex, { summary: event.target.value })} className="form-field" placeholder="Day summary" />
          </div>
          <div className="mt-3 space-y-2">
            {day.items.map((item, itemIndex) => (
              <div key={`${day.dayNumber}-${itemIndex}`} className="grid gap-2 rounded-xl bg-white p-3 lg:grid-cols-[110px_1fr_1.4fr_1fr_100px_40px]">
                <input type="time" value={cleanTime(item.timeOfDay)} onChange={(event) => props.updateActivity(dayIndex, itemIndex, { timeOfDay: event.target.value })} className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-bold outline-none" />
                <input value={item.title} onChange={(event) => props.updateActivity(dayIndex, itemIndex, { title: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold outline-none" placeholder="Activity" />
                <input value={item.description} onChange={(event) => props.updateActivity(dayIndex, itemIndex, { description: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none" placeholder="Notes" />
                <input value={item.attractionName || ""} onChange={(event) => props.updateActivity(dayIndex, itemIndex, { attractionName: event.target.value })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none" placeholder="Location" />
                <input type="number" min={0} value={item.estimatedCost} onChange={(event) => props.updateActivity(dayIndex, itemIndex, { estimatedCost: Number(event.target.value || 0) })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold outline-none" placeholder="Cost" />
                <button type="button" onClick={() => props.removeActivity(dayIndex, itemIndex)} className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600"><X className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <Button type="button" tone="ghost" size="sm" onClick={() => props.addActivity(dayIndex)} className="mt-3">Add activity</Button>
        </div>
      ))}
      <Button type="button" tone="secondary" icon={<Plus className="h-4 w-4" />} onClick={props.addDay}>Add day</Button>
    </div>
  );
}

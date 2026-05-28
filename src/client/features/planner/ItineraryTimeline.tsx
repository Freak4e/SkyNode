import { Bed, Camera, Coffee, Landmark, MapPin, Music, Plus, Train, Utensils } from "lucide-react";
import { Button, Card } from "../../components/ui";
import type { ItineraryDay, ItineraryItem } from "../../../shared/types.js";
import { cleanDayTitle, cleanTime, tripDate } from "./plannerUtils";
import { ItineraryEditor } from "./ItineraryEditor";

function ActivityIcon({ item }: { item: ItineraryItem }) {
  const text = `${item.title} ${item.description} ${item.attractionName || ""}`.toLowerCase();
  const Icon = /\b(check.?in|hotel|hostel|resort|drop bags|luggage)\b/.test(text)
    ? Bed
    : /\b(train|metro|bus|ferry|airport|station|transfer|shinkansen|tram)\b/.test(text)
    ? Train
    : /\b(sushi|food|dinner|lunch|breakfast|restaurant|cafe|coffee|market|tasting|omakase)\b/.test(text)
    ? Utensils
    : /\b(bar|club|crawl|nightlife|music|jazz|cocktail)\b/.test(text)
    ? Music
    : /\b(museum|gallery|temple|cathedral|church|castle|palace|monument|shrine)\b/.test(text)
    ? Landmark
    : /\b(view|observatory|photo|camera|sunset|sky|tower|lookout)\b/.test(text)
    ? Camera
    : /\b(cafe|espresso|tea|bakery)\b/.test(text)
    ? Coffee
    : MapPin;

  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center text-blue-500">
      <Icon className="h-4 w-4" />
    </span>
  );
}

type ItineraryTimelineProps = {
  addActivity: (dayIndex: number) => void;
  addDay: () => void;
  days: ItineraryDay[];
  editing: boolean;
  removeActivity: (dayIndex: number, itemIndex: number) => void;
  startDate: string;
  updateActivity: (dayIndex: number, itemIndex: number, patch: Partial<ItineraryItem>) => void;
  updateDay: (dayIndex: number, patch: Partial<Pick<ItineraryDay, "title" | "summary">>) => void;
};

export function ItineraryTimeline(props: ItineraryTimelineProps) {
  if (props.editing) {
    return (
      <Card>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-blue-500">Edit mode</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Fine tune the itinerary</h2>
          </div>
          <Button type="button" tone="secondary" onClick={props.addDay} icon={<Plus className="h-4 w-4" />}>Add day</Button>
        </div>
        <ItineraryEditor
          days={props.days}
          addActivity={props.addActivity}
          addDay={props.addDay}
          removeActivity={props.removeActivity}
          updateActivity={props.updateActivity}
          updateDay={props.updateDay}
        />
      </Card>
    );
  }

  return (
    <section className="space-y-5">
      {props.days.map((day) => {
        const date = tripDate(props.startDate, day.dayNumber);

        return (
          <Card as="article" key={day.dayNumber} className="md:p-6">
            <div className="mb-5 flex gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-linear-to-br from-blue-500 to-cyan-400 text-sm font-black text-white">D{day.dayNumber}</div>
              <div>
                <h3 className="text-xl font-black text-slate-950 md:text-2xl">{cleanDayTitle(day.title, day.dayNumber)}</h3>
                <p className="mt-1 text-sm font-bold text-slate-500">{date.toLocaleDateString(undefined, { weekday: "short" })} - {day.items.length} activities - ${day.estimatedCost}</p>
              </div>
            </div>
            <div className="relative ml-5 space-y-3 border-l border-dashed border-blue-200 pl-5">
              {day.items.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No activities yet.</p> : day.items.map((item, itemIndex) => (
                <div key={`${day.dayNumber}-${item.timeOfDay}-${itemIndex}-${item.title}`} className="relative rounded-3xl bg-slate-50 p-4">
                  <span className="absolute -left-7.25 top-5 h-3 w-3 rounded-full border-2 border-blue-500 bg-white" />
                  <div className="grid gap-3 sm:grid-cols-[48px_1fr_auto] sm:items-start">
                    <ActivityIcon item={item} />
                    <div>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-mono text-xs font-black text-slate-500">{cleanTime(item.timeOfDay)}</span>
                        <p className="font-black text-slate-900">{item.title}</p>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-slate-500">{item.description}</p>
                      {item.attractionName && <p className="mt-2 text-xs font-bold text-blue-600">{item.attractionName}</p>}
                    </div>
                    <span className="text-sm font-black text-slate-900">{item.estimatedCost > 0 ? `$${item.estimatedCost}` : "Free"}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </section>
  );
}

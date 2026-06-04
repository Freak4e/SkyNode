import { Bed, Camera, Coffee, Landmark, MapPin, Music, Plus, Train, Utensils } from "lucide-react";
import { Button, Card } from "../../components/ui";
import type { ItineraryDay, ItineraryItem } from "../../../shared/types.js";
import { cleanDayTitle, cleanTime, tripDate } from "./plannerUtils";
import { ItineraryEditor } from "./ItineraryEditor";

const activityIconRules = [
  { pattern: /\b(check.?in|hotel|hostel|resort|drop bags|luggage)\b/, Icon: Bed },
  { pattern: /\b(train|metro|bus|ferry|airport|station|transfer|shinkansen|tram)\b/, Icon: Train },
  { pattern: /\b(sushi|food|dinner|lunch|breakfast|restaurant|cafe|coffee|market|tasting|omakase)\b/, Icon: Utensils },
  { pattern: /\b(bar|club|crawl|nightlife|music|jazz|cocktail)\b/, Icon: Music },
  { pattern: /\b(museum|gallery|temple|cathedral|church|castle|palace|monument|shrine)\b/, Icon: Landmark },
  { pattern: /\b(view|observatory|photo|camera|sunset|sky|tower|lookout)\b/, Icon: Camera },
  { pattern: /\b(cafe|espresso|tea|bakery)\b/, Icon: Coffee },
];

type ActivityIconProps = Readonly<{ item: ItineraryItem }>;
type TimelineDayProps = Readonly<{ day: ItineraryDay; startDate: string }>;
type TimelineActivityProps = Readonly<{ item: ItineraryItem }>;
type CitySectionTitleProps = Readonly<{ cityName: string }>;

function ActivityIcon({ item }: ActivityIconProps) {
  const text = `${item.title} ${item.description} ${item.attractionName || ""}`.toLowerCase();
  const Icon = activityIconRules.find((rule) => rule.pattern.test(text))?.Icon || MapPin;

  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center text-blue-500">
      <Icon className="h-4 w-4" />
    </span>
  );
}

type ItineraryTimelineProps = Readonly<{
  addActivity: (dayIndex: number) => void;
  addDay: () => void;
  boundaryCities?: string[];
  destinationName: string;
  days: ItineraryDay[];
  editing: boolean;
  moveActivity: (dayIndex: number, fromIndex: number, toIndex: number) => void;
  removeDay: (dayIndex: number) => void;
  removeActivity: (dayIndex: number, itemIndex: number) => void;
  startDate: string;
  updateActivity: (dayIndex: number, itemIndex: number, patch: Partial<ItineraryItem>) => void;
  updateDay: (dayIndex: number, patch: Partial<Pick<ItineraryDay, "cityName" | "title" | "summary">>) => void;
}>;

export function ItineraryTimeline(props: ItineraryTimelineProps) {
  const cityOptions = cityNames(props.boundaryCities, props.destinationName);
  const showCitySections = cityOptions.length > 1;

  if (props.editing) {
    return (
      <section>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-blue-500">Edit mode</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Fine tune the itinerary</h2>
          </div>
          <Button type="button" tone="secondary" onClick={props.addDay} icon={<Plus className="h-4 w-4" />}>Add day</Button>
        </div>
        <ItineraryEditor
          days={props.days}
          startDate={props.startDate}
          destinationName={props.destinationName}
          boundaryCities={props.boundaryCities}
          addActivity={props.addActivity}
          addDay={props.addDay}
          cityOptions={cityOptions}
          removeActivity={props.removeActivity}
          removeDay={props.removeDay}
          moveActivity={props.moveActivity}
          updateActivity={props.updateActivity}
          updateDay={props.updateDay}
        />
      </section>
    );
  }

  return (
    <section className="space-y-5">
      {groupDays(props.days, cityOptions, props.destinationName).map((group) => (
        <div key={group.cityName} className="space-y-5">
          {showCitySections && <CitySectionTitle cityName={group.cityName} />}
          {group.days.map(({ day }) => (
            <TimelineDay key={day.dayNumber} day={day} startDate={props.startDate} />
          ))}
        </div>
      ))}
    </section>
  );
}

function TimelineDay({ day, startDate }: TimelineDayProps) {
  const date = tripDate(startDate, day.dayNumber);

  return (
    <Card as="article" className="md:p-6">
      <div className="mb-5 flex gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-linear-to-br from-blue-500 to-cyan-400 text-sm font-black text-white">D{day.dayNumber}</div>
        <div>
          <h3 className="text-xl font-black text-slate-950 md:text-2xl">{cleanDayTitle(day.title, day.dayNumber)}</h3>
          <p className="mt-1 text-sm font-bold text-slate-500">{date.toLocaleDateString(undefined, { weekday: "short" })} - {day.items.length} activities - ${day.estimatedCost}</p>
        </div>
      </div>
      <div className="relative ml-5 space-y-3 border-l border-dashed border-blue-200 pl-6">
        {day.items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No activities yet.</p>
        ) : (
          day.items.map((item, itemIndex) => <TimelineActivity key={`${day.dayNumber}-${item.timeOfDay}-${itemIndex}-${item.title}`} item={item} />)
        )}
      </div>
    </Card>
  );
}

function TimelineActivity({ item }: TimelineActivityProps) {
  return (
    <div className="relative rounded-3xl bg-slate-50 p-4">
      <span className="absolute -left-[30.5px] top-5 h-3 w-3 rounded-full border-2 border-blue-500 bg-white" />
      <div className="grid gap-3 sm:grid-cols-[48px_1fr_auto] sm:items-start">
        <ActivityIcon item={item} />
        <div>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-mono text-xs font-black text-slate-500">{cleanTime(item.timeOfDay)}</span>
            <p className="font-black text-slate-900">{item.title}</p>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">{item.description}</p>
          <ActivityMeta item={item} />
        </div>
        <span className="text-sm font-black text-slate-900">{item.estimatedCost > 0 ? `$${item.estimatedCost}` : "Free"}</span>
      </div>
    </div>
  );
}

function ActivityMeta({ item }: TimelineActivityProps) {
  return (
    <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
      {(item.location?.name || item.attractionName) && <span className="text-blue-600">{item.location?.name || item.attractionName}</span>}
      {item.category && <span className="rounded-full bg-white px-2 py-0.5 text-slate-500 ring-1 ring-slate-200">{item.category}</span>}
    </div>
  );
}

function CitySectionTitle({ cityName }: CitySectionTitleProps) {
  return (
    <div className="flex items-center gap-4 py-2">
      <span className="h-px flex-1 bg-linear-to-r from-transparent via-blue-300/70 to-blue-500/50" />
      <h2 className="shrink-0 text-center text-2xl font-extrabold text-slate-950 md:text-3xl">
        Days in {cityName}
      </h2>
      <span className="h-px flex-1 bg-linear-to-l from-transparent via-blue-300/70 to-blue-500/50" />
    </div>
  );
}

function cityNames(boundaryCities: string[] | undefined, destinationName: string): string[] {
  const seen = new Set<string>();
  return [...(boundaryCities || []), destinationName]
    .map((city) => city.trim())
    .filter(Boolean)
    .filter((city) => {
      const key = city.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function groupDays(days: ItineraryDay[], cityOptions: string[], destinationName: string): Array<{ cityName: string; days: Array<{ day: ItineraryDay; index: number }> }> {
  const fallbackCity = cityOptions[0] || destinationName || "Trip";
  const groups = new Map<string, Array<{ day: ItineraryDay; index: number }>>();

  days.forEach((day, index) => {
    const cityName = day.cityName?.trim() || cityOptions[Math.min(index, Math.max(cityOptions.length - 1, 0))] || fallbackCity;
    if (!groups.has(cityName)) {
      groups.set(cityName, []);
    }
    groups.get(cityName)!.push({ day, index });
  });

  return Array.from(groups.entries()).map(([cityName, groupedDays]) => ({ cityName, days: groupedDays }));
}

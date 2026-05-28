import { CalendarDays, Edit3, List, Loader2, Map as MapIcon, Plus, Save, Sparkles } from "lucide-react";
import { Button, HeroPanel } from "../../components/ui";
import type { GeneratedItinerary } from "../../../shared/types.js";
import type { PlannerTab } from "./plannerTypes";
import { dateRange } from "./plannerUtils";

type PlannerHeroProps = {
  active: PlannerTab;
  cancelEdit: () => void;
  cost: number;
  days: number;
  editing: boolean;
  itinerary: GeneratedItinerary;
  saveEdits: () => void;
  saveTrip: () => void;
  saving: boolean;
  setActive: (tab: PlannerTab) => void;
  startEdit: () => void;
  startNew: () => void;
  title: string;
  travelers: number;
};

export function PlannerHero(props: PlannerHeroProps) {
  const tabs = [
    { id: "itinerary" as const, label: "Itinerary", icon: List },
    { id: "calendar" as const, label: "Calendar", icon: CalendarDays },
    { id: "map" as const, label: "Map", icon: MapIcon },
  ];

  return (
    <HeroPanel
      eyebrow={<><Sparkles className="h-3.5 w-3.5" />{props.editing ? "Editing itinerary" : "Trip dashboard"}</>}
      title={props.title}
      description={`${props.days} days - ${props.travelers} travelers - ${dateRange(props.itinerary.startDate, props.days)} - $${props.cost.toLocaleString()}`}
      actions={
        <>
          {props.editing ? (
            <>
              <Button type="button" tone="light" onClick={props.cancelEdit} className="rounded-full">Cancel</Button>
              <Button type="button" tone="ghost" onClick={props.saveEdits} disabled={props.saving} icon={props.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} className="rounded-full">Save edits</Button>
            </>
          ) : (
            <>
              <Button type="button" tone="light" onClick={props.startNew} icon={<Plus className="h-4 w-4" />} className="rounded-full">New trip</Button>
              <Button type="button" tone="ghost" onClick={props.startEdit} icon={<Edit3 className="h-4 w-4" />} className="rounded-full">Edit trip</Button>
              <Button type="button" onClick={props.saveTrip} disabled={props.saving} icon={props.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} className="rounded-full">Save trip</Button>
            </>
          )}
        </>
      }
    >
      <div className="mt-7 inline-flex rounded-full border border-white/10 bg-slate-950/40 p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" onClick={() => props.setActive(id)} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${props.active === id ? "bg-white text-slate-900" : "text-slate-300 hover:text-white"}`}>
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
    </HeroPanel>
  );
}

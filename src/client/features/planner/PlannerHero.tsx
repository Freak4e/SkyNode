import { CalendarDays, Edit3, List, Loader2, MapPin, Save, Settings2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "../../components/ui";
import { useDestinationImage } from "../../utils/destinationImage.js";
import type { GeneratedItinerary } from "../../../shared/types.js";
import type { PlannerTab } from "./plannerTypes";
import { dateRange } from "./plannerUtils";

type PlannerHeroProps = {
  active: PlannerTab;
  cancelEdit: () => void;
  cost: number;
  days: number;
  deleting?: boolean;
  editing: boolean;
  isSavedTrip?: boolean;
  itinerary: GeneratedItinerary;
  onDelete?: () => void;
  onOpenGeneral: () => void;
  onOpenSettings?: () => void;
  saveEdits: () => void;
  saveTrip: () => void;
  saving: boolean;
  setActive: (tab: PlannerTab) => void;
  showDelete?: boolean;
  startEdit: () => void;
  title: string;
  travelers: number;
};

export function PlannerHero(props: PlannerHeroProps) {
  const cityName = props.itinerary.destinationName;
  const imageUrl = useDestinationImage(cityName);
  const tabs = [
    { id: "itinerary" as const, label: "Itinerary", icon: List },
    { id: "calendar" as const, label: "Calendar", icon: CalendarDays },
  ];

  return (
    <section className="relative mb-8 overflow-hidden rounded-3xl shadow-card-strong">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={`${cityName} destination`}
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-hero-panel" />
      )}
      <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-slate-950/75 to-slate-950/35" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(59,130,246,0.22),transparent_35%)]" />

      <div className="relative p-8 text-white">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black text-slate-100 backdrop-blur">
              {props.editing ? (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Editing itinerary
                </>
              ) : (
                <>
                  <MapPin className="h-3.5 w-3.5" />
                  {cityName} · {props.isSavedTrip ? "Saved trip" : "Trip dashboard"}
                </>
              )}
            </p>
            <h1 className="text-4xl font-black leading-tight md:text-6xl">{props.title}</h1>
            <p className="mt-4 max-w-2xl text-sm font-bold leading-relaxed text-slate-200">
              {props.days} days · {props.travelers} travelers · {dateRange(props.itinerary.startDate, props.days)} · ${props.cost.toLocaleString()}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {props.editing ? (
              <>
                <Button type="button" tone="light" onClick={props.cancelEdit} className="rounded-full">Cancel</Button>
                <Button type="button" tone="ghost" onClick={props.saveEdits} disabled={props.saving} icon={props.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} className="rounded-full bg-white text-slate-900">Save edits</Button>
              </>
            ) : (
              <>
                <Button type="button" tone="light" onClick={props.onOpenGeneral} icon={<Settings2 className="h-4 w-4" />} className="rounded-full">General</Button>
                <Button type="button" tone="ghost" onClick={props.startEdit} icon={<Edit3 className="h-4 w-4" />} className="rounded-full bg-white text-slate-900">
                  {props.isSavedTrip ? "Edit itinerary" : "Edit trip"}
                </Button>
                {props.isSavedTrip && props.onOpenSettings ? (
                  <Button type="button" tone="ghost" onClick={props.onOpenSettings} icon={<Settings2 className="h-4 w-4" />} className="rounded-full bg-white text-slate-900">
                    Settings
                  </Button>
                ) : !props.isSavedTrip ? (
                  <Button type="button" onClick={props.saveTrip} disabled={props.saving} icon={props.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} className="rounded-full">
                    Save trip
                  </Button>
                ) : null}
                {props.showDelete && props.onDelete && (
                  <Button
                    type="button"
                    tone="danger"
                    onClick={props.onDelete}
                    disabled={props.deleting}
                    icon={props.deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    className="rounded-full"
                  >
                    Delete trip
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="mt-7 inline-flex rounded-full border border-white/10 bg-slate-950/40 p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => props.setActive(id)} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${props.active === id ? "bg-white text-slate-900" : "text-slate-300 hover:text-white"}`}>
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

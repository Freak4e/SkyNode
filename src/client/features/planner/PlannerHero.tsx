import { CalendarDays, Edit3, Globe2, Link2, List, Loader2, Lock, MapPin, MessageCircle, Save, Settings2, Sparkles, Trash2, Users } from "lucide-react";
import { Button } from "../../components/ui";
import type { GeneratedItinerary, TripVisibility } from "../../../shared/types.js";
import type { PlannerTab } from "./plannerTypes";
import { dateRange } from "./plannerUtils";
import { useDestinationImage } from "../../utils/destinationImage.js";

type PlannerHeroProps = Readonly<{
  active: PlannerTab;
  cancelEdit: () => void;
  cost: number;
  days: number;
  deleting?: boolean;
  editing: boolean;
  isSavedTrip?: boolean;
  itinerary: GeneratedItinerary;
  onDelete?: () => void;
  onOpenSettings: () => void;
  onVisibilityChange: (visibility: TripVisibility) => void;
  saveEdits: () => void;
  saveTrip: () => void;
  saving: boolean;
  setActive: (tab: PlannerTab) => void;
  showDelete?: boolean;
  startEdit: () => void;
  title: string;
  travelers: number;
  visibility: TripVisibility;
}>;
type HeroTabProps = Readonly<{ active: boolean; icon: typeof List; label: string; onClick: () => void }>;
type VisibilityToggleProps = Readonly<{ onChange: (visibility: TripVisibility) => void; visibility: TripVisibility }>;

export function PlannerHero(props: PlannerHeroProps) {
  const cityName = props.itinerary.destinationName;
  const imageUrl = useDestinationImage(cityName);
  const tabs = [
    { id: "itinerary" as const, label: "Itinerary", icon: List },
    { id: "calendar" as const, label: "Calendar", icon: CalendarDays },
    ...(props.isSavedTrip && props.visibility !== "private" ? [
      { id: "members" as const, label: "Members", icon: Users },
      { id: "chat" as const, label: "Chat", icon: MessageCircle },
    ] : []),
  ];

  return (
    <section className="relative mb-8 min-h-64 overflow-hidden rounded-3xl bg-hero-panel p-6 text-white shadow-card-strong sm:p-8 lg:p-10">
      {imageUrl && <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0 bg-slate-950/55" />
      <div className="absolute inset-0 bg-linear-to-r from-slate-950/80 via-slate-950/50 to-slate-950/15" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(56,189,248,0.18),transparent_32%),radial-gradient(circle_at_86%_12%,rgba(20,184,166,0.14),transparent_34%)]" />

      <div className="relative">
        <div className="grid min-h-44 items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0 max-w-3xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-slate-100">
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
            <h1 className="text-4xl font-black leading-tight text-white md:text-5xl">{props.title}</h1>
            <p className="mt-4 max-w-2xl text-sm font-bold leading-relaxed text-slate-300">
              {props.days} days · {props.travelers} travelers · {dateRange(props.itinerary.startDate, props.days)} · ${props.cost.toLocaleString()}
            </p>
          </div>
          <div className="flex w-full min-w-0 flex-wrap items-center justify-start gap-2 lg:w-auto lg:justify-end">
            {props.editing ? <EditingActions {...props} /> : <ViewActions {...props} />}
          </div>
        </div>

        <div className="mt-7 inline-flex rounded-full border border-white/10 bg-slate-950/40 p-1">
          {tabs.map((tab) => <HeroTab key={tab.id} {...tab} active={props.active === tab.id} onClick={() => props.setActive(tab.id)} />)}
        </div>
      </div>
    </section>
  );
}

function EditingActions(props: PlannerHeroProps) {
  return (
    <>
      {props.isSavedTrip && <Button type="button" tone="light" onClick={props.cancelEdit} className="rounded-full">Cancel</Button>}
      <VisibilityToggle visibility={props.visibility} onChange={props.onVisibilityChange} />
      <Button type="button" tone="ghost" onClick={props.saveEdits} disabled={props.saving} icon={props.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} className="rounded-full bg-white text-slate-900">Save edits</Button>
    </>
  );
}

function ViewActions(props: PlannerHeroProps) {
  return (
    <>
      <Button type="button" tone="light" onClick={props.onOpenSettings} icon={<Settings2 className="h-4 w-4" />} className="rounded-full">Settings</Button>
      <Button type="button" tone="ghost" onClick={props.startEdit} icon={<Edit3 className="h-4 w-4" />} className="rounded-full bg-white text-slate-900">
        {props.isSavedTrip ? "Edit itinerary" : "Edit trip"}
      </Button>
      <SaveTripAction {...props} />
      <DeleteTripAction {...props} />
    </>
  );
}

function SaveTripAction(props: PlannerHeroProps) {
  if (props.isSavedTrip) {
    return null;
  }

  return (
    <Button type="button" onClick={props.saveTrip} disabled={props.saving} icon={props.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} className="rounded-full">
      Save trip
    </Button>
  );
}

function DeleteTripAction(props: PlannerHeroProps) {
  if (!props.showDelete || !props.onDelete) {
    return null;
  }

  return (
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
  );
}

function HeroTab({ active, icon: Icon, label, onClick }: HeroTabProps) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${active ? "bg-white text-slate-900" : "text-slate-300 hover:text-white"}`}>
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function VisibilityToggle({ onChange, visibility }: VisibilityToggleProps) {
  const options = [
    { value: "private" as const, label: "Private", Icon: Lock },
    { value: "invite" as const, label: "Invite", Icon: Link2 },
    { value: "public" as const, label: "Public", Icon: Globe2 },
  ];

  return (
    <div className="inline-flex rounded-full border border-white/15 bg-slate-950/35 p-1 backdrop-blur" aria-label="Trip visibility">
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-black transition ${visibility === value ? "bg-white text-slate-950" : "text-slate-200 hover:text-white"}`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

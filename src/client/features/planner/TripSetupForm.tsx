import type { FormEvent } from "react";
import { Loader2, Plane, Sparkles } from "lucide-react";
import { Button, ButtonLink, Card, FormField, HeroPanel } from "../../components/ui";
import type { FlightOffer, ItineraryDay, ItineraryItem, TravelPace } from "../../../shared/types.js";
import { ItineraryEditor } from "./ItineraryEditor";
import { plannerInterests } from "./plannerUtils";

type TripSetupFormProps = {
  addActivity: (dayIndex: number) => void;
  addDay: () => void;
  budgetAmount: number;
  changeDays: (nextDays: number) => void;
  createManual: (event: FormEvent) => void;
  createWithAi: (event: FormEvent) => void;
  days: number;
  destinationCode: string;
  destinationName: string;
  draftDays: ItineraryDay[];
  loading: boolean;
  manual: boolean;
  originCode: string;
  pace: TravelPace;
  removeActivity: (dayIndex: number, itemIndex: number) => void;
  selectedFlight?: FlightOffer;
  selectedInterests: string[];
  setBudgetAmount: (value: number) => void;
  setDestinationName: (value: string) => void;
  setManual: (value: boolean) => void;
  setPace: (value: TravelPace) => void;
  setStartDate: (value: string) => void;
  setTravelers: (value: number) => void;
  setTripTitle: (value: string) => void;
  startDate: string;
  toggleInterest: (interest: string) => void;
  travelers: number;
  tripTitle: string;
  updateActivity: (dayIndex: number, itemIndex: number, patch: Partial<ItineraryItem>) => void;
  updateDay: (dayIndex: number, patch: Partial<Pick<ItineraryDay, "title" | "summary">>) => void;
};

function NumberField(props: { label: string; max?: number; min?: number; onChange: (value: number) => void; step?: number; value: number }) {
  return <FormField label={props.label} type="number" min={props.min} max={props.max} step={props.step} value={props.value} onValueChange={(value) => props.onChange(Number(value || 0))} />;
}

export function TripSetupForm(props: TripSetupFormProps) {
  return (
    <>
      <HeroPanel
        eyebrow={<><Sparkles className="h-3.5 w-3.5" />Trip setup</>}
        title="Create your trip plan."
        description="Set the basics once, then generate with AI or build the itinerary yourself. Editing happens after the trip exists."
      />
      <Card as="form" padding="lg" onSubmit={props.manual ? props.createManual : props.createWithAi} className="shadow-card">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_120px_150px_150px_150px]">
          <FormField label="Trip name" value={props.tripTitle} onValueChange={props.setTripTitle} placeholder={`${props.destinationName} trip`} />
          <FormField label="Destination" value={props.destinationName} onValueChange={props.setDestinationName} required />
          <NumberField label="Days" min={1} max={14} value={props.days} onChange={props.changeDays} />
          <FormField label="Start" type="date" value={props.startDate} onValueChange={props.setStartDate} required />
          <NumberField label="Travelers" min={1} max={12} value={props.travelers} onChange={props.setTravelers} />
          <NumberField label="Budget" min={0} step={50} value={props.budgetAmount} onChange={props.setBudgetAmount} />
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[220px_1fr]">
          <label>
            <span className="mb-1 block text-sm font-bold text-slate-600">Travel pace</span>
            <select value={props.pace} onChange={(event) => props.setPace(event.target.value as TravelPace)} className="form-field">
              <option value="relaxed">Relaxed</option>
              <option value="balanced">Balanced</option>
              <option value="packed">Packed</option>
            </select>
          </label>
          <div>
            <p className="mb-2 text-sm font-bold text-slate-600">Tags</p>
            <div className="flex flex-wrap gap-2">
              {plannerInterests.map((interest) => (
                <button type="button" key={interest} onClick={() => props.toggleInterest(interest)} className={`rounded-full px-3 py-2 text-xs font-black capitalize transition ${props.selectedInterests.includes(interest) ? "bg-blue-600 text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {interest}
                </button>
              ))}
            </div>
          </div>
        </div>
        <Card tone="muted" className="mt-5 rounded-2xl shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-black text-slate-900"><Plane className="h-4 w-4 text-blue-500" />Flight details</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{props.selectedFlight ? `${props.selectedFlight.carrier} - ${props.selectedFlight.departureTime} to ${props.selectedFlight.arrivalTime} - ${props.selectedFlight.priceText}` : "Optional. Add a chosen flight so the itinerary can account for timing."}</p>
            </div>
            <ButtonLink to={`/search?from=${encodeURIComponent(props.originCode)}&to=${encodeURIComponent(props.destinationCode)}&date=${encodeURIComponent(props.startDate)}`} tone="ghost" size="sm">{props.selectedFlight ? "Change flight" : "Add flight details"}</ButtonLink>
          </div>
        </Card>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" tone={!props.manual ? "secondary" : "ghost"} onClick={() => props.setManual(false)} className="rounded-full">Generate with AI</Button>
          <Button type="button" tone={props.manual ? "secondary" : "ghost"} onClick={() => props.setManual(true)} className="rounded-full">Create manually</Button>
        </div>
        {props.manual && (
          <div className="mt-5">
            <ItineraryEditor
              days={props.draftDays}
              addActivity={props.addActivity}
              addDay={props.addDay}
              removeActivity={props.removeActivity}
              updateActivity={props.updateActivity}
              updateDay={props.updateDay}
            />
          </div>
        )}
        <Button type="submit" size="lg" disabled={props.loading || (!props.manual && props.selectedInterests.length === 0)} icon={props.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} className="mt-6">
          {props.loading ? "Building itinerary..." : props.manual ? "Create trip" : "Generate itinerary"}
        </Button>
      </Card>
    </>
  );
}

import { Link } from "react-router-dom";
import { List, Loader2, MapPin, Plus, Search } from "lucide-react";
import type { SavedTripSummary } from "../../../shared/types.js";
import { dateRange } from "./plannerUtils";

type TripsDrawerProps = {
  authLoading: boolean;
  filteredTrips: SavedTripSummary[];
  loadingTripId: string;
  loadingTrips: boolean;
  onClose: () => void;
  onNewTrip: () => void;
  onSearch: (value: string) => void;
  onSelect: (tripId: string) => void;
  savedTrips: SavedTripSummary[];
  search: string;
  user: boolean;
};

export function TripsDrawer(props: TripsDrawerProps) {
  return (
    <div className="fixed inset-0 z-80 bg-slate-950/55 backdrop-blur-sm">
      <aside className="absolute right-0 top-0 h-full w-full max-w-90 overflow-y-auto bg-slate-50 p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div><h2 className="text-xl font-black text-slate-950">Your trips</h2><p className="mt-1 text-xs font-bold text-slate-500">{props.savedTrips.length} saved itineraries</p></div>
          <button type="button" onClick={props.onClose} className="text-xs font-bold text-slate-600">Close</button>
        </div>
        <label className="mb-4 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
          <Search className="h-4 w-4 text-slate-500" />
          <input value={props.search} onChange={(event) => props.onSearch(event.target.value)} placeholder="Search destinations..." className="w-full bg-transparent text-sm outline-none" />
        </label>
        {!props.user && !props.authLoading && <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500"><p className="font-black text-slate-900">Sign in to load saved trips.</p><Link to="/auth" state={{ from: "/planner" }} className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white no-underline">Sign in</Link></div>}
        {props.loadingTrips && <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-3xl bg-white" />)}</div>}
        <div className="space-y-3">
          {props.filteredTrips.map((trip) => (
            <button key={trip.id} type="button" onClick={() => props.onSelect(trip.id)} className="w-full rounded-3xl border border-slate-100 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-600 text-white">{props.loadingTripId === trip.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-5 w-5" />}</span>
                <span><span className="block font-black text-slate-950">{trip.title}</span><span className="block text-xs font-bold text-slate-500">{trip.destinationName} - {dateRange(trip.startDate, trip.days)}</span></span>
              </div>
              <div className="mt-3 flex gap-3 text-xs font-bold text-slate-500"><span>{trip.days} days</span><span className="text-slate-900">${trip.estimatedTotalCost.toLocaleString()}</span></div>
            </button>
          ))}
        </div>
        <button type="button" onClick={props.onNewTrip} className="mt-4 flex w-full items-center justify-center gap-2 rounded-3xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm font-bold text-slate-500"><Plus className="h-4 w-4" />Plan a new trip</button>
      </aside>
    </div>
  );
}

export function AllTripsButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-blue-50">
      <List className="h-4 w-4" />
      All trips
    </button>
  );
}

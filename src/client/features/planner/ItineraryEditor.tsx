import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Bed,
  Camera,
  ChevronDown,
  Coffee,
  DollarSign,
  GripVertical,
  Landmark,
  MapPin,
  Music,
  Plus,
  Search,
  Sun,
  Train,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import { Button } from "../../components/ui";
import { readApiJson } from "../../api/http.js";
import type { GeocodeResponse, ItineraryDay, ItineraryItem } from "../../../shared/types.js";
import { cleanTime, tripDate } from "./plannerUtils";

type ItineraryEditorProps = Readonly<{
  addActivity: (dayIndex: number) => void;
  addDay: () => void;
  boundaryCities?: string[];
  cityOptions: string[];
  days: ItineraryDay[];
  destinationName: string;
  moveActivity: (dayIndex: number, fromIndex: number, toIndex: number) => void;
  removeDay: (dayIndex: number) => void;
  removeActivity: (dayIndex: number, itemIndex: number) => void;
  startDate?: string;
  updateActivity: (dayIndex: number, itemIndex: number, patch: Partial<ItineraryItem>) => void;
  updateDay: (dayIndex: number, patch: Partial<Pick<ItineraryDay, "cityName" | "title" | "summary">>) => void;
}>;

type DragState = { dayIndex: number; itemIndex: number } | null;
type IconChoice = { id: string; label: string; Icon: typeof Camera };
type TagChoice = { id: string; label: string };
type LocationTarget = { dayIndex: number; itemIndex: number; item: ItineraryItem } | null;
type LocationPoint = { title: string; address: string; lat: number; lon: number; outsideBoundary?: boolean; nearestBoundaryCity?: string; distanceKm?: number };
type EditableDayProps = Readonly<ItineraryEditorProps & {
  date: Date | null;
  day: ItineraryDay;
  dayIndex: number;
  dragging: DragState;
  groupCityName: string;
  iconPicker: string | null;
  setDragging: (dragging: DragState) => void;
  setIconPicker: (key: string | null) => void;
  setLocationTarget: (target: LocationTarget) => void;
  showCitySelector: boolean;
}>;
type ActivityRowProps = Readonly<Pick<ItineraryEditorProps, "moveActivity" | "removeActivity" | "updateActivity"> & {
  day: ItineraryDay;
  dayIndex: number;
  dragging: DragState;
  iconPicker: string | null;
  item: ItineraryItem;
  itemIndex: number;
  setDragging: (dragging: DragState) => void;
  setIconPicker: (key: string | null) => void;
  setLocationTarget: (target: LocationTarget) => void;
}>;
type CitySelectProps = Readonly<{ cityName: string; cityOptions: string[]; onChange: (cityName: string) => void }>;
type EmptyDayProps = Readonly<{ onAddActivity: () => void }>;
type ActivityIconPickerProps = Readonly<ActivityRowProps & { Icon: typeof Camera; itemKey: string }>;

const iconChoices: IconChoice[] = [
  { id: "sight", label: "Sight", Icon: Camera },
  { id: "food", label: "Food", Icon: Utensils },
  { id: "coffee", label: "Cafe", Icon: Coffee },
  { id: "culture", label: "Culture", Icon: Landmark },
  { id: "nightlife", label: "Music", Icon: Music },
  { id: "hotel", label: "Hotel", Icon: Bed },
  { id: "transport", label: "Transit", Icon: Train },
];

const activityTagChoices: TagChoice[] = [
  { id: "hotel", label: "Hotel" },
  { id: "food", label: "Food" },
  { id: "transport", label: "Transport" },
  { id: "culture", label: "Culture" },
  { id: "nature", label: "Nature" },
  { id: "shopping", label: "Shopping" },
  { id: "beach", label: "Beach" },
  { id: "nightlife", label: "Nightlife" },
  { id: "free", label: "Free" },
];

export function ItineraryEditor(props: ItineraryEditorProps) {
  const [iconPicker, setIconPicker] = useState<string | null>(null);
  const [dragging, setDragging] = useState<DragState>(null);
  const [locationTarget, setLocationTarget] = useState<LocationTarget>(null);
  const showCitySelector = props.cityOptions.length > 1;
  const groupedDays = groupEditableDays(props.days, props.cityOptions, props.destinationName);

  return (
    <div className="space-y-5">
      {groupedDays.map((group) => (
        <div key={group.cityName} className="space-y-5">
          {showCitySelector && <CitySectionTitle cityName={group.cityName} />}
          {group.days.map(({ day, dayIndex }) => (
            <EditableDay
              key={day.dayNumber}
              {...props}
              date={props.startDate ? tripDate(props.startDate, day.dayNumber) : null}
              day={day}
              dayIndex={dayIndex}
              dragging={dragging}
              groupCityName={group.cityName}
              iconPicker={iconPicker}
              setDragging={setDragging}
              setIconPicker={setIconPicker}
              setLocationTarget={setLocationTarget}
              showCitySelector={showCitySelector}
            />
          ))}
        </div>
      ))}

      <Button type="button" tone="secondary" icon={<Plus className="h-4 w-4" />} onClick={props.addDay}>Add day</Button>

      {locationTarget && (
        <LocationPickerModal
          destinationName={props.destinationName}
          boundaryCities={props.boundaryCities || [props.destinationName]}
          item={locationTarget.item}
          onClose={() => setLocationTarget(null)}
          onSelect={(point) => {
            props.updateActivity(locationTarget.dayIndex, locationTarget.itemIndex, {
              attractionName: point.title,
              location: { name: point.title, address: point.address, lat: point.lat, lon: point.lon, source: "geoapify" },
            });
            setLocationTarget(null);
          }}
        />
      )}
    </div>
  );
}

function EditableDay(props: EditableDayProps) {
  const cost = props.day.items.reduce((sum, item) => sum + (Number(item.estimatedCost) || 0), 0);

  return (
    <article className="overflow-hidden rounded-3xl border border-blue-200 bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blue-600 text-lg font-black text-white">{props.day.dayNumber}</div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {props.date ? props.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : `Day ${props.day.dayNumber}`}
            </p>
            <input value={props.day.title} onChange={(event) => props.updateDay(props.dayIndex, { title: event.target.value })} className="mt-0.5 w-full bg-transparent text-lg font-black text-slate-950 outline-none" placeholder="Untitled day" />
          </div>
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-slate-800">
          {props.showCitySelector && (
            <CitySelect
              cityName={props.day.cityName || props.groupCityName}
              cityOptions={props.cityOptions}
              onChange={(cityName) => props.updateDay(props.dayIndex, { cityName })}
            />
          )}
          <span>{props.day.items.length} stops - ${cost}</span>
          <button type="button" onClick={() => props.removeDay(props.dayIndex)} className="rounded-full p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete day">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="px-5 py-5">
        {props.day.items.length === 0 ? (
          <EmptyDay onAddActivity={() => props.addActivity(props.dayIndex)} />
        ) : (
          <div className="space-y-2">
            {props.day.items.map((item, itemIndex) => (
              <ActivityRow
                key={`${props.day.dayNumber}-${itemIndex}`}
                day={props.day}
                dayIndex={props.dayIndex}
                dragging={props.dragging}
                iconPicker={props.iconPicker}
                item={item}
                itemIndex={itemIndex}
                moveActivity={props.moveActivity}
                removeActivity={props.removeActivity}
                setDragging={props.setDragging}
                setIconPicker={props.setIconPicker}
                setLocationTarget={props.setLocationTarget}
                updateActivity={props.updateActivity}
              />
            ))}
          </div>
        )}

        <button type="button" onClick={() => props.addActivity(props.dayIndex)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700">
          <Plus className="h-4 w-4" />
          Add activity
        </button>
      </div>
    </article>
  );
}

function CitySelect({ cityName, cityOptions, onChange }: CitySelectProps) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">
      <span>City</span>
      <select value={cityName} onChange={(event) => onChange(event.target.value)} className="bg-transparent text-sm font-black text-slate-950 outline-none">
        {cityOptions.map((city) => (
          <option key={city} value={city}>{city}</option>
        ))}
      </select>
    </label>
  );
}

function EmptyDay({ onAddActivity }: EmptyDayProps) {
  return (
    <div className="rounded-3xl bg-slate-50 px-6 py-12 text-center">
      <Sun className="mx-auto h-8 w-8 text-slate-400" />
      <p className="mt-3 text-sm font-black text-slate-950">This day is wide open</p>
      <p className="mt-1 text-xs font-medium text-slate-500">Add your first activity to start shaping it.</p>
      <Button type="button" size="sm" className="mt-4 rounded-xl" icon={<Plus className="h-4 w-4" />} onClick={onAddActivity}>Add first activity</Button>
    </div>
  );
}

function ActivityRow(props: ActivityRowProps) {
  const itemKey = `${props.day.dayNumber}-${props.itemIndex}`;
  const Icon = iconForItem(props.item);
  const draggingThisItem = props.dragging?.dayIndex === props.dayIndex && props.dragging.itemIndex === props.itemIndex;

  return (
    <div
      draggable
      onDragStart={() => props.setDragging({ dayIndex: props.dayIndex, itemIndex: props.itemIndex })}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => handleActivityDrop(props)}
      onDragEnd={() => props.setDragging(null)}
      className={`rounded-2xl px-3 py-3 transition ${draggingThisItem ? "bg-blue-50" : "bg-white hover:bg-slate-50"}`}
    >
      <div className="grid gap-3 md:grid-cols-[24px_44px_72px_1fr_92px_92px_40px] md:items-start">
        <button type="button" className="mt-2 cursor-grab text-slate-400 active:cursor-grabbing" aria-label="Drag activity">
          <GripVertical className="h-5 w-5" />
        </button>
        <ActivityIconPicker {...props} Icon={Icon} itemKey={itemKey} />
        <input type="time" value={cleanTime(props.item.timeOfDay)} onChange={(event) => props.updateActivity(props.dayIndex, props.itemIndex, { timeOfDay: event.target.value })} className="mt-1 bg-transparent font-mono text-sm font-black text-blue-700 outline-none" />
        <ActivityTextFields {...props} />
        <ActivityDurationField {...props} />
        <ActivityCostField {...props} />
        <button type="button" onClick={() => props.removeActivity(props.dayIndex, props.itemIndex)} className="rounded-full p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Remove activity">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function handleActivityDrop(props: ActivityRowProps): void {
  if (props.dragging?.dayIndex === props.dayIndex) {
    props.moveActivity(props.dayIndex, props.dragging.itemIndex, props.itemIndex);
  }

  props.setDragging(null);
}

function ActivityIconPicker({ Icon, dayIndex, iconPicker, itemIndex, itemKey, setIconPicker, updateActivity }: ActivityIconPickerProps) {
  return (
    <div className="relative">
      <button type="button" onClick={() => setIconPicker(iconPicker === itemKey ? null : itemKey)} className="grid h-10 w-10 place-items-center rounded-full bg-blue-100 text-blue-700" aria-label="Choose activity icon">
        <Icon className="h-4 w-4" />
      </button>
      {iconPicker === itemKey && (
        <div className="absolute left-0 top-12 z-40 grid w-44 grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
          {iconChoices.map(({ id, label, Icon: ChoiceIcon }) => (
            <button key={id} type="button" onClick={() => { updateActivity(dayIndex, itemIndex, { category: id }); setIconPicker(null); }} className="flex items-center gap-2 rounded-xl px-2 py-2 text-xs font-bold text-slate-700 hover:bg-blue-50">
              <ChoiceIcon className="h-3.5 w-3.5 text-blue-600" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityTextFields(props: ActivityRowProps) {
  return (
    <div className="min-w-0">
      <input value={props.item.title} onChange={(event) => props.updateActivity(props.dayIndex, props.itemIndex, { title: event.target.value })} className="w-full bg-transparent text-base font-black text-slate-950 outline-none placeholder:text-slate-400" placeholder="Activity title" />
      <input value={props.item.description} onChange={(event) => props.updateActivity(props.dayIndex, props.itemIndex, { description: event.target.value })} className="mt-1 w-full bg-transparent text-sm font-medium text-slate-600 outline-none placeholder:text-slate-400" placeholder="Short description" />
      <button type="button" onClick={() => props.setLocationTarget({ dayIndex: props.dayIndex, itemIndex: props.itemIndex, item: props.item })} className="mt-1 inline-flex max-w-full items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-700">
        <MapPin className="h-3.5 w-3.5" />
        <span className="truncate">{props.item.location?.name || props.item.attractionName || props.item.location?.address || "Add location"}</span>
      </button>
      <ActivityTagPicker {...props} />
    </div>
  );
}

function ActivityTagPicker(props: ActivityRowProps) {
  const selectedTags = Array.from(new Set((props.item.tags || []).map((tag) => tag.trim().toLowerCase()).filter(Boolean)));

  function toggleTag(tag: string) {
    const selecting = !selectedTags.includes(tag);
    const nextTags = selectedTags.includes(tag)
      ? selectedTags.filter((item) => item !== tag)
      : [...selectedTags, tag];

    props.updateActivity(props.dayIndex, props.itemIndex, {
      tags: nextTags,
      category: tag === "hotel" ? (selecting ? "hotel" : props.item.category === "hotel" ? undefined : props.item.category) : props.item.category,
    });
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {activityTagChoices.map((tag) => {
        const selected = selectedTags.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggleTag(tag.id)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-black transition ${
              selected
                ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                : "bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
            }`}
          >
            {tag.label}
          </button>
        );
      })}
    </div>
  );
}

function ActivityDurationField(props: ActivityRowProps) {
  return (
    <label className="flex items-center gap-1 rounded-xl bg-slate-50 px-2 py-2 text-xs font-bold text-slate-600">
      <input type="number" min={0} step={15} value={props.item.durationMinutes || 60} onChange={(event) => props.updateActivity(props.dayIndex, props.itemIndex, { durationMinutes: Number(event.target.value || 0) })} className="w-12 bg-transparent text-right outline-none" />
      <span>min</span>
    </label>
  );
}

function ActivityCostField(props: ActivityRowProps) {
  return (
    <label className="flex items-center gap-1 rounded-xl bg-slate-50 px-2 py-2 text-xs font-bold text-slate-600">
      <DollarSign className="h-3.5 w-3.5" />
      <input type="number" min={0} value={props.item.estimatedCost} onChange={(event) => props.updateActivity(props.dayIndex, props.itemIndex, { estimatedCost: Number(event.target.value || 0) })} className="w-12 bg-transparent outline-none" />
    </label>
  );
}

function CitySectionTitle({ cityName }: { cityName: string }) {
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

function groupEditableDays(days: ItineraryDay[], cityOptions: string[], destinationName: string): Array<{ cityName: string; days: Array<{ day: ItineraryDay; dayIndex: number }> }> {
  const fallbackCity = cityOptions[0] || destinationName || "Trip";
  const groups = new Map<string, Array<{ day: ItineraryDay; dayIndex: number }>>();

  days.forEach((day, dayIndex) => {
    const cityName = day.cityName?.trim() || cityOptions[Math.min(dayIndex, Math.max(cityOptions.length - 1, 0))] || fallbackCity;
    if (!groups.has(cityName)) {
      groups.set(cityName, []);
    }
    groups.get(cityName)!.push({ day, dayIndex });
  });

  return Array.from(groups.entries()).map(([cityName, groupedDays]) => ({ cityName, days: groupedDays }));
}

function iconForItem(item: ItineraryItem) {
  const category = (item.category || "").toLowerCase();
  if (category === "food") return Utensils;
  if (category === "coffee") return Coffee;
  if (category === "culture") return Landmark;
  if (category === "nightlife") return Music;
  if (category === "hotel") return Bed;
  if (category === "transport") return Train;
  return Camera;
}

function LocationPickerModal({ boundaryCities, destinationName, item, onClose, onSelect }: { boundaryCities: string[]; destinationName: string; item: ItineraryItem; onClose: () => void; onSelect: (point: LocationPoint) => void }) {
  const [query, setQuery] = useState(item.location?.name || item.attractionName || item.title);
  const [point, setPoint] = useState<LocationPoint | null>(typeof item.location?.lat === "number" && typeof item.location.lon === "number" ? {
    title: item.location.name,
    address: item.location.address || "",
    lat: item.location.lat,
    lon: item.location.lon,
  } : null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return;
    const map = L.map(mapElementRef.current, { center: point ? [point.lat, point.lon] : [46.05, 14.5], zoom: point ? 15 : 4, zoomControl: false });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);
    map.on("click", (event) => {
      setPoint({
        title: query.trim() || item.title || "Pinned location",
        address: `Pinned at ${event.latlng.lat.toFixed(5)}, ${event.latlng.lng.toFixed(5)}`,
        lat: event.latlng.lat,
        lon: event.latlng.lng,
      });
      setStatus("Pinned location from the map.");
    });
    mapRef.current = map;
    window.setTimeout(() => map.invalidateSize(), 80);
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !point) return;
    markerRef.current?.remove();
    markerRef.current = L.marker([point.lat, point.lon]).addTo(map);
    map.flyTo([point.lat, point.lon], Math.max(map.getZoom(), 15), { duration: 0.4 });
  }, [point]);

  useEffect(() => {
    if (point) return;
    void searchDestinationCenter();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function searchLocation() {
    if (!query.trim()) return;
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationName,
          allowOutsideDestination: true,
          boundaryCities,
          items: [{ id: "location", title: query, attractionName: query }],
        }),
      });
      const body = await readApiJson<GeocodeResponse>(response, "Failed to geocode location.", { points: [] });
      const next = body.points[0];
      if (next) {
        setPoint({
          title: next.title,
          address: next.address,
          lat: next.lat,
          lon: next.lon,
          outsideBoundary: next.outsideBoundary,
          nearestBoundaryCity: next.nearestBoundaryCity,
          distanceKm: next.distanceKm,
        });
        setStatus(next.outsideBoundary ? "This place is outside your trip cities, but you can still use it." : "Found a matching location.");
      } else {
        setStatus("No exact match found. Try another search or click the map to pin it manually.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function searchDestinationCenter() {
    try {
      const response = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationName,
          boundaryCities,
          items: [{ id: "destination", title: destinationName, attractionName: destinationName }],
        }),
      });
      const body = await readApiJson<GeocodeResponse>(response, "Failed to geocode destination.", { points: [] });
      const center = body.points[0];
      const map = mapRef.current;
      if (center && map) {
        map.setView([center.lat, center.lon], 12);
      }
    } catch {
      // Keep the broad default map if the destination center cannot be resolved.
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-4 sm:items-center">
      <button type="button" className="absolute inset-0" aria-label="Close location picker" onClick={onClose} />
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-lg font-black text-slate-950">Choose exact location</p>
            <p className="text-xs font-semibold text-slate-500">Search uses your existing Geoapify geocoding setup.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-[320px_1fr]">
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-black text-slate-600">Place search</span>
              <div className="flex gap-2">
                <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void searchLocation(); }} className="form-field" placeholder={`Search in ${destinationName}`} />
                <button type="button" onClick={() => void searchLocation()} className="rounded-xl bg-blue-600 px-4 text-white hover:bg-blue-700">
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </label>
            <p className="text-xs font-semibold leading-5 text-slate-500">
              Search any place. If it is outside {boundaryCities.join(", ") || destinationName}, SkyNode will warn you before you use it.
            </p>
            {loading && <p className="text-sm font-semibold text-slate-500">Searching...</p>}
            {status && <p className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">{status}</p>}
            {point && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-black text-slate-950">{point.title}</p>
                <p className="mt-1 text-sm text-slate-600">{point.address}</p>
                <p className="mt-2 text-xs font-mono text-slate-500">{point.lat.toFixed(5)}, {point.lon.toFixed(5)}</p>
                {point.outsideBoundary && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                    Outside your trip cities{point.nearestBoundaryCity ? ` - about ${point.distanceKm} km from ${point.nearestBoundaryCity}` : ""}.
                  </div>
                )}
                <Button type="button" size="sm" className="mt-4 rounded-xl" onClick={() => onSelect(point)}>Use this location</Button>
              </div>
            )}
            {!point && !loading && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                No pin selected yet.
              </div>
            )}
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            <div ref={mapElementRef} className="h-[420px]" />
            <div className="pointer-events-none absolute left-3 top-3 rounded-xl bg-white/90 px-3 py-2 text-xs font-bold text-slate-700 shadow-sm">
              Click map to place pin
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

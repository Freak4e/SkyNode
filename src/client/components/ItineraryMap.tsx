import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Maximize2, X } from "lucide-react";
import type {
  Attraction,
  GeocodeResponse,
  GeneratedItinerary,
  ItineraryDay,
  ItineraryItem,
  TripHotel,
  TripRouteSegment,
} from "../../shared/types.js";

type ItineraryMapMarker = {
  id: string;
  label: string;
  dayNumber: number;
  order: number;
  timeOfDay: ItineraryItem["timeOfDay"];
  title: string;
  description: string;
  estimatedCost: number;
  category?: string;
  attraction: Attraction;
  contextOnly?: boolean;
  routeRole?: "activity" | "hotel" | "airport";
};

type ItineraryMapPin = {
  id: string;
  label: string;
  lat: number;
  lon: number;
  markers: ItineraryMapMarker[];
};

type DayRoute = {
  dayNumber: number;
  points: Array<{ lat: number; lon: number }>;
  source: "openrouteservice" | "fallback" | "none";
};

type ItineraryMapProps = {
  itinerary: GeneratedItinerary;
  hotels?: TripHotel[];
  routeSegments?: TripRouteSegment[];
};

export function ItineraryMap({ itinerary, hotels = [], routeSegments = [] }: ItineraryMapProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [geocodedMarkers, setGeocodedMarkers] = useState<ItineraryMapMarker[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | "all">("all");
  const [routes, setRoutes] = useState<DayRoute[]>([]);
  const markerData = useMemo(() => buildItineraryMarkerData(itinerary, hotels, routeSegments), [hotels, itinerary, routeSegments]);
  const markers = useMemo(
    () => [...markerData.matchedMarkers, ...geocodedMarkers],
    [geocodedMarkers, markerData.matchedMarkers],
  );
  const pins = useMemo(() => buildMapPins(markers), [markers]);
  const dayPins = useMemo(() => buildDayPins(pins), [pins]);
  const visiblePins = useMemo(() => (
    selectedDay === "all"
      ? pins
      : pins.filter((pin) => pin.markers.some((marker) => marker.dayNumber === selectedDay))
  ), [pins, selectedDay]);
  const visibleRoutes = useMemo(() => (
    selectedDay === "all"
      ? []
      : routes.filter((route) => route.dayNumber === selectedDay)
  ), [routes, selectedDay]);

  useEffect(() => {
    if (markerData.unmappedItems.length === 0) {
      setGeocodedMarkers([]);
      return;
    }

    const controller = new AbortController();

    async function geocodeItems() {
      setGeocoding(true);

      try {
        const response = await fetch("/api/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destinationName: itinerary.destinationName,
            items: markerData.unmappedItems.map(({ id, item }) => ({
              id,
              title: item.title,
              description: item.description,
              attractionName: item.location?.name || item.attractionName,
            })),
          }),
          signal: controller.signal,
        });
        const body = await response.json() as GeocodeResponse;

        if (!response.ok) {
          throw new Error(body.warnings?.[0] || "Failed to geocode itinerary items.");
        }

        const localCenter = getLocalCenter(markerData.matchedMarkers);
        const nextGeocodedMarkers: ItineraryMapMarker[] = body.points.map((point) => {
          const source = markerData.unmappedItems.find((candidate) => candidate.id === point.id);

          return {
            id: `geocoded-${point.id}`,
            label: source ? String(source.day.dayNumber) : "G",
            dayNumber: source?.day.dayNumber || 0,
            order: source?.item.order ?? 0,
            timeOfDay: source?.item.timeOfDay || "morning",
            title: source?.item.title || point.title,
            description: source?.item.description || point.address,
            estimatedCost: source?.item.estimatedCost || 0,
            category: source?.item.category,
            attraction: {
              id: `geocoded-${point.id}`,
              name: point.title,
              category: "geocoded",
              address: point.address,
              lat: point.lat,
              lon: point.lon,
              source: "geoapify" as const,
            },
          };
        }).filter((marker) => {
          if (!localCenter) {
            return true;
          }

          return distanceMeters(localCenter, {
            lat: marker.attraction.lat!,
            lon: marker.attraction.lon!,
          }) <= 80000;
        });

        setGeocodedMarkers(nextGeocodedMarkers);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn("[itinerary-map] geocoding failed", error);
          setGeocodedMarkers([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setGeocoding(false);
        }
      }
    }

    void geocodeItems();

    return () => controller.abort();
  }, [itinerary.destinationName, markerData.unmappedItems]);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) {
      return;
    }

    const map = L.map(mapElementRef.current, {
      center: [46.05, 14.5],
      zoom: 5,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false,
    });
    mapRef.current = map;

    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    window.setTimeout(() => map.invalidateSize(), 80);
  }, [expanded]);

  useEffect(() => {
    if (dayPins.length === 0) {
      setRoutes([]);
      return;
    }

    const controller = new AbortController();

    async function loadDirections() {
      try {
        const response = await fetch("/api/directions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            days: dayPins.map((day) => ({
              dayNumber: day.dayNumber,
              points: day.pins.map((pin) => ({ lat: pin.lat, lon: pin.lon })),
            })),
          }),
          signal: controller.signal,
        });
        const body = await response.json() as { routes?: DayRoute[] };

        if (!response.ok) {
          throw new Error("Directions request failed.");
        }

        setRoutes(body.routes || []);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn("[itinerary-map] directions failed", error);
          setRoutes(dayPins.map((day) => ({
            dayNumber: day.dayNumber,
            points: day.pins.map((pin) => ({ lat: pin.lat, lon: pin.lon })),
            source: "fallback",
          })));
        }
      }
    }

    void loadDirections();
    return () => controller.abort();
  }, [dayPins]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;

    if (!map || !layer) {
      return;
    }

    layer.clearLayers();
    const bounds = L.latLngBounds([]);
    visiblePins.forEach((pin) => {
      const position: L.LatLngExpression = [pin.lat, pin.lon];
      bounds.extend(position);

      L.marker(position, {
        icon: L.divIcon({
          className: "",
          html: `
            <div class="relative flex h-10 w-10 items-center justify-center">
              <span class="absolute h-10 w-10 rounded-full bg-blue-400/25 blur-md"></span>
              <span class="relative flex h-8 w-8 items-center justify-center rounded-full border border-cyan-100 bg-blue-600 text-xs font-black text-white shadow-lg shadow-blue-500/30">
                ${escapeHtml(pin.label)}
              </span>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 36],
          popupAnchor: [0, -30],
        }),
      })
        .bindTooltip(buildPinPopupHtml(pin), {
          className: "skynode-map-tooltip",
          direction: "top",
          opacity: 1,
          sticky: true,
        })
        .addTo(layer);
    });

    visibleRoutes.forEach((route) => {
      if (route.points.length < 2) {
        return;
      }

      L.polyline(route.points.map((point) => [point.lat, point.lon] as L.LatLngExpression), {
        color: dayColor(route.dayNumber),
        weight: 3,
        opacity: 0.72,
        dashArray: route.source === "fallback" ? "8 10" : undefined,
      }).addTo(layer);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.25), { maxZoom: 15 });
    }
  }, [visiblePins, visibleRoutes]);

  return (
    <>
    {expanded && <div className="fixed inset-0 z-80 bg-slate-950/45 backdrop-blur-sm" onClick={() => setExpanded(false)} />}
    <section className={`overflow-hidden rounded-3xl bg-white shadow-xl ${
      expanded
        ? "fixed left-1/2 top-1/2 z-90 w-[min(960px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2"
        : ""
    }`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4 text-slate-900">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-500">
            <MapPin className="h-4 w-4" />
            Itinerary map
          </p>
          {geocoding && <p className="mt-1 text-sm text-slate-500">Finding coordinates...</p>}
        </div>
        <button type="button" onClick={() => setExpanded((current) => !current)} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-600" aria-label={expanded ? "Close map" : "Open map"}>
          {expanded ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>

      <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
        <div className="flex gap-2 overflow-x-auto">
          <button type="button" onClick={() => setSelectedDay("all")} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${selectedDay === "all" ? "bg-blue-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>All days</button>
          {dayPins.map((day) => (
            <button key={day.dayNumber} type="button" onClick={() => setSelectedDay(day.dayNumber)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-black ${selectedDay === day.dayNumber ? "bg-blue-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}>
              D{day.dayNumber}
            </button>
          ))}
        </div>
      </div>

      <div className={`relative ${expanded ? "h-[min(620px,calc(100vh-220px))]" : "h-[320px]"}`}>
        <div ref={mapElementRef} className="absolute inset-0 z-0 bg-slate-100" />
        {pins.length === 0 && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-white/85 p-8 text-center text-slate-900 backdrop-blur-sm">
            <div>
              <p className="text-lg font-black">Map locations need a match.</p>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                The itinerary is ready, but only specific places like restaurants, monuments, museums, venues, parks, or named attractions are mapped.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
    </>
  );
}

function buildItineraryMarkerData(itinerary: GeneratedItinerary, hotels: TripHotel[], routeSegments: TripRouteSegment[]): {
  matchedMarkers: ItineraryMapMarker[];
  unmappedItems: Array<{ id: string; day: ItineraryDay; item: ItineraryItem }>;
} {
  const attractionsWithCoordinates = itinerary.attractions.filter(
    (attraction) => typeof attraction.lat === "number" && typeof attraction.lon === "number",
  );
  const matchedMarkers: ItineraryMapMarker[] = [];
  const unmappedItems: Array<{ id: string; day: ItineraryDay; item: ItineraryItem }> = [];
  const usedKeys = new Set<string>();

  addTripContextMarkers(itinerary, hotels, routeSegments, matchedMarkers, unmappedItems);

  itinerary.days.forEach((day) => {
    day.items.forEach((item, itemIndex) => {
      const order = item.order ?? itemIndex + 1;
      const itemId = `${day.dayNumber}-${order}-${item.timeOfDay}-${normalizeSearchText(item.location?.name || item.title)}`;

      const attraction = attractionFromItemLocation(item, itemId) || findBestAttraction(item, attractionsWithCoordinates);

      if (!attraction) {
        if (shouldAttemptGeocode(item, itinerary.destinationName)) {
          unmappedItems.push({ id: itemId, day, item });
        }

        return;
      }

      const key = `${day.dayNumber}-${order}-${item.timeOfDay}-${attraction.id}`;

      if (usedKeys.has(key)) {
        return;
      }

      usedKeys.add(key);
      matchedMarkers.push({
        id: key,
        label: String(day.dayNumber),
        dayNumber: day.dayNumber,
        order,
        timeOfDay: item.timeOfDay,
        title: item.title,
        description: item.description,
        estimatedCost: item.estimatedCost,
        category: item.category,
        attraction,
      });
    });
  });

  return { matchedMarkers, unmappedItems };
}

function addTripContextMarkers(
  itinerary: GeneratedItinerary,
  hotels: TripHotel[],
  routeSegments: TripRouteSegment[],
  matchedMarkers: ItineraryMapMarker[],
  unmappedItems: Array<{ id: string; day: ItineraryDay; item: ItineraryItem }>,
) {
  const firstDay = itinerary.days[0];
  const lastDay = itinerary.days[itinerary.days.length - 1];

  if (!firstDay) {
    return;
  }

  hotels.forEach((hotel) => {
    const item: ItineraryItem = {
      order: -10,
      timeOfDay: "08:00",
      title: hotel.name,
      description: "Hotel base for this trip.",
      attractionName: hotel.location?.name || hotel.name,
      category: "hotel",
      location: hotel.location || { name: hotel.name, address: hotel.address, city: hotel.cityName },
      estimatedCost: hotel.priceEstimate || 0,
    };

    itinerary.days.forEach((day) => addContextMarker(`hotel-${hotel.id}-day-${day.dayNumber}`, day, item, "hotel", matchedMarkers, unmappedItems));
  });

  routeSegments.forEach((segment, index) => {
    const targetDay = index === 0 ? firstDay : lastDay || firstDay;

    if (segment.fromLocation && index > 0) {
      addContextMarker(`segment-${segment.id}-from`, targetDay, {
        order: -20,
        timeOfDay: "07:00",
        title: segment.from,
        description: `${segment.type} departure point.`,
        category: segment.type === "flight" ? "airport" : "transport",
        location: segment.fromLocation,
        estimatedCost: 0,
      }, "airport", matchedMarkers, unmappedItems);
    }

    if (segment.toLocation) {
      const isReturnOrLaterArrival = segment.type === "flight" && index > 0 && index === routeSegments.length - 1;

      addContextMarker(`segment-${segment.id}-to`, targetDay, {
        order: isReturnOrLaterArrival ? 999 : -15,
        timeOfDay: isReturnOrLaterArrival ? "22:00" : "08:30",
        title: segment.to,
        description: `${segment.type} arrival point.`,
        category: segment.type === "flight" ? "airport" : "transport",
        location: segment.toLocation,
        estimatedCost: 0,
      }, "airport", matchedMarkers, unmappedItems);
    }
  });
}

function addContextMarker(
  id: string,
  day: ItineraryDay,
  item: ItineraryItem,
  routeRole: ItineraryMapMarker["routeRole"],
  matchedMarkers: ItineraryMapMarker[],
  unmappedItems: Array<{ id: string; day: ItineraryDay; item: ItineraryItem }>,
) {
  const location = item.location;

  if (typeof location?.lat === "number" && typeof location.lon === "number") {
    matchedMarkers.push({
      id,
      label: String(day.dayNumber),
      dayNumber: day.dayNumber,
      order: item.order ?? 0,
      timeOfDay: item.timeOfDay,
      title: item.title,
      description: item.description,
      estimatedCost: item.estimatedCost,
      category: item.category,
      contextOnly: true,
      routeRole,
      attraction: {
        id,
        name: location.name,
        category: item.category || routeRole || "place",
        address: location.address || "",
        lat: location.lat,
        lon: location.lon,
        source: location.source === "geoapify" ? "geoapify" : "mock",
      },
    });
    return;
  }

  unmappedItems.push({ id, day, item });
}

function attractionFromItemLocation(item: ItineraryItem, id: string): Attraction | undefined {
  const location = item.location;

  if (typeof location?.lat !== "number" || typeof location.lon !== "number") {
    return undefined;
  }

  return {
    id,
    name: location.name,
    category: item.category || "place",
    address: location.address || location.city || "",
    lat: location.lat,
    lon: location.lon,
    source: location.source === "geoapify" ? "geoapify" : "mock",
  };
}

function findBestAttraction(item: ItineraryItem, attractions: Attraction[]): Attraction | undefined {
  const itemTerms = [
    normalizeSearchText(item.attractionName || ""),
    normalizeSearchText(item.location?.name || ""),
    normalizeSearchText(item.title),
    normalizeSearchText(item.description),
  ].filter(Boolean);

  return attractions.find((attraction) => {
    const attractionName = normalizeSearchText(attraction.name);

    return itemTerms.some((term) => term.includes(attractionName) || attractionName.includes(term));
  });
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shouldAttemptGeocode(item: ItineraryItem, destinationName: string): boolean {
  const attractionName = normalizeSearchText(item.attractionName || "");
  const locationName = normalizeSearchText(item.location?.name || "");
  const destination = normalizeSearchText(destinationName);
  const itemText = normalizeSearchText(`${item.title} ${item.description} ${item.attractionName || ""} ${item.location?.name || ""}`);
  const hasSpecificAttraction = (attractionName.length > 2 && attractionName !== destination) || (locationName.length > 2 && locationName !== destination);
  const mappableSight = /\b(theater|theatre|museum|gallery|monument|memorial|statue|castle|fortress|cathedral|church|mosque|temple|bridge|square|park|garden|viewpoint|beach|harbor|harbour|port|waterfront|promenade)\b/.test(itemText);
  const genericMovement = /\b(walk|walking|stroll|wander|explore|relax|picnic|free time|leisure|by the lake|along the lake)\b/.test(itemText);

  if (hasSpecificAttraction) {
    return true;
  }

  if (genericMovement && !/\b(museum|monument|statue|castle|cathedral|church)\b/.test(itemText)) {
    return false;
  }

  return mappableSight;
}

function isFoodRelatedItem(item: ItineraryItem): boolean {
  const itemText = normalizeSearchText(`${item.title} ${item.description} ${item.attractionName || ""} ${item.location?.name || ""}`);

  return /\b(dinner|lunch|breakfast|brunch|restaurant|cafe|coffee|bar|bistro|tavern|food|meal|eat|eating|tasting|winery|wine|beer|cocktail|bakery|street food|snack|market food)\b/.test(itemText);
}

function buildMapPins(markers: ItineraryMapMarker[]): ItineraryMapPin[] {
  const groups = new Map<string, ItineraryMapMarker[]>();

  markers.forEach((marker) => {
    const key = `${marker.attraction.lat!.toFixed(5)},${marker.attraction.lon!.toFixed(5)}`;
    const group = groups.get(key) || [];
    group.push(marker);
    groups.set(key, group);
  });

  return Array.from(groups.entries()).map(([key, groupedMarkers]) => {
    const [lat, lon] = key.split(",").map(Number);

    return {
      id: key,
      label: groupedMarkers.length > 1 ? String(groupedMarkers.length) : groupedMarkers[0].label,
      lat,
      lon,
      markers: groupedMarkers,
    };
  });
}

function buildDayPins(pins: ItineraryMapPin[]): Array<{ dayNumber: number; pins: ItineraryMapPin[] }> {
  const groups = new Map<number, ItineraryMapPin[]>();

  pins.forEach((pin) => {
    const days = Array.from(new Set(pin.markers.map((marker) => marker.dayNumber))).sort((first, second) => first - second);

    days.forEach((dayNumber) => {
      const group = groups.get(dayNumber) || [];
      group.push(pin);
      groups.set(dayNumber, group);
    });
  });

  return Array.from(groups.entries()).map(([dayNumber, groupedPins]) => ({
    dayNumber,
    pins: groupedPins.sort((first, second) => {
      const firstMarker = first.markers.find((marker) => marker.dayNumber === dayNumber);
      const secondMarker = second.markers.find((marker) => marker.dayNumber === dayNumber);
      const firstOrder = firstMarker?.order ?? Number.MAX_SAFE_INTEGER;
      const secondOrder = secondMarker?.order ?? Number.MAX_SAFE_INTEGER;

      if (firstOrder !== secondOrder) {
        return firstOrder - secondOrder;
      }

      return normalizeTimeForSort(firstMarker?.timeOfDay).localeCompare(normalizeTimeForSort(secondMarker?.timeOfDay));
    }),
  })).sort((first, second) => first.dayNumber - second.dayNumber);
}

function normalizeTimeForSort(value?: string): string {
  if (!value) {
    return "99:99";
  }

  if (/^\d{1,2}:\d{2}$/.test(value)) {
    return value.padStart(5, "0");
  }

  const buckets: Record<string, string> = {
    morning: "08:00",
    noon: "12:00",
    afternoon: "15:00",
    evening: "19:00",
    night: "22:00",
  };

  return buckets[value.toLowerCase()] || value;
}

function dayColor(dayNumber: number): string {
  const colors = ["#2563eb", "#0891b2", "#7c3aed", "#059669", "#ea580c", "#dc2626"];
  return colors[(dayNumber - 1) % colors.length];
}

function getLocalCenter(markers: ItineraryMapMarker[]): { lat: number; lon: number } | undefined {
  if (markers.length === 0) {
    return undefined;
  }

  return {
    lat: markers.reduce((total, marker) => total + marker.attraction.lat!, 0) / markers.length,
    lon: markers.reduce((total, marker) => total + marker.attraction.lon!, 0) / markers.length,
  };
}

function distanceMeters(
  first: { lat: number; lon: number },
  second: { lat: number; lon: number },
): number {
  const earthRadiusMeters = 6371000;
  const lat1 = toRadians(first.lat);
  const lat2 = toRadians(second.lat);
  const deltaLat = toRadians(second.lat - first.lat);
  const deltaLon = toRadians(second.lon - first.lon);
  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const angularDistance = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return earthRadiusMeters * angularDistance;
}

function toRadians(value: number): number {
  return value * Math.PI / 180;
}

function buildPinPopupHtml(pin: ItineraryMapPin): string {
  if (pin.markers.length === 1) {
    return buildMarkerPopupHtml(pin.markers[0]);
  }

  const items = pin.markers.map((marker) => `
    <li style="margin: 8px 0">
      <strong>${escapeHtml(marker.title)}</strong><br />
      <span>Day ${marker.dayNumber} - ${escapeHtml(marker.timeOfDay)}</span>
    </li>
  `).join("");

  return `
    <div style="min-width: 230px">
      <strong>${pin.markers.length} activities here</strong>
      <ul style="margin: 8px 0 0; padding-left: 18px">${items}</ul>
    </div>
  `;
}

function buildMarkerPopupHtml(marker: ItineraryMapMarker): string {
  return `
    <div style="min-width: 220px">
      <strong>${escapeHtml(marker.title)}</strong><br />
      <span>Day ${marker.dayNumber} - ${escapeHtml(marker.timeOfDay)}</span><br />
      <span>${escapeHtml(marker.attraction.name)}</span><br />
      <span>Estimated cost: $${marker.estimatedCost}</span>
      <p style="margin: 8px 0 0; line-height: 1.4">${escapeHtml(marker.description)}</p>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

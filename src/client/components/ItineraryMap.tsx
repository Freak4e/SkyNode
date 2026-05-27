import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin } from "lucide-react";
import type {
  Attraction,
  GeocodeResponse,
  GeneratedItinerary,
  ItineraryDay,
  ItineraryItem,
} from "../../shared/types.js";

type ItineraryMapMarker = {
  id: string;
  label: string;
  dayNumber: number;
  timeOfDay: ItineraryItem["timeOfDay"];
  title: string;
  description: string;
  estimatedCost: number;
  attraction: Attraction;
  contextOnly?: boolean;
};

type ItineraryMapPin = {
  id: string;
  label: string;
  lat: number;
  lon: number;
  markers: ItineraryMapMarker[];
};

type ItineraryMapProps = {
  itinerary: GeneratedItinerary;
};

export function ItineraryMap({ itinerary }: ItineraryMapProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [geocodedMarkers, setGeocodedMarkers] = useState<ItineraryMapMarker[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const markerData = useMemo(() => buildItineraryMarkerData(itinerary), [itinerary]);
  const markers = useMemo(
    () => [...markerData.matchedMarkers, ...geocodedMarkers],
    [geocodedMarkers, markerData.matchedMarkers],
  );
  const pins = useMemo(() => buildMapPins(markers), [markers]);

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
              attractionName: item.attractionName,
            })),
          }),
          signal: controller.signal,
        });
        const body = await response.json() as GeocodeResponse;

        if (!response.ok) {
          throw new Error(body.warnings?.[0] || "Failed to geocode itinerary items.");
        }

        const localCenter = getLocalCenter(markerData.matchedMarkers);
        const nextGeocodedMarkers = body.points.map((point) => {
          const source = markerData.unmappedItems.find((candidate) => candidate.id === point.id);

          return {
            id: `geocoded-${point.id}`,
            label: source ? String(source.day.dayNumber) : "G",
            dayNumber: source?.day.dayNumber || 0,
            timeOfDay: source?.item.timeOfDay || "morning",
            title: source?.item.title || point.title,
            description: source?.item.description || point.address,
            estimatedCost: source?.item.estimatedCost || 0,
            attraction: {
              id: `geocoded-${point.id}`,
              name: point.title,
              category: "geocoded",
              address: point.address,
              lat: point.lat,
              lon: point.lon,
              source: "geoapify",
            },
          };
        }).filter((marker) => {
          if (!localCenter) {
            return true;
          }

          return distanceMeters(localCenter, {
            lat: marker.attraction.lat!,
            lon: marker.attraction.lon!,
          }) <= 30000;
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
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
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
    const layer = markersLayerRef.current;

    if (!map || !layer) {
      return;
    }

    layer.clearLayers();
    const bounds = L.latLngBounds([]);

    pins.forEach((pin) => {
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
        .bindPopup(buildPinPopupHtml(pin))
        .addTo(layer);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.25), { maxZoom: 15 });
    }
  }, [pins]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-950 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-950 px-5 py-4 text-white">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-cyan-200">
            <MapPin className="h-4 w-4" />
            Itinerary map
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {pins.length > 0
              ? `${pins.length} map pins for ${markers.length} mapped activities.`
              : "No mappable itinerary activities were resolved yet."}
            {geocoding ? " Finding more coordinates..." : ""}
          </p>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-cyan-100">
          {itinerary.destinationName}
        </span>
      </div>

      <div className="relative h-[360px]">
        <div ref={mapElementRef} className="absolute inset-0 z-0 bg-slate-900" />
        {pins.length === 0 && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-slate-950/80 p-8 text-center text-white">
            <div>
              <p className="text-lg font-black">Map locations need a match.</p>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-300">
                The itinerary is ready, but only specific places like restaurants, monuments, museums, venues, parks, or named attractions are mapped.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function buildItineraryMarkerData(itinerary: GeneratedItinerary): {
  matchedMarkers: ItineraryMapMarker[];
  unmappedItems: Array<{ id: string; day: ItineraryDay; item: ItineraryItem }>;
} {
  const attractionsWithCoordinates = itinerary.attractions.filter(
    (attraction) => typeof attraction.lat === "number" && typeof attraction.lon === "number",
  );
  const matchedMarkers: ItineraryMapMarker[] = [];
  const unmappedItems: Array<{ id: string; day: ItineraryDay; item: ItineraryItem }> = [];
  const usedKeys = new Set<string>();

  itinerary.days.forEach((day) => {
    day.items.forEach((item) => {
      const itemId = `${day.dayNumber}-${item.timeOfDay}-${normalizeSearchText(item.title)}`;

      if (isFoodRelatedItem(item)) {
        return;
      }

      const attraction = findBestAttraction(item, attractionsWithCoordinates);

      if (!attraction) {
        if (shouldAttemptGeocode(item, itinerary.destinationName)) {
          unmappedItems.push({ id: itemId, day, item });
        }

        return;
      }

      const key = `${day.dayNumber}-${item.timeOfDay}-${attraction.id}`;

      if (usedKeys.has(key)) {
        return;
      }

      usedKeys.add(key);
      matchedMarkers.push({
        id: key,
        label: String(day.dayNumber),
        dayNumber: day.dayNumber,
        timeOfDay: item.timeOfDay,
        title: item.title,
        description: item.description,
        estimatedCost: item.estimatedCost,
        attraction,
      });
    });
  });

  return { matchedMarkers, unmappedItems };
}

function findBestAttraction(item: ItineraryItem, attractions: Attraction[]): Attraction | undefined {
  const itemTerms = [
    normalizeSearchText(item.attractionName || ""),
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
  const destination = normalizeSearchText(destinationName);
  const itemText = normalizeSearchText(`${item.title} ${item.description} ${item.attractionName || ""}`);
  const hasSpecificAttraction = attractionName.length > 2 && attractionName !== destination;
  const mappableSight = /\b(theater|theatre|museum|gallery|monument|memorial|statue|castle|fortress|cathedral|church|mosque|temple|bridge|square|park|garden|viewpoint|beach|harbor|harbour|port|waterfront|promenade)\b/.test(itemText);
  const genericMovement = /\b(walk|walking|stroll|wander|explore|relax|picnic|free time|leisure|by the lake|along the lake)\b/.test(itemText);

  if (isFoodRelatedItem(item)) {
    return false;
  }

  if (hasSpecificAttraction) {
    return true;
  }

  if (genericMovement && !/\b(museum|monument|statue|castle|cathedral|church)\b/.test(itemText)) {
    return false;
  }

  return mappableSight;
}

function isFoodRelatedItem(item: ItineraryItem): boolean {
  const itemText = normalizeSearchText(`${item.title} ${item.description} ${item.attractionName || ""}`);

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

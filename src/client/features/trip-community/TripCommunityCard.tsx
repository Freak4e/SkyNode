import type { ReactNode } from "react";
import { CalendarDays, CircleDollarSign, MapPin, Tags, UserRound } from "lucide-react";
import type { SavedTripSummary } from "../../../shared/types.js";
import { tripDisplayCity, useDestinationImage } from "../../utils/destinationImage.js";
import { ButtonLink, Card } from "../../components/ui.js";
import { TripVisibilityBadge } from "./TripVisibilityBadge.js";

type Props = {
  trip: SavedTripSummary;
  actionLabel?: string;
  actionTo?: string;
  footer?: ReactNode;
  showOwner?: boolean;
  showImage?: boolean;
};

export function TripCommunityCard({
  trip,
  actionLabel = "View trip",
  actionTo,
  footer,
  showOwner = false,
  showImage = true,
}: Props) {
  const spotsLeft = Math.max(0, (trip.maxMembers || 8) - (trip.memberCount || 1));
  const cityName = tripDisplayCity(trip);
  const imageUrl = useDestinationImage(cityName);
  const routeLabel = trip.cities?.length
    ? trip.cities.map((city) => city.name).join(" -> ")
    : cityName;

  return (
    <Card as="article" padding="none" className="flex h-full flex-col overflow-hidden">
      {showImage && (
        <div className="relative h-36 overflow-hidden border-b border-slate-100">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`${cityName} destination`}
              className="h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="h-full bg-linear-to-br from-blue-600 via-blue-500 to-cyan-400" />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-blue-100">{cityName}</p>
              <p className="text-lg font-black text-white">{trip.days} days</p>
            </div>
            {trip.visibility && <TripVisibilityBadge visibility={trip.visibility} className="bg-white/90 backdrop-blur" />}
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {!showImage && (
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="text-xs font-black uppercase tracking-widest text-blue-500">{cityName}</p>
                {trip.visibility && <TripVisibilityBadge visibility={trip.visibility} />}
              </div>
            )}
            <h2 className="text-xl font-black text-slate-950">{trip.title}</h2>
            {trip.description && <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-500">{trip.description}</p>}
          </div>
          {!showImage && (
            <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-600">
              {trip.days} days
            </span>
          )}
        </div>

        {showOwner && trip.ownerName && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2">
            {trip.ownerAvatar ? (
              <img src={trip.ownerAvatar} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-white">
                <UserRound className="h-4 w-4" />
              </span>
            )}
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Hosted by</p>
              <p className="text-sm font-black text-slate-900">{trip.ownerName}</p>
            </div>
            <span className="ml-auto rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
              {spotsLeft} spots left
            </span>
          </div>
        )}

        <div className="space-y-2 text-sm font-bold text-slate-500">
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-blue-500" />
            <span className="truncate">{routeLabel}</span>
          </p>
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-blue-500" />
            {trip.startDate}
          </p>
          <p className="flex items-center gap-2">
            <CircleDollarSign className="h-4 w-4 shrink-0 text-blue-500" />
            ${trip.estimatedTotalCost.toLocaleString()} estimate
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[trip.budget, trip.pace, ...(trip.tags?.length ? trip.tags : trip.interests)].slice(0, 5).map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-black capitalize text-slate-600">
              <Tags className="h-3 w-3" />
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-5">
          {footer || (actionTo && (
            <ButtonLink to={actionTo} tone="secondary" size="lg" className="w-full">{actionLabel}</ButtonLink>
          ))}
        </div>
      </div>
    </Card>
  );
}

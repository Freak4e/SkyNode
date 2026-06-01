import type { ReactNode } from "react";
import { MapPin } from "lucide-react";
import { useDestinationImage, tripDisplayCity } from "../../utils/destinationImage.js";
import type { SavedTripSummary } from "../../../shared/types.js";

type Props = {
  trip: SavedTripSummary;
  eyebrow: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
};

export function TripRoomHero({ trip, eyebrow, title, description, actions, children }: Props) {
  const cityName = tripDisplayCity(trip);
  const imageUrl = useDestinationImage(cityName);

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
            {eyebrow && (
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black text-slate-100 backdrop-blur">
                <MapPin className="h-3.5 w-3.5" />
                {eyebrow}
              </p>
            )}
            <h1 className="text-3xl font-black leading-tight md:text-4xl">{title}</h1>
            {description && <p className="mt-4 max-w-2xl text-sm font-bold leading-relaxed text-slate-200">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </section>
  );
}

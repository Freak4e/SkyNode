import type { ReactNode } from "react";
import { MapPin } from "lucide-react";
import { tripDisplayCity, useDestinationImage } from "../../utils/destinationImage.js";
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
    <section className="relative mb-8 min-h-64 overflow-hidden rounded-3xl bg-hero-panel p-6 text-white shadow-card-strong sm:p-8 lg:p-10">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={`${cityName} destination`}
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      )}
      <div className={`absolute inset-0 ${imageUrl ? "bg-linear-to-t from-slate-950 via-slate-950/76 to-slate-950/35" : "bg-hero-panel"}`} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(56,189,248,0.22),transparent_32%),radial-gradient(circle_at_86%_12%,rgba(20,184,166,0.16),transparent_34%)]" />

      <div className="relative">
        <div className="grid min-h-44 items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0 max-w-3xl">
            {eyebrow && (
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-slate-100">
                <MapPin className="h-3.5 w-3.5" />
                {eyebrow}
              </p>
            )}
            <h1 className="text-4xl font-black leading-tight text-white md:text-5xl">{title}</h1>
            {description && <p className="mt-4 max-w-2xl text-sm font-bold leading-relaxed text-slate-300">{description}</p>}
          </div>
          {actions && <div className="flex w-full min-w-0 flex-wrap items-center justify-start gap-2 lg:w-auto lg:justify-end">{actions}</div>}
        </div>
        {children}
      </div>
    </section>
  );
}

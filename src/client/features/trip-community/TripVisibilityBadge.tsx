import { Globe2, Link2, Lock } from "lucide-react";
import type { TripVisibility } from "../../../shared/types.js";
import { visibilityLabels } from "../../api/tripsApi.js";

const styles: Record<TripVisibility, { className: string; icon: typeof Lock }> = {
  private: {
    className: "bg-slate-100 text-slate-600 ring-slate-200",
    icon: Lock,
  },
  invite: {
    className: "bg-violet-50 text-violet-700 ring-violet-200",
    icon: Link2,
  },
  public: {
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    icon: Globe2,
  },
};

type Props = {
  visibility: TripVisibility;
  className?: string;
};

export function TripVisibilityBadge({ visibility, className = "" }: Props) {
  const style = styles[visibility];
  const Icon = style.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ring-1 ${style.className} ${className}`}>
      <Icon className="h-3.5 w-3.5" />
      {visibilityLabels[visibility]}
    </span>
  );
}

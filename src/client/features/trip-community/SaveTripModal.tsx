import { useEffect, useState } from "react";
import { Globe2, Link2, Lock, Users, X } from "lucide-react";
import type { TripVisibility } from "../../../shared/types.js";
import { visibilityDescriptions, visibilityLabels } from "../../api/tripsApi.js";
import { Button } from "../../components/ui.js";

const options: Array<{ id: TripVisibility; icon: typeof Lock }> = [
  { id: "private", icon: Lock },
  { id: "invite", icon: Link2 },
  { id: "public", icon: Globe2 },
];

type Props = {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onConfirm: (values: { visibility: TripVisibility; description: string; maxMembers: number }) => void;
};

export function SaveTripModal({ open, saving, onClose, onConfirm }: Props) {
  const [visibility, setVisibility] = useState<TripVisibility>("private");
  const [description, setDescription] = useState("");
  const [maxMembers, setMaxMembers] = useState(6);

  useEffect(() => {
    if (!open) {
      return;
    }

    setVisibility("private");
    setDescription("");
    setMaxMembers(6);
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 p-4 sm:items-center">
      <button type="button" className="absolute inset-0" aria-label="Close save trip dialog" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-500">Save trip</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Who can join this trip?</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">Choose visibility before saving to your account.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="grid gap-3">
            {options.map(({ id, icon: Icon }) => {
              const active = visibility === id;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setVisibility(id)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-blue-300 bg-blue-50 shadow-sm shadow-blue-100"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-black text-slate-950">{visibilityLabels[id]}</span>
                      <span className="mt-1 block text-sm font-semibold text-slate-500">{visibilityDescriptions[id]}</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-slate-600">Short description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              maxLength={280}
              placeholder="Tell travelers what this trip is about..."
              className="form-field min-h-[96px] resize-y"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 flex items-center gap-2 text-sm font-bold text-slate-600">
              <Users className="h-4 w-4 text-blue-500" />
              Max travelers
            </span>
            <input
              type="number"
              min={2}
              max={20}
              value={maxMembers}
              onChange={(event) => setMaxMembers(Number(event.target.value) || 2)}
              className="form-field"
            />
          </label>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <Button type="button" tone="ghost" onClick={onClose}>Cancel</Button>
          <Button type="button" disabled={saving} onClick={() => onConfirm({ visibility, description: description.trim(), maxMembers })}>
            {saving ? "Saving..." : "Save trip"}
          </Button>
        </div>
      </div>
    </div>
  );
}

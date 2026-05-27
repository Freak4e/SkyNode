import { FormEvent, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Loader2,
  MapPin,
  Plane,
  Save,
  Sparkles,
} from "lucide-react";
import { generateItinerary, saveTrip } from "../api/plannerApi";
import { useAuth } from "../auth/AuthContext";
import { Footer } from "../components/Footer";
import { ItineraryMap } from "../components/ItineraryMap";
import { Navbar } from "../components/Navbar";
import type {
  BudgetLevel,
  FlightOffer,
  GenerateItineraryRequest,
  GeneratedItinerary,
  TravelPace,
} from "../../shared/types.js";

const interests = ["culture", "food", "nature", "nightlife", "museums", "shopping", "relaxing", "hidden gems"];
const today = new Date().toISOString().slice(0, 10);

function clampDays(value: number): number {
  return Math.min(Math.max(value, 1), 10);
}

type CustomItineraryEditorProps = {
  onCreate: (it: GeneratedItinerary) => void;
};

function CustomItineraryEditor({ onCreate }: CustomItineraryEditorProps) {
  const [title, setTitle] = useState("My custom trip");
  const [numDays, setNumDays] = useState(1);
  const [daysData, setDaysData] = useState<ItineraryDay[]>([
    { dayNumber: 1, title: "Day 1", summary: "", estimatedCost: 0, items: [] },
  ]);

  function addDay() {
    const next = daysData.length + 1;
    setDaysData([...daysData, { dayNumber: next, title: `Day ${next}`, summary: "", estimatedCost: 0, items: [] }]);
    setNumDays(next);
  }

  function addItemToDay(dayIndex: number) {
    const copy = [...daysData];
    copy[dayIndex].items.push({ timeOfDay: "morning", title: "New activity", description: "", estimatedCost: 0 });
    setDaysData(copy);
  }

  function updateItem(dayIndex: number, itemIndex: number, key: keyof ItineraryItem, value: any) {
    const copy = [...daysData];
    // @ts-ignore
    copy[dayIndex].items[itemIndex][key] = value;
    // recompute cost
    copy[dayIndex].estimatedCost = copy[dayIndex].items.reduce((s, it) => s + (it.estimatedCost || 0), 0);
    setDaysData(copy);
  }

  function create() {
    const estimatedTotalCost = daysData.reduce((s, d) => s + (d.estimatedCost || 0), 0);
    const it: GeneratedItinerary = {
      destinationName: "",
      startDate: new Date().toISOString().slice(0, 10),
      days: daysData,
      attractions: [],
      estimatedTotalCost,
      generationMode: "ollama",
    };

    onCreate(it);
  }

  return (
    <div className="space-y-3">
      <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded border px-3 py-2" placeholder="Trip title" />
      <div className="flex gap-2">
        <button type="button" onClick={addDay} className="rounded-full bg-slate-100 px-3 py-1 font-black">Add day</button>
        <button type="button" onClick={() => setDaysData([{ dayNumber: 1, title: "Day 1", summary: "", estimatedCost: 0, items: [] }])} className="rounded-full bg-white px-3 py-1">Reset</button>
      </div>
      <div className="space-y-2">
        {daysData.map((d, di) => (
          <div key={d.dayNumber} className="rounded border p-2">
            <input value={d.title} onChange={(e) => { const copy = [...daysData]; copy[di].title = e.target.value; setDaysData(copy); }} className="w-full font-bold mb-1" />
            <input value={d.summary} onChange={(e) => { const copy = [...daysData]; copy[di].summary = e.target.value; setDaysData(copy); }} placeholder="Summary" className="w-full mb-2" />
            <div className="space-y-1">
              {d.items.map((it, ii) => (
                <div key={ii} className="grid grid-cols-3 gap-2">
                  <select value={it.timeOfDay} onChange={(e) => updateItem(di, ii, 'timeOfDay', e.target.value)}>
                    <option value="morning">morning</option>
                    <option value="afternoon">afternoon</option>
                    <option value="evening">evening</option>
                  </select>
                  <input value={it.title} onChange={(e) => updateItem(di, ii, 'title', e.target.value)} placeholder="Activity" />
                  <input type="number" value={it.estimatedCost} onChange={(e) => updateItem(di, ii, 'estimatedCost', Number(e.target.value || 0))} className="w-24" />
                </div>
              ))}
              <div className="mt-2">
                <button type="button" onClick={() => addItemToDay(di)} className="rounded-full bg-slate-100 px-3 py-1">Add activity</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div>
        <button type="button" onClick={create} className="rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 px-4 py-2 text-white font-black">Create itinerary</button>
      </div>
    </div>
  );
}

function CalendarView({ itinerary }: { itinerary: GeneratedItinerary }) {
  const start = new Date(itinerary.startDate);
  const days = itinerary.days;

  // Build a simple list of dates for the trip period
  const dates = days.map((d) => {
    const date = new Date(start);
    date.setDate(start.getDate() + (d.dayNumber - 1));
    return { date, day: d };
  });

  return (
    <div>
      <div className="grid grid-cols-7 gap-2">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((h) => (
          <div key={h} className="text-xs font-bold text-slate-500">{h}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2 mt-2">
        {/* Fill up to the first week day */}
        {Array.from({ length: new Date(start.getFullYear(), start.getMonth(), 1).getDay() }).map((_, i) => (
          <div key={`pad-${i}`} className="h-20 rounded border bg-slate-50" />
        ))}
        {dates.map(({ date, day }) => (
          <div key={day.dayNumber} className="h-20 rounded border bg-white p-2">
            <div className="text-xs font-bold">{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
            <div className="mt-2 text-sm font-black">{day.title}</div>
            <div className="mt-1 text-xs text-slate-500">{day.items.length} activities</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlannerPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const destinationCode = params.get("to") || "LJU";
  const originCode = params.get("from") || "";
  const initialDestination = params.get("toName") || params.get("destination") || "Ljubljana";
  const initialStartDate = params.get("date") || today;

  const [destinationName, setDestinationName] = useState(initialDestination);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState<BudgetLevel>("medium");
  const [pace, setPace] = useState<TravelPace>("balanced");
  const [selectedInterests, setSelectedInterests] = useState<string[]>(["culture", "food", "nature"]);
  const [selectedFlight] = useState<FlightOffer | undefined>(() => {
    const raw = sessionStorage.getItem("skynode:selectedFlight");

    if (!raw) {
      return undefined;
    }

    try {
      return JSON.parse(raw) as FlightOffer;
    } catch {
      return undefined;
    }
  });
  const [itinerary, setItinerary] = useState<GeneratedItinerary | null>(null);
  const [viewMode, setViewMode] = useState<"timeline" | "calendar">("timeline");
  const [customMode, setCustomMode] = useState(false);
  const [customItinerary, setCustomItinerary] = useState<GeneratedItinerary | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedTrip, setSavedTrip] = useState(false);

  const request = useMemo<GenerateItineraryRequest>(() => ({
    destinationCode,
    destinationName,
    startDate,
    days,
    budget,
    pace,
    interests: selectedInterests,
    selectedFlight,
    originCode: originCode || undefined,
  }), [budget, days, destinationCode, destinationName, originCode, pace, selectedFlight, selectedInterests, startDate]);

  async function handleGenerate(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSavedTrip(false);

    try {
      setItinerary(await generateItinerary(request));
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Failed to generate itinerary.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!itinerary) {
      return;
    }

    if (!user) {
      navigate("/auth", { state: { from: `${location.pathname}${location.search}` } });
      return;
    }

    setSaving(true);
    setError("");

    try {
      await saveTrip({
        ...request,
        title: `${destinationName} ${days}-day trip`,
        itinerary,
      });
      setSavedTrip(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save trip.");
    } finally {
      setSaving(false);
    }
  }

  function toggleInterest(interest: string) {
    setSelectedInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest],
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="px-6 pb-16 pt-24">
        <div className="mx-auto max-w-7xl">
          <Link to="/search" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 no-underline hover:text-blue-600">
            <ArrowLeft className="h-4 w-4" />
            Back to flights
          </Link>

          <section className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-8 text-white shadow-2xl">
            <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
              <div>
                <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-cyan-200">
                  <Sparkles className="h-4 w-4" />
                  AI itinerary planner
                </p>
                <h1 className="max-w-3xl text-4xl font-black leading-tight md:text-6xl">
                  Turn your selected route into a day-by-day trip plan.
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
                  SkyNode combines destination attractions, your pace and interests, and your local Ollama model for this sprint.
                </p>
              </div>

              <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Route context</span>
                  <Plane className="h-4 w-4 text-cyan-200" />
                </div>
                <div className="flex items-center gap-3 text-2xl font-black">
                  <span>{originCode || "ANY"}</span>
                  <span className="text-cyan-300">-&gt;</span>
                  <span>{destinationCode}</span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-200">
                  <span className="rounded-full bg-white/10 px-3 py-1">{startDate}</span>
                  <span className="rounded-full bg-white/10 px-3 py-1">{days} days</span>
                  <span className="rounded-full bg-white/10 px-3 py-1">{budget} budget</span>
                  {selectedFlight && (
                    <span className="rounded-full bg-white/10 px-3 py-1">{selectedFlight.carrier || "selected flight"}</span>
                  )}
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[390px_1fr]">
            <form onSubmit={handleGenerate} className="h-fit rounded-3xl border border-slate-100 bg-white p-6 shadow-xl">
              <div className="mb-6">
                <p className="text-xs font-black uppercase tracking-widest text-blue-500">Trip setup</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">Tell SkyNode the vibe.</h2>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomMode(false)}
                    className={`rounded-full px-3 py-1.5 text-xs font-black transition ${customMode ? 'bg-slate-100 text-slate-700' : 'bg-blue-600 text-white'}`}
                  >
                    AI generate
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomMode(true)}
                    className={`rounded-full px-3 py-1.5 text-xs font-black transition ${customMode ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                  >
                    Create custom itinerary
                  </button>
                </div>
              </div>

              <label className="mb-4 block">
                <span className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-600">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  Destination
                </span>
                <input
                  value={destinationName}
                  onChange={(event) => setDestinationName(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  required
                />
              </label>

              <div className="mb-4 grid grid-cols-2 gap-3">
                <label>
                  <span className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-600">
                    <CalendarDays className="h-4 w-4 text-blue-500" />
                    Start
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    required
                  />
                </label>

                <label>
                  <span className="mb-1 block text-sm font-bold text-slate-600">Days</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={days}
                    onChange={(event) => setDays(clampDays(Number(event.target.value)))}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    required
                  />
                </label>
              </div>

              <label className="mb-4 block">
                <span className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-600">
                  <CircleDollarSign className="h-4 w-4 text-blue-500" />
                  Budget
                </span>
                <select
                  value={budget}
                  onChange={(event) => setBudget(event.target.value as BudgetLevel)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>

              <label className="mb-5 block">
                <span className="mb-1 block text-sm font-bold text-slate-600">Travel pace</span>
                <select
                  value={pace}
                  onChange={(event) => setPace(event.target.value as TravelPace)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="relaxed">Relaxed</option>
                  <option value="balanced">Balanced</option>
                  <option value="packed">Packed</option>
                </select>
              </label>

              <div className="mb-6">
                <p className="mb-2 text-sm font-bold text-slate-600">Interests</p>
                <div className="flex flex-wrap gap-2">
                  {interests.map((interest) => (
                    <button
                      type="button"
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={`rounded-full px-3 py-2 text-xs font-black capitalize transition ${
                        selectedInterests.includes(interest)
                          ? "bg-blue-600 text-white shadow-md"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              {!customMode ? (
                <button
                  type="submit"
                  disabled={loading || selectedInterests.length === 0}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-400 px-5 py-3 text-sm font-black text-white shadow-md transition hover:scale-[1.01] hover:shadow-lg disabled:cursor-wait disabled:opacity-70"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {loading ? "Building itinerary..." : "Generate itinerary"}
                </button>
              ) : (
                <div className="space-y-3">
                  <CustomItineraryEditor
                    onCreate={(it) => {
                      setCustomItinerary(it);
                      setItinerary(it);
                      setSavedTrip(false);
                    }}
                  />
                </div>
              )}
            </form>

            <section className="min-h-[620px] rounded-3xl border border-slate-100 bg-white p-6 shadow-xl">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-blue-500">Itinerary output</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">Your day-by-day plan</h2>
                </div>

                <div className="flex items-center gap-3">
                  <div className="rounded-full border bg-white/10 p-1">
                    <button
                      type="button"
                      onClick={() => setViewMode("timeline")}
                      className={`px-3 py-1.5 text-sm font-black ${viewMode === "timeline" ? "bg-blue-600 text-white rounded-full" : "text-slate-600"}`}
                    >
                      Timeline
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("calendar")}
                      className={`ml-2 px-3 py-1.5 text-sm font-black ${viewMode === "calendar" ? "bg-blue-600 text-white rounded-full" : "text-slate-600"}`}
                    >
                      Calendar
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!itinerary || saving}
                    className="flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? "Saving..." : user ? "Save trip" : "Sign in to save"}
                  </button>
                </div>
              </div>

              {error && (
                <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
                  {error}
                </div>
              )}

              {savedTrip && (
                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Trip saved to your account.
                </div>
              )}

              {!itinerary && !loading && (
                <div className="grid min-h-[420px] place-items-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                  <div>
                    <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-lg">
                      <Sparkles className="h-8 w-8" />
                    </div>
                    <p className="text-xl font-black text-slate-950">Ready when you are.</p>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                      Pick the trip mood and generate an itinerary. Sign in only when you want to save it.
                    </p>
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => setCustomMode(true)}
                        className="rounded-full bg-slate-100 px-4 py-2 font-black text-slate-800"
                      >
                        Create your own itinerary
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {loading && (
                <div className="space-y-4">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="animate-pulse rounded-2xl border border-slate-100 p-5">
                      <div className="mb-3 h-5 w-1/3 rounded bg-slate-200" />
                      <div className="space-y-2">
                        <div className="h-4 rounded bg-slate-100" />
                        <div className="h-4 w-2/3 rounded bg-slate-100" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {itinerary && !loading && (
                <div className="space-y-5">
                  {viewMode === "calendar" ? (
                    <div>
                      <p className="mb-3 text-sm font-black text-slate-600">Calendar view</p>
                      <CalendarView itinerary={itinerary} />
                    </div>
                  ) : (
                    <div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-black text-slate-900">
                      Estimated trip activity cost: ${itinerary.estimatedTotalCost.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      Generated with {itinerary.attractions.length} attraction ideas from {itinerary.attractions[0]?.source || "local"} context.
                    </p>
                  </div>

                  <ItineraryMap itinerary={itinerary} />

                  {itinerary.days.map((day) => (
                    <article key={day.dayNumber} className="rounded-2xl border border-slate-100 p-5 transition hover:shadow-md">
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest text-blue-500">Day {day.dayNumber}</p>
                          <h3 className="mt-1 text-xl font-black text-slate-950">{day.title}</h3>
                          <p className="mt-1 text-sm text-slate-500">{day.summary}</p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-600">
                          ${day.estimatedCost}
                        </span>
                      </div>

                      <div className="grid gap-3">
                        {day.items.map((item, itemIndex) => (
                          <div key={`${day.dayNumber}-${item.timeOfDay}-${itemIndex}-${item.title}`} className="rounded-xl bg-slate-50 p-4">
                            <div className="mb-1 flex items-center justify-between gap-3">
                              <p className="text-xs font-black uppercase tracking-widest text-slate-400">{item.timeOfDay}</p>
                              <span className="text-xs font-bold text-slate-500">${item.estimatedCost}</span>
                            </div>
                            <p className="font-black text-slate-900">{item.title}</p>
                            <p className="mt-1 text-sm leading-relaxed text-slate-500">{item.description}</p>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}

                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                    <p className="mb-3 text-sm font-black text-slate-900">Attractions used for context</p>
                    <div className="flex flex-wrap gap-2">
                      {itinerary.attractions.map((attraction) => (
                        <span key={attraction.id} className="rounded-full bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm">
                          {attraction.name}
                        </span>
                      ))}
                    </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

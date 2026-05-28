import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, List } from "lucide-react";
import { applyTripChange, loadSavedTrip, listSavedTrips } from "../api/assistantApi";
import { generateItinerary, saveTrip } from "../api/plannerApi";
import { useAuth } from "../auth/AuthContext";
import { Footer } from "../components/Footer";
import { ItineraryMap } from "../components/ItineraryMap";
import { Navbar } from "../components/Navbar";
import { Button, PageShell } from "../components/ui";
import { CalendarView } from "../features/planner/CalendarView";
import { ItineraryTimeline } from "../features/planner/ItineraryTimeline";
import { PlannerHero } from "../features/planner/PlannerHero";
import { PlannerRail } from "../features/planner/PlannerRail";
import { TripSetupForm } from "../features/planner/TripSetupForm";
import { TripsDrawer } from "../features/planner/TripsDrawer";
import type { PlannerTab } from "../features/planner/plannerTypes";
import { budgetLevelFromAmount, emptyDays, normalizeDays } from "../features/planner/plannerUtils";
import type {
  BudgetLevel,
  FlightOffer,
  GenerateItineraryRequest,
  GeneratedItinerary,
  ItineraryDay,
  ItineraryItem,
  SavedTripDetail,
  SavedTripSummary,
  TravelPace,
  TripChangeProposal,
} from "../../shared/types.js";

const today = new Date().toISOString().slice(0, 10);

export function PlannerPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const destinationCode = params.get("to") || "LJU";
  const originCode = params.get("from") || "";
  const initialDestination = params.get("toName") || params.get("destination") || "Ljubljana";
  const initialStartDate = params.get("date") || today;

  const [tripTitle, setTripTitle] = useState("");
  const [destinationName, setDestinationName] = useState(initialDestination);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [days, setDays] = useState(3);
  const [travelers, setTravelers] = useState(2);
  const [budgetAmount, setBudgetAmount] = useState(1800);
  const budget = useMemo<BudgetLevel>(() => budgetLevelFromAmount(budgetAmount), [budgetAmount]);
  const [pace, setPace] = useState<TravelPace>("balanced");
  const [selectedInterests, setSelectedInterests] = useState<string[]>(["culture", "food", "nature"]);
  const [selectedFlight] = useState<FlightOffer | undefined>(() => {
    const raw = sessionStorage.getItem("skynode:selectedFlight");
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as FlightOffer;
    } catch {
      return undefined;
    }
  });

  const [itinerary, setItinerary] = useState<GeneratedItinerary | null>(null);
  const [draftDays, setDraftDays] = useState<ItineraryDay[]>(emptyDays(3));
  const [selectedTripId, setSelectedTripId] = useState("");
  const [tab, setTab] = useState<PlannerTab>("itinerary");
  const [manual, setManual] = useState(false);
  const [editing, setEditing] = useState(false);
  const [tripsOpen, setTripsOpen] = useState(false);
  const [savedTrips, setSavedTrips] = useState<SavedTripSummary[]>([]);
  const [tripSearch, setTripSearch] = useState("");
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [loadingTripId, setLoadingTripId] = useState("");
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
    budgetAmount,
    travelers,
    pace,
    interests: selectedInterests,
    selectedFlight,
    selectedFlights: selectedFlight ? [selectedFlight] : undefined,
    routeSegments: selectedFlight ? [{
      id: "selected-outbound",
      type: "flight",
      from: originCode || "ANY",
      to: destinationCode,
      date: startDate,
      label: selectedFlight.carrier,
      details: selectedFlight,
    }] : undefined,
    originCode: originCode || undefined,
  }), [budget, budgetAmount, days, destinationCode, destinationName, originCode, pace, selectedFlight, selectedInterests, startDate, travelers]);

  const title = tripTitle.trim() || itinerary?.destinationName || destinationName;
  const filteredTrips = savedTrips.filter((trip) => {
    const search = tripSearch.trim().toLowerCase();
    return !search || `${trip.title} ${trip.destinationName} ${trip.destinationCode}`.toLowerCase().includes(search);
  });

  async function loadTrips() {
    if (authLoading || !user) return;
    setLoadingTrips(true);
    setError("");

    try {
      setSavedTrips(await listSavedTrips());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load trips.");
    } finally {
      setLoadingTrips(false);
    }
  }

  async function openTripsDrawer() {
    setTripsOpen(true);
    await loadTrips();
  }

  async function selectTrip(tripId: string) {
    setLoadingTripId(tripId);
    setError("");

    try {
      const trip: SavedTripDetail = await loadSavedTrip(tripId);
      setSelectedTripId(trip.id);
      setTripTitle(trip.title);
      setDestinationName(trip.destinationName);
      setStartDate(trip.startDate);
      setDays(trip.days);
      setBudgetAmount(trip.estimatedTotalCost || 1800);
      setPace(trip.pace);
      setSelectedInterests(trip.interests);
      setItinerary(trip.itinerary);
      setDraftDays(trip.itinerary.days);
      setEditing(false);
      setTab("itinerary");
      setTripsOpen(false);
      setSavedTrip(false);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load trip.");
    } finally {
      setLoadingTripId("");
    }
  }

  async function createWithAi(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSavedTrip(false);

    try {
      const generated = await generateItinerary(request);
      setItinerary(generated);
      setDraftDays(generated.days);
      setSelectedTripId("");
      setEditing(false);
      setTab("itinerary");
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Failed to generate itinerary.");
    } finally {
      setLoading(false);
    }
  }

  function createManual(event: FormEvent) {
    event.preventDefault();
    const cleanDays = normalizeDays(draftDays);
    setItinerary({
      destinationName,
      startDate,
      days: cleanDays,
      attractions: [],
      estimatedTotalCost: cleanDays.reduce((sum, day) => sum + day.estimatedCost, 0),
      generationMode: "ollama",
    });
    setDraftDays(cleanDays);
    setSelectedTripId("");
    setEditing(true);
    setTab("itinerary");
    setSavedTrip(false);
  }

  async function saveTripNow() {
    if (!itinerary) return;

    if (!user) {
      navigate("/auth", { state: { from: `${location.pathname}${location.search}` } });
      return;
    }

    setSaving(true);
    setError("");

    try {
      const cleanDays = normalizeDays(itinerary.days);
      const cleanItinerary = {
        ...itinerary,
        days: cleanDays,
        estimatedTotalCost: cleanDays.reduce((sum, day) => sum + day.estimatedCost, 0),
      };
      await saveTrip({
        ...request,
        destinationName: cleanItinerary.destinationName,
        startDate: cleanItinerary.startDate,
        days: cleanDays.length,
        title: tripTitle.trim() || `${cleanItinerary.destinationName} trip`,
        itinerary: cleanItinerary,
      });
      setItinerary(cleanItinerary);
      setDraftDays(cleanDays);
      setSavedTrip(true);
      await loadTrips();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save trip.");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdits() {
    if (!itinerary) return;

    const cleanDays = normalizeDays(draftDays);
    const updated: GeneratedItinerary = {
      ...itinerary,
      destinationName,
      startDate,
      days: cleanDays,
      estimatedTotalCost: cleanDays.reduce((sum, day) => sum + day.estimatedCost, 0),
    };
    setSaving(true);
    setError("");

    try {
      if (selectedTripId && user) {
        const proposal: TripChangeProposal = { summary: "Updated itinerary from planner.", itinerary: updated };
        const updatedTrip = await applyTripChange(selectedTripId, proposal);
        setItinerary(updatedTrip.itinerary);
        setDraftDays(updatedTrip.itinerary.days);
        setSavedTrip(true);
      } else {
        setItinerary(updated);
        setDraftDays(updated.days);
      }
      setEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save itinerary changes.");
    } finally {
      setSaving(false);
    }
  }

  function startNewTrip() {
    setSelectedTripId("");
    setTripTitle("");
    setDestinationName(initialDestination);
    setStartDate(initialStartDate);
    setDays(3);
    setTravelers(2);
    setBudgetAmount(1800);
    setPace("balanced");
    setSelectedInterests(["culture", "food", "nature"]);
    setDraftDays(emptyDays(3));
    setItinerary(null);
    setManual(false);
    setEditing(false);
    setTripsOpen(false);
    setSavedTrip(false);
  }

  function changeDays(nextDays: number) {
    const clean = Math.min(Math.max(nextDays || 1, 1), 14);
    setDays(clean);
    setDraftDays(emptyDays(clean));
  }

  function updateDay(dayIndex: number, patch: Partial<Pick<ItineraryDay, "title" | "summary">>) {
    setDraftDays((current) => current.map((day, index) => index === dayIndex ? { ...day, ...patch } : day));
  }

  function addDay() {
    setDraftDays((current) => [...current, { dayNumber: current.length + 1, title: `Day ${current.length + 1}`, summary: "", estimatedCost: 0, items: [] }]);
  }

  function addActivity(dayIndex: number) {
    setDraftDays((current) => current.map((day, index) => index === dayIndex ? { ...day, items: [...day.items, { timeOfDay: "09:00", title: "New activity", description: "", estimatedCost: 0 }] } : day));
  }

  function updateActivity(dayIndex: number, itemIndex: number, patch: Partial<ItineraryItem>) {
    setDraftDays((current) => current.map((day, index) => index !== dayIndex ? day : { ...day, items: day.items.map((item, currentIndex) => currentIndex === itemIndex ? { ...item, ...patch } : item) }));
  }

  function removeActivity(dayIndex: number, itemIndex: number) {
    setDraftDays((current) => current.map((day, index) => index === dayIndex ? { ...day, items: day.items.filter((_, currentIndex) => currentIndex !== itemIndex) } : day));
  }

  function toggleInterest(interest: string) {
    setSelectedInterests((current) => current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest]);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <PageShell>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link to="/search" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 no-underline hover:text-blue-600"><ArrowLeft className="h-4 w-4" />Back to flights</Link>
          <Button type="button" tone="ghost" onClick={openTripsDrawer} icon={<List className="h-4 w-4" />} className="rounded-full">All trips</Button>
        </div>

        {!itinerary ? (
          <TripSetupForm
            addActivity={addActivity}
            addDay={addDay}
            budgetAmount={budgetAmount}
            changeDays={changeDays}
            createManual={createManual}
            createWithAi={createWithAi}
            days={days}
            destinationCode={destinationCode}
            destinationName={destinationName}
            draftDays={draftDays}
            loading={loading}
            manual={manual}
            originCode={originCode}
            pace={pace}
            removeActivity={removeActivity}
            selectedFlight={selectedFlight}
            selectedInterests={selectedInterests}
            setBudgetAmount={setBudgetAmount}
            setDestinationName={setDestinationName}
            setManual={setManual}
            setPace={setPace}
            setStartDate={setStartDate}
            setTravelers={setTravelers}
            setTripTitle={setTripTitle}
            startDate={startDate}
            toggleInterest={toggleInterest}
            travelers={travelers}
            tripTitle={tripTitle}
            updateActivity={updateActivity}
            updateDay={updateDay}
          />
        ) : (
          <>
            <PlannerHero
              active={tab}
              cost={itinerary.estimatedTotalCost}
              days={itinerary.days.length}
              editing={editing}
              itinerary={itinerary}
              saveTrip={saveTripNow}
              saving={saving}
              setActive={setTab}
              startEdit={() => { setDraftDays(itinerary.days); setEditing(true); setTab("itinerary"); }}
              cancelEdit={() => { setDraftDays(itinerary.days); setEditing(false); }}
              saveEdits={saveEdits}
              startNew={startNewTrip}
              title={title}
              travelers={travelers}
            />
            {error && <Banner kind="error" text={error} />}
            {savedTrip && <Banner kind="success" text="Trip saved." />}
            {tab === "itinerary" && (
              <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <ItineraryTimeline
                  days={editing ? draftDays : itinerary.days}
                  editing={editing}
                  addActivity={addActivity}
                  addDay={addDay}
                  removeActivity={removeActivity}
                  startDate={itinerary.startDate}
                  updateActivity={updateActivity}
                  updateDay={updateDay}
                />
                <PlannerRail itinerary={itinerary} plannedBudget={budgetAmount} selectedFlight={selectedFlight} travelers={travelers} />
              </div>
            )}
            {tab === "calendar" && <CalendarView itinerary={itinerary} />}
            {tab === "map" && <ItineraryMap itinerary={itinerary} />}
          </>
        )}
      </PageShell>
      {tripsOpen && (
        <TripsDrawer
          authLoading={authLoading}
          filteredTrips={filteredTrips}
          loadingTripId={loadingTripId}
          loadingTrips={loadingTrips}
          onClose={() => setTripsOpen(false)}
          onNewTrip={startNewTrip}
          onSearch={setTripSearch}
          onSelect={selectTrip}
          savedTrips={savedTrips}
          search={tripSearch}
          user={Boolean(user)}
        />
      )}
      <Footer />
    </div>
  );
}

function Banner({ kind, text }: { kind: "error" | "success"; text: string }) {
  if (kind === "error") return <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">{text}</div>;
  return <div className="mb-6 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" />{text}</div>;
}

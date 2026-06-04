import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, CheckCircle2, Loader2, Send, Trash2, UserRound, X } from "lucide-react";
import { applyTripChange, loadSavedTrip } from "../api/assistantApi";
import { listLikedFlights } from "../api/likedFlightsApi";
import { generateItinerary, saveTrip } from "../api/plannerApi";
import { profileFromUser, deleteTrip, listTripMembers, listTripMessages, sendTripMessage, tripInviteUrl, updateTripMember, updateTripSettings } from "../api/tripsApi";
import { useAuth } from "../auth/AuthContext";
import { Footer } from "../components/Footer";
import { ItineraryMap } from "../components/ItineraryMap";
import { Navbar } from "../components/Navbar";
import { Button, Card, PageShell } from "../components/ui";
import { CalendarView } from "../features/planner/CalendarView";
import { ItineraryTimeline } from "../features/planner/ItineraryTimeline";
import { PlannerHero } from "../features/planner/PlannerHero";
import { PlannerRail } from "../features/planner/PlannerRail";
import { TripSetupForm } from "../features/planner/TripSetupForm";
import { SaveTripModal } from "../features/trip-community/SaveTripModal";
import type { PlannerTab } from "../features/planner/plannerTypes";
import { assignDayCities, budgetLevelFromAmount, emptyDays, normalizeDays, parseTripCities } from "../features/planner/plannerUtils";
import type {
  BudgetLevel,
  FlightOffer,
  GenerateItineraryRequest,
  GeneratedItinerary,
  ItineraryDay,
  ItineraryItem,
  LikedFlight,
  SavedTripDetail,
  TravelPace,
  TripMember,
  TripMessage,
  TripChangeProposal,
  TripHotel,
  TripLocation,
  TripRouteSegment,
  TripVisibility,
} from "../../shared/types.js";

const today = new Date().toISOString().slice(0, 10);

export function PlannerPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const restoredDraft = useMemo(() => readPlannerDraftFromSession(), []);
  const flightsToAdd = useMemo(() => readFlightsToAddFromSession(), []);
  const initialDestinationCode = restoredDraft?.destinationCode || params.get("to") || "";
  const initialOriginCode = restoredDraft?.originCode || params.get("from") || "";
  const initialDestination = restoredDraft?.destinationName || params.get("toName") || params.get("destination") || "";
  const initialStartDate = restoredDraft?.startDate || params.get("date") || today;
  const tripIdToOpen = params.get("tripId") || "";

  const [tripTitle, setTripTitle] = useState(restoredDraft?.tripTitle || "");
  const [destinationCode, setDestinationCode] = useState(initialDestinationCode);
  const [originCode, setOriginCode] = useState(initialOriginCode);
  const [destinationName, setDestinationName] = useState(initialDestination);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [days, setDays] = useState(restoredDraft?.days || 3);
  const [travelers, setTravelers] = useState(restoredDraft?.travelers || 2);
  const [budgetAmount, setBudgetAmount] = useState(restoredDraft?.budgetAmount || 1800);
  const [tripCities, setTripCities] = useState(restoredDraft?.tripCities || "");
  const [hotelName, setHotelName] = useState(restoredDraft?.hotelName || "");
  const [tripNotes, setTripNotes] = useState(restoredDraft?.tripNotes || "");
  const [loadedHotels, setLoadedHotels] = useState<TripHotel[] | undefined>();
  const [loadedRouteSegments, setLoadedRouteSegments] = useState<TripRouteSegment[] | undefined>();
  const budget = useMemo<BudgetLevel>(() => budgetLevelFromAmount(budgetAmount), [budgetAmount]);
  const [pace, setPace] = useState<TravelPace>(restoredDraft?.pace || "balanced");
  const [selectedInterests, setSelectedInterests] = useState<string[]>(restoredDraft?.selectedInterests || ["culture", "food", "nature"]);
  const [selectedFlights, setSelectedFlights] = useState<FlightOffer[]>(() => mergeFlights(restoredDraft?.selectedFlights || readSelectedFlightsFromSession(), flightsToAdd));
  const [likedFlights, setLikedFlights] = useState<LikedFlight[]>([]);
  const [likedFlightsLoading, setLikedFlightsLoading] = useState(false);
  const [likedFlightsError, setLikedFlightsError] = useState("");
  const selectedFlight = selectedFlights[0];
  const initialSetupStep = restoredDraft?.returnStep ?? (flightsToAdd.length > 0 ? 2 : 0);

  const [itinerary, setItinerary] = useState<GeneratedItinerary | null>(null);
  const [draftDays, setDraftDays] = useState<ItineraryDay[]>(emptyDays(3));
  const [selectedTripId, setSelectedTripId] = useState("");
  const [tab, setTab] = useState<PlannerTab>("itinerary");
  const [manual, setManual] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openingTrip, setOpeningTrip] = useState(Boolean(tripIdToOpen));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedTrip, setSavedTrip] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [generalModalOpen, setGeneralModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [tripVisibility, setTripVisibility] = useState<TripVisibility>("private");
  const [tripDescription, setTripDescription] = useState("");
  const [tripMaxMembers, setTripMaxMembers] = useState(6);
  const [tripInviteToken, setTripInviteToken] = useState("");
  const [settingsInitialTab, setSettingsInitialTab] = useState<"general" | "sharing">("general");
  const [members, setMembers] = useState<TripMember[]>([]);
  const [messages, setMessages] = useState<TripMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [deleting, setDeleting] = useState(false);

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
    selectedFlights: selectedFlights.length > 0 ? selectedFlights : undefined,
    routeSegments: loadedRouteSegments || (selectedFlights.length > 0 ? selectedFlights.map((flight, index) => ({
      id: `selected-flight-${index + 1}`,
      type: "flight",
      from: flight.searchFrom || flight.segments?.[0]?.originCode || originCode || "ANY",
      to: flight.searchTo || flight.segments?.[flight.segments.length - 1]?.destinationCode || destinationCode,
      date: startDate,
      label: flight.carrier,
      fromLocation: buildFlightLocation(
        flight.segments?.[0]?.originAirport,
        flight.segments?.[0]?.originCode || flight.searchFrom || originCode,
      ),
      toLocation: buildFlightLocation(
        flight.segments?.[flight.segments.length - 1]?.destinationAirport,
        flight.segments?.[flight.segments.length - 1]?.destinationCode || flight.searchTo || destinationCode,
        destinationName,
      ),
      details: flight,
    })) : undefined),
    cities: tripCities.split(",").map((city) => city.trim()).filter(Boolean).map((city, index) => ({
      id: `city-${index + 1}`,
      name: city,
      notes: index === 0 ? "Primary destination" : undefined,
    })),
    hotels: loadedHotels || (hotelName.trim() ? [{
      id: "hotel-1",
      cityName: destinationName,
      name: hotelName.trim(),
      location: { name: hotelName.trim(), city: destinationName, source: "user" },
      checkIn: startDate,
    }] : undefined),
    budgetCategories: [
      { id: "flights", label: "Flights", amount: selectedFlights.reduce((sum, flight) => sum + (Number((flight.priceText || "").replace(/[^0-9]/g, "")) || 0), 0) },
      { id: "hotels", label: "Hotels", amount: Math.round(budgetAmount * 0.35) },
      { id: "activities", label: "Activities", amount: Math.round(budgetAmount * 0.25) },
      { id: "food", label: "Food", amount: Math.round(budgetAmount * 0.2) },
    ],
    notes: tripNotes.trim() || undefined,
    originCode: originCode || undefined,
  }), [budget, budgetAmount, days, destinationCode, destinationName, hotelName, loadedHotels, loadedRouteSegments, originCode, pace, selectedFlight, selectedFlights, selectedInterests, startDate, travelers, tripCities, tripNotes]);

  const title = tripTitle.trim() || itinerary?.destinationName || destinationName;
  const showOpeningSavedTrip = Boolean(tripIdToOpen) && openingTrip && !itinerary;
  const tripCityNames = useMemo(() => {
    const cities = parseTripCities(tripCities);
    return cities.length > 0 ? cities : parseTripCities(destinationName);
  }, [destinationName, tripCities]);
  useEffect(() => {
    if (!tripIdToOpen) {
      setOpeningTrip(false);
    }
  }, [tripIdToOpen]);

  useEffect(() => {
    if (flightsToAdd.length > 0) {
      sessionStorage.removeItem("skynode:selectedFlightsToAdd");
      sessionStorage.removeItem("skynode:selectedFlight");
    }
  }, [flightsToAdd.length]);

  useEffect(() => {
    if (authLoading || !user) {
      setLikedFlights([]);
      return;
    }

    let cancelled = false;
    setLikedFlightsLoading(true);
    setLikedFlightsError("");

    void listLikedFlights()
      .then((items) => {
        if (!cancelled) {
          setLikedFlights(items);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setLikedFlightsError(loadError instanceof Error ? loadError.message : "Failed to load liked flights.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLikedFlightsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  useEffect(() => {
    if (!tripIdToOpen || authLoading) {
      return;
    }

    if (!user) {
      navigate("/auth", { state: { from: `/planner?tripId=${encodeURIComponent(tripIdToOpen)}` } });
      return;
    }

    let cancelled = false;

    async function openTripInPlanner() {
      setOpeningTrip(true);
      setLoading(true);
      setError("");

      try {
        const trip: SavedTripDetail = await loadSavedTrip(tripIdToOpen);
        if (cancelled) return;

        setSelectedTripId(trip.id);
        setTripTitle(trip.title);
        setDestinationName(trip.destinationName);
        setStartDate(trip.startDate);
        setDays(trip.days);
        setBudgetAmount(trip.estimatedTotalCost || 1800);
        setTripCities(trip.cities?.map((city) => city.name).join(", ") || trip.destinationName);
        setHotelName(trip.hotels?.[0]?.name || "");
        setLoadedHotels(trip.hotels);
        setLoadedRouteSegments(trip.routeSegments);
        setTripNotes(trip.notes || "");
        setSelectedFlights(trip.selectedFlights || (trip.selectedFlight ? [trip.selectedFlight] : []));
        setTripVisibility(trip.visibility || "private");
        setTripDescription(trip.description || "");
        setTripMaxMembers(trip.maxMembers || 6);
        setTripInviteToken(trip.inviteToken || "");
        setDestinationCode(trip.destinationCode || "");
        setOriginCode(trip.routeSegments?.find((segment) => segment.type === "flight")?.from || "");
        setPace(trip.pace);
        setSelectedInterests(trip.interests);
        setItinerary(trip.itinerary);
        setDraftDays(trip.itinerary.days);
        setManual(false);
        setEditing(false);
        setTab("itinerary");
        setSavedTrip(false);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to open trip in planner.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setOpeningTrip(false);
        }
      }
    }

    void openTripInPlanner();

    return () => {
      cancelled = true;
    };
  }, [authLoading, navigate, tripIdToOpen, user]);

  useEffect(() => {
    if (!selectedTripId || tripVisibility === "private" || !user) {
      setMembers([]);
      setMessages([]);
      return;
    }

    let cancelled = false;

    async function loadSocial() {
      try {
        const [nextMembers, nextMessages] = await Promise.all([
          listTripMembers(selectedTripId),
          listTripMessages(selectedTripId).catch(() => []),
        ]);
        if (!cancelled) {
          setMembers(nextMembers);
          setMessages(nextMessages);
        }
      } catch {
        if (!cancelled) {
          setMembers([]);
        }
      }
    }

    void loadSocial();

    return () => {
      cancelled = true;
    };
  }, [selectedTripId, tripVisibility, user]);

  useEffect(() => {
    if (tab !== "chat" || !selectedTripId || tripVisibility === "private") {
      return;
    }

    const timer = window.setInterval(() => {
      void listTripMessages(selectedTripId).then(setMessages).catch(() => undefined);
    }, 2500);

    return () => window.clearInterval(timer);
  }, [selectedTripId, tab, tripVisibility]);

  useEffect(() => {
    if (tripVisibility === "private" && (tab === "members" || tab === "chat")) {
      setTab("itinerary");
    }
  }, [tab, tripVisibility]);

  function openTripsLibrary() {
    navigate("/trips");
  }

  async function createWithAi(event?: FormEvent) {
    event?.preventDefault();
    if (selectedInterests.length === 0) {
      setError("Choose at least one trip interest before generating with AI.");
      return;
    }

    setLoading(true);
    setError("");
    setSavedTrip(false);

    try {
      const generated = await generateItinerary(request);
      const cityDays = assignDayCities(generated.days, tripCityNames);
      setItinerary({ ...generated, days: cityDays });
      setDraftDays(cityDays);
      setSelectedTripId("");
      setLoadedHotels(undefined);
      setLoadedRouteSegments(undefined);
      setEditing(false);
      setTab("itinerary");
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Failed to generate itinerary.");
    } finally {
      setLoading(false);
    }
  }

  function createManual(event?: FormEvent) {
    event?.preventDefault();
    const cleanDays = assignDayCities(normalizeDays(draftDays), tripCityNames);
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

  function openSaveModal() {
    if (!itinerary) return;

    if (!user) {
      navigate("/auth", { state: { from: `${location.pathname}${location.search}` } });
      return;
    }

    setSaveModalOpen(true);
  }

  async function saveTripNow(options: { visibility: TripVisibility; description: string; maxMembers: number }) {
    if (!itinerary) return;

    setSaving(true);
    setError("");

    try {
      const cleanDays = assignDayCities(normalizeDays(itinerary.days), tripCityNames);
      const cleanItinerary = {
        ...itinerary,
        days: cleanDays,
        estimatedTotalCost: cleanDays.reduce((sum, day) => sum + day.estimatedCost, 0),
      };
      const response = await saveTrip({
        ...request,
        destinationName: cleanItinerary.destinationName,
        startDate: cleanItinerary.startDate,
        days: cleanDays.length,
        title: tripTitle.trim() || `${cleanItinerary.destinationName} trip`,
        itinerary: cleanItinerary,
        visibility: options.visibility,
        description: options.description || undefined,
        maxMembers: options.maxMembers,
        ownerProfile: profileFromUser(user),
      });
      setTripVisibility(options.visibility);
      setTripDescription(options.description);
      setTripMaxMembers(options.maxMembers);
      setItinerary(cleanItinerary);
      setDraftDays(cleanDays);
      setSavedTrip(true);
      setSaveModalOpen(false);
      sessionStorage.removeItem("skynode:plannerDraft");
      navigate(`/trips/${response.tripId}`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save trip.");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdits() {
    if (!itinerary) return;

    const cleanDays = assignDayCities(normalizeDays(draftDays), tripCityNames);
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
        await updateTripSettings(selectedTripId, {
          visibility: tripVisibility,
          description: tripDescription,
          maxMembers: tripMaxMembers,
        });
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
    setDeleteOpen(false);
    setTripTitle("");
    setDestinationCode("");
    setOriginCode("");
    setDestinationName("");
    setStartDate(today);
    setDays(3);
    setTravelers(2);
    setBudgetAmount(1800);
    setTripCities("");
    setHotelName("");
    setLoadedHotels(undefined);
    setLoadedRouteSegments(undefined);
    setTripNotes("");
    setPace("balanced");
    setSelectedInterests(["culture", "food", "nature"]);
    setSelectedFlights(readSelectedFlightsFromSession());
    setTripVisibility("private");
    setTripDescription("");
    setTripMaxMembers(6);
    setTripInviteToken("");
    setMembers([]);
    setMessages([]);
    setMessageInput("");
    sessionStorage.removeItem("skynode:plannerDraft");
    setDraftDays(emptyDays(3));
    setItinerary(null);
    setManual(false);
    setEditing(false);
    setSavedTrip(false);
  }

  function changeDays(nextDays: number) {
    const clean = Math.min(Math.max(nextDays || 1, 1), 14);
    setDays(clean);
    setDraftDays(emptyDays(clean));
  }

  function resizeItineraryDays(nextDays: number) {
    const clean = Math.min(Math.max(nextDays || 1, 1), 14);
    setDays(clean);
    setDraftDays((current) => resizeDays(current, clean, tripCityNames));
    setItinerary((current) => {
      if (!current) return current;
      const resizedDays = resizeDays(current.days, clean, tripCityNames);
      return {
        ...current,
        days: resizedDays,
        estimatedTotalCost: resizedDays.reduce((sum, day) => sum + day.estimatedCost, 0),
      };
    });
  }

  function updateDay(dayIndex: number, patch: Partial<Pick<ItineraryDay, "cityName" | "title" | "summary">>) {
    setDraftDays((current) => current.map((day, index) => index === dayIndex ? { ...day, ...patch } : day));
  }

  async function confirmDeleteTrip() {
    if (!selectedTripId) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      await deleteTrip(selectedTripId);
      setDeleteOpen(false);
      startNewTrip();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete trip.");
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  function addDay() {
    setDraftDays((current) => {
      const cityName = nextDayCityName(current, tripCityNames);
      return [...current, createDraftDay(current.length + 1, cityName)];
    });
  }

  function removeDay(dayIndex: number) {
    setDraftDays((current) => removeDraftDay(current, dayIndex));
  }

  function addActivity(dayIndex: number) {
    setDraftDays((current) => current.map((day, index) => index === dayIndex ? addActivityToDay(day) : day));
  }

  function updateActivity(dayIndex: number, itemIndex: number, patch: Partial<ItineraryItem>) {
    setDraftDays((current) => current.map((day, index) => index === dayIndex ? updateDayActivity(day, itemIndex, patch) : day));
  }

  function removeActivity(dayIndex: number, itemIndex: number) {
    setDraftDays((current) => current.map((day, index) => index === dayIndex ? removeDayActivity(day, itemIndex) : day));
  }

  function updateDestinationName(value: string) {
    setDestinationName(value);
    if (value.trim() !== initialDestination.trim()) {
      setDestinationCode("");
    }
  }

  function applyGeneralInfo(values: GeneralInfoValues) {
    const cleanDays = Math.min(Math.max(values.days || 1, 1), 14);
    const cleanCities = parseTripCities(values.tripCities).length > 0 ? parseTripCities(values.tripCities) : parseTripCities(values.destinationName);
    setTripTitle(values.tripTitle);
    updateDestinationName(values.destinationName);
    setStartDate(values.startDate);
    setTravelers(Math.max(values.travelers || 1, 1));
    setBudgetAmount(Math.max(values.budgetAmount || 0, 0));
    setTripCities(values.tripCities);
    setHotelName(values.hotelName);
    setTripNotes(values.notes);
    setDays(cleanDays);
    setDraftDays((current) => resizeDays(current, cleanDays, cleanCities));
    setItinerary((current) => {
      if (!current) return current;
      const resizedDays = resizeDays(current.days, cleanDays, cleanCities);
      return {
        ...current,
        destinationName: values.destinationName,
        startDate: values.startDate,
        days: resizedDays,
        estimatedTotalCost: resizedDays.reduce((sum, day) => sum + day.estimatedCost, 0),
      };
    });
    setGeneralModalOpen(false);
  }

  function moveActivity(dayIndex: number, fromIndex: number, toIndex: number) {
    setDraftDays((current) => current.map((day, index) => (
      index === dayIndex ? moveDayActivity(day, fromIndex, toIndex) : day
    )));
  }

  function toggleInterest(interest: string) {
    setSelectedInterests((current) => current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest]);
  }

  function removeSelectedFlight(indexToRemove: number) {
    setSelectedFlights((current) => current.filter((_, index) => index !== indexToRemove));
  }

  function addLikedFlight(likedFlight: LikedFlight) {
    const flights = [likedFlight.outbound, likedFlight.inbound].filter((flight): flight is FlightOffer => Boolean(flight));
    setSelectedFlights((current) => mergeFlights(current, flights));
  }

  async function savePlannerSettings(values: GeneralInfoValues & { visibility: TripVisibility; description: string; maxMembers: number }) {
    applyGeneralInfo(values);
    setTripVisibility(values.visibility);
    setTripDescription(values.description);
    setTripMaxMembers(values.maxMembers);

    if (!selectedTripId || !user) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const updated = await updateTripSettings(selectedTripId, {
        visibility: values.visibility,
        description: values.description,
        maxMembers: values.maxMembers,
      });
      setTripVisibility(updated.visibility || values.visibility);
      setTripDescription(updated.description || "");
      setTripMaxMembers(updated.maxMembers || values.maxMembers);
      setTripInviteToken(updated.inviteToken || tripInviteToken);
      if (values.visibility === "private" && (tab === "members" || tab === "chat")) {
        setTab("itinerary");
      }
    } catch (settingsError) {
      setError(settingsError instanceof Error ? settingsError.message : "Failed to save trip settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleMemberDecision(memberId: string, status: "accepted" | "declined") {
    if (!selectedTripId) return;

    setActionLoading(memberId);
    setError("");

    try {
      await updateTripMember(selectedTripId, memberId, { status });
      setMembers(await listTripMembers(selectedTripId));
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "Failed to update member.");
    } finally {
      setActionLoading("");
    }
  }

  async function handleSendMessage(event: FormEvent) {
    event.preventDefault();
    if (!selectedTripId || !user || !messageInput.trim()) return;

    setActionLoading("message");
    setError("");

    try {
      const message = await sendTripMessage(selectedTripId, {
        content: messageInput.trim(),
        profile: profileFromUser(user),
      });
      setMessages((current) => [...current, message]);
      setMessageInput("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send message.");
    } finally {
      setActionLoading("");
    }
  }

  function saveDraftForFlightSearch() {
    writePlannerDraftToSession({
      budgetAmount,
      days,
      destinationName,
      destinationCode,
      hotelName,
      originCode,
      pace,
      returnStep: 2,
      selectedFlights,
      selectedInterests,
      startDate,
      travelers,
      tripCities,
      tripNotes,
      tripTitle,
    });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <PageShell>
        {itinerary && editing && manual && (
          <div className="mb-6">
            <button
              type="button"
              onClick={() => {
                setItinerary(null);
                setEditing(false);
              }}
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 no-underline hover:text-blue-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to general info
            </button>
          </div>
        )}
        {!showOpeningSavedTrip && itinerary && !editing && (
          <div className="mb-6">
            <button
              type="button"
              onClick={() => {
                if (selectedTripId) {
                  navigate("/trips");
                  return;
                }
                setItinerary(null);
                setEditing(false);
                setTab("itinerary");
              }}
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 no-underline hover:text-blue-600"
            >
              <ArrowLeft className="h-4 w-4" />
              {selectedTripId ? "Back to trip library" : "Back to trip setup"}
            </button>
          </div>
        )}

        {showOpeningSavedTrip ? (
          <SavedTripOpening />
        ) : !itinerary ? (
          <>
            {error && <Banner kind="error" text={error} />}
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
              hotelName={hotelName}
              loading={loading}
              manual={manual}
              notes={tripNotes}
              originCode={originCode}
              pace={pace}
              removeActivity={removeActivity}
              removeDay={removeDay}
              selectedFlight={selectedFlight}
              selectedFlights={selectedFlights}
              likedFlights={likedFlights}
              likedFlightsLoading={likedFlightsLoading}
              likedFlightsError={likedFlightsError}
              selectedInterests={selectedInterests}
              setBudgetAmount={setBudgetAmount}
              setDestinationName={updateDestinationName}
              setHotelName={setHotelName}
              setManual={setManual}
              setNotes={setTripNotes}
              setPace={setPace}
              setStartDate={setStartDate}
              setTripCities={setTripCities}
              setTravelers={setTravelers}
              setTripTitle={setTripTitle}
              initialStep={initialSetupStep}
              onAddFlight={saveDraftForFlightSearch}
              onAddLikedFlight={addLikedFlight}
              onOpenTrips={openTripsLibrary}
              onRemoveFlight={removeSelectedFlight}
              startDate={startDate}
              toggleInterest={toggleInterest}
              travelers={travelers}
              tripCities={tripCities}
              tripTitle={tripTitle}
              updateActivity={updateActivity}
              updateDay={updateDay}
            />
          </>
        ) : (
          <>
            <PlannerHero
              active={tab}
              cost={itinerary.estimatedTotalCost}
              days={itinerary.days.length}
              deleting={deleting}
              editing={editing}
              itinerary={itinerary}
              isSavedTrip={Boolean(selectedTripId)}
              onDelete={() => setDeleteOpen(true)}
              onOpenSettings={() => { setSettingsInitialTab("general"); setGeneralModalOpen(true); }}
              onVisibilityChange={setTripVisibility}
              saveTrip={openSaveModal}
              saving={saving}
              setActive={setTab}
              showDelete={Boolean(selectedTripId && user)}
              startEdit={() => { setDraftDays(itinerary.days); setEditing(true); setTab("itinerary"); }}
              cancelEdit={() => { setDraftDays(itinerary.days); setEditing(false); }}
              saveEdits={saveEdits}
              title={title}
              travelers={travelers}
              visibility={tripVisibility}
            />
            {error && <Banner kind="error" text={error} />}
            {savedTrip && <Banner kind="success" text="Trip saved." />}
            {tab === "itinerary" && (
              <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <ItineraryTimeline
                  days={editing ? draftDays : itinerary.days}
                  boundaryCities={request.cities?.map((city) => city.name)}
                  destinationName={itinerary.destinationName}
                  editing={editing}
                  addActivity={addActivity}
                  addDay={addDay}
                  removeDay={removeDay}
                  removeActivity={removeActivity}
                  moveActivity={moveActivity}
                  startDate={itinerary.startDate}
                  updateActivity={updateActivity}
                  updateDay={updateDay}
                />
                <PlannerRail itinerary={itinerary} plannedBudget={budgetAmount} selectedFlights={selectedFlights} travelers={travelers} hotels={request.hotels} routeSegments={request.routeSegments} />
              </div>
            )}
            {tab === "calendar" && <CalendarView itinerary={itinerary} />}
            {tab === "map" && <ItineraryMap itinerary={itinerary} hotels={request.hotels} routeSegments={request.routeSegments} />}
            {tab === "members" && tripVisibility !== "private" && selectedTripId && (
              <PlannerMembersPanel
                actionLoading={actionLoading}
                members={members}
                onDecision={(memberId, status) => void handleMemberDecision(memberId, status)}
              />
            )}
            {tab === "chat" && tripVisibility !== "private" && selectedTripId && (
              <PlannerChatPanel
                actionLoading={actionLoading}
                hasOtherMembers={members.some((member) => member.status === "accepted" && member.role !== "owner")}
                messageInput={messageInput}
                messages={messages}
                onInput={setMessageInput}
                onSend={(event) => void handleSendMessage(event)}
              />
            )}
          </>
        )}
      </PageShell>
      <SaveTripModal
        open={saveModalOpen}
        saving={saving}
        initialValues={{ visibility: tripVisibility, description: tripDescription, maxMembers: tripMaxMembers }}
        onClose={() => setSaveModalOpen(false)}
        onConfirm={(values) => void saveTripNow(values)}
      />
      {generalModalOpen && (
        <PlannerSettingsModal
          budgetAmount={budgetAmount}
          days={days}
          description={tripDescription}
          destinationName={destinationName}
          hotelName={hotelName}
          initialTab={settingsInitialTab}
          inviteToken={tripInviteToken}
          maxMembers={tripMaxMembers}
          notes={tripNotes}
          onClose={() => setGeneralModalOpen(false)}
          onSubmit={savePlannerSettings}
          startDate={startDate}
          travelers={travelers}
          tripCities={tripCities}
          tripTitle={tripTitle}
          visibility={tripVisibility}
        />
      )}

      {deleteOpen && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/50 p-4 sm:items-center">
          <button type="button" className="absolute inset-0" aria-label="Close delete confirmation" onClick={() => setDeleteOpen(false)} />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-black text-slate-950">Delete this trip?</h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
              <span className="font-black text-slate-900">{title}</span> will be permanently deleted from your saved trips.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button type="button" tone="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button
                type="button"
                tone="danger"
                disabled={deleting}
                icon={deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                onClick={() => void confirmDeleteTrip()}
              >
                {deleting ? "Deleting..." : "Delete permanently"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

type GeneralInfoValues = {
  budgetAmount: number;
  days: number;
  description?: string;
  destinationName: string;
  hotelName: string;
  maxMembers?: number;
  notes: string;
  startDate: string;
  travelers: number;
  tripCities: string;
  tripTitle: string;
  visibility?: TripVisibility;
};

function SavedTripOpening() {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-card">
      <div className="relative min-h-80 bg-hero-panel p-8 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.18),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(20,184,166,0.16),transparent_36%)]" />
        <div className="relative flex min-h-64 flex-col justify-between">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-slate-100">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Opening saved trip
          </div>
          <div>
            <div className="h-10 w-72 max-w-full animate-pulse rounded-2xl bg-white/20" />
            <div className="mt-4 h-4 w-96 max-w-full animate-pulse rounded-full bg-white/15" />
            <div className="mt-8 flex flex-wrap gap-2">
              <div className="h-10 w-28 animate-pulse rounded-full bg-white/20" />
              <div className="h-10 w-28 animate-pulse rounded-full bg-white/10" />
              <div className="h-10 w-28 animate-pulse rounded-full bg-white/10" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlannerSettingsModal(props: GeneralInfoValues & {
  description: string;
  initialTab: "general" | "sharing";
  inviteToken: string;
  maxMembers: number;
  onClose: () => void;
  onSubmit: (values: GeneralInfoValues & { visibility: TripVisibility; description: string; maxMembers: number }) => void;
  visibility: TripVisibility;
}) {
  const [values, setValues] = useState<GeneralInfoValues>({
    budgetAmount: props.budgetAmount,
    description: props.description,
    days: props.days,
    destinationName: props.destinationName,
    hotelName: props.hotelName,
    maxMembers: props.maxMembers,
    notes: props.notes,
    startDate: props.startDate,
    travelers: props.travelers,
    tripCities: props.tripCities,
    tripTitle: props.tripTitle,
    visibility: props.visibility,
  });
  const [tab, setTab] = useState<"general" | "sharing">(props.initialTab);
  const [copiedInvite, setCopiedInvite] = useState(false);

  function update<K extends keyof GeneralInfoValues>(key: K, value: GeneralInfoValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    props.onSubmit({
      ...values,
      description: values.description || "",
      maxMembers: values.maxMembers || 6,
      visibility: values.visibility || "private",
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-4 sm:items-center">
      <button type="button" className="absolute inset-0" aria-label="Close settings" onClick={props.onClose} />
      <form onSubmit={submit} className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 px-6 pt-5">
          <div className="min-w-0">
            <h2 className="text-2xl font-black text-slate-950">Settings</h2>
            <div className="mt-4 flex flex-wrap items-end gap-1 border-b border-slate-200">
              {(["general", "sharing"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTab(item)}
                  className={`relative -mb-px rounded-t-2xl border px-5 py-2.5 text-sm font-black capitalize transition ${
                    tab === item
                      ? "border-slate-200 border-b-white bg-white text-slate-950"
                      : "border-transparent bg-slate-100/80 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {item === "sharing" ? "Visibility" : "General"}
                </button>
              ))}
            </div>
          </div>
          <button type="button" onClick={props.onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {tab === "general" ? (
            <div className="grid gap-5 md:grid-cols-2">
              <ModalField label="Trip name">
                <input className="form-field" value={values.tripTitle} onChange={(event) => update("tripTitle", event.target.value)} placeholder="Trip name" />
              </ModalField>
              <ModalField label="Destination">
                <input className="form-field" value={values.destinationName} onChange={(event) => update("destinationName", event.target.value)} placeholder="Destination" />
              </ModalField>
              <ModalField label="Start date">
                <input className="form-field" type="date" value={values.startDate} onChange={(event) => update("startDate", event.target.value)} />
              </ModalField>
              <ModalField label="Days">
                <input className="form-field" type="number" min={1} max={14} value={values.days} onChange={(event) => updatePositiveNumber(event.currentTarget.value, 1, 14, (value) => update("days", value))} />
              </ModalField>
              <ModalField label="Travelers">
                <input className="form-field" type="number" min={1} max={12} value={values.travelers} onChange={(event) => updatePositiveNumber(event.currentTarget.value, 1, 12, (value) => update("travelers", value))} />
              </ModalField>
              <ModalField label="Budget (USD)">
                <input className="form-field" type="number" min={0} step={50} value={values.budgetAmount} onChange={(event) => update("budgetAmount", Number(event.target.value || 0))} />
              </ModalField>
              <ModalField label="Cities">
                <input className="form-field" value={values.tripCities} onChange={(event) => update("tripCities", event.target.value)} placeholder="Skopje, Ohrid" />
              </ModalField>
              <ModalField label="Hotel or neighborhood">
                <input className="form-field" value={values.hotelName} onChange={(event) => update("hotelName", event.target.value)} placeholder="Hotel or neighborhood" />
              </ModalField>
              <div className="md:col-span-2">
                <ModalField label="Notes">
                  <textarea className="form-field min-h-28 resize-y" value={values.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Anything important about the trip" />
                </ModalField>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                {(["private", "invite", "public"] as TripVisibility[]).map((visibility) => (
                  <button
                    key={visibility}
                    type="button"
                    onClick={() => update("visibility", visibility)}
                    className={`rounded-2xl border p-4 text-left transition ${values.visibility === visibility ? "border-blue-300 bg-blue-50 shadow-sm shadow-blue-100" : "border-slate-200 bg-white hover:border-blue-200"}`}
                  >
                    <span className="block text-sm font-black capitalize text-slate-950">{visibility === "invite" ? "Invite only" : visibility}</span>
                    <span className="mt-1 block text-sm font-semibold leading-5 text-slate-500">
                      {visibility === "private"
                        ? "Only you can open this itinerary."
                        : visibility === "invite"
                        ? "Only people with your invite link can request to join."
                        : "Visible in Community with members and group chat."}
                    </span>
                  </button>
                ))}
              </div>
              {values.visibility !== "private" && props.inviteToken && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-sm font-black text-slate-950">Invite link</p>
                  <p className="mt-1 break-all text-xs font-semibold text-slate-600">{tripInviteUrl(props.inviteToken)}</p>
                  <Button
                    type="button"
                    size="sm"
                    className="mt-3"
                    icon={copiedInvite ? <Check className="h-4 w-4" /> : undefined}
                    onClick={async () => {
                      await navigator.clipboard.writeText(tripInviteUrl(props.inviteToken));
                      setCopiedInvite(true);
                      window.setTimeout(() => setCopiedInvite(false), 1600);
                    }}
                  >
                    {copiedInvite ? "Copied" : "Copy invite link"}
                  </Button>
                </div>
              )}
              <ModalField label="Short description">
                <textarea className="form-field min-h-28 resize-y" value={values.description || ""} onChange={(event) => update("description", event.target.value)} maxLength={280} placeholder="Tell travelers what this trip is about..." />
              </ModalField>
              <ModalField label="Max travelers">
                <input className="form-field" type="number" min={2} max={20} value={values.maxMembers || 6} onChange={(event) => update("maxMembers", Number(event.target.value || 2))} />
              </ModalField>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <Button type="button" tone="ghost" onClick={props.onClose}>Cancel</Button>
          <Button type="submit">Save settings</Button>
        </div>
      </form>
    </div>
  );
}

function ModalField({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-900">{label}</span>
      {children}
    </label>
  );
}

function PlannerMembersPanel({ actionLoading, members, onDecision }: { actionLoading: string; members: TripMember[]; onDecision: (memberId: string, status: "accepted" | "declined") => void }) {
  const accepted = members.filter((member) => member.status === "accepted");
  const pending = members.filter((member) => member.status === "pending");

  return (
    <div className="grid gap-4">
      <section>
        <CrewSectionTitle />
        <div className="mt-5">
          {accepted.length === 0 ? (
            <p className="text-sm font-semibold text-slate-500">No accepted members yet.</p>
          ) : (
            <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-x-8 gap-y-8">
              {accepted.map((member) => (
                <PlannerMemberProfileCard key={member.id} member={member} />
              ))}
            </div>
          )}
        </div>
      </section>

      <Card padding="lg">
        <h2 className="text-2xl font-black text-slate-950">Join requests</h2>
        {pending.length === 0 ? (
          <p className="mt-4 text-sm font-semibold text-slate-500">No pending requests right now.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {pending.map((member) => (
              <div key={member.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <PlannerMemberRow member={member} />
                <div className="mt-3 flex gap-2">
                  <Button type="button" size="sm" disabled={actionLoading === member.id} icon={actionLoading === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} onClick={() => onDecision(member.id, "accepted")}>
                    Accept
                  </Button>
                  <Button type="button" tone="ghost" size="sm" disabled={actionLoading === member.id} icon={<X className="h-4 w-4" />} onClick={() => onDecision(member.id, "declined")}>
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function PlannerMemberProfileCard({ member }: { member: TripMember }) {
  return (
    <div className="w-36 min-w-0 text-center">
      <div className="mx-auto grid h-28 w-28 place-items-center overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
        {member.avatarUrl ? (
          <img src={member.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <UserRound className="h-8 w-8 text-slate-500" />
        )}
      </div>
      <p className="mt-3 truncate text-sm font-black text-slate-950">{member.displayName}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{member.role === "owner" ? "Host" : "Member"}</p>
    </div>
  );
}

function CrewSectionTitle() {
  return (
    <div className="flex items-center gap-4 py-2">
      <span className="h-px flex-1 bg-linear-to-r from-transparent via-blue-300/70 to-blue-500/50" />
      <h2 className="shrink-0 text-center text-2xl font-extrabold text-slate-950 md:text-3xl">The Crew</h2>
      <span className="h-px flex-1 bg-linear-to-l from-transparent via-blue-300/70 to-blue-500/50" />
    </div>
  );
}

function PlannerMemberRow({ badge, member }: { badge?: string; member: TripMember }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-100">
      {member.avatarUrl ? (
        <img src={member.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
      ) : (
        <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-white">
          <UserRound className="h-4 w-4" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-slate-950">{member.displayName}</p>
        <p className="text-xs font-semibold capitalize text-slate-500">{member.status}</p>
      </div>
      {badge && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">{badge}</span>}
    </div>
  );
}

function PlannerChatPanel({ actionLoading, hasOtherMembers, messageInput, messages, onInput, onSend }: { actionLoading: string; hasOtherMembers: boolean; messageInput: string; messages: TripMessage[]; onInput: (value: string) => void; onSend: (event: FormEvent) => void }) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-xl font-black text-slate-950">Group chat</h2>
        <p className="text-sm font-semibold text-slate-500">Coordinate plans with accepted trip members.</p>
      </div>
      <div className="max-h-[420px] space-y-3 overflow-y-auto px-5 py-4">
        {!hasOtherMembers ? (
          <p className="py-8 text-center text-sm font-semibold text-slate-500">There are no members yet. Once someone joins, this chat becomes useful for planning together.</p>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm font-semibold text-slate-500">No messages yet. Say hello to the group.</p>
        ) : messages.map((message) => (
          <div key={message.id} className={`flex gap-3 ${message.own ? "flex-row-reverse" : ""}`}>
            {message.avatarUrl ? (
              <img src={message.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-white">
                <UserRound className="h-4 w-4" />
              </span>
            )}
            <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${message.own ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-800"}`}>
              <p className="text-xs font-black opacity-80">{message.displayName}</p>
              <p className="mt-1 text-sm font-semibold leading-relaxed">{message.content}</p>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={onSend} className="flex gap-2 border-t border-slate-100 p-4">
        <input value={messageInput} onChange={(event) => onInput(event.target.value)} placeholder={hasOtherMembers ? "Write a message..." : "No members to message yet"} disabled={!hasOtherMembers} className="form-field flex-1 disabled:cursor-not-allowed disabled:bg-slate-100" />
        <Button type="submit" disabled={!hasOtherMembers || actionLoading === "message" || !messageInput.trim()} icon={actionLoading === "message" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}>
          Send
        </Button>
      </form>
    </Card>
  );
}

function resizeDays(existingDays: ItineraryDay[], nextCount: number, cityNames: string[]): ItineraryDay[] {
  const resized = existingDays.slice(0, nextCount);
  for (let index = resized.length; index < nextCount; index += 1) {
    resized.push({
      dayNumber: index + 1,
      cityName: cityNames[Math.min(index, Math.max(cityNames.length - 1, 0))],
      title: `Day ${index + 1}`,
      summary: "",
      estimatedCost: 0,
      items: [],
    });
  }

  return resized.map((day, index) => ({
    ...day,
    dayNumber: index + 1,
    title: /^Day \d+$/i.test(day.title.trim()) ? `Day ${index + 1}` : day.title,
  }));
}

type PlannerDraftSession = {
  budgetAmount: number;
  days: number;
  destinationCode?: string;
  destinationName: string;
  hotelName: string;
  originCode?: string;
  pace: TravelPace;
  returnStep: number;
  selectedFlights: FlightOffer[];
  selectedInterests: string[];
  startDate: string;
  travelers: number;
  tripCities: string;
  tripNotes: string;
  tripTitle: string;
};

function readSelectedFlightsFromSession(): FlightOffer[] {
  const raw = sessionStorage.getItem("skynode:selectedFlight");
  if (!raw) return [];
  try {
    return [JSON.parse(raw) as FlightOffer];
  } catch {
    return [];
  }
}

function readFlightsToAddFromSession(): FlightOffer[] {
  const raw = sessionStorage.getItem("skynode:selectedFlightsToAdd");

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as FlightOffer[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readPlannerDraftFromSession(): PlannerDraftSession | null {
  const raw = sessionStorage.getItem("skynode:plannerDraft");

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PlannerDraftSession;
  } catch {
    return null;
  }
}

function writePlannerDraftToSession(draft: PlannerDraftSession): void {
  sessionStorage.setItem("skynode:plannerDraft", JSON.stringify(draft));
}

function mergeFlights(existing: FlightOffer[] = [], incoming: FlightOffer[] = []): FlightOffer[] {
  const seen = new Set<string>();
  const merged: FlightOffer[] = [];

  [...existing, ...incoming].forEach((flight) => {
    const key = [
      flight.searchFrom,
      flight.searchTo,
      flight.carrier,
      flight.departureTime,
      flight.arrivalTime,
      flight.priceText,
    ].join("|");

    if (!seen.has(key)) {
      seen.add(key);
      merged.push(flight);
    }
  });

  return merged;
}

function updatePositiveNumber(rawValue: string, min: number, max: number, onChange: (value: number) => void): void {
  if (!rawValue.trim()) {
    return;
  }

  const value = Number(rawValue);
  if (!Number.isFinite(value)) {
    return;
  }

  onChange(Math.min(max, Math.max(min, Math.round(value))));
}

function nextDayCityName(current: ItineraryDay[], tripCityNames: string[]): string | undefined {
  return current.at(-1)?.cityName || tripCityNames[Math.min(current.length, Math.max(tripCityNames.length - 1, 0))];
}

function createDraftDay(dayNumber: number, cityName?: string): ItineraryDay {
  return {
    dayNumber,
    cityName,
    title: `Day ${dayNumber}`,
    summary: "",
    estimatedCost: 0,
    items: [],
  };
}

function removeDraftDay(days: ItineraryDay[], dayIndex: number): ItineraryDay[] {
  const next = days.filter((_, index) => index !== dayIndex);
  const daysToKeep = next.length > 0 ? next : emptyDays(1);

  return daysToKeep.map((day, index) => renumberDraftDay(day, index + 1));
}

function renumberDraftDay(day: ItineraryDay, dayNumber: number): ItineraryDay {
  return {
    ...day,
    dayNumber,
    title: /^Day \d+$/i.test(day.title.trim()) ? `Day ${dayNumber}` : day.title,
  };
}

function addActivityToDay(day: ItineraryDay): ItineraryDay {
  return {
    ...day,
    items: [...day.items, { timeOfDay: "09:00", title: "New activity", description: "", estimatedCost: 0 }],
  };
}

function updateDayActivity(day: ItineraryDay, itemIndex: number, patch: Partial<ItineraryItem>): ItineraryDay {
  return {
    ...day,
    items: day.items.map((item, currentIndex) => currentIndex === itemIndex ? { ...item, ...patch } : item),
  };
}

function removeDayActivity(day: ItineraryDay, itemIndex: number): ItineraryDay {
  return {
    ...day,
    items: day.items.filter((_, currentIndex) => currentIndex !== itemIndex),
  };
}

function moveDayActivity(day: ItineraryDay, fromIndex: number, toIndex: number): ItineraryDay {
  if (fromIndex === toIndex) {
    return day;
  }

  const originalTimes = day.items.map((item) => item.timeOfDay);
  const items = [...day.items];
  const [moved] = items.splice(fromIndex, 1);
  items.splice(toIndex, 0, moved);

  return {
    ...day,
    items: items.map((item, itemIndex) => ({
      ...item,
      timeOfDay: originalTimes[itemIndex] || item.timeOfDay,
    })),
  };
}

function Banner({ kind, text }: { kind: "error" | "success"; text: string }) {
  if (kind === "error") return <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">{text}</div>;
  return <div className="mb-6 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" />{text}</div>;
}

function buildFlightLocation(airportName?: string, airportCode?: string, city?: string): TripLocation | undefined {
  const name = [airportName, airportCode ? `(${airportCode})` : ""].filter(Boolean).join(" ").trim();

  if (!name) {
    return undefined;
  }

  return {
    name,
    city,
    source: "user",
  };
}

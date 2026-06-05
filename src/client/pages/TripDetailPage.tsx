import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Copy,
  Globe2,
  ImageOff,
  Loader2,
  Lock,
  MapPin,
  MessageCircle,
  Send,
  Settings2,
  Sparkles,
  Tags,
  Trash2,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { loadSavedTrip } from "../api/assistantApi";
import {
  deleteTrip,
  listPublicTrips,
  listTripMembers,
  listTripMessages,
  profileFromUser,
  requestJoinTrip,
  sendTripMessage,
  tripInviteUrl,
  updateTripMember,
  updateTripSettings,
  visibilityDescriptions,
} from "../api/tripsApi";
import { getTravelMissionStats } from "../api/travelMissionsApi";
import { useAuth } from "../auth/AuthContext";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { FilterDropdown } from "../components/FilterDropdown";
import { Button, ButtonLink, Card, EmptyState, PageShell } from "../components/ui";
import { ItineraryTimeline } from "../features/planner/ItineraryTimeline";
import { budgetCategoryDefinitions, itineraryBudgetSpend, normalizeBudgetCategories, parseMoney } from "../features/planner/plannerUtils";
import {
  BUDGET_STYLE_LABEL,
  formatItineraryCostText,
  formatTripUsd,
  hasPlannedTripBudget,
  PLANNED_BUDGET_LABEL,
  tripBudgetPlanCopy,
} from "../utils/tripCostLabels.js";
import { CommunityItineraryView } from "../features/trip-community/CommunityItineraryView";
import { TripRoomHero } from "../features/trip-community/TripRoomHero";
import { TripVisibilityBadge } from "../features/trip-community/TripVisibilityBadge";
import { supabase } from "../lib/supabaseClient";
import { tripDisplayCity, useDestinationImage } from "../utils/destinationImage";
import type { FlightOffer, SavedTripDetail, SavedTripSummary, TravelMissionStats, TripMember, TripMessage, TripVisibility, UserProfileSnapshot } from "../../shared/types.js";

type DetailTab = "overview" | "itinerary" | "members" | "chat";
type OpenTravelerProfile = {
  profile: UserProfileSnapshot;
  userId?: string;
};
type PreventableSubmitEvent = Readonly<{ preventDefault: () => void }>;

export function TripDetailPage() {
  const { tripId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [trip, setTrip] = useState<SavedTripDetail | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [messages, setMessages] = useState<TripMessage[]>([]);
  const [tab, setTab] = useState<DetailTab>("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState<OpenTravelerProfile | null>(null);
  const [settingsVisibility, setSettingsVisibility] = useState<TripVisibility>("private");
  const [settingsDescription, setSettingsDescription] = useState("");
  const [settingsMaxMembers, setSettingsMaxMembers] = useState(6);
  const [realtimeStatus, setRealtimeStatus] = useState<"connected" | "connecting" | "error" | "off">("off");
  const tripRef = useRef<SavedTripDetail | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const access = trip?.access;
  const canViewItinerary = Boolean(access?.canViewItinerary);
  const canChat = Boolean(access?.canChat);
  const canManage = Boolean(access?.canManage);
  const pendingRequests = useMemo(() => members.filter((member) => member.status === "pending"), [members]);
  const acceptedMembers = useMemo(() => members.filter((member) => member.status === "accepted"), [members]);

  useEffect(() => {
    tripRef.current = trip;
  }, [trip]);

  useEffect(() => {
    const nextTab = new URLSearchParams(location.search).get("tab");
    if (nextTab === "overview" || nextTab === "itinerary" || nextTab === "members" || nextTab === "chat") {
      setTab(nextTab);
    }
  }, [location.search]);

  function addMessages(nextMessages: TripMessage | TripMessage[]) {
    const incomingMessages = Array.isArray(nextMessages) ? nextMessages : [nextMessages];

    setMessages((current) => {
      const byId = new Map(current.map((message) => [message.id, message]));

      for (const message of incomingMessages) {
        byId.set(message.id, message);
      }

      return Array.from(byId.values()).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });
  }

  function addOrUpdateMember(member: TripMember) {
    setMembers((current) => {
      const byId = new Map(current.map((item) => [item.id, item]));
      byId.set(member.id, member);
      return Array.from(byId.values());
    });
  }

  useEffect(() => {
    if (!tripId || authLoading) {
      return;
    }

    if (!user) {
      navigate("/auth", { state: { from: `/trips/${tripId}` } });
      return;
    }

    let cancelled = false;

    async function load() {
      const hasCurrentTrip = tripRef.current?.id === tripId;
      if (!hasCurrentTrip) {
        setTrip(null);
      }
      setLoading(!hasCurrentTrip);
      setRefreshing(hasCurrentTrip);
      setError("");

      try {
        const loadedTrip = await loadSavedTrip(tripId);
        if (cancelled) {
          return;
        }

        setTrip(loadedTrip);
        setSettingsVisibility(loadedTrip.visibility || "private");
        setSettingsDescription(loadedTrip.description || "");
        setSettingsMaxMembers(loadedTrip.maxMembers || 6);

        if (loadedTrip.access?.isOwner || loadedTrip.access?.membershipStatus === "accepted") {
          setMembers(await listTripMembers(tripId));
        }

        if (loadedTrip.access?.canChat) {
          addMessages(await listTripMessages(tripId));
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load trip.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [authLoading, navigate, tripId, user]);

  useEffect(() => {
    if (tab !== "chat") {
      return;
    }

    const chatScroll = chatScrollRef.current;
    if (chatScroll) {
      chatScroll.scrollTo({ top: chatScroll.scrollHeight, behavior: "smooth" });
    }
  }, [messages, tab]);

  useEffect(() => {
    if (!canChat || !supabase) {
      setRealtimeStatus("off");
      return;
    }

    setRealtimeStatus("connecting");
    let active = true;
    const realtimeClient = supabase;
    const channel = realtimeClient
      .channel(`trip-room-${tripId}`, {
        config: {
          broadcast: {
            self: false,
          },
        },
      })
      .on("broadcast", { event: "message" }, (payload) => {
        const receivedMessage = (payload.payload as { message?: TripMessage }).message;
        if (!receivedMessage) return;

        const message = {
          ...receivedMessage,
          own: Boolean(user?.id && receivedMessage.userId === user.id),
        };
        addMessages(message);
      })
      .on("broadcast", { event: "join_request" }, (payload) => {
        if (!canManage) return;

        const member = (payload.payload as { member?: TripMember }).member;
        if (!member || member.status !== "pending" || member.userId === user?.id) {
          return;
        }

        addOrUpdateMember(member);
      })
      .subscribe((status) => {
        if (!active) return;

        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setRealtimeStatus("error");
        }
      });

    return () => {
      active = false;
      void realtimeClient.removeChannel(channel);
    };
  }, [canChat, canManage, tripId, user?.id]);

  async function handleJoinRequest() {
    if (!trip || !user) {
      return;
    }

    setActionLoading("join");
    setError("");

    try {
      await requestJoinTrip(trip.id, profileFromUser(user));
      const reloaded = await loadSavedTrip(trip.id);
      setTrip(reloaded);
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Failed to request join.");
    } finally {
      setActionLoading("");
    }
  }

  async function handleMemberDecision(memberId: string, status: "accepted" | "declined") {
    if (!trip) {
      return;
    }

    setActionLoading(memberId);

    try {
      await updateTripMember(trip.id, memberId, { status });
      setMembers(await listTripMembers(trip.id));
      const reloaded = await loadSavedTrip(trip.id);
      setTrip(reloaded);
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "Failed to update request.");
    } finally {
      setActionLoading("");
    }
  }

  async function handleSendMessage(event: PreventableSubmitEvent) {
    event.preventDefault();

    if (!trip || !user || !messageInput.trim()) {
      return;
    }

    setActionLoading("message");
    setError("");

    try {
      const message = await sendTripMessage(trip.id, {
        content: messageInput.trim(),
        profile: profileFromUser(user),
      });
      addMessages(message);
      setMessageInput("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send message.");
    } finally {
      setActionLoading("");
    }
  }

  async function handleSaveSettings() {
    if (!trip) {
      return;
    }

    setActionLoading("settings");
    setError("");

    try {
      const updated = await updateTripSettings(trip.id, {
        visibility: settingsVisibility,
        description: settingsDescription,
        maxMembers: settingsMaxMembers,
      });
      setTrip(updated);
      setSettingsOpen(false);
    } catch (settingsError) {
      setError(settingsError instanceof Error ? settingsError.message : "Failed to update settings.");
    } finally {
      setActionLoading("");
    }
  }

  async function copyInviteLink() {
    if (!trip?.inviteToken) {
      return;
    }

    await navigator.clipboard.writeText(tripInviteUrl(trip.inviteToken));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function handleDeleteTrip() {
    if (!trip) {
      return;
    }

    setActionLoading("delete");
    setError("");

    try {
      await deleteTrip(trip.id);
      navigate("/trip-library");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete trip.");
      setDeleteOpen(false);
    } finally {
      setActionLoading("");
    }
  }

  const isPersonalSavedTrip = Boolean(trip?.visibility === "private" && access?.isOwner);
  const isPrivateTrip = Boolean(trip?.visibility === "private");
  const cityName = trip ? tripDisplayCity(trip) : "";
  const routeLabel = trip?.cities?.length
    ? trip.cities.map((city) => city.name).join(" -> ")
    : cityName;
  const spotsLeft = Math.max(0, (trip?.maxMembers || 8) - (trip?.memberCount || 1));

  const tabs: Array<{ id: DetailTab; label: string; icon: typeof Users; hidden?: boolean }> = [
    { id: "overview", label: "Overview", icon: MapPin },
    { id: "itinerary", label: "Itinerary", icon: CalendarDays },
    { id: "members", label: "Members", icon: Users, hidden: isPrivateTrip || (!canManage && access?.membershipStatus !== "accepted") },
    { id: "chat", label: "Chat", icon: MessageCircle, hidden: isPrivateTrip || !canChat },
  ];

  if ((loading || authLoading) && !trip) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <PageShell>
          <div className="h-80 animate-pulse rounded-3xl bg-white shadow-xl" />
        </PageShell>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <PageShell>
          <EmptyState title="Trip not found." action={<Button type="button" onClick={() => navigate("/trip-library")}>Back to trips</Button>}>
            {error || "This trip may be private or you may not have access."}
          </EmptyState>
        </PageShell>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <PageShell>
        <div className="mb-5">
          <button
            type="button"
            onClick={() => navigate(isPersonalSavedTrip ? "/trip-library" : "/explore-trips")}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 no-underline hover:text-blue-600"
          >
            <ArrowLeft className="h-4 w-4" />
            {isPersonalSavedTrip ? "Back to trip library" : "Back to community"}
          </button>
        </div>

        {refreshing && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white px-3 py-1.5 text-xs font-black text-sky-700 shadow-sm">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Syncing trip
          </div>
        )}

        <TripRoomHero
          trip={trip}
          eyebrow={isPersonalSavedTrip ? `${cityName} · Your trip` : `${cityName} · Community trip`}
          title={trip.title}
          description={heroDescription(trip, isPersonalSavedTrip, routeLabel, spotsLeft)}
          actions={
            <TripDetailHeroActions
              access={access}
              actionLoading={actionLoading}
              canManage={canManage}
              copied={copied}
              isPersonalSavedTrip={isPersonalSavedTrip}
              onCopyInvite={copyInviteLink}
              onDelete={() => setDeleteOpen(true)}
              onJoin={handleJoinRequest}
              onSettings={() => setSettingsOpen(true)}
              trip={trip}
            />
          }
        >
          <TripDetailTabs activeTab={tab} onChange={setTab} tabs={tabs} />
        </TripRoomHero>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
            {error}
          </div>
        )}

        {tab === "overview" && isPersonalSavedTrip && (
          <PersonalTripOverview routeLabel={routeLabel} trip={trip} />
        )}

        {tab === "overview" && !isPersonalSavedTrip && (
          <CommunityTripOverview
            acceptedMembers={acceptedMembers}
            canManage={canManage}
            canViewItinerary={canViewItinerary}
            cityName={cityName}
            onOpenProfile={setProfileOpen}
            onReviewRequests={() => setTab("members")}
            pendingRequests={pendingRequests}
            trip={trip}
          />
        )}

        {tab === "itinerary" && (
          <TripItineraryTab canViewItinerary={canViewItinerary} isPersonalSavedTrip={isPersonalSavedTrip} trip={trip} />
        )}

        {tab === "members" && !isPrivateTrip && (
          <TripMembersTab
            acceptedMembers={acceptedMembers}
            actionLoading={actionLoading}
            canManage={canManage}
            onDecision={handleMemberDecision}
            onOpenProfile={setProfileOpen}
            pendingRequests={pendingRequests}
          />
        )}

        {tab === "chat" && canChat && !isPrivateTrip && (
          <TripChatTab
            actionLoading={actionLoading}
            chatScrollRef={chatScrollRef}
            messageInput={messageInput}
            messages={messages}
            onInput={setMessageInput}
            onOpenProfile={setProfileOpen}
            onSend={handleSendMessage}
            realtimeStatus={realtimeStatus}
          />
        )}
      </PageShell>

      {settingsOpen && (
        <TripSettingsModal
          actionLoading={actionLoading}
          description={settingsDescription}
          maxMembers={settingsMaxMembers}
          onClose={() => setSettingsOpen(false)}
          onDelete={() => { setSettingsOpen(false); setDeleteOpen(true); }}
          onDescriptionChange={setSettingsDescription}
          onMaxMembersChange={setSettingsMaxMembers}
          onSave={handleSaveSettings}
          onVisibilityChange={setSettingsVisibility}
          visibility={settingsVisibility}
        />
      )}

      {deleteOpen && (
        <TripDeleteModal
          actionLoading={actionLoading}
          onClose={() => setDeleteOpen(false)}
          onDelete={handleDeleteTrip}
          title={trip.title}
        />
      )}

      {profileOpen && (
        <TravelerProfileModal profile={profileOpen.profile} userId={profileOpen.userId} onClose={() => setProfileOpen(null)} />
      )}

      <Footer />
    </div>
  );
}

function heroDescription(trip: SavedTripDetail, isPersonalSavedTrip: boolean, routeLabel: string, spotsLeft: number): string {
  if (isPersonalSavedTrip) {
    return `${trip.days} days from ${formatTripDate(trip.startDate)} · ${routeLabel} · ${formatItineraryCostText(trip.estimatedTotalCost)}`;
  }

  return `${trip.days} days from ${formatTripDate(trip.startDate)} · ${spotsLeft} spots left · Hosted by ${trip.ownerName || "Traveler"}`;
}

type TripHeroActionsProps = Readonly<{
  access: SavedTripDetail["access"] | undefined;
  actionLoading: string;
  canManage: boolean;
  copied: boolean;
  isPersonalSavedTrip: boolean;
  onCopyInvite: () => Promise<void>;
  onDelete: () => void;
  onJoin: () => Promise<void>;
  onSettings: () => void;
  trip: SavedTripDetail;
}>;

function TripDetailHeroActions(props: TripHeroActionsProps) {
  return (
    <>
      {props.trip.visibility && (
        <TripVisibilityBadge visibility={props.trip.visibility} className="bg-white/10 text-white ring-white/20" />
      )}
      {props.isPersonalSavedTrip && <ButtonLink to="/planner" tone="light" size="lg">Edit in planner</ButtonLink>}
      <TripManagementActions {...props} />
      {!props.canManage && props.access?.membershipStatus === "none" && props.trip.visibility !== "private" && (
        <Button
          type="button"
          disabled={props.actionLoading === "join"}
          icon={props.actionLoading === "join" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
          onClick={() => void props.onJoin()}
        >
          Request to join
        </Button>
      )}
      {props.access?.membershipStatus === "pending" && (
        <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-black text-white">
          Request pending approval
        </span>
      )}
    </>
  );
}

function TripManagementActions(props: TripHeroActionsProps) {
  if (!props.canManage) {
    return null;
  }

  return (
    <>
      {props.isPersonalSavedTrip ? (
        <Button type="button" tone="light" icon={<Settings2 className="h-4 w-4" />} onClick={props.onSettings}>
          Sharing settings
        </Button>
      ) : (
        <>
          <Button type="button" tone="light" icon={props.copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} onClick={() => void props.onCopyInvite()}>
            {props.copied ? "Copied" : "Copy invite link"}
          </Button>
          <Button type="button" tone="ghost" className="bg-white text-slate-900" icon={<Settings2 className="h-4 w-4" />} onClick={props.onSettings}>
            Settings
          </Button>
        </>
      )}
      <Button type="button" tone="danger" icon={<Trash2 className="h-4 w-4" />} className="rounded-full" onClick={props.onDelete}>
        Delete trip
      </Button>
    </>
  );
}

type TripDetailTabsProps = Readonly<{
  activeTab: DetailTab;
  onChange: (tab: DetailTab) => void;
  tabs: Array<{ id: DetailTab; label: string; icon: typeof Users; hidden?: boolean }>;
}>;

function TripDetailTabs({ activeTab, onChange, tabs }: TripDetailTabsProps) {
  return (
    <div className="mt-7 inline-flex max-w-full flex-wrap rounded-full border border-white/10 bg-slate-950/40 p-1">
      {tabs.filter((item) => !item.hidden).map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${activeTab === id ? "bg-white text-slate-900" : "text-slate-300 hover:text-white"}`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}

function PersonalTripOverview({ routeLabel, trip }: Readonly<{ routeLabel: string; trip: SavedTripDetail }>) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <Card padding="lg">
        <h2 className="text-2xl font-black text-slate-950">Your trip plan</h2>
        <p className="mt-2 text-sm font-semibold text-slate-500">Private saved itinerary. Open the planner to edit days and activities.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <OverviewStat icon={MapPin} label="Destination" value={routeLabel} />
          <OverviewStat icon={CalendarDays} label="Dates" value={`${formatTripDate(trip.startDate)} · ${trip.days} days`} />
          <OverviewStat icon={Wallet} label={BUDGET_STYLE_LABEL} value={trip.budget} />
          {hasPlannedTripBudget(trip) && (
            <OverviewStat icon={Wallet} label={PLANNED_BUDGET_LABEL} value={formatTripUsd(trip.budgetAmount!)} />
          )}
          <OverviewStat icon={Sparkles} label="Pace" value={trip.pace} />
        </div>
        <TripBudgetPlan trip={trip} />
        {trip.notes && (
          <div className="mt-6 rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Notes</p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">{trip.notes}</p>
          </div>
        )}
      </Card>
      <Card padding="lg">
        <h3 className="text-lg font-black text-slate-950">Interests</h3>
        <TripTagList tags={trip.tags?.length ? trip.tags : trip.interests} tone="slate" />
        <ButtonLink to="/planner" tone="secondary" size="lg" className="mt-6 w-full">Continue in planner</ButtonLink>
      </Card>
    </div>
  );
}

type CommunityTripOverviewProps = Readonly<{
  acceptedMembers: TripMember[];
  canManage: boolean;
  canViewItinerary: boolean;
  cityName: string;
  onOpenProfile: (profile: OpenTravelerProfile) => void;
  onReviewRequests: () => void;
  pendingRequests: TripMember[];
  trip: SavedTripDetail;
}>;

function CommunityTripOverview(props: CommunityTripOverviewProps) {
  const tags = [props.trip.budget, props.trip.pace, ...(props.trip.tags?.length ? props.trip.tags : props.trip.interests)];

  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
      <Card padding="lg">
        <h2 className="text-2xl font-black text-slate-950">About this trip</h2>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
          {props.trip.description || `A ${props.trip.pace} ${props.trip.days}-day trip around ${props.cityName} with a ${props.trip.budget} budget focus.`}
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <OverviewStat icon={MapPin} label="Destination" value={props.cityName} />
          <OverviewStat icon={CalendarDays} label="Starts" value={formatTripDate(props.trip.startDate)} />
          <OverviewStat icon={Users} label="Group size" value={`${props.trip.memberCount || 1}/${props.trip.maxMembers || 8} travelers`} />
          {hasPlannedTripBudget(props.trip) && (
            <OverviewStat icon={Wallet} label={PLANNED_BUDGET_LABEL} value={formatTripUsd(props.trip.budgetAmount!)} />
          )}
          <OverviewStat icon={Wallet} label={BUDGET_STYLE_LABEL} value={props.trip.budget} />
        </div>
        <TripBudgetPlan trip={props.trip} />
        <TripTagList tags={tags} tone="blue" />
        {!props.canViewItinerary && <LockedItineraryNotice />}
      </Card>
      <CommunityTripSidebar {...props} />
    </div>
  );
}

function TripBudgetPlan({ trip }: Readonly<{ trip: SavedTripDetail }>) {
  const usesPlannedBudget = hasPlannedTripBudget(trip);
  const totalBudget = usesPlannedBudget ? trip.budgetAmount! : trip.estimatedTotalCost;
  const planCopy = tripBudgetPlanCopy(trip);
  const categories = normalizeBudgetCategories(trip.budgetCategories, totalBudget);
  const flightSpend = selectedFlightTotal(trip.selectedFlights || (trip.selectedFlight ? [trip.selectedFlight] : []));
  const itinerarySpend = itineraryBudgetSpend(trip.itinerary.days);
  const hotelSpend = (trip.hotels || []).reduce((sum, hotel) => sum + (hotel.priceEstimate || 0), 0) + itinerarySpend.hotels;
  const spendByCategory: Record<string, number> = {
    flights: flightSpend + itinerarySpend.flights,
    hotels: hotelSpend,
    activities: itinerarySpend.activities,
    other: (trip.expenseBreakdown?.food || 0) + (trip.expenseBreakdown?.other || 0) + itinerarySpend.other,
  };

  return (
    <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-black text-slate-950">{planCopy.title}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{planCopy.description}</p>
        </div>
        <p className="text-sm font-black text-blue-600">{planCopy.totalLabel}</p>
      </div>
      <div className="mt-4 space-y-3">
        {categories.map((category, index) => {
          const definition = budgetCategoryDefinitions[index];
          const spent = spendByCategory[category.id] || 0;
          const remaining = category.amount - spent;
          const percent = totalBudget > 0 ? Math.min(100, Math.round((category.amount / totalBudget) * 100)) : 0;
          const unusedPercent = category.amount > 0
            ? Math.max(0, Math.min(100, Math.round(((category.amount - spent) / category.amount) * 100)))
            : 0;

          return (
            <div key={category.id} className="rounded-2xl bg-white p-3 ring-1 ring-slate-100">
              <div className="mb-2 flex items-center justify-between gap-3 text-xs font-black text-slate-700">
                <span className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${definition.color}`} />
                  {definition.label}
                </span>
                <span>${category.amount.toLocaleString()}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div className={`relative h-full overflow-hidden rounded-full ${definition.softColor}`} style={{ width: `${percent}%` }}>
                  <div className={`absolute inset-y-0 left-0 rounded-full ${definition.color}`} style={{ width: `${unusedPercent}%` }} />
                </div>
              </div>
              <p className={`mt-2 text-xs font-bold ${remaining >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {remaining >= 0 ? `$${remaining.toLocaleString()} remaining` : `$${Math.abs(remaining).toLocaleString()} over`}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function selectedFlightTotal(flights: FlightOffer[]): number {
  return flights.reduce((sum, flight) => sum + parseMoney(flight.priceText), 0);
}

function TripTagList({ tags, tone }: Readonly<{ tags: string[]; tone: "blue" | "slate" }>) {
  const toneClass = tone === "blue" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600";

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span key={tag} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black capitalize ${toneClass}`}>
          <Tags className="h-3 w-3" />
          {tag}
        </span>
      ))}
    </div>
  );
}

function LockedItineraryNotice() {
  return (
    <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-800">
      <Lock className="mt-0.5 h-4 w-4 shrink-0" />
      The full day-by-day itinerary unlocks after the host accepts your join request.
    </div>
  );
}

function CommunityTripSidebar(props: CommunityTripOverviewProps) {
  return (
    <div className="space-y-4">
      <Card padding="lg">
        <h3 className="text-lg font-black text-slate-950">Trip host</h3>
        <div className="mt-4 flex items-center gap-3">
          {props.trip.ownerAvatar ? (
            <img src={props.trip.ownerAvatar} alt="" className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-900 text-white">
              <UserRound className="h-5 w-5" />
            </span>
          )}
          <div>
            <p className="font-black text-slate-950">{props.trip.ownerName || "Traveler"}</p>
            <p className="text-sm font-semibold text-slate-500">Organizer</p>
          </div>
        </div>
      </Card>
      {props.canManage && props.pendingRequests.length > 0 && (
        <Card padding="lg" className="border-blue-100 bg-blue-50/70">
          <p className="text-sm font-black text-blue-800">{props.pendingRequests.length} traveler(s) want to join</p>
          <Button type="button" tone="secondary" size="sm" className="mt-3" onClick={props.onReviewRequests}>Review requests</Button>
        </Card>
      )}
      {props.acceptedMembers.length > 0 && (
        <Card padding="lg">
          <h3 className="text-lg font-black text-slate-950">Group</h3>
          <div className="mt-4 space-y-3">
            {props.acceptedMembers.slice(0, 4).map((member) => (
              <MemberRow key={member.id} member={member} badge={member.role === "owner" ? "Host" : undefined} onOpenProfile={() => props.onOpenProfile({ profile: memberProfile(member), userId: member.userId })} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function TripItineraryTab({ canViewItinerary, isPersonalSavedTrip, trip }: Readonly<{ canViewItinerary: boolean; isPersonalSavedTrip: boolean; trip: SavedTripDetail }>) {
  if (!canViewItinerary) {
    return (
      <EmptyState title="Itinerary locked">
        Request to join this trip to see the day-by-day plan after approval.
      </EmptyState>
    );
  }

  if (!isPersonalSavedTrip) {
    return <CommunityItineraryView days={trip.itinerary.days} startDate={trip.itinerary.startDate} />;
  }

  return (
    <ItineraryTimeline
      days={trip.itinerary.days}
      boundaryCities={trip.cities?.map((city) => city.name)}
      destinationName={trip.itinerary.destinationName}
      startDate={trip.itinerary.startDate}
      editing={false}
      addActivity={() => undefined}
      addDay={() => undefined}
      moveActivity={() => undefined}
      removeActivity={() => undefined}
      removeDay={() => undefined}
      updateActivity={() => undefined}
      updateDay={() => undefined}
    />
  );
}

type TripMembersTabProps = Readonly<{
  acceptedMembers: TripMember[];
  actionLoading: string;
  canManage: boolean;
  onDecision: (memberId: string, status: "accepted" | "declined") => Promise<void>;
  onOpenProfile: (profile: OpenTravelerProfile) => void;
  pendingRequests: TripMember[];
}>;

function TripMembersTab(props: TripMembersTabProps) {
  return (
    <div className="grid gap-4">
      <section>
        <CrewSectionTitle />
        <div className="mt-5">
          {props.acceptedMembers.length === 0 ? (
            <p className="text-sm font-semibold text-slate-500">No accepted members yet.</p>
          ) : (
            <div className="mx-auto flex max-w-4xl flex-wrap justify-center gap-x-8 gap-y-8">
              {props.acceptedMembers.map((member) => (
                <MemberProfileCard key={member.id} member={member} onOpenProfile={() => props.onOpenProfile({ profile: memberProfile(member), userId: member.userId })} />
              ))}
            </div>
          )}
        </div>
      </section>
      {props.canManage && <JoinRequestsCard {...props} />}
    </div>
  );
}

function JoinRequestsCard(props: TripMembersTabProps) {
  return (
    <Card padding="lg">
      <h2 className="text-2xl font-black text-slate-950">Join requests</h2>
      {props.pendingRequests.length === 0 ? (
        <p className="mt-4 text-sm font-semibold text-slate-500">No pending requests right now.</p>
      ) : (
        <div className="mt-5 space-y-3">
          {props.pendingRequests.map((member) => (
            <div key={member.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <MemberRow member={member} onOpenProfile={() => props.onOpenProfile({ profile: memberProfile(member), userId: member.userId })} />
              <div className="mt-3 flex gap-2">
                <Button type="button" size="sm" disabled={props.actionLoading === member.id} icon={props.actionLoading === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} onClick={() => void props.onDecision(member.id, "accepted")}>
                  Accept
                </Button>
                <Button type="button" tone="ghost" size="sm" disabled={props.actionLoading === member.id} icon={<X className="h-4 w-4" />} onClick={() => void props.onDecision(member.id, "declined")}>
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

type TripChatTabProps = Readonly<{
  actionLoading: string;
  chatScrollRef: RefObject<HTMLDivElement | null>;
  messageInput: string;
  messages: TripMessage[];
  onInput: (value: string) => void;
  onOpenProfile: (profile: OpenTravelerProfile) => void;
  onSend: (event: PreventableSubmitEvent) => void;
  realtimeStatus: "connected" | "connecting" | "error" | "off";
}>;

function TripChatTab(props: TripChatTabProps) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-xl font-black text-slate-950">Group chat</h2>
        <p className="text-sm font-semibold text-slate-500">Coordinate plans with accepted trip members.</p>
        {props.realtimeStatus === "error" && (
          <p className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700">
            Live updates are not connected. New messages may require refresh until Supabase Realtime reconnects.
          </p>
        )}
      </div>
      <div ref={props.chatScrollRef} className="max-h-[420px] space-y-3 overflow-y-auto px-5 py-4">
        {props.messages.length === 0 ? (
          <p className="py-8 text-center text-sm font-semibold text-slate-500">No messages yet. Say hello to the group.</p>
        ) : props.messages.map((message) => (
          <TripChatMessage key={message.id} message={message} onOpenProfile={props.onOpenProfile} />
        ))}
      </div>
      <form onSubmit={props.onSend} className="flex gap-2 border-t border-slate-100 p-4">
        <input value={props.messageInput} onChange={(event) => props.onInput(event.target.value)} placeholder="Write a message..." className="form-field flex-1" />
        <Button type="submit" disabled={props.actionLoading === "message" || !props.messageInput.trim()} icon={props.actionLoading === "message" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}>
          Send
        </Button>
      </form>
    </Card>
  );
}

function TripChatMessage({ message, onOpenProfile }: Readonly<{ message: TripMessage; onOpenProfile: (profile: OpenTravelerProfile) => void }>) {
  return (
    <div className={`flex gap-3 ${message.own ? "flex-row-reverse" : ""}`}>
      <button type="button" className="shrink-0" onClick={() => onOpenProfile({ profile: message.profile || { displayName: message.displayName, avatarUrl: message.avatarUrl }, userId: message.userId })} title={`View ${message.displayName}`}>
        {message.avatarUrl ? (
          <img src={message.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-transparent transition hover:ring-sky-200" />
        ) : (
          <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-white ring-2 ring-transparent transition hover:ring-sky-200">
            <UserRound className="h-4 w-4" />
          </span>
        )}
      </button>
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${message.own ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-800"}`}>
        <p className="text-xs font-black opacity-80">{message.displayName}</p>
        <p className="mt-1 text-sm font-semibold leading-relaxed">{message.content}</p>
      </div>
    </div>
  );
}

type TripSettingsModalProps = Readonly<{
  actionLoading: string;
  description: string;
  maxMembers: number;
  onClose: () => void;
  onDelete: () => void;
  onDescriptionChange: (value: string) => void;
  onMaxMembersChange: (value: number) => void;
  onSave: () => Promise<void>;
  onVisibilityChange: (value: TripVisibility) => void;
  visibility: TripVisibility;
}>;

function TripSettingsModal(props: TripSettingsModalProps) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 p-4 sm:items-center">
      <button type="button" className="absolute inset-0" aria-label="Close settings" onClick={props.onClose} />
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="text-2xl font-black text-slate-950">Trip settings</h2>
        <div className="mt-5 space-y-4">
          <FilterDropdown
            label="Visibility"
            value={props.visibility}
            options={[
              { value: "private", label: "Private", description: visibilityDescriptions.private },
              { value: "invite", label: "Invite only", description: visibilityDescriptions.invite },
              { value: "public", label: "Public", description: visibilityDescriptions.public },
            ]}
            onChange={(value) => props.onVisibilityChange(value as TripVisibility)}
          />
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-slate-600">Description</span>
            <textarea value={props.description} onChange={(event) => props.onDescriptionChange(event.target.value)} rows={3} className="form-field min-h-[96px]" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-slate-600">Community capacity</span>
            <input type="number" min={2} max={20} value={props.maxMembers} onChange={(event) => props.onMaxMembersChange(Number(event.target.value) || 2)} className="form-field" />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" tone="ghost" onClick={props.onClose}>Cancel</Button>
          <Button type="button" disabled={props.actionLoading === "settings"} onClick={() => void props.onSave()}>
            {props.actionLoading === "settings" ? "Saving..." : "Save settings"}
          </Button>
        </div>
        <div className="mt-8 rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="text-sm font-black text-red-800">Delete this trip</p>
          <p className="mt-1 text-sm font-semibold text-red-700">
            Permanently removes the itinerary, members, and chat for trips you created.
          </p>
          <Button type="button" tone="danger" size="sm" className="mt-3" icon={<Trash2 className="h-4 w-4" />} onClick={props.onDelete}>
            Delete trip
          </Button>
        </div>
      </div>
    </div>
  );
}

function TripDeleteModal({ actionLoading, onClose, onDelete, title }: Readonly<{ actionLoading: string; onClose: () => void; onDelete: () => Promise<void>; title: string }>) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/50 p-4 sm:items-center">
      <button type="button" className="absolute inset-0" aria-label="Close delete confirmation" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="text-2xl font-black text-slate-950">Delete this trip?</h2>
        <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
          <span className="font-black text-slate-900">{title}</span> will be permanently deleted, including the itinerary, join requests, members, and group chat.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" tone="ghost" onClick={onClose}>Cancel</Button>
          <Button type="button" tone="danger" disabled={actionLoading === "delete"} icon={actionLoading === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} onClick={() => void onDelete()}>
            {actionLoading === "delete" ? "Deleting..." : "Delete permanently"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function memberProfile(member: TripMember): UserProfileSnapshot {
  return member.profile || { displayName: member.displayName, avatarUrl: member.avatarUrl };
}

function formatTripDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function OverviewStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-blue-600">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</p>
      </div>
      <p className="mt-2 text-sm font-black capitalize text-slate-900">{value}</p>
    </div>
  );
}

function MemberRow({ member, badge, onOpenProfile }: { member: TripMember; badge?: string; onOpenProfile?: () => void }) {
  return (
    <button type="button" onClick={onOpenProfile} className="flex w-full items-center gap-3 rounded-2xl p-1 text-left transition hover:bg-slate-50">
      {member.avatarUrl ? (
        <img src={member.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
      ) : (
        <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-white">
          <UserRound className="h-4 w-4" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-black text-slate-950">{member.displayName}</p>
        <p className="text-xs font-semibold capitalize text-slate-500">{member.role}</p>
      </div>
      {badge && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{badge}</span>}
    </button>
  );
}

function MemberProfileCard({ member, onOpenProfile }: { member: TripMember; onOpenProfile?: () => void }) {
  return (
    <div className="w-36 min-w-0 p-3 text-center">
      <button type="button" onClick={onOpenProfile} className="mx-auto grid h-28 w-28 place-items-center overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200 transition hover:ring-blue-300" title={`View ${member.displayName}`}>
        {member.avatarUrl ? (
          <img src={member.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <UserRound className="h-8 w-8 text-slate-500" />
        )}
      </button>
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

function TravelerProfileModal({ profile, userId, onClose }: { profile: UserProfileSnapshot; userId?: string; onClose: () => void }) {
  const age = profile.birthDate ? profileAge(profile.birthDate) : "";
  const [trips, setTrips] = useState<SavedTripSummary[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(Boolean(userId));
  const [missionStats, setMissionStats] = useState<TravelMissionStats | null>(null);
  const [loadingMissionStats, setLoadingMissionStats] = useState(Boolean(userId));

  useEffect(() => {
    let cancelled = false;

    async function loadTrips() {
      if (!userId) {
        setTrips([]);
        setLoadingTrips(false);
        return;
      }

      setLoadingTrips(true);
      try {
        const publicTrips = await listPublicTrips({ ownerId: userId, includePast: true });
        if (!cancelled) setTrips(publicTrips.slice(0, 4));
      } catch {
        if (!cancelled) setTrips([]);
      } finally {
        if (!cancelled) setLoadingTrips(false);
      }
    }

    void loadTrips();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    async function loadMissionStats() {
      if (!userId) {
        setMissionStats(null);
        setLoadingMissionStats(false);
        return;
      }

      setLoadingMissionStats(true);
      try {
        const stats = await getTravelMissionStats(userId);
        if (!cancelled) setMissionStats(stats);
      } catch {
        if (!cancelled) setMissionStats(null);
      } finally {
        if (!cancelled) setLoadingMissionStats(false);
      }
    }

    void loadMissionStats();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-4 sm:items-center">
      <button type="button" className="absolute inset-0" aria-label="Close profile" onClick={onClose} />
      <div className="relative max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="bg-linear-to-br from-sky-100 via-white to-cyan-50 p-6">
          <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/80 p-2 text-slate-500 shadow-sm hover:text-slate-900" aria-label="Close profile">
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-4 pr-10">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="h-24 w-24 rounded-3xl object-cover shadow-sm" />
            ) : (
              <div className="grid h-24 w-24 place-items-center rounded-3xl bg-slate-900 text-white shadow-sm">
                <UserRound className="h-9 w-9" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-black text-slate-950">
                {profile.displayName}{age ? `, ${age}` : ""}
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-sm font-black text-slate-700 ring-1 ring-slate-200">
                  <MapPin className="h-4 w-4" />
                  {profile.homeCity || "City not added"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-sm font-black text-cyan-800 ring-1 ring-cyan-100">
                  <Globe2 className="h-4 w-4" />
                  {loadingMissionStats ? "Loading..." : `${missionStats?.unlockedCountries || 0}/${missionStats?.totalCountries || 195} countries`}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="max-h-[58vh] overflow-y-auto p-6">
          <section>
            <p className="text-xs font-black uppercase tracking-widest text-sky-600">Bio</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              {profile.bio || "This traveler has not added a bio yet."}
            </p>
          </section>

          <section className="mt-6">
            <p className="text-xs font-black uppercase tracking-widest text-sky-600">Interests</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(profile.interests?.length ? profile.interests : ["No interests added"]).slice(0, 10).map((interest) => (
                <span key={interest} className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-black text-sky-800 ring-1 ring-sky-100">
                  {interest}
                </span>
              ))}
            </div>
          </section>

          <section className="mt-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-sky-600">Public trips</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">Trips this member created publicly.</p>
              </div>
              {trips.length > 0 && <span className="text-xs font-black text-slate-400">{trips.length}</span>}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {loadingTrips && [1, 2].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl bg-slate-100" />)}
              {!loadingTrips && trips.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500 sm:col-span-2">
                  No public created trips yet.
                </div>
              )}
              {!loadingTrips && trips.map((trip) => <TravelerProfileTripCard key={trip.id} trip={trip} />)}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function TravelerProfileTripCard({ trip }: { trip: SavedTripSummary }) {
  const imageUrl = useDestinationImage(trip.destinationName);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-100 bg-white text-slate-950 shadow-sm">
      <div className="relative h-24 overflow-hidden bg-slate-100">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center bg-slate-100 text-slate-400">
            <ImageOff className="h-6 w-6" />
          </div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-slate-950/50 via-transparent to-transparent" />
      </div>
      <div className="p-3">
        <p className="line-clamp-1 text-sm font-black text-slate-950">{trip.title}</p>
        <p className="mt-1 flex items-center gap-1 text-xs font-bold text-slate-500">
          <MapPin className="h-3.5 w-3.5" />
          {trip.destinationName}
        </p>
        <p className="mt-2 text-xs font-black capitalize text-sky-700">
          {trip.days} days · {trip.pace}
        </p>
      </div>
    </article>
  );
}

function tripMessageFromRealtimeRow(row: Record<string, unknown>, currentUserId?: string): TripMessage {
  const displayName = stringValue(row.display_name) || "Traveler";
  const avatarUrl = stringValue(row.avatar_url);
  const profile = profileSnapshotFromRealtimeValue(row.profile, displayName, avatarUrl);
  const userId = stringValue(row.user_id);

  return {
    id: stringValue(row.id),
    tripId: stringValue(row.trip_id),
    userId,
    displayName,
    avatarUrl: avatarUrl || undefined,
    profile,
    content: stringValue(row.content),
    createdAt: stringValue(row.created_at),
    own: Boolean(currentUserId && userId === currentUserId),
  };
}

function tripMemberFromRealtimeRow(row: Record<string, unknown>): TripMember {
  const displayName = stringValue(row.display_name) || "Traveler";
  const avatarUrl = stringValue(row.avatar_url);

  return {
    id: stringValue(row.id),
    userId: stringValue(row.user_id),
    role: stringValue(row.role) === "owner" ? "owner" : "member",
    status: normalizeMemberStatus(row.status),
    displayName,
    avatarUrl: avatarUrl || undefined,
    profile: profileSnapshotFromRealtimeValue(row.profile, displayName, avatarUrl),
    createdAt: stringValue(row.created_at),
  };
}

function profileSnapshotFromRealtimeValue(value: unknown, displayName: string, avatarUrl: string): UserProfileSnapshot {
  const profile = typeof value === "object" && value ? value as Record<string, unknown> : {};
  const interests = Array.isArray(profile.interests)
    ? profile.interests.filter((item): item is string => typeof item === "string")
    : undefined;

  return {
    displayName: stringValue(profile.displayName) || displayName,
    avatarUrl: stringValue(profile.avatarUrl) || avatarUrl || undefined,
    birthDate: stringValue(profile.birthDate) || undefined,
    homeCity: stringValue(profile.homeCity) || undefined,
    bio: stringValue(profile.bio) || undefined,
    interests,
  };
}

function normalizeMemberStatus(value: unknown): TripMember["status"] {
  return value === "accepted" || value === "declined" ? value : "pending";
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function profileAge(value: string): string {
  const birthDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age > 0 ? String(age) : "";
}

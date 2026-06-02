import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CalendarDays,
  Check,
  Copy,
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
import { useAuth } from "../auth/AuthContext";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { FilterDropdown } from "../components/FilterDropdown";
import { Button, ButtonLink, Card, EmptyState, PageShell } from "../components/ui";
import { ItineraryTimeline } from "../features/planner/ItineraryTimeline";
import { CommunityItineraryView } from "../features/trip-community/CommunityItineraryView";
import { TripRoomHero } from "../features/trip-community/TripRoomHero";
import { TripVisibilityBadge } from "../features/trip-community/TripVisibilityBadge";
import { tripDisplayCity } from "../utils/destinationImage";
import type { SavedTripDetail, TripMember, TripMessage, TripVisibility, UserProfileSnapshot } from "../../shared/types.js";

type DetailTab = "overview" | "itinerary" | "members" | "chat";

export function TripDetailPage() {
  const { tripId = "" } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [trip, setTrip] = useState<SavedTripDetail | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [messages, setMessages] = useState<TripMessage[]>([]);
  const [tab, setTab] = useState<DetailTab>("overview");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState<UserProfileSnapshot | null>(null);
  const [settingsVisibility, setSettingsVisibility] = useState<TripVisibility>("private");
  const [settingsDescription, setSettingsDescription] = useState("");
  const [settingsMaxMembers, setSettingsMaxMembers] = useState(6);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const access = trip?.access;
  const canViewItinerary = Boolean(access?.canViewItinerary);
  const canChat = Boolean(access?.canChat);
  const canManage = Boolean(access?.canManage);
  const pendingRequests = useMemo(() => members.filter((member) => member.status === "pending"), [members]);
  const acceptedMembers = useMemo(() => members.filter((member) => member.status === "accepted"), [members]);

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
      setLoading(true);
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
          setMessages(await listTripMessages(tripId));
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load trip.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
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

    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, tab]);

  useEffect(() => {
    if (!canChat || tab !== "chat") {
      return;
    }

    const timer = window.setInterval(() => {
      void listTripMessages(tripId)
        .then(setMessages)
        .catch(() => undefined);
    }, 2000);

    return () => window.clearInterval(timer);
  }, [canChat, tab, tripId]);

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

  async function handleSendMessage(event: FormEvent) {
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
      setMessages((current) => [...current, message]);
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
      navigate("/trips");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete trip.");
      setDeleteOpen(false);
    } finally {
      setActionLoading("");
    }
  }

  const isPersonalSavedTrip = trip?.visibility === "private" && access?.isOwner;
  const cityName = trip ? tripDisplayCity(trip) : "";
  const routeLabel = trip?.cities?.length
    ? trip.cities.map((city) => city.name).join(" -> ")
    : cityName;
  const spotsLeft = Math.max(0, (trip?.maxMembers || 8) - (trip?.memberCount || 1));

  const tabs: Array<{ id: DetailTab; label: string; icon: typeof Users; hidden?: boolean }> = [
    { id: "overview", label: "Overview", icon: MapPin },
    { id: "itinerary", label: "Itinerary", icon: CalendarDays },
    { id: "members", label: "Members", icon: Users, hidden: !canManage && access?.membershipStatus !== "accepted" },
    { id: "chat", label: "Chat", icon: MessageCircle, hidden: !canChat },
  ];

  if (loading || authLoading) {
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
          <EmptyState title="Trip not found." action={<Button type="button" onClick={() => navigate("/trips")}>Back to trips</Button>}>
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
        <TripRoomHero
          trip={trip}
          eyebrow={
            isPersonalSavedTrip
              ? `${cityName} · Your trip`
              : `${cityName} · Community trip`
          }
          title={trip.title}
          description={
            isPersonalSavedTrip
              ? `${trip.days} days from ${formatTripDate(trip.startDate)} · ${routeLabel} · $${trip.estimatedTotalCost.toLocaleString()} estimate`
              : `${trip.days} days from ${formatTripDate(trip.startDate)} · ${spotsLeft} spots left · Hosted by ${trip.ownerName || "Traveler"}`
          }
          actions={
            <>
              {trip.visibility && (
                <TripVisibilityBadge
                  visibility={trip.visibility}
                  className="bg-white/10 text-white ring-white/20"
                />
              )}
              {isPersonalSavedTrip && (
                <ButtonLink to="/planner" tone="light" size="lg">Edit in planner</ButtonLink>
              )}
              {canManage && !isPersonalSavedTrip && (
                <>
                  <Button type="button" tone="light" icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} onClick={() => void copyInviteLink()}>
                    {copied ? "Copied" : "Copy invite link"}
                  </Button>
                  <Button type="button" tone="ghost" className="bg-white text-slate-900" icon={<Settings2 className="h-4 w-4" />} onClick={() => setSettingsOpen(true)}>
                    Settings
                  </Button>
                </>
              )}
              {canManage && isPersonalSavedTrip && (
                <Button type="button" tone="light" icon={<Settings2 className="h-4 w-4" />} onClick={() => setSettingsOpen(true)}>
                  Sharing settings
                </Button>
              )}
              {canManage && (
                <Button type="button" tone="danger" icon={<Trash2 className="h-4 w-4" />} className="rounded-full" onClick={() => setDeleteOpen(true)}>
                  Delete trip
                </Button>
              )}
              {!canManage && access?.membershipStatus === "none" && trip.visibility !== "private" && (
                <Button
                  type="button"
                  disabled={actionLoading === "join"}
                  icon={actionLoading === "join" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                  onClick={() => void handleJoinRequest()}
                >
                  Request to join
                </Button>
              )}
              {access?.membershipStatus === "pending" && (
                <span className="rounded-full bg-white/15 px-4 py-2 text-sm font-black text-white">
                  Request pending approval
                </span>
              )}
            </>
          }
        >
          <div className="mt-7 inline-flex max-w-full flex-wrap rounded-full border border-white/10 bg-slate-950/40 p-1">
            {tabs.filter((item) => !item.hidden).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${tab === id ? "bg-white text-slate-900" : "text-slate-300 hover:text-white"}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </TripRoomHero>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
            {error}
          </div>
        )}

        {tab === "overview" && isPersonalSavedTrip && (
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <Card padding="lg">
              <h2 className="text-2xl font-black text-slate-950">Your trip plan</h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">Private saved itinerary. Open the planner to edit days and activities.</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <OverviewStat icon={MapPin} label="Destination" value={routeLabel} />
                <OverviewStat icon={CalendarDays} label="Dates" value={`${formatTripDate(trip.startDate)} · ${trip.days} days`} />
                <OverviewStat icon={Wallet} label="Budget" value={`${trip.budget} · $${trip.estimatedTotalCost.toLocaleString()}`} />
                <OverviewStat icon={Sparkles} label="Pace" value={trip.pace} />
              </div>
              {trip.notes && (
                <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Notes</p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">{trip.notes}</p>
                </div>
              )}
            </Card>
            <Card padding="lg">
              <h3 className="text-lg font-black text-slate-950">Interests</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {(trip.tags?.length ? trip.tags : trip.interests).map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-black capitalize text-slate-600">
                    <Tags className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
              <ButtonLink to="/planner" tone="secondary" size="lg" className="mt-6 w-full">Continue in planner</ButtonLink>
            </Card>
          </div>
        )}

        {tab === "overview" && !isPersonalSavedTrip && (
          <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <Card padding="lg">
              <h2 className="text-2xl font-black text-slate-950">About this trip</h2>
              <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
                {trip.description || `A ${trip.pace} ${trip.days}-day trip around ${cityName} with a ${trip.budget} budget focus.`}
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <OverviewStat icon={MapPin} label="Destination" value={cityName} />
                <OverviewStat icon={CalendarDays} label="Starts" value={formatTripDate(trip.startDate)} />
                <OverviewStat icon={Users} label="Group size" value={`${trip.memberCount || 1}/${trip.maxMembers || 8} travelers`} />
                <OverviewStat icon={Wallet} label="Estimate" value={`$${trip.estimatedTotalCost.toLocaleString()}`} />
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {[trip.budget, trip.pace, ...(trip.tags?.length ? trip.tags : trip.interests)].map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-black capitalize text-blue-700">
                    <Tags className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
              {!canViewItinerary && (
                <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                  The full day-by-day itinerary unlocks after the host accepts your join request.
                </div>
              )}
            </Card>

            <div className="space-y-4">
              <Card padding="lg">
                <h3 className="text-lg font-black text-slate-950">Trip host</h3>
                <div className="mt-4 flex items-center gap-3">
                  {trip.ownerAvatar ? (
                    <img src={trip.ownerAvatar} alt="" className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-slate-900 text-white">
                      <UserRound className="h-5 w-5" />
                    </span>
                  )}
                  <div>
                    <p className="font-black text-slate-950">{trip.ownerName || "Traveler"}</p>
                    <p className="text-sm font-semibold text-slate-500">Organizer</p>
                  </div>
                </div>
              </Card>

              {canManage && pendingRequests.length > 0 && (
                <Card padding="lg" className="border-blue-100 bg-blue-50/70">
                  <p className="text-sm font-black text-blue-800">{pendingRequests.length} traveler(s) want to join</p>
                  <Button type="button" tone="secondary" size="sm" className="mt-3" onClick={() => setTab("members")}>Review requests</Button>
                </Card>
              )}

              {acceptedMembers.length > 0 && (
                <Card padding="lg">
                  <h3 className="text-lg font-black text-slate-950">Group</h3>
                  <div className="mt-4 space-y-3">
                    {acceptedMembers.slice(0, 4).map((member) => (
                      <MemberRow key={member.id} member={member} badge={member.role === "owner" ? "Host" : undefined} onOpenProfile={() => setProfileOpen(memberProfile(member))} />
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}

        {tab === "itinerary" && (
          canViewItinerary ? (
            isPersonalSavedTrip ? (
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
                updateActivity={() => undefined}
                updateDay={() => undefined}
              />
            ) : (
              <CommunityItineraryView
                days={trip.itinerary.days}
                startDate={trip.itinerary.startDate}
              />
            )
          ) : (
            <EmptyState title="Itinerary locked">
              Request to join this trip to see the day-by-day plan after approval.
            </EmptyState>
          )
        )}

        {tab === "members" && (
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <Card padding="lg">
              <h2 className="text-2xl font-black text-slate-950">Travelers</h2>
              <div className="mt-5 space-y-3">
                {acceptedMembers.map((member) => (
                  <MemberRow key={member.id} member={member} badge={member.role === "owner" ? "Host" : "Member"} onOpenProfile={() => setProfileOpen(memberProfile(member))} />
                ))}
              </div>
            </Card>

            {canManage && (
              <Card padding="lg">
                <h2 className="text-2xl font-black text-slate-950">Join requests</h2>
                {pendingRequests.length === 0 ? (
                  <p className="mt-4 text-sm font-semibold text-slate-500">No pending requests right now.</p>
                ) : (
                  <div className="mt-5 space-y-3">
                    {pendingRequests.map((member) => (
                      <div key={member.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <MemberRow member={member} onOpenProfile={() => setProfileOpen(memberProfile(member))} />
                        <div className="mt-3 flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={actionLoading === member.id}
                            icon={actionLoading === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            onClick={() => void handleMemberDecision(member.id, "accepted")}
                          >
                            Accept
                          </Button>
                          <Button
                            type="button"
                            tone="ghost"
                            size="sm"
                            disabled={actionLoading === member.id}
                            icon={<X className="h-4 w-4" />}
                            onClick={() => void handleMemberDecision(member.id, "declined")}
                          >
                            Decline
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>
        )}

        {tab === "chat" && canChat && (
          <Card padding="none" className="overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-xl font-black text-slate-950">Group chat</h2>
              <p className="text-sm font-semibold text-slate-500">Coordinate plans with accepted trip members.</p>
            </div>
            <div className="max-h-[420px] space-y-3 overflow-y-auto px-5 py-4">
              {messages.length === 0 ? (
                <p className="py-8 text-center text-sm font-semibold text-slate-500">No messages yet. Say hello to the group.</p>
              ) : messages.map((message) => (
                <div key={message.id} className={`flex gap-3 ${message.own ? "flex-row-reverse" : ""}`}>
                  <button type="button" className="shrink-0" onClick={() => setProfileOpen(message.profile || { displayName: message.displayName, avatarUrl: message.avatarUrl })} title={`View ${message.displayName}`}>
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
              ))}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-slate-100 p-4">
              <input
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                placeholder="Write a message..."
                className="form-field flex-1"
              />
              <Button
                type="submit"
                disabled={actionLoading === "message" || !messageInput.trim()}
                icon={actionLoading === "message" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              >
                Send
              </Button>
            </form>
          </Card>
        )}
      </PageShell>

      {settingsOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 p-4 sm:items-center">
          <button type="button" className="absolute inset-0" aria-label="Close settings" onClick={() => setSettingsOpen(false)} />
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-black text-slate-950">Trip settings</h2>
            <div className="mt-5 space-y-4">
              <FilterDropdown
                label="Visibility"
                value={settingsVisibility}
                options={[
                  { value: "private", label: "Private", description: visibilityDescriptions.private },
                  { value: "invite", label: "Invite only", description: visibilityDescriptions.invite },
                  { value: "public", label: "Public", description: visibilityDescriptions.public },
                ]}
                onChange={(value) => setSettingsVisibility(value as TripVisibility)}
              />
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-600">Description</span>
                <textarea value={settingsDescription} onChange={(event) => setSettingsDescription(event.target.value)} rows={3} className="form-field min-h-[96px]" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-bold text-slate-600">Max travelers</span>
                <input type="number" min={2} max={20} value={settingsMaxMembers} onChange={(event) => setSettingsMaxMembers(Number(event.target.value) || 2)} className="form-field" />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" tone="ghost" onClick={() => setSettingsOpen(false)}>Cancel</Button>
              <Button type="button" disabled={actionLoading === "settings"} onClick={() => void handleSaveSettings()}>
                {actionLoading === "settings" ? "Saving..." : "Save settings"}
              </Button>
            </div>

            <div className="mt-8 rounded-2xl border border-red-100 bg-red-50 p-4">
              <p className="text-sm font-black text-red-800">Delete this trip</p>
              <p className="mt-1 text-sm font-semibold text-red-700">
                Permanently removes the itinerary, members, and chat for trips you created.
              </p>
              <Button type="button" tone="danger" size="sm" className="mt-3" icon={<Trash2 className="h-4 w-4" />} onClick={() => { setSettingsOpen(false); setDeleteOpen(true); }}>
                Delete trip
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteOpen && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/50 p-4 sm:items-center">
          <button type="button" className="absolute inset-0" aria-label="Close delete confirmation" onClick={() => setDeleteOpen(false)} />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-2xl font-black text-slate-950">Delete this trip?</h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-600">
              <span className="font-black text-slate-900">{trip.title}</span> will be permanently deleted, including the itinerary, join requests, members, and group chat.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button type="button" tone="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button
                type="button"
                tone="danger"
                disabled={actionLoading === "delete"}
                icon={actionLoading === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                onClick={() => void handleDeleteTrip()}
              >
                {actionLoading === "delete" ? "Deleting..." : "Delete permanently"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {profileOpen && (
        <TravelerProfileModal profile={profileOpen} onClose={() => setProfileOpen(null)} />
      )}

      <Footer />
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

function TravelerProfileModal({ profile, onClose }: { profile: UserProfileSnapshot; onClose: () => void }) {
  const age = profile.birthDate ? profileAge(profile.birthDate) : "";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-4 sm:items-center">
      <button type="button" className="absolute inset-0" aria-label="Close profile" onClick={onClose} />
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
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
              {profile.homeCity && (
                <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-slate-500">
                  <MapPin className="h-4 w-4" />
                  {profile.homeCity}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="p-6">
          <p className="text-sm font-semibold leading-6 text-slate-600">
            {profile.bio || "This traveler has not added a bio yet."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {(profile.interests?.length ? profile.interests : ["No interests added"]).slice(0, 8).map((interest) => (
              <span key={interest} className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-black text-sky-800 ring-1 ring-sky-100">
                {interest}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
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

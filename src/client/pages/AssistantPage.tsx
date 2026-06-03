import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bot,
  CalendarDays,
  Loader2,
  MapPin,
  MessageCircle,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { applyTripChange, listSavedTrips, loadSavedTrip, sendTravelChatMessage } from "../api/assistantApi";
import { useAuth } from "../auth/AuthContext";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { HeroPanel } from "../components/ui";
import type { ChatMessage, SavedTripDetail, SavedTripSummary, TripChangeProposal } from "../../shared/types.js";

const quickPromptPool = [
  "What are the top 3 things to see in Ljubljana?",
  "Plan a 3-day city break under $500.",
  "Where should I go for warm weather this weekend?",
  "Find underrated cities for food lovers.",
  "Compare Lisbon and Barcelona for a first-time trip.",
  "Suggest a cheap beach destination in Europe.",
  "Build a relaxed itinerary for Tokyo.",
  "What airports are best for cheap Balkan routes?",
  "Give me a no-tourist-trap plan for Rome.",
  "Where can I travel solo safely for a week?",
  "Suggest destinations with great public transport.",
  "Find a romantic weekend trip from Skopje.",
  "Recommend a mountain trip with good flights.",
  "What should I pack for a spring city break?",
  "Help me choose between Malta and Cyprus.",
  "Make a food-focused plan for Istanbul.",
  "Find a budget-friendly birthday trip.",
  "Which European capitals are cheapest right now?",
  "Plan a 7-day honeymoon in Greece.",
  "Build a 7-day Italy trip for two people.",
  "Plan a romantic honeymoon under $2,000.",
  "Create a 7-day beach trip with direct flights.",
  "Plan a family-friendly week in Spain.",
  "Make a 5-day itinerary for Paris and Amsterdam.",
  "Plan a cheap 7-day trip from Skopje.",
  "Suggest a luxury honeymoon with a realistic budget.",
  "Build a 10-day Europe route by train and flight.",
  "Plan a week in Japan for first-time visitors.",
  "Create a relaxed 7-day Portugal itinerary.",
  "Plan a food and wine trip through Italy.",
  "Suggest a surprise anniversary weekend.",
  "Build a 7-day island-hopping trip.",
  "Plan a winter city break with good museums.",
  "Find a beach honeymoon that is not too expensive.",
  "Create a 6-day trip for nightlife and food.",
  "Plan a calm wellness trip with spas and nature.",
  "Suggest a one-week trip for remote workers.",
  "Build a multi-city Balkan trip for 7 days.",
  "Make this trip cheaper.",
  "Add more food spots.",
  "Make the itinerary more relaxed.",
];

function randomQuickPrompts(count = 4) {
  return [...quickPromptPool].sort(() => Math.random() - 0.5).slice(0, count);
}

export function AssistantPage() {
  const { user, loading: authLoading } = useAuth();
  const [trips, setTrips] = useState<SavedTripSummary[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<SavedTripDetail | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [loadingTripId, setLoadingTripId] = useState("");
  const [sending, setSending] = useState(false);
  const [applying, setApplying] = useState(false);
  const [pendingProposal, setPendingProposal] = useState<TripChangeProposal | undefined>();
  const [error, setError] = useState("");
  const [quickPrompts, setQuickPrompts] = useState(() => randomQuickPrompts());

  useEffect(() => {
    async function loadTrips() {
      if (authLoading) {
        return;
      }

      if (!user) {
        setTrips([]);
        setLoadingTrips(false);
        return;
      }

      setLoadingTrips(true);
      try {
        setTrips(await listSavedTrips());
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load trips.");
      } finally {
        setLoadingTrips(false);
      }
    }

    void loadTrips();
  }, [authLoading, user]);

  const assistantMode = selectedTrip ? "Trip-aware" : "General travel";
  const showStartScreen = messages.length === 0 && !sending;
  const tripStats = useMemo(() => {
    if (!selectedTrip) {
      return [];
    }

    return [
      `${selectedTrip.days} days`,
      selectedTrip.budget,
      selectedTrip.pace,
      `$${selectedTrip.estimatedTotalCost}`,
    ];
  }, [selectedTrip]);

  async function selectTrip(tripId: string) {
    setLoadingTripId(tripId);
    setError("");

    try {
      const trip = await loadSavedTrip(tripId);
      setSelectedTrip(trip);
      setPendingProposal(undefined);
      setQuickPrompts(randomQuickPrompts());
      setMessages([]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load trip.");
    } finally {
      setLoadingTripId("");
    }
  }

  function startGeneralChat() {
    setSelectedTrip(undefined);
    setPendingProposal(undefined);
    setQuickPrompts(randomQuickPrompts());
    setMessages([]);
  }

  async function submitMessage(event?: FormEvent, overrideMessage?: string) {
    event?.preventDefault();
    const message = (overrideMessage || input).trim();

    if (!message || sending) {
      return;
    }

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: message }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setPendingProposal(undefined);
    setError("");

    try {
      const response = await sendTravelChatMessage({
        message,
        history: messages,
        trip: selectedTrip,
      });
      setMessages([...nextMessages, { role: "assistant", content: response.message }]);
      setPendingProposal(response.proposal);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Assistant failed.");
      setMessages([...nextMessages, { role: "assistant", content: "I could not answer that right now. Check the AI provider settings and try again." }]);
    } finally {
      setSending(false);
    }
  }

  function renderComposer(centered = false) {
    return (
      <form onSubmit={submitMessage} className={centered ? "w-full" : "border-t border-slate-100 p-5"}>
        <div
          className={`flex gap-3 border border-slate-200 bg-white p-2 shadow-sm focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-100 ${
            centered ? "rounded-3xl" : "rounded-2xl"
          }`}
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={selectedTrip ? "Ask for trip tweaks, cheaper options, food spots..." : "Ask about destinations, attractions, budgets..."}
            className="min-w-0 flex-1 bg-transparent px-4 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="flex items-center gap-2 rounded-2xl bg-linear-to-r from-blue-500 to-cyan-400 px-5 py-3 text-sm font-black text-white shadow-md transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        </div>
      </form>
    );
  }

  async function applyPendingProposal() {
    if (!selectedTrip || !pendingProposal || applying) {
      return;
    }

    setApplying(true);
    setError("");

    try {
      const updatedTrip = await applyTripChange(selectedTrip.id, pendingProposal);
      setSelectedTrip(updatedTrip);
      setTrips((currentTrips) => currentTrips.map((trip) => (
        trip.id === updatedTrip.id ? { ...trip, estimatedTotalCost: updatedTrip.estimatedTotalCost } : trip
      )));
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          content: `Saved those changes to ${updatedTrip.title}. The trip now totals about $${updatedTrip.estimatedTotalCost}.`,
        },
      ]);
      setPendingProposal(undefined);
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : "Failed to apply trip changes.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="app-main">
        <div className="mx-auto max-w-7xl">
          <HeroPanel
            className="mb-6"
            eyebrow={<><MessageCircle className="h-3.5 w-3.5" />SkyNode assistant</>}
            title="Chat with a travel assistant that understands your trips."
            description="Ask general destination questions, or select a saved trip so the assistant can answer with itinerary context."
            actions={
              <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <p className="text-sm text-slate-300">Assistant mode</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-400/20 text-cyan-200">
                    <Bot className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xl font-black">{assistantMode}</p>
                    <p className="text-xs font-bold text-slate-300">{selectedTrip?.title || "No trip selected"}</p>
                  </div>
                </div>
              </div>
            }
          />

          <div className="grid min-h-[720px] gap-6 lg:grid-cols-[330px_1fr]">
            <aside className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-blue-500">Saved trips</p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">Context</h2>
                </div>
                <button
                  type="button"
                  onClick={startGeneralChat}
                  className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-blue-50 hover:text-blue-600"
                  title="Start general chat"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>

              {!authLoading && !user && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                  <p className="font-bold text-slate-700">Sign in to load saved trips.</p>
                  <p className="mt-1">General assistant chat still works without an account.</p>
                  <Link
                    to="/auth"
                    state={{ from: "/assistant" }}
                    className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white no-underline transition hover:bg-blue-700"
                  >
                    Sign in or register
                  </Link>
                </div>
              )}

              {(loadingTrips || authLoading) && user && (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                  ))}
                </div>
              )}

              {!loadingTrips && user && trips.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                  No saved trips yet. Generate and save an itinerary from the planner first.
                </div>
              )}

              <div className="space-y-3">
                {trips.map((trip) => {
                  const active = selectedTrip?.id === trip.id;

                  return (
                    <button
                      key={trip.id}
                      type="button"
                      onClick={() => selectTrip(trip.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-blue-200 bg-blue-50 shadow-sm"
                          : "border-slate-100 bg-white hover:border-blue-100 hover:bg-slate-50"
                      }`}
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <p className="font-black text-slate-950">{trip.title}</p>
                        {loadingTripId === trip.id && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                      </div>
                      <div className="space-y-1 text-xs font-bold text-slate-500">
                        <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {trip.destinationName}</p>
                        <p className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> {trip.startDate} - {trip.days} days</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="flex min-h-[720px] flex-col rounded-3xl border border-slate-100 bg-white shadow-xl">
              <div className="border-b border-slate-100 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-blue-500">Chat</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">
                      {selectedTrip ? selectedTrip.title : "General travel chat"}
                    </h2>
                  </div>
                  {selectedTrip && (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={startGeneralChat}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <X className="h-3.5 w-3.5" />
                        General chat
                      </button>
                      {tripStats.map((stat) => (
                        <span key={stat} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                          {stat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-5">
                {showStartScreen && (
                  <div className="flex min-h-full items-center justify-center">
                    <div className="w-full max-w-3xl">
                      <h3 className="text-center text-3xl font-black text-slate-950">
                        How can I help with your explorations?
                      </h3>
                      <div className="mt-8">
                        {renderComposer(true)}
                      </div>
                      <div className="mt-5 flex flex-wrap justify-center gap-2">
                        {quickPrompts.map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            onClick={() => submitMessage(undefined, prompt)}
                            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                        message.role === "user"
                          ? "bg-blue-600 text-white"
                          : "border border-slate-100 bg-white text-slate-700"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <p className="mb-1 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-blue-500">
                          <Sparkles className="h-3.5 w-3.5" />
                          Assistant
                        </p>
                      )}
                      {message.role === "assistant" ? (
                        <AssistantMessageContent content={message.content} />
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                  </div>
                ))}

                {pendingProposal && selectedTrip && (
                  <div className="flex justify-start">
                    <div className="max-w-[78%] rounded-2xl border border-cyan-100 bg-white p-4 text-sm text-slate-700 shadow-sm">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-cyan-600">
                        <RotateCcw className="h-3.5 w-3.5" />
                        Proposed trip update
                      </p>
                      <p className="font-semibold">{pendingProposal.summary}</p>
                      <div className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-600 sm:grid-cols-2">
                        <span>Current total: ${selectedTrip.estimatedTotalCost}</span>
                        <span>New total: ${pendingProposal.itinerary.estimatedTotalCost}</span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={applyPendingProposal}
                          disabled={applying}
                          className="rounded-xl bg-linear-to-r from-blue-500 to-cyan-400 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {applying ? "Applying..." : "Apply changes"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingProposal(undefined)}
                          disabled={applying}
                          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Keep current trip
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {sending && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-bold text-slate-500 shadow-sm">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                      Finding a thoughtful answer...
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="border-t border-red-100 bg-red-50 px-5 py-3 text-sm font-bold text-red-600">
                  {error}
                </div>
              )}

              {!showStartScreen && renderComposer()}
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function AssistantMessageContent({ content }: { content: string }) {
  return (
    <div className="space-y-2">
      {content.split("\n").map((line, index) => {
        const numberedItem = line.match(/^(\d+)\.\s+(.*)$/);
        const bulletItem = line.match(/^[-*]\s+(.*)$/);

        if (!line.trim()) {
          return <div key={index} className="h-1" />;
        }

        if (numberedItem) {
          return (
            <div key={index} className="grid grid-cols-[1.75rem_1fr] gap-1">
              <span className="font-black text-blue-500">{numberedItem[1]}.</span>
              <p>{renderInlineMarkdown(numberedItem[2])}</p>
            </div>
          );
        }

        if (bulletItem) {
          return (
            <div key={index} className="grid grid-cols-[1.25rem_1fr] gap-1">
              <span className="font-black text-blue-500">-</span>
              <p>{renderInlineMarkdown(bulletItem[1])}</p>
            </div>
          );
        }

        return <p key={index}>{renderInlineMarkdown(line)}</p>;
      })}
    </div>
  );
}

function renderInlineMarkdown(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-black text-slate-950">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return part;
  });
}

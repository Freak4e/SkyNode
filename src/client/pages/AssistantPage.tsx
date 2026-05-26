import { FormEvent, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { applyTripChange, listSavedTrips, loadSavedTrip, sendTravelChatMessage } from "../api/assistantApi";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import type { ChatMessage, SavedTripDetail, SavedTripSummary, TripChangeProposal } from "../../shared/types.js";

const quickPrompts = [
  "What are the top 3 things to see in Ljubljana?",
  "Make this trip cheaper.",
  "Add more food spots.",
  "Make the itinerary more relaxed.",
];

export function AssistantPage() {
  const [trips, setTrips] = useState<SavedTripSummary[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<SavedTripDetail | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi, I'm SkyNode Assistant. Ask me for destination ideas, or select a saved trip so I can tailor suggestions to your itinerary.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [loadingTripId, setLoadingTripId] = useState("");
  const [sending, setSending] = useState(false);
  const [applying, setApplying] = useState(false);
  const [pendingProposal, setPendingProposal] = useState<TripChangeProposal | undefined>();
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTrips() {
      try {
        setTrips(await listSavedTrips());
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load trips.");
      } finally {
        setLoadingTrips(false);
      }
    }

    void loadTrips();
  }, []);

  const assistantMode = selectedTrip ? "Trip-aware" : "General travel";
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
      setMessages([
        {
          role: "assistant",
          content: `Loaded ${trip.title}. I can now answer using this itinerary, budget, pace, and attractions as context.`,
        },
      ]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load trip.");
    } finally {
      setLoadingTripId("");
    }
  }

  function startGeneralChat() {
    setSelectedTrip(undefined);
    setPendingProposal(undefined);
    setMessages([
      {
        role: "assistant",
        content: "New general travel chat started. Ask about a city, attractions, trip ideas, budget, or travel style.",
      },
    ]);
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
      setMessages([...nextMessages, { role: "assistant", content: "I could not answer that right now. Check Ollama and try again." }]);
    } finally {
      setSending(false);
    }
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

      <main className="px-6 pb-16 pt-24">
        <div className="mx-auto max-w-7xl">
          <section className="mb-6 overflow-hidden rounded-3xl bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 p-8 text-white shadow-2xl">
            <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-end">
              <div>
                <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-cyan-200">
                  <MessageCircle className="h-4 w-4" />
                  SkyNode assistant
                </p>
                <h1 className="max-w-3xl text-4xl font-black leading-tight md:text-6xl">
                  Chat with a travel assistant that understands your trips.
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300">
                  Ask general destination questions, or select a saved trip so Ollama can answer with itinerary context.
                </p>
              </div>

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
            </div>
          </section>

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

              {loadingTrips && (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                  ))}
                </div>
              )}

              {!loadingTrips && trips.length === 0 && (
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
                    <div className="flex flex-wrap gap-2">
                      {tripStats.map((stat) => (
                        <span key={stat} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                          {stat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => submitMessage(undefined, prompt)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-5">
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

              <form onSubmit={submitMessage} className="border-t border-slate-100 p-5">
                <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-100">
                  <input
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={selectedTrip ? "Ask for trip tweaks, cheaper options, food spots..." : "Ask about destinations, attractions, budgets..."}
                    className="min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="submit"
                    disabled={sending || !input.trim()}
                    className="flex items-center gap-2 rounded-xl bg-linear-to-r from-blue-500 to-cyan-400 px-5 py-3 text-sm font-black text-white shadow-md transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Send className="h-4 w-4" />
                    Send
                  </button>
                </div>
              </form>
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

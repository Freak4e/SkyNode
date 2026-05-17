import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftRight, Search, ChevronDown,
  Zap, Globe, Shield, MessageCircle, CreditCard, Map,
  Star, Plane, Mountain, Waves, Sparkles as Aurora,
  User,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { ChipPlacePicker } from "../components/ChipPlacePicker";
import type { Place } from "../../shared/types.js";
import heroBanner from "../../../assets/hero_banner.jpg";

const today = new Date().toISOString().slice(0, 10);
const defaultFrom: Place = { code: "JFK", name: "New York", cityName: "New York", countryName: "USA", type: "city" };
const defaultTo: Place = { code: "HND", name: "Tokyo", cityName: "Tokyo", countryName: "Japan", type: "city" };
type TripType = "one-way" | "return";

const features = [
  { icon: <Aurora className="w-5 h-5 text-blue-500" />, title: "Smart AI Planner", desc: "Generates day-by-day itineraries tuned to your taste, time and budget." },
  { icon: <Zap className="w-5 h-5 text-cyan-500" />, title: "Best-fare engine", desc: "Scans 1,200+ airlines and hidden-city routes in under half a second." },
  { icon: <Map className="w-5 h-5 text-violet-500" />, title: "Living maps", desc: "Interactive maps that update with weather, crowds and travel time." },
  { icon: <MessageCircle className="w-5 h-5 text-emerald-500" />, title: "Always with you", desc: "Chat with your AI travel buddy mid-trip for last-minute changes." },
  { icon: <Shield className="w-5 h-5 text-orange-500" />, title: "Trip protection", desc: "Optional cancellation, delay and weather guarantees on every booking." },
  { icon: <CreditCard className="w-5 h-5 text-pink-500" />, title: "Instant booking", desc: "One-click checkout across flights, stays and experiences." },
];

const testimonials = [
  { quote: "Built my 3-week Asia trip in 4 minutes. Honestly cried a little.", name: "Mira K.", role: "Solo traveler · Berlin", stars: 5 },
  { quote: "Like Linear, but for the world. The interface alone is worth it.", name: "Daniel A.", role: "Founder · NYC", stars: 5 },
  { quote: "Found a hidden $312 flight to Lisbon. SkyNode pays for itself.", name: "Priya S.", role: "Student · Mumbai", stars: 5 },
];

const itineraryDays = [
  { day: 1, title: "Shibuya, Harajuku & teamLab Planets", sub: "3 activities · 2 meals · transit included", price: "$84" },
  { day: 2, title: "Mt. Fuji day trip + Hakone onsen", sub: "3 activities · 2 meals · transit included", price: "$162" },
  { day: 3, title: "Ghibli Museum & Shinjuku jazz bars", sub: "3 activities · 2 meals · transit included", price: "$70" },
];

export function HomePage() {
  const navigate = useNavigate();
  const [from, setFrom] = useState<Place>(defaultFrom);
  const [to, setTo] = useState<Place>(defaultTo);
  const [date, setDate] = useState(today);
  const [returnDate, setReturnDate] = useState(today);
  const [tripType, setTripType] = useState<TripType>("return");
  const [passengers, setPassengers] = useState(1);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({
      from: from.code,
      to: to.code,
      date,
      fromName: from.cityName,
      toName: to.cityName,
      tripType,
      passengers: String(passengers),
    });

    if (tripType === "return") {
      params.set("returnDate", returnDate);
    }

    navigate(`/search?${params.toString()}`);
  }

  function openPlanner() {
    const params = new URLSearchParams({
      from: from.code,
      to: to.code,
      date,
      fromName: from.cityName,
      toName: to.cityName,
      destination: to.cityName,
    });

    navigate(`/planner?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar transparent />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Hero image */}
        <img
          src={heroBanner}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Semi-transparent overlay so text stays readable */}
        <div className="absolute inset-0 bg-slate-900/40" />
        {/* Bottom fade to blend into next section */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-50 to-transparent" />

        {/* Floating label chips */}
        <div className="absolute top-36 left-[6%] glass rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-lg">
          <Plane className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-slate-700">NYC → Tokyo</span>
        </div>
        <div className="absolute top-40 right-[5%] glass rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-lg">
          <Mountain className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-semibold text-slate-700">Bali · 7 days</span>
        </div>
        <div className="absolute bottom-52 left-[4%] glass rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-lg">
          <Waves className="w-4 h-4 text-cyan-500" />
          <span className="text-sm font-semibold text-slate-700">Greek isles</span>
        </div>
        <div className="absolute bottom-60 right-[4%] glass rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-lg">
          <Aurora className="w-4 h-4 text-violet-500" />
          <span className="text-sm font-semibold text-slate-700">Aurora hunt</span>
        </div>

        {/* Headline */}
        <h1 className="relative z-10 text-center font-black leading-none tracking-tight text-white px-6 mb-4" style={{ fontSize: "clamp(2.5rem, 7vw, 5.5rem)" }}>
          Travel,{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 to-sky-100">
            reimagined
          </span>
          <br />
          by intelligent design.
        </h1>

        <p className="relative z-10 text-center text-white/80 text-base md:text-lg max-w-xl px-6 mb-10 leading-relaxed">
          Find the perfect flight, build day-by-day plans, and discover places worth the journey — all in one stunning, AI-native workspace.
        </p>

        {/* Search box */}
        <form
          onSubmit={handleSearch}
          className="relative z-10 w-full max-w-4xl mx-auto px-4"
        >
          <div className="glass rounded-2xl shadow-2xl border border-white/50 overflow-visible">
            {/* Top options row */}
            <div className="flex items-center gap-1 px-4 pt-3 pb-2 border-b border-slate-200/60">
              <label className="relative flex items-center gap-1 px-3 py-1.5 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-100 transition-colors">
                <select
                  value={tripType}
                  onChange={(event) => setTripType(event.target.value as TripType)}
                  className="appearance-none bg-transparent pr-5 outline-none cursor-pointer font-medium"
                  aria-label="Trip type"
                >
                  <option value="return">Return</option>
                  <option value="one-way">One way</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 w-3.5 h-3.5 text-slate-400" />
              </label>

              <label className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-100 transition-colors">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={passengers}
                  onChange={(event) => setPassengers(Number(event.target.value))}
                  className="appearance-none bg-transparent pr-5 outline-none cursor-pointer font-medium"
                  aria-label="Passengers"
                >
                  {Array.from({ length: 9 }, (_, index) => index + 1).map((count) => (
                    <option key={count} value={count}>
                      {count} {count === 1 ? "Passenger" : "Passengers"}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 w-3.5 h-3.5 text-slate-400" />
              </label>
            </div>

            {/* Main search row */}
            <div className="flex items-center gap-0 px-3 py-3">
              {/* FROM */}
              <div className="flex-1 min-w-0 px-2">
                <ChipPlacePicker
                  label="From"
                  value={from}
                  onChange={setFrom}
                  chipColor="blue"
                />
              </div>

              {/* Swap */}
              <button
                type="button"
                onClick={() => { const tmp = from; setFrom(to); setTo(tmp); }}
                className="shrink-0 w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-300 transition-colors mx-1"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>

              {/* TO */}
              <div className="flex-1 min-w-0 px-2 border-r border-slate-200">
                <ChipPlacePicker
                  label="To"
                  value={to}
                  onChange={setTo}
                  chipColor="blue"
                />
              </div>

              {/* DEPARTURE */}
              <div className="px-4 border-r border-slate-200 shrink-0">
                <p className="text-xs text-slate-400 font-medium mb-1">Departure</p>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    const nextDate = e.target.value;
                    setDate(nextDate);
                    if (returnDate < nextDate) {
                      setReturnDate(nextDate);
                    }
                  }}
                  required
                  className="text-slate-800 font-semibold text-sm bg-transparent outline-none"
                />
              </div>

              {/* RETURN */}
              <div className="px-4 border-r border-slate-200 shrink-0">
                <p className="text-xs text-slate-400 font-medium mb-1">Return</p>
                {tripType === "return" ? (
                  <input
                    type="date"
                    value={returnDate}
                    min={date}
                    onChange={(e) => setReturnDate(e.target.value)}
                    required
                    className="text-slate-800 font-semibold text-sm bg-transparent outline-none"
                  />
                ) : (
                  <p className="text-slate-400 text-sm font-medium">One way</p>
                )}
              </div>

              {/* SEARCH */}
              <button
                type="submit"
                className="shrink-0 ml-2 flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold text-sm shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
              >
                <Search className="w-4 h-4" />
                Search
              </button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex justify-center gap-6 mt-4 text-white/70 text-xs">
            <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> No booking fees</span>
            <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> 0.4s search</span>
            <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> 1,200+ airlines</span>
          </div>
        </form>
      </section>

      {/* ── AI PLANNER SECTION ── */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4" /> AI ITINERARY PLANNER
            </p>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-5">
              An itinerary that actually thinks for you.
            </h2>
            <p className="text-slate-500 text-lg leading-relaxed mb-8">
              Tell SkyNode where you're going, your vibe and your budget. Get a beautiful, editable day-by-day plan in seconds — with maps, weather, costs and bookable activities.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={openPlanner}
                className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-semibold text-sm shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
              >
                Try the planner →
              </button>
              <button className="px-6 py-3 rounded-full border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-100 transition-colors">
                Chat with AI
              </button>
            </div>
          </div>

          {/* Itinerary card */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-sm text-slate-500 font-medium">SkyNode AI · Tokyo · 5 days</span>
            </div>
            <div className="space-y-3">
              {itineraryDays.map((d) => (
                <div key={d.day} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    Day {d.day}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-900 font-semibold text-sm truncate">{d.title}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{d.sub}</p>
                  </div>
                  <span className="text-slate-900 font-bold text-sm">{d.price}</span>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 text-center text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors py-2">
              View full itinerary →
            </button>
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 text-center mb-3">
            Everything you need.
          </h2>
          <p className="text-slate-400 text-center mb-12 text-lg">Nothing you don't.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-slate-100 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <p className="font-bold text-slate-900 mb-1.5">{f.title}</p>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 text-center mb-12">
            Loved by travelers everywhere.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 font-medium leading-relaxed mb-5">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white text-sm font-bold">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-slate-900 font-semibold text-sm">{t.name}</p>
                    <p className="text-slate-400 text-xs">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-8 py-16 text-center">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3">
              Your next trip starts now.
            </h2>
            <p className="text-slate-400 mb-8">Free to start. No card, no commitment. Just smarter travel.</p>
            <div className="flex justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={openPlanner}
                className="px-6 py-3 rounded-full bg-white text-slate-900 font-semibold text-sm hover:bg-slate-100 transition-colors"
              >
                Create my trip
              </button>
              <button className="px-6 py-3 rounded-full border border-white/20 text-white font-semibold text-sm hover:bg-white/10 transition-colors">
                Talk to AI
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

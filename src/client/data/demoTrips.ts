import type { BudgetLevel, GeneratedItinerary, ItineraryDay, ItineraryItem, TravelPace } from "../../shared/types.js";

export type DemoTripCategory = "all" | "city" | "beach" | "mountains" | "food" | "adventure";

export type DemoTripTemplate = {
  id: string;
  title: string;
  category: Exclude<DemoTripCategory, "all">;
  destinationCode: string;
  destinationName: string;
  city: string;
  country: string;
  location: string;
  days: number;
  budget: BudgetLevel;
  budgetAmount: number;
  pace: TravelPace;
  travelers: number;
  interests: string[];
  tags: string[];
  rating: number;
  reviews: number;
  fromPrice: number;
  description: string;
  imageCity?: string;
  itinerary: GeneratedItinerary;
};

type RawDay = {
  title: string;
  summary: string;
  items: Array<[string, string, string, number, string[]]>;
};

function demoTime(value: string, index: number): string {
  if (/^\d{2}:\d{2}$/.test(value)) {
    return value;
  }

  const normalized = value.toLowerCase();
  if (normalized === "morning") return "09:00";
  if (normalized === "afternoon") return "14:00";
  if (normalized === "evening") return "19:00";

  return ["09:00", "14:00", "19:00"][index] || "09:00";
}

function activity(
  timeOfDay: string,
  title: string,
  description: string,
  estimatedCost: number,
  tags: string[],
  index: number,
  cityName: string,
): ItineraryItem {
  return {
    timeOfDay: demoTime(timeOfDay, index),
    title,
    description: enrichDescription(description, title, cityName, tags),
    estimatedCost,
    tags,
    category: tags[0],
    attractionName: title,
    location: {
      name: title,
      city: cityName,
      source: "manual",
      verified: true,
    },
  };
}

function enrichDescription(description: string, title: string, cityName: string, tags: string[]): string {
  const category = tags[0]?.toLowerCase() || "stop";
  const detail = category === "food"
    ? "Plan this as a real sit-down or tasting stop, leaving room for nearby cafes, markets, and a short walk after eating."
    : category === "transport"
    ? "Keep tickets, transfer time, and luggage logistics attached to this stop so the day stays realistic."
    : category === "beach"
    ? "Bring swim time into the schedule, check shade and return transport, and leave space for a slower meal nearby."
    : category === "museums" || category === "history" || category === "culture" || category === "architecture"
    ? "Use the saved location for maps and timed tickets, then leave buffer time around the surrounding streets and viewpoints."
    : category === "nature" || category === "mountains" || category === "hiking" || category === "adventure"
    ? "Check weather, route conditions, and daylight before you go, then keep the next stop flexible in case you want more time here."
    : "Use the saved location as the anchor for this part of the day and adjust nearby stops around your pace.";

  return `${description} Location: ${title}, ${cityName}. ${detail}`;
}

function buildDays(cityName: string, days: RawDay[]): ItineraryDay[] {
  return days.map((day, index) => {
    const items = day.items.map((item, itemIndex) => activity(...item, itemIndex, cityName));
    return {
      dayNumber: index + 1,
      cityName,
      title: day.title,
      summary: day.summary,
      estimatedCost: items.reduce((sum, item) => sum + item.estimatedCost, 0),
      items,
    };
  });
}

function template(input: Omit<DemoTripTemplate, "itinerary"> & { itineraryDays: RawDay[] }): DemoTripTemplate {
  const days = buildDays(input.city, input.itineraryDays);
  const itinerary: GeneratedItinerary = {
    destinationName: input.destinationName,
    startDate: "2026-07-12",
    days,
    attractions: [],
    estimatedTotalCost: input.budgetAmount,
    generationMode: "ollama",
  };

  const { itineraryDays: _itineraryDays, ...trip } = input;
  return { ...trip, itinerary };
}

export const demoTripCategories: Array<{ id: DemoTripCategory; label: string }> = [
  { id: "all", label: "All" },
  { id: "city", label: "City breaks" },
  { id: "beach", label: "Beach" },
  { id: "mountains", label: "Mountains" },
  { id: "food", label: "Food & wine" },
  { id: "adventure", label: "Adventure" },
];

export const demoTrips: DemoTripTemplate[] = [
  template({
    id: "tokyo-5-days",
    title: "Tokyo in 5 days",
    category: "city",
    destinationCode: "TYO",
    destinationName: "Tokyo",
    city: "Tokyo",
    country: "Japan",
    location: "Tokyo, Japan",
    days: 5,
    budget: "medium",
    budgetAmount: 1420,
    pace: "balanced",
    travelers: 2,
    interests: ["Culture", "Food", "Shopping", "Museums"],
    tags: ["city", "culture", "food"],
    rating: 4.9,
    reviews: 540,
    fromPrice: 1420,
    description: "A first-timer Tokyo route with neighborhoods, temples, food streets, and one calmer art-and-bay day.",
    itineraryDays: [
      { title: "Shibuya and Harajuku arrival", summary: "Land softly with Tokyo's most iconic crossings, shops, and casual food.", items: [["Morning", "Shibuya Crossing and Hachiko", "Start with the famous crossing, coffee nearby, and a simple orientation walk.", 24, ["Culture"]], ["Afternoon", "Harajuku and Meiji Shrine", "Move from Takeshita Street into the forest paths around Meiji Shrine.", 36, ["Culture"]], ["Evening", "Izakaya dinner in Ebisu", "Book a relaxed izakaya dinner and keep the first night easy.", 58, ["Food"]]] },
      { title: "Asakusa, Ueno and old Tokyo", summary: "Traditional streets, temple snacks, museums, and a slower evening.", items: [["Morning", "Senso-ji and Nakamise", "Visit Tokyo's oldest temple before the busiest crowds arrive.", 20, ["Culture"]], ["Afternoon", "Ueno Park museums", "Pick one museum, then walk the park and Ameyoko market.", 42, ["Museums"]], ["Evening", "Sumida river lights", "Take a riverside walk toward Skytree views after dinner.", 48, ["Scenic"]]] },
      { title: "Tsukiji, Ginza and teamLab", summary: "Seafood breakfast, design shopping, and immersive digital art.", items: [["Morning", "Tsukiji Outer Market", "Snack through tamagoyaki, grilled seafood, and matcha stands.", 44, ["Food"]], ["Afternoon", "Ginza galleries and depachika", "Browse design stores and department-store food halls.", 38, ["Shopping"]], ["Evening", "teamLab Planets", "End with a timed-entry immersive art visit.", 62, ["Museums"]]] },
      { title: "Day trip to Kamakura", summary: "Coastal temples and a beach-town pause outside the city.", items: [["Morning", "Great Buddha and Hase-dera", "Take the train to Kamakura for two landmark temple stops.", 34, ["Culture"]], ["Afternoon", "Komachi-dori and beach walk", "Lunch near Komachi-dori, then walk toward Yuigahama Beach.", 45, ["Beach"]], ["Evening", "Back to Tokyo ramen", "Return for a casual ramen dinner near your hotel.", 32, ["Food"]]] },
      { title: "Shinjuku finale", summary: "Gardens, views, and a final neon evening.", items: [["Morning", "Shinjuku Gyoen", "Spend a quiet morning in one of Tokyo's best central gardens.", 18, ["Nature"]], ["Afternoon", "Tokyo Metropolitan view deck", "Use the free observatory for skyline views.", 16, ["Scenic"]], ["Evening", "Omoide Yokocho and Golden Gai", "Close with tiny lanes, skewers, and one careful bar stop.", 70, ["Nightlife"]]] },
    ],
  }),
  template({
    id: "barcelona-food-weekend",
    title: "Barcelona food weekend",
    category: "food",
    destinationCode: "BCN",
    destinationName: "Barcelona",
    city: "Barcelona",
    country: "Spain",
    location: "Barcelona, Spain",
    days: 3,
    budget: "medium",
    budgetAmount: 890,
    pace: "balanced",
    travelers: 2,
    interests: ["Food", "Architecture", "Markets"],
    tags: ["food", "city", "weekend"],
    rating: 4.8,
    reviews: 312,
    fromPrice: 890,
    description: "A compact Catalan food route built around markets, tapas, Gaudi landmarks, and seaside meals.",
    itineraryDays: [
      { title: "Gothic Quarter and tapas", summary: "Markets, old streets, and a tapas crawl without rushing.", items: [["Morning", "La Boqueria breakfast", "Start with fruit, jamon, and coffee at the market.", 28, ["Food"]], ["Afternoon", "Gothic Quarter walk", "See the cathedral lanes and small plazas between snack stops.", 18, ["Culture"]], ["Evening", "Poble-sec tapas crawl", "Book two or three tapas bars around Carrer de Blai.", 64, ["Food"]]] },
      { title: "Gaudi and Gracia", summary: "Architecture icons with neighborhood eating between them.", items: [["Morning", "Sagrada Familia", "Use timed entry and allow time for the interior.", 38, ["Architecture"]], ["Afternoon", "Gracia lunch and boutiques", "Eat a long menu del dia and browse small local shops.", 42, ["Food"]], ["Evening", "Park Guell sunset", "Finish with tiled views over the city.", 28, ["Scenic"]]] },
      { title: "Beach rice lunch", summary: "A seaside finish with a classic rice meal.", items: [["Morning", "El Born and Picasso area", "Walk El Born, Santa Maria del Mar, and small design stores.", 22, ["Culture"]], ["Afternoon", "Barceloneta paella lunch", "Reserve a waterfront rice lunch and leave time for the beach.", 74, ["Food"]], ["Evening", "Rooftop farewell drink", "Pick a central rooftop for one final view.", 36, ["Nightlife"]]] },
    ],
  }),
  template({
    id: "amalfi-coast-7-days",
    title: "Amalfi Coast 7 days",
    category: "beach",
    destinationCode: "NAP",
    destinationName: "Amalfi Coast",
    city: "Positano",
    country: "Italy",
    location: "Amalfi Coast, Italy",
    days: 7,
    budget: "high",
    budgetAmount: 1840,
    pace: "relaxed",
    travelers: 2,
    interests: ["Beach", "Food", "Boats", "Photography"],
    tags: ["beach", "coast", "food", "relaxed"],
    rating: 4.9,
    reviews: 421,
    fromPrice: 1840,
    imageCity: "Positano",
    description: "A sunny Amalfi Coast route with Positano, Capri, Ravello, lemon groves, boat time, and slow seaside dinners.",
    itineraryDays: [
      { title: "Positano arrival", summary: "Settle into the cliffs, walk down to the beach, and keep the first evening easy.", items: [["Morning", "Arrive in Positano", "Transfer from Naples or Sorrento, check in, and get oriented around the steep lanes before carrying plans too far.", 35, ["Transport"]], ["Afternoon", "Spiaggia Grande swim", "Spend the afternoon at Positano's main beach with time for a first swim and cliffside photos.", 42, ["Beach"]], ["Evening", "Seaside seafood dinner", "Book a relaxed dinner near the beach and leave time for a slow walk back uphill.", 76, ["Food"]]] },
      { title: "Path of the Gods", summary: "A big-view hiking day above the coast with a calmer beach finish.", items: [["Morning", "Path of the Gods trail", "Start early from Bomerano and walk the classic cliff trail while temperatures are easier.", 24, ["Hiking"]], ["Afternoon", "Arienzo Beach Club", "Recover with reserved beach time and lunch below Positano's cliffs.", 72, ["Beach"]], ["Evening", "Positano sunset terrace", "Choose a terrace bar for golden-hour views before a simple pasta dinner.", 58, ["Scenic"]]] },
      { title: "Capri boat day", summary: "Spend the day around Capri's coves, town lanes, and viewpoint gardens.", items: [["Morning", "Boat to Capri", "Take an early boat so you can reach Capri before the busiest arrivals.", 88, ["Boats"]], ["Afternoon", "Gardens of Augustus", "Walk through Capri town to the gardens for Faraglioni views and photo stops.", 34, ["Scenic"]], ["Evening", "Marina Grande return dinner", "Return to Positano or Sorrento and keep dinner close to the harbor.", 70, ["Food"]]] },
      { title: "Amalfi and Atrani", summary: "Explore the coast's namesake town and its quieter neighbor.", items: [["Morning", "Amalfi Cathedral", "Visit the cathedral complex, then wander the paper shops and narrow streets.", 24, ["Culture"]], ["Afternoon", "Atrani beach pause", "Walk or ride to tiny Atrani for a calmer beach and lunch stop.", 46, ["Beach"]], ["Evening", "Lemon dessert tasting", "Try delizia al limone or limoncello after dinner in Amalfi.", 38, ["Food"]]] },
      { title: "Ravello gardens", summary: "Trade beach time for high terraces, villas, and quieter hilltop lanes.", items: [["Morning", "Villa Cimbrone", "Start at the Terrace of Infinity before the midday crowds.", 38, ["Scenic"]], ["Afternoon", "Villa Rufolo and Ravello lanes", "Pair garden views with a slow lunch and ceramic shops in Ravello.", 44, ["Culture"]], ["Evening", "Hilltown dinner", "Stay for a quieter dinner before returning to the coast.", 64, ["Food"]]] },
      { title: "Praiano and Fiordo di Furore", summary: "A smaller-coast day with hidden coves and dramatic bridge views.", items: [["Morning", "Marina di Praia", "Swim or take coffee near the small harbor between cliffs.", 32, ["Beach"]], ["Afternoon", "Fiordo di Furore viewpoint", "Stop for the fjord view and nearby photo points when access conditions allow.", 18, ["Photography"]], ["Evening", "Praiano sunset dinner", "Reserve a west-facing dinner spot for sunset over the water.", 72, ["Food"]]] },
      { title: "Slow beach finale", summary: "Finish with one last swim, shopping, and a no-rush farewell meal.", items: [["Morning", "Fornillo Beach", "Choose a quieter beach morning away from Positano's main strip.", 36, ["Beach"]], ["Afternoon", "Ceramics and linen shopping", "Pick up coastal ceramics, linen, or lemon gifts before packing.", 40, ["Shopping"]], ["Evening", "Final Amalfi Coast dinner", "End with seafood, local wine, and enough time to enjoy the night view.", 82, ["Food"]]] },
    ],
  }),
  template({
    id: "paris-first-timer",
    title: "Paris first-timer trip",
    category: "city",
    destinationCode: "PAR",
    destinationName: "Paris",
    city: "Paris",
    country: "France",
    location: "Paris, France",
    days: 4,
    budget: "medium",
    budgetAmount: 1180,
    pace: "balanced",
    travelers: 2,
    interests: ["Museums", "Food", "Architecture"],
    tags: ["city", "culture", "food"],
    rating: 4.7,
    reviews: 366,
    fromPrice: 1180,
    description: "A classic first Paris plan with museum time, neighborhood walks, bakeries, and evening river views.",
    itineraryDays: [
      { title: "Seine and Eiffel views", summary: "Start with the city icons at a comfortable pace.", items: [["Morning", "Trocadero and Eiffel Tower", "Arrive early for views and photos before the rush.", 24, ["Scenic"]], ["Afternoon", "Rue Cler and Invalides", "Lunch near Rue Cler, then walk toward Invalides.", 38, ["Food"]], ["Evening", "Seine cruise", "Use an evening boat ride for an easy first-night overview.", 42, ["Scenic"]]] },
      { title: "Louvre and Marais", summary: "Museum morning, food streets, and lively old lanes.", items: [["Morning", "Louvre highlights", "Focus on a few wings rather than trying to see everything.", 48, ["Museums"]], ["Afternoon", "Le Marais walk", "Explore Place des Vosges, shops, and falafel lanes.", 34, ["Culture"]], ["Evening", "Bistro dinner", "Reserve a neighborhood bistro for a classic meal.", 70, ["Food"]]] },
      { title: "Montmartre and Opera", summary: "Hilltop views and grand Paris interiors.", items: [["Morning", "Sacré-Coeur and Montmartre", "Walk up early, then wander quieter side streets.", 22, ["Culture"]], ["Afternoon", "Palais Garnier area", "Tour or admire the opera house and nearby passages.", 36, ["Architecture"]], ["Evening", "Canal Saint-Martin", "Have a casual dinner and drinks by the canal.", 48, ["Food"]]] },
      { title: "Left Bank finish", summary: "Gardens, bookstores, and one final pastry route.", items: [["Morning", "Luxembourg Gardens", "Start with coffee and a garden walk.", 18, ["Nature"]], ["Afternoon", "Saint-Germain and bookshops", "Browse galleries, cafes, and independent shops.", 38, ["Culture"]], ["Evening", "Notre-Dame island walk", "Finish around Ile Saint-Louis and the river.", 42, ["Scenic"]]] },
    ],
  }),
  template({
    id: "istanbul-culture-route",
    title: "Istanbul culture route",
    category: "city",
    destinationCode: "IST",
    destinationName: "Istanbul",
    city: "Istanbul",
    country: "Turkey",
    location: "Istanbul, Turkey",
    days: 5,
    budget: "medium",
    budgetAmount: 980,
    pace: "balanced",
    travelers: 2,
    interests: ["Culture", "Food", "Markets", "History"],
    tags: ["city", "culture", "food"],
    rating: 4.9,
    reviews: 287,
    fromPrice: 980,
    description: "A layered route through historic mosques, bazaars, Bosphorus neighborhoods, and serious food stops.",
    itineraryDays: [
      { title: "Sultanahmet essentials", summary: "Begin with the historic core and a simple tea-house evening.", items: [["Morning", "Hagia Sophia area", "Walk the square and understand the old imperial center.", 24, ["History"]], ["Afternoon", "Blue Mosque and Basilica Cistern", "Pair the mosque visit with the atmospheric cistern.", 34, ["Culture"]], ["Evening", "Sultanahmet terrace dinner", "Choose a calm terrace for your first night.", 48, ["Food"]]] },
      { title: "Palace and bazaars", summary: "Ottoman rooms, spice smells, and market lanes.", items: [["Morning", "Topkapi Palace", "Focus on courtyards, treasury, and harem if time allows.", 46, ["History"]], ["Afternoon", "Spice Bazaar to Grand Bazaar", "Snack and shop your way between the markets.", 36, ["Markets"]], ["Evening", "Karakoy meze", "Cross the bridge for meze and seafood.", 58, ["Food"]]] },
      { title: "Bosphorus neighborhoods", summary: "Water views and local-feeling districts.", items: [["Morning", "Bosphorus ferry", "Use the public ferry for a scenic ride north.", 18, ["Scenic"]], ["Afternoon", "Ortakoy and Bebek", "Walk waterside, eat kumpir, and linger by the strait.", 34, ["Food"]], ["Evening", "Kadikoy food streets", "Take the ferry to Asian-side dinner streets.", 52, ["Food"]]] },
      { title: "Balat and Galata", summary: "Colorful houses, churches, and hilltop views.", items: [["Morning", "Balat photo walk", "Explore colorful lanes respectfully and stop for coffee.", 22, ["Photography"]], ["Afternoon", "Galata Tower area", "Walk from Karakoy uphill through shops and viewpoints.", 30, ["Culture"]], ["Evening", "Istiklal side streets", "Eat away from the main avenue in smaller passages.", 44, ["Food"]]] },
      { title: "Hammam and final tastes", summary: "A slower day for bathing culture and last bites.", items: [["Morning", "Historic hammam", "Book a traditional bath session.", 70, ["Wellness"]], ["Afternoon", "Turkish coffee and dessert route", "Try coffee, baklava, and lokum from old shops.", 26, ["Food"]], ["Evening", "Rooftop farewell", "Finish with a Bosphorus-view drink or dinner.", 58, ["Scenic"]]] },
    ],
  }),
  template({
    id: "london-with-kids",
    title: "London with kids",
    category: "city",
    destinationCode: "LON",
    destinationName: "London",
    city: "London",
    country: "United Kingdom",
    location: "London, United Kingdom",
    days: 5,
    budget: "high",
    budgetAmount: 1680,
    pace: "relaxed",
    travelers: 4,
    interests: ["Family", "Museums", "Parks", "Food"],
    tags: ["city", "family", "museums"],
    rating: 4.8,
    reviews: 198,
    fromPrice: 1680,
    description: "A family-friendly London route with short hops, big museums, parks, and flexible rainy-day backups.",
    itineraryDays: [
      { title: "Westminster icons", summary: "Classic sights with enough breaks for kids.", items: [["Morning", "Buckingham Palace and St James's Park", "Watch the guards area, then let kids run in the park.", 16, ["Family"]], ["Afternoon", "Westminster and river walk", "See Big Ben, the river, and optional London Eye.", 78, ["Scenic"]], ["Evening", "Easy South Bank dinner", "Choose a casual spot along the South Bank.", 64, ["Food"]]] },
      { title: "Natural History day", summary: "Dinosaurs, hands-on exhibits, and Kensington Gardens.", items: [["Morning", "Natural History Museum", "Book timed entry and prioritize kid favorites.", 18, ["Museums"]], ["Afternoon", "Science Museum or Hyde Park", "Pick a second museum or outdoor time depending on energy.", 24, ["Family"]], ["Evening", "Kensington family dinner", "Stay nearby to avoid a long transfer.", 70, ["Food"]]] },
      { title: "Tower and boats", summary: "History made easier with a boat ride.", items: [["Morning", "Tower of London", "See the Crown Jewels and walls early.", 72, ["History"]], ["Afternoon", "Thames boat to Greenwich", "Use the boat as both transit and activity.", 46, ["Scenic"]], ["Evening", "Greenwich market bites", "Eat casually and return before bedtime.", 48, ["Food"]]] },
      { title: "Harry Potter and Covent Garden", summary: "Magic, performers, and low-stress shopping.", items: [["Morning", "Platform 9 3/4 photo stop", "Keep it quick unless the queue is short.", 8, ["Family"]], ["Afternoon", "Covent Garden performers", "Watch street acts and browse toy shops.", 22, ["Entertainment"]], ["Evening", "Theatre matinee or early show", "Pick a family-friendly show if budget allows.", 120, ["Entertainment"]]] },
      { title: "Markets and parks", summary: "A flexible last day around food and open space.", items: [["Morning", "Borough Market", "Share snacks and let everyone choose lunch.", 54, ["Food"]], ["Afternoon", "Regent's Park or Camden", "Choose playground time or colorful market browsing.", 24, ["Family"]], ["Evening", "Final pub dinner", "Book a family-friendly pub with classic dishes.", 76, ["Food"]]] },
    ],
  }),
  template({
    id: "rome-history-weekend",
    title: "Rome history weekend",
    category: "city",
    destinationCode: "ROM",
    destinationName: "Rome",
    city: "Rome",
    country: "Italy",
    location: "Rome, Italy",
    days: 3,
    budget: "medium",
    budgetAmount: 940,
    pace: "packed",
    travelers: 2,
    interests: ["History", "Food", "Architecture"],
    tags: ["city", "history", "food"],
    rating: 4.8,
    reviews: 267,
    fromPrice: 940,
    description: "A high-impact Rome weekend with ancient ruins, Vatican time, piazzas, pasta, and gelato.",
    itineraryDays: [
      { title: "Ancient Rome", summary: "Colosseum, Forum, and a classic Roman dinner.", items: [["Morning", "Colosseum timed entry", "Start early and use a guided route if possible.", 44, ["History"]], ["Afternoon", "Roman Forum and Palatine", "Walk the ruins while the morning context is fresh.", 32, ["History"]], ["Evening", "Trastevere pasta", "Cross the river for carbonara or cacio e pepe.", 62, ["Food"]]] },
      { title: "Vatican and Prati", summary: "Museum highlights and a quieter food neighborhood.", items: [["Morning", "Vatican Museums", "Pre-book and focus on the Raphael Rooms and Sistine Chapel.", 56, ["Museums"]], ["Afternoon", "St Peter's Basilica", "Visit the basilica and square after museum time.", 20, ["Architecture"]], ["Evening", "Prati aperitivo", "Eat near Prati instead of returning to tourist-heavy streets.", 58, ["Food"]]] },
      { title: "Piazzas and fountains", summary: "A walkable finish through Rome's prettiest historic center.", items: [["Morning", "Pantheon and coffee", "Start at the Pantheon before the busiest hours.", 18, ["Architecture"]], ["Afternoon", "Trevi, Spanish Steps, Villa Borghese", "String together icons with a park break.", 28, ["Scenic"]], ["Evening", "Final gelato walk", "Close with dinner and gelato near Piazza Navona.", 54, ["Food"]]] },
    ],
  }),
  template({
    id: "bali-slow-escape",
    title: "Bali slow escape",
    category: "beach",
    destinationCode: "DPS",
    destinationName: "Bali",
    city: "Ubud",
    country: "Indonesia",
    location: "Bali, Indonesia",
    days: 6,
    budget: "medium",
    budgetAmount: 1260,
    pace: "relaxed",
    travelers: 2,
    interests: ["Wellness", "Nature", "Beach", "Food"],
    tags: ["beach", "wellness", "slow"],
    rating: 4.9,
    reviews: 334,
    fromPrice: 1260,
    description: "A slower Bali plan split between Ubud wellness, rice terraces, beaches, and simple sunset rituals.",
    itineraryDays: [
      { title: "Ubud landing", summary: "Check in, decompress, and stay close to town.", items: [["Morning", "Arrival and hotel settle-in", "Keep plans loose after travel.", 18, ["Wellness"]], ["Afternoon", "Ubud market walk", "Browse crafts and get oriented around central Ubud.", 24, ["Culture"]], ["Evening", "Balinese dinner", "Start with a gentle local dinner near your stay.", 42, ["Food"]]] },
      { title: "Rice terraces and temples", summary: "Green landscapes and spiritual stops.", items: [["Morning", "Tegallalang terraces", "Go early for cooler weather and better light.", 28, ["Nature"]], ["Afternoon", "Tirta Empul or Gunung Kawi", "Choose one temple complex and avoid overpacking.", 34, ["Culture"]], ["Evening", "Spa massage", "Book a recovery massage after the day trip.", 48, ["Wellness"]]] },
      { title: "Waterfall day", summary: "A nature-focused day with swim stops.", items: [["Morning", "Tibumana Waterfall", "Arrive early and wear shoes with grip.", 26, ["Nature"]], ["Afternoon", "Kanto Lampo and lunch", "Pair a second waterfall with a simple warung meal.", 30, ["Adventure"]], ["Evening", "Quiet villa evening", "Order in or eat near your hotel.", 28, ["Relaxed"]]] },
      { title: "Move to the coast", summary: "Shift from jungle to beach pace.", items: [["Morning", "Transfer to Canggu or Sanur", "Choose Canggu for cafes or Sanur for calm water.", 38, ["Transport"]], ["Afternoon", "Beach and cafe time", "Keep the first coast afternoon easy.", 32, ["Beach"]], ["Evening", "Sunset seafood", "Eat near the water as the day cools.", 54, ["Food"]]] },
      { title: "Surf or snorkel", summary: "One active water day based on comfort.", items: [["Morning", "Beginner surf lesson", "Try a supervised surf class on a beginner beach.", 44, ["Adventure"]], ["Afternoon", "Pool and recovery", "Leave downtime after the lesson.", 18, ["Wellness"]], ["Evening", "Night market snacks", "Sample satay, noodles, and desserts.", 34, ["Food"]]] },
      { title: "Clifftop finale", summary: "Temple views and a final sunset.", items: [["Morning", "Slow breakfast and shopping", "Pick up gifts and leave space for packing.", 22, ["Shopping"]], ["Afternoon", "Uluwatu Temple", "Head south for clifftop views.", 36, ["Culture"]], ["Evening", "Kecak dance sunset", "Book the sunset performance and dinner nearby.", 58, ["Entertainment"]]] },
    ],
  }),
  template({
    id: "new-york-city-break",
    title: "New York city break",
    category: "city",
    destinationCode: "NYC",
    destinationName: "New York",
    city: "New York City",
    country: "United States",
    location: "New York, USA",
    days: 4,
    budget: "high",
    budgetAmount: 1540,
    pace: "packed",
    travelers: 2,
    interests: ["Food", "Museums", "Shopping", "Nightlife"],
    tags: ["city", "food", "museums"],
    rating: 4.7,
    reviews: 458,
    fromPrice: 1540,
    description: "A dense NYC long weekend with classic views, museums, downtown food, and neighborhood walks.",
    itineraryDays: [
      { title: "Midtown and skyline", summary: "Start with the city icons and a high-view evening.", items: [["Morning", "Bryant Park and library", "Ease into Midtown with coffee and architecture.", 18, ["Architecture"]], ["Afternoon", "Fifth Avenue to Central Park", "Walk shops, plazas, and the south end of the park.", 28, ["Shopping"]], ["Evening", "Top of the Rock", "Book a sunset skyline slot.", 52, ["Scenic"]]] },
      { title: "Downtown and Brooklyn", summary: "History, bridges, and food across the river.", items: [["Morning", "9/11 Memorial area", "Spend a reflective morning downtown.", 26, ["History"]], ["Afternoon", "Brooklyn Bridge walk", "Cross toward DUMBO for views and photos.", 18, ["Scenic"]], ["Evening", "Brooklyn pizza or food hall", "Eat casually before returning by subway.", 46, ["Food"]]] },
      { title: "Museum and park day", summary: "A major museum paired with green space.", items: [["Morning", "The Met highlights", "Pick two wings and avoid museum fatigue.", 36, ["Museums"]], ["Afternoon", "Central Park ramble", "Walk Bethesda Terrace, Bow Bridge, and lawns.", 18, ["Nature"]], ["Evening", "West Village dinner", "Book a small restaurant or try a pasta spot.", 68, ["Food"]]] },
      { title: "Lower East Side finale", summary: "Markets, neighborhoods, and one last show option.", items: [["Morning", "SoHo and Nolita", "Browse stores and cafe-hop downtown.", 34, ["Shopping"]], ["Afternoon", "Lower East Side food walk", "Try bagels, dumplings, and classic deli bites.", 42, ["Food"]], ["Evening", "Broadway or jazz", "Choose a show or a smaller jazz club.", 120, ["Nightlife"]]] },
    ],
  }),
  template({
    id: "swiss-alps-nature",
    title: "Swiss Alps nature trip",
    category: "mountains",
    destinationCode: "ZRH",
    destinationName: "Swiss Alps",
    city: "Interlaken",
    country: "Switzerland",
    location: "Interlaken, Switzerland",
    days: 6,
    budget: "high",
    budgetAmount: 2100,
    pace: "balanced",
    travelers: 2,
    interests: ["Mountains", "Nature", "Trains", "Adventure"],
    tags: ["mountains", "nature", "adventure"],
    rating: 4.9,
    reviews: 156,
    fromPrice: 2100,
    description: "A train-friendly Alpine route with lakes, mountain viewpoints, short hikes, and scenic villages.",
    itineraryDays: [
      { title: "Interlaken arrival", summary: "Settle between the lakes and keep the first day light.", items: [["Morning", "Train to Interlaken", "Arrive by rail and check into your base.", 42, ["Transport"]], ["Afternoon", "Hohematte and Aare walk", "Walk easy paths and get mountain orientation.", 12, ["Nature"]], ["Evening", "Swiss comfort dinner", "Try rosti or fondue in town.", 58, ["Food"]]] },
      { title: "Lauterbrunnen valley", summary: "Waterfalls, valley views, and gentle hiking.", items: [["Morning", "Lauterbrunnen village", "See Staubbach Falls and valley cliffs.", 20, ["Nature"]], ["Afternoon", "Murren or Wengen", "Ride up to a car-free village for views.", 48, ["Mountains"]], ["Evening", "Return to Interlaken", "Keep dinner simple after the mountain day.", 46, ["Food"]]] },
      { title: "Jungfraujoch or lake day", summary: "Choose a big-ticket summit or a calmer lake route.", items: [["Morning", "Jungfraujoch option", "Book only if weather is clear.", 190, ["Mountains"]], ["Afternoon", "Lake Brienz fallback", "If clouds roll in, take a scenic lake cruise.", 42, ["Scenic"]], ["Evening", "Quiet recovery", "Plan an early night after altitude or boat time.", 32, ["Relaxed"]]] },
      { title: "Grindelwald views", summary: "Cliff walk, gondolas, and postcard trails.", items: [["Morning", "Grindelwald First", "Ride up for viewpoints and optional cliff walk.", 68, ["Adventure"]], ["Afternoon", "Bachalpsee hike", "Do the lake walk if conditions are good.", 22, ["Hiking"]], ["Evening", "Village dinner", "Eat in Grindelwald before returning.", 54, ["Food"]]] },
      { title: "Zermatt transfer", summary: "Move deeper into the Alps toward the Matterhorn.", items: [["Morning", "Train to Zermatt", "Enjoy the scenic rail route into the car-free village.", 74, ["Transport"]], ["Afternoon", "Zermatt village walk", "Explore lanes, shops, and Matterhorn viewpoints.", 18, ["Scenic"]], ["Evening", "Mountain lodge-style dinner", "Book a cozy dinner and watch the weather forecast.", 70, ["Food"]]] },
      { title: "Matterhorn panorama", summary: "One final high Alpine view day.", items: [["Morning", "Gornergrat railway", "Ride up for Matterhorn views if weather allows.", 92, ["Mountains"]], ["Afternoon", "Easy trail descent", "Walk partway down or return by train depending on energy.", 16, ["Hiking"]], ["Evening", "Final fondue", "Celebrate the last Alpine night.", 76, ["Food"]]] },
    ],
  }),
  template({
    id: "lisbon-slow-living",
    title: "Lisbon slow-living week",
    category: "food",
    destinationCode: "LIS",
    destinationName: "Lisbon",
    city: "Lisbon",
    country: "Portugal",
    location: "Lisbon, Portugal",
    days: 7,
    budget: "medium",
    budgetAmount: 1090,
    pace: "relaxed",
    travelers: 2,
    interests: ["Food", "Culture", "Beach", "Photography"],
    tags: ["food", "city", "slow"],
    rating: 4.8,
    reviews: 312,
    fromPrice: 1090,
    description: "A slower Lisbon week with tiled viewpoints, seafood, day trips, and plenty of cafe time.",
    itineraryDays: [
      { title: "Baixa and Chiado", summary: "Arrive with plazas, tiled streets, and a gentle dinner.", items: [["Morning", "Praca do Comercio", "Start at the riverfront square and walk inland.", 12, ["Culture"]], ["Afternoon", "Chiado cafes", "Browse bookshops, cafes, and tiled streets.", 26, ["Food"]], ["Evening", "Fado dinner", "Book a small fado house for the first night.", 70, ["Music"]]] },
      { title: "Alfama viewpoints", summary: "Old lanes, trams, and miradouros.", items: [["Morning", "Alfama walk", "Climb slowly through narrow lanes and small squares.", 18, ["Culture"]], ["Afternoon", "Castle area", "Visit or circle the castle for views.", 28, ["History"]], ["Evening", "Seafood rice", "Try arroz de marisco near the old town.", 56, ["Food"]]] },
      { title: "Belem day", summary: "Monuments, river walks, and custard tarts.", items: [["Morning", "Jeronimos Monastery", "Visit the monastery and nearby gardens.", 24, ["Architecture"]], ["Afternoon", "Belem Tower and MAAT", "Walk the riverfront and choose a museum stop.", 28, ["Museums"]], ["Evening", "Pasteis de nata tasting", "Compare the famous tarts with another bakery.", 18, ["Food"]]] },
      { title: "Sintra day trip", summary: "Palaces and forested hills outside Lisbon.", items: [["Morning", "Pena Palace", "Use timed entry and go early.", 42, ["Culture"]], ["Afternoon", "Quinta da Regaleira", "Explore wells, gardens, and tunnels.", 32, ["Adventure"]], ["Evening", "Return for simple dinner", "Keep the evening low-key after the hills.", 44, ["Food"]]] },
      { title: "Cascais coast", summary: "A beach-town pause by train.", items: [["Morning", "Train to Cascais", "Ride west and walk the marina area.", 18, ["Transport"]], ["Afternoon", "Beach and Boca do Inferno", "Swim or walk the coastal path.", 28, ["Beach"]], ["Evening", "Fish dinner", "Eat grilled fish before returning.", 58, ["Food"]]] },
      { title: "Markets and neighborhoods", summary: "Food hall lunch and local design streets.", items: [["Morning", "Campo de Ourique market", "Taste small plates in a neighborhood market.", 34, ["Food"]], ["Afternoon", "Principe Real", "Browse concept stores and gardens.", 22, ["Shopping"]], ["Evening", "Rooftop sunset", "Pick a miradouro or rooftop for golden hour.", 36, ["Scenic"]]] },
      { title: "Slow final morning", summary: "One last coffee, tram view, and flexible shopping.", items: [["Morning", "Tram viewpoint route", "Use an early tram ride before crowds.", 16, ["Scenic"]], ["Afternoon", "Tile or cork shopping", "Buy gifts from local shops.", 28, ["Shopping"]], ["Evening", "Final petiscos", "Close with small plates and vinho verde.", 52, ["Food"]]] },
    ],
  }),
  template({
    id: "reykjavik-ring-road",
    title: "Iceland ring road sampler",
    category: "adventure",
    destinationCode: "KEF",
    destinationName: "Iceland",
    city: "Reykjavik",
    country: "Iceland",
    location: "Reykjavik, Iceland",
    days: 7,
    budget: "high",
    budgetAmount: 2380,
    pace: "packed",
    travelers: 2,
    interests: ["Adventure", "Nature", "Road trip", "Photography"],
    tags: ["adventure", "nature", "road trip"],
    rating: 4.9,
    reviews: 198,
    fromPrice: 2380,
    description: "A one-week Iceland sampler focused on the south coast, glaciers, lagoons, and dramatic road-trip stops.",
    itineraryDays: [
      { title: "Reykjavik arrival", summary: "Land, soak, and prepare for the road.", items: [["Morning", "Arrival and car pickup", "Collect the car and supplies before heading into town.", 70, ["Transport"]], ["Afternoon", "Reykjavik center", "Walk Hallgrimskirkja, harbor, and main streets.", 24, ["Culture"]], ["Evening", "Geothermal soak", "Book Sky Lagoon or a local pool.", 78, ["Wellness"]]] },
      { title: "Golden Circle", summary: "Classic geothermal and waterfall route.", items: [["Morning", "Thingvellir National Park", "Walk between tectonic plates and historic sites.", 18, ["Nature"]], ["Afternoon", "Geysir and Gullfoss", "See geothermal eruptions and the major waterfall.", 20, ["Nature"]], ["Evening", "Stay near Selfoss", "Sleep close to the south coast route.", 62, ["Logistics"]]] },
      { title: "South coast waterfalls", summary: "Waterfalls, black sand, and cliff views.", items: [["Morning", "Seljalandsfoss and Skogafoss", "Visit two major waterfalls early.", 18, ["Nature"]], ["Afternoon", "Reynisfjara black beach", "Watch waves carefully and stay far from the surf.", 12, ["Beach"]], ["Evening", "Vik overnight", "Stay in or near Vik for the next leg.", 68, ["Logistics"]]] },
      { title: "Glacier lagoon", summary: "Ice, lagoons, and big landscapes.", items: [["Morning", "Fjadrargljufur canyon", "Stop for canyon views if conditions allow.", 16, ["Nature"]], ["Afternoon", "Jokulsarlon and Diamond Beach", "Spend time at the glacier lagoon and nearby beach.", 24, ["Photography"]], ["Evening", "Hofn seafood", "Stay near Hofn and try langoustine.", 82, ["Food"]]] },
      { title: "East fjords drive", summary: "A scenic driving day with small-town stops.", items: [["Morning", "Fjord viewpoints", "Drive slowly and stop at safe pullouts.", 20, ["Road trip"]], ["Afternoon", "Seydisfjordur detour", "Visit the colorful town if weather and roads are good.", 22, ["Scenic"]], ["Evening", "Egilsstadir base", "Rest inland after a long driving day.", 58, ["Logistics"]]] },
      { title: "Myvatn area", summary: "Geothermal landscapes and lava fields.", items: [["Morning", "Dettifoss option", "Visit the powerful waterfall if roads are open.", 18, ["Nature"]], ["Afternoon", "Hverir and Dimmuborgir", "Walk geothermal fields and lava formations.", 22, ["Adventure"]], ["Evening", "Myvatn Nature Baths", "Soak after a cold, active day.", 76, ["Wellness"]]] },
      { title: "Return via Akureyri", summary: "Northern town stop and final drive planning.", items: [["Morning", "Godafoss waterfall", "Stop at the waterfall on the way west.", 12, ["Nature"]], ["Afternoon", "Akureyri walk", "Have lunch and stretch in the northern capital.", 34, ["Culture"]], ["Evening", "Final road segment", "Return toward Reykjavik or overnight en route.", 88, ["Road trip"]]] },
    ],
  }),
];

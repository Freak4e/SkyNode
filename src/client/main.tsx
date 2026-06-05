import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { GlobalTripNotifications } from "./components/GlobalTripNotifications";
import { AccountPage } from "./pages/AccountPage";
import { AssistantPage } from "./pages/AssistantPage";
import { AuthPage } from "./pages/AuthPage";
import { DestinationsPage } from "./pages/DestinationsPage";
import { HomePage } from "./pages/HomePage";
import { LiveFlightsPage } from "./pages/LiveFlightsPage";
import { PlannerPage } from "./pages/PlannerPage";
import { SearchResultsPage } from "./pages/SearchResultsPage";
import { ExploreTripsPage } from "./pages/ExploreTripsPage";
import { TripDetailPage } from "./pages/TripDetailPage";
import { TripJoinPage } from "./pages/TripJoinPage";
import { TripLibraryPage } from "./pages/TripLibraryPage";
import { TripsPage } from "./pages/TripsPage";
import "./styles.css";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <GlobalTripNotifications />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/search" element={<SearchResultsPage />} />
          <Route path="/live-flights" element={<LiveFlightsPage />} />
          <Route path="/destinations" element={<DestinationsPage />} />
          <Route path="/planner" element={<PlannerPage />} />
          <Route path="/trip-library" element={<TripLibraryPage />} />
          <Route path="/trips/join/:token" element={<TripJoinPage />} />
          <Route path="/trips/:tripId" element={<TripDetailPage />} />
          <Route path="/trips" element={<TripsPage />} />
          <Route path="/explore-trips" element={<ExploreTripsPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);

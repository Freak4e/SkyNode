import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { AccountPage } from "./pages/AccountPage";
import { AssistantPage } from "./pages/AssistantPage";
import { AuthPage } from "./pages/AuthPage";
import { HomePage } from "./pages/HomePage";
import { LiveFlightsPage } from "./pages/LiveFlightsPage";
import { PlannerPage } from "./pages/PlannerPage";
import { SearchResultsPage } from "./pages/SearchResultsPage";
import "./styles.css";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/search" element={<SearchResultsPage />} />
          <Route path="/live-flights" element={<LiveFlightsPage />} />
          <Route path="/planner" element={<PlannerPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);

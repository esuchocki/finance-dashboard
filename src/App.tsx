
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Transactions from "./pages/Transactions";
import Persona from "./pages/Persona";
import ModeSelection from "./pages/ModeSelection";
import NotFound from "./pages/NotFound";
import MainLayout from "./layouts/MainLayout";
import BusinessLayout from "./layouts/BusinessLayout";
import BusinessEntities from "./pages/business/BusinessEntities";
import BusinessDashboardPage from "./pages/business/BusinessDashboard";
import BusinessTransactions from "./pages/business/BusinessTransactions";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <Routes>
        {/* Mode Selection - Default Landing Page */}
        <Route path="/" element={<ModeSelection />} />

        {/* Personal Mode Routes */}
        <Route path="/personal" element={<MainLayout mode="personal" />}>
          <Route index element={<Index />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="persona" element={<Persona />} />
        </Route>

        {/* Business Mode Routes - To be implemented */}
        <Route path="/business" element={<BusinessLayout />}>
          <Route index element={<Navigate to="/business/dashboard" replace />} />
          <Route path="dashboard" element={<BusinessDashboardPage />} />
          <Route path="entities" element={<BusinessEntities />} />
          <Route path="transactions" element={<BusinessTransactions />} />
        </Route>

        {/* 404 Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;

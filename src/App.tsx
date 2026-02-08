
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import BusinessLayout from "./layouts/BusinessLayout";
import BusinessAccounts from "./pages/business/BusinessAccounts";
import BusinessDashboardPage from "./pages/business/BusinessDashboard";
import BusinessTransactions from "./pages/business/BusinessTransactions";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter basename="/finance-dashboard">
      <AuthProvider>
        <Routes>
          {/* Login - Only unprotected route */}
          <Route path="/login" element={<Login />} />

          {/* Redirect root to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Business Mode Routes - Protected */}
          <Route
            path="/business"
            element={
              <ProtectedRoute>
                <BusinessLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/business/dashboard" replace />} />
            <Route path="dashboard" element={<BusinessDashboardPage />} />
            <Route path="accounts" element={<BusinessAccounts />} />
            <Route path="transactions" element={<BusinessTransactions />} />
          </Route>

          {/* 404 Not Found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;

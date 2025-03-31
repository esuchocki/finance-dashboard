
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { FinanceProvider } from "./context/FinanceContext";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import MainLayout from "@/layouts/MainLayout";
import IndexPage from "@/pages/Index";
import TransactionsPage from "@/pages/Transactions";
import NotFoundPage from "@/pages/NotFound";
import ClaudeDebugPage from "@/components/ClaudeDebugPage";

import "./App.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <IndexPage />,
      },
      {
        path: "transactions",
        element: <TransactionsPage />,
      },
      {
        path: "claude-debug",
        element: <ClaudeDebugPage />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="finance-dash-theme">
      <FinanceProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" />
      </FinanceProvider>
    </ThemeProvider>
  );
}

export default App;

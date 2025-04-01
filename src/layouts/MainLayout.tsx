
import React from "react";
import { Outlet } from "react-router-dom";
import AppNavbar from "@/components/AppNavbar";
import { FinanceProvider } from "@/context/FinanceContext";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserCircle2 } from "lucide-react";

const MainLayout = () => {
  const [hasPersonaData, setHasPersonaData] = React.useState(false);
  
  // Check if background data is available in localStorage
  React.useEffect(() => {
    const savedData = localStorage.getItem('financial_persona');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        // Validate that essential data exists
        if (parsedData.name && parsedData.birthDate) {
          setHasPersonaData(true);
        }
      } catch (error) {
        console.error("Error checking background data:", error);
      }
    }
  }, []);

  return (
    <FinanceProvider>
      <TooltipProvider>
        <Toaster position="top-right" />
        <div className="min-h-screen flex flex-col">
          <AppNavbar />
          <main className="flex-1 container py-6 px-4">
            {hasPersonaData && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-700">
                  <UserCircle2 className="h-5 w-5" />
                  <p className="text-sm">
                    Personal background information is available for enhanced insights
                  </p>
                </div>
              </div>
            )}
            <Outlet />
          </main>
          <footer className="py-4 border-t">
            <div className="container text-center text-sm text-muted-foreground">
              <p>Sailing Funds</p>
              <p className="text-xs mt-1">Data is processed locally and never leaves your device</p>
            </div>
          </footer>
        </div>
      </TooltipProvider>
    </FinanceProvider>
  );
};

export default MainLayout;

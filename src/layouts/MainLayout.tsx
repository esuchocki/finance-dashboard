
import React from "react";
import { Outlet } from "react-router-dom";
import AppNavbar from "@/components/AppNavbar";
import { FinanceProvider } from "@/context/FinanceContext";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserCircle2, BookOpen } from "lucide-react";
import { AppMode } from "@/lib/types";

interface MainLayoutProps {
  mode?: AppMode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ mode = 'personal' }) => {
  const [hasPersonaData, setHasPersonaData] = React.useState(false);
  const [hasNarrativeData, setHasNarrativeData] = React.useState(false);
  
  // Check if background data is available in localStorage
  React.useEffect(() => {
    const checkFinancialPersona = () => {
      try {
        const savedData = localStorage.getItem('financial_persona');
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          
          // Check for personal background data
          if (parsedData.personalBackground?.name && parsedData.personalBackground?.birthDate) {
            setHasPersonaData(true);
          }
          
          // Check for narrative transactions
          if (Array.isArray(parsedData.narrativeTransactions) && parsedData.narrativeTransactions.length > 0) {
            setHasNarrativeData(true);
          }
        }
      } catch (error) {
        console.error("Error checking financial persona data:", error);
      }
    };
    
    checkFinancialPersona();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <TooltipProvider>
        <FinanceProvider mode={mode}>
          <Toaster position="top-right" />
          <AppNavbar mode={mode} />
          <main className="flex-1 container py-6 px-4">
            {/* Show banner with appropriate information based on available data */}
            {(hasPersonaData || hasNarrativeData) && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2 text-green-700">
                {hasPersonaData && (
                  <div className="flex items-center gap-2">
                    <UserCircle2 className="h-5 w-5" />
                    <p className="text-sm">
                      Personal background information is available for enhanced insights
                    </p>
                  </div>
                )}
                
                {hasPersonaData && hasNarrativeData && (
                  <span className="mx-2">•</span>
                )}
                
                {hasNarrativeData && (
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    <p className="text-sm">
                      Financial narrative data has been built from your transactions
                    </p>
                  </div>
                )}
              </div>
            )}
            <Outlet />
          </main>
          <footer className="py-4 border-t">
            <div className="container text-center text-sm text-muted-foreground">
              <p>
                {mode === 'business' ? 'Finance - Business Edition' : 'Sailing Funds'}
              </p>
              <p className="text-xs mt-1">Data is processed locally and never leaves your device</p>
            </div>
          </footer>
        </FinanceProvider>
      </TooltipProvider>
    </div>
  );
};

export default MainLayout;

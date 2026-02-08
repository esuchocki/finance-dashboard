
import React from "react";
import { Outlet } from "react-router-dom";
import AppNavbar from "@/components/AppNavbar";
import { FinanceProvider } from "@/context/FinanceContext";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppMode } from "@/lib/types";

interface MainLayoutProps {
  mode?: AppMode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ mode = 'personal' }) => {

  return (
    <div className="min-h-screen flex flex-col">
      <TooltipProvider>
        <FinanceProvider mode={mode}>
          <Toaster position="top-right" />
          <AppNavbar mode={mode} />
          <main className="flex-1 container py-3 md:py-6 px-3 md:px-4">
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

import React from "react";
import { Outlet } from "react-router-dom";
import AppNavbar from "@/components/AppNavbar";
import InactivityTimeout from "@/components/InactivityTimeout";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FinanceProvider } from "@/context/FinanceContext";

const BusinessLayoutContent = () => {
  return (
    <InactivityTimeout>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
        <Toaster position="top-right" />
        <AppNavbar mode="business" />
        <main className="flex-1 container py-3 md:py-6 px-3 md:px-4">
          <Outlet />
        </main>
        <footer className="py-4 border-t bg-white dark:bg-slate-950">
          <div className="container text-center text-sm text-muted-foreground">
          </div>
        </footer>
      </div>
    </InactivityTimeout>
  );
};

const BusinessLayout = () => {
  return (
    <TooltipProvider>
      <FinanceProvider mode="business">
        <BusinessLayoutContent />
      </FinanceProvider>
    </TooltipProvider>
  );
};

export default BusinessLayout;

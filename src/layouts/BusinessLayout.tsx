import React from "react";
import { Outlet } from "react-router-dom";
import AppNavbar from "@/components/AppNavbar";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Building2, Info } from "lucide-react";
import { FinanceProvider, useFinance } from "@/context/FinanceContext";
import { Alert, AlertDescription } from "@/components/ui/alert";

const BusinessLayoutContent = () => {
  const { businessAccounts, selectedAccountIds } = useFinance();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <Toaster position="top-right" />
      <AppNavbar mode="business" />
      <main className="flex-1 container py-6 px-4">

          {/* Empty State for Business Mode */}
          {businessAccounts.length === 0 && (
            <Alert className="mb-4 bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
              <Info className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-900 dark:text-amber-100">
                <span className="font-medium">Get started:</span> Upload QBO files from the Account Management page to begin analyzing your organization's finances across multiple bank accounts.
              </AlertDescription>
            </Alert>
          )}

          <Outlet />
        </main>
        <footer className="py-4 border-t bg-white dark:bg-slate-950">
          <div className="container text-center text-sm text-muted-foreground">
            <p className="text-xs mt-1">
              Data processed locally and never leaves your device
            </p>
          </div>
        </footer>
    </div>
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

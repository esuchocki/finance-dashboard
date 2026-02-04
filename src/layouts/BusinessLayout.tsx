import React from "react";
import { Outlet } from "react-router-dom";
import AppNavbar from "@/components/AppNavbar";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Building2, Info } from "lucide-react";
import { useFinance } from "@/context/FinanceContext";
import { Alert, AlertDescription } from "@/components/ui/alert";

const BusinessLayout = () => {
  const { businessEntities, selectedEntityIds } = useFinance();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
      <TooltipProvider>
        <Toaster position="top-right" />
        <AppNavbar mode="business" />
        <main className="flex-1 container py-6 px-4">
          {/* Business Mode Status Banner */}
          {businessEntities.length > 0 && (
            <Alert className="mb-4 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-blue-900 dark:text-blue-100">
                    Business Mode Active
                  </span>
                  <span className="text-blue-700 dark:text-blue-300">
                    {businessEntities.length} {businessEntities.length === 1 ? 'entity' : 'entities'} loaded
                  </span>
                  {selectedEntityIds.length > 0 && selectedEntityIds.length < businessEntities.length && (
                    <>
                      <span className="text-blue-500">•</span>
                      <span className="text-blue-700 dark:text-blue-300">
                        {selectedEntityIds.length} selected for consolidation
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                  <Info className="h-3 w-3" />
                  <span>Multi-entity nonprofit analysis</span>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Empty State for Business Mode */}
          {businessEntities.length === 0 && (
            <Alert className="mb-4 bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
              <Info className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-900 dark:text-amber-100">
                <span className="font-medium">Get started:</span> Upload QBO files from the Entity Management page to begin analyzing your organization's finances.
              </AlertDescription>
            </Alert>
          )}

          <Outlet />
        </main>
        <footer className="py-4 border-t bg-white dark:bg-slate-950">
          <div className="container text-center text-sm text-muted-foreground">
            <p className="font-medium">Transaction Tapestry - Business Edition</p>
            <p className="text-xs mt-1">
              Nonprofit financial analysis for Karme Choling • Data processed locally
            </p>
          </div>
        </footer>
      </TooltipProvider>
    </div>
  );
};

export default BusinessLayout;

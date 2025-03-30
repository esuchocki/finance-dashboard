
import React from "react";
import { Outlet } from "react-router-dom";
import AppNavbar from "@/components/AppNavbar";
import { FinanceProvider } from "@/context/FinanceContext";
import { Toaster } from "sonner";

const MainLayout = () => {
  return (
    <FinanceProvider>
      <Toaster position="top-right" />
      <div className="min-h-screen flex flex-col">
        <AppNavbar />
        <main className="flex-1 container py-6 px-4">
          <Outlet />
        </main>
        <footer className="py-4 border-t">
          <div className="container text-center text-sm text-muted-foreground">
            <p>Finance Tapestry - Personal Finance Dashboard</p>
            <p className="text-xs mt-1">Data is processed locally and never leaves your device</p>
          </div>
        </footer>
      </div>
    </FinanceProvider>
  );
};

export default MainLayout;

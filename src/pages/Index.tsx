
import React from "react";
import { Dashboard } from "@/components/dashboard";
import { useFinance } from "@/context/FinanceContext";

const Index = () => {
  const { transactions } = useFinance();
  
  return (
    <div className="max-w-7xl mx-auto">
      <Dashboard />
      
      {transactions.length > 0 && (
        <div className="mt-8 mb-4 text-center text-sm text-muted-foreground animate-fade-in">
          <p>Financial data visualization powered by QBO Parser & Claude AI</p>
        </div>
      )}
    </div>
  );
};

export default Index;

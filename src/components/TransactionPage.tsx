
import React, { useState } from "react";
import { useFinance } from "@/context/FinanceContext";
import TransactionList from "./TransactionList";
import TransactionFilters from "./TransactionFilters";
import AnalysisSectionWrapper from "./AnalysisSectionWrapper";
import FileUploader from "./FileUploader";
import { Button } from "@/components/ui/button";
import { RefreshCw, FileText } from "lucide-react";

const TransactionPage = () => {
  const { transactions, filteredTransactions, clearData } = useFinance();
  const [activeTab, setActiveTab] = useState("all");

  return (
    <div className="space-y-6">
      {transactions.length === 0 ? (
        <div className="animate-fade-in">
          <FileUploader />
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col md:flex-row justify-between space-y-4 md:space-y-0 items-start md:items-center">
            <h1 className="text-2xl font-bold flex items-center">
              <FileText className="h-6 w-6 mr-2 text-finance-primary" />
              Transactions
            </h1>
            <Button 
              variant="outline" 
              className="flex items-center gap-2 hover:bg-muted" 
              onClick={clearData}
            >
              <RefreshCw className="h-4 w-4" />
              Change QBO File
            </Button>
          </div>
          
          <div className="animate-fade-in stagger-1">
            <TransactionFilters />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 animate-fade-in stagger-2">
              <TransactionList 
                transactions={filteredTransactions} 
                title={`Filtered Transactions (${filteredTransactions.length})`} 
              />
            </div>
            <div className="md:col-span-1 animate-fade-in stagger-3">
              <AnalysisSectionWrapper />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionPage;

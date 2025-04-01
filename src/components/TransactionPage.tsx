
import React, { useState } from "react";
import { useFinance } from "@/context/FinanceContext";
import TransactionList from "./TransactionList";
import TransactionFilters from "./TransactionFilters";
import AnalysisSectionWrapper from "./AnalysisSectionWrapper";
import FileUploader from "./FileUploader";
import { Button } from "@/components/ui/button";
import { RefreshCw, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const TransactionPage = () => {
  const { 
    transactions, 
    filteredTransactions, 
    clearData, 
    isDevelopmentMode, 
    toggleDevelopmentMode 
  } = useFinance();
  const [currentPage, setCurrentPage] = useState(1);
  const transactionsPerPage = 10;
  
  // Calculate pagination values
  const totalPages = Math.ceil(filteredTransactions.length / transactionsPerPage);
  const indexOfLastTransaction = currentPage * transactionsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - transactionsPerPage;
  const currentTransactions = filteredTransactions.slice(indexOfFirstTransaction, indexOfLastTransaction);

  // Pagination handlers - removed window.scrollTo
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // No scroll to top here
  };

  return (
    <div className="space-y-6">
      {/* Development Mode Toggle - Always visible */}
      <div className="flex items-center justify-end space-x-2 p-2 bg-muted/40 rounded-md">
        <Label htmlFor="development-mode-transactions" className="text-sm">
          Development Mode
        </Label>
        <Switch
          id="development-mode-transactions"
          checked={isDevelopmentMode}
          onCheckedChange={toggleDevelopmentMode}
        />
        {isDevelopmentMode && (
          <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-800">
            Cache Disabled
          </Badge>
        )}
      </div>
      
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
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                className="flex items-center gap-2 hover:bg-muted" 
                onClick={clearData}
              >
                <RefreshCw className="h-4 w-4" />
                Change QBO File
              </Button>
            </div>
          </div>
          
          <div className="animate-fade-in stagger-1">
            <TransactionFilters />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 animate-fade-in stagger-2">
              <TransactionList 
                transactions={currentTransactions} 
                title={`Filtered Transactions (${filteredTransactions.length})`} 
                showViewAll={false}
                pagination={{
                  currentPage,
                  totalPages,
                  onPageChange: handlePageChange
                }}
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

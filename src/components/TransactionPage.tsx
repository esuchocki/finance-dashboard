
import React, { useState } from "react";
import { useFinance } from "@/context/FinanceContext";
import TransactionList from "./TransactionList";
import TransactionFilters from "./TransactionFilters";
import AnalysisSection from "./AnalysisSection";

const TransactionPage = () => {
  const { filteredTransactions } = useFinance();
  const [page, setPage] = useState(1);
  const perPage = 20;
  
  const totalPages = Math.ceil(filteredTransactions.length / perPage);
  const startIndex = (page - 1) * perPage;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + perPage);
  
  const goToPage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <TransactionFilters />
        </div>
        <div className="lg:col-span-3 space-y-6">
          <AnalysisSection />
          
          <TransactionList 
            transactions={paginatedTransactions}
            title={`Transactions (${filteredTransactions.length})`}
          />
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-4">
              <div className="flex items-center space-x-2">
                <button
                  className="px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <span className="text-sm">
                  Page {page} of {totalPages}
                </span>
                <button
                  className="px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => goToPage(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionPage;

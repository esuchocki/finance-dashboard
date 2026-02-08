import React, { useState, useCallback } from "react";
import { useFinance } from "@/context/FinanceContext";
import { useConsolidation } from "@/context/hooks/useConsolidation";
import { BusinessTransaction } from "@/lib/types";
import TransactionList from "@/components/TransactionList";
import TransactionSearch from "@/components/business/transactions/TransactionSearch";
import AccountSelector from "@/components/business/accounts/AccountSelector";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

const BusinessTransactions = () => {
  const { businessAccounts, selectedAccountIds, getAccountTransactions } = useFinance();
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredTransactions, setFilteredTransactions] = useState<BusinessTransaction[]>([]);
  const searchInitialized = React.useRef(false);
  const transactionsPerPage = 25;

  const { consolidatedTransactions } = useConsolidation({
    accounts: businessAccounts,
    selectedAccountIds,
    getAccountTransactions
  });

  // Handle filtered transactions from search component
  const handleFilteredTransactionsChange = useCallback((transactions: BusinessTransaction[]) => {
    setFilteredTransactions(transactions);
    searchInitialized.current = true;
    setCurrentPage(1);
  }, []);

  // Once search is initialized, always use filtered results (may be empty on no match)
  const transactionsToDisplay = searchInitialized.current ? filteredTransactions : consolidatedTransactions;

  // Calculate pagination values
  const totalPages = Math.ceil(transactionsToDisplay.length / transactionsPerPage);
  const indexOfLastTransaction = currentPage * transactionsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - transactionsPerPage;
  const currentTransactions = transactionsToDisplay.slice(indexOfFirstTransaction, indexOfLastTransaction);

  // Pagination handler
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Reset to page 1 when account selection changes
  React.useEffect(() => {
    setCurrentPage(1);
    setFilteredTransactions([]);
    searchInitialized.current = false;
  }, [selectedAccountIds]);

  // Build account list for search component
  const accountsList = React.useMemo(() => {
    return businessAccounts
      .filter(acc => selectedAccountIds.includes(acc.id))
      .map(acc => ({
        id: acc.id,
        name: acc.name
      }));
  }, [businessAccounts, selectedAccountIds]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Transaction Search</h1>
        <p className="text-muted-foreground mt-2">
          Search and filter transactions across selected accounts
        </p>
      </div>

      <AccountSelector />

      {selectedAccountIds.length === 0 ? (
        <Alert>
          <Info className="h-5 w-5" />
          <AlertDescription>
            Select accounts above to search their transactions.
          </AlertDescription>
        </Alert>
      ) : consolidatedTransactions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No transactions found for selected accounts
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Search Component */}
          <TransactionSearch
            transactions={consolidatedTransactions}
            accounts={accountsList}
            onFilteredTransactionsChange={handleFilteredTransactionsChange}
          />

          {/* Results */}
          {transactionsToDisplay.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground text-lg mb-2">No transactions match your search criteria</p>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your filters or clearing them to see all transactions
                </p>
              </CardContent>
            </Card>
          ) : (
            <TransactionList
              transactions={currentTransactions}
              title={`Search Results (${transactionsToDisplay.length.toLocaleString()} of ${consolidatedTransactions.length.toLocaleString()} transactions)`}
              showViewAll={false}
              pagination={{
                currentPage,
                totalPages,
                onPageChange: handlePageChange
              }}
            />
          )}
        </>
      )}
    </div>
  );
};

export default BusinessTransactions;

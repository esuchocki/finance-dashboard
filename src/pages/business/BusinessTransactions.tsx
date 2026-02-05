import React, { useState } from "react";
import { useFinance } from "@/context/FinanceContext";
import { useConsolidation } from "@/context/hooks/useConsolidation";
import TransactionList from "@/components/TransactionList";
import AccountSelector from "@/components/business/accounts/AccountSelector";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

const BusinessTransactions = () => {
  const { businessAccounts, selectedAccountIds, getAccountTransactions } = useFinance();
  const [currentPage, setCurrentPage] = useState(1);
  const transactionsPerPage = 10;

  const { consolidatedTransactions } = useConsolidation({
    accounts: businessAccounts,
    selectedAccountIds,
    getAccountTransactions
  });

  // Calculate pagination values
  const totalPages = Math.ceil(consolidatedTransactions.length / transactionsPerPage);
  const indexOfLastTransaction = currentPage * transactionsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - transactionsPerPage;
  const currentTransactions = consolidatedTransactions.slice(indexOfFirstTransaction, indexOfLastTransaction);

  // Pagination handler
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Reset to page 1 when account selection changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedAccountIds]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Consolidated Transactions</h1>
        <p className="text-muted-foreground mt-2">
          View transactions across selected bank accounts
        </p>
      </div>

      <AccountSelector />

      {selectedAccountIds.length === 0 ? (
        <Alert>
          <Info className="h-5 w-5" />
          <AlertDescription>
            Select accounts above to view their transactions.
          </AlertDescription>
        </Alert>
      ) : consolidatedTransactions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No transactions found for selected accounts
          </CardContent>
        </Card>
      ) : (
        <TransactionList
          transactions={currentTransactions}
          title={`Consolidated Transactions (${consolidatedTransactions.length.toLocaleString()})`}
          showViewAll={false}
          pagination={{
            currentPage,
            totalPages,
            onPageChange: handlePageChange
          }}
        />
      )}
    </div>
  );
};

export default BusinessTransactions;

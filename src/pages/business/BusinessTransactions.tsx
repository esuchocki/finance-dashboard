import React from "react";
import { useFinance } from "@/context/FinanceContext";
import { useConsolidation } from "@/context/hooks/useConsolidation";
import TransactionList from "@/components/TransactionList";
import EntitySelector from "@/components/business/entities/EntitySelector";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

const BusinessTransactions = () => {
  const { businessEntities, selectedEntityIds, getEntityTransactions } = useFinance();

  const { consolidatedTransactions } = useConsolidation({
    entities: businessEntities,
    selectedEntityIds,
    getEntityTransactions
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Consolidated Transactions</h1>
        <p className="text-muted-foreground mt-2">
          View transactions across selected entities
        </p>
      </div>

      <EntitySelector />

      {selectedEntityIds.length === 0 ? (
        <Alert>
          <Info className="h-5 w-5" />
          <AlertDescription>
            Select entities above to view their transactions.
          </AlertDescription>
        </Alert>
      ) : consolidatedTransactions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No transactions found for selected entities
          </CardContent>
        </Card>
      ) : (
        <TransactionList
          transactions={consolidatedTransactions}
          title={`Consolidated Transactions (${consolidatedTransactions.length.toLocaleString()})`}
        />
      )}
    </div>
  );
};

export default BusinessTransactions;

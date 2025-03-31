
import React from "react";
import { Transaction } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface TransactionListProps {
  transactions: Transaction[];
  title?: string;
  showViewAll?: boolean;
}

const TransactionList: React.FC<TransactionListProps> = ({ 
  transactions, 
  title = "Transactions", 
  showViewAll = true 
}) => {
  if (!transactions || transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No transactions to display
          </div>
        </CardContent>
      </Card>
    );
  }

  // Helper function to get the best display name for a transaction
  const getDisplayName = (transaction: Transaction) => {
    // Always prioritize the verbose description if available and different from original description
    if (transaction.verboseDescription && 
        transaction.verboseDescription !== transaction.description &&
        transaction.verboseDescription !== transaction.name) {
      return transaction.verboseDescription;
    }
    if (transaction.payee) {
      return transaction.payee;
    }
    if (transaction.description) {
      return transaction.description;
    }
    return transaction.name;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>{title}</CardTitle>
        {showViewAll && transactions.length > 0 && (
          <Link 
            to="/transactions" 
            className="text-sm text-muted-foreground hover:text-primary flex items-center"
          >
            View all
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {transactions.map((transaction) => (
            <div 
              key={transaction.id} 
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex flex-col">
                <span className="font-medium">
                  {getDisplayName(transaction)}
                </span>
                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2">
                  <span>{new Date(transaction.date).toLocaleDateString()}</span>
                  {transaction.category && transaction.category !== "Uncategorized" && (
                    <>
                      <span>•</span>
                      <span>{transaction.category}</span>
                    </>
                  )}
                  {transaction.subCategory && (
                    <>
                      <span>•</span>
                      <span>{transaction.subCategory}</span>
                    </>
                  )}
                  {transaction.description !== transaction.verboseDescription && 
                   transaction.description && 
                   getDisplayName(transaction) !== transaction.description && (
                    <>
                      <span>•</span>
                      <span className="text-xs opacity-70">{transaction.description}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`font-mono font-medium tabular-nums ${
                  transaction.type === "CREDIT" || transaction.type === "DEPOSIT" || transaction.type === "INTEREST"
                    ? "text-finance-positive"
                    : "text-finance-negative"
                }`}>
                  {formatCurrency(transaction.amount)}
                </span>
                {transaction.confidence && (
                  <Badge variant={
                    transaction.confidence === "high" ? "default" : 
                    transaction.confidence === "medium" ? "secondary" : "outline"
                  } className="text-xs">
                    {transaction.confidence}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionList;

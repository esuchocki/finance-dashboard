
import React from "react";
import { 
  Table, 
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/formatters";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BadgeCheck, AlertCircle } from "lucide-react";

interface TransactionListProps {
  transactions: Transaction[];
  title?: string;
}

const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  title = "Recent Transactions"
}) => {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCategoryColor = (category: string) => {
    // Enhanced category color mapping
    const categoryColors: Record<string, string> = {
      "Food": "bg-green-100 text-green-800",
      "Dining": "bg-green-100 text-green-800",
      "Entertainment": "bg-purple-100 text-purple-800",
      "Transportation": "bg-blue-100 text-blue-800",
      "Shopping": "bg-pink-100 text-pink-800",
      "Health": "bg-red-100 text-red-800",
      "Healthcare": "bg-red-100 text-red-800",
      "Housing": "bg-yellow-100 text-yellow-800",
      "Insurance": "bg-indigo-100 text-indigo-800",
      "Income": "bg-emerald-100 text-emerald-800",
      "Utilities": "bg-amber-100 text-amber-800",
      "Education": "bg-cyan-100 text-cyan-800",
      "Travel": "bg-orange-100 text-orange-800",
      "Business": "bg-violet-100 text-violet-800",
      "Personal": "bg-fuchsia-100 text-fuchsia-800",
      "Finance": "bg-sky-100 text-sky-800",
      "Uncategorized": "bg-gray-100 text-gray-800"
    };

    return categoryColors[category] || "bg-gray-100 text-gray-800";
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "DEBIT":
        return <span className="text-red-500">↑</span>;
      case "CREDIT":
        return <span className="text-green-500">↓</span>;
      case "TRANSFER":
        return <span className="text-blue-500">↔</span>;
      case "CHECK":
        return <span className="text-gray-500">✓</span>;
      case "DEPOSIT":
        return <span className="text-green-500">+</span>;
      case "WITHDRAWAL":
        return <span className="text-red-500">-</span>;
      default:
        return <span>•</span>;
    }
  };

  const getConfidenceIcon = (confidence?: string) => {
    if (!confidence) return null;
    
    switch (confidence.toLowerCase()) {
      case "high":
        return <BadgeCheck size={16} className="text-green-500 ml-1" />;
      case "medium":
        return null; // No special icon for medium confidence
      case "low":
        return <AlertCircle size={16} className="text-amber-500 ml-1" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {transactions.length} transactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableCaption>Transaction list</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                  No transactions found
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((transaction) => (
                <TableRow key={transaction.id} className="transaction-item">
                  <TableCell className="font-medium">
                    {formatDate(transaction.date)}
                    {transaction.isRecurring && (
                      <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                        Recurring
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {transaction.payee || transaction.name}
                      </span>
                      {transaction.memo && (
                        <span className="text-xs text-muted-foreground">{transaction.memo}</span>
                      )}
                      {transaction.location && (
                        <span className="text-xs text-muted-foreground">{transaction.location}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center">
                          <span className={`category-badge px-1.5 py-0.5 rounded text-xs ${getCategoryColor(transaction.category)}`}>
                            {transaction.category || "Uncategorized"}
                          </span>
                          {getConfidenceIcon(transaction.confidence)}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="space-y-1">
                          <p className="font-semibold">Category Hierarchy:</p>
                          <p>Main: {transaction.category || "Uncategorized"}</p>
                          {transaction.subCategory && <p>Sub: {transaction.subCategory}</p>}
                          {transaction.subSubCategory && <p>Detail: {transaction.subSubCategory}</p>}
                          {transaction.confidence && <p>Confidence: {transaction.confidence}</p>}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                    {transaction.subCategory && (
                      <span className="text-xs text-muted-foreground ml-1 block">
                        {transaction.subCategory}
                        {transaction.subSubCategory && ` › ${transaction.subSubCategory}`}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {getTypeIcon(transaction.type)}
                      <span className={transaction.type === "CREDIT" || transaction.type === "DEPOSIT" ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(transaction.amount)}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default TransactionList;

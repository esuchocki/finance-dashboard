
import React from "react";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";
import TransactionList from "./TransactionList";
import { FinancialInsight } from "@/lib/types";
import { AlertCircle, Info, Lightbulb } from "lucide-react";

interface InsightDetailsProps {
  insight: FinancialInsight | null;
  isOpen: boolean;
  onClose: () => void;
}

const InsightDetails = ({ insight, isOpen, onClose }: InsightDetailsProps) => {
  if (!insight) return null;

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />;
      case "tip":
        return <Lightbulb className="h-5 w-5 text-green-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getInsightColorClass = (type: string) => {
    switch (type) {
      case "warning":
        return "text-amber-500 bg-amber-50";
      case "info":
        return "text-blue-500 bg-blue-50";
      case "tip":
        return "text-green-500 bg-green-50";
      default:
        return "text-gray-500 bg-gray-50";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className={`rounded-full p-1 ${getInsightColorClass(insight.type)}`}>
              {getInsightIcon(insight.type)}
            </span>
            {insight.title}
          </DialogTitle>
          <DialogDescription>
            {insight.description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Additional insight details */}
          {insight.amount !== undefined && (
            <div className="mb-4 p-3 bg-muted rounded-md">
              <h4 className="font-medium text-sm">Amount</h4>
              <p className="text-lg font-semibold">{formatCurrency(insight.amount)}</p>
            </div>
          )}

          {insight.change !== undefined && (
            <div className="mb-4 p-3 bg-muted rounded-md">
              <h4 className="font-medium text-sm">Change</h4>
              <p className="text-lg font-semibold">
                {insight.change > 0 ? "+" : ""}{insight.change.toFixed(2)}%
              </p>
            </div>
          )}

          {/* If there are related transactions, show them in a transaction list */}
          {insight.relatedTransactions && insight.relatedTransactions.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Related Transactions</h4>
              <TransactionList 
                transactions={insight.relatedTransactions}
                title=""
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InsightDetails;

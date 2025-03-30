import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/formatters";

interface AnalysisSectionProps {
  transactions: Transaction[];
}

const AnalysisSection: React.FC<AnalysisSectionProps> = ({ transactions }) => {
  // Calculate summary statistics
  const calculateSummary = () => {
    if (transactions.length === 0) {
      return {
        totalAmount: 0,
        averageAmount: 0,
        largestTransaction: null,
        smallestTransaction: null,
        totalIncome: 0,
        totalExpenses: 0,
        netCashflow: 0
      };
    }

    const income = transactions.filter(t => 
      t.type === "CREDIT" || t.type === "DEPOSIT" || t.type === "INTEREST"
    );
    
    const expenses = transactions.filter(t => 
      t.type === "DEBIT" || t.type === "CHECK" || t.type === "WITHDRAWAL" || t.type === "FEE"
    );
    
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    
    const sortedByAmount = [...transactions].sort((a, b) => b.amount - a.amount);
    
    return {
      totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
      averageAmount: transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length,
      largestTransaction: sortedByAmount[0],
      smallestTransaction: sortedByAmount[sortedByAmount.length - 1],
      totalIncome,
      totalExpenses,
      netCashflow: totalIncome - totalExpenses
    };
  };

  // Calculate category breakdown
  const calculateCategoryBreakdown = () => {
    const categoryMap = new Map<string, number>();
    
    transactions.forEach(t => {
      const currentAmount = categoryMap.get(t.category) || 0;
      categoryMap.set(t.category, currentAmount + t.amount);
    });
    
    return Array.from(categoryMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  };

  const summary = calculateSummary();
  const categoryBreakdown = calculateCategoryBreakdown();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Income:</span>
            <span className="font-medium text-green-600">{formatCurrency(summary.totalIncome)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Expenses:</span>
            <span className="font-medium text-red-600">{formatCurrency(summary.totalExpenses)}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="font-medium">Net Cashflow:</span>
            <span className={`font-medium ${summary.netCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary.netCashflow)}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top Categories</CardTitle>
        </CardHeader>
        <CardContent>
          {categoryBreakdown.length === 0 ? (
            <p className="text-muted-foreground text-center py-2">No data available</p>
          ) : (
            <ul className="space-y-2">
              {categoryBreakdown.slice(0, 5).map(({ category, amount }) => (
                <li key={category} className="flex justify-between items-center">
                  <span>{category}</span>
                  <span className="font-medium">{formatCurrency(amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {summary.largestTransaction && (
        <Card>
          <CardHeader>
            <CardTitle>Largest Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="font-medium">{summary.largestTransaction.name}</p>
              <p className="text-muted-foreground text-sm">{summary.largestTransaction.date.toLocaleDateString()}</p>
              <p className={`font-bold ${summary.largestTransaction.type === "CREDIT" || summary.largestTransaction.type === "DEPOSIT" ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.largestTransaction.amount)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalysisSection;

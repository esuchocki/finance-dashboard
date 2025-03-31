
import React from "react";
import { useFinance } from "@/context/FinanceContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { CalendarDays, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const UploadSummary = () => {
  const { summary, insights, transactions, clearData } = useFinance();
  const navigate = useNavigate();
  
  if (!summary || transactions.length === 0) {
    return null;
  }
  
  // Format date range
  const startDate = formatDate(summary.dateRange.start);
  const endDate = formatDate(summary.dateRange.end);
  
  // Calculate date range in days
  const dayDiff = Math.round(
    (summary.dateRange.end.getTime() - summary.dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Count transactions by type
  const typeCount: Record<string, number> = {};
  transactions.forEach(t => {
    typeCount[t.type] = (typeCount[t.type] || 0) + 1;
  });
  
  return (
    <Card className="w-full mt-6">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Import Summary</CardTitle>
            <CardDescription>
              Showing data from {startDate} to {endDate} ({dayDiff} days)
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/transactions")}>
              View All Transactions
            </Button>
            <Button variant="outline" size="sm" onClick={clearData}>
              Clear Data
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center space-x-2">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Transactions</p>
              <p className="text-xl font-bold">{summary.transactionCount}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm font-medium">Total Income</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(summary.totalIncome)}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm font-medium">Total Expenses</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(summary.totalExpenses)}</p>
            </div>
          </div>
        </div>
        
        {/* Transaction Types Summary */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2">Transaction Types</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(typeCount).map(([type, count]) => (
              <Badge key={type} variant="outline" className="text-xs">
                {type}: {count}
              </Badge>
            ))}
          </div>
        </div>
        
        {/* Key Insights */}
        {insights.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">Key Insights</h3>
            <div className="space-y-2">
              {insights.slice(0, 3).map(insight => (
                <div 
                  key={insight.id} 
                  className={`p-3 border rounded flex items-start space-x-2 ${
                    insight.type === "warning" ? "border-amber-200 bg-amber-50" :
                    insight.type === "info" ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <AlertCircle className={`h-5 w-5 mt-0.5 ${
                    insight.type === "warning" ? "text-amber-500" :
                    insight.type === "info" ? "text-blue-500" : "text-gray-500"
                  }`} />
                  <div>
                    <p className="font-medium text-sm">{insight.title}</p>
                    <p className="text-xs text-muted-foreground">{insight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Top Categories */}
        {summary.topExpenseCategories.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2">Top Expense Categories</h3>
            <div className="space-y-2">
              {summary.topExpenseCategories.slice(0, 3).map((category, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: getColorForIndex(index) }}
                    ></div>
                    <span className="text-sm">{category.category}</span>
                  </div>
                  <span className="text-sm font-medium">
                    {formatCurrency(category.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="text-sm text-muted-foreground border-t pt-4">
        <div className="flex items-center">
          <TrendingUp className="h-4 w-4 mr-1" />
          <span>
            Net cashflow: <span className={summary.netCashflow >= 0 ? "text-green-600" : "text-red-600"}>
              {formatCurrency(summary.netCashflow)}
            </span>
          </span>
        </div>
      </CardFooter>
    </Card>
  );
};

// Helper function to get colors for the category dots
const getColorForIndex = (index: number) => {
  const colors = ["#0EA5E9", "#10B981", "#8B5CF6", "#EC4899", "#F59E0B"];
  return colors[index % colors.length];
};

export default UploadSummary;

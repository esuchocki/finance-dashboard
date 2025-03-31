
import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Transaction } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CategoryHierarchyDebuggerProps {
  transactions: Transaction[];
}

interface CategoryStructure {
  name: string;
  count: number;
  amount: number;
  subcategories: {
    name: string;
    count: number;
    amount: number;
    transactions: Transaction[];
  }[];
}

const CategoryHierarchyDebugger: React.FC<CategoryHierarchyDebuggerProps> = ({ transactions }) => {
  const [expenseCategories, setExpenseCategories] = useState<CategoryStructure[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<CategoryStructure[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (transactions.length === 0) {
      setIsAnalyzing(false);
      return;
    }

    try {
      // Analyze the transactions
      const { expenseCats, incomeCats } = analyzeCategories(transactions);
      setExpenseCategories(expenseCats);
      setIncomeCategories(incomeCats);
    } catch (err) {
      console.error("Error analyzing categories:", err);
      setError("Failed to analyze transaction categories");
    } finally {
      setIsAnalyzing(false);
    }
  }, [transactions]);

  const analyzeCategories = (transactions: Transaction[]) => {
    // Helper function to add a transaction to a category map
    const addToCategory = (
      map: Map<string, { 
        count: number; 
        amount: number; 
        subcategories: Map<string, { 
          count: number; 
          amount: number; 
          transactions: Transaction[] 
        }> 
      }>,
      category: string,
      subCategory: string,
      transaction: Transaction
    ) => {
      // Ensure category exists
      if (!map.has(category)) {
        map.set(category, { 
          count: 0, 
          amount: 0, 
          subcategories: new Map() 
        });
      }
      
      const categoryData = map.get(category)!;
      categoryData.count += 1;
      categoryData.amount += Math.abs(transaction.amount);
      
      // Ensure subcategory exists
      if (!categoryData.subcategories.has(subCategory)) {
        categoryData.subcategories.set(subCategory, {
          count: 0,
          amount: 0,
          transactions: []
        });
      }
      
      // Update subcategory
      const subCategoryData = categoryData.subcategories.get(subCategory)!;
      subCategoryData.count += 1;
      subCategoryData.amount += Math.abs(transaction.amount);
      subCategoryData.transactions.push(transaction);
    };

    // Maps to store expense and income categories
    const expenseCategoriesMap = new Map<string, { 
      count: number; 
      amount: number; 
      subcategories: Map<string, { 
        count: number; 
        amount: number; 
        transactions: Transaction[] 
      }> 
    }>();
    
    const incomeCategoriesMap = new Map<string, { 
      count: number; 
      amount: number; 
      subcategories: Map<string, { 
        count: number; 
        amount: number; 
        transactions: Transaction[] 
      }> 
    }>();

    // Process all transactions
    transactions.forEach(transaction => {
      // Determine if it's expense or income
      const isExpense = transaction.amount < 0 || 
                        transaction.type === "DEBIT" || 
                        transaction.type === "WITHDRAWAL" || 
                        transaction.type === "CHECK" || 
                        transaction.type === "FEE" ||
                        transaction.categoryType === "expense";
                        
      const isIncome = transaction.amount > 0 || 
                      transaction.type === "CREDIT" || 
                      transaction.type === "DEPOSIT" || 
                      transaction.type === "INTEREST" ||
                      transaction.categoryType === "income";
                      
      // Determine category and subcategory
      const category = transaction.category || "Uncategorized";
      const subCategory = transaction.subCategory || "Other";
      
      // Add to appropriate map
      if (isExpense) {
        addToCategory(expenseCategoriesMap, category, subCategory, transaction);
      } else if (isIncome) {
        addToCategory(incomeCategoriesMap, category, subCategory, transaction);
      }
    });

    // Convert maps to arrays and sort
    const expenseCats = Array.from(expenseCategoriesMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        amount: data.amount,
        subcategories: Array.from(data.subcategories.entries())
          .map(([subName, subData]) => ({
            name: subName,
            count: subData.count,
            amount: subData.amount,
            transactions: subData.transactions
          }))
          .sort((a, b) => b.amount - a.amount)
      }))
      .sort((a, b) => b.amount - a.amount);
      
    const incomeCats = Array.from(incomeCategoriesMap.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        amount: data.amount,
        subcategories: Array.from(data.subcategories.entries())
          .map(([subName, subData]) => ({
            name: subName,
            count: subData.count,
            amount: subData.amount,
            transactions: subData.transactions
          }))
          .sort((a, b) => b.amount - a.amount)
      }))
      .sort((a, b) => b.amount - a.amount);
      
    return { expenseCats, incomeCats };
  };

  if (isAnalyzing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analyzing Category Hierarchy...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center p-4">
            <div className="animate-spin h-8 w-8 border-4 border-finance-primary border-t-transparent rounded-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error Analyzing Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Claude AI Category Hierarchy Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Total Transactions: {transactions.length}</h3>
          <div className="flex gap-2">
            <Badge variant="default">{expenseCategories.length} Expense Categories</Badge>
            <Badge variant="secondary">{incomeCategories.length} Income Categories</Badge>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium border-b pb-2">Expense Categories</h3>
          {expenseCategories.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">No expense categories found</div>
          ) : (
            <div className="space-y-4">
              {expenseCategories.map((category) => (
                <div key={category.name} className="border rounded-md p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{category.name}</h4>
                      <Badge variant="outline">{category.count} transactions</Badge>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{formatCurrency(category.amount)}</span>
                    </div>
                  </div>
                  
                  <div className="mt-2 space-y-1 pl-4">
                    <h5 className="text-sm font-medium">Subcategories:</h5>
                    {category.subcategories.map((sub) => (
                      <div key={sub.name} className="flex justify-between text-sm">
                        <span>
                          {sub.name} ({sub.count})
                        </span>
                        <span>{formatCurrency(sub.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium border-b pb-2">Income Categories</h3>
          {incomeCategories.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">No income categories found</div>
          ) : (
            <div className="space-y-4">
              {incomeCategories.map((category) => (
                <div key={category.name} className="border rounded-md p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{category.name}</h4>
                      <Badge variant="outline">{category.count} transactions</Badge>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{formatCurrency(category.amount)}</span>
                    </div>
                  </div>
                  
                  <div className="mt-2 space-y-1 pl-4">
                    <h5 className="text-sm font-medium">Subcategories:</h5>
                    {category.subcategories.map((sub) => (
                      <div key={sub.name} className="flex justify-between text-sm">
                        <span>
                          {sub.name} ({sub.count})
                        </span>
                        <span>{formatCurrency(sub.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground mt-4 border-t pt-2">
          <p>This debug view shows the exact category hierarchy provided by Claude AI.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryHierarchyDebugger;

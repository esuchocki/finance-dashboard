
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Transaction } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface ClaudeRawCategoryDebuggerProps {
  transactions: Transaction[];
}

type CategoryCounts = {
  name: string;
  count: number;
  amount: number;
  subCategories: Map<string, { count: number; amount: number }>;
};

const ClaudeRawCategoryDebugger: React.FC<ClaudeRawCategoryDebuggerProps> = ({ transactions }) => {
  const [filter, setFilter] = React.useState("");
  const [showRawData, setShowRawData] = React.useState(false);

  // Analyze raw category data from Claude
  const analyzeRawCategories = () => {
    // Only use transactions that have Claude-enhanced fields
    const enhancedTransactions = transactions.filter(
      t => t.category || t.subCategory || t.categoryType
    );
    
    console.log(`Enhanced transactions: ${enhancedTransactions.length} of ${transactions.length}`);
    
    if (enhancedTransactions.length === 0) {
      return { categories: [], subCategories: [], categoryTypes: [] };
    }
    
    // Count occurrences of each category
    const categoryMap = new Map<string, CategoryCounts>();
    const allSubCategories = new Set<string>();
    const categoryTypes = new Set<string>();
    
    enhancedTransactions.forEach(t => {
      const category = t.category || "Uncategorized";
      const subCategory = t.subCategory || "Other";
      const type = t.categoryType || "unknown";
      
      categoryTypes.add(type);
      allSubCategories.add(subCategory);
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          name: category,
          count: 0,
          amount: 0,
          subCategories: new Map()
        });
      }
      
      const categoryData = categoryMap.get(category)!;
      categoryData.count += 1;
      categoryData.amount += Math.abs(t.amount);
      
      if (!categoryData.subCategories.has(subCategory)) {
        categoryData.subCategories.set(subCategory, { count: 0, amount: 0 });
      }
      
      const subCategoryData = categoryData.subCategories.get(subCategory)!;
      subCategoryData.count += 1;
      subCategoryData.amount += Math.abs(t.amount);
    });
    
    // Format the data for display
    const categories = Array.from(categoryMap.entries())
      .map(([_, data]) => ({
        name: data.name,
        count: data.count,
        amount: data.amount,
        subCategories: Array.from(data.subCategories.entries())
          .map(([name, subData]) => ({
            name,
            count: subData.count,
            amount: subData.amount
          }))
          .sort((a, b) => b.count - a.count)
      }))
      .sort((a, b) => b.count - a.count);
    
    return {
      categories,
      subCategories: Array.from(allSubCategories),
      categoryTypes: Array.from(categoryTypes)
    };
  };
  
  // Get random transaction samples for each category
  const getSampleTransactions = () => {
    const samples: Record<string, Transaction[]> = {};
    
    transactions.forEach(t => {
      if (t.category) {
        if (!samples[t.category]) {
          samples[t.category] = [];
        }
        
        if (samples[t.category].length < 3) {
          samples[t.category].push(t);
        }
      }
    });
    
    return samples;
  };

  const { categories, subCategories, categoryTypes } = analyzeRawCategories();
  const sampleTransactions = getSampleTransactions();
  
  // Filter categories by search term
  const filteredCategories = categories.filter(
    cat => cat.name.toLowerCase().includes(filter.toLowerCase())
  );

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Claude Raw Category Debugger</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTitle>No transactions available</AlertTitle>
            <AlertDescription>
              Upload a file with transactions to see categorization details.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Claude Raw Categorization Debug</CardTitle>
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter categories..."
            className="pl-8"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap mb-4">
          <Badge variant="outline">
            {categories.length} Unique Categories
          </Badge>
          <Badge variant="outline">
            {subCategories.length} Unique Subcategories
          </Badge>
          <Badge variant="outline">
            {categoryTypes.length} Category Types: {categoryTypes.join(", ")}
          </Badge>
          <Badge variant="success">
            {transactions.filter(t => t.category).length} of {transactions.length} Categorized
          </Badge>
        </div>

        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {filteredCategories.length > 0 ? (
            filteredCategories.map((category) => (
              <div key={category.name} className="border rounded-md p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{category.name}</h3>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline">{category.count} transactions</Badge>
                      <Badge variant="secondary">${category.amount.toFixed(2)}</Badge>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 space-y-2">
                  <h4 className="text-sm font-medium">Subcategories:</h4>
                  <div className="space-y-1">
                    {category.subCategories.map((sub) => (
                      <div key={sub.name} className="flex justify-between text-sm px-2 py-1 bg-muted/40 rounded">
                        <span>{sub.name}</span>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground">{sub.count} items</span>
                          <span>${sub.amount.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Sample transactions from this category */}
                {sampleTransactions[category.name] && (
                  <div className="mt-3">
                    <h4 className="text-sm font-medium">Sample Transactions:</h4>
                    <div className="mt-1 space-y-1 text-xs">
                      {sampleTransactions[category.name].map((t, i) => (
                        <div key={i} className="px-2 py-1 bg-muted/30 rounded text-muted-foreground overflow-hidden text-ellipsis">
                          <div className="flex justify-between">
                            <span>{t.description || t.name}</span>
                            <span>${Math.abs(t.amount).toFixed(2)}</span>
                          </div>
                          {t.subCategory && (
                            <span className="text-xs">Subcategory: {t.subCategory}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No categories matching "{filter}"
            </div>
          )}
        </div>
        
        {categories.length === 0 && (
          <Alert>
            <AlertTitle>No categorization data available</AlertTitle>
            <AlertDescription>
              Claude has not enhanced any transactions with categories yet. This could be because:
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Claude API is not properly configured</li>
                <li>Processing hasn't completed yet</li>
                <li>There was an error during categorization</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground mt-4 border-t pt-2">
          <p>This debug view shows the raw categorization data from Claude without any processing.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClaudeRawCategoryDebugger;


import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector, Legend } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Transaction } from "@/lib/types";
import { formatCurrency } from "@/lib/formatters";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Info, LineChart, ArrowUpDown, BadgeCheck, Loader2 } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Custom colors for the chart - using a different palette from main charts
const COLORS = [
  "#8B5CF6", "#D946EF", "#F97316", "#0EA5E9", "#10B981", 
  "#F59E0B", "#EC4899", "#6366F1", "#84CC16", "#14B8A6",
  "#EF4444", "#64748B", "#9333EA", "#0369A1", "#15803D"
];

interface ClaudeEnhancedCategoriesProps {
  transactions: Transaction[];
}

const ClaudeEnhancedCategories: React.FC<ClaudeEnhancedCategoriesProps> = ({ transactions }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<Transaction[] | null>(null);
  const [view, setView] = useState<"pie" | "list">("pie");

  // Custom tooltip for the PieChart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / data.totalValue) * 100).toFixed(1);
      
      return (
        <div className="bg-background border rounded p-3 shadow-md">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">{formatCurrency(data.value)}</p>
          <p className="text-xs text-muted-foreground">{percentage}% of total</p>
          {data.count > 0 && (
            <p className="text-xs text-muted-foreground">{data.count} transactions</p>
          )}
          <p className="text-xs text-finance-primary mt-1">Click to view transactions</p>
        </div>
      );
    }
    return null;
  };

  // Active shape for the PieChart (when a slice is selected)
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
      </g>
    );
  };

  // Extract Claude-enhanced categories (only from transactions that actually have Claude data)
  const prepareClaudeData = () => {
    // Filter transactions to include only those with Claude-enhanced data
    const enhancedTransactions = transactions.filter(t => 
      t.verboseDescription || t.confidence || 
      (t.category && t.category !== "Uncategorized" && t.category !== "Other")
    );
    
    const totalTransactions = transactions.length;
    const enhancedCount = enhancedTransactions.length;
    const percentCategorized = Math.round((enhancedCount / totalTransactions) * 100);
    
    // Count transactions by category
    const categoryMap = new Map<string, { 
      amount: number,
      count: number,
      transactions: Transaction[]
    }>();
    
    enhancedTransactions.forEach(t => {
      const category = t.category || "Uncategorized";
      
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { 
          amount: 0, 
          count: 0,
          transactions: []
        });
      }
      
      const categoryData = categoryMap.get(category)!;
      categoryData.amount += Math.abs(t.amount);
      categoryData.count += 1;
      categoryData.transactions.push(t);
    });
    
    // Convert to chart data format
    const chartData = Array.from(categoryMap.entries())
      .map(([name, data]) => ({
        name,
        value: data.amount,
        count: data.count,
        transactions: data.transactions,
        totalValue: enhancedTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
      }))
      .sort((a, b) => b.value - a.value);
    
    return {
      chartData,
      totalTransactions,
      enhancedCount,
      percentCategorized
    };
  };

  const { chartData, totalTransactions, enhancedCount, percentCategorized } = prepareClaudeData();

  // Handle pie slice click to show transactions
  const handlePieClick = (data: any) => {
    setSelectedCategory(data.name);
    setSelectedTransactions(data.transactions);
    setView("list");
  };

  // Go back from transaction list to pie chart
  const handleBackClick = () => {
    setSelectedCategory(null);
    setSelectedTransactions(null);
    setView("pie");
  };

  // Handle mouse hover on pie slices
  const onPieEnter = (_, index: number) => {
    setActiveIndex(index);
  };
  
  // Handle mouse leave on pie slices
  const onPieLeave = () => {
    setActiveIndex(null);
  };

  // Toggle between pie chart and list view
  const toggleView = () => {
    setView(view === "pie" ? "list" : "pie");
    if (view === "list") {
      setSelectedCategory(null);
      setSelectedTransactions(null);
    } else {
      setSelectedTransactions(chartData.flatMap(item => item.transactions));
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-finance-primary" />
              Claude AI Categorization
            </CardTitle>
            <CardDescription>
              Transactions enhanced by Claude AI ({percentCategorized}% categorized)
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={toggleView}
              className="flex items-center gap-1"
            >
              {view === "pie" 
                ? <><LineChart className="h-4 w-4" /> View List</>
                : <><LineChart className="h-4 w-4" /> View Chart</>
              }
            </Button>
            
            <HoverCard>
              <HoverCardTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </Button>
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium">AI-Enhanced Data</h4>
                  <p className="text-sm text-muted-foreground">
                    This chart only shows the {enhancedCount} transactions ({percentCategorized}%) 
                    that Claude AI successfully categorized out of {totalTransactions} total transactions.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Transactions with higher confidence ratings have been better categorized. 
                    Click on a category to see the transactions within it.
                  </p>
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {enhancedCount === 0 ? (
          <div className="flex flex-col items-center justify-center h-[200px] gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            <Alert>
              <AlertTitle>No enhanced data available yet</AlertTitle>
              <AlertDescription>
                Claude AI hasn't categorized any transactions yet. This may be because the enhancement 
                process is still running or there was an issue with the Claude API connection.
              </AlertDescription>
            </Alert>
          </div>
        ) : view === "pie" ? (
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={1}
                  dataKey="value"
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                  onClick={handlePieClick}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  layout="vertical" 
                  verticalAlign="middle" 
                  align="right"
                  formatter={(value, entry, index) => (
                    <span className="text-xs">
                      {value} ({chartData[index].count} items)
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="animate-in fade-in-50 duration-300">
            <div className="flex items-center mb-4">
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-0 h-8 mr-2" 
                onClick={handleBackClick}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              
              {selectedCategory && (
                <h3 className="text-sm font-medium">
                  {selectedCategory} ({selectedTransactions?.length || 0} transactions)
                </h3>
              )}
            </div>
            
            <div className="overflow-y-auto max-h-[300px] space-y-2">
              {(selectedTransactions || []).map((t) => (
                <div key={t.id} className="text-sm p-3 border rounded-md hover:bg-muted/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="max-w-[70%]">
                      <p className="font-medium">
                        {t.verboseDescription || t.description || t.name}
                      </p>
                      {(t.description !== t.verboseDescription && t.description) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Original: {t.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {t.category || "Uncategorized"}
                        </Badge>
                        {t.subCategory && (
                          <Badge variant="outline" className="text-xs bg-muted/50">
                            {t.subCategory}
                          </Badge>
                        )}
                        {t.confidence && (
                          <Badge variant={
                            t.confidence === "high" ? "default" : 
                            t.confidence === "medium" ? "secondary" : "outline"
                          } className="text-xs">
                            {t.confidence} confidence
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(t.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(t.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {selectedTransactions && selectedTransactions.length === 0 && (
                <div className="text-center p-4 text-muted-foreground">
                  No transactions in this category
                </div>
              )}
            </div>
          </div>
        )}
        
        {enhancedCount > 0 && (
          <div className="mt-4 text-xs text-muted-foreground text-center">
            Showing {enhancedCount} of {totalTransactions} total transactions ({percentCategorized}% categorized)
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClaudeEnhancedCategories;

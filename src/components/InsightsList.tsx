
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFinance } from "@/context/FinanceContext";
import { AlertCircle, Info, Lightbulb, ChevronRight } from "lucide-react";
import InsightDetails from "./InsightDetails";
import { FinancialInsight } from "@/lib/types";

const InsightsList = () => {
  const { insights, summary } = useFinance();
  const [selectedInsight, setSelectedInsight] = useState<FinancialInsight | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const getInsightColor = (type: string) => {
    switch (type) {
      case "warning":
        return "border-l-amber-500 bg-amber-50";
      case "info":
        return "border-l-blue-500 bg-blue-50";
      case "tip":
        return "border-l-green-500 bg-green-50";
      default:
        return "border-l-gray-500 bg-gray-50";
    }
  };
  
  // Filter out any duplicate insights by combining both sources
  const allInsights = [...insights];
  
  // Add insights from summary if they exist
  if (summary && summary.topInsights && Array.isArray(summary.topInsights)) {
    summary.topInsights.forEach(insight => {
      // Check if this insight from summary already exists in our main insights list
      const exists = allInsights.some(
        existing => existing.title === insight.title || existing.description === insight.description
      );
      
      if (!exists) {
        allInsights.push({
          id: `summary-${insight.id || Math.random().toString(36).substr(2, 9)}`,
          title: insight.title || "Financial Insight",
          description: insight.description,
          type: insight.type || "info",
          category: insight.category || "general"
        });
      }
    });
  }

  // Enhanced insight handling to show data counts
  const handleInsightClick = (insight: FinancialInsight) => {
    // For subscription insight, add a count of recurring expenses
    if (insight.id === "subscription-spending" && summary && summary.recurringExpenses) {
      const enhancedInsight = {
        ...insight,
        description: insight.description + 
          (insight.description.includes("recurring items") ? "" : 
          ` (${summary.recurringExpenses.length} recurring items identified)`)
      };
      setSelectedInsight(enhancedInsight);
    } else {
      setSelectedInsight(insight);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Financial Insights</CardTitle>
        </CardHeader>
        <CardContent>
          {allInsights.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No insights available yet
            </div>
          ) : (
            <div className="space-y-3">
              {allInsights.map((insight) => (
                <div 
                  key={insight.id}
                  className={`p-3 border-l-4 rounded ${getInsightColor(insight.type)} cursor-pointer transition-colors hover:bg-opacity-80`}
                  onClick={() => handleInsightClick(insight)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getInsightIcon(insight.type)}
                    </div>
                    <div className="flex-grow">
                      <h4 className="font-medium">
                        {insight.title}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {insight.description}
                      </p>
                    </div>
                    <div className="self-center">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <InsightDetails 
        insight={selectedInsight} 
        isOpen={dialogOpen} 
        onClose={handleCloseDialog} 
      />
    </>
  );
};

export default InsightsList;


import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFinance } from "@/context/FinanceContext";
import { AlertCircle, Info, Lightbulb } from "lucide-react";

const InsightsList = () => {
  const { insights } = useFinance();

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Insights</CardTitle>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No insights available yet
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight) => (
              <div 
                key={insight.id}
                className={`p-3 border-l-4 rounded ${getInsightColor(insight.type)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getInsightIcon(insight.type)}
                  </div>
                  <div>
                    <h4 className="font-medium">{insight.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {insight.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InsightsList;

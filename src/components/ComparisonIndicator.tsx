
import React from "react";
import { ArrowUp, ArrowDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComparisonIndicatorProps {
  value: number;
  suffix?: string;
  positiveIsGood?: boolean;
  className?: string;
}

const ComparisonIndicator = ({
  value,
  suffix = "",
  positiveIsGood = true,
  className
}: ComparisonIndicatorProps) => {
  // Handle undefined, NaN and zero cases
  if (value === undefined || isNaN(value) || value === 0) {
    return (
      <span className={cn("text-xs flex items-center text-muted-foreground", className)}>
        <ArrowRight className="h-3 w-3 text-muted-foreground mr-1" />
        No change
      </span>
    );
  }

  // Determine if the value is "good" based on whether positive is good and the actual value
  const isPositive = value > 0;
  const isGood = positiveIsGood ? isPositive : !isPositive;
  
  // Format the value for display
  const formattedValue = Math.abs(value).toFixed(1);
  
  return (
    <span 
      className={cn(
        "text-xs flex items-center", 
        isGood ? "text-finance-positive" : "text-finance-negative",
        className
      )}
    >
      {isPositive ? (
        <ArrowUp className="h-3 w-3 mr-1" />
      ) : (
        <ArrowDown className="h-3 w-3 mr-1" />
      )}
      {isPositive ? "+" : "-"}{formattedValue}{suffix}
    </span>
  );
};

export default ComparisonIndicator;

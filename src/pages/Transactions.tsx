
import React from "react";
import TransactionPage from "@/components/TransactionPage";
import { Tooltip, TooltipContent, TooltipProvider, InfoTooltipTrigger } from "@/components/ui/tooltip";
import { Sailboat } from "lucide-react";

const Transactions = () => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="sr-only">Transactions</h1>
        <TooltipProvider>
          <Tooltip>
            <InfoTooltipTrigger asChild>
              <div className="ml-auto text-xs text-muted-foreground italic flex items-center opacity-70">
                <Sailboat className="h-3 w-3 mr-1" />
                <span>"Every transaction is a nautical mile closer to the horizon..."</span>
              </div>
            </InfoTooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="text-xs">At the current rate, you'll afford that 40-foot catamaran in approximately... well, let's not do the math.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <TransactionPage />
    </div>
  );
};

export default Transactions;

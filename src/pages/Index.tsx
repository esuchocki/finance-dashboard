
import React, { useEffect, useState } from "react";
import { Dashboard } from "@/components/dashboard";
import { useFinance } from "@/context/FinanceContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Info, Lightbulb, ChevronRight, Sailboat, Anchor } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  InfoTooltipTrigger
} from "@/components/ui/tooltip";

const Index = () => {
  const { 
    transactions, 
    isLoading, 
    error, 
    isUsingCache, 
    isDevelopmentMode, 
    toggleDevelopmentMode 
  } = useFinance();
  
  const [renderTimeout, setRenderTimeout] = useState(false);
  const [extendedTimeout, setExtendedTimeout] = useState(false);
  
  useEffect(() => {
    // Set a timeout to show a message if rendering takes too long
    let timeoutId: NodeJS.Timeout;
    let extendedTimeoutId: NodeJS.Timeout;
    
    if (isLoading) {
      timeoutId = setTimeout(() => {
        setRenderTimeout(true);
      }, 15000); // Show message after 15 seconds of loading
      
      extendedTimeoutId = setTimeout(() => {
        setExtendedTimeout(true);
      }, 60000); // Show extended message after 60 seconds
    } else {
      setRenderTimeout(false);
      setExtendedTimeout(false);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (extendedTimeoutId) clearTimeout(extendedTimeoutId);
    };
  }, [isLoading]);
  
  // Show a loading spinner while processing
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[50vh] p-8">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-finance-primary" />
          <p className="text-lg font-medium">Processing your financial data...</p>
          {renderTimeout && (
            <Alert className="mt-4 max-w-lg">
              <AlertTitle>Processing Large Dataset</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>
                  This is taking longer than expected. We're processing your transactions with Claude AI.
                  For large files, this can take several minutes. Please wait...
                </p>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden mt-2">
                  <div className="bg-finance-primary h-2 animate-pulse rounded-full"></div>
                </div>
              </AlertDescription>
            </Alert>
          )}
          {extendedTimeout && (
            <Alert className="mt-4 max-w-lg" variant="destructive">
              <AlertTitle>Extended Processing Time</AlertTitle>
              <AlertDescription>
                The file is taking an unusually long time to process. This may be due to the size of your dataset or high server load.
                You can continue waiting or try uploading a smaller file.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    );
  }
  
  // Show error state if there was a problem
  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <Alert variant="destructive">
          <AlertTitle>Error Processing Data</AlertTitle>
          <AlertDescription>
            {error}. Please try uploading your file again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto">
      {/* Development Mode Toggle */}
      <div className="flex items-center justify-end space-x-2 mb-4 p-2 bg-muted/40 rounded-md">
        <div className="flex flex-col items-end">
          <Label htmlFor="development-mode" className="text-sm">
            Development Mode
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            Disables caching for testing purposes
          </p>
        </div>
        <Switch
          id="development-mode"
          checked={isDevelopmentMode}
          onCheckedChange={toggleDevelopmentMode}
        />
        {isDevelopmentMode && (
          <TooltipProvider>
            <Tooltip>
              <InfoTooltipTrigger asChild>
                <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-800">
                  Cache Disabled
                </Badge>
              </InfoTooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-2">
                  <p className="font-medium">Cache Disabled in Development Mode</p>
                  <p className="text-sm">In development mode, requests are not cached and data is fetched fresh each time.</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="opacity-50">
                <Anchor className="h-4 w-4 ml-1 text-finance-primary" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end" className="max-w-xs">
              <div className="text-xs">
                <p>"Chart your financial course wisely, for the open seas await those with well-trimmed budgets."</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <Dashboard />
      
      {transactions.length > 0 && (
        <div className="mt-8 mb-4 text-center text-sm text-muted-foreground animate-fade-in">
          <p className="flex items-center justify-center gap-1">
            Financial data visualization powered by QBO Parser & Claude AI
            {isUsingCache && !isDevelopmentMode && (
              <TooltipProvider>
                <Tooltip>
                  <InfoTooltipTrigger asChild>
                    <span className="ml-1">
                      (using cached data)
                    </span>
                  </InfoTooltipTrigger>
                  <TooltipContent>
                    <p>Data is being served from cache for faster performance</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {isDevelopmentMode && " (development mode - cache disabled)"}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Sailboat className="h-3 w-3 ml-1 opacity-50" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">"They say money can't buy happiness, but it can buy a sailboat... and that's pretty much the same thing."</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </p>
        </div>
      )}
    </div>
  );
};

export default Index;

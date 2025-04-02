import React, { useEffect, useState } from "react";
import { Dashboard } from "@/components/dashboard";
import { useFinance } from "@/context/FinanceContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Info } from "lucide-react";
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
      </div>
      
      <Dashboard />
    </div>
  );
};

export default Index;

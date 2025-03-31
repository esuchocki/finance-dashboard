
import React from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface DashboardErrorProps {
  error: string;
  onClearData: () => void;
}

const DashboardError = ({ error, onClearData }: DashboardErrorProps) => {
  return (
    <div className="space-y-6">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
      
      <Button 
        variant="outline" 
        className="flex items-center gap-2 hover:bg-muted" 
        onClick={onClearData}
      >
        <RefreshCw className="h-4 w-4" />
        Try Again with Another File
      </Button>
    </div>
  );
};

export default DashboardError;

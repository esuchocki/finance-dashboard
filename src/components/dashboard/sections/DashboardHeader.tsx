
import React from "react";
import { Button } from "@/components/ui/button";
import { 
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { 
  LineChart, 
  Info, 
  RefreshCw, 
  Sailboat 
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  InfoTooltipTrigger,
} from "@/components/ui/tooltip";

interface DashboardHeaderProps {
  onClearData: () => void;
}

const DashboardHeader = ({ onClearData }: DashboardHeaderProps) => {
  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-bold flex items-center">
          <LineChart className="h-6 w-6 mr-2 text-finance-primary" />
          Financial Dashboard
        </h2>
        
        <HoverCard>
          <HoverCardTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <Info className="h-4 w-4 text-muted-foreground" />
            </Button>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="space-y-2">
              <h4 className="font-medium">AI-Enhanced Categories</h4>
              <p className="text-sm text-muted-foreground">
                Your transactions have been analyzed and categorized using Claude AI to provide more accurate insights.
              </p>
            </div>
          </HoverCardContent>
        </HoverCard>
        
        <TooltipProvider>
          <Tooltip delayDuration={700}>
            <InfoTooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Sailboat className="h-4 w-4 text-finance-primary" />
              </Button>
            </InfoTooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="text-xs">At your current savings rate, you're approximately 147 financial quarters away from that 38-foot sloop. Keep charting the course!</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <Button 
        variant="outline" 
        className="flex items-center gap-2 hover:bg-muted" 
        onClick={onClearData}
      >
        <RefreshCw className="h-4 w-4" />
        Change QBO File
      </Button>
    </div>
  );
};

export default DashboardHeader;

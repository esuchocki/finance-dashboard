
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useFinance } from "@/context/FinanceContext";
import { CircleDollarSign, Key } from "lucide-react";
import ClaudeApiKeyModal from "./ClaudeApiKeyModal";
import { hasClaudeApiKey } from "@/lib/claudeService";

const AppNavbar = () => {
  const { transactions } = useFinance();
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const hasApiKey = hasClaudeApiKey();

  return (
    <div className="border-b">
      <div className="container flex h-16 items-center px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
          <CircleDollarSign className="h-6 w-6" />
          <span>Sailing Funds</span>
        </Link>
        
        <div className="ml-auto flex items-center gap-4">
          <Button 
            variant={hasApiKey ? "outline" : "secondary"} 
            size="sm"
            className="flex items-center gap-2"
            onClick={() => setApiKeyModalOpen(true)}
          >
            <Key className="h-4 w-4" />
            <span>{hasApiKey ? "API Key" : "Add Claude API"}</span>
          </Button>
          
          {transactions.length > 0 && (
            <>
              <Button asChild variant="ghost">
                <Link to="/">Dashboard</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/transactions">Transactions</Link>
              </Button>
            </>
          )}
        </div>
      
        <ClaudeApiKeyModal 
          open={apiKeyModalOpen} 
          onOpenChange={setApiKeyModalOpen} 
        />
      </div>
    </div>
  );
};

export default AppNavbar;

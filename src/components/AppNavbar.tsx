
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useFinance } from "@/context/FinanceContext";
import { CircleDollarSign, Key, UserCircle2, Building2 } from "lucide-react";
import ClaudeApiKeyModal from "./ClaudeApiKeyModal";
import { hasClaudeApiKey } from "@/lib/claudeService";
import { AppMode } from "@/lib/types";

interface AppNavbarProps {
  mode?: AppMode;
}

const AppNavbar: React.FC<AppNavbarProps> = ({ mode = 'personal' }) => {
  const { transactions, businessEntities } = useFinance();
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const hasApiKey = hasClaudeApiKey();

  const navIcon = mode === 'business' ? <Building2 className="h-6 w-6" /> : <CircleDollarSign className="h-6 w-6" />;
  const navTitle = mode === 'business' ? 'Transaction Tapestry' : 'Sailing Funds';

  return (
    <div className="border-b">
      <div className="container flex h-16 items-center px-4">
        <Link to={mode === 'business' ? '/business/dashboard' : '/personal'} className="flex items-center gap-2 font-bold text-xl text-primary">
          {navIcon}
          <span>{navTitle}</span>
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

          {mode === 'business' ? (
            <>
              <Button asChild variant="ghost">
                <Link to="/business/dashboard">Dashboard</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/business/entities">Entities</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/business/transactions">Transactions</Link>
              </Button>
            </>
          ) : transactions.length > 0 && (
            <>
              <Button asChild variant="ghost">
                <Link to="/personal">Dashboard</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/personal/transactions">Transactions</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/personal/persona">
                  <UserCircle2 className="h-4 w-4 mr-1" />
                  Persona
                </Link>
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

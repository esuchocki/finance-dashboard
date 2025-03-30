
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useFinance } from "@/context/FinanceContext";
import { CircleDollarSign } from "lucide-react";

const AppNavbar = () => {
  const { transactions } = useFinance();

  return (
    <div className="border-b">
      <div className="container flex h-16 items-center px-4">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary">
          <CircleDollarSign className="h-6 w-6" />
          <span>Finance Tapestry</span>
        </Link>
        
        <div className="ml-auto flex items-center gap-4">
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
      </div>
    </div>
  );
};

export default AppNavbar;


import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useFinance } from "@/context/FinanceContext";
import { useAuth } from "@/context/AuthContext";
import { CircleDollarSign, UserCircle2, LogOut } from "lucide-react";
import { AppMode } from "@/lib/types";
import { toast } from "sonner";

interface AppNavbarProps {
  mode?: AppMode;
}

const AppNavbar: React.FC<AppNavbarProps> = ({ mode = 'personal' }) => {
  const { transactions } = useFinance();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success("Session ended. All data cleared.");
    navigate('/login');
  };

  const navIcon = mode === 'business' ? null : <CircleDollarSign className="h-6 w-6" />;
  const navTitle = mode === 'business' ? '' : 'Sailing Funds';

  return (
    <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        <Link to={mode === 'business' ? '/business/dashboard' : '/personal'} className="flex items-center gap-2 font-bold text-xl text-primary">
          {navIcon}
          {navTitle && <span>{navTitle}</span>}
        </Link>

        <div className="ml-auto flex items-center gap-4">
          {mode === 'business' ? (
            <>
              <Button asChild variant="ghost">
                <Link to="/business/dashboard">Dashboard</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/business/accounts">Accounts</Link>
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

          {/* User info and logout */}
          {user && (
            <div className="flex items-center gap-2 ml-2">
              {user.picture ? (
                <img src={user.picture} alt={user.name} className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <UserCircle2 className="h-7 w-7 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground hidden sm:inline">{user.name}</span>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleLogout} className="ml-1">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AppNavbar;

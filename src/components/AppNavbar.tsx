
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useFinance } from "@/context/FinanceContext";
import { useAuth } from "@/context/AuthContext";
import { CircleDollarSign, UserCircle2, LogOut, Menu } from "lucide-react";
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

  const hasNavLinks = mode === 'business' || transactions.length > 0;

  const UserAvatar = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
          {user?.picture ? (
            <img src={user.picture} alt={user.name} className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <UserCircle2 className="h-8 w-8 text-muted-foreground" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
          {user?.email}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4">
        <Link to={mode === 'business' ? '/business/dashboard' : '/personal'} className="flex items-center gap-2 font-bold text-xl text-primary">
          {navIcon}
          {navTitle && <span>{navTitle}</span>}
        </Link>

        {/* Desktop nav */}
        <div className="ml-auto hidden md:flex items-center gap-4">
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

          {user && <UserAvatar />}
        </div>

        {/* Mobile nav */}
        <div className="ml-auto flex md:hidden items-center gap-2">
          {user && <UserAvatar />}

          {hasNavLinks && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {mode === 'business' ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/business/dashboard">Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/business/accounts">Accounts</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/business/transactions">Transactions</Link>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/personal">Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/personal/transactions">Transactions</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/personal/persona">Persona</Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppNavbar;


import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useFinance } from "@/context/FinanceContext";
import { MoonIcon, SunIcon, UploadIcon, Key, Bug } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import FileUploader from "@/components/FileUploader";
import ClaudeApiKeyModal from "@/components/ClaudeApiKeyModal";
import { hasClaudeApiKey } from "@/lib/claudeService";

const AppNavbar: React.FC = () => {
  const [showFileUploader, setShowFileUploader] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const { setTheme, theme } = useTheme();
  const { transactions, clearData } = useFinance();
  const location = useLocation();
  const navigate = useNavigate();
  const hasTransactions = transactions.length > 0;

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link to="/" className="mr-6 flex items-center space-x-2">
              <span className="hidden font-bold sm:inline-block">Finance Dash</span>
            </Link>
            <nav className="flex items-center space-x-2 text-sm font-medium">
              <Link
                to="/"
                className={`transition-colors hover:text-foreground/80 ${
                  location.pathname === "/" ? "text-foreground" : "text-foreground/60"
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/transactions"
                className={`transition-colors hover:text-foreground/80 ${
                  location.pathname === "/transactions" ? "text-foreground" : "text-foreground/60"
                }`}
              >
                Transactions
              </Link>
              <Link
                to="/claude-debug"
                className={`transition-colors hover:text-foreground/80 flex items-center gap-1 ${
                  location.pathname === "/claude-debug" ? "text-foreground" : "text-foreground/60"
                }`}
              >
                <Bug className="h-3.5 w-3.5" />
                Claude Debug
              </Link>
            </nav>
          </div>
          <div className="flex-1" />
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setShowApiKeyModal(true)}
              variant={hasClaudeApiKey() ? "outline" : "secondary"}
              size="sm"
              className="flex gap-1 items-center"
            >
              <Key className="h-4 w-4" />
              {hasClaudeApiKey() ? "Update Claude API" : "Add Claude API"}
            </Button>
            
            {hasTransactions && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const confirmed = window.confirm(
                    "Are you sure you want to clear all data? This cannot be undone."
                  );
                  if (confirmed) {
                    clearData();
                    if (location.pathname !== "/") {
                      navigate("/");
                    }
                  }
                }}
              >
                Clear Data
              </Button>
            )}
            <Button
              onClick={() => setShowFileUploader(true)}
              variant="default"
              size="sm"
              className="gap-1"
            >
              <UploadIcon className="h-4 w-4" />
              Upload
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle Theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <SunIcon className="h-4 w-4" />
              ) : (
                <MoonIcon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      <FileUploader
        open={showFileUploader}
        onOpenChange={setShowFileUploader}
      />
      
      <ClaudeApiKeyModal
        open={showApiKeyModal}
        onOpenChange={setShowApiKeyModal}
      />
    </>
  );
};

export default AppNavbar;

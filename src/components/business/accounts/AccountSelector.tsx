import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useFinance } from "@/context/FinanceContext";
import { CheckSquare, Square, Building2, ChevronDown, ChevronUp } from "lucide-react";

const AccountSelector: React.FC = () => {
  const { businessAccounts, selectedAccountIds, setSelectedAccountIds } = useFinance();
  const [isOpen, setIsOpen] = useState(true);

  const toggleAccount = (accountId: string) => {
    setSelectedAccountIds(prev =>
      prev.includes(accountId)
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  const selectAll = () => {
    setSelectedAccountIds(businessAccounts.map(a => a.id));
  };

  const selectNone = () => {
    setSelectedAccountIds([]);
  };

  if (businessAccounts.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle>Select Accounts</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {selectedAccountIds.length} of {businessAccounts.length} selected
                </Badge>
              </div>
              <CardDescription>
                Choose bank accounts to include in consolidated view
              </CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              <Button variant="outline" size="sm" onClick={selectAll}>
                <CheckSquare className="h-4 w-4 mr-2" />
                All
              </Button>
              <Button variant="outline" size="sm" onClick={selectNone}>
                <Square className="h-4 w-4 mr-2" />
                None
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-3">
            {businessAccounts.map(account => (
              <div
                key={account.id}
                className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                onClick={(e) => {
                  // Prevent double-toggle when clicking the checkbox itself
                  if ((e.target as HTMLElement).tagName !== 'BUTTON') {
                    toggleAccount(account.id);
                  }
                }}
              >
                <Checkbox
                  id={account.id}
                  checked={selectedAccountIds.includes(account.id)}
                  onCheckedChange={() => toggleAccount(account.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor={account.id}
                      className="font-medium cursor-pointer"
                    >
                      {account.name}
                    </label>
                    <Badge variant="outline" className="text-xs capitalize">
                      {account.accountType}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    <span>{account.institutionName}</span>
                    <span>•</span>
                    <span>{account.transactionCount.toLocaleString()} transactions</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default AccountSelector;

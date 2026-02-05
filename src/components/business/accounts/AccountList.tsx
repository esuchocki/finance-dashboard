import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinance } from "@/context/FinanceContext";
import AccountCard from "./AccountCard";
import { Search, Filter, Landmark } from "lucide-react";
import { AccountType } from "@/lib/types";

const AccountList: React.FC = () => {
  const { businessAccounts, removeBusinessAccount } = useFinance();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<AccountType | "all">("all");

  const filteredAccounts = businessAccounts.filter(account => {
    const matchesSearch = account.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          account.institutionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          account.fileSource.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || account.accountType === filterType;
    return matchesSearch && matchesType;
  });

  const totalTransactions = businessAccounts.reduce((sum, account) => sum + account.transactionCount, 0);

  if (businessAccounts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-3">
            <Landmark className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
            <div>
              <h3 className="text-lg font-semibold">No Accounts Loaded</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Upload QBO files to get started with multi-account analysis
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <Card>
        <CardHeader>
          <CardTitle>Loaded Bank Accounts</CardTitle>
          <CardDescription>
            {businessAccounts.length} {businessAccounts.length === 1 ? 'account' : 'accounts'} loaded with {totalTransactions.toLocaleString()} total transactions
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search accounts or institutions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filterType} onValueChange={(value) => setFilterType(value as AccountType | "all")}>
          <SelectTrigger className="w-full md:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="checking">Checking</SelectItem>
            <SelectItem value="savings">Savings</SelectItem>
            <SelectItem value="mma">Money Market</SelectItem>
            <SelectItem value="credit">Credit Card</SelectItem>
            <SelectItem value="paypal">PayPal</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Account Cards */}
      {filteredAccounts.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No accounts match your search criteria
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAccounts.map(account => (
            <AccountCard
              key={account.id}
              account={account}
              onRemove={removeBusinessAccount}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AccountList;

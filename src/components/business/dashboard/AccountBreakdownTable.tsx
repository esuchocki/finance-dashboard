import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AccountSummary } from "@/lib/types";
import { formatCurrency } from "@/lib/formatters";
import { TrendingUp, TrendingDown, Building2 } from "lucide-react";

interface AccountBreakdownTableProps {
  accountsSummary: AccountSummary[];
}

const AccountBreakdownTable: React.FC<AccountBreakdownTableProps> = ({ accountsSummary }) => {
  if (accountsSummary.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Breakdown</CardTitle>
        <CardDescription>
          Financial summary for each selected bank account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account</TableHead>
              <TableHead>Institution</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Income</TableHead>
              <TableHead className="text-right">Expenses</TableHead>
              <TableHead className="text-right">Net Cashflow</TableHead>
              <TableHead className="text-right">Transactions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accountsSummary.map(account => (
              <TableRow key={account.accountId}>
                <TableCell className="font-medium">{account.accountName}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    {account.institutionName}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs capitalize">
                    {account.accountType}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-green-600 font-medium">
                  {formatCurrency(account.totalIncome)}
                </TableCell>
                <TableCell className="text-right text-orange-600 font-medium">
                  {formatCurrency(account.totalExpenses)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {account.netCashflow >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className={account.netCashflow >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {formatCurrency(Math.abs(account.netCashflow))}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {account.transactionCount.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default AccountBreakdownTable;

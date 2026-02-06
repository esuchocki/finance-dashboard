import React from "react";
import { VendorGroup } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Receipt } from "lucide-react";

interface TopTransactionsTableProps {
  title: string;
  topTransactions: VendorGroup[];
  type: 'income' | 'expense';
}

const TopTransactionsTable: React.FC<TopTransactionsTableProps> = ({
  title,
  topTransactions,
  type
}) => {
  if (topTransactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>No transactions available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>
          Individual transactions not grouped by vendor
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topTransactions.map((group, index) => {
              const transaction = group.transactions[0];
              return (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <Badge variant="outline" className="w-8 justify-center">
                      #{index + 1}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {transaction.name || transaction.payee || 'Unknown'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(transaction.date)}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${type === 'expense' ? 'text-orange-600' : 'text-green-600'}`}>
                    {formatCurrency(transaction.amount)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default TopTransactionsTable;

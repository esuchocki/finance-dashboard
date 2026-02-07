import React, { useState, useMemo } from "react";
import { VendorGroup } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { Receipt, ChevronLeft, ChevronRight } from "lucide-react";

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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return topTransactions.slice(startIndex, endIndex);
  }, [topTransactions, currentPage]);

  const totalPages = Math.ceil(topTransactions.length / itemsPerPage);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

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
        <div className="space-y-4">
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
              {paginatedData.map((group, index) => {
                const transaction = group.transactions[0];
                const globalRank = (currentPage - 1) * itemsPerPage + index + 1;
                return (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <Badge variant="outline" className="w-8 justify-center">
                        #{globalRank}
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

          {/* Pagination Controls */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {totalPages > 1 ? (
                <>Page {currentPage} of {totalPages} ({topTransactions.length} total transactions)</>
              ) : (
                <>{topTransactions.length} {topTransactions.length === 1 ? 'transaction' : 'transactions'}</>
              )}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TopTransactionsTable;

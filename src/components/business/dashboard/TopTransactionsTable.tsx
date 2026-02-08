import React, { useState, useMemo } from "react";
import { VendorGroup } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

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
    <Card className="flex flex-col h-[700px]">
      <CardHeader className="flex-shrink-0">
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Individual transactions not grouped by vendor
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        <div className="flex flex-col h-full">
          {/* Scrollable table area */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
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
          </div>

          {/* Pagination Controls - Fixed at bottom */}
          <div className="flex-shrink-0 pt-4 mt-4 border-t flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {totalPages > 1 ? (
                <>Page {currentPage} of {totalPages} ({topTransactions.length} total transactions)</>
              ) : (
                <>{topTransactions.length} {topTransactions.length === 1 ? 'transaction' : 'transactions'}</>
              )}
            </div>
            {totalPages > 1 && (
              <nav className="flex items-center gap-1" role="navigation" aria-label="Pagination">
                {/* First Page Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  aria-label="Go to first page"
                  title="First page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>

                {/* Previous Page Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Go to previous page"
                  title="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Page Number Buttons */}
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
                      variant="outline"
                      size="sm"
                      className={currentPage === pageNum ? "bg-primary/30 border-primary text-primary" : ""}
                      onClick={() => handlePageChange(pageNum)}
                      aria-label={`Go to page ${pageNum}`}
                      aria-current={currentPage === pageNum ? "page" : undefined}
                      title={`Page ${pageNum}`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}

                {/* Next Page Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Go to next page"
                  title="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                {/* Last Page Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  aria-label="Go to last page"
                  title="Last page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </nav>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TopTransactionsTable;

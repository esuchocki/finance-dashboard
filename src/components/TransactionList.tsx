import React from "react";
import { Transaction, BusinessTransaction } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ArrowLeftRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/ui/pagination";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

interface TransactionListProps {
  transactions: Transaction[];
  title?: string;
  showViewAll?: boolean;
  pagination?: PaginationProps;
}

const TransactionList: React.FC<TransactionListProps> = ({ 
  transactions, 
  title = "Transactions", 
  showViewAll = true,
  pagination
}) => {
  if (!transactions || transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No transactions to display
          </div>
        </CardContent>
      </Card>
    );
  }

  // Helper function to get the best display name for a transaction
  // Updated to prioritize verbose descriptions
  const getDisplayName = (transaction: Transaction) => {
    // Always prioritize the verbose description if it exists and is unique
    if (transaction.verboseDescription && 
        transaction.verboseDescription !== transaction.description &&
        transaction.verboseDescription !== transaction.name) {
      return transaction.verboseDescription;
    }
    if (transaction.payee) {
      return transaction.payee;
    }
    if (transaction.description) {
      return transaction.description;
    }
    return transaction.name;
  };

  // Check if transaction is an inter-account transfer
  const isInterAccountTransfer = (transaction: Transaction): boolean => {
    const businessTx = transaction as BusinessTransaction;
    return businessTx.isIntercompany === true;
  };

  // Get appropriate badge variant based on category type
  const getCategoryBadgeVariant = (transaction: Transaction) => {
    if (!transaction.categoryType) {
      return transaction.type === "CREDIT" || transaction.type === "DEPOSIT" || transaction.type === "INTEREST"
        ? "default"
        : transaction.type === "DEBIT" || transaction.type === "WITHDRAWAL" || transaction.type === "CHECK" || transaction.type === "FEE"
        ? "destructive"
        : "outline";
    }

    switch (transaction.categoryType) {
      case "income":
        return "default";
      case "expense":
        return "destructive";
      case "transfer":
        return "secondary";
      default:
        return "outline";
    }
  };

  // Generate pagination items
  const renderPaginationItems = () => {
    if (!pagination || pagination.totalPages <= 1) return null;
    
    const { currentPage, totalPages, onPageChange } = pagination;
    const items = [];
    
    // Show up to 5 page numbers, with ellipsis for large ranges
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }
    
    // Add first page if not included in range
    if (startPage > 1) {
      items.push(
        <PaginationItem key="page-1">
          <PaginationLink
            isActive={currentPage === 1}
            onClick={() => onPageChange(1)}
            aria-label="Go to page 1"
            aria-current={currentPage === 1 ? "page" : undefined}
          >
            1
          </PaginationLink>
        </PaginationItem>
      );

      // Add ellipsis if there's a gap
      if (startPage > 2) {
        items.push(
          <PaginationItem key="ellipsis-1">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
    }

    // Add page numbers
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={`page-${i}`}>
          <PaginationLink
            isActive={currentPage === i}
            onClick={() => onPageChange(i)}
            aria-label={`Go to page ${i}`}
            aria-current={currentPage === i ? "page" : undefined}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    // Add last page if not included in range
    if (endPage < totalPages) {
      // Add ellipsis if there's a gap
      if (endPage < totalPages - 1) {
        items.push(
          <PaginationItem key="ellipsis-2">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      items.push(
        <PaginationItem key={`page-${totalPages}`}>
          <PaginationLink
            isActive={currentPage === totalPages}
            onClick={() => onPageChange(totalPages)}
            aria-label={`Go to page ${totalPages}`}
            aria-current={currentPage === totalPages ? "page" : undefined}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }
    
    return items;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>{title}</CardTitle>
        {showViewAll && transactions.length > 0 && (
          <Link 
            to="/transactions" 
            className="text-sm text-muted-foreground hover:text-primary flex items-center"
          >
            View all
            <ChevronRight className="h-4 w-4 ml-1" />
          </Link>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {transactions.map((transaction) => (
            <div 
              key={transaction.id} 
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex flex-col">
                <span className="font-medium">
                  {getDisplayName(transaction)}
                </span>
                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2">
                  <span>{new Date(transaction.date).toLocaleDateString()}</span>
                  {(transaction as BusinessTransaction).accountName && (
                    <>
                      <span>•</span>
                      <span className="font-medium">{(transaction as BusinessTransaction).accountName}</span>
                    </>
                  )}
                  {isInterAccountTransfer(transaction) && (
                    <>
                      <span>•</span>
                      <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                        <ArrowLeftRight className="h-3 w-3 mr-1" />
                        Transfer
                      </Badge>
                    </>
                  )}
                  {transaction.category && transaction.category !== "Uncategorized" && (
                    <>
                      <span>•</span>
                      <Badge
                        variant={getCategoryBadgeVariant(transaction)}
                        className="text-xs"
                      >
                        {transaction.category}
                      </Badge>
                    </>
                  )}
                  {transaction.subCategory && (
                    <>
                      <span>•</span>
                      <Badge variant="outline" className="text-xs">
                        {transaction.subCategory}
                      </Badge>
                    </>
                  )}
                  {/* Only show original description if it's different from the verbose one */}
                  {transaction.description && 
                   transaction.description !== getDisplayName(transaction) && (
                    <>
                      <span>•</span>
                      <span className="text-xs opacity-70 max-w-[80px] sm:max-w-[150px] truncate" title={transaction.description}>
                        {transaction.description}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`font-mono font-medium tabular-nums ${
                  transaction.categoryType === "income" ||
                  (!transaction.categoryType && (transaction.type === "CREDIT" || transaction.type === "DEPOSIT" || transaction.type === "INTEREST"))
                    ? "text-finance-positive"
                    : transaction.categoryType === "expense" ||
                      (!transaction.categoryType && (transaction.type === "DEBIT" || transaction.type === "CHECK" || transaction.type === "WITHDRAWAL" || transaction.type === "FEE"))
                    ? "text-finance-negative"
                    : ""
                }`}>
                  {formatCurrency(transaction.amount)}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        {/* Pagination controls */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4 overflow-x-auto">
            <Pagination>
              <PaginationContent>
                {/* First page button */}
                <PaginationItem>
                  <PaginationLink
                    onClick={() => pagination.onPageChange(1)}
                    className={pagination.currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    aria-disabled={pagination.currentPage === 1}
                    aria-label="Go to first page"
                    title="First page"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </PaginationLink>
                </PaginationItem>

                {/* Previous page button */}
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                    className={pagination.currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    aria-disabled={pagination.currentPage === 1}
                    aria-label="Go to previous page"
                    title="Previous page"
                  />
                </PaginationItem>

                {renderPaginationItems()}

                {/* Next page button */}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                    className={pagination.currentPage === pagination.totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    aria-disabled={pagination.currentPage === pagination.totalPages}
                    aria-label="Go to next page"
                    title="Next page"
                  />
                </PaginationItem>

                {/* Last page button */}
                <PaginationItem>
                  <PaginationLink
                    onClick={() => pagination.onPageChange(pagination.totalPages)}
                    className={pagination.currentPage === pagination.totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    aria-disabled={pagination.currentPage === pagination.totalPages}
                    aria-label="Go to last page"
                    title="Last page"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </PaginationLink>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionList;

import React from "react";
import { Transaction } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  InfoTooltipTrigger
} from "@/components/ui/tooltip";

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
          <PaginationLink isActive={currentPage === 1} onClick={() => onPageChange(1)}>
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
          <PaginationLink isActive={currentPage === i} onClick={() => onPageChange(i)}>
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
          <PaginationLink isActive={currentPage === totalPages} onClick={() => onPageChange(totalPages)}>
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
                      <span className="text-xs opacity-70 max-w-[150px] truncate" title={transaction.description}>
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
                {transaction.confidence && (
                  <TooltipProvider>
                    <Tooltip>
                      <InfoTooltipTrigger asChild>
                        <Badge variant={
                          transaction.confidence === "high" ? "default" : 
                          transaction.confidence === "medium" ? "secondary" : "outline"
                        } className="text-xs hidden sm:inline-flex">
                          {transaction.confidence}
                        </Badge>
                      </InfoTooltipTrigger>
                      <TooltipContent side="left">
                        <p>AI confidence level in this categorization</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Pagination controls */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
                    className={pagination.currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    aria-disabled={pagination.currentPage === 1}
                  />
                </PaginationItem>
                
                {renderPaginationItems()}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
                    className={pagination.currentPage === pagination.totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    aria-disabled={pagination.currentPage === pagination.totalPages}
                  />
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

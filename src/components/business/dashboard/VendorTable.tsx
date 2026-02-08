import React, { useMemo, useState } from "react";
import { VendorHierarchyNode, VendorGranularity, BusinessTransaction } from "@/lib/types";
import { buildVendorTableData } from "@/lib/business/vendorAnalysis";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPercentage, formatDate } from "@/lib/formatters";
import { ChevronLeft, ChevronRight, ArrowLeft, ArrowUpDown, ChevronsLeft, ChevronsRight } from "lucide-react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface VendorTableProps {
  title: string;
  hierarchyNodes: VendorHierarchyNode[];
  granularity: VendorGranularity;
  type: 'income' | 'expense';
}

type ViewMode = 'table' | 'transactions';
type SortColumn = 'amount' | 'count' | 'percentage';

const VendorTable: React.FC<VendorTableProps> = ({ title, hierarchyNodes, granularity, type }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedTransactions, setSelectedTransactions] = useState<BusinessTransaction[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('amount');

  const itemsPerPage = 5;

  const allTableData = useMemo(() => {
    const data = buildVendorTableData(hierarchyNodes, granularity);

    console.log(`[VendorTable ${type}] Hierarchy nodes:`, hierarchyNodes.length);
    console.log(`[VendorTable ${type}] Flattened data (${granularity}):`, data.length);

    // Sort based on selected column
    const sorted = [...data].sort((a, b) => {
      switch (sortColumn) {
        case 'amount':
          return b.amount - a.amount;
        case 'count':
          return b.count - a.count;
        case 'percentage':
          return b.percentage - a.percentage;
        default:
          return 0;
      }
    });

    return sorted;
  }, [hierarchyNodes, granularity, sortColumn, type]);

  const tableData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return allTableData.slice(startIndex, endIndex);
  }, [allTableData, currentPage]);

  const totalPages = Math.ceil(allTableData.length / itemsPerPage);

  // Prepare timeline chart data - MUST be before early return to satisfy Rules of Hooks
  const timelineData = useMemo(() => {
    if (viewMode !== 'transactions' || selectedTransactions.length === 0) {
      return [];
    }
    return selectedTransactions.map(tx => ({
      date: new Date(tx.date).getTime(),
      amount: tx.amount,
      dateLabel: formatDate(tx.date),
      name: tx.name || tx.payee || 'Unknown',
      accountName: tx.accountName,
      institutionName: tx.institutionName
    }));
  }, [selectedTransactions, viewMode]);

  const handleCountClick = (vendor: string, transactions: BusinessTransaction[]) => {
    setSelectedVendor(vendor);
    const sortedTransactions = [...transactions]
      .filter(tx => {
        const date = new Date(tx.date);
        return !isNaN(date.getTime());
      })
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateA - dateB;
      });
    setSelectedTransactions(sortedTransactions);
    setViewMode('transactions');
  };

  const handleBackToTable = () => {
    setViewMode('table');
    setSelectedVendor('');
    setSelectedTransactions([]);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleSort = (column: SortColumn) => {
    setSortColumn(column);
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  if (allTableData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getGranularityDescription = () => {
    switch (granularity) {
      case 'consolidated':
        return 'Grouped by organization';
      case 'standard':
        return 'Grouped by subdivision';
      case 'detailed':
        return 'Grouped by transaction';
      default:
        return 'Transaction groups';
    }
  };

  return (
    <Card className="flex flex-col h-[700px]">
      <CardHeader className="flex-shrink-0">
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {viewMode === 'table' ? getGranularityDescription() : `Transactions for ${selectedVendor}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        {viewMode === 'table' ? (
          <div className="flex flex-col h-full">
            {/* Scrollable table area */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Group</TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                        onClick={() => handleSort('amount')}
                      >
                        Amount
                        <ArrowUpDown className={`ml-1 h-3 w-3 ${sortColumn === 'amount' ? 'text-primary' : 'text-muted-foreground'}`} />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                        onClick={() => handleSort('count')}
                      >
                        Count
                        <ArrowUpDown className={`ml-1 h-3 w-3 ${sortColumn === 'count' ? 'text-primary' : 'text-muted-foreground'}`} />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                        onClick={() => handleSort('percentage')}
                      >
                        % of Total
                        <ArrowUpDown className={`ml-1 h-3 w-3 ${sortColumn === 'percentage' ? 'text-primary' : 'text-muted-foreground'}`} />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.map((row, idx) => (
                    <TableRow key={`${row.vendor}-${idx}`}>
                      <TableCell className="font-medium">{row.vendor}</TableCell>
                      <TableCell className={`text-right font-medium ${type === 'expense' ? 'text-orange-600' : 'text-green-600'}`}>
                        {formatCurrency(row.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          onClick={() => handleCountClick(row.vendor, row.transactions)}
                          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium"
                        >
                          {row.count}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">
                          {formatPercentage(row.percentage)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls - Fixed at bottom */}
            <div className="flex-shrink-0 pt-4 mt-4 border-t flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {totalPages > 1 ? (
                  <>Page {currentPage} of {totalPages} ({allTableData.length} total groups)</>
                ) : (
                  <>{allTableData.length} {allTableData.length === 1 ? 'group' : 'groups'}</>
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
        ) : (
          <div className="flex flex-col h-full">
            {/* Back Button - Fixed at top */}
            <div className="flex-shrink-0 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToTable}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Groups
              </Button>
            </div>

            {selectedTransactions.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  No valid transactions to display
                </div>
              </div>
            ) : (
              <>
                {/* Scrollable content area */}
                <div className="flex-1 overflow-y-auto space-y-6 pr-2 min-h-0">
                  {/* Timeline Chart */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Transaction Timeline</h4>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="date"
                            type="number"
                            domain={['dataMin', 'dataMax']}
                            tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis
                            dataKey="amount"
                            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                            tick={{ fontSize: 11 }}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length > 0) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                                    <div className="font-medium">{data.name}</div>
                                    <div className="text-xs text-muted-foreground">{data.accountName}</div>
                                    <div className="text-muted-foreground mt-1">{data.dateLabel}</div>
                                    <div className={`font-bold mt-1 ${type === 'expense' ? 'text-orange-600' : 'text-green-600'}`}>
                                      {formatCurrency(data.amount)}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Scatter
                            data={timelineData}
                            fill={type === 'expense' ? '#F59E0B' : '#10B981'}
                          />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Timeline Summary */}
                  {(() => {
                    const firstDate = new Date(selectedTransactions[0].date);
                    const lastDate = new Date(selectedTransactions[selectedTransactions.length - 1].date);

                    if (isNaN(firstDate.getTime()) || isNaN(lastDate.getTime())) {
                      return null;
                    }

                    const daysDiff = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

                    return (
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <div className="flex items-center justify-between text-sm">
                          <div>
                            <span className="text-muted-foreground">First transaction: </span>
                            <span className="font-medium">{formatDate(selectedTransactions[0].date)}</span>
                          </div>
                          <div className="text-muted-foreground">
                            {daysDiff > 0 ? `${daysDiff} days span` : 'Same day'}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Last transaction: </span>
                            <span className="font-medium">{formatDate(selectedTransactions[selectedTransactions.length - 1].date)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Transaction Table */}
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Date</TableHead>
                          <TableHead>Payee</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedTransactions.map((tx, index) => {
                          const currentDate = new Date(tx.date);
                          const prevDate = index > 0 ? new Date(selectedTransactions[index - 1].date) : null;
                          const isNewMonth = !prevDate ||
                            currentDate.getMonth() !== prevDate.getMonth() ||
                            currentDate.getFullYear() !== prevDate.getFullYear();

                          const monthLabel = currentDate.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long'
                          });

                          return (
                            <React.Fragment key={tx.id}>
                              {isNewMonth && (
                                <TableRow className="bg-muted/30 hover:bg-muted/30">
                                  <TableCell colSpan={3} className="font-semibold text-xs uppercase tracking-wide text-muted-foreground py-2">
                                    {monthLabel}
                                  </TableCell>
                                </TableRow>
                              )}
                              <TableRow>
                                <TableCell className="text-sm tabular-nums">
                                  {formatDate(tx.date)}
                                </TableCell>
                                <TableCell className="font-medium text-sm">
                                  {tx.name || tx.payee || 'Unknown'}
                                </TableCell>
                                <TableCell className={`text-right font-medium tabular-nums ${type === 'expense' ? 'text-orange-600' : 'text-green-600'}`}>
                                  {formatCurrency(tx.amount)}
                                </TableCell>
                              </TableRow>
                            </React.Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Total Summary - Fixed at bottom */}
                <div className="flex-shrink-0 mt-4 pt-4 border-t flex justify-between items-center">
                  <span className="font-medium">Total ({selectedTransactions.length} {selectedTransactions.length === 1 ? 'transaction' : 'transactions'})</span>
                  <span className={`font-bold text-lg ${type === 'expense' ? 'text-orange-600' : 'text-green-600'}`}>
                    {formatCurrency(selectedTransactions.reduce((sum, tx) => sum + tx.amount, 0))}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VendorTable;

import React from "react";
import { BalanceDrop } from "@/lib/business/transactionAnalysis";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingDown, ArrowLeft } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

interface Props {
  drop: BalanceDrop;
  onBack: () => void;
}

const PatternBalanceDropDetail: React.FC<Props> = ({ drop, onBack }) => {
  const severityColors = {
    critical: 'bg-red-50 border-red-300',
    warning: 'bg-orange-50 border-orange-200',
    info: 'bg-blue-50 border-blue-200',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5" />
          <CardTitle>Balance Drop: {drop.date.toLocaleDateString()}</CardTitle>
        </div>
        <CardDescription>{drop.accountName}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" size="sm" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Patterns
        </Button>

        <div className="max-h-[700px] overflow-y-auto space-y-6 pr-2">
          {/* Drop Summary */}
          <Alert className={severityColors[drop.severity]}>
            <TrendingDown className="h-4 w-4" />
            <AlertTitle className="flex items-center gap-2">
              <span>Balance Drop Details</span>
              <Badge variant={drop.severity === 'critical' ? 'destructive' : 'outline'} className="text-xs">
                {drop.severity}
              </Badge>
              {drop.isLikelyNormal && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  Likely Normal
                </Badge>
              )}
            </AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Balance Before:</span>
                    <span className="ml-2 font-medium">{formatCurrency(drop.balanceBefore)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Balance After:</span>
                    <span className="ml-2 font-medium">{formatCurrency(drop.balanceAfter)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Drop Amount:</span>
                    <span className="ml-2 font-medium text-orange-600">{formatCurrency(drop.dropAmount)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Drop Percentage:</span>
                    <span className="ml-2 font-medium text-orange-600">{(drop.dropPercentage * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Causing Transactions Table */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              Transactions on {drop.date.toLocaleDateString()} ({drop.causingTransactions.length} total)
            </h4>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drop.causingTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm tabular-nums">{formatDate(tx.date)}</TableCell>
                      <TableCell className="font-medium text-sm">{tx.name || tx.payee || 'Unknown'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{tx.category}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-orange-600">
                        {formatCurrency(tx.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PatternBalanceDropDetail;

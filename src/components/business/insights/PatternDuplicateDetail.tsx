import React from "react";
import { BusinessTransaction } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, AlertTriangle, AlertCircle, ArrowLeft } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";

export interface DuplicateGroup {
  transactions: BusinessTransaction[];
  reason: string;
  confidence: string;
}

interface Props {
  group: DuplicateGroup;
  onBack: () => void;
}

const PatternDuplicateDetail: React.FC<Props> = ({ group, onBack }) => {
  const confidenceColors: Record<string, string> = {
    high: 'bg-red-50 border-red-200 text-red-800',
    medium: 'bg-orange-50 border-orange-200 text-orange-800',
    low: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Copy className="h-5 w-5 text-gray-600" />
          <CardTitle>Potential Duplicate Group</CardTitle>
        </div>
        <CardDescription>
          {group.transactions.length} potentially duplicate transactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" size="sm" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Patterns
        </Button>

        <div className="max-h-[700px] overflow-y-auto space-y-6 pr-2">
          {/* Summary */}
          <Alert className={confidenceColors[group.confidence] ?? confidenceColors.low}>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="flex items-center gap-2">
              <span>Duplicate Detection Details</span>
              <Badge variant="outline" className="text-xs">
                {group.confidence} confidence
              </Badge>
            </AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                <p className="text-sm font-medium">{group.reason}</p>
                <p className="text-sm">
                  These {group.transactions.length} transactions appear to be duplicates based on matching amounts, dates, and merchant names.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Transaction Comparison */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Transaction Details</h4>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm tabular-nums">{formatDate(tx.date)}</TableCell>
                      <TableCell className="font-medium text-sm">{tx.name || tx.payee || 'Unknown'}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-col">
                          <span className="font-medium">{tx.accountName}</span>
                          <span className="text-muted-foreground">{tx.entityName || 'Unknown Entity'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {tx.institutionName || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums text-orange-600">
                        {formatCurrency(tx.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Additional Info */}
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-900">
              <strong>What should I do?</strong>
              <br />
              Review these transactions carefully. If they are duplicates, you may want to exclude them from your analysis or remove them from your data source.
              Common causes include pending transactions that later clear, or transactions imported from multiple sources.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
};

export default PatternDuplicateDetail;

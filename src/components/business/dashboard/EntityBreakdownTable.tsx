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
import { EntitySummary } from "@/lib/types";
import { formatCurrency } from "@/lib/formatters";
import { TrendingUp, TrendingDown } from "lucide-react";

interface EntityBreakdownTableProps {
  entitiesSummary: EntitySummary[];
}

const EntityBreakdownTable: React.FC<EntityBreakdownTableProps> = ({ entitiesSummary }) => {
  if (entitiesSummary.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entity Breakdown</CardTitle>
        <CardDescription>
          Financial summary for each selected entity
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entity</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Income</TableHead>
              <TableHead className="text-right">Expenses</TableHead>
              <TableHead className="text-right">Net Cashflow</TableHead>
              <TableHead className="text-right">Transactions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entitiesSummary.map(entity => (
              <TableRow key={entity.entityId}>
                <TableCell className="font-medium">{entity.entityName}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {entity.entityType}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-green-600 font-medium">
                  {formatCurrency(entity.totalIncome)}
                </TableCell>
                <TableCell className="text-right text-orange-600 font-medium">
                  {formatCurrency(entity.totalExpenses)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {entity.netCashflow >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className={entity.netCashflow >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {formatCurrency(Math.abs(entity.netCashflow))}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {entity.transactionCount.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default EntityBreakdownTable;

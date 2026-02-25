import React, { useMemo } from "react";
import { Subscription } from "@/lib/business/transactionAnalysis";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, AlertTriangle, AlertCircle, ArrowLeft } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  subscription: Subscription;
  onBack: () => void;
}

const PatternSubscriptionDetail: React.FC<Props> = ({ subscription, onBack }) => {
  const txs = subscription.transactions;

  const timelineData = useMemo(() => txs.map(tx => ({
    date: new Date(tx.date).getTime(),
    amount: tx.amount,
    dateLabel: formatDate(tx.date),
    name: tx.name || tx.payee || 'Unknown',
    accountName: tx.accountName,
    institutionName: tx.institutionName,
  })), [txs]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          <CardTitle>Subscription: {subscription.merchantName}</CardTitle>
        </div>
        <CardDescription>
          {subscription.frequency === 'monthly' ? 'Monthly' : 'Annual'} subscription •{' '}
          {subscription.isActive ? 'Active' : 'Cancelled'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" size="sm" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Patterns
        </Button>

        <div className="max-h-[700px] overflow-y-auto space-y-6 pr-2">
          {/* Timeline Chart */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Payment Timeline</h4>
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
                    tickFormatter={(value) => `$${value.toFixed(0)}`}
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
                            <div className="font-bold text-orange-600 mt-1">{formatCurrency(data.amount)}</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter data={timelineData} fill="#F59E0B" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-muted/50 p-4 rounded-lg grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Account</p>
              <p className="font-medium">{subscription.accountName || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Monthly Cost</p>
              <p className="font-medium">{formatCurrency(subscription.monthlyAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Paid</p>
              <p className="font-medium">{formatCurrency(subscription.totalPaid)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payment Count</p>
              <p className="font-medium">{subscription.transactionCount} payments</p>
            </div>
          </div>

          {/* Trend Analysis */}
          {subscription.trend && subscription.trend.direction !== 'stable' && (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-900">Trend Detected</AlertTitle>
              <AlertDescription className="text-blue-800">
                This subscription shows a <strong>{subscription.trend.strength}</strong> {subscription.trend.direction} trend.
                Amount has changed by <strong>{formatCurrency(Math.abs(subscription.trend.totalChange))}</strong> ({subscription.trend.changePercentage > 0 ? '+' : ''}{subscription.trend.changePercentage.toFixed(1)}%) over time.
              </AlertDescription>
            </Alert>
          )}

          {/* Amount Change History */}
          {subscription.amountHistory.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Amount Change History</h4>
              <div className="border rounded-md p-3 space-y-2">
                {subscription.amountHistory.map((change, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-muted-foreground">{formatDate(change.date)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{formatCurrency(change.previousAmount)}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-medium">{formatCurrency(change.newAmount)}</span>
                      <Badge variant={change.changePercentage > 0 ? "destructive" : "default"} className="text-xs">
                        {change.changePercentage > 0 ? '+' : ''}{change.changePercentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prediction */}
          {subscription.prediction && subscription.prediction.confidence !== 'low' && (
            <Alert className="bg-purple-50 border-purple-200">
              <AlertCircle className="h-4 w-4 text-purple-600" />
              <AlertTitle className="text-purple-900">Next Payment Prediction</AlertTitle>
              <AlertDescription className="text-purple-800">
                Expected amount: <strong>{formatCurrency(subscription.prediction.nextExpectedAmount)}</strong>
                <br />
                Range: {formatCurrency(subscription.prediction.predictionRange.min)} - {formatCurrency(subscription.prediction.predictionRange.max)}
                <br />
                Confidence: <strong>{subscription.prediction.confidence}</strong> ({(subscription.prediction.confidenceScore * 100).toFixed(0)}%)
              </AlertDescription>
            </Alert>
          )}

          {/* Anomalies */}
          {subscription.anomalies.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Anomalies Detected</h4>
              <div className="space-y-2">
                {subscription.anomalies.map((anomaly, idx) => (
                  <Alert key={idx} className="bg-gray-50 border-gray-200">
                    <AlertTriangle className="h-4 w-4 text-gray-600" />
                    <AlertDescription className="text-gray-900 text-sm">
                      <strong>{formatDate(anomaly.transaction.date)}</strong>: {anomaly.reason}
                      <br />
                      Expected: {formatCurrency(anomaly.expectedAmount)}, Actual: {formatCurrency(anomaly.actualAmount)}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}

          {/* Transaction Table */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txs.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm tabular-nums">{formatDate(tx.date)}</TableCell>
                    <TableCell className="font-medium text-sm">{tx.name || tx.payee || 'Unknown'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{tx.accountName}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums text-orange-600">
                      {formatCurrency(tx.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PatternSubscriptionDetail;

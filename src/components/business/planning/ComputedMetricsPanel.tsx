import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { KclComputedMetrics } from '@/lib/kclTypes';
import { fmtCurrency, fmtPct, fmtMonth } from '@/lib/kclCompute';

interface ComputedMetricsPanelProps {
  metrics: KclComputedMetrics;
}

const ComputedMetricsPanel: React.FC<ComputedMetricsPanelProps> = ({ metrics }) => {
  const deficit = metrics.deficit;
  const deficitLabel = deficit > 0 ? 'Deficit' : 'Surplus';
  const deficitColor = deficit > 0 ? 'text-red-600' : 'text-emerald-600';

  return (
    <div className="space-y-6">

      {/* Data gaps */}
      {metrics.dataGaps.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 space-y-1">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Data gaps</p>
          {metrics.dataGaps.map((gap, i) => (
            <p key={i} className="text-xs text-amber-700 dark:text-amber-400">{gap}</p>
          ))}
        </div>
      )}

      {/* Financial summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Total Revenue" value={fmtCurrency(metrics.totalRevenue)} sub="Xero cash collected" />
        <SummaryCard label="Total Expenses" value={fmtCurrency(metrics.totalExpenses)} />
        <SummaryCard
          label={deficitLabel}
          value={fmtCurrency(Math.abs(deficit))}
          valueClass={deficitColor}
        />
        <SummaryCard label="Cost Per Day" value={fmtCurrency(metrics.costPerDay)} sub="per participant-day" />
      </div>

      {/* Participation */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <SummaryCard label="Participant-Days" value={metrics.participantDays.toLocaleString()} sub={`strict ${metrics.year} filter`} />
        <SummaryCard label="Programs" value={String(metrics.programCount)} sub="with participant-days > 0" />
        <SummaryCard label="Omnis Billed" value={fmtCurrency(metrics.omnisBilledTotal)} sub="GL 4xxx charges" />
      </div>

      {/* Expense categories */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Expense Categories</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs text-right">Total</TableHead>
                <TableHead className="text-xs text-right">/Day</TableHead>
                <TableHead className="text-xs">Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(metrics.expenseCategories)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([key, cat]) => (
                  <TableRow key={key}>
                    <TableCell className="text-xs font-medium py-2">{cat.name}</TableCell>
                    <TableCell className="text-xs text-right py-2">{fmtCurrency(cat.total)}</TableCell>
                    <TableCell className="text-xs text-right py-2 text-muted-foreground">
                      {fmtCurrency(cat.perDay)}
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {cat.type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              <TableRow className="border-t-2">
                <TableCell className="text-xs font-semibold py-2">Total</TableCell>
                <TableCell className="text-xs font-semibold text-right py-2">
                  {fmtCurrency(metrics.totalExpenses)}
                </TableCell>
                <TableCell className="text-xs text-right py-2 text-muted-foreground">
                  {fmtCurrency(metrics.costPerDay)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Utilities detail */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Utilities — Fixed / Variable Split</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <p className="text-muted-foreground">
            Baseline month: <strong>{fmtMonth(metrics.utilityBaselineMonth)}</strong> ({fmtCurrency(metrics.utilityBaselineSpend)}/month minimum)
          </p>
          <div className="grid grid-cols-3 gap-2">
            <SummaryCard label="Fixed" value={fmtCurrency(metrics.utilityFixed)} sub={fmtPct(metrics.utilityFixed / (metrics.utilityTotal || 1))} />
            <SummaryCard label="Variable" value={fmtCurrency(metrics.utilityVariable)} sub={fmtPct(metrics.utilityVariable / (metrics.utilityTotal || 1))} />
            <SummaryCard label="Total" value={fmtCurrency(metrics.utilityTotal)} />
          </div>
          <div className="grid grid-cols-4 gap-2 pt-1">
            {(['winter', 'spring', 'summer', 'fall'] as const).map(s => (
              <div key={s} className="rounded border px-2 py-1.5 text-center">
                <p className="capitalize text-xs font-medium">{s}</p>
                <p className="text-xs text-muted-foreground">{metrics.seasonalMultipliers[s].toFixed(2)}x</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Capacity & opportunity cost */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="Total Rooms" value={String(metrics.totalRooms)} />
        <SummaryCard label="Staff Rooms" value={String(metrics.staffRooms)} />
        <SummaryCard label="Available" value={String(metrics.availableRooms)} />
        <SummaryCard
          label="Opportunity Cost"
          value={fmtCurrency(metrics.opportunityCostAnnual)}
          sub={`${fmtCurrency(metrics.avgStaffRoomRate)}/night avg`}
        />
      </div>

      {/* Payroll */}
      {metrics.csvPayrollAnnualized > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Payroll Reconciliation</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <SummaryCard label="CSV Annualized" value={fmtCurrency(metrics.csvPayrollAnnualized)} sub="from salaries.csv" />
            <SummaryCard label="Xero Actual" value={fmtCurrency(metrics.xeroPayrollActual)} sub="GL 6105+6110+6114+6116" />
            <SummaryCard label="Gap" value={fmtCurrency(Math.abs(metrics.payrollGap))} sub="partial-year employees" />
            <div className="rounded border px-3 py-2 space-y-1">
              <p className="text-xs text-muted-foreground">Staff type</p>
              <p className="text-xs">{metrics.residentialStaffCount} residential</p>
              <p className="text-xs">{metrics.nonResidentialStaffCount} non-residential</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CC fees */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label="CC Fee Rate" value={fmtPct(metrics.ccFeeRate, 2)} sub="GL 61001 / total revenue" />
        <SummaryCard label="CC Fees Total" value={fmtCurrency(metrics.ccFeeTotal)} />
      </div>

      {/* Top programs */}
      {metrics.topPrograms.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Programs by Revenue</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Program</TableHead>
                  <TableHead className="text-xs text-right">Revenue</TableHead>
                  <TableHead className="text-xs text-right">Tuition</TableHead>
                  <TableHead className="text-xs text-right">Regs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.topPrograms.slice(0, 15).map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs py-1.5 max-w-48 truncate">{p.name}</TableCell>
                    <TableCell className="text-xs text-right py-1.5">{fmtCurrency(p.totalRevenue)}</TableCell>
                    <TableCell className="text-xs text-right py-1.5 text-muted-foreground">
                      {fmtCurrency(p.tuitionRevenue)}
                    </TableCell>
                    <TableCell className="text-xs text-right py-1.5">{p.registrations}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

    </div>
  );
};

// ─── Small summary card ───────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, sub, valueClass }) => (
  <div className="rounded border px-3 py-2.5 space-y-0.5">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={`text-sm font-semibold ${valueClass ?? ''}`}>{value}</p>
    {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
  </div>
);

export default ComputedMetricsPanel;

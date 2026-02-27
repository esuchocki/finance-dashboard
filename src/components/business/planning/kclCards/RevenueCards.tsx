import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { KclComputedMetrics } from '@/lib/kclTypes';
import { MONTH_NAMES } from '@/lib/kclTypes';
import { fmtCurrency, fmtPct, fmtMonth } from '@/lib/kclFormatters';
import { Tip, SummaryCard } from './kclCardUtils';

// ─── Revenue Streams Card ─────────────────────────────────────────────────────

export const RevenueStreamsCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
  const { revenueStreams, totalRevenue, omnisBilledTotal, revenueGapAmount, residencyResidentsBilled } = metrics;
  const pct = (n: number) => totalRevenue > 0 ? fmtPct(n / totalRevenue) : '—';

  const residencyProgramHousing = revenueStreams.residency - residencyResidentsBilled;

  const rows = [
    { label: 'Regular Programs',        sub: 'GL 4300, 4310, 4510',       value: revenueStreams.programs,              hint: 'GL 4300 + 4310 + 4510 credit entries. Program tuition and retreat registrations.' },
    ...(residencyResidentsBilled > 0
      ? [
          { label: 'Residency — Long-term Residents', sub: 'Omnis: residency program billing', value: residencyResidentsBilled,    hint: 'Total revenue billed in Omnis for programs whose name contains "residency program". These are long-term tenants registered as program participants. Mirrors the Residency Participants track in the Residential Population Breakdown.' },
          { label: 'Residency — Program Housing',     sub: 'GL 4500, 4520 minus residents',    value: residencyProgramHousing,     hint: 'GL 4500 + 4520 credit entries (Xero) minus the Omnis residency program billing. Represents housing charges collected through Xero for in-house retreat and other program participants.' },
        ]
      : [
          { label: 'Residency',          sub: 'GL 4500, 4520',             value: revenueStreams.residency,             hint: 'GL 4500 + 4520 credit entries. Annual residency program tuition. Load program_revenue.csv to split this into Long-term Residents vs Program Housing.' },
        ]
    ),
    { label: 'Donations (unrestr.)',    sub: 'GL 4000, 4050, 4150',       value: revenueStreams.donationsUnrestricted, hint: 'GL 4000 + 4050 + 4150 credit entries. Unrestricted general donations.' },
    { label: 'Donations (restr.)',      sub: 'GL 4200',                    value: revenueStreams.donationsRestricted,   hint: 'GL 4200 credit entries. Restricted-purpose donations.' },
    { label: 'Campaign Funds',          sub: 'GL 3xxx',                    value: revenueStreams.campaigns,             hint: 'GL 3xxx credit entries. Designated campaign fund credits.' },
    { label: 'Other Income',            sub: 'remaining GL 4xxx',          value: revenueStreams.other,                 hint: 'Remaining GL 4xxx not matched by the named streams above.' },
  ].filter(r => r.value > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Revenue by Stream</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Stream</TableHead>
              <TableHead className="text-xs text-right">
                <Tip hint="Σ(credit − debit) for the listed GL account codes. Source: gl_transactions.csv.">Amount</Tip>
              </TableHead>
              <TableHead className="text-xs text-right">
                <Tip hint="This stream's amount ÷ Total Xero Revenue.">% of Total</Tip>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="py-2">
                  <p className="text-xs font-medium">{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.sub}</p>
                </TableCell>
                <TableCell className="text-xs text-right py-2">
                  <Tip hint={r.hint}>{fmtCurrency(r.value)}</Tip>
                </TableCell>
                <TableCell className="text-xs text-right py-2 text-muted-foreground">{pct(r.value)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t-2">
              <TableCell className="text-xs font-semibold py-2">Total (Xero)</TableCell>
              <TableCell className="text-xs font-semibold text-right py-2">{fmtCurrency(totalRevenue)}</TableCell>
              <TableCell className="text-xs text-right py-2 text-muted-foreground">100%</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        {omnisBilledTotal > 0 && (
          <div className="mt-2 rounded border border-muted px-3 py-2 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Omnis billed (GL 4xxx charges)</span>
              <span className="font-medium">
                <Tip hint="Total of amount_charged in program_revenue.csv where GL account begins with '4'. This is the Omnis billing total, not the Xero cash total.">
                  {fmtCurrency(omnisBilledTotal)}
                </Tip>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gap (Xero minus Omnis)</span>
              <span className="font-medium">
                <Tip hint="Xero Total Revenue minus Omnis Billed. Includes donations, restricted credits, wire transfers, and journal adjustments not in Omnis program charges.">
                  {fmtCurrency(revenueGapAmount)}
                </Tip>
              </span>
            </div>
            <p className="text-muted-foreground pt-0.5">
              The gap reflects donations, restricted fund credits, and GL entries not captured in Omnis
              program charges (e.g. direct wire transfers, journal adjustments).
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Monthly Overview Card ────────────────────────────────────────────────────

export const MonthlyOverviewCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
  const { monthlyData } = metrics;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Monthly Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground pb-1">
          MJ% = share of revenue recognized via Omnis Manual Journal batch postings (period-closing).
          High values are normal for months when many programs close. Amber = &gt;80%.
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-10">Mo.</TableHead>
              <TableHead className="text-xs text-right">
                <Tip hint="GL 4300 + 4310 + 4510 credit entries for this calendar month.">Programs</Tip>
              </TableHead>
              <TableHead className="text-xs text-right">
                <Tip hint="GL 4500 + 4520 credit entries for this calendar month.">Residency</Tip>
              </TableHead>
              <TableHead className="text-xs text-right">
                <Tip hint="GL 4000 + 4050 + 4150 + 4200 (donations) + 3xxx (campaigns) credit entries for this calendar month.">Donations & Campaigns</Tip>
              </TableHead>
              <TableHead className="text-xs text-right">
                <Tip hint="Sum of all GL 4xxx and 3xxx credit entries for this month.">Total Rev</Tip>
              </TableHead>
              <TableHead className="text-xs text-right">
                <Tip hint="Σ(debit − credit) for all GL 5xxx and 6xxx transactions in this month.">Expenses</Tip>
              </TableHead>
              <TableHead className="text-xs text-right">
                <Tip hint="Total Rev minus Expenses for this month.">Net</Tip>
              </TableHead>
              <TableHead className="text-xs text-right">
                <Tip hint="Manual Journal share: transactions with Source='Manual Journal' ÷ Total Revenue for this month. High values are normal when Omnis batch-posts tuition at period close.">MJ%</Tip>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthlyData.map(row => {
              const net = row.revenueTotal - row.expenses;
              const mjPct = row.revenueTotal > 0 ? row.revenueManualJournal / row.revenueTotal : 0;
              const mjAnomaly = mjPct > 0.80;
              return (
                <TableRow key={row.month}>
                  <TableCell className="text-xs py-1.5 font-medium">{MONTH_NAMES[row.month]}</TableCell>
                  <TableCell className="text-xs text-right py-1.5">
                    {row.revenuePrograms > 0 ? fmtCurrency(row.revenuePrograms) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-xs text-right py-1.5">
                    {row.revenueResidency > 0 ? fmtCurrency(row.revenueResidency) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-xs text-right py-1.5">
                    {(row.revenueDonations + row.revenueCampaigns) > 0
                      ? fmtCurrency(row.revenueDonations + row.revenueCampaigns)
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-xs text-right py-1.5 font-medium">{fmtCurrency(row.revenueTotal)}</TableCell>
                  <TableCell className="text-xs text-right py-1.5">{fmtCurrency(row.expenses)}</TableCell>
                  <TableCell className={`text-xs text-right py-1.5 font-medium ${net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {net > 0 ? '+' : ''}{fmtCurrency(net)}
                  </TableCell>
                  <TableCell className={`text-xs text-right py-1.5 ${mjAnomaly ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                    {row.revenueTotal > 0 ? fmtPct(mjPct, 0) : '—'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

// ─── CC Fee Benchmark Card ────────────────────────────────────────────────────

export const CcFeeCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
  const { ccFeeRate, ccFeeTotal, ccFeeBenchmarkRate, ccFeeExcessRate, ccFeeAlert } = metrics;
  // ccFeeRate = ccFeeTotal / GL4xxxRevenue. Implied GL4xxxRevenue = ccFeeTotal / ccFeeRate.
  // excessCost must use the same denominator as the rate (GL 4xxx, not total revenue including 3xxx).
  const gl4Revenue = ccFeeRate > 0 ? ccFeeTotal / ccFeeRate : 0;
  const excessCost = ccFeeExcessRate * gl4Revenue;

  return (
    <Card className={ccFeeAlert ? 'border-amber-300' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          Payment Processing Costs
          {ccFeeAlert && (
            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">
              above benchmark
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            label="Effective Rate"
            value={fmtPct(ccFeeRate, 2)}
            sub="GL 6100_1 / GL 4xxx revenue"
            hint="GL 6100_1 total (debit − credit) ÷ GL 4xxx revenue. GL 3xxx campaign/capital funds are excluded from the denominator — they are typically major-donor checks or wire transfers, not card transactions. Per-program attribution uses this rate × program revenue; CC fees on non-program card transactions stay in overhead."
          />
          <SummaryCard
            label="Industry Benchmark"
            value={fmtPct(ccFeeBenchmarkRate, 1)}
            sub="typical nonprofit rate"
            hint="Typical nonprofit card-processing rate (2.2% card-present, higher online). Used to flag whether the organization's rate warrants renegotiation."
          />
          <SummaryCard
            label="Excess Rate"
            value={fmtPct(ccFeeExcessRate, 2)}
            sub="above benchmark"
            hint="Effective Rate minus Benchmark Rate. The percentage above industry norms."
          />
          <SummaryCard
            label="Total Fees Paid"
            value={fmtCurrency(ccFeeTotal)}
            sub="GL 6100_1 debits"
            hint="Σ(debit − credit) for GL 6100_1 (merchant/payment processing fees) across the year."
          />
        </div>
        {ccFeeAlert && excessCost > 0 && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            At the {fmtPct(ccFeeBenchmarkRate, 1)} benchmark rate, fees would be approximately{' '}
            <strong>{fmtCurrency(ccFeeTotal - excessCost)}</strong>, saving roughly{' '}
            <strong>
              <Tip hint="Approximate annual savings if fees were at the benchmark rate. = (Effective Rate − Benchmark Rate) × Total Revenue.">
                {fmtCurrency(excessCost)}
              </Tip>
            </strong>{' '}
            annually. Consider renegotiating processor rates
            or reviewing the GL 6100_1 account for non-processing charges included in this total.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Utilities Card ───────────────────────────────────────────────────────────

export const UtilitiesCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm">Utilities — Fixed / Variable Split</CardTitle>
    </CardHeader>
    <CardContent className="space-y-2 text-xs">
      <p className="text-muted-foreground">
        GL 6270 (heating/electric) and GL 6250 (phone/internet) are combined here.
        Phone/internet is essentially fixed year-round, so seasonal multipliers reflect heating variation more than total utility variation.
        The fixed/variable split absorbs GL 6250 into the baseline, which slightly understates true heating variability.
      </p>
      <p className="text-muted-foreground">
        Baseline:{' '}
        <strong>
          <Tip hint="Average daily rate of the 3 lowest-spend months (GL 6270 + GL 6250). Using 3 months rather than the single lowest is more robust to billing timing anomalies — the same approach used for the food baseline. Fixed annual = baselinePerDay × 365.">
            {fmtCurrency(metrics.utilityBaselinePerDay)}/day
          </Tip>
        </strong>{' '}
        avg of 3 lowest months (lowest single month:{' '}
        <Tip hint="The calendar month with the single lowest GL 6270 + GL 6250 spend. Shown for reference; the computation uses the 3-month average daily rate.">
          {fmtMonth(metrics.utilityBaselineMonth)},{' '}
          {fmtCurrency(metrics.utilityBaselineSpend)}
        </Tip>
        )
      </p>
      <div className="grid grid-cols-3 gap-2">
        <SummaryCard
          label="Fixed"
          value={fmtCurrency(metrics.utilityFixed)}
          sub={fmtPct(metrics.utilityFixed / (metrics.utilityTotal || 1))}
          hint="Avg daily rate of 3 lowest months × 365. The portion of utility cost that exists regardless of program activity."
        />
        <SummaryCard
          label="Variable"
          value={fmtCurrency(metrics.utilityVariable)}
          sub={fmtPct(metrics.utilityVariable / (metrics.utilityTotal || 1))}
          hint="Utility Total minus Fixed. The portion correlated with occupancy and program volume."
        />
        <SummaryCard
          label="Total"
          value={fmtCurrency(metrics.utilityTotal)}
          hint="Σ(debit − credit) for GL 6270 + GL 6250 across all 12 months."
        />
      </div>
      <div className="grid grid-cols-4 gap-2 pt-1">
        {(['winter', 'spring', 'summer', 'fall'] as const).map(s => (
          <div key={s} className="rounded border px-2 py-1.5 text-center">
            <p className="capitalize text-xs font-medium">{s}</p>
            <p className="text-xs text-muted-foreground">
              <Tip hint="Average monthly utility spend in this season ÷ baseline monthly spend (baselinePerDay × 365 ÷ 12). Shows relative cost compared to the baseline level. 1.0× = baseline. Winter = Dec/Jan/Feb; Spring = Mar/Apr/May; Summer = Jun/Jul/Aug; Fall = Sep/Oct/Nov.">
                {metrics.seasonalMultipliers[s].toFixed(2)}x
              </Tip>
            </p>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

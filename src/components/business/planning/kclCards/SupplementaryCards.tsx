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
import { fmtCurrency, fmtPct } from '@/lib/kclFormatters';
import { Tip, SummaryCard } from './kclCardUtils';

// ─── Break-Even Card ──────────────────────────────────────────────────────────

export const BreakEvenCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
  const { breakEven } = metrics;
  const isDeficit = breakEven.deficit > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Break-Even Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Current {isDeficit ? 'deficit' : 'surplus'}:</span>
          <span className={`text-sm font-semibold ${isDeficit ? 'text-red-600' : 'text-emerald-600'}`}>
            <Tip hint="Total Expenses minus Total Revenue — same figure as the financial summary.">
              {fmtCurrency(Math.abs(breakEven.deficit))}
            </Tip>
          </span>
        </div>

        {isDeficit && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Lever</TableHead>
                <TableHead className="text-xs text-right">Units Needed</TableHead>
                <TableHead className="text-xs text-right">Impact Each</TableHead>
                <TableHead className="text-xs text-muted-foreground text-xs">Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="py-2">
                  <p className="text-xs font-medium">Add Residents</p>
                  <p className="text-xs text-muted-foreground">GL 4500 + 4520</p>
                </TableCell>
                <TableCell className="text-xs text-right py-2 font-semibold">
                  <Tip hint={`Deficit ÷ net residency contribution (${fmtCurrency(breakEven.residencyNetPerResident)}/yr), rounded up. Net = $21K gross minus est. annual marginal food cost (food marginal rate × 365 days). Also constrained by available private rooms. Using gross $21K alone would show +${Math.ceil(Math.max(breakEven.deficit, 0) / breakEven.residencyRevenuePerResident)}.`}>
                    +{breakEven.residentsNeeded}
                  </Tip>
                </TableCell>
                <TableCell className="text-xs text-right py-2 text-muted-foreground">
                  <Tip hint={`Gross: ${fmtCurrency(breakEven.residencyRevenuePerResident)}/yr ($1,750/mo × 12). Est. marginal food: ${fmtCurrency(breakEven.residencyRevenuePerResident - breakEven.residencyNetPerResident)}/yr (food marginal rate × 365). Net contribution used for residentsNeeded: ${fmtCurrency(breakEven.residencyNetPerResident)}/yr.`}>
                    {fmtCurrency(breakEven.residencyNetPerResident)}
                  </Tip>/yr net est.
                </TableCell>
                <TableCell className="text-xs py-2 text-muted-foreground">
                  ({fmtCurrency(breakEven.residencyRevenuePerResident)} gross, verify pricing)
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="py-2">
                  <p className="text-xs font-medium">Add Programs</p>
                  <p className="text-xs text-muted-foreground">GL 4300, 4310, 4510</p>
                </TableCell>
                {breakEven.avgDirectContributionMargin > 0 ? (
                  <>
                    <TableCell className="text-xs text-right py-2 font-semibold">
                      <Tip hint="Deficit ÷ avg direct contribution margin, rounded up. Uses revenue minus direct variable costs (teacher, food, CC fees, utility marginal) — overhead is excluded because it is fixed. Note: average is across all program categories (REG, IHR, CABN). Actionable capacity is typically additional REG visiting-teacher retreats, which generally carry higher direct margins than IHR or CABN — so this figure may overstate programs needed if planning to add REG programs specifically.">
                        +{breakEven.programsNeeded}
                      </Tip>
                    </TableCell>
                    <TableCell className="text-xs text-right py-2 text-muted-foreground">
                      <Tip hint={`Avg direct contribution per program = revenue − teacher − food − CC fees − scholarships − utility marginal (no overhead deduction). Overhead is fixed and already included in the deficit. Avg gross revenue is ${fmtCurrency(breakEven.avgProgramRevenue)}/program; fully-loaded avg margin is ${fmtCurrency(breakEven.avgContributionMargin)}/program. Source: program_revenue.csv + PnL computation.`}>
                        {fmtCurrency(breakEven.avgDirectContributionMargin)}
                      </Tip>/program direct margin
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="text-xs text-right py-2 text-muted-foreground">—</TableCell>
                    <TableCell className="text-xs text-right py-2 text-muted-foreground">
                      <Tip hint="Average direct contribution margin is zero or negative — adding programs at current pricing and direct cost structure does not reduce the deficit.">
                        avg margin ≤ 0
                      </Tip>
                    </TableCell>
                  </>
                )}
                <TableCell className="text-xs py-2 text-muted-foreground">
                  avg of {breakEven.programsWithRevenueCount} programs (all categories)
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="py-2">
                  <p className="text-xs font-medium">Increase Donations</p>
                  <p className="text-xs text-muted-foreground">GL 4000, 4050, 4150</p>
                </TableCell>
                <TableCell className="text-xs text-right py-2 font-semibold">
                  <Tip hint="Deficit ÷ unrestricted donation revenue (GL 4000 + 4050 + 4150), as a percentage increase. Uses unrestricted only — restricted donations (GL 4200) are designated for specific purposes and cannot be redirected to cover an operating deficit. Excludes GL 3xxx campaign funds — those are tracked separately below.">
                    +{fmtPct(breakEven.donationIncreasePct, 1)}
                  </Tip>
                </TableCell>
                <TableCell className="text-xs text-right py-2 text-muted-foreground">
                  on{' '}
                  <Tip hint={`Unrestricted donations only (GL 4000, 4050, 4150) = ${fmtCurrency(breakEven.unrestrictedDonationRevenue)}. Restricted donations (GL 4200) add ${fmtCurrency(breakEven.totalDonationRevenue - breakEven.unrestrictedDonationRevenue)} but are excluded from this lever — they cannot fund general operations.`}>
                    {fmtCurrency(breakEven.unrestrictedDonationRevenue)}
                  </Tip>
                </TableCell>
                <TableCell className="text-xs py-2 text-muted-foreground">
                  unrestricted donation base
                </TableCell>
              </TableRow>
              {breakEven.totalCampaignRevenue > 0 && (
                <TableRow>
                  <TableCell className="py-2">
                    <p className="text-xs font-medium">Campaign Funds</p>
                    <p className="text-xs text-muted-foreground">GL 3xxx</p>
                  </TableCell>
                  <TableCell className="text-xs text-right py-2 font-semibold">
                    <Tip hint="Deficit as a % of GL 3xxx campaign fund revenue. Shown for reference only — campaign funds are typically capital-restricted and cannot substitute for operating income.">
                      +{fmtPct(breakEven.campaignIncreasePct, 1)}
                    </Tip>
                  </TableCell>
                  <TableCell className="text-xs text-right py-2 text-muted-foreground">
                    on{' '}
                    <Tip hint="GL 3xxx credit entries. Capital and restricted campaign fund flows — typically not available for operating deficit coverage.">
                      {fmtCurrency(breakEven.totalCampaignRevenue)}
                    </Tip>
                  </TableCell>
                  <TableCell className="text-xs py-2 text-muted-foreground">
                    reference only — restricted
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}

        {!isDeficit && (
          <p className="text-xs text-emerald-600">
            Operating at a surplus — no break-even action required.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Trial Balance Card ───────────────────────────────────────────────────────

export const TrialBalanceCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
  const bs = metrics.balanceSheet;
  if (!bs) return null;

  const glNet = metrics.totalRevenue - metrics.totalExpenses;
  const trialSurplusColor = bs.trialNetIncome >= 0 ? 'text-emerald-600' : 'text-red-600';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Balance Sheet Snapshot</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Net income reconciliation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            label="Trial Revenue"
            value={fmtCurrency(bs.trialRevenue)}
            sub="all Xero accounts"
            hint="Sum of credit balances across revenue account classes in the trial balance export (all Xero accounts for the period)."
          />
          <SummaryCard
            label="Trial Expenses"
            value={fmtCurrency(bs.trialExpenses)}
            sub="all Xero accounts"
            hint="Sum of debit balances across expense account classes in the trial balance export."
          />
          <SummaryCard
            label="Net Income"
            value={fmtCurrency(bs.trialNetIncome)}
            valueClass={trialSurplusColor}
            sub="trial balance"
            hint="Trial Revenue minus Trial Expenses. Should match GL net if both are exported for Jan 1–Dec 31 of the same year."
          />
          {bs.depreciation > 0 && (
            <SummaryCard
              label="Depreciation"
              value={fmtCurrency(bs.depreciation)}
              sub="GL 6130 — included above"
              hint="GL 6130 balance from the trial balance. Non-cash; included in Trial Expenses above. Not visible in cash-basis GL exports."
            />
          )}
        </div>

        {/* GL vs trial balance check */}
        {Math.abs(glNet - bs.trialNetIncome) > 100 && (
          <div className="rounded border border-amber-200 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs space-y-1">
            <p className="font-medium text-amber-800 dark:text-amber-300">GL vs trial balance gap</p>
            <p className="text-amber-700 dark:text-amber-400">
              GL transaction net: <strong>{fmtCurrency(glNet)}</strong> vs trial balance net:{' '}
              <strong>{fmtCurrency(bs.trialNetIncome)}</strong> ({fmtCurrency(Math.abs(glNet - bs.trialNetIncome))} difference).
            </p>
            <p className="text-amber-700 dark:text-amber-400">
              First verify the trial balance was exported for exactly Jan&nbsp;1&ndash;Dec&nbsp;31,&nbsp;{metrics.year}
              using &ldquo;Trial Balance by Date Range&rdquo; in Xero (not the year-to-date view, which
              accumulates from the start of the organisation). If the date range is correct, the
              remaining gap is typically non-cash items (depreciation does not appear in cash-basis
              exports), account class mismatches in the Xero chart of accounts, or GL codes outside
              the expense category map.
            </p>
          </div>
        )}

        {/* Balance sheet highlights */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Item</TableHead>
              <TableHead className="text-xs text-right">Amount</TableHead>
              <TableHead className="text-xs text-muted-foreground">Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bs.cashAndBanks > 0 && (
              <TableRow>
                <TableCell className="text-xs font-medium py-1.5">Cash & Bank Accounts</TableCell>
                <TableCell className="text-xs text-right py-1.5">
                  <Tip hint="GL accounts 1000–1009: Cash and bank account balances from the trial balance.">
                    {fmtCurrency(bs.cashAndBanks)}
                  </Tip>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground py-1.5">1000–1009</TableCell>
              </TableRow>
            )}
            {bs.investmentAccount > 0 && (
              <TableRow>
                <TableCell className="text-xs font-medium py-1.5">Investment Account (Schwab)</TableCell>
                <TableCell className="text-xs text-right py-1.5">
                  <Tip hint="GL account 1005: Investment account balance (Schwab). Market value as of trial balance date.">
                    {fmtCurrency(bs.investmentAccount)}
                  </Tip>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground py-1.5">1005</TableCell>
              </TableRow>
            )}
            {bs.programDeposits > 0 && (
              <TableRow>
                <TableCell className="text-xs font-medium py-1.5">Program Deposits (deferred revenue)</TableCell>
                <TableCell className="text-xs text-right py-1.5 text-amber-700">
                  <Tip hint="GL account 2010: Program deposits received but not yet earned. A liability — future obligation to deliver programs.">
                    {fmtCurrency(bs.programDeposits)}
                  </Tip>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground py-1.5">2010 — liability, not yet earned</TableCell>
              </TableRow>
            )}
            {bs.mortgage > 0 && (
              <TableRow>
                <TableCell className="text-xs font-medium py-1.5">Mortgage Loan</TableCell>
                <TableCell className="text-xs text-right py-1.5">
                  <Tip hint="GL account 2500: Outstanding mortgage loan principal.">
                    {fmtCurrency(bs.mortgage)}
                  </Tip>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground py-1.5">2500</TableCell>
              </TableRow>
            )}
            {bs.sbaLoan > 0 && (
              <TableRow>
                <TableCell className="text-xs font-medium py-1.5">SBA Loan</TableCell>
                <TableCell className="text-xs text-right py-1.5">
                  <Tip hint="GL account 2501: Outstanding SBA loan principal.">
                    {fmtCurrency(bs.sbaLoan)}
                  </Tip>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground py-1.5">2501</TableCell>
              </TableRow>
            )}
            {bs.retainedEarnings > 0 && (
              <TableRow>
                <TableCell className="text-xs font-medium py-1.5">Retained Earnings</TableCell>
                <TableCell className="text-xs text-right py-1.5">
                  <Tip hint="GL account 3000: Cumulative retained earnings from all prior periods.">
                    {fmtCurrency(bs.retainedEarnings)}
                  </Tip>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground py-1.5">3000 — cumulative</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

      </CardContent>
    </Card>
  );
};

// ─── Donation Breakdown Card ──────────────────────────────────────────────────

export const DonationBreakdownCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
  const db = metrics.donationBreakdown;
  if (!db) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Donation Fund Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            label="Total Pledged"
            value={fmtCurrency(db.totalPledged)}
            hint="Sum of total_amount across all donation records in donations.csv."
          />
          <SummaryCard
            label="Total Paid"
            value={fmtCurrency(db.totalPaid)}
            hint="Sum of total_paid across all donation records in donations.csv."
          />
          <SummaryCard
            label="Payment Rate"
            value={fmtPct(db.paymentRate)}
            valueClass={db.paymentRate >= 0.95 ? 'text-emerald-600' : 'text-amber-600'}
            hint="Total Paid ÷ Total Pledged. Amber if < 95%."
          />
          <div className="rounded border px-3 py-2 space-y-1">
            <p className="text-xs text-muted-foreground">Donor split</p>
            <div className="flex justify-between text-xs">
              <Tip hint="Count of active monthly/recurring donation records. Classified by DONATION_TYPE field.">{db.monthlyCount.toLocaleString()} monthly</Tip>
              <Tip hint="Paid ÷ Pledged for monthly/recurring donations only." className="text-muted-foreground">
                {db.monthlyPledged > 0 ? fmtPct(db.monthlyPaid / db.monthlyPledged, 0) : '—'}
              </Tip>
            </div>
            <div className="flex justify-between text-xs">
              <Tip hint="Count of active one-time donation records. Classified by DONATION_TYPE field.">{db.oneTimeCount.toLocaleString()} one-time</Tip>
              <Tip hint="Paid ÷ Pledged for one-time donations only." className="text-muted-foreground">
                {db.oneTimePledged > 0 ? fmtPct(db.oneTimePaid / db.oneTimePledged, 0) : '—'}
              </Tip>
            </div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Fund</TableHead>
              <TableHead className="text-xs text-right">Pledged</TableHead>
              <TableHead className="text-xs text-right">Paid</TableHead>
              <TableHead className="text-xs text-right">Rate</TableHead>
              <TableHead className="text-xs text-right">Txns</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {db.funds.slice(0, 15).map((f, i) => (
              <TableRow key={i}>
                <TableCell className="text-xs py-1.5 max-w-52 truncate" title={f.fundName}>{f.fundName}</TableCell>
                <TableCell className="text-xs text-right py-1.5 text-muted-foreground">{fmtCurrency(f.totalPledged)}</TableCell>
                <TableCell className="text-xs text-right py-1.5">{fmtCurrency(f.totalPaid)}</TableCell>
                <TableCell className="text-xs text-right py-1.5">
                  {f.totalPledged > 0
                    ? <span className={f.totalPaid / f.totalPledged >= 0.95 ? 'text-emerald-600' : 'text-amber-600'}>
                        <Tip hint="fund.totalPaid ÷ fund.totalPledged.">{fmtPct(f.totalPaid / f.totalPledged, 0)}</Tip>
                      </span>
                    : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-xs text-right py-1.5 text-muted-foreground">{f.transactionCount}</TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t-2">
              <TableCell className="text-xs font-semibold py-2">Total</TableCell>
              <TableCell className="text-xs font-semibold text-right py-2">{fmtCurrency(db.totalPledged)}</TableCell>
              <TableCell className="text-xs font-semibold text-right py-2">{fmtCurrency(db.totalPaid)}</TableCell>
              <TableCell className="text-xs font-semibold text-right py-2">{fmtPct(db.paymentRate)}</TableCell>
              <TableCell className="text-xs text-right py-2 text-muted-foreground">
                {(db.monthlyCount + db.oneTimeCount).toLocaleString()}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {(db.cancelledCount > 0 || db.voidCount > 0) && (
          <p className="text-xs text-muted-foreground px-1">
            {db.cancelledCount} cancelled and {db.voidCount} voided records excluded from totals above.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// ─── AR Metrics Card ──────────────────────────────────────────────────────────

export const ArMetricsCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
  const ar = metrics.arMetrics;
  if (!ar) return null;

  const collectionColor = ar.collectionRate >= 0.9 ? 'text-emerald-600'
    : ar.collectionRate >= 0.7 ? 'text-amber-600'
    : 'text-red-600';

  return (
    <Card className={ar.collectionRate < 0.5 ? 'border-amber-300' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          Accounts Receivable
          {ar.collectionRate < 0.9 && (
            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">
              {ar.collectionRate < 0.7 ? 'very low collection rate' : 'low collection rate'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            label="Total Outstanding"
            value={fmtCurrency(ar.totalOutstanding)}
            valueClass="text-red-600"
            hint="Sum of the outstanding field for all participant records. Source: all_registrations.csv (if loaded), otherwise outstanding_ar.csv."
          />
          <SummaryCard
            label="Total Charged"
            value={fmtCurrency(ar.totalCharged)}
            hint="Sum of total_charged across all participant records. Source: all_registrations.csv (if loaded), otherwise outstanding_ar.csv."
          />
          <SummaryCard
            label="Total Paid"
            value={fmtCurrency(ar.totalPaid)}
            hint="Sum of total_paid across all participant records. Source: all_registrations.csv (if loaded), otherwise outstanding_ar.csv."
          />
          <SummaryCard
            label="Collection Rate"
            value={fmtPct(ar.collectionRate)}
            valueClass={collectionColor}
            sub={<Tip hint="Count of participants where outstanding > 0.">{ar.debtorCount} participants with balance</Tip>}
            hint="Total Paid ÷ Total Charged. Green ≥ 90%, amber 70–90%, red < 70%. Note: if All Registrations includes future programs or active payment-plan participants, unpaid balances for those programs inflate outstanding and depress this rate — the balance is not yet due, not delinquent."
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Outstanding balances include registrations for future programs where payment is not yet due.
          Review the top debtors list below to distinguish genuinely delinquent accounts from future-due balances.
        </p>
        {ar.staffExcludedCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {ar.staffExcludedCount} {ar.staffExcludedCount === 1 ? 'registration' : 'registrations'} excluded
            because the participant matched a staff salary entry.
          </p>
        )}

        {ar.topDebtors.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Participant</TableHead>
                <TableHead className="text-xs">Program</TableHead>
                <TableHead className="text-xs text-right">Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ar.topDebtors.map((d, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs py-1.5 font-medium">{d.participantName}</TableCell>
                  <TableCell className="text-xs py-1.5 text-muted-foreground max-w-48 truncate" title={d.programName}>
                    {d.programName}
                  </TableCell>
                  <TableCell className="text-xs text-right py-1.5 text-red-600">{fmtCurrency(d.outstanding)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Discount Summary Card ────────────────────────────────────────────────────

export const DiscountSummaryCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
  const ds = metrics.discountSummary;
  if (!ds) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Program Discounts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            label="Gross Billed"
            value={fmtCurrency(ds.totalAmount)}
            sub="Omnis total_amount"
            hint="Sum of total_amount from programTransactions.csv before discounts."
          />
          <SummaryCard
            label="Total Discounts"
            value={fmtCurrency(ds.totalDiscount)}
            valueClass="text-amber-600"
            hint="Sum of discount_amount from programTransactions.csv."
          />
          <SummaryCard
            label="Net Revenue"
            value={fmtCurrency(ds.netRevenue)}
            sub="after discounts"
            hint="Gross Billed minus Total Discounts."
          />
          <SummaryCard
            label="Discount Rate"
            value={fmtPct(ds.discountRate)}
            valueClass={ds.discountRate > 0.05 ? 'text-amber-600' : 'text-muted-foreground'}
            sub="of gross billed"
            hint="Total Discounts ÷ Gross Billed. Amber if > 5%."
          />
        </div>
        {ds.byCategory.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs text-right">Gross</TableHead>
                <TableHead className="text-xs text-right">Discounts</TableHead>
                <TableHead className="text-xs text-right">Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ds.byCategory.map((c, i) => (
                <TableRow key={i}>
                  <TableCell className="py-1.5">
                    <p className="text-xs font-medium">{c.label}</p>
                    <p className="text-xs text-muted-foreground">{c.categoryCode}</p>
                  </TableCell>
                  <TableCell className="text-xs text-right py-1.5">{fmtCurrency(c.totalAmount)}</TableCell>
                  <TableCell className="text-xs text-right py-1.5 text-amber-600">{fmtCurrency(c.totalDiscount)}</TableCell>
                  <TableCell className="text-xs text-right py-1.5 text-muted-foreground">
                    <Tip hint="category.totalDiscount ÷ category.totalAmount.">{fmtPct(c.discountRate)}</Tip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Recurring Donor Card ─────────────────────────────────────────────────────

export const RecurringDonorCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
  const rd = metrics.recurringDonorSummary;
  if (!rd) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Recurring Donor Base</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            label="Active Donors"
            value={rd.donorCount.toLocaleString()}
            hint="Count of unique donors in donations.csv."
          />
          <SummaryCard
            label="Total Paid"
            value={fmtCurrency(rd.totalPaid)}
            sub="year to date"
            hint="Sum of payments received from recurring donors in the year. Source: donations.csv."
          />
          <SummaryCard
            label="Avg Payments"
            value={rd.avgPaymentsPerDonor.toFixed(1)}
            sub="payments per donor"
            hint="Total payment events ÷ donorCount."
          />
          <SummaryCard
            label="Avg Amount"
            value={fmtCurrency(rd.avgAmountPerDonor)}
            sub="per donor"
            hint="Total Paid ÷ donorCount."
          />
        </div>
        {rd.topDonors.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Donor</TableHead>
                <TableHead className="text-xs text-right">Payments</TableHead>
                <TableHead className="text-xs text-right">Total Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rd.topDonors.map((d, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs py-1.5 font-medium">{d.donorName}</TableCell>
                  <TableCell className="text-xs text-right py-1.5 text-muted-foreground">{d.payments}</TableCell>
                  <TableCell className="text-xs text-right py-1.5">{fmtCurrency(d.totalPaid)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Financial Summary Card ───────────────────────────────────────────────────

export const FinancialSummaryCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
  const deficit = metrics.deficit;
  const deficitLabel = deficit > 0 ? 'Deficit' : 'Surplus';
  const deficitColor = deficit > 0 ? 'text-red-600' : 'text-emerald-600';

  return (
    <>
      {metrics.dataGaps.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 space-y-1">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Data gaps</p>
          {metrics.dataGaps.map((gap, i) => (
            <p key={i} className="text-xs text-amber-700 dark:text-amber-400">{gap}</p>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          label="Total Revenue"
          value={fmtCurrency(metrics.totalRevenue)}
          sub="Xero cash collected"
          hint="Sum of all GL 4xxx and 3xxx credit entries (minus debits) for the year. Formula: Σ(credit − debit) where credit > debit. Source: gl_transactions.csv."
        />
        <SummaryCard
          label="Total Expenses"
          value={fmtCurrency(metrics.totalExpenses)}
          hint="Sum of all GL 5xxx and 6xxx debit entries minus credits. Formula: Σ(debit − credit). Credits represent vendor refunds and adjustments. Source: gl_transactions.csv."
        />
        <SummaryCard
          label={deficitLabel}
          value={fmtCurrency(Math.abs(deficit))}
          valueClass={deficitColor}
          hint="Total Expenses minus Total Revenue. Positive = deficit (costs exceed income). Negative = surplus. Cash-basis: non-cash items like depreciation (GL 6130) are excluded from Total Expenses, so the true accrual deficit is larger if depreciation is material."
        />
        <SummaryCard
          label="Cost Per Day"
          value={fmtCurrency(metrics.costPerDay)}
          sub="blended avg"
          hint="Total Expenses ÷ (Retreat + Resident participant-days). Fully-loaded average across all paying populations. Staff and volunteer days are excluded from the denominator — their costs are real and included in the numerator, correctly showing the full cost burden borne by revenue-generating participants."
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
        <SummaryCard
          label="Cost/Day — Retreat"
          value={fmtCurrency(metrics.costPerDayRetreat)}
          sub={`${metrics.retreatDays.toLocaleString()} retreat days`}
          hint="Total Expenses ÷ Retreat participant-days only. Answers: if the center ran only retreat programs and no residents, what would each guest-night cost? Higher than the blended figure because the same total expenses are spread over fewer days."
        />
        <SummaryCard
          label="Cost/Day — Resident"
          value={fmtCurrency(metrics.costPerDayResident)}
          sub={`${metrics.residentDays.toLocaleString()} resident days`}
          hint="Total Expenses ÷ Residency Program participant-days only. Answers: if the center housed only long-term residents and ran no programs, what would each resident-night cost? Useful for evaluating whether residency revenue covers its proportional share of overhead."
        />
        {metrics.staffVolunteerDays > 0 && (
          <SummaryCard
            label="Cost/Day — Staff"
            value={fmtCurrency(metrics.costPerDayStaff)}
            sub={`${metrics.staffVolunteerDays.toLocaleString()} staff+vol days`}
            valueClass="text-red-600"
            hint="-(Total Expenses ÷ Residential staff + volunteer person-days). Negative because staff and volunteers generate no direct revenue — each person-day represents a net cost burden to the organization. Shows what the center costs to sustain per operational workforce day, assuming no programs or residents."
          />
        )}
        <SummaryCard
          label="Marginal Cost/Day"
          value={fmtCurrency(metrics.marginalCostPerDay)}
          sub="variable costs only"
          hint="(Food + Teacher compensation + Scholarships + Variable utilities) ÷ Total participant-days. The incremental cost of hosting one additional participant-night — fixed overhead (payroll, insurance, facilities, admin) is excluded as it does not change with volume. Use this as the floor for incremental pricing decisions."
        />
      </div>
    </>
  );
};

// ─── Expense Categories Card ──────────────────────────────────────────────────

export const ExpenseCategoriesCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm">Expense Categories</CardTitle>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Category</TableHead>
            <TableHead className="text-xs text-right">
              <Tip hint="Σ(debit − credit) for all GL transactions in this category's account range. Credits (refunds, vendor adjustments) are subtracted.">Total</Tip>
            </TableHead>
            <TableHead className="text-xs text-right">
              <Tip hint="Category total ÷ Total Participant-Days.">/Day</Tip>
            </TableHead>
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
              <Tip hint="Σ(debit − credit) for all GL transactions across all expense account ranges.">
                {fmtCurrency(metrics.totalExpenses)}
              </Tip>
            </TableCell>
            <TableCell className="text-xs text-right py-2 text-muted-foreground">
              <Tip hint="Total Expenses ÷ Total Participant-Days. The average organizational cost to host one participant for one day across all programs.">
                {fmtCurrency(metrics.costPerDay)}
              </Tip>
            </TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);

// ─── Capacity Card ────────────────────────────────────────────────────────────

export const CapacityCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
    <SummaryCard
      label="Private Rooms"
      value={String(metrics.totalRooms)}
      sub="Premium, Standard, Double, Accessibility"
      hint="Count of private rooms (Premium, Standard, Double, Accessibility) in roomInventory.csv. Dorm beds, tent cabins, and shrine/campground spaces are not counted here."
    />
    <SummaryCard
      label="Staff Rooms"
      value={String(metrics.staffRooms)}
      sub="of private rooms, occupied by staff"
      hint="Private rooms with a name in the 'Occupied by Staff' column. Residential staff and residents use private rooms only."
    />
    <SummaryCard
      label="Available Rooms"
      value={String(metrics.availableRooms)}
      sub="private rooms, guest-accessible"
      hint="Private Rooms minus Staff Rooms. The pool of private rooms available to guests. Verify that all on-site occupants — including year-round volunteers — are marked as 'Occupied by Staff' in the room inventory CSV. Un-marked volunteer rooms inflate this count and REVPAR."
    />
    <SummaryCard
      label="Dorm Beds"
      value={String(metrics.dormBeds)}
      sub="shared dorm spaces (not private rooms)"
      hint="Count of individual dorm bed entries in roomInventory.csv (Room Type = 'Dorm'). These are shared spaces, not private rooms, and are not included in the room counts above."
    />
    <SummaryCard
      label="Opportunity Cost"
      value={fmtCurrency(metrics.opportunityCostAnnual)}
      sub={
        <Tip hint="Average nightly rack rate of staff-occupied private rooms, used as a proxy for staff room value.">
          {fmtCurrency(metrics.avgStaffRoomRate)}/night avg
        </Tip>
      }
      hint="Staff Rooms × avgStaffRoomRate × 365. Uses single-occupancy rack rates (priceSingle). Note: double rooms at shared occupancy (priceShared × 2) would yield higher revenue per night — single-occupancy is a conservative, not maximum, estimate. Actual foregone revenue would be lower still (typical retreat center occupancy ~60–80%)."
    />
    <SummaryCard
      label="REVPAR"
      value={fmtCurrency(metrics.revpar)}
      sub="room+program rev / avail rooms / 365"
      hint="(Program Revenue + Residency Revenue) ÷ availableRooms ÷ 365. Revenue per available private room per night. Note: includes program tuition, which is non-standard for hospitality REVPAR — interpret as a blended occupancy efficiency metric. Also note: CABN (cabin retreat) revenue is included in the numerator but CABN participants stay in tent cabins, not the private rooms counted in the denominator — this inflates REVPAR proportionally to CABN share of program revenue. Also: residency participants who occupy long-term private rooms may be counted as 'staff rooms' in the room inventory, which would exclude their rooms from availableRooms while including their revenue in the numerator."
    />
  </div>
);

// ─── Payroll Card ─────────────────────────────────────────────────────────────

export const PayrollCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
  if (metrics.csvPayrollAnnualized <= 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Payroll Reconciliation</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <SummaryCard
          label="CSV Annualized"
          value={fmtCurrency(metrics.csvPayrollAnnualized)}
          sub="from salaries.csv"
          hint="Sum of annual_salary from staffSalaries.csv for all staff. Represents the full-year cost if every staff member stayed the entire year."
        />
        <SummaryCard
          label="Xero Actual"
          value={fmtCurrency(metrics.xeroPayrollActual)}
          sub="GL 6105+6110+6114+6116"
          hint="Σ(debit − credit) for GL 6105 (salaries) + GL 6110 (payroll taxes) + GL 6114 (health) + GL 6116 (retirement) from gl_transactions.csv."
        />
        <SummaryCard
          label="Gap"
          value={fmtCurrency(Math.abs(metrics.payrollGap))}
          sub={metrics.payrollGap >= 0 ? 'CSV > Xero (partial-year staff)' : 'Xero > CSV (benefits not in CSV)'}
          hint="|CSV Annualized − Xero Actual|. Xero includes GL 6110 (employer payroll taxes ~7.65%), GL 6114 (health insurance), and GL 6116 (retirement contributions) — these add 20–30% above base salary and are NOT included in the salaries.csv annual_salary column. A negative gap (Xero > CSV) is expected and primarily reflects this structural difference. A positive gap (CSV > Xero) suggests partial-year staff, unfilled positions, or salaries.csv not fully up to date."
        />
        <div className="rounded border px-3 py-2 space-y-1">
          <p className="text-xs text-muted-foreground">Staff type</p>
          <p className="text-xs">
            <Tip hint="Staff whose last name appears in the residential roster (residential_roster.csv). Classification is by last-name cross-reference, not a field in salaries.csv.">
              {metrics.residentialStaffCount} residential
            </Tip>
          </p>
          <p className="text-xs">
            <Tip hint="Staff in salaries.csv whose last name does not match any entry in the residential roster. Includes commuters and any staff not captured in the roster export.">
              {metrics.nonResidentialStaffCount} non-residential
            </Tip>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { KclComputedMetrics } from '@/lib/kclTypes';
import { fmtCurrency, fmtPct, fmtMonth } from '@/lib/kclCompute';
import { MONTH_NAMES } from '@/lib/kclTypes';

// ─── Tip helper ───────────────────────────────────────────────────────────────

const Tip: React.FC<{ hint: string; children: React.ReactNode }> = ({ hint, children }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="border-b border-dashed border-current cursor-help">{children}</span>
    </TooltipTrigger>
    <TooltipContent className="max-w-80 text-xs leading-relaxed whitespace-pre-wrap">{hint}</TooltipContent>
  </Tooltip>
);

// ─── Small summary card ───────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  value: string;
  sub?: React.ReactNode;
  valueClass?: string;
  hint?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, sub, valueClass, hint }) => (
  <div className="rounded border px-3 py-2.5 space-y-0.5">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={`text-sm font-semibold ${valueClass ?? ''}`}>
      {hint ? <Tip hint={hint}>{value}</Tip> : value}
    </p>
    {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
  </div>
);

// ─── Main panel ───────────────────────────────────────────────────────────────

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
          sub="per participant-day"
          hint="Total Expenses ÷ Total Participant-Days. The average organizational cost to host one participant for one day across all programs."
        />
      </div>

      {/* Revenue streams */}
      <RevenueStreamsCard metrics={metrics} />

      {/* Monthly overview */}
      <MonthlyOverviewCard metrics={metrics} />

      {/* Participation */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <SummaryCard
          label="Participant-Days"
          value={metrics.participantDays.toLocaleString()}
          sub={`strict ${metrics.year} filter`}
          hint="Σ(program_end − program_start) × estimated_participants for all programs in program_catalog.csv whose start and end dates fall strictly within the year. Programs spanning year boundaries are excluded."
        />
        <SummaryCard
          label="Programs"
          value={String(metrics.programCount)}
          sub="with participant-days > 0"
          hint="Count of programs in program_catalog.csv with participant-days > 0 and dates within the year."
        />
        <SummaryCard
          label="Omnis Billed"
          value={fmtCurrency(metrics.omnisBilledTotal)}
          sub="GL 4xxx charges"
          hint="Sum of amount_charged in program_revenue.csv, filtered to GL 4xxx account codes only."
        />
      </div>

      {/* Program categories */}
      {metrics.programCategories.length > 0 && (
        <ProgramCategoriesCard metrics={metrics} />
      )}

      {/* Top programs */}
      {metrics.topPrograms.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Programs by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Program</TableHead>
                  <TableHead className="text-xs">Cat</TableHead>
                  <TableHead className="text-xs text-right">
                    <Tip hint="Omnis program_revenue.csv amount_charged total for this program (GL 4xxx codes).">Revenue</Tip>
                  </TableHead>
                  <TableHead className="text-xs text-right">
                    <Tip hint="Tuition line-item total from program_revenue.csv for this program.">Tuition</Tip>
                  </TableHead>
                  <TableHead className="text-xs text-right">
                    <Tip hint="Registration count from program_catalog.csv.">Regs</Tip>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.topPrograms.slice(0, 15).map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs py-1.5 max-w-48 truncate">{p.name}</TableCell>
                    <TableCell className="text-xs py-1.5 text-muted-foreground">{p.categoryCode}</TableCell>
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

      {/* Expense categories */}
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

      {/* Occupancy */}
      {metrics.occupancy && (
        <OccupancyCard metrics={metrics} />
      )}

      {/* Volunteer labor valuation */}
      {metrics.volunteerMetrics && (
        <VolunteerLaborCard metrics={metrics} />
      )}

      {/* Utilities detail */}
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

      {/* Capacity & opportunity cost */}
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

      {/* Payroll */}
      {metrics.csvPayrollAnnualized > 0 && (
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
      )}

      {/* CC fees */}
      <CcFeeCard metrics={metrics} />

      {/* Balance sheet snapshot */}
      {metrics.balanceSheet && (
        <TrialBalanceCard metrics={metrics} />
      )}

      {/* Discount analysis from program transactions */}
      {metrics.discountSummary && (
        <DiscountSummaryCard metrics={metrics} />
      )}

      {/* Donation fund breakdown */}
      {metrics.donationBreakdown && (
        <DonationBreakdownCard metrics={metrics} />
      )}

      {/* Recurring donor base (cash received) */}
      {metrics.recurringDonorSummary && (
        <RecurringDonorCard metrics={metrics} />
      )}

      {/* Program billing (charges billed) */}
      {metrics.programBillingSummary && (
        <ProgramBillingCard metrics={metrics} />
      )}

      {/* Accounts receivable health */}
      {metrics.arMetrics && (
        <ArMetricsCard metrics={metrics} />
      )}

      {/* Room type occupancy */}
      {metrics.roomTypeOccupancy && (
        <RoomTypeOccupancyCard metrics={metrics} />
      )}

      {/* Break-even analysis */}
      <BreakEvenCard metrics={metrics} />

      {/* Per-program contribution margin */}
      {metrics.programPnL.length > 0 && (
        <ProgramPnLCard metrics={metrics} />
      )}

    </div>
  );
};

// ─── Revenue Streams Card ─────────────────────────────────────────────────────

const RevenueStreamsCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
  const { revenueStreams, totalRevenue, omnisBilledTotal, revenueGapAmount } = metrics;
  const pct = (n: number) => totalRevenue > 0 ? fmtPct(n / totalRevenue) : '—';

  const rows = [
    { label: 'Regular Programs',     sub: 'GL 4300, 4310, 4510', value: revenueStreams.programs,              hint: 'GL 4300 + 4310 + 4510 credit entries. Program tuition and retreat registrations.' },
    { label: 'Residency',            sub: 'GL 4500, 4520',        value: revenueStreams.residency,             hint: 'GL 4500 + 4520 credit entries. Annual residency program tuition.' },
    { label: 'Donations (unrestr.)', sub: 'GL 4000, 4050, 4150',  value: revenueStreams.donationsUnrestricted, hint: 'GL 4000 + 4050 + 4150 credit entries. Unrestricted general donations.' },
    { label: 'Donations (restr.)',   sub: 'GL 4200',              value: revenueStreams.donationsRestricted,   hint: 'GL 4200 credit entries. Restricted-purpose donations.' },
    { label: 'Campaign Funds',       sub: 'GL 3xxx',              value: revenueStreams.campaigns,             hint: 'GL 3xxx credit entries. Designated campaign fund credits.' },
    { label: 'Other Income',         sub: 'remaining GL 4xxx',    value: revenueStreams.other,                 hint: 'Remaining GL 4xxx not matched by the named streams above.' },
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

const MonthlyOverviewCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
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

// ─── Program Categories Card ──────────────────────────────────────────────────

// Tent cabins operate year-round
const CABIN_ANNUAL_DAYS = 365;

const ProgramCategoriesCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
  const cabnCat = metrics.programCategories.find(c => c.categoryCode === 'CABN');
  const cabnOmnisBilled = cabnCat?.totalRevenue ?? 0;
  const otherIncome = metrics.revenueStreams.other;
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Programs by Category</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Category</TableHead>
              <TableHead className="text-xs text-right">
                <Tip hint="Number of programs in this category with dates within the year.">Count</Tip>
              </TableHead>
              <TableHead className="text-xs text-right">
                <Tip hint="Σ(duration_days × estimated_participants) for programs in this category. Source: program_catalog.csv.">Part-Days</Tip>
              </TableHead>
              <TableHead className="text-xs text-right">
                <Tip hint="Σ(end_date − start_date) for all programs in this category.">Duration Days</Tip>
              </TableHead>
              <TableHead className="text-xs text-right">
                <Tip hint="CABN only: participant-days ÷ (cabin count × 365 days). Actual occupancy rate — retreatant-nights filled vs. total capacity. Amber if < 50%.">Utilization</Tip>
              </TableHead>
              <TableHead className="text-xs text-right">
                <Tip hint="Sum of amount_charged from program_revenue.csv for this category (GL 4xxx codes only).">Revenue</Tip>
              </TableHead>
              <TableHead className="text-xs text-right">
                <Tip hint="Revenue ÷ Count for this category.">Avg/Program</Tip>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.programCategories.map(cat => {
              const isCabn = cat.categoryCode === 'CABN';
              const utilizationDenom = isCabn && metrics.cabinRoomCount > 0
                ? metrics.cabinRoomCount * CABIN_ANNUAL_DAYS
                : 0;
              const utilizationPct = utilizationDenom > 0
                ? cat.participantDays / utilizationDenom
                : null;
              const isExpanded = expandedCategory === cat.categoryCode;
              const catPrograms = metrics.programPnL.filter(p => p.categoryCode === cat.categoryCode);

              return (
                <React.Fragment key={cat.categoryCode}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedCategory(isExpanded ? null : cat.categoryCode)}
                  >
                    <TableCell className="py-2">
                      <p className="text-xs font-medium">{cat.label}</p>
                      <p className="text-xs text-muted-foreground">{cat.categoryCode}</p>
                    </TableCell>
                    <TableCell className="text-xs text-right py-2">{cat.count}</TableCell>
                    <TableCell className="text-xs text-right py-2">
                      {cat.participantDays > 0 ? cat.participantDays.toLocaleString() : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-right py-2">
                      {cat.totalDurationDays > 0 ? cat.totalDurationDays.toLocaleString() : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-right py-2">
                      {utilizationPct !== null
                        ? <span className={utilizationPct < 0.5 ? 'text-amber-600' : 'text-emerald-600'}>
                            <Tip hint={`CABN participant-days ÷ (${metrics.cabinRoomCount} cabins × ${CABIN_ANNUAL_DAYS} days). Actual occupancy rate. Amber if < 50%.`}>
                              {fmtPct(utilizationPct, 0)}
                            </Tip>
                          </span>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-xs text-right py-2">{fmtCurrency(cat.totalRevenue)}</TableCell>
                    <TableCell className="text-xs text-right py-2 text-muted-foreground">
                      {cat.avgRevenuePerProgram > 0 ? fmtCurrency(cat.avgRevenuePerProgram) : <span>—</span>}
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={7} className="p-0 bg-muted/20">
                        <div className="px-4 py-2">
                          {catPrograms.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-1">No revenue data for this category.</p>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs">Program</TableHead>
                                  <TableHead className="text-xs text-right">Dates</TableHead>
                                  <TableHead className="text-xs text-right">Part-Days</TableHead>
                                  <TableHead className="text-xs text-right">Revenue</TableHead>
                                  <TableHead className="text-xs text-right">Margin</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {catPrograms
                                  .sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''))
                                  .map((p, i) => (
                                    <TableRow key={i}>
                                      <TableCell className="text-xs py-1 max-w-56 truncate" title={p.name}>{p.name}</TableCell>
                                      <TableCell className="text-xs text-right py-1 text-muted-foreground whitespace-nowrap">
                                        {p.startDate} – {p.endDate}
                                      </TableCell>
                                      <TableCell className="text-xs text-right py-1 text-muted-foreground">
                                        {p.participantDays > 0 ? p.participantDays.toLocaleString() : '—'}
                                      </TableCell>
                                      <TableCell className="text-xs text-right py-1">{fmtCurrency(p.revenue)}</TableCell>
                                      <TableCell className={`text-xs text-right py-1 ${p.contributionMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {p.revenue > 0 ? fmtPct(p.marginPct, 0) : '—'}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>

        {/* CABN revenue discrepancy note */}
        {cabnOmnisBilled > 0 && (
          <div className="rounded border border-amber-200 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs space-y-1">
            <p className="font-medium text-amber-800 dark:text-amber-300">CABN revenue note</p>
            <p className="text-amber-700 dark:text-amber-400">
              Omnis program_revenue.sql filters to GL 4xxx charges — cabin retreat revenue here ({fmtCurrency(cabnOmnisBilled)}) reflects only those GL codes.
              Xero may record CABN accommodation charges under additional GL codes.
              {otherIncome > 0 && (
                <> The <strong>{fmtCurrency(otherIncome)}</strong> in Xero &ldquo;Other Income&rdquo; (remaining GL 4xxx not in named streams) may include CABN charges not captured in Omnis.</>
              )}
            </p>
            <p className="text-amber-700 dark:text-amber-400">
              Utilization = CABN participant-days / ({metrics.cabinRoomCount} cabins &times; {CABIN_ANNUAL_DAYS} days). Actual cabin occupancy rate — retreatant-nights filled relative to total cabin capacity.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Occupancy Card ───────────────────────────────────────────────────────────

const OccupancyCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
  const { occupancy, availableRooms } = metrics;
  if (!occupancy) return null;

  const tracks: Array<{ key: 'staff' | 'volunteers' | 'residency'; label: string; avg: number }> = [
    { key: 'staff',      label: 'Staff',      avg: occupancy.avgMonthlyByTrack.staff },
    { key: 'volunteers', label: 'Volunteers',  avg: occupancy.avgMonthlyByTrack.volunteers },
    { key: 'residency',  label: 'Residency',   avg: occupancy.avgMonthlyByTrack.residency },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Residential Population — By Track</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Days and monthly counts computed from actual arrival/departure dates in Omnis (not the SQL-precomputed column).
          A person counts in a month if their stay overlaps any day of that month.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            label="Avg Staff/Month"
            value={occupancy.avgMonthlyByTrack.staff.toFixed(1)}
            sub="residential employees"
            hint="Count of residential staff (program name contains neither 'volunteer' nor 'residency program') present in at least one day of each month, averaged across 12 months. Computed from arrival/departure dates in residentialRoster.csv."
          />
          <SummaryCard
            label="Avg Volunteers/Month"
            value={occupancy.avgMonthlyByTrack.volunteers.toFixed(1)}
            sub="room & board, no pay"
            hint="Count of volunteers (program name contains 'volunteer') present in at least one day of each month, averaged across 12 months. Computed from arrival/departure dates."
          />
          <SummaryCard
            label="Avg Residency/Month"
            value={occupancy.avgMonthlyByTrack.residency.toFixed(1)}
            sub="paying program residents"
            hint="Count of residency participants (program name contains 'residency program') present in at least one day of each month, averaged across 12 months."
          />
          <SummaryCard
            label="Residency FTE"
            value={String(occupancy.impliedResidents)}
            sub="rev ÷ $21K/yr (FTE)"
            hint="Residency GL revenue (4500 + 4520) ÷ $21,000 (= $1,750/month × 12). Result is full-time equivalents — not headcount: 3 residents each staying 6 months = 1.5 FTE. Cross-check only — not a primary figure."
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-16">Track</TableHead>
              {Array.from({ length: 12 }, (_, i) => (
                <TableHead key={i} className="text-xs text-center px-1">{MONTH_NAMES[i + 1]}</TableHead>
              ))}
              <TableHead className="text-xs text-right">Avg</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tracks.map(({ key, label, avg }) => (
              <TableRow key={key}>
                <TableCell className="text-xs py-1.5 font-medium">{label}</TableCell>
                {Array.from({ length: 12 }, (_, i) => {
                  const count = occupancy.monthlyByTrack[i + 1]?.[key] ?? 0;
                  return (
                    <TableCell key={i} className="text-xs text-center px-1 py-1.5">
                      {count > 0
                        ? <Tip hint={`Number of ${label.toLowerCase()} people whose [arrival, departure) date range overlaps any day in ${MONTH_NAMES[i + 1]}. A person departing on the 1st does NOT count for that month (exclusive of departure day).`}>{count}</Tip>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  );
                })}
                <TableCell className="text-xs text-right py-1.5 text-muted-foreground">
                  <Tip hint="Average of the 12 monthly counts for this track (zero months included).">{avg.toFixed(1)}</Tip>
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t font-medium">
              <TableCell className="text-xs py-1.5">Total</TableCell>
              {Array.from({ length: 12 }, (_, i) => {
                const count = occupancy.monthlyResidents[i + 1] ?? 0;
                return (
                  <TableCell key={i} className="text-xs text-center px-1 py-1.5">
                    {count > 0 ? count : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                );
              })}
              <TableCell className="text-xs text-right py-1.5 text-muted-foreground">
                <Tip hint="Average across 12 months of all-track on-site count.">{occupancy.avgMonthlyResidents.toFixed(1)}</Tip>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <p className="text-xs text-muted-foreground">
          Available private (non-staff) rooms: {availableRooms}.
          Total on-site person-days (all tracks):{' '}
          <strong>
            <Tip hint="Σ clampedDays(arrival, departure, year) for all roster entries across all tracks. Each person contributes min(departure, Jan 1 of next year) − max(arrival, Jan 1) days; departure day is excluded.">
              {occupancy.totalResidentDays.toLocaleString()}
            </Tip>
          </strong>.
        </p>
      </CardContent>
    </Card>
  );
};

// ─── Break-Even Card ──────────────────────────────────────────────────────────

const BreakEvenCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
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

// ─── Per-Program Contribution Margin Card ─────────────────────────────────────

const ProgramPnLCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
  const { programPnL } = metrics;
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);

  const totals = programPnL.reduce(
    (acc, p) => ({
      revenue: acc.revenue + p.revenue,
      direct:  acc.direct  + p.costs.teacherCost + p.costs.foodCost + p.costs.ccFees + p.costs.scholarshipCost + p.costs.utilityMarginal,
      overhead: acc.overhead + p.costs.overheadAlloc,
      margin:  acc.margin  + p.contributionMargin,
    }),
    { revenue: 0, direct: 0, overhead: 0, margin: 0 },
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Per-Program Contribution Margin</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">

        {/* Methodology note */}
        <div className="rounded border border-muted px-3 py-2 text-xs text-muted-foreground space-y-1">
          <p><strong>Direct costs</strong> — teacher compensation (GL 5250/5300/5350, first-claim by date window ±7/+3 days), marginal kitchen food (GL 5200 above baseline × participant-days), CC fees (rate × program revenue), scholarships (COGS-SCH/COGS-PC, rate × program revenue), marginal utility (above-baseline GL 6270/6250 for program dates). Teacher window caveat: payments made more than 7 days before a program (e.g. advance contracts signed months prior) fall into overhead rather than the program's direct cost.</p>
          <p><strong>Overhead</strong> — payroll, insurance, repairs, facilities, admin, fixed utility, and staff-baseline food, allocated proportionally by participant-days. The food baseline (avg of 3 lowest-spend months × 365) stays in overhead alongside fixed utility — both are always-on costs independent of program load. Cabin retreats (CABN) carry no food cost — self-catering. Teacher costs not attributed to CABN or IHR programs.</p>
          <p><strong>Scholarship attribution note</strong> — Scholarship/credit costs (COGS-SCH, COGS-PC) are attributed as a revenue-proportional rate across all programs rather than to specific programs, because the GL export does not link COGS entries to individual program IDs. This is a proxy; the actual distribution of scholarships by program may differ.</p>
          <p><strong>IHR food caveat</strong> — IHR includes both year-round residency participants (whose food is largely in the overhead baseline) and short-stay solitary retreatants (who do cause marginal kitchen cost). The marginal food rate is applied uniformly to all IHR participant-days, which may overstate food cost for year-round residency tracks.</p>
          <p><strong>Overhead allocation note</strong> — The overhead rate uses all program-catalog participant-days as the denominator. Programs appearing in the catalog but excluded from this PnL (zero revenue and zero registrations) absorb some overhead in the rate but have no allocated row here. If such programs have significant participant-days, the sum of overhead shown below may be less than the actual overhead pool.</p>
          <p><strong>Day-count conventions</strong> — Participant-days (from program_catalog.sql) use SQL DATEDIFF semantics: departure day is exclusive (number of nights). Utility marginal overlap uses inclusive day counts (both arrival and departure day), which may add 1 day of marginal utility per program. The difference is small relative to program-level utility spend.</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Program</TableHead>
              <TableHead className="text-xs text-center">Cat</TableHead>
              <TableHead className="text-xs text-right">
                <Tip hint="Omnis program_revenue.csv amount_charged total for this program.">Revenue</Tip>
              </TableHead>
              <TableHead className="text-xs text-right">
                <Tip hint="teacherCost + foodCost + ccFees + utilityMarginal for this program.">Direct</Tip>
              </TableHead>
              <TableHead className="text-xs text-right">
                <Tip hint="Proportional share of payroll, insurance, repairs, facilities, admin, fixed utility, and staff-baseline food. Allocated by participant-days: (program part-days ÷ total part-days) × overhead pool.">Overhead</Tip>
              </TableHead>
              <TableHead className="text-xs text-right">
                <Tip hint="Revenue minus Direct minus Overhead.">Margin</Tip>
              </TableHead>
              <TableHead className="text-xs text-right">
                <Tip hint="Margin ÷ Revenue.">%</Tip>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {programPnL.map((p, i) => {
              const direct = p.costs.teacherCost + p.costs.foodCost + p.costs.ccFees + p.costs.scholarshipCost + p.costs.utilityMarginal;
              const pos    = p.contributionMargin >= 0;
              const rowKey = p.programId || String(i);
              const isExpanded = expandedProgram === rowKey;
              const participants = p.participants ?? [];
              return (
                <React.Fragment key={i}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedProgram(isExpanded ? null : rowKey)}
                  >
                    <TableCell className="text-xs py-1 max-w-44 truncate" title={p.name}>{p.name}</TableCell>
                    <TableCell className="text-xs py-1 text-center text-muted-foreground">{p.categoryCode}</TableCell>
                    <TableCell className="text-xs text-right py-1">{fmtCurrency(p.revenue)}</TableCell>
                    <TableCell className="text-xs text-right py-1 text-muted-foreground">{fmtCurrency(direct)}</TableCell>
                    <TableCell className="text-xs text-right py-1 text-muted-foreground">{fmtCurrency(p.costs.overheadAlloc)}</TableCell>
                    <TableCell className={`text-xs text-right py-1 font-medium ${pos ? 'text-emerald-600' : 'text-red-600'}`}>
                      {fmtCurrency(p.contributionMargin)}
                    </TableCell>
                    <TableCell className={`text-xs text-right py-1 ${pos ? 'text-emerald-600' : 'text-red-600'}`}>
                      {p.revenue > 0 ? fmtPct(p.marginPct, 0) : '—'}
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={7} className="p-0 bg-muted/20">
                        <div className="px-4 py-2 space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">
                            {p.name} — {p.startDate} to {p.endDate} — {p.durationDays} days — {p.registrations} registrations
                          </p>
                          {participants.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-1">
                              No participant records for this program. Load All Registrations for the complete list, or Outstanding AR for unpaid balances only.
                            </p>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs">Participant</TableHead>
                                  <TableHead className="text-xs text-right">Charged</TableHead>
                                  <TableHead className="text-xs text-right">Paid</TableHead>
                                  <TableHead className="text-xs text-right">Outstanding</TableHead>
                                  <TableHead className="text-xs text-right">Arrival</TableHead>
                                  <TableHead className="text-xs text-right">Departure</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {participants.map((pt, j) => (
                                  <TableRow key={j}>
                                    <TableCell className="text-xs py-1 font-medium">{pt.participantName}</TableCell>
                                    <TableCell className="text-xs text-right py-1">{fmtCurrency(pt.totalCharged)}</TableCell>
                                    <TableCell className="text-xs text-right py-1 text-emerald-600">{fmtCurrency(pt.totalPaid)}</TableCell>
                                    <TableCell className={`text-xs text-right py-1 ${pt.outstanding > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                                      {pt.outstanding > 0 ? fmtCurrency(pt.outstanding) : '—'}
                                    </TableCell>
                                    <TableCell className="text-xs text-right py-1 text-muted-foreground">{pt.arrivalDate}</TableCell>
                                    <TableCell className="text-xs text-right py-1 text-muted-foreground">{pt.departureDate}</TableCell>
                                  </TableRow>
                                ))}
                                <TableRow className="border-t font-medium">
                                  <TableCell className="text-xs py-1">Total ({participants.length})</TableCell>
                                  <TableCell className="text-xs text-right py-1">{fmtCurrency(participants.reduce((s, pt) => s + pt.totalCharged, 0))}</TableCell>
                                  <TableCell className="text-xs text-right py-1 text-emerald-600">{fmtCurrency(participants.reduce((s, pt) => s + pt.totalPaid, 0))}</TableCell>
                                  <TableCell className="text-xs text-right py-1 text-red-600">
                                    {fmtCurrency(participants.reduce((s, pt) => s + pt.outstanding, 0))}
                                  </TableCell>
                                  <TableCell colSpan={2} />
                                </TableRow>
                              </TableBody>
                            </Table>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}

            {/* Cost breakdown rows for totals */}
            <TableRow className="border-t-2">
              <TableCell className="text-xs font-semibold py-2" colSpan={2}>
                Total ({programPnL.length} programs)
              </TableCell>
              <TableCell className="text-xs font-semibold text-right py-2">{fmtCurrency(totals.revenue)}</TableCell>
              <TableCell className="text-xs font-semibold text-right py-2">{fmtCurrency(totals.direct)}</TableCell>
              <TableCell className="text-xs font-semibold text-right py-2">{fmtCurrency(totals.overhead)}</TableCell>
              <TableCell className={`text-xs font-semibold text-right py-2 ${totals.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {fmtCurrency(totals.margin)}
              </TableCell>
              <TableCell className={`text-xs font-semibold text-right py-2 ${totals.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                <Tip hint="Margin ÷ Revenue.">
                  {totals.revenue > 0 ? fmtPct(totals.margin / totals.revenue, 0) : '—'}
                </Tip>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {/* Cost component detail for the totals */}
        <div className="rounded border px-3 py-2 text-xs space-y-1">
          <p className="font-medium text-muted-foreground">Attributed cost components (all programs)</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
            <div>
              <p className="text-muted-foreground">Teacher</p>
              <p className="font-medium">
                <Tip hint="GL 5250/5300/5350 transactions within each program's date window. First-claim: earliest program by start date claims each transaction; no double-counting.">
                  {fmtCurrency(programPnL.reduce((s, p) => s + p.costs.teacherCost, 0))}
                </Tip>
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Food (marginal)</p>
              <p className="font-medium">
                <Tip hint="Above-baseline GL 5200 (food) spend allocated by participant-days. Baseline = average daily rate of the 3 lowest-spend months × 365. Marginal total ÷ non-CABN participant-days = per-day rate; multiplied by each program's participant-days. CABN excluded (self-catering).">
                  {fmtCurrency(programPnL.reduce((s, p) => s + p.costs.foodCost, 0))}
                </Tip>
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">CC Fees</p>
              <p className="font-medium">
                <Tip hint="ccFeeRate × each program's revenue. Effective processing rate applied uniformly across all programs.">
                  {fmtCurrency(programPnL.reduce((s, p) => s + p.costs.ccFees, 0))}
                </Tip>
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Scholarships</p>
              <p className="font-medium">
                <Tip hint="COGS-SCH + COGS-PC GL total attributed as a revenue-proportional rate × each program's revenue. Proxy attribution — the GL does not link scholarship credits to individual program IDs.">
                  {fmtCurrency(programPnL.reduce((s, p) => s + p.costs.scholarshipCost, 0))}
                </Tip>
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Utility (marginal)</p>
              <p className="font-medium">
                <Tip hint="Above-baseline utility cost for the program's date window. Per day: max(0, month_spend ÷ month_days − baseline_spend ÷ baseline_month_days) × overlap_days, summed across all months the program spans.">
                  {fmtCurrency(programPnL.reduce((s, p) => s + p.costs.utilityMarginal, 0))}
                </Tip>
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Overhead</p>
              <p className="font-medium">
                <Tip hint="All non-direct costs (payroll, insurance, repairs, admin, fixed utility, staff-baseline food) × (program participant-days ÷ total participant-days).">
                  {fmtCurrency(programPnL.reduce((s, p) => s + p.costs.overheadAlloc, 0))}
                </Tip>
              </p>
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};

// ─── Trial Balance Card ───────────────────────────────────────────────────────

const TrialBalanceCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
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

const DonationBreakdownCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
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
            <p className="text-xs">
              <Tip hint="Classified by pledge_type field in donations.csv.">{db.monthlyCount.toLocaleString()} monthly</Tip>
            </p>
            <p className="text-xs">
              <Tip hint="Classified by pledge_type field in donations.csv.">{db.oneTimeCount.toLocaleString()} one-time</Tip>
            </p>
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

const ArMetricsCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
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

// ─── CC Fee Benchmark Card ────────────────────────────────────────────────────

const CcFeeCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
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

// ─── Volunteer Labor Card ─────────────────────────────────────────────────────

const VolunteerLaborCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
  const vm = metrics.volunteerMetrics;
  if (!vm) return null;

  const totalResidents = vm.staffCount + vm.volunteerCount + vm.residencyCount;
  const totalDays = vm.staffDays + vm.volunteerDays + vm.residencyDays;
  const [expandedTrack, setExpandedTrack] = useState<'staff' | 'volunteers' | 'residency' | null>(null);

  const trackRows: Array<{
    key: 'staff' | 'volunteers' | 'residency';
    label: string;
    subLabel: string;
    count: number;
    days: number;
  }> = [
    { key: 'staff',      label: 'Residential Staff',        subLabel: 'salaried employees living on-site', count: vm.staffCount,     days: vm.staffDays },
    { key: 'volunteers', label: 'Volunteers',               subLabel: 'uncosted labor — room & board',     count: vm.volunteerCount, days: vm.volunteerDays },
    { key: 'residency',  label: 'Residency Participants',   subLabel: 'paying program residents',          count: vm.residencyCount, days: vm.residencyDays },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Residential Population Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Days computed from arrival/departure dates (exclusive of departure day).
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Track</TableHead>
              <TableHead className="text-xs text-right">
                <Tip hint="Count of unique individuals in this track from residentialRoster.csv.">People</Tip>
              </TableHead>
              <TableHead className="text-xs text-right">
                <Tip hint="Σ clampedDays(arrival, departure, year) for all people in this track. Departure day excluded.">Person-Days</Tip>
              </TableHead>
              <TableHead className="text-xs text-right">
                <Tip hint="Person-Days ÷ People count for this track.">Avg Days</Tip>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trackRows.map(({ key, label, subLabel, count, days }) => {
              const isExpanded = expandedTrack === key;
              const people = vm.rosterByTrack?.[key] ?? [];
              return (
                <React.Fragment key={key}>
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedTrack(isExpanded ? null : key)}
                  >
                    <TableCell className="py-2">
                      <p className="text-xs font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{subLabel}</p>
                    </TableCell>
                    <TableCell className="text-xs text-right py-2">{count}</TableCell>
                    <TableCell className="text-xs text-right py-2">{days.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-right py-2 text-muted-foreground">
                      {count > 0 ? Math.round(days / count) : '—'}
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={4} className="p-0 bg-muted/20">
                        <div className="px-4 py-2">
                          {people.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-1">No roster data available.</p>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs">Name</TableHead>
                                  <TableHead className="text-xs text-right">Arrival</TableHead>
                                  <TableHead className="text-xs text-right">Departure</TableHead>
                                  <TableHead className="text-xs text-right">Days</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {people.map((person, i) => (
                                  <TableRow key={i}>
                                    <TableCell className="text-xs py-1 font-medium">{person.name}</TableCell>
                                    <TableCell className="text-xs text-right py-1 text-muted-foreground">{person.arrivalDate}</TableCell>
                                    <TableCell className="text-xs text-right py-1 text-muted-foreground">{person.departureDate}</TableCell>
                                    <TableCell className="text-xs text-right py-1">{person.days}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
            <TableRow className="border-t-2">
              <TableCell className="text-xs font-semibold py-2">Total</TableCell>
              <TableCell className="text-xs font-semibold text-right py-2">{totalResidents}</TableCell>
              <TableCell className="text-xs font-semibold text-right py-2">{totalDays.toLocaleString()}</TableCell>
              <TableCell className="text-xs text-right py-2 text-muted-foreground">
                {totalResidents > 0 ? Math.round(totalDays / totalResidents) : '—'}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {vm.volunteerDays > 0 && (
          <div className="rounded border border-muted px-3 py-2 text-xs space-y-1">
            <p className="font-medium text-muted-foreground">Volunteer labor estimate</p>
            <div className="flex justify-between pt-0.5">
              <span className="text-muted-foreground">
                <Tip hint="Volunteer-days × $150/day estimated value (Vermont minimum wage × 8 hrs plus housing and food offset). This in-kind contribution is NOT included in any GL total.">
                  {vm.volunteerDays} volunteer-days × {fmtCurrency(vm.laborValuePerDay)}/day
                </Tip>
              </span>
              <span className="font-semibold">
                <Tip hint="Total estimated in-kind volunteer labor value for the year. Not reflected in the GL or any expense/revenue totals.">
                  {fmtCurrency(vm.estimatedLaborValue)}
                </Tip>
              </span>
            </div>
            <p className="text-muted-foreground">
              Estimated in-kind contribution not reflected in the GL. Rate based on Vermont minimum
              wage equivalent for general labor. Not included in any expense or revenue totals.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Discount Summary Card ────────────────────────────────────────────────────

const DiscountSummaryCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
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

const RecurringDonorCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
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

// ─── Program Billing Card ──────────────────────────────────────────────────────

const ProgramBillingCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
  const pb = metrics.programBillingSummary;
  if (!pb) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Program Billing</CardTitle>
        <CardDescription className="text-xs">
          Charges billed via Omnis — includes all registered participants regardless of payment status.
          Pair with Recurring Donors (cash received) for the full billing-to-cash picture.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            label="Unique Participants"
            value={pb.personCount.toLocaleString()}
            hint="Count of distinct people charged for a strict-year program. Source: program_billing.csv."
          />
          <SummaryCard
            label="Total Billed"
            value={fmtCurrency(pb.totalCharged)}
            sub="Omnis charges"
            hint="Sum of total_charged_2025 across all participants. This is what Omnis billed, not what was received in cash."
          />
          <SummaryCard
            label="Avg per Person"
            value={fmtCurrency(pb.avgChargePerPerson)}
            hint="Total Billed ÷ Unique Participants."
          />
          <SummaryCard
            label="Avg Registrations"
            value={pb.avgRegistrationsPerPerson.toFixed(1)}
            sub="per person"
            hint="Average number of program registrations per participant for the year."
          />
        </div>
        {pb.topBilled.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Participant</TableHead>
                <TableHead className="text-xs text-right">Registrations</TableHead>
                <TableHead className="text-xs text-right">Total Billed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pb.topBilled.map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs py-1.5 font-medium">{e.participantName}</TableCell>
                  <TableCell className="text-xs text-right py-1.5 text-muted-foreground">{e.registrations}</TableCell>
                  <TableCell className="text-xs text-right py-1.5">{fmtCurrency(e.totalCharged)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Room Type Occupancy Card ─────────────────────────────────────────────────

const RoomTypeOccupancyCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
  const ro = metrics.roomTypeOccupancy;
  if (!ro) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Room Bookings by Type</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard
            label="Total Bookings"
            value={ro.totalBookings.toLocaleString()}
            hint="Count of booking records in roomBookings.csv."
          />
          <SummaryCard
            label="Total Nights"
            value={ro.totalNights.toLocaleString()}
            hint="Σ(checkout_date − checkin_date) across all bookings."
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Room Type</TableHead>
              <TableHead className="text-xs text-right">
                <Tip hint="Number of booking records for this room type.">Bookings</Tip>
              </TableHead>
              <TableHead className="text-xs text-right">
                <Tip hint="Sum of stay duration (checkout − checkin) for this room type.">Total Nights</Tip>
              </TableHead>
              <TableHead className="text-xs text-right">
                <Tip hint="Total Nights ÷ Bookings for this room type.">Avg Stay</Tip>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ro.byType.map((t, i) => (
              <TableRow key={i}>
                <TableCell className="text-xs py-1.5 font-medium">{t.roomTypeDesc}</TableCell>
                <TableCell className="text-xs text-right py-1.5 text-muted-foreground">{t.bookings}</TableCell>
                <TableCell className="text-xs text-right py-1.5">{t.totalNights.toLocaleString()}</TableCell>
                <TableCell className="text-xs text-right py-1.5 text-muted-foreground">{t.avgNights.toFixed(1)} nights</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ComputedMetricsPanel;

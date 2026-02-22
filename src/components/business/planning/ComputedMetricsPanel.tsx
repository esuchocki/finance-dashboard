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
import { MONTH_NAMES } from '@/lib/kclTypes';

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

      {/* Revenue streams */}
      <RevenueStreamsCard metrics={metrics} />

      {/* Monthly overview */}
      <MonthlyOverviewCard metrics={metrics} />

      {/* Participation */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <SummaryCard label="Participant-Days" value={metrics.participantDays.toLocaleString()} sub={`strict ${metrics.year} filter`} />
        <SummaryCard label="Programs" value={String(metrics.programCount)} sub="with participant-days > 0" />
        <SummaryCard label="Omnis Billed" value={fmtCurrency(metrics.omnisBilledTotal)} sub="GL 4xxx charges" />
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
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Program</TableHead>
                  <TableHead className="text-xs">Cat</TableHead>
                  <TableHead className="text-xs text-right">Revenue</TableHead>
                  <TableHead className="text-xs text-right">Tuition</TableHead>
                  <TableHead className="text-xs text-right">Regs</TableHead>
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <SummaryCard label="Total Rooms" value={String(metrics.totalRooms)} />
        <SummaryCard label="Staff Rooms" value={String(metrics.staffRooms)} sub="removed from guest inventory" />
        <SummaryCard label="Available Rooms" value={String(metrics.availableRooms)} sub="guest-accessible" />
        <SummaryCard
          label="Opportunity Cost"
          value={fmtCurrency(metrics.opportunityCostAnnual)}
          sub={`${fmtCurrency(metrics.avgStaffRoomRate)}/night avg`}
        />
        <SummaryCard
          label="REVPAR"
          value={fmtCurrency(metrics.revpar)}
          sub="room+program rev / avail rooms / 365"
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

      {/* Recurring donor base */}
      {metrics.recurringDonorSummary && (
        <RecurringDonorCard metrics={metrics} />
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
    { label: 'Regular Programs',     sub: 'GL 4300, 4310, 4510', value: revenueStreams.programs },
    { label: 'Residency',            sub: 'GL 4500, 4520',        value: revenueStreams.residency },
    { label: 'Donations (unrestr.)', sub: 'GL 4000, 4050',        value: revenueStreams.donationsUnrestricted },
    { label: 'Donations (restr.)',   sub: 'GL 4200',              value: revenueStreams.donationsRestricted },
    { label: 'Campaign Funds',       sub: 'GL 3xxx',              value: revenueStreams.campaigns },
    { label: 'Other Income',         sub: 'remaining GL 4xxx',    value: revenueStreams.other },
  ].filter(r => r.value > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Revenue by Stream</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Stream</TableHead>
              <TableHead className="text-xs text-right">Amount</TableHead>
              <TableHead className="text-xs text-right">% of Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="py-2">
                  <p className="text-xs font-medium">{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.sub}</p>
                </TableCell>
                <TableCell className="text-xs text-right py-2">{fmtCurrency(r.value)}</TableCell>
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
          <div className="mx-4 mb-3 mt-2 rounded border border-muted px-3 py-2 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Omnis billed (GL 4xxx charges)</span>
              <span className="font-medium">{fmtCurrency(omnisBilledTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gap (Xero minus Omnis)</span>
              <span className="font-medium">{fmtCurrency(revenueGapAmount)}</span>
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
      <CardContent className="space-y-2 p-0">
        <p className="text-xs text-muted-foreground px-4 pt-3 pb-1">
          MJ% = share of revenue recognized via Omnis Manual Journal batch postings (period-closing).
          High values are normal for months when many programs close. Amber = &gt;80%.
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs w-10">Mo.</TableHead>
              <TableHead className="text-xs text-right">Programs</TableHead>
              <TableHead className="text-xs text-right">Residency</TableHead>
              <TableHead className="text-xs text-right">Donations</TableHead>
              <TableHead className="text-xs text-right">Total Rev</TableHead>
              <TableHead className="text-xs text-right">Expenses</TableHead>
              <TableHead className="text-xs text-right">Net</TableHead>
              <TableHead className="text-xs text-right">MJ%</TableHead>
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
                    {net >= 0 ? '+' : ''}{fmtCurrency(net)}
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

// Tent cabins are summer-only: Jun (30) + Jul (31) + Aug (31) = 92 days
const CABIN_SUMMER_DAYS = 92;

const ProgramCategoriesCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
  const cabnCat = metrics.programCategories.find(c => c.categoryCode === 'CABN');
  const cabnOmnisBilled = cabnCat?.totalRevenue ?? 0;
  const otherIncome = metrics.revenueStreams.other;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Programs by Category</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Category</TableHead>
              <TableHead className="text-xs text-right">Count</TableHead>
              <TableHead className="text-xs text-right">Part-Days</TableHead>
              <TableHead className="text-xs text-right">Duration Days</TableHead>
              <TableHead className="text-xs text-right">Utilization</TableHead>
              <TableHead className="text-xs text-right">Revenue</TableHead>
              <TableHead className="text-xs text-right">Avg/Program</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.programCategories.map(cat => {
              const isCabn = cat.categoryCode === 'CABN';
              // Cabin utilization: total program duration / (num cabins × summer days)
              const utilizationDenom = isCabn && metrics.cabinRoomCount > 0
                ? metrics.cabinRoomCount * CABIN_SUMMER_DAYS
                : 0;
              const utilizationPct = utilizationDenom > 0
                ? cat.totalDurationDays / utilizationDenom
                : null;

              return (
                <TableRow key={cat.categoryCode}>
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
                      ? <span className={utilizationPct < 0.5 ? 'text-amber-600' : 'text-emerald-600'}>{fmtPct(utilizationPct, 0)}</span>
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-xs text-right py-2">{fmtCurrency(cat.totalRevenue)}</TableCell>
                  <TableCell className="text-xs text-right py-2 text-muted-foreground">
                    {cat.avgRevenuePerProgram > 0 ? fmtCurrency(cat.avgRevenuePerProgram) : <span>—</span>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* CABN revenue discrepancy note */}
        {cabnOmnisBilled > 0 && (
          <div className="mx-4 mb-3 rounded border border-amber-200 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs space-y-1">
            <p className="font-medium text-amber-800 dark:text-amber-300">CABN revenue note</p>
            <p className="text-amber-700 dark:text-amber-400">
              Omnis program_revenue.sql filters to GL 4xxx charges — cabin retreat revenue here ({fmtCurrency(cabnOmnisBilled)}) reflects only those GL codes.
              Xero may record CABN accommodation charges under additional GL codes.
              {otherIncome > 0 && (
                <> The <strong>{fmtCurrency(otherIncome)}</strong> in Xero &ldquo;Other Income&rdquo; (remaining GL 4xxx not in named streams) may include CABN charges not captured in Omnis.</>
              )}
            </p>
            <p className="text-amber-700 dark:text-amber-400">
              Utilization = total CABN program duration days / ({metrics.cabinRoomCount} cabins &times; {CABIN_SUMMER_DAYS} summer days). Summer-only (Jun–Aug).
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
          />
          <SummaryCard
            label="Avg Volunteers/Month"
            value={occupancy.avgMonthlyByTrack.volunteers.toFixed(1)}
            sub="room & board, no pay"
          />
          <SummaryCard
            label="Avg Residency/Month"
            value={occupancy.avgMonthlyByTrack.residency.toFixed(1)}
            sub="paying program residents"
          />
          <SummaryCard
            label="Implied Residents"
            value={String(occupancy.impliedResidents)}
            sub="residency rev / $21K"
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
                      {count > 0 ? count : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  );
                })}
                <TableCell className="text-xs text-right py-1.5 text-muted-foreground">{avg.toFixed(1)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t font-medium">
              <TableCell className="text-xs py-1.5">Total</TableCell>
              {Array.from({ length: 12 }, (_, i) => {
                const count = occupancy.monthlyResidents[i + 1] ?? 0;
                const pct = availableRooms > 0 ? count / availableRooms : 0;
                return (
                  <TableCell key={i} className="text-xs text-center px-1 py-1.5">
                    {count > 0 ? (
                      <div>
                        <div>{count}</div>
                        <div className="text-muted-foreground">{fmtPct(pct, 0)}</div>
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                );
              })}
              <TableCell className="text-xs text-right py-1.5 text-muted-foreground">
                {occupancy.avgMonthlyResidents.toFixed(1)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <p className="text-xs text-muted-foreground">
          Occ% = total on-site / {availableRooms} available (non-staff) rooms.
          Total on-site person-days (all tracks): <strong>{occupancy.totalResidentDays.toLocaleString()}</strong>.
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
            {fmtCurrency(Math.abs(breakEven.deficit))}
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
                  +{breakEven.residentsNeeded}
                </TableCell>
                <TableCell className="text-xs text-right py-2 text-muted-foreground">
                  {fmtCurrency(breakEven.residencyRevenuePerResident)}/yr
                </TableCell>
                <TableCell className="text-xs py-2 text-muted-foreground">
                  at ${(breakEven.residencyRevenuePerResident / 12).toLocaleString()}/mo avg
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="py-2">
                  <p className="text-xs font-medium">Add Programs</p>
                  <p className="text-xs text-muted-foreground">GL 4300, 4310, 4510</p>
                </TableCell>
                <TableCell className="text-xs text-right py-2 font-semibold">
                  +{breakEven.programsNeeded}
                </TableCell>
                <TableCell className="text-xs text-right py-2 text-muted-foreground">
                  {fmtCurrency(breakEven.avgProgramRevenue)}/program
                </TableCell>
                <TableCell className="text-xs py-2 text-muted-foreground">
                  avg of {metrics.programCount} programs this year
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="py-2">
                  <p className="text-xs font-medium">Increase Donations</p>
                  <p className="text-xs text-muted-foreground">GL 3xxx, 4000, 4050, 4200</p>
                </TableCell>
                <TableCell className="text-xs text-right py-2 font-semibold">
                  +{fmtPct(breakEven.donationIncreasePct, 1)}
                </TableCell>
                <TableCell className="text-xs text-right py-2 text-muted-foreground">
                  on {fmtCurrency(breakEven.totalDonationRevenue)}
                </TableCell>
                <TableCell className="text-xs py-2 text-muted-foreground">
                  current donation base
                </TableCell>
              </TableRow>
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

  const totals = programPnL.reduce(
    (acc, p) => ({
      revenue: acc.revenue + p.revenue,
      direct:  acc.direct  + p.costs.teacherCost + p.costs.foodCost + p.costs.ccFees + p.costs.utilityMarginal,
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
          <p><strong>Direct costs</strong> — teacher compensation (GL 5250/5300/5350, first-claim by date window), marginal kitchen food (GL 5200 above staff baseline × participant-days), CC fees (rate × revenue), marginal utility (above-baseline GL 6270/6250 for program dates).</p>
          <p><strong>Overhead</strong> — proportional share of payroll, insurance, repairs, facilities, admin, and fixed utility allocated by participant-days. Cabin retreats (CABN) carry no food cost — self-catering. Teacher costs not attributed to CABN or IHR programs.</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Program</TableHead>
              <TableHead className="text-xs text-center">Cat</TableHead>
              <TableHead className="text-xs text-right">Revenue</TableHead>
              <TableHead className="text-xs text-right">Direct</TableHead>
              <TableHead className="text-xs text-right">Overhead</TableHead>
              <TableHead className="text-xs text-right">Margin</TableHead>
              <TableHead className="text-xs text-right">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {programPnL.map((p, i) => {
              const direct = p.costs.teacherCost + p.costs.foodCost + p.costs.ccFees + p.costs.utilityMarginal;
              const pos    = p.contributionMargin >= 0;
              return (
                <TableRow key={i}>
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
                {totals.revenue > 0 ? fmtPct(totals.margin / totals.revenue, 0) : '—'}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {/* Cost component detail for the totals */}
        <div className="rounded border px-3 py-2 text-xs space-y-1">
          <p className="font-medium text-muted-foreground">Attributed cost components (all programs)</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-1">
            <div>
              <p className="text-muted-foreground">Teacher</p>
              <p className="font-medium">{fmtCurrency(programPnL.reduce((s, p) => s + p.costs.teacherCost, 0))}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Food (marginal)</p>
              <p className="font-medium">{fmtCurrency(programPnL.reduce((s, p) => s + p.costs.foodCost, 0))}</p>
            </div>
            <div>
              <p className="text-muted-foreground">CC Fees</p>
              <p className="font-medium">{fmtCurrency(programPnL.reduce((s, p) => s + p.costs.ccFees, 0))}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Utility (marginal)</p>
              <p className="font-medium">{fmtCurrency(programPnL.reduce((s, p) => s + p.costs.utilityMarginal, 0))}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Overhead</p>
              <p className="font-medium">{fmtCurrency(programPnL.reduce((s, p) => s + p.costs.overheadAlloc, 0))}</p>
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
          />
          <SummaryCard
            label="Trial Expenses"
            value={fmtCurrency(bs.trialExpenses)}
            sub="all Xero accounts"
          />
          <SummaryCard
            label="Net Income"
            value={fmtCurrency(bs.trialNetIncome)}
            valueClass={trialSurplusColor}
            sub="trial balance"
          />
          {bs.depreciation > 0 && (
            <SummaryCard
              label="Depreciation"
              value={fmtCurrency(bs.depreciation)}
              sub="GL 6130 — included above"
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
                <TableCell className="text-xs text-right py-1.5">{fmtCurrency(bs.cashAndBanks)}</TableCell>
                <TableCell className="text-xs text-muted-foreground py-1.5">1000–1009</TableCell>
              </TableRow>
            )}
            {bs.investmentAccount > 0 && (
              <TableRow>
                <TableCell className="text-xs font-medium py-1.5">Investment Account (Schwab)</TableCell>
                <TableCell className="text-xs text-right py-1.5">{fmtCurrency(bs.investmentAccount)}</TableCell>
                <TableCell className="text-xs text-muted-foreground py-1.5">1005</TableCell>
              </TableRow>
            )}
            {bs.programDeposits > 0 && (
              <TableRow>
                <TableCell className="text-xs font-medium py-1.5">Program Deposits (deferred revenue)</TableCell>
                <TableCell className="text-xs text-right py-1.5 text-amber-700">{fmtCurrency(bs.programDeposits)}</TableCell>
                <TableCell className="text-xs text-muted-foreground py-1.5">2010 — liability, not yet earned</TableCell>
              </TableRow>
            )}
            {bs.mortgage > 0 && (
              <TableRow>
                <TableCell className="text-xs font-medium py-1.5">Mortgage Loan</TableCell>
                <TableCell className="text-xs text-right py-1.5">{fmtCurrency(bs.mortgage)}</TableCell>
                <TableCell className="text-xs text-muted-foreground py-1.5">2500</TableCell>
              </TableRow>
            )}
            {bs.sbaLoan > 0 && (
              <TableRow>
                <TableCell className="text-xs font-medium py-1.5">SBA Loan</TableCell>
                <TableCell className="text-xs text-right py-1.5">{fmtCurrency(bs.sbaLoan)}</TableCell>
                <TableCell className="text-xs text-muted-foreground py-1.5">2501</TableCell>
              </TableRow>
            )}
            {bs.retainedEarnings > 0 && (
              <TableRow>
                <TableCell className="text-xs font-medium py-1.5">Retained Earnings</TableCell>
                <TableCell className="text-xs text-right py-1.5">{fmtCurrency(bs.retainedEarnings)}</TableCell>
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
          <SummaryCard label="Total Pledged" value={fmtCurrency(db.totalPledged)} />
          <SummaryCard label="Total Paid" value={fmtCurrency(db.totalPaid)} />
          <SummaryCard
            label="Payment Rate"
            value={fmtPct(db.paymentRate)}
            valueClass={db.paymentRate >= 0.95 ? 'text-emerald-600' : 'text-amber-600'}
          />
          <div className="rounded border px-3 py-2 space-y-1">
            <p className="text-xs text-muted-foreground">Donor split</p>
            <p className="text-xs">{db.monthlyCount.toLocaleString()} monthly</p>
            <p className="text-xs">{db.oneTimeCount.toLocaleString()} one-time</p>
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
                        {fmtPct(f.totalPaid / f.totalPledged, 0)}
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

  const collectionColor = ar.collectionRate >= 0.7 ? 'text-emerald-600'
    : ar.collectionRate >= 0.4 ? 'text-amber-600'
    : 'text-red-600';

  return (
    <Card className={ar.collectionRate < 0.5 ? 'border-amber-300' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          Accounts Receivable
          {ar.collectionRate < 0.5 && (
            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">
              low collection rate
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard label="Total Outstanding" value={fmtCurrency(ar.totalOutstanding)} valueClass="text-red-600" />
          <SummaryCard label="Total Charged" value={fmtCurrency(ar.totalCharged)} />
          <SummaryCard label="Total Paid" value={fmtCurrency(ar.totalPaid)} />
          <SummaryCard
            label="Collection Rate"
            value={fmtPct(ar.collectionRate)}
            valueClass={collectionColor}
            sub={`${ar.debtorCount} participants with balance`}
          />
        </div>

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
  const excessCost = ccFeeExcessRate * metrics.totalRevenue;

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
          <SummaryCard label="Effective Rate" value={fmtPct(ccFeeRate, 2)} sub="GL 61001 / total revenue" />
          <SummaryCard label="Industry Benchmark" value={fmtPct(ccFeeBenchmarkRate, 1)} sub="typical nonprofit rate" />
          <SummaryCard label="Excess Rate" value={fmtPct(ccFeeExcessRate, 2)} sub="above benchmark" />
          <SummaryCard label="Total Fees Paid" value={fmtCurrency(ccFeeTotal)} sub="GL 61001 debits" />
        </div>
        {ccFeeAlert && excessCost > 0 && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            At the {fmtPct(ccFeeBenchmarkRate, 1)} benchmark rate, fees would be approximately{' '}
            <strong>{fmtCurrency(ccFeeTotal - excessCost)}</strong>, saving roughly{' '}
            <strong>{fmtCurrency(excessCost)}</strong> annually. Consider renegotiating processor rates
            or reviewing the GL 61001 account for non-processing charges included in this total.
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

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Residential Population Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Days computed from arrival/departure dates (exclusive of departure day).
          People and days match the Residential Population card above.
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Track</TableHead>
              <TableHead className="text-xs text-right">People</TableHead>
              <TableHead className="text-xs text-right">Person-Days</TableHead>
              <TableHead className="text-xs text-right">Avg Days</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="py-2">
                <p className="text-xs font-medium">Residential Staff</p>
                <p className="text-xs text-muted-foreground">salaried employees living on-site</p>
              </TableCell>
              <TableCell className="text-xs text-right py-2">{vm.staffCount}</TableCell>
              <TableCell className="text-xs text-right py-2">{vm.staffDays.toLocaleString()}</TableCell>
              <TableCell className="text-xs text-right py-2 text-muted-foreground">
                {vm.staffCount > 0 ? Math.round(vm.staffDays / vm.staffCount) : '—'}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="py-2">
                <p className="text-xs font-medium">Volunteers</p>
                <p className="text-xs text-muted-foreground">uncosted labor — room & board provided</p>
              </TableCell>
              <TableCell className="text-xs text-right py-2">{vm.volunteerCount}</TableCell>
              <TableCell className="text-xs text-right py-2">{vm.volunteerDays.toLocaleString()}</TableCell>
              <TableCell className="text-xs text-right py-2 text-muted-foreground">
                {vm.volunteerCount > 0 ? Math.round(vm.volunteerDays / vm.volunteerCount) : '—'}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="py-2">
                <p className="text-xs font-medium">Residency Participants</p>
                <p className="text-xs text-muted-foreground">paying program residents</p>
              </TableCell>
              <TableCell className="text-xs text-right py-2">{vm.residencyCount}</TableCell>
              <TableCell className="text-xs text-right py-2">{vm.residencyDays.toLocaleString()}</TableCell>
              <TableCell className="text-xs text-right py-2 text-muted-foreground">
                {vm.residencyCount > 0 ? Math.round(vm.residencyDays / vm.residencyCount) : '—'}
              </TableCell>
            </TableRow>
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
              <span className="text-muted-foreground">{vm.volunteerDays} volunteer-days × {fmtCurrency(vm.laborValuePerDay)}/day</span>
              <span className="font-semibold">{fmtCurrency(vm.estimatedLaborValue)}</span>
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
          <SummaryCard label="Gross Billed" value={fmtCurrency(ds.totalAmount)} sub="Omnis total_amount" />
          <SummaryCard label="Total Discounts" value={fmtCurrency(ds.totalDiscount)} valueClass="text-amber-600" />
          <SummaryCard label="Net Revenue" value={fmtCurrency(ds.netRevenue)} sub="after discounts" />
          <SummaryCard
            label="Discount Rate"
            value={fmtPct(ds.discountRate)}
            valueClass={ds.discountRate > 0.05 ? 'text-amber-600' : 'text-muted-foreground'}
            sub="of gross billed"
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
                  <TableCell className="text-xs text-right py-1.5 text-muted-foreground">{fmtPct(c.discountRate)}</TableCell>
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
          <SummaryCard label="Active Donors" value={rd.donorCount.toLocaleString()} />
          <SummaryCard label="Total Paid" value={fmtCurrency(rd.totalPaid)} sub="year to date" />
          <SummaryCard label="Avg Payments" value={rd.avgPaymentsPerDonor.toFixed(1)} sub="payments per donor" />
          <SummaryCard label="Avg Amount" value={fmtCurrency(rd.avgAmountPerDonor)} sub="per donor" />
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
          <SummaryCard label="Total Bookings" value={ro.totalBookings.toLocaleString()} />
          <SummaryCard label="Total Nights" value={ro.totalNights.toLocaleString()} />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Room Type</TableHead>
              <TableHead className="text-xs text-right">Bookings</TableHead>
              <TableHead className="text-xs text-right">Total Nights</TableHead>
              <TableHead className="text-xs text-right">Avg Stay</TableHead>
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

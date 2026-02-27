import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { KclComputedMetrics } from '@/lib/kclTypes';
import { MONTH_NAMES } from '@/lib/kclTypes';
import { fmtCurrency, fmtPct } from '@/lib/kclFormatters';
import { Tip, SummaryCard } from './kclCardUtils';

// Tent cabins operate year-round
const CABIN_ANNUAL_DAYS = 365;

// ─── Program Categories Card ──────────────────────────────────────────────────

export const ProgramCategoriesCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
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

// ─── Per-Program Contribution Margin Card ─────────────────────────────────────

export const ProgramPnLCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
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
          <p><strong>Direct costs</strong> — teacher compensation (GL 5250/5300/5350, first-claim by date window ±7/+3 days), marginal kitchen food (GL 5200 above baseline × participant-days), CC fees (rate × program revenue), scholarships (COGS-SCH/COGS-PC, rate × REG revenue only), marginal utility (proportional share of each month's above-baseline GL 6270/6250). Teacher window caveat: payments made more than 7 days before a program (e.g. advance contracts signed months prior) fall into overhead rather than the program's direct cost.</p>
          <p><strong>Overhead</strong> — payroll, insurance, repairs, facilities, admin, fixed utility, and staff-baseline food, allocated proportionally by participant-days. The food baseline (avg of 3 lowest-spend months × 365) stays in overhead alongside fixed utility — both are always-on costs independent of program load. Cabin retreats (CABN) carry no food cost — self-catering. Teacher costs and scholarship credits not attributed to CABN or IHR programs.</p>
          <p><strong>Utility allocation</strong> — Each calendar month's above-baseline utility cost is distributed among all programs running that month, proportional to their overlap days. This prevents double-counting when programs run concurrently (e.g. IHR year-round alongside REG programs). The sum of all per-program utility charges equals the total above-baseline utility for months with active programs.</p>
          <p><strong>Scholarship attribution note</strong> — Scholarship/credit costs (COGS-SCH, COGS-PC) are attributed as a rate × REG revenue, since these credits are issued to meditation program participants, not year-round residents or cabin retreatants. The GL export does not link COGS entries to individual program IDs, so within REG this remains a proportional proxy.</p>
          <p><strong>IHR food caveat</strong> — IHR includes both year-round residency participants (whose food is largely in the overhead baseline) and short-stay solitary retreatants (who do cause marginal kitchen cost). The marginal food rate is applied uniformly to all IHR participant-days, which may overstate food cost for year-round residency tracks.</p>
          <p><strong>Overhead allocation note</strong> — The overhead rate uses all program-catalog participant-days as the denominator. Programs appearing in the catalog but excluded from this PnL (zero revenue and zero registrations) absorb some overhead in the rate but have no allocated row here. If such programs have significant participant-days, the sum of overhead shown below may be less than the actual overhead pool.</p>
          <p><strong>Day-count conventions</strong> — Participant-days (from program_catalog.sql) use SQL DATEDIFF semantics: departure day is exclusive (number of nights). Utility overlap uses exclusive departure-day counting consistent with participant-days.</p>
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
                <Tip hint="teacherCost + foodCost + ccFees + scholarshipCost (REG only) + utilityMarginal for this program.">Direct</Tip>
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
                <Tip hint="COGS-SCH + COGS-PC GL total attributed as a rate × each REG program's revenue. Not applied to IHR or CABN — scholarship credits are for meditation program participants only. Proxy within REG — the GL does not link credits to individual program IDs.">
                  {fmtCurrency(programPnL.reduce((s, p) => s + p.costs.scholarshipCost, 0))}
                </Tip>
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Utility (marginal)</p>
              <p className="font-medium">
                <Tip hint="Proportional share of each month's above-baseline utility (GL 6270/6250). Each month's marginal is split among all programs running that month by overlap days, so concurrent programs share rather than each paying the full monthly amount.">
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

// ─── Occupancy Card ───────────────────────────────────────────────────────────

export const OccupancyCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
  const { occupancy, availableRooms, volunteerMetrics, year } = metrics;
  if (!occupancy) return null;

  const [selectedCell, setSelectedCell] = useState<{ track: 'staff' | 'volunteers' | 'residency'; month: number } | null>(null);

  function presentInMonth(arrival: string, departure: string, month: number): boolean {
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const monthEnd = month < 12
      ? `${year}-${String(month + 1).padStart(2, '0')}-01`
      : `${year + 1}-01-01`;
    return arrival < monthEnd && departure > monthStart;
  }

  function toggleCell(track: 'staff' | 'volunteers' | 'residency', month: number) {
    setSelectedCell(prev =>
      prev?.track === track && prev.month === month ? null : { track, month }
    );
  }

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
          A person counts in a month if their stay overlaps any day of that month. Click a count to see names.
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
            {tracks.map(({ key, label, avg }) => {
              const isOpen = selectedCell?.track === key;
              const detailMonth = isOpen ? selectedCell!.month : null;
              const detailPeople = detailMonth !== null
                ? (volunteerMetrics?.rosterByTrack?.[key] ?? []).filter(p =>
                    presentInMonth(p.arrivalDate, p.departureDate, detailMonth)
                  )
                : [];

              return (
                <React.Fragment key={key}>
                  <TableRow>
                    <TableCell className="text-xs py-1.5 font-medium">{label}</TableCell>
                    {Array.from({ length: 12 }, (_, i) => {
                      const month = i + 1;
                      const count = occupancy.monthlyByTrack[month]?.[key] ?? 0;
                      const isSelected = selectedCell?.track === key && selectedCell.month === month;
                      return (
                        <TableCell key={i} className="text-xs text-center px-1 py-1.5">
                          {count > 0 ? (
                            <button
                              onClick={() => toggleCell(key, month)}
                              className={`rounded px-1 tabular-nums hover:bg-muted transition-colors ${isSelected ? 'bg-muted font-semibold' : ''}`}
                            >
                              {count}
                            </button>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-xs text-right py-1.5 text-muted-foreground">
                      <Tip hint="Average of the 12 monthly counts for this track (zero months included).">{avg.toFixed(1)}</Tip>
                    </TableCell>
                  </TableRow>
                  {isOpen && detailMonth !== null && (
                    <TableRow>
                      <TableCell colSpan={14} className="p-0 bg-muted/20">
                        <div className="px-4 py-2">
                          <p className="text-xs font-medium mb-1">
                            {label} — {MONTH_NAMES[detailMonth]}
                            {detailPeople.length === 0 && !volunteerMetrics && (
                              <span className="text-muted-foreground font-normal ml-2">Load residential roster to see names.</span>
                            )}
                          </p>
                          {detailPeople.length > 0 ? (
                            <div className="flex flex-col gap-y-0.5">
                              {detailPeople.map((p, i) => (
                                <span key={i} className="text-xs">{p.name}</span>
                              ))}
                            </div>
                          ) : volunteerMetrics ? (
                            <p className="text-xs text-muted-foreground">No roster entries overlap this month.</p>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
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

// ─── Volunteer Labor Card ─────────────────────────────────────────────────────

export const VolunteerLaborCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
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

// ─── Participation Card ───────────────────────────────────────────────────────

export const ParticipationCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => (
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
);

// ─── Top Programs Card ────────────────────────────────────────────────────────

export const TopProgramsCard: React.FC<{ metrics: KclComputedMetrics }> = ({ metrics }) => {
  if (metrics.topPrograms.length === 0) return null;
  return (
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
  );
};

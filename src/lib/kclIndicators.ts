import type { KclAnnualDataset } from './kclTypes';
import { MONTH_NAMES } from './kclTypes';
import { fmt$, fmt$2, fmtPct, fmtN, fmtDate, mdTable } from './kclExportUtils';

// ─── Indicator helper utilities ───────────────────────────────────────────────

export function computeMedian(vals: number[]): number {
  if (vals.length === 0) return 0;
  const sorted = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// Indicator 1 — Revenue Composition by Account (trial balance)
export function indicatorRevenueByAccount(trialBalance: KclAnnualDataset['data']['trialBalance']): string {
  const revenueRows = trialBalance.filter(r => r.accountClass === 'Revenue');
  if (revenueRows.length === 0) return '';
  const total = revenueRows.reduce((s, r) => s + r.credit, 0);
  if (total === 0) return '';
  const sorted = [...revenueRows].sort((a, b) => b.credit - a.credit);
  return `### Revenue Composition by Account (Trial Balance)

${mdTable(
  ['Account Code', 'Account', 'Amount', 'Share'],
  [
    ...sorted.map(r => [r.accountCode, r.accountName, fmt$(r.credit), fmtPct(r.credit / total)]),
    ['**Total**', '', `**${fmt$(total)}**`, '**100%**'],
  ]
)}`;
}

// Indicator 2 — Revenue per Participant-Day
export function indicatorRevPerParticipantDay(
  programRevenue: KclAnnualDataset['data']['programRevenue'],
  programCatalog: KclAnnualDataset['data']['programCatalog'],
): string {
  const catalogById = new Map(programCatalog.map(p => [p.programId, p]));
  let flaggedCount = 0;

  const joined = programRevenue
    .map(p => {
      const cat = catalogById.get(p.programId);
      if (!cat || cat.isResidential || cat.participantDays <= 0 || p.participants <= 0) return null;
      const flagged = cat.activeRegistrations > 0 && cat.activeRegistrations !== p.participants;
      if (flagged) flaggedCount++;
      return {
        name: p.programName,
        categoryCode: p.categoryCode,
        totalRevenue: p.totalRevenue,
        participants: p.participants,
        totalParticipantDays: cat.participantDays,
        revPerDay: p.totalRevenue / cat.participantDays,
        revPerParticipant: p.totalRevenue / p.participants,
        avgStayLength: cat.participantDays / p.participants,
        flagged,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.revPerDay - a.revPerDay);

  if (joined.length === 0) return '';

  const trunc38 = (s: string) => s.length > 38 ? s.slice(0, 37) + '\u2026' : s;

  return `### Revenue per Participant-Day

Sorted by revenue per participant-day (highest first). ${fmtN(joined.length)} programs matched across both files.${flaggedCount > 0 ? ` **${fmtN(flaggedCount)} program(s) flagged (*)** for participant count mismatch between files.` : ''}

${mdTable(
  ['Program', 'Cat', 'Revenue', 'Participants', 'P-Days', 'Rev/P-Day', 'Rev/Participant', 'Avg Stay'],
  joined.map(p => [
    (p.flagged ? '* ' : '') + trunc38(p.name),
    p.categoryCode,
    fmt$(p.totalRevenue),
    fmtN(p.participants),
    fmtN(p.totalParticipantDays),
    fmt$2(p.revPerDay),
    fmt$2(p.revPerParticipant),
    p.avgStayLength.toFixed(1) + ' days',
  ])
)}`;
}

// Indicator 4 — Tuition / Accommodation / Other Revenue Mix
export function indicatorRevenueMix(programRevenue: KclAnnualDataset['data']['programRevenue']): string {
  const withRevenue = programRevenue.filter(p => p.totalRevenue > 0);
  if (withRevenue.length === 0) return '';

  const sumField = (arr: typeof withRevenue, f: 'tuitionRevenue' | 'accommodationRevenue' | 'otherRevenue' | 'totalRevenue') =>
    arr.reduce((s, p) => s + p[f], 0);

  const pT = sumField(withRevenue, 'totalRevenue');
  const pTu = sumField(withRevenue, 'tuitionRevenue');
  const pAc = sumField(withRevenue, 'accommodationRevenue');
  const pOt = sumField(withRevenue, 'otherRevenue');

  const catRows = ['REG', 'CABN', 'IHR'].map(c => {
    const progs = withRevenue.filter(p => p.categoryCode === c);
    if (progs.length === 0) return null;
    const t = sumField(progs, 'totalRevenue');
    return [c, fmtPct(t > 0 ? sumField(progs, 'tuitionRevenue') / t : 0), fmtPct(t > 0 ? sumField(progs, 'accommodationRevenue') / t : 0), fmtPct(t > 0 ? sumField(progs, 'otherRevenue') / t : 0), fmt$(t)];
  }).filter((r): r is string[] => r !== null);

  return `### Revenue Mix — Tuition / Accommodation / Other

**Portfolio** (${fmtN(withRevenue.length)} programs with revenue > 0): Tuition **${fmtPct(pT > 0 ? pTu / pT : 0)}** | Accommodation **${fmtPct(pT > 0 ? pAc / pT : 0)}** | Other **${fmtPct(pT > 0 ? pOt / pT : 0)}**

${mdTable(
  ['Category', 'Tuition Share', 'Accommodation Share', 'Other Share', 'Total Revenue'],
  [
    ...catRows,
    ['**Portfolio**', `**${fmtPct(pT > 0 ? pTu / pT : 0)}**`, `**${fmtPct(pT > 0 ? pAc / pT : 0)}**`, `**${fmtPct(pT > 0 ? pOt / pT : 0)}**`, `**${fmt$(pT)}**`],
  ]
)}`;
}

// Indicator 5 — Donor Concentration Index (HHI)
export function indicatorDonorConcentration(recurringDonors: KclAnnualDataset['data']['recurringDonors']): string {
  const D = recurringDonors.filter(d => d.totalPaid > 0);
  if (D.length === 0) return '';
  const T = D.reduce((s, d) => s + d.totalPaid, 0);
  const sorted = [...D].sort((a, b) => b.totalPaid - a.totalPaid);

  const topKRows = [1, 5, 10, 20, 50]
    .filter(k => k <= sorted.length)
    .map(k => {
      const topAmt = sorted.slice(0, k).reduce((s, d) => s + d.totalPaid, 0);
      return [`Top ${k} donor${k > 1 ? 's' : ''}`, fmtPct(T > 0 ? topAmt / T : 0), fmt$2(topAmt)];
    });

  const hhi = D.reduce((s, d) => { const sh = d.totalPaid / T; return s + sh * sh; }, 0);
  const n = D.length;
  const hhiNorm = n > 1 ? (hhi - 1 / n) / (1 - 1 / n) : (n === 1 ? 1 : 0);
  const interpretation = hhiNorm < 0.15 ? 'Concentration is low — giving is broadly distributed.'
    : hhiNorm < 0.35 ? 'Concentration is moderate — a handful of donors provide outsized support.'
    : 'Concentration is high — significant dependence on a small number of large donors.';

  return `### Donor Concentration Index

${fmtN(n)} recurring donors with payments in the year. Total cash received: ${fmt$2(T)}.

${mdTable(['Tier', 'Cumulative Share', 'Cumulative Amount'], topKRows)}

| Metric | Value |
| --- | --- |
| HHI (raw, 0–1) | ${hhi.toFixed(4)} |
| HHI Normalized (0 = equal, 1 = single donor) | ${hhiNorm.toFixed(4)} |

${interpretation}`;
}

// Indicator 6 — Effective Recurring Donation Yield
export function indicatorRecurringYield(donations: KclAnnualDataset['data']['donations']): string {
  const monthly = donations.filter(d => d.donationType.toUpperCase().includes('MONTHLY'));
  if (monthly.length === 0) return '';

  const grossPledged   = monthly.reduce((s, d) => s + d.pledgedAmount, 0);
  const grossCollected = monthly.filter(d => d.voidDate === '' && d.amountPaid > 0).reduce((s, d) => s + d.amountPaid, 0);
  const collectionRate = grossPledged > 0 ? grossCollected / grossPledged : 0;

  const pledgeMap = new Map<string, { cancelled: boolean; voided: boolean; hasUnpaid: boolean }>();
  for (const d of monthly) {
    const existing = pledgeMap.get(d.donationId) ?? { cancelled: false, voided: false, hasUnpaid: false };
    if (d.cancelledDate !== '') existing.cancelled = true;
    if (d.voidDate !== '')      existing.voided    = true;
    if (d.amountPaid === 0 && d.cancelledDate === '' && d.voidDate === '') existing.hasUnpaid = true;
    pledgeMap.set(d.donationId, existing);
  }
  const uniquePledges    = pledgeMap.size;
  const cancelledPledges = Array.from(pledgeMap.values()).filter(p => p.cancelled).length;
  const voidedPledges    = Array.from(pledgeMap.values()).filter(p => p.voided).length;
  const unpaidPledges    = Array.from(pledgeMap.values()).filter(p => p.hasUnpaid).length;

  return `### Effective Recurring Donation Yield

${mdTable(
  ['Metric', 'Value'],
  [
    ['Unique Monthly Pledges (distinct DONATION_ID)', fmtN(uniquePledges)],
    ['Gross Pledged', fmt$2(grossPledged)],
    ['Gross Collected (non-voided, amount > 0)', fmt$2(grossCollected)],
    ['Collection Rate (collected / pledged)', fmtPct(collectionRate)],
    ['Pledge Cancellation Rate', fmtPct(uniquePledges > 0 ? cancelledPledges / uniquePledges : 0)],
    ['Pledge Void Rate', fmtPct(uniquePledges > 0 ? voidedPledges / uniquePledges : 0)],
    ['Pledge Unpaid Rate (no payment, not cancelled/voided)', fmtPct(uniquePledges > 0 ? unpaidPledges / uniquePledges : 0)],
  ]
)}

A pledge can be both cancelled and voided — rates are not mutually exclusive and may sum above 100%.`;
}

// Indicator 7 — Donation Attrition Timeline
export function indicatorAttritionTimeline(donations: KclAnnualDataset['data']['donations'], year: number): string {
  const cancelled = donations.filter(
    d => d.donationType.toUpperCase().includes('MONTHLY')
      && d.cancelledDate !== ''
      && d.cancelledDate.startsWith(String(year)),
  );
  if (cancelled.length === 0) return '';

  const byMonth: Record<string, { donationIds: Set<string>; donorNames: Set<string> }> = {};
  for (const d of cancelled) {
    const m = d.cancelledDate.substring(5, 7);
    if (!byMonth[m]) byMonth[m] = { donationIds: new Set(), donorNames: new Set() };
    byMonth[m].donationIds.add(d.donationId);
    if (d.donorName) byMonth[m].donorNames.add(d.donorName);
  }

  const totalLost = Object.values(byMonth).reduce((s, v) => s + v.donationIds.size, 0);
  const rows = Object.keys(byMonth).sort().map(m => {
    const mo = parseInt(m, 10);
    return [MONTH_NAMES[mo] ?? m, fmtN(byMonth[m].donationIds.size), fmtN(byMonth[m].donorNames.size)];
  });

  return `### Donation Attrition Timeline

Monthly cancellations of recurring pledges in ${year}. Total pledges cancelled: ${fmtN(totalLost)}.

${mdTable(['Month', 'Pledges Cancelled', 'Unique Donors Lost'], rows)}`;
}

// Indicator 8 — Fund Allocation normalized grouping
export function indicatorFundNormalized(donations: KclAnnualDataset['data']['donations']): string {
  const valid = donations.filter(d => d.voidDate === '' && d.amountPaid > 0);
  if (valid.length === 0) return '';
  const totalCollected = valid.reduce((s, d) => s + d.amountPaid, 0);

  const stripYear = (name: string) => name.replace(/^\d{4}(\.\d+)?\s*-\s*/, '').trim();
  const normMap = new Map<string, number>();
  for (const d of valid) {
    const base = stripYear(d.fundName);
    normMap.set(base, (normMap.get(base) ?? 0) + d.amountPaid);
  }

  const rows = Array.from(normMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([base, amt]) => [base, fmt$2(amt), fmtPct(totalCollected > 0 ? amt / totalCollected : 0)]);

  return `### Fund Allocation — Normalized

Year-prefix variants (e.g., "2025 - Saddharma" and "2025.1 - Saddharma") merged under base name. Excludes voided transactions.

${mdTable(['Fund (normalized)', 'Total Collected', 'Share'], rows)}`;
}

// Indicator 9 — Registration Retention Rate
export function indicatorRegistrationRetention(programCatalog: KclAnnualDataset['data']['programCatalog']): string {
  const programs = programCatalog.filter(p => !p.isResidential);
  if (programs.every(p => p.totalRegistrations === 0 && p.activeRegistrations === 0)) return '';
  const P = programs.filter(p => p.totalRegistrations > 0);
  if (P.length === 0) return '';

  const totalActive = P.reduce((s, p) => s + p.activeRegistrations, 0);
  const totalReg    = P.reduce((s, p) => s + p.totalRegistrations, 0);

  const catRows = ['REG', 'CABN', 'IHR'].map(c => {
    const Pc = P.filter(p => p.categoryCode === c);
    if (Pc.length === 0) return null;
    const a = Pc.reduce((s, p) => s + p.activeRegistrations, 0);
    const t = Pc.reduce((s, p) => s + p.totalRegistrations, 0);
    return [c, fmtN(a), fmtN(t), fmtPct(t > 0 ? a / t : 0)];
  }).filter((r): r is string[] => r !== null);

  const fullDropout  = P.filter(p => p.activeRegistrations === 0);
  const unregistered = programs.filter(p => p.activeRegistrations > p.totalRegistrations);
  const dropoutList  = fullDropout.slice(0, 10).map(p => `  - ${p.programName}`).join('\n')
    + (fullDropout.length > 10 ? `\n  - ... and ${fullDropout.length - 10} more` : '');

  return `### Registration Retention Rate

Non-cancellation rate — fraction of registrations that were not cancelled. **Overall: ${fmtPct(totalReg > 0 ? totalActive / totalReg : 0)}** (${fmtN(totalActive)} active / ${fmtN(totalReg)} total, across ${fmtN(P.length)} programs).

${catRows.length > 0 ? mdTable(['Category', 'Active Registrations', 'Total Registrations', 'Retention Rate'], catRows) : ''}

**Full-dropout programs** (all registrations cancelled): ${fmtN(fullDropout.length)} (${fmtPct(P.length > 0 ? fullDropout.length / P.length : 0)} of programs with registrations).${fullDropout.length > 0 ? '\n' + dropoutList : ''}

${unregistered.length > 0 ? `**Unregistered participation** (active_registrations > total_registrations — data quality flag): ${fmtN(unregistered.length)} program(s).` : 'No unregistered participation anomalies detected.'}`;
}

// Indicator 10 — Program Utilization Rate
export function indicatorProgramUtilization(programCatalog: KclAnnualDataset['data']['programCatalog']): string {
  const all = programCatalog.filter(p => !p.isResidential);
  if (all.length === 0) return '';
  if (all.every(p => p.totalRegistrations === 0 && p.activeRegistrations === 0)) return '';

  const enrolled = all.filter(p => p.totalRegistrations > 0);
  const attended = all.filter(p => p.activeRegistrations > 0);
  const zeroReg  = all.filter(p => p.totalRegistrations === 0);
  const enrolledNotAttended = enrolled.filter(p => p.activeRegistrations === 0);

  const attendedCounts = attended.map(p => p.activeRegistrations);
  const medianAtt = computeMedian(attendedCounts);
  const meanAtt   = attendedCounts.length > 0 ? attendedCounts.reduce((s, v) => s + v, 0) / attendedCounts.length : 0;

  const catRows = ['REG', 'CABN', 'IHR'].map(c => {
    const allC = all.filter(p => p.categoryCode === c);
    if (allC.length === 0) return null;
    return [c, fmtN(allC.length), fmtPct(allC.length > 0 ? allC.filter(p => p.totalRegistrations > 0).length / allC.length : 0), fmtPct(allC.length > 0 ? allC.filter(p => p.activeRegistrations > 0).length / allC.length : 0)];
  }).filter((r): r is string[] => r !== null);

  return `### Program Utilization Rate

${mdTable(
  ['Metric', 'Value'],
  [
    ['Total Programs in Catalog', fmtN(all.length)],
    ['Programs with Any Registrations', `${fmtN(enrolled.length)} (${fmtPct(all.length > 0 ? enrolled.length / all.length : 0)})`],
    ['Programs with Active Attendees', `${fmtN(attended.length)} (${fmtPct(all.length > 0 ? attended.length / all.length : 0)})`],
    ['Enrolled but All Cancelled', `${fmtN(enrolledNotAttended.length)} (${fmtPct(enrolled.length > 0 ? enrolledNotAttended.length / enrolled.length : 0)} of enrolled)`],
    ['Zero-Registration Programs', fmtN(zeroReg.length)],
    ['Median Attendance (programs that ran)', fmtN(Math.round(medianAtt))],
    ['Mean Attendance (programs that ran)', meanAtt.toFixed(1)],
  ]
)}

${catRows.length > 0 ? mdTable(['Category', 'Programs', 'Enrollment Rate', 'Attendance Rate'], catRows) : ''}${zeroReg.length > 0 ? `\n\n**Zero-registration programs** (offered but no sign-ups): ${zeroReg.slice(0, 15).map(p => p.programName).join(', ')}${zeroReg.length > 15 ? ` ... and ${zeroReg.length - 15} more` : ''}` : ''}`;
}

// Indicator 11 — Revenue per Category with median + RevPerParticipant
export function indicatorCategoryStats(programRevenue: KclAnnualDataset['data']['programRevenue']): string {
  const rows = ['REG', 'CABN', 'IHR'].map(c => {
    const progs = programRevenue.filter(p => p.categoryCode === c);
    if (progs.length === 0) return null;
    const totalRevenue      = progs.reduce((s, p) => s + p.totalRevenue, 0);
    const totalParticipants = progs.reduce((s, p) => s + p.participants, 0);
    const medianRevenue     = computeMedian(progs.map(p => p.totalRevenue));
    const revPerParticipant = totalParticipants > 0 ? totalRevenue / totalParticipants : 0;
    return [c, fmtN(progs.length), fmt$(totalRevenue), fmt$(progs.length > 0 ? totalRevenue / progs.length : 0), fmt$(medianRevenue), fmtN(totalParticipants), revPerParticipant > 0 ? fmt$2(revPerParticipant) : '—'];
  }).filter((r): r is string[] => r !== null);

  if (rows.length === 0) return '';
  return `### Revenue per Category — Extended Stats

Median is the typical program; mean is skewed by large outliers.

${mdTable(
  ['Category', 'Programs', 'Total Revenue', 'Mean Revenue', 'Median Revenue', 'Participants', 'Rev/Participant'],
  rows
)}`;
}

// Indicator 12 — AR Aging Buckets
export function indicatorARaging(outstandingAr: KclAnnualDataset['data']['outstandingAr'], year: number): string {
  if (outstandingAr.length === 0) return '';
  const refDate = new Date(`${year + 1}-01-01T00:00:00Z`);

  interface Bucket { label: string; count: number; totalAR: number; totalCharged: number; totalPaid: number }
  const buckets: Bucket[] = [
    { label: 'Not yet ended',  count: 0, totalAR: 0, totalCharged: 0, totalPaid: 0 },
    { label: '0–30 days',      count: 0, totalAR: 0, totalCharged: 0, totalPaid: 0 },
    { label: '31–90 days',     count: 0, totalAR: 0, totalCharged: 0, totalPaid: 0 },
    { label: '91–180 days',    count: 0, totalAR: 0, totalCharged: 0, totalPaid: 0 },
    { label: '181–365 days',   count: 0, totalAR: 0, totalCharged: 0, totalPaid: 0 },
    { label: 'Over 1 year',    count: 0, totalAR: 0, totalCharged: 0, totalPaid: 0 },
  ];

  for (const r of outstandingAr) {
    if (!r.endDate) continue;
    const end = new Date(r.endDate + 'T00:00:00Z');
    const daysPast = Math.floor((refDate.getTime() - end.getTime()) / 86400000);
    const b = daysPast <= 0 ? buckets[0]
            : daysPast <= 30 ? buckets[1]
            : daysPast <= 90 ? buckets[2]
            : daysPast <= 180 ? buckets[3]
            : daysPast <= 365 ? buckets[4]
            : buckets[5];
    b.count++; b.totalAR += r.outstanding; b.totalCharged += r.totalCharged; b.totalPaid += r.totalPaid;
  }

  const totalAR = outstandingAr.reduce((s, r) => s + r.outstanding, 0);
  const rows = buckets
    .filter(b => b.count > 0)
    .map(b => [b.label, fmtN(b.count), fmt$2(b.totalAR), fmt$2(b.count > 0 ? b.totalAR / b.count : 0), b.totalCharged > 0 ? fmtPct(b.totalPaid / b.totalCharged) : '—']);

  return `### AR Aging Analysis

Reference date: Jan 1, ${year + 1}. ${fmtN(outstandingAr.length)} records, ${fmt$2(totalAR)} total outstanding.

${mdTable(['Age Bucket', 'Count', 'Total Outstanding', 'Mean Outstanding', 'Payment Rate'], rows)}`;
}

// Indicator 13 — Payroll Burden Ratio
export function indicatorPayrollBurden(
  staffSalaries: KclAnnualDataset['data']['staffSalaries'],
  totalRevenue: number,
): string {
  if (staffSalaries.length === 0 || totalRevenue === 0) return '';

  let totalPayroll = 0;
  let imputedCount = 0;
  for (const e of staffSalaries) {
    let employerFICA: number;
    if (e.medicareMonthly !== null && e.oasdiMonthly !== null) {
      employerFICA = (e.medicareMonthly + e.oasdiMonthly) * 12;
    } else {
      employerFICA = e.annualSalary * 0.0765;
      imputedCount++;
    }
    totalPayroll += e.annualSalary + employerFICA;
  }

  const burdenLower = totalRevenue > 0 ? totalPayroll / totalRevenue : 0;
  const burdenUpper = burdenLower * 1.20;

  return `### Payroll Burden Ratio

${mdTable(
  ['Metric', 'Value'],
  [
    ['Total Annualized Payroll (salary + employer FICA)', fmt$(totalPayroll)],
    ['Total Revenue (trial balance)', fmt$(totalRevenue)],
    ['Payroll Burden — Lower Bound (salary + FICA only)', fmtPct(burdenLower)],
    ['Payroll Burden — Upper Bound (+20% benefits loading)', fmtPct(burdenUpper)],
    ['Employees using imputed 7.65% FICA rate (no Medicare/OASDI data)', fmtN(imputedCount)],
  ]
)}

Lower bound excludes health insurance, workers' comp, VT SUTA/FUTA, retirement, and payroll processing. Upper bound assumes 20% additional benefit loading (small nonprofit benchmark).`;
}

// Indicator 14 — Daily Cost per Residential Person
export function indicatorDailyCostPerResident(
  residentialRoster: KclAnnualDataset['data']['residentialRoster'],
  trialBalance: KclAnnualDataset['data']['trialBalance'],
): string {
  if (residentialRoster.length === 0 || trialBalance.length === 0) return '';
  const totalPersonDays = residentialRoster.reduce((s, r) => s + r.daysInYear, 0);
  if (totalPersonDays === 0) return '';

  const expenseAccounts = trialBalance.filter(r => r.accountClass === 'Expense');
  const matched = expenseAccounts.filter(r => {
    const n = r.accountName.toLowerCase();
    return n.includes('food') || n.includes('kitchen') || n.includes('utilit') || n.includes('maintenance') || n.includes('repair');
  });

  if (matched.length === 0) {
    return `### Daily Cost per Residential Person

_No accounts matched (food, kitchen, utilities, maintenance/repairs). All expense accounts:_

${expenseAccounts.map(r => `- ${r.accountCode}: ${r.accountName}`).join('\n')}`;
  }

  const residentialCost = matched.reduce((s, r) => s + r.debit, 0);
  const costPerDay = totalPersonDays > 0 ? residentialCost / totalPersonDays : 0;

  return `### Daily Cost per Residential Person

${mdTable(
  ['Metric', 'Value'],
  [
    ['Total Person-Days (residential roster)', fmtN(totalPersonDays)],
    ['Residential Operating Cost (food + utilities + maintenance)', fmt$2(residentialCost)],
    ['Cost per Residential Person-Day', fmt$2(costPerDay)],
  ]
)}

**Accounts included:**
${matched.map(r => `- ${r.accountCode}: ${r.accountName} — ${fmt$2(r.debit)}`).join('\n')}

_Caveat: Based on ${fmtN(residentialRoster.length)} residential roster entries (staff, volunteers, residency participants). Excludes program guests. These costs serve the entire property — this metric may overstate the true per-person cost when guest populations are large._`;
}

// Indicator 18 — Net Overpayment / Underpayment Position
export function indicatorOverpaymentPosition(allRegistrations: KclAnnualDataset['data']['allRegistrations']): string {
  if (allRegistrations.length === 0) return '';

  const netPosition      = allRegistrations.reduce((s, r) => s + r.outstanding, 0);
  const overpaidSet      = allRegistrations.filter(r => r.outstanding < 0);
  const underpaidSet     = allRegistrations.filter(r => r.outstanding > 0);
  const balancedSet      = allRegistrations.filter(r => r.outstanding === 0);
  const overpaymentPool  = overpaidSet.reduce((s, r) => s + r.outstanding, 0);
  const underpaymentPool = underpaidSet.reduce((s, r) => s + r.outstanding, 0);

  const personMap = new Map<string, { overpaid: number; underpaid: number; net: number }>();
  for (const r of allRegistrations) {
    if (!r.participantName) continue;
    const p = personMap.get(r.participantName) ?? { overpaid: 0, underpaid: 0, net: 0 };
    if (r.outstanding < 0) p.overpaid++;
    if (r.outstanding > 0) p.underpaid++;
    p.net += r.outstanding;
    personMap.set(r.participantName, p);
  }
  const crossAllocated = Array.from(personMap.entries())
    .filter(([, p]) => p.overpaid > 0 && p.underpaid > 0)
    .sort((a, b) => Math.abs(b[1].net) - Math.abs(a[1].net));

  return `### Net Overpayment / Underpayment Position

${mdTable(
  ['Metric', 'Value'],
  [
    ['Net Position across all registrations (negative = net credit held)', fmt$2(netPosition)],
    ['Overpaid registrations (credit balance)', `${fmtN(overpaidSet.length)} — ${fmt$2(overpaymentPool)}`],
    ['Underpaid registrations (balance owed)', `${fmtN(underpaidSet.length)} — ${fmt$2(underpaymentPool)}`],
    ['Balanced registrations (fully paid)', fmtN(balancedSet.length)],
    ['Cross-allocated individuals', fmtN(crossAllocated.length)],
  ]
)}${crossAllocated.length > 0 ? `\n\n**Cross-allocated participants** (have both overpaid and underpaid registrations — likely payment misallocation):\n${mdTable(['Participant', 'Net Position'], crossAllocated.slice(0, 10).map(([name, p]) => [name, fmt$2(p.net)]))}` : ''}`;
}

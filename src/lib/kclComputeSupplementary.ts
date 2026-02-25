import type {
  ResidentialRosterEntry,
  TrialBalanceEntry,
  DonationEntry,
  ArEntry,
  ProgramTransactionEntry,
  RecurringDonorEntry,
  RoomBookingEntry,
  ProgramBillingEntry,
  ProgramRevenueEntry,
  KclOccupancy,
  KclBreakEven,
  KclVolunteerMetrics,
  KclTrialBalanceSummary,
  KclDonationFund,
  KclDonationBreakdown,
  KclArMetrics,
  KclDiscountSummary,
  KclRecurringDonorSummary,
  KclProgramBillingSummary,
  KclRoomTypeOccupancy,
  KclRosterPerson,
  KclProgramPnL,
  KclRevenueStreams,
} from './kclTypes';
import {
  RESIDENT_MONTHLY_RATE,
  VOLUNTEER_VALUE_PER_DAY,
  PROG_CATEGORY_LABELS,
  clampedDays,
  rosterTrack,
  strictYearFilter,
} from './kclComputeUtils';

// ─── Occupancy from residential roster ───────────────────────────────────────

export function computeOccupancy(
  roster: ResidentialRosterEntry[],
  year: number,
  residencyRevenue: number,
): KclOccupancy {
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const lastDay = [0, 31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const yr = String(year);

  const monthlyResidents: Record<number, number> = {};
  const monthlyByTrack: Record<number, { staff: number; volunteers: number; residency: number }> = {};
  for (let m = 1; m <= 12; m++) {
    monthlyResidents[m] = 0;
    monthlyByTrack[m] = { staff: 0, volunteers: 0, residency: 0 };
  }

  let totalResidentDays = 0;

  for (const r of roster) {
    if (!r.arrivalDate || !r.departureDate) continue;
    const start = r.arrivalDate < `${yr}-01-01` ? `${yr}-01-01` : r.arrivalDate;
    const end   = r.departureDate > `${yr}-12-31` ? `${yr}-12-31` : r.departureDate;
    if (start > end) continue;

    const track = rosterTrack(r.programName);
    totalResidentDays += clampedDays(r.arrivalDate, r.departureDate, year);

    for (let m = 1; m <= 12; m++) {
      const mStr   = String(m).padStart(2, '0');
      const mStart = `${yr}-${mStr}-01`;
      const mEnd   = `${yr}-${mStr}-${String(lastDay[m]).padStart(2, '0')}`;
      if (start <= mEnd && end > mStart) {
        monthlyResidents[m]++;
        if (track === 'volunteer')  monthlyByTrack[m].volunteers++;
        else if (track === 'residency') monthlyByTrack[m].residency++;
        else monthlyByTrack[m].staff++;
      }
    }
  }

  const avgMonthlyResidents = Object.values(monthlyResidents).reduce((a, b) => a + b, 0) / 12;
  const avgMonthlyByTrack = {
    staff:      Object.values(monthlyByTrack).reduce((a, b) => a + b.staff, 0) / 12,
    volunteers: Object.values(monthlyByTrack).reduce((a, b) => a + b.volunteers, 0) / 12,
    residency:  Object.values(monthlyByTrack).reduce((a, b) => a + b.residency, 0) / 12,
  };

  const impliedResidents = residencyRevenue > 0
    ? Math.round(residencyRevenue / (RESIDENT_MONTHLY_RATE * 12))
    : 0;

  return { monthlyByTrack, monthlyResidents, avgMonthlyByTrack, avgMonthlyResidents, totalResidentDays, impliedResidents };
}

// ─── Volunteer / residential population breakdown ─────────────────────────────

export function computeVolunteerMetrics(roster: ResidentialRosterEntry[], year: number): KclVolunteerMetrics {
  let volunteerCount = 0, volunteerDays = 0;
  let staffCount = 0, staffDays = 0;
  let residencyCount = 0, residencyDays = 0;

  const rosterByTrack: {
    staff: KclRosterPerson[];
    volunteers: KclRosterPerson[];
    residency: KclRosterPerson[];
  } = { staff: [], volunteers: [], residency: [] };

  for (const r of roster) {
    const days = clampedDays(r.arrivalDate, r.departureDate, year);
    const track = rosterTrack(r.programName);
    const person: KclRosterPerson = {
      name: `${r.firstName} ${r.lastName}`.trim(),
      arrivalDate: r.arrivalDate,
      departureDate: r.departureDate,
      days,
    };
    if (track === 'volunteer') {
      volunteerCount++;
      volunteerDays += days;
      rosterByTrack.volunteers.push(person);
    } else if (track === 'residency') {
      residencyCount++;
      residencyDays += days;
      rosterByTrack.residency.push(person);
    } else {
      staffCount++;
      staffDays += days;
      rosterByTrack.staff.push(person);
    }
  }

  for (const track of ['staff', 'volunteers', 'residency'] as const) {
    rosterByTrack[track].sort((a, b) => a.name.localeCompare(b.name));
  }

  return {
    volunteerCount,
    volunteerDays,
    staffCount,
    staffDays,
    residencyCount,
    residencyDays,
    estimatedLaborValue: volunteerDays * VOLUNTEER_VALUE_PER_DAY,
    laborValuePerDay: VOLUNTEER_VALUE_PER_DAY,
    rosterByTrack,
  };
}

// ─── Break-even scenario ──────────────────────────────────────────────────────

export function computeBreakEven(
  deficit: number,
  programRevenue: ProgramRevenueEntry[],
  revenueStreams: KclRevenueStreams,
  programPnL: KclProgramPnL[],
  foodMarginalRatePerDay: number,
): KclBreakEven {
  const revenuePerResident = RESIDENT_MONTHLY_RATE * 12;

  const residencyNetPerResident = Math.max(1, revenuePerResident - foodMarginalRatePerDay * 365);

  const programsWithRevenue = programRevenue.filter(p => p.totalRevenue > 0);
  const totalProgramRevenue = programsWithRevenue.reduce((s, p) => s + p.totalRevenue, 0);
  const avgProgramRevenue   = programsWithRevenue.length > 0
    ? totalProgramRevenue / programsWithRevenue.length
    : 0;

  const pnlWithRevenue = programPnL.filter(p => p.revenue > 0);
  const avgContributionMargin = pnlWithRevenue.length > 0
    ? pnlWithRevenue.reduce((s, p) => s + p.contributionMargin, 0) / pnlWithRevenue.length
    : 0;
  const avgDirectContributionMargin = pnlWithRevenue.length > 0
    ? pnlWithRevenue.reduce(
        (s, p) => s + p.revenue - p.costs.teacherCost - p.costs.foodCost - p.costs.ccFees - p.costs.scholarshipCost - p.costs.utilityMarginal,
        0,
      ) / pnlWithRevenue.length
    : 0;

  const unrestrictedDonationRevenue = revenueStreams.donationsUnrestricted;
  const totalDonationRevenue =
    revenueStreams.donationsUnrestricted +
    revenueStreams.donationsRestricted;
  const totalCampaignRevenue = revenueStreams.campaigns;

  const d = Math.max(deficit, 0);
  return {
    deficit,
    avgProgramRevenue,
    avgContributionMargin,
    avgDirectContributionMargin,
    programsWithRevenueCount: programsWithRevenue.length,
    residencyRevenuePerResident: revenuePerResident,
    residencyNetPerResident,
    totalDonationRevenue,
    unrestrictedDonationRevenue,
    totalCampaignRevenue,
    residentsNeeded:            residencyNetPerResident > 0              ? Math.ceil(d / residencyNetPerResident)        : 0,
    programsNeeded:             avgDirectContributionMargin > 0         ? Math.ceil(d / avgDirectContributionMargin)    : 0,
    donationIncreasePct:        unrestrictedDonationRevenue > 0         ? d / unrestrictedDonationRevenue               : 0,
    campaignIncreasePct:        totalCampaignRevenue > 0                ? d / totalCampaignRevenue                      : 0,
  };
}

// ─── Trial balance summary ────────────────────────────────────────────────────

export function computeTrialBalanceSummary(entries: TrialBalanceEntry[]): KclTrialBalanceSummary {
  let trialRevenue = 0, trialExpenses = 0, depreciation = 0;
  let retainedEarnings = 0, programDeposits = 0, investmentAccount = 0;
  let cashAndBanks = 0, mortgage = 0, sbaLoan = 0;
  let totalAssets = 0, totalLiabilities = 0, totalEquity = 0;

  for (const e of entries) {
    const code = e.accountCode.trim();
    const cls  = e.accountClass.toLowerCase();

    if (cls === 'revenue') {
      trialRevenue += e.credit;
    } else if (cls === 'expense') {
      trialExpenses += e.debit;
      if (code === '6130') depreciation = e.debit;
    } else if (cls === 'asset') {
      totalAssets += e.debit - e.credit;
      if (/^100\d$/.test(code) && code !== '1005') cashAndBanks += e.debit;
      if (code === '1005') investmentAccount = e.debit;
    } else if (cls === 'liability') {
      totalLiabilities += e.credit;
      if (code === '2010') programDeposits = e.credit;
      if (code === '2500') mortgage = e.credit;
      if (code === '2501') sbaLoan = e.credit;
    } else if (cls === 'equity') {
      totalEquity += e.credit - e.debit;
      if (code === '3000') retainedEarnings = e.credit - e.debit;
    }
  }

  return {
    trialRevenue,
    trialExpenses,
    trialNetIncome: trialRevenue - trialExpenses,
    depreciation,
    retainedEarnings,
    programDeposits,
    investmentAccount,
    cashAndBanks,
    mortgage,
    sbaLoan,
    totalAssets,
    totalLiabilities,
    totalEquity,
  };
}

// ─── Donation breakdown ───────────────────────────────────────────────────────

export function computeDonationBreakdown(donations: DonationEntry[]): KclDonationBreakdown {
  const fundMap: Record<string, KclDonationFund> = {};
  let totalPledged = 0, totalPaid = 0;
  let monthlyCount = 0, oneTimeCount = 0, cancelledCount = 0, voidCount = 0;

  for (const d of donations) {
    if (d.cancelledDate !== '') { cancelledCount++; continue; }
    if (d.voidDate !== '') { voidCount++; continue; }

    const type = d.donationType.toUpperCase();
    if (type.includes('MONTHLY') || type.includes('RECURRING')) monthlyCount++;
    else oneTimeCount++;

    totalPledged += d.pledgedAmount;
    totalPaid += d.amountPaid;

    if (!fundMap[d.fundName]) {
      fundMap[d.fundName] = {
        fundName: d.fundName,
        glAccount: d.glAccount,
        totalPledged: 0,
        totalPaid: 0,
        transactionCount: 0,
      };
    }
    fundMap[d.fundName].totalPledged += d.pledgedAmount;
    fundMap[d.fundName].totalPaid += d.amountPaid;
    fundMap[d.fundName].transactionCount++;
  }

  return {
    funds: Object.values(fundMap).sort((a, b) => b.totalPaid - a.totalPaid),
    totalPledged,
    totalPaid,
    paymentRate: totalPledged > 0 ? totalPaid / totalPledged : 0,
    monthlyCount,
    oneTimeCount,
    cancelledCount,
    voidCount,
  };
}

// ─── Accounts receivable ──────────────────────────────────────────────────────

export function computeArMetrics(arEntries: ArEntry[]): KclArMetrics {
  const totalOutstanding = arEntries.reduce((s, e) => s + e.outstanding, 0);
  const totalCharged     = arEntries.reduce((s, e) => s + e.totalCharged, 0);
  const totalPaid        = arEntries.reduce((s, e) => s + e.totalPaid, 0);

  const topDebtors = [...arEntries]
    .filter(e => e.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 10)
    .map(e => ({
      participantName: e.participantName,
      programName: e.programName,
      outstanding: e.outstanding,
    }));

  return {
    totalOutstanding,
    totalCharged,
    totalPaid,
    collectionRate: totalCharged > 0 ? totalPaid / totalCharged : 0,
    debtorCount: arEntries.filter(e => e.outstanding > 0).length,
    topDebtors,
  };
}

// ─── Discount summary ─────────────────────────────────────────────────────────

export function computeDiscountSummary(txns: ProgramTransactionEntry[], year: number): KclDiscountSummary {
  const cats: Record<string, { totalAmount: number; totalDiscount: number }> = {};
  let totalAmount = 0;
  let totalDiscount = 0;

  for (const t of txns) {
    if (!strictYearFilter(t.startDate, t.endDate, year)) continue;
    totalAmount += t.totalAmount;
    totalDiscount += t.totalDiscount;
    const code = (t.categoryCode ?? '').trim().toUpperCase() || 'OTHER';
    if (!cats[code]) cats[code] = { totalAmount: 0, totalDiscount: 0 };
    cats[code].totalAmount += t.totalAmount;
    cats[code].totalDiscount += t.totalDiscount;
  }

  const byCategory = Object.entries(cats)
    .map(([code, d]) => ({
      categoryCode: code,
      label: PROG_CATEGORY_LABELS[code] ?? code,
      totalAmount: d.totalAmount,
      totalDiscount: d.totalDiscount,
      discountRate: d.totalAmount > 0 ? d.totalDiscount / d.totalAmount : 0,
    }))
    .sort((a, b) => b.totalDiscount - a.totalDiscount);

  return {
    totalAmount,
    totalDiscount,
    netRevenue: totalAmount - totalDiscount,
    discountRate: totalAmount > 0 ? totalDiscount / totalAmount : 0,
    byCategory,
  };
}

// ─── Recurring donor summary ──────────────────────────────────────────────────

export function computeRecurringDonorSummary(donors: RecurringDonorEntry[]): KclRecurringDonorSummary {
  const donorCount = donors.length;
  const totalPaid = donors.reduce((s, d) => s + d.totalPaid, 0);
  const totalPayments = donors.reduce((s, d) => s + d.paymentsMade, 0);

  const topDonors = [...donors]
    .sort((a, b) => b.totalPaid - a.totalPaid)
    .slice(0, 10)
    .map(d => ({ donorName: d.donorName, payments: d.paymentsMade, totalPaid: d.totalPaid }));

  return {
    donorCount,
    totalPaid,
    avgPaymentsPerDonor: donorCount > 0 ? totalPayments / donorCount : 0,
    avgAmountPerDonor: donorCount > 0 ? totalPaid / donorCount : 0,
    topDonors,
  };
}

// ─── Room type occupancy ──────────────────────────────────────────────────────

export function computeRoomTypeOccupancy(bookings: RoomBookingEntry[]): KclRoomTypeOccupancy {
  const valid = bookings.filter(b => b.nights > 0);
  const typeMap: Record<string, { bookings: number; totalNights: number }> = {};

  for (const b of valid) {
    const type = b.roomTypeDesc || b.roomTypeCode || 'Unknown';
    if (!typeMap[type]) typeMap[type] = { bookings: 0, totalNights: 0 };
    typeMap[type].bookings++;
    typeMap[type].totalNights += b.nights;
  }

  const byType = Object.entries(typeMap)
    .map(([roomTypeDesc, d]) => ({
      roomTypeDesc,
      bookings: d.bookings,
      totalNights: d.totalNights,
      avgNights: d.bookings > 0 ? d.totalNights / d.bookings : 0,
    }))
    .sort((a, b) => b.totalNights - a.totalNights);

  return {
    totalNights: valid.reduce((s, b) => s + b.nights, 0),
    totalBookings: valid.length,
    byType,
  };
}

// ─── Program billing summary ──────────────────────────────────────────────────

export function computeProgramBillingSummary(billing: ProgramBillingEntry[]): KclProgramBillingSummary {
  const personCount = billing.length;
  const totalCharged = billing.reduce((s, e) => s + e.totalCharged2025, 0);
  const totalRegs    = billing.reduce((s, e) => s + e.registrations2025, 0);

  const topBilled = [...billing]
    .sort((a, b) => b.totalCharged2025 - a.totalCharged2025)
    .slice(0, 10)
    .map(e => ({
      participantName: e.participantName,
      registrations: e.registrations2025,
      totalCharged: e.totalCharged2025,
    }));

  return {
    personCount,
    totalCharged,
    avgChargePerPerson: personCount > 0 ? totalCharged / personCount : 0,
    avgRegistrationsPerPerson: personCount > 0 ? totalRegs / personCount : 0,
    topBilled,
  };
}

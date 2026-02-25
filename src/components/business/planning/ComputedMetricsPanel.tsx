import React from 'react';
import type { KclComputedMetrics } from '@/lib/kclTypes';
import {
  FinancialSummaryCard,
  RevenueStreamsCard,
  MonthlyOverviewCard,
  ParticipationCard,
  ProgramCategoriesCard,
  TopProgramsCard,
  ExpenseCategoriesCard,
  OccupancyCard,
  VolunteerLaborCard,
  UtilitiesCard,
  CapacityCard,
  PayrollCard,
  CcFeeCard,
  TrialBalanceCard,
  DiscountSummaryCard,
  DonationBreakdownCard,
  RecurringDonorCard,
  ProgramBillingCard,
  ArMetricsCard,
  RoomTypeOccupancyCard,
  BreakEvenCard,
  ProgramPnLCard,
} from './kclCards';

interface ComputedMetricsPanelProps {
  metrics: KclComputedMetrics;
}

const ComputedMetricsPanel: React.FC<ComputedMetricsPanelProps> = ({ metrics }) => (
  <div className="space-y-6">
    <FinancialSummaryCard metrics={metrics} />
    <RevenueStreamsCard metrics={metrics} />
    <MonthlyOverviewCard metrics={metrics} />
    <ParticipationCard metrics={metrics} />
    {metrics.programCategories.length > 0 && <ProgramCategoriesCard metrics={metrics} />}
    <TopProgramsCard metrics={metrics} />
    <ExpenseCategoriesCard metrics={metrics} />
    {metrics.occupancy && <OccupancyCard metrics={metrics} />}
    {metrics.volunteerMetrics && <VolunteerLaborCard metrics={metrics} />}
    <UtilitiesCard metrics={metrics} />
    <CapacityCard metrics={metrics} />
    <PayrollCard metrics={metrics} />
    <CcFeeCard metrics={metrics} />
    {metrics.balanceSheet && <TrialBalanceCard metrics={metrics} />}
    {metrics.discountSummary && <DiscountSummaryCard metrics={metrics} />}
    {metrics.donationBreakdown && <DonationBreakdownCard metrics={metrics} />}
    {metrics.recurringDonorSummary && <RecurringDonorCard metrics={metrics} />}
    {metrics.programBillingSummary && <ProgramBillingCard metrics={metrics} />}
    {metrics.arMetrics && <ArMetricsCard metrics={metrics} />}
    {metrics.roomTypeOccupancy && <RoomTypeOccupancyCard metrics={metrics} />}
    <BreakEvenCard metrics={metrics} />
    {metrics.programPnL.length > 0 && <ProgramPnLCard metrics={metrics} />}
  </div>
);

export default ComputedMetricsPanel;

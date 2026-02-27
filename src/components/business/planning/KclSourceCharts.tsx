import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts';
import type { KclDataSourceKey, KclAnnualDataset } from '@/lib/kclTypes';
import { MONTH_NAMES } from '@/lib/kclTypes';
import { fmt$, fmt$2, fmtN, trunc, fmtAxisMoney } from '@/lib/kclColumnDefs';
import type { Row } from '@/lib/kclColumnDefs';

// ─── Chart palette ────────────────────────────────────────────────────────────

const C = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#ec4899'];

// ─── Chart card wrapper ───────────────────────────────────────────────────────

function ChartCard({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {note && <p className="text-xs text-muted-foreground/60 italic ml-2 shrink-0">{note}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Per-source charts ────────────────────────────────────────────────────────

export function KclSourceCharts({ sourceKey, data, dataset }: {
  sourceKey: KclDataSourceKey;
  data: Row[];
  dataset?: KclAnnualDataset;
}) {
  if (data.length === 0) return null;

  // GL Transactions: monthly debit/credit + top account codes
  if (sourceKey === 'glTransactions') {
    const monthly: Record<number, { debit: number; credit: number }> = {};
    for (let i = 1; i <= 12; i++) monthly[i] = { debit: 0, credit: 0 };
    data.forEach(r => {
      const d = new Date(String(r.date || '') + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        const m = d.getMonth() + 1;
        monthly[m].debit  += Number(r.debit)  || 0;
        monthly[m].credit += Number(r.credit) || 0;
      }
    });
    const monthlyData = Object.entries(monthly).map(([m, v]) => ({
      month: MONTH_NAMES[+m], debit: v.debit, credit: v.credit,
    }));

    const byAccount: Record<string, { volume: number; name: string }> = {};
    data.forEach(r => {
      const code = String(r.accountCode || '(none)');
      if (!byAccount[code]) byAccount[code] = { volume: 0, name: String(r.accountName || code) };
      byAccount[code].volume += (Number(r.debit) || 0) + (Number(r.credit) || 0);
    });
    const topAccounts = Object.entries(byAccount)
      .sort((a, b) => b[1].volume - a[1].volume).slice(0, 10)
      .map(([, v]) => ({ name: trunc(v.name, 30), value: v.volume }));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Monthly Debit vs Credit">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} width={56} />
              <Tooltip formatter={(v: number) => fmt$2(v)} />
              <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="debit"  name="Debit"  fill={C[3]} radius={[2,2,0,0]} />
              <Bar dataKey="credit" name="Credit" fill={C[1]} radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Top Accounts by Volume">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topAccounts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
              <Tooltip formatter={(v: number) => fmt$2(v)} />
              <Bar dataKey="value" name="Volume" radius={[0,2,2,0]}>
                {topAccounts.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    );
  }

  // Program Catalog: programs by month (stacked by category) + p-days by month (stacked by category)
  if (sourceKey === 'programCatalog') {
    const isResidentialTracking = (r: Row) => {
      const n = String(r.programName || '').toLowerCase();
      return n.includes('residential staff') || n.includes('residential volunteer') || n.includes('residency program');
    };

    const categories = Array.from(new Set(
      data.filter(r => !isResidentialTracking(r)).map(r => String(r.categoryCode || 'Other'))
    )).sort();

    const countByMonth: Record<number, Record<string, number>> = {};
    const pDaysByMonth: Record<number, Record<string, number>> = {};
    for (let i = 1; i <= 12; i++) {
      countByMonth[i] = {};
      pDaysByMonth[i] = {};
      categories.forEach(c => { countByMonth[i][c] = 0; pDaysByMonth[i][c] = 0; });
    }

    data.forEach(r => {
      if (isResidentialTracking(r)) return;
      const d = new Date(String(r.startDate || '') + 'T00:00:00');
      if (isNaN(d.getTime())) return;
      const m = d.getMonth() + 1;
      const cat = String(r.categoryCode || 'Other');
      countByMonth[m][cat] = (countByMonth[m][cat] || 0) + 1;
      pDaysByMonth[m][cat] = (pDaysByMonth[m][cat] || 0) + (Number(r.participantDays) || 0);
    });

    const countData = Object.entries(countByMonth).map(([m, cats]) => ({ month: MONTH_NAMES[+m], ...cats }));
    const pDaysData = Object.entries(pDaysByMonth).map(([m, cats]) => ({ month: MONTH_NAMES[+m], ...cats }));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Programs by Month">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={countData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} width={28} />
              <Tooltip />
              <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              {categories.map((cat, i) => (
                <Bar key={cat} dataKey={cat} name={cat} stackId="a" fill={C[i % C.length]} radius={i === categories.length - 1 ? [2,2,0,0] : [0,0,0,0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Participant Days by Month">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={pDaysData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={fmtN} tick={{ fontSize: 11 }} width={40} />
              <Tooltip formatter={(v: number) => fmtN(v)} />
              <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              {categories.map((cat, i) => (
                <Bar key={cat} dataKey={cat} name={cat} stackId="a" fill={C[i % C.length]} radius={i === categories.length - 1 ? [2,2,0,0] : [0,0,0,0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    );
  }

  // Program Revenue: revenue by month (stacked: tuition/accommodation/other) + top 10 programs
  if (sourceKey === 'programRevenue') {
    const byMonth: Record<number, { tuition: number; accommodation: number; other: number }> = {};
    for (let i = 1; i <= 12; i++) byMonth[i] = { tuition: 0, accommodation: 0, other: 0 };
    data.forEach(r => {
      const d = new Date(String(r.startDate || '') + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        const m = d.getMonth() + 1;
        byMonth[m].tuition       += Number(r.tuitionRevenue)       || 0;
        byMonth[m].accommodation += Number(r.accommodationRevenue) || 0;
        byMonth[m].other         += Number(r.otherRevenue)         || 0;
      }
    });
    const monthData = Object.entries(byMonth).map(([m, v]) => ({ month: MONTH_NAMES[+m], ...v }));

    const top10 = [...data]
      .sort((a, b) => (Number(b.totalRevenue) || 0) - (Number(a.totalRevenue) || 0))
      .slice(0, 10)
      .map(r => ({ name: trunc(r.programName, 28), value: Number(r.totalRevenue) || 0 }));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Revenue by Month">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} width={56} />
              <Tooltip formatter={(v: number) => fmt$(v)} />
              <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="tuition"       name="Tuition"       fill={C[0]} stackId="a" radius={[0,0,0,0]} />
              <Bar dataKey="accommodation" name="Accommodation"  fill={C[1]} stackId="a" radius={[0,0,0,0]} />
              <Bar dataKey="other"         name="Other"          fill={C[2]} stackId="a" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Top 10 Programs by Revenue">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={top10} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
              <Tooltip formatter={(v: number) => fmt$(v)} />
              <Bar dataKey="value" name="Revenue" radius={[0,2,2,0]}>
                {top10.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    );
  }

  // Residential Roster: days per person (top 20) + headcount by program track
  if (sourceKey === 'residentialRoster') {
    const top20 = [...data]
      .sort((a, b) => (Number(b.daysInYear) || 0) - (Number(a.daysInYear) || 0))
      .slice(0, 20)
      .map(r => ({
        name: trunc(`${r.firstName || ''} ${r.lastName || ''}`.trim(), 22),
        days: Number(r.daysInYear) || 0,
      }));

    // Monthly occupancy: count residents on-site for any part of each month
    let dataYear = new Date().getFullYear();
    for (const r of data) {
      const d = new Date(String(r.arrivalDate || '') + 'T00:00:00');
      if (!isNaN(d.getTime()) && d.getFullYear() >= 2000) { dataYear = d.getFullYear(); break; }
    }
    const monthOcc = Array(13).fill(0);
    data.forEach(r => {
      const arr = new Date(String(r.arrivalDate || '') + 'T00:00:00');
      const dep = r.departureDate ? new Date(String(r.departureDate) + 'T00:00:00') : null;
      if (isNaN(arr.getTime())) return;
      for (let m = 1; m <= 12; m++) {
        const mStart = new Date(dataYear, m - 1, 1);
        const mEnd   = new Date(dataYear, m, 0);
        if (arr <= mEnd && (!dep || dep >= mStart)) monthOcc[m]++;
      }
    });
    const occData = monthOcc.slice(1).map((v, i) => ({ month: MONTH_NAMES[i + 1], residents: v }));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Top 20 by Days in Year">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={top20} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
              <Tooltip />
              <Bar dataKey="days" name="Days" fill={C[4]} radius={[0,2,2,0]}>
                {top20.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Residents On-Site by Month">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={occData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} width={32} />
              <Tooltip />
              <Bar dataKey="residents" name="Residents" fill={C[4]} radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    );
  }

  // Room Inventory: capacity by type + single vs shared price comparison
  if (sourceKey === 'roomInventory') {
    const byType: Record<string, number> = {};
    data.forEach(r => {
      const k = String(r.roomType || 'Other');
      byType[k] = (byType[k] || 0) + (Number(r.occupancyLimit) || 1);
    });
    const typeData = Object.entries(byType).map(([name, count]) => ({ name, count }));

    const priceData = Object.entries(
      data.reduce<Record<string, { single: number; shared: number; n: number }>>((acc, r) => {
        const k = String(r.roomType || 'Other');
        if (!acc[k]) acc[k] = { single: 0, shared: 0, n: 0 };
        acc[k].single += Number(r.priceSingle) || 0;
        acc[k].shared += Number(r.priceShared) || 0;
        acc[k].n++;
        return acc;
      }, {})
    ).map(([name, v]) => ({
      name,
      single: v.n ? +(v.single / v.n).toFixed(0) : 0,
      shared: v.n ? +(v.shared / v.n).toFixed(0) : 0,
    }));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Capacity by Room Type">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={typeData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={32} />
              <Tooltip />
              <Bar dataKey="count" name="Beds" radius={[2,2,0,0]}>
                {typeData.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Avg Price: Single vs Shared by Type">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={priceData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => `$${v}`} tick={{ fontSize: 11 }} width={48} />
              <Tooltip formatter={(v: number) => fmt$2(v)} />
              <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="single" name="Single" fill={C[0]} radius={[2,2,0,0]} />
              <Bar dataKey="shared" name="Shared" fill={C[5]} radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    );
  }

  // Staff Salaries: salary by department + headcount by department
  if (sourceKey === 'staffSalaries') {
    const byDept: Record<string, { salary: number; count: number }> = {};
    data.forEach(r => {
      const k = String(r.department || 'Other');
      if (!byDept[k]) byDept[k] = { salary: 0, count: 0 };
      byDept[k].salary += Number(r.annualSalary) || 0;
      byDept[k].count++;
    });
    const deptData = Object.entries(byDept)
      .sort((a, b) => b[1].salary - a[1].salary)
      .map(([name, v]) => ({ name, salary: v.salary, count: v.count }));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Total Annual Salary by Department">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} width={60} />
              <Tooltip formatter={(v: number) => fmt$(v)} />
              <Bar dataKey="salary" name="Salary" radius={[2,2,0,0]}>
                {deptData.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Headcount by Department">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={32} />
              <Tooltip />
              <Bar dataKey="count" name="Staff" radius={[2,2,0,0]}>
                {deptData.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    );
  }

  // Trial Balance: net by account class + net by account type
  if (sourceKey === 'trialBalance') {
    const byClass: Record<string, number> = {};
    data.forEach(r => {
      const k = String(r.accountClass || 'Other');
      byClass[k] = (byClass[k] || 0) + (Number(r.credit) || 0) - (Number(r.debit) || 0);
    });
    const classData = Object.entries(byClass).map(([name, net]) => ({ name, net }));

    const byType: Record<string, number> = {};
    data.forEach(r => {
      const k = String(r.accountType || 'Other');
      byType[k] = (byType[k] || 0) + (Number(r.credit) || 0) - (Number(r.debit) || 0);
    });
    const typeData = Object.entries(byType)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 12)
      .map(([name, net]) => ({ name, net }));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Net (Credit - Debit) by Account Class">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={classData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} width={60} />
              <Tooltip formatter={(v: number) => fmt$2(v)} />
              <Bar dataKey="net" name="Net" radius={[2,2,0,0]}>
                {classData.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Net by Account Type (top 12)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={typeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
              <Tooltip formatter={(v: number) => fmt$2(v)} />
              <Bar dataKey="net" name="Net" radius={[0,2,2,0]}>
                {typeData.map((e, i) => <Cell key={i} fill={e.net >= 0 ? C[1] : C[3]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    );
  }

  // Donations: paid by fund + pledged vs paid comparison
  if (sourceKey === 'donations') {
    const byFund: Record<string, { pledged: number; paid: number }> = {};
    data.forEach(r => {
      const k = trunc(r.fundName, 22);
      if (!byFund[k]) byFund[k] = { pledged: 0, paid: 0 };
      byFund[k].pledged += Number(r.pledgedAmount) || 0;
      byFund[k].paid    += Number(r.amountPaid)    || 0;
    });
    const fundData = Object.entries(byFund)
      .sort((a, b) => b[1].paid - a[1].paid)
      .map(([name, v]) => ({ name, ...v }));

    const byMonth: Record<number, number> = {};
    for (let i = 1; i <= 12; i++) byMonth[i] = 0;
    data.forEach(r => {
      const d = new Date(String(r.paymentDate || '') + 'T00:00:00');
      if (!isNaN(d.getTime())) byMonth[d.getMonth() + 1] += Number(r.amountPaid) || 0;
    });
    const monthData = Object.entries(byMonth).map(([m, v]) => ({ month: MONTH_NAMES[+m], amount: v }));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Pledged vs Paid by Fund">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={fundData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} width={56} />
              <Tooltip formatter={(v: number) => fmt$(v)} />
              <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="pledged" name="Pledged" fill={C[2]} radius={[2,2,0,0]} />
              <Bar dataKey="paid"    name="Paid"    fill={C[1]} radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Monthly Giving">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} width={56} />
              <Tooltip formatter={(v: number) => fmt$(v)} />
              <Bar dataKey="amount" name="Received" fill={C[1]} radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    );
  }

  // Outstanding AR: outstanding by program (top 10)
  if (sourceKey === 'outstandingAr') {
    const byProgram: Record<string, { charged: number; paid: number; outstanding: number }> = {};
    data.forEach(r => {
      const k = trunc(r.programName, 28);
      if (!byProgram[k]) byProgram[k] = { charged: 0, paid: 0, outstanding: 0 };
      byProgram[k].charged     += Number(r.totalCharged) || 0;
      byProgram[k].paid        += Number(r.totalPaid)    || 0;
      byProgram[k].outstanding += Number(r.outstanding)  || 0;
    });
    const top10 = Object.entries(byProgram)
      .sort((a, b) => b[1].outstanding - a[1].outstanding)
      .slice(0, 10)
      .map(([name, v]) => ({ name, ...v }));

    const totals = data.reduce(
      (acc, r) => ({
        charged:     acc.charged     + (Number(r.totalCharged) || 0),
        paid:        acc.paid        + (Number(r.totalPaid)    || 0),
        outstanding: acc.outstanding + (Number(r.outstanding)  || 0),
      }),
      { charged: 0, paid: 0, outstanding: 0 }
    );
    const totalsData = [
      { name: 'Charged',     value: totals.charged },
      { name: 'Paid',        value: totals.paid },
      { name: 'Outstanding', value: totals.outstanding },
    ];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Outstanding by Program (top 10)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={top10} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
              <Tooltip formatter={(v: number) => fmt$2(v)} />
              <Bar dataKey="outstanding" name="Outstanding" fill={C[3]} radius={[0,2,2,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Total Charged vs Paid vs Outstanding">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={totalsData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} width={60} />
              <Tooltip formatter={(v: number) => fmt$2(v)} />
              <Bar dataKey="value" name="Amount" radius={[2,2,0,0]}>
                {totalsData.map((_, i) => <Cell key={i} fill={[C[0], C[1], C[3]][i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    );
  }

  // Program Transactions: amount by GL account + discount by category
  if (sourceKey === 'programTransactions') {
    const byGL: Record<string, number> = {};
    data.forEach(r => { const k = String(r.glAccount || '?'); byGL[k] = (byGL[k] || 0) + (Number(r.totalAmount) || 0); });
    const glData = Object.entries(byGL)
      .sort((a, b) => b[1] - a[1]).slice(0, 12)
      .map(([name, value]) => ({ name, value }));

    const byCat: Record<string, { amount: number; discount: number }> = {};
    data.forEach(r => {
      const k = String(r.categoryCode || 'Other');
      if (!byCat[k]) byCat[k] = { amount: 0, discount: 0 };
      byCat[k].amount   += Number(r.totalAmount)   || 0;
      byCat[k].discount += Number(r.totalDiscount) || 0;
    });
    const catData = Object.entries(byCat).map(([name, v]) => ({ name, ...v }));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Amount by GL Account (top 12)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={glData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={40} />
              <Tooltip formatter={(v: number) => fmt$(v)} />
              <Bar dataKey="value" name="Amount" fill={C[0]} radius={[0,2,2,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Amount vs Discount by Category">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={catData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} width={56} />
              <Tooltip formatter={(v: number) => fmt$(v)} />
              <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="amount"   name="Amount"   fill={C[0]} radius={[2,2,0,0]} />
              <Bar dataKey="discount" name="Discount" fill={C[3]} radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    );
  }

  // Recurring Donors: top 15 by total paid + payment frequency distribution
  if (sourceKey === 'recurringDonors') {
    const top15 = [...data]
      .sort((a, b) => (Number(b.totalPaid) || 0) - (Number(a.totalPaid) || 0))
      .slice(0, 15)
      .map(r => ({ name: trunc(r.donorName, 24), value: Number(r.totalPaid) || 0 }));

    const bins: Record<string, number> = { '0': 0, '1–2': 0, '3–4': 0, '5–6': 0, '7–9': 0, '10–12': 0, '13+': 0 };
    data.forEach(r => {
      const n = Number(r.paymentsMade) || 0;
      if      (n === 0)  bins['0']++;
      else if (n <= 2)   bins['1–2']++;
      else if (n <= 4)   bins['3–4']++;
      else if (n <= 6)   bins['5–6']++;
      else if (n <= 9)   bins['7–9']++;
      else if (n <= 12)  bins['10–12']++;
      else               bins['13+']++;
    });
    const freqData = Object.entries(bins).map(([range, count]) => ({ range, count }));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Top 15 Donors by Total Paid">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={top15} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
              <Tooltip formatter={(v: number) => fmt$2(v)} />
              <Bar dataKey="value" name="Total Paid" radius={[0,2,2,0]}>
                {top15.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Donor Frequency Distribution">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={freqData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="range" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={40} tickFormatter={fmtN} />
              <Tooltip />
              <Bar dataKey="count" name="Donors" fill={C[0]} radius={[2,2,0,0]}>
                {freqData.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    );
  }

  // Room Bookings: guest nights by month + avg nights by room type
  if (sourceKey === 'roomBookings') {
    // Build program-date lookup for fallback when booking arrival/departure is NULL
    const progDates = new Map<string, { startDate: string; endDate: string }>();
    if (dataset) {
      dataset.data.programCatalog.forEach(p => {
        progDates.set(p.programId, { startDate: p.startDate, endDate: p.endDate });
      });
    }

    const byMonth: Record<number, number> = {};
    for (let i = 1; i <= 12; i++) byMonth[i] = 0;
    let fallbackCount = 0;
    let placedCount = 0;
    data.forEach(r => {
      const direct = new Date(String(r.arrivalDate || '') + 'T00:00:00');
      let arrDate: Date | null = null;
      let usedFallback = false;

      if (!isNaN(direct.getTime())) {
        arrDate = direct;
      } else {
        const prog = progDates.get(String(r.programId || ''));
        if (prog?.startDate) {
          const fallback = new Date(prog.startDate + 'T00:00:00');
          if (!isNaN(fallback.getTime())) { arrDate = fallback; usedFallback = true; }
        }
      }

      if (!arrDate) return;
      placedCount++;
      if (usedFallback) fallbackCount++;
      byMonth[arrDate.getMonth() + 1] += Number(r.nights) || 0;
    });
    const monthData = Object.entries(byMonth).map(([m, v]) => ({ month: MONTH_NAMES[+m], nights: v }));
    const nightsNote = fallbackCount > 0
      ? `${fallbackCount}/${placedCount} via program date`
      : undefined;

    const byType: Record<string, { bookings: number; nights: number }> = {};
    data.forEach(r => {
      const k = trunc(r.roomTypeDesc, 22);
      if (!byType[k]) byType[k] = { bookings: 0, nights: 0 };
      byType[k].bookings++;
      byType[k].nights += Number(r.nights) || 0;
    });
    const typeData = Object.entries(byType).map(([name, v]) => ({
      name,
      avgNights: v.bookings ? +(v.nights / v.bookings).toFixed(1) : 0,
    }));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Guest Nights by Month" note={nightsNote}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} width={36} />
              <Tooltip />
              <Bar dataKey="nights" name="Nights" fill={C[5]} radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Avg Nights by Room Type">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={typeData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} width={36} />
              <Tooltip />
              <Bar dataKey="avgNights" name="Avg Nights" fill={C[5]} radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    );
  }

  // All Registrations: charged vs paid by top 10 programs + collection rate
  if (sourceKey === 'allRegistrations') {
    const byProgram: Record<string, { charged: number; paid: number }> = {};
    data.forEach(r => {
      const k = trunc(r.programName, 28);
      if (!byProgram[k]) byProgram[k] = { charged: 0, paid: 0 };
      byProgram[k].charged += Number(r.totalCharged) || 0;
      byProgram[k].paid    += Number(r.totalPaid)    || 0;
    });
    const top10 = Object.entries(byProgram)
      .sort((a, b) => b[1].charged - a[1].charged).slice(0, 10)
      .map(([name, v]) => ({ name, charged: v.charged, paid: v.paid }));

    const totalCharged = data.reduce((s, r) => s + (Number(r.totalCharged) || 0), 0);
    const totalPaid    = data.reduce((s, r) => s + (Number(r.totalPaid)    || 0), 0);
    const totalOut     = totalCharged - totalPaid;
    const summaryData  = [
      { name: 'Charged', value: totalCharged },
      { name: 'Paid',    value: totalPaid },
      { name: 'Outstanding', value: totalOut },
    ];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Charged vs Paid — Top 10 Programs">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={top10} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
              <Tooltip formatter={(v: number) => fmt$2(v)} />
              <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="charged" name="Charged" fill={C[0]} radius={[0,2,2,0]} />
              <Bar dataKey="paid"    name="Paid"    fill={C[1]} radius={[0,2,2,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Portfolio Totals">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={summaryData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} width={60} />
              <Tooltip formatter={(v: number) => fmt$2(v)} />
              <Bar dataKey="value" name="Amount" radius={[2,2,0,0]}>
                {summaryData.map((_, i) => <Cell key={i} fill={[C[0], C[1], C[3]][i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    );
  }

  // Program Billing: top 15 by total charged
  if (sourceKey === 'programBilling') {
    const top15 = [...data]
      .sort((a, b) => (Number(b.totalCharged2025) || 0) - (Number(a.totalCharged2025) || 0))
      .slice(0, 15)
      .map(r => ({ name: trunc(r.participantName, 24), value: Number(r.totalCharged2025) || 0 }));
    return (
      <ChartCard title="Top 15 by Total Charged">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={top15} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
            <Tooltip formatter={(v: number) => fmt$2(v)} />
            <Bar dataKey="value" name="Total Charged" radius={[0,2,2,0]}>
              {top15.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  }

  return null;
}

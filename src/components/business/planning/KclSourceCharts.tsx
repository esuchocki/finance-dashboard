import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts';
import type { KclDataSourceKey } from '@/lib/kclTypes';
import { MONTH_NAMES } from '@/lib/kclTypes';
import { fmt$, fmt$2, fmtN, trunc, fmtAxisMoney } from '@/lib/kclColumnDefs';
import type { Row } from '@/lib/kclColumnDefs';

// ─── Chart palette ────────────────────────────────────────────────────────────

const C = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#ec4899'];

// ─── Chart card wrapper ───────────────────────────────────────────────────────

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-sm font-medium text-muted-foreground mb-3">{title}</p>
      {children}
    </div>
  );
}

// ─── Per-source charts ────────────────────────────────────────────────────────

export function KclSourceCharts({ sourceKey, data }: { sourceKey: KclDataSourceKey; data: Row[] }) {
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

    const byAccount: Record<string, number> = {};
    data.forEach(r => {
      const k = String(r.accountCode || '(none)');
      byAccount[k] = (byAccount[k] || 0) + (Number(r.debit) || 0) + (Number(r.credit) || 0);
    });
    const topAccounts = Object.entries(byAccount)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([name, value]) => ({ name, value }));

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
        <ChartCard title="Top Account Codes by Volume">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topAccounts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} width={56} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={48} />
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

  // Program Catalog: programs by category + participant days by category
  if (sourceKey === 'programCatalog') {
    const byCat: Record<string, { count: number; pDays: number }> = {};
    data.forEach(r => {
      if (r.isResidential) return;
      const k = String(r.categoryCode || 'Uncategorized');
      if (!byCat[k]) byCat[k] = { count: 0, pDays: 0 };
      byCat[k].count++;
      byCat[k].pDays += Number(r.participantDays) || 0;
    });
    const catData = Object.entries(byCat).map(([name, v]) => ({ name, count: v.count, pDays: v.pDays }));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Programs by Category">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={catData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={36} />
              <Tooltip />
              <Bar dataKey="count" name="Programs" fill={C[0]} radius={[2,2,0,0]}>
                {catData.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Participant Days by Category">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={catData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtN} tick={{ fontSize: 11 }} width={40} />
              <Tooltip formatter={(v: number) => fmtN(v)} />
              <Bar dataKey="pDays" name="P-Days" fill={C[1]} radius={[2,2,0,0]}>
                {catData.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    );
  }

  // Program Revenue: revenue by category + top 10 programs
  if (sourceKey === 'programRevenue') {
    const byCat: Record<string, { tuition: number; accommodation: number; other: number }> = {};
    data.forEach(r => {
      const k = String(r.categoryCode || 'Other');
      if (!byCat[k]) byCat[k] = { tuition: 0, accommodation: 0, other: 0 };
      byCat[k].tuition       += Number(r.tuitionRevenue) || 0;
      byCat[k].accommodation += Number(r.accommodationRevenue) || 0;
      byCat[k].other         += Number(r.otherRevenue) || 0;
    });
    const catData = Object.entries(byCat).map(([name, v]) => ({ name, ...v }));

    const top10 = [...data]
      .sort((a, b) => (Number(b.totalRevenue) || 0) - (Number(a.totalRevenue) || 0))
      .slice(0, 10)
      .map(r => ({ name: trunc(r.programName, 28), value: Number(r.totalRevenue) || 0 }));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Revenue by Category">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={catData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} width={56} />
              <Tooltip formatter={(v: number) => fmt$(v)} />
              <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="tuition"       name="Tuition"       fill={C[0]} radius={[2,2,0,0]} stackId="a" />
              <Bar dataKey="accommodation" name="Accommodation"  fill={C[1]} radius={[0,0,0,0]} stackId="a" />
              <Bar dataKey="other"         name="Other"          fill={C[2]} radius={[2,2,0,0]} stackId="a" />
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

    const byProgram: Record<string, number> = {};
    data.forEach(r => {
      const k = trunc(r.programName, 30);
      byProgram[k] = (byProgram[k] || 0) + 1;
    });
    const programData = Object.entries(byProgram).map(([name, count]) => ({ name, count }));

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
        <ChartCard title="Headcount by Program Track">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={programData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} width={32} />
              <Tooltip />
              <Bar dataKey="count" name="People" radius={[2,2,0,0]}>
                {programData.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    );
  }

  // Room Inventory: rooms by type + single vs shared price comparison
  if (sourceKey === 'roomInventory') {
    const byType: Record<string, number> = {};
    data.forEach(r => {
      const k = String(r.roomType || 'Other');
      byType[k] = (byType[k] || 0) + 1;
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
        <ChartCard title="Rooms by Type">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={typeData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={32} />
              <Tooltip />
              <Bar dataKey="count" name="Rooms" radius={[2,2,0,0]}>
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

  // Staff Salaries: salary by department
  if (sourceKey === 'staffSalaries') {
    const byDept: Record<string, number> = {};
    data.forEach(r => {
      const k = String(r.department || 'Other');
      byDept[k] = (byDept[k] || 0) + (Number(r.annualSalary) || 0);
    });
    const deptData = Object.entries(byDept)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    return (
      <ChartCard title="Total Annual Salary by Department">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={deptData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} width={60} />
            <Tooltip formatter={(v: number) => fmt$(v)} />
            <Bar dataKey="value" name="Salary" radius={[2,2,0,0]}>
              {deptData.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
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

    const byType: Record<string, number> = {};
    data.forEach(r => { const k = String(r.donationType || 'Unknown'); byType[k] = (byType[k] || 0) + (Number(r.amountPaid) || 0); });
    const typeData = Object.entries(byType).map(([name, paid]) => ({ name, paid }));

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
        <ChartCard title="Amount Paid by Donation Type">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={typeData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmtAxisMoney} tick={{ fontSize: 11 }} width={56} />
              <Tooltip formatter={(v: number) => fmt$(v)} />
              <Bar dataKey="paid" name="Paid" radius={[2,2,0,0]}>
                {typeData.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
              </Bar>
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

  // Recurring Donors: top 15 by total paid
  if (sourceKey === 'recurringDonors') {
    const top15 = [...data]
      .sort((a, b) => (Number(b.totalPaid) || 0) - (Number(a.totalPaid) || 0))
      .slice(0, 15)
      .map(r => ({ name: trunc(r.donorName, 24), value: Number(r.totalPaid) || 0 }));
    return (
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
    );
  }

  // Room Bookings: bookings by room type + avg nights by room type
  if (sourceKey === 'roomBookings') {
    const byType: Record<string, { bookings: number; nights: number }> = {};
    data.forEach(r => {
      const k = trunc(r.roomTypeDesc, 22);
      if (!byType[k]) byType[k] = { bookings: 0, nights: 0 };
      byType[k].bookings++;
      byType[k].nights += Number(r.nights) || 0;
    });
    const typeData = Object.entries(byType).map(([name, v]) => ({
      name,
      bookings: v.bookings,
      avgNights: v.bookings ? +(v.nights / v.bookings).toFixed(1) : 0,
    }));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Bookings by Room Type">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={typeData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} width={36} />
              <Tooltip />
              <Bar dataKey="bookings" name="Bookings" radius={[2,2,0,0]}>
                {typeData.map((_, i) => <Cell key={i} fill={C[i % C.length]} />)}
              </Bar>
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

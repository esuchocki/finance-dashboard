
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFinance } from "@/context/FinanceContext";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { formatCurrency } from "@/lib/formatters";
import { TransactionType } from "@/lib/types";

const AnalysisSection = () => {
  const { filteredTransactions } = useFinance();
  const [activeTab, setActiveTab] = useState("spending");

  // Define an interface for the monthly data
  interface MonthlyData {
    spending: number;
    income: number;
    label: string; // Add label to the interface
  }

  // Spending by month
  const prepareMonthlyData = () => {
    const monthlyData = new Map<string, MonthlyData>();
    
    filteredTransactions.forEach(t => {
      const date = t.date;
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      if (!monthlyData.has(monthYear)) {
        monthlyData.set(monthYear, { 
          spending: 0, 
          income: 0,
          label: monthName
        });
      }
      
      const data = monthlyData.get(monthYear)!;
      
      if (t.type === TransactionType.DEBIT || t.type === TransactionType.CHECK || 
          t.type === TransactionType.WITHDRAWAL || t.type === TransactionType.FEE) {
        data.spending += t.amount;
      } else if (t.type === TransactionType.CREDIT || t.type === TransactionType.DEPOSIT || 
                t.type === TransactionType.INTEREST) {
        data.income += t.amount;
      }
    });
    
    return Array.from(monthlyData.entries())
      .map(([key, value]) => ({
        name: value.label,
        spending: value.spending,
        income: value.income
      }))
      .sort((a, b) => {
        const [yearA, monthA] = a.name.split(' ');
        const [yearB, monthB] = b.name.split(' ');
        
        return yearA === yearB 
          ? monthA.localeCompare(monthB) 
          : yearA.localeCompare(yearB);
      });
  };

  // Day of week spending
  const prepareDayOfWeekData = () => {
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayData = new Map<number, number>();
    
    daysOfWeek.forEach((_, index) => {
      dayData.set(index, 0);
    });
    
    filteredTransactions
      .filter(t => t.type === TransactionType.DEBIT || t.type === TransactionType.CHECK || 
                 t.type === TransactionType.WITHDRAWAL || t.type === TransactionType.FEE)
      .forEach(t => {
        const dayOfWeek = t.date.getDay();
        const currentAmount = dayData.get(dayOfWeek) || 0;
        dayData.set(dayOfWeek, currentAmount + t.amount);
      });
    
    return Array.from(dayData.entries())
      .map(([day, amount]) => ({
        name: daysOfWeek[day],
        value: amount
      }));
  };

  // Top merchants by spending
  const prepareTopMerchantsData = () => {
    const merchantMap = new Map<string, number>();
    
    filteredTransactions
      .filter(t => t.type === TransactionType.DEBIT || t.type === TransactionType.CHECK || 
                 t.type === TransactionType.WITHDRAWAL || t.type === TransactionType.FEE)
      .forEach(t => {
        if (t.name) {
          const currentAmount = merchantMap.get(t.name) || 0;
          merchantMap.set(t.name, currentAmount + t.amount);
        }
      });
    
    return Array.from(merchantMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  };

  const monthlyData = prepareMonthlyData();
  const dayOfWeekData = prepareDayOfWeekData();
  const topMerchantsData = prepareTopMerchantsData();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="spending" onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="spending">Monthly Trends</TabsTrigger>
            <TabsTrigger value="dayOfWeek">Day of Week</TabsTrigger>
            <TabsTrigger value="merchants">Top Merchants</TabsTrigger>
          </TabsList>
          
          <TabsContent value="spending" className="h-[350px]">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `$${value}`} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Bar dataKey="spending" name="Spending" fill="#EF4444" />
                  <Bar dataKey="income" name="Income" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No monthly data available
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="dayOfWeek" className="h-[350px]">
            {dayOfWeekData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayOfWeekData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `$${value}`} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Day: ${label}`}
                  />
                  <Bar dataKey="value" name="Spending" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No day of week data available
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="merchants" className="h-[350px]">
            {topMerchantsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={topMerchantsData} 
                  layout="vertical"
                  margin={{ left: 120 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => `$${value}`} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={120}
                    tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="value" name="Amount" fill="#0EA5E9" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No merchant data available
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AnalysisSection;

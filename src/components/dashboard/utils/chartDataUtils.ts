
import { Transaction } from "@/lib/types";

// Prepare data for expense category charts
export const prepareChartData = (transactions: Transaction[]) => {
  // Group by category and sum amounts
  const categoryMap = new Map<string, { 
    amount: number, 
    subcategories: Map<string, number>,
    transactions: Transaction[]
  }>();
  
  // First, filter for expense transactions
  const expenseTransactions = transactions.filter(
    t => t.categoryType === "expense" || 
        (t.categoryType === undefined && 
         (t.type === "DEBIT" || t.type === "CHECK" || t.type === "WITHDRAWAL" || t.type === "FEE"))
  );
  
  // Count total uncategorized before processing
  const initialUncategorized = expenseTransactions.filter(
    t => !t.category || t.category === "Uncategorized"
  ).length;
  
  console.log(`Initial uncategorized expense transactions: ${initialUncategorized} of ${expenseTransactions.length}`);
  
  // Log sample transactions to debug categorization
  if (expenseTransactions.length > 0) {
    console.log("Sample expense transactions:", 
      expenseTransactions.slice(0, 5).map(t => ({
        description: t.description,
        verboseDescription: t.verboseDescription,
        category: t.category,
        subCategory: t.subCategory,
        amount: t.amount,
        confidence: t.confidence
      }))
    );
  }
  
  expenseTransactions.forEach(t => {
    // IMPORTANT: Always use Claude's assigned category if available, with fallback to original
    // If no category is available or it's "Uncategorized", try to derive one from the description
    let category = t.category;
    if (!category || category === "Uncategorized") {
      if (t.verboseDescription) {
        // Try to extract category from verbose description if available
        const words = t.verboseDescription.split(' ');
        if (words.length > 1) {
          // For transactions with verbose descriptions but no category, 
          // set them to "Other" instead of "Uncategorized" for better organization
          category = "Other Expenses";
        }
      }
    }
    
    // Still defaulting to "Other" if needed
    category = category && category !== "Uncategorized" ? category : "Other Expenses";
    const subCategory = t.subCategory || "Uncategorized Spending";
    
    // Initialize category if it doesn't exist
    if (!categoryMap.has(category)) {
      categoryMap.set(category, { 
        amount: 0, 
        subcategories: new Map<string, number>(),
        transactions: []
      });
    }
    
    // Update category amounts
    const categoryData = categoryMap.get(category)!;
    categoryData.amount += Math.abs(t.amount); // Use absolute value to ensure positive numbers for chart
    categoryData.transactions.push(t);
    
    // Update subcategory amounts
    const currentSubAmount = categoryData.subcategories.get(subCategory) || 0;
    categoryData.subcategories.set(subCategory, currentSubAmount + Math.abs(t.amount));
  });
  
  // Log category distribution
  console.log("Category distribution:", 
    Array.from(categoryMap.entries()).map(([name, data]) => ({
      name,
      count: data.transactions.length,
      amount: data.amount,
      subcategories: Array.from(data.subcategories.keys())
    }))
  );
  
  // Convert to chart data format, sorting from highest to lowest
  return Array.from(categoryMap.entries())
    .map(([name, data]) => ({
      name,
      value: data.amount,
      subcategories: Array.from(data.subcategories.entries())
        .map(([subName, amount]) => ({ name: subName, value: amount }))
        .sort((a, b) => b.value - a.value),
      transactions: data.transactions
    }))
    .sort((a, b) => b.value - a.value);
};

// Prepare income chart data with enhanced categorization
export const prepareIncomeChartData = (transactions: Transaction[]) => {
  // Group by category and sum amounts
  const categoryMap = new Map<string, { 
    amount: number, 
    subcategories: Map<string, number>,
    transactions: Transaction[]
  }>();
  
  // Filter for income transactions
  const incomeTransactions = transactions.filter(
    t => t.categoryType === "income" || 
        (t.categoryType === undefined && 
         (t.type === "CREDIT" || t.type === "DEPOSIT" || t.type === "INTEREST"))
  );
  
  // Count total uncategorized before processing
  const initialUncategorized = incomeTransactions.filter(
    t => !t.category || t.category === "Uncategorized"
  ).length;
  
  console.log(`Initial uncategorized income transactions: ${initialUncategorized} of ${incomeTransactions.length}`);
  
  // Log sample transactions to debug categorization
  if (incomeTransactions.length > 0) {
    console.log("Sample income transactions:", 
      incomeTransactions.slice(0, 5).map(t => ({
        description: t.description,
        verboseDescription: t.verboseDescription, 
        category: t.category,
        subCategory: t.subCategory,
        amount: t.amount,
        confidence: t.confidence
      }))
    );
  }
  
  incomeTransactions.forEach(t => {
    // IMPORTANT: Always use Claude's assigned category if available, with fallback to original
    // For income, if the category is missing, try to use "Income" as default
    let category = t.category;
    if (!category || category === "Uncategorized") {
      category = "Other Income Sources";
    }
    
    // Still defaulting if needed
    category = category && category !== "Uncategorized" ? category : "Other Income Sources";
    const subCategory = t.subCategory || "Miscellaneous Income";
    
    // Initialize category if it doesn't exist
    if (!categoryMap.has(category)) {
      categoryMap.set(category, { 
        amount: 0, 
        subcategories: new Map<string, number>,
        transactions: []
      });
    }
    
    // Update category amounts
    const categoryData = categoryMap.get(category)!;
    categoryData.amount += Math.abs(t.amount); // Use absolute value for positive chart values
    categoryData.transactions.push(t);
    
    // Update subcategory amounts
    const currentSubAmount = categoryData.subcategories.get(subCategory) || 0;
    categoryData.subcategories.set(subCategory, currentSubAmount + Math.abs(t.amount));
  });
  
  // Log category distribution
  console.log("Income category distribution:", 
    Array.from(categoryMap.entries()).map(([name, data]) => ({
      name,
      count: data.transactions.length,
      amount: data.amount,
      subcategories: Array.from(data.subcategories.keys())
    }))
  );
  
  // Convert to chart data format
  return Array.from(categoryMap.entries())
    .map(([name, data]) => ({
      name,
      value: data.amount,
      subcategories: Array.from(data.subcategories.entries())
        .map(([subName, amount]) => ({ name: subName, value: amount }))
        .sort((a, b) => b.value - a.value),
      transactions: data.transactions
    }))
    .sort((a, b) => b.value - a.value);
};

// Prepare monthly trend data
export const prepareMonthlyTrendData = (monthlyBreakdown: { month: string; income: number; expenses: number }[]) => {
  if (!monthlyBreakdown) return [];
  
  return monthlyBreakdown.map((item, index, array) => {
    // Format the month for display (e.g., "2023-01" to "Jan 2023")
    const [year, month] = item.month.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    const formattedMonth = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    // Calculate month-over-month change percentages
    let incomeChange = 0;
    let expensesChange = 0;
    
    if (index > 0) {
      const prevMonth = array[index - 1];
      incomeChange = prevMonth.income > 0 
        ? ((item.income - prevMonth.income) / prevMonth.income) * 100 
        : 0;
      expensesChange = prevMonth.expenses > 0 
        ? ((item.expenses - prevMonth.expenses) / prevMonth.expenses) * 100 
        : 0;
    }
    
    return {
      name: formattedMonth,
      income: item.income,
      expenses: item.expenses,
      balance: item.income - item.expenses,
      incomeChange,
      expensesChange
    };
  });
};

// Prepare running balance data
export const prepareBalanceData = (monthlyBreakdown: { month: string; income: number; expenses: number }[]) => {
  if (!monthlyBreakdown) return [];
  
  let runningBalance = 0;
  return monthlyBreakdown.map((item) => {
    // Format the month for display
    const [year, month] = item.month.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    const formattedMonth = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    // Calculate monthly balance and add to running total
    const monthlyBalance = item.income - item.expenses;
    runningBalance += monthlyBalance;
    
    return {
      name: formattedMonth,
      balance: runningBalance,
      monthlyChange: monthlyBalance
    };
  });
};

// Calculate basic stats for the current period
export const calculateCurrentTrends = (monthlyTrendData: any[]) => {
  if (!monthlyTrendData || monthlyTrendData.length < 2) return null;
  
  const currentMonth = monthlyTrendData[monthlyTrendData.length - 1];
  const previousMonth = monthlyTrendData[monthlyTrendData.length - 2];
  
  return {
    incomeChange: ((currentMonth.income - previousMonth.income) / previousMonth.income) * 100,
    expensesChange: ((currentMonth.expenses - previousMonth.expenses) / previousMonth.expenses) * 100,
    balanceChange: currentMonth.balance - previousMonth.balance
  };
};

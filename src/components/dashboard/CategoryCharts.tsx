
import React, { useState } from "react";
import { 
  Card, 
  CardHeader, 
  CardContent, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { 
  PieChart, 
  Pie, 
  Cell, 
  Legend, 
  Tooltip, 
  ResponsiveContainer,
  Label
} from "recharts";
import { formatCurrency } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { PieChartIcon, BarChart, ArrowLeft, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Transaction } from "@/lib/types";

interface CategoryData {
  name: string;
  value: number;
  percentage?: number;
  transactions?: Transaction[];
  subCategories?: Record<string, number>;
}

interface CategoryChartsProps {
  expenseData: CategoryData[];
  incomeData: CategoryData[];
  transactions?: Transaction[];
}

const CategoryCharts: React.FC<CategoryChartsProps> = ({ 
  expenseData: initialExpenseData, 
  incomeData: initialIncomeData,
  transactions = []
}) => {
  // States for drill-down navigation
  const [currentExpenseCategory, setCurrentExpenseCategory] = useState<string | null>(null);
  const [currentIncomeCategory, setCurrentIncomeCategory] = useState<string | null>(null);
  const [expenseLevel, setExpenseLevel] = useState<"main" | "sub">("main");
  const [incomeLevel, setIncomeLevel] = useState<"main" | "sub">("main");
  
  // Define chart colors
  const EXPENSE_COLORS = [
    "#F97316", "#FB923C", "#FDBA74", "#FED7AA", "#FFEDD5",
    "#F43F5E", "#FB7185", "#FDA4AF", "#FECDD3", "#FCE7F3"
  ];
  
  const INCOME_COLORS = [
    "#10B981", "#34D399", "#6EE7B7", "#A7F3D0", "#D1FAE5",
    "#0EA5E9", "#38BDF8", "#7DD3FC", "#BAE6FD", "#E0F2FE"
  ];

  // Prepare category data with subcategories
  const prepareDetailedCategoryData = (type: "expense" | "income") => {
    const isExpense = type === "expense";
    const filteredTransactions = transactions.filter(t => {
      if (isExpense) {
        return t.type === "DEBIT" || t.type === "CHECK" || t.type === "WITHDRAWAL" || t.type === "FEE";
      } else {
        return t.type === "CREDIT" || t.type === "DEPOSIT" || t.type === "INTEREST";
      }
    });

    // Group by main category
    const mainCategories: Record<string, CategoryData> = {};
    
    filteredTransactions.forEach(t => {
      const category = t.category || "Uncategorized";
      
      if (!mainCategories[category]) {
        mainCategories[category] = {
          name: category,
          value: 0,
          transactions: [],
          subCategories: {}
        };
      }
      
      mainCategories[category].value += t.amount;
      mainCategories[category].transactions?.push(t);
      
      // Track subcategories
      if (t.subCategory) {
        const subCategory = t.subCategory;
        mainCategories[category].subCategories = mainCategories[category].subCategories || {};
        mainCategories[category].subCategories[subCategory] = 
          (mainCategories[category].subCategories[subCategory] || 0) + t.amount;
      }
    });
    
    // Convert to array and calculate percentages
    const categoriesArray = Object.values(mainCategories);
    const total = categoriesArray.reduce((sum, cat) => sum + cat.value, 0);
    
    categoriesArray.forEach(category => {
      category.percentage = total > 0 ? (category.value / total) * 100 : 0;
    });
    
    return {
      categories: categoriesArray.sort((a, b) => b.value - a.value),
      total
    };
  };

  // Get subcategory data for drill-down
  const getSubcategoryData = (mainCategory: string, type: "expense" | "income"): CategoryData[] => {
    const isExpense = type === "expense";
    const filteredTransactions = transactions.filter(t => {
      const matchesCategory = t.category === mainCategory;
      if (isExpense) {
        return matchesCategory && (t.type === "DEBIT" || t.type === "CHECK" || t.type === "WITHDRAWAL" || t.type === "FEE");
      } else {
        return matchesCategory && (t.type === "CREDIT" || t.type === "DEPOSIT" || t.type === "INTEREST");
      }
    });
    
    // Group by subcategory
    const subcategories: Record<string, CategoryData> = {};
    
    filteredTransactions.forEach(t => {
      const subCategory = t.subCategory || "Other";
      
      if (!subcategories[subCategory]) {
        subcategories[subCategory] = {
          name: subCategory,
          value: 0,
          transactions: []
        };
      }
      
      subcategories[subCategory].value += t.amount;
      subcategories[subCategory].transactions?.push(t);
    });
    
    // Convert to array and calculate percentages
    const subcategoriesArray = Object.values(subcategories);
    const total = subcategoriesArray.reduce((sum, cat) => sum + cat.value, 0);
    
    subcategoriesArray.forEach(category => {
      category.percentage = total > 0 ? (category.value / total) * 100 : 0;
    });
    
    return subcategoriesArray.sort((a, b) => b.value - a.value);
  };

  // Get current data based on drill-down state
  const { categories: expenseCategories, total: expenseTotal } = prepareDetailedCategoryData("expense");
  const { categories: incomeCategories, total: incomeTotal } = prepareDetailedCategoryData("income");
  
  const currentExpenseData = expenseLevel === "sub" && currentExpenseCategory
    ? getSubcategoryData(currentExpenseCategory, "expense")
    : expenseCategories;
    
  const currentIncomeData = incomeLevel === "sub" && currentIncomeCategory
    ? getSubcategoryData(currentIncomeCategory, "income")
    : incomeCategories;

  // Handle drill-down click for expenses
  const handleExpenseDrillDown = (data: any) => {
    if (expenseLevel === "main" && data?.name) {
      setCurrentExpenseCategory(data.name);
      setExpenseLevel("sub");
    }
  };

  // Handle drill-down click for income
  const handleIncomeDrillDown = (data: any) => {
    if (incomeLevel === "main" && data?.name) {
      setCurrentIncomeCategory(data.name);
      setIncomeLevel("sub");
    }
  };

  // Handle going back to main categories
  const handleExpenseBack = () => {
    setCurrentExpenseCategory(null);
    setExpenseLevel("main");
  };
  
  const handleIncomeBack = () => {
    setCurrentIncomeCategory(null);
    setIncomeLevel("main");
  };
  
  // Custom legend renderer for better formatting
  const renderCustomizedLegend = (props: any) => {
    const { payload } = props;
    
    return (
      <ul className="flex flex-wrap justify-center gap-2 mt-4">
        {payload.map((entry: any, index: number) => (
          <li key={`item-${index}`} className="flex items-center">
            <Badge 
              style={{ backgroundColor: entry.color, color: '#fff' }}
              className="mr-1 whitespace-nowrap"
            >
              {entry.value}
              {entry.payload?.percentage !== undefined && 
                ` (${entry.payload.percentage.toFixed(1)}%)`
              }
            </Badge>
          </li>
        ))}
      </ul>
    );
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Expense Categories Chart */}
      <Card className="dashboard-card animate-fade-in">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <PieChartIcon className="h-5 w-5 mr-2 text-finance-negative" />
                {expenseLevel === "sub" && currentExpenseCategory
                  ? `${currentExpenseCategory} Breakdown`
                  : "Spending by Category"}
              </CardTitle>
              <CardDescription>
                {currentExpenseData.length} {expenseLevel === "sub" ? "subcategories" : "categories"}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total Expenses</div>
              <div className="text-xl font-bold text-finance-negative">{formatCurrency(expenseTotal)}</div>
            </div>
          </div>
          {expenseLevel === "sub" && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 flex items-center" 
              onClick={handleExpenseBack}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to All Categories
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="h-[300px] chart-container">
            {currentExpenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart onClick={expenseLevel === "main" ? handleExpenseDrillDown : undefined}>
                  <Pie
                    data={currentExpenseData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => 
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    isAnimationActive={true}
                    animationDuration={500}
                  >
                    {currentExpenseData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} 
                        className={expenseLevel === "main" ? "cursor-pointer" : ""}
                      />
                    ))}
                    <Label
                      value={expenseLevel === "sub" ? "Subcategories" : "Expenses"}
                      position="center"
                      fill="#333"
                      style={{ fontSize: '14px', fontWeight: 'bold' }}
                    />
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length > 0) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-2 border rounded shadow-sm">
                            <p className="font-bold">{data.name}</p>
                            <p>{formatCurrency(data.value)}</p>
                            <p className="text-xs text-muted-foreground">
                              {data.percentage?.toFixed(1)}% of total
                            </p>
                            {expenseLevel === "main" && data.subCategories && 
                              Object.keys(data.subCategories).length > 0 && (
                                <div className="mt-1 text-xs flex items-center text-blue-500">
                                  <Layers className="h-3 w-3 mr-1" />
                                  Click to view {Object.keys(data.subCategories).length} subcategories
                                </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend content={renderCustomizedLegend} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No expense data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Income Categories Chart */}
      <Card className="dashboard-card animate-fade-in">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <BarChart className="h-5 w-5 mr-2 text-finance-positive" />
                {incomeLevel === "sub" && currentIncomeCategory
                  ? `${currentIncomeCategory} Breakdown`
                  : "Income Sources"}
              </CardTitle>
              <CardDescription>
                {currentIncomeData.length} {incomeLevel === "sub" ? "subcategories" : "categories"}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total Income</div>
              <div className="text-xl font-bold text-finance-positive">{formatCurrency(incomeTotal)}</div>
            </div>
          </div>
          {incomeLevel === "sub" && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 flex items-center" 
              onClick={handleIncomeBack}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to All Categories
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="h-[300px] chart-container">
            {currentIncomeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart onClick={incomeLevel === "main" ? handleIncomeDrillDown : undefined}>
                  <Pie
                    data={currentIncomeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    innerRadius={40}
                    fill="#10B981"
                    dataKey="value"
                    label={({ name, percent }) => 
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    isAnimationActive={true}
                    animationDuration={500}
                  >
                    {currentIncomeData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={INCOME_COLORS[index % INCOME_COLORS.length]} 
                        className={incomeLevel === "main" ? "cursor-pointer" : ""}
                      />
                    ))}
                    <Label
                      value={incomeLevel === "sub" ? "Subcategories" : "Income"}
                      position="center"
                      fill="#333"
                      style={{ fontSize: '14px', fontWeight: 'bold' }}
                    />
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length > 0) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-2 border rounded shadow-sm">
                            <p className="font-bold">{data.name}</p>
                            <p>{formatCurrency(data.value)}</p>
                            <p className="text-xs text-muted-foreground">
                              {data.percentage?.toFixed(1)}% of total
                            </p>
                            {incomeLevel === "main" && data.subCategories && 
                              Object.keys(data.subCategories).length > 0 && (
                                <div className="mt-1 text-xs flex items-center text-blue-500">
                                  <Layers className="h-3 w-3 mr-1" />
                                  Click to view {Object.keys(data.subCategories).length} subcategories
                                </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend content={renderCustomizedLegend} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No income data available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CategoryCharts;

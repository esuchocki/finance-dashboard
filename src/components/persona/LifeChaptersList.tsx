
import React from "react";
import { LifeChapter } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { BookOpen, CalendarRange, TrendingUp, CircleDollarSign, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface LifeChaptersListProps {
  lifeChapters: LifeChapter[];
}

export const LifeChaptersList: React.FC<LifeChaptersListProps> = ({ lifeChapters = [] }) => {
  if (lifeChapters.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Life Chapters</CardTitle>
          <CardDescription>No life chapters identified yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Life chapters are significant periods in your financial journey, such as "College Years," "First Job," or "New Parent." 
            They are identified by analyzing changes in your spending patterns and life events.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort chapters chronologically
  const sortedChapters = [...lifeChapters].sort((a, b) => 
    new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Life Chapters</h2>
        <Badge variant="outline">
          {lifeChapters.length} chapters identified
        </Badge>
      </div>

      <div className="relative pt-4 pb-12">
        {/* Timeline connector */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-muted transform -translate-x-1/2" />
        
        {/* Life chapters timeline */}
        <div className="space-y-12">
          {sortedChapters.map((chapter, index) => (
            <div key={chapter.id} className="relative">
              {/* Timeline dot */}
              <div className="absolute left-1/2 top-0 w-4 h-4 rounded-full bg-primary transform -translate-x-1/2 -translate-y-1/2" />
              
              {/* Chapter content, alternating left/right */}
              <div className={`grid md:grid-cols-2 gap-8 ${index % 2 === 0 ? '' : 'md:rtl'}`}>
                <div className={`md:text-right ${index % 2 !== 0 ? 'md:col-start-2' : ''}`}>
                  <Badge variant="secondary" className="mb-2">
                    {format(new Date(chapter.startDate), "MMM yyyy")} - {
                      chapter.endDate 
                        ? format(new Date(chapter.endDate), "MMM yyyy")
                        : "Present"
                    }
                  </Badge>
                  <h3 className="text-xl font-bold flex md:justify-end items-center gap-2 mb-1">
                    {index % 2 !== 0 && <BookOpen className="h-5 w-5" />}
                    <span>{chapter.title}</span>
                    {index % 2 === 0 && <BookOpen className="h-5 w-5" />}
                  </h3>
                  <p className="text-muted-foreground">{chapter.summary}</p>
                </div>
                
                <Card className={`${index % 2 !== 0 ? 'md:ltr' : ''}`}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Financial metrics */}
                      <div className="space-y-2">
                        <h4 className="font-medium flex items-center gap-2 mb-2">
                          <CircleDollarSign className="h-4 w-4" />
                          Financial Metrics
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Monthly Income</p>
                            <p className="font-medium">
                              ${chapter.financialMetrics.averageMonthlyIncome.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Monthly Expenses</p>
                            <p className="font-medium">
                              ${chapter.financialMetrics.averageMonthlyExpenses.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs text-muted-foreground">Savings Rate</p>
                            <p className="text-xs font-medium">
                              {(chapter.financialMetrics.savingsRate * 100).toFixed(0)}%
                            </p>
                          </div>
                          <Progress value={chapter.financialMetrics.savingsRate * 100} className="h-1.5" />
                        </div>
                      </div>
                      
                      {/* Top expense categories */}
                      {chapter.financialMetrics.topExpenseCategories && 
                       chapter.financialMetrics.topExpenseCategories.length > 0 && (
                        <div>
                          <h4 className="font-medium flex items-center gap-2 mb-2">
                            <TrendingUp className="h-4 w-4" />
                            Top Expenses
                          </h4>
                          <div className="space-y-1.5">
                            {chapter.financialMetrics.topExpenseCategories.slice(0, 3).map((category, i) => (
                              <div key={i} className="flex items-center justify-between">
                                <span className="text-sm">{category.category}</span>
                                <span className="text-sm font-medium">{(category.percentage * 100).toFixed(0)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Key insights */}
                      {chapter.keyFactoids && chapter.keyFactoids.length > 0 && (
                        <div>
                          <h4 className="font-medium flex items-center gap-2 mb-2">
                            <Lightbulb className="h-4 w-4" />
                            Key Insights
                          </h4>
                          <ul className="text-sm space-y-1">
                            {chapter.keyFactoids.slice(0, 3).map((factoid, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-primary">•</span>
                                <span>{factoid}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

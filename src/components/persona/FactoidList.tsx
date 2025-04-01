
import React from "react";
import { Factoid } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Lightbulb, CalendarDays, Tag, BarChart } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FactoidListProps {
  factoids: Factoid[];
}

export const FactoidList: React.FC<FactoidListProps> = ({ factoids = [] }) => {
  if (factoids.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Factoids</CardTitle>
          <CardDescription>No factoids discovered yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Factoids are interesting financial facts about you that are discovered by analyzing your transaction patterns.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group factoids by category
  const groupedFactoids: Record<string, Factoid[]> = {};
  factoids.forEach(factoid => {
    const category = factoid.category || "Uncategorized";
    if (!groupedFactoids[category]) {
      groupedFactoids[category] = [];
    }
    groupedFactoids[category].push(factoid);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Financial Factoids</h2>
        <Badge variant="outline">
          {factoids.length} total factoids
        </Badge>
      </div>

      {Object.entries(groupedFactoids).map(([category, categoryFactoids]) => (
        <div key={category} className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart className="h-5 w-5 text-muted-foreground" />
            {category}
          </h3>
          
          <div className="grid gap-4 md:grid-cols-2">
            {categoryFactoids.map(factoid => (
              <Card key={factoid.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="h-5 w-5 text-amber-500 mt-0.5" />
                      <CardTitle className="text-base">{factoid.content}</CardTitle>
                    </div>
                    <Badge 
                      variant="outline"
                      className={`
                        ${factoid.confidence === 'high' ? 'border-green-500 text-green-600' : 
                          factoid.confidence === 'medium' ? 'border-amber-500 text-amber-600' : 
                          'border-red-500 text-red-600'}
                      `}
                    >
                      {factoid.confidence}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <span>Discovered on {format(new Date(factoid.date), "MMMM d, yyyy")}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Source:</span> {factoid.source}
                    </div>
                    
                    {factoid.tags && factoid.tags.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Tag className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div className="flex flex-wrap gap-1">
                          {factoid.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

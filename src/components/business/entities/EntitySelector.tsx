import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFinance } from "@/context/FinanceContext";
import { CheckSquare, Square } from "lucide-react";

const EntitySelector: React.FC = () => {
  const { businessEntities, selectedEntityIds, setSelectedEntityIds } = useFinance();

  const toggleEntity = (entityId: string) => {
    setSelectedEntityIds(prev =>
      prev.includes(entityId)
        ? prev.filter(id => id !== entityId)
        : [...prev, entityId]
    );
  };

  const selectAll = () => {
    setSelectedEntityIds(businessEntities.map(e => e.id));
  };

  const selectNone = () => {
    setSelectedEntityIds([]);
  };

  if (businessEntities.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Select Entities</CardTitle>
            <CardDescription>
              Choose entities to include in consolidated view
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              <CheckSquare className="h-4 w-4 mr-2" />
              All
            </Button>
            <Button variant="outline" size="sm" onClick={selectNone}>
              <Square className="h-4 w-4 mr-2" />
              None
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {businessEntities.map(entity => (
          <div
            key={entity.id}
            className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
            onClick={() => toggleEntity(entity.id)}
          >
            <Checkbox
              id={entity.id}
              checked={selectedEntityIds.includes(entity.id)}
              onCheckedChange={() => toggleEntity(entity.id)}
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <label
                  htmlFor={entity.id}
                  className="font-medium cursor-pointer"
                >
                  {entity.name}
                </label>
                <Badge variant="outline" className="text-xs">
                  {entity.type}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {entity.transactionCount.toLocaleString()} transactions
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default EntitySelector;

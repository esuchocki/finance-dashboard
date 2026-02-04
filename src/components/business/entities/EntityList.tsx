import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinance } from "@/context/FinanceContext";
import EntityCard from "./EntityCard";
import { Search, Filter, Building2 } from "lucide-react";
import { EntityType } from "@/lib/types";

const EntityList: React.FC = () => {
  const { businessEntities, removeBusinessEntity } = useFinance();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<EntityType | "all">("all");

  const filteredEntities = businessEntities.filter(entity => {
    const matchesSearch = entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          entity.fileSource.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || entity.type === filterType;
    return matchesSearch && matchesType;
  });

  const totalTransactions = businessEntities.reduce((sum, entity) => sum + entity.transactionCount, 0);

  if (businessEntities.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-3">
            <Building2 className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
            <div>
              <h3 className="text-lg font-semibold">No Entities Loaded</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Upload QBO files to get started with multi-entity analysis
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <Card>
        <CardHeader>
          <CardTitle>Loaded Entities</CardTitle>
          <CardDescription>
            {businessEntities.length} {businessEntities.length === 1 ? 'entity' : 'entities'} loaded with {totalTransactions.toLocaleString()} total transactions
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search entities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filterType} onValueChange={(value) => setFilterType(value as EntityType | "all")}>
          <SelectTrigger className="w-full md:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="operating">Operating</SelectItem>
            <SelectItem value="capital">Capital Reserve</SelectItem>
            <SelectItem value="restricted">Restricted Fund</SelectItem>
            <SelectItem value="vendor">Vendor Account</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Entity Cards */}
      {filteredEntities.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No entities match your search criteria
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEntities.map(entity => (
            <EntityCard
              key={entity.id}
              entity={entity}
              onRemove={removeBusinessEntity}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default EntityList;

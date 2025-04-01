
import React, { useState } from "react";
import { NarrativeTransaction } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { CalendarDays, Clock, MapPin, User, Tag, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface NarrativeTransactionListProps {
  narrativeTransactions: NarrativeTransaction[];
}

export const NarrativeTransactionList: React.FC<NarrativeTransactionListProps> = ({ 
  narrativeTransactions = [] 
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filter transactions based on search query
  const filteredTransactions = narrativeTransactions.filter(transaction => {
    const searchLower = searchQuery.toLowerCase();
    return (
      transaction.narrative.toLowerCase().includes(searchLower) ||
      transaction.majorCategory.toLowerCase().includes(searchLower) ||
      transaction.minorCategory.toLowerCase().includes(searchLower) ||
      transaction.name.toLowerCase().includes(searchLower) ||
      transaction.vendor.toLowerCase().includes(searchLower) ||
      transaction.userLocation.toLowerCase().includes(searchLower)
    );
  });
  
  if (narrativeTransactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Narrative Transactions</CardTitle>
          <CardDescription>No narrative transactions available yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Upload transaction data to generate narrative transactions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Narrative Transactions</h2>
        <div className="w-72">
          <Input
            placeholder="Search narratives..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <div className="grid gap-4">
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((transaction) => (
            <Card key={transaction.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{transaction.narrative}</CardTitle>
                    <CardDescription>
                      <span className="font-medium">
                        ${Math.abs(transaction.amount).toFixed(2)}
                      </span>{" "}
                      {transaction.amount < 0 ? "expense" : "income"}
                    </CardDescription>
                  </div>
                  <Badge 
                    variant={transaction.isNotable ? "default" : "outline"} 
                    className={transaction.isNotable ? "bg-amber-500 hover:bg-amber-600" : ""}
                  >
                    {transaction.isNotable ? "Notable" : "Regular"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {format(new Date(transaction.date), "MMMM d, yyyy")}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {transaction.timeOfDay} ({format(new Date(transaction.date), "h:mm a")})
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>Age at transaction: {transaction.userAge} years old</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>Location: {transaction.userLocation || "Unknown"}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {transaction.majorCategory}/{transaction.minorCategory}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">Vendor:</span> {transaction.vendor}
                    </div>
                    
                    <div className="flex items-start gap-2 text-sm">
                      <Tag className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div className="flex-1">
                        {transaction.lifestyleTags && transaction.lifestyleTags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {transaction.lifestyleTags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">No lifestyle tags</span>
                        )}
                      </div>
                    </div>
                    
                    {transaction.lifeContext && (
                      <div className="text-sm mt-2">
                        <span className="font-medium">Context:</span> {transaction.lifeContext}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No transactions match your search criteria
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

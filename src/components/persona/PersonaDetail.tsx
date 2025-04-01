
import React from "react";
import { FinancialPersona, PersonalBackground } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { User, GraduationCap, MapPin, Clock } from "lucide-react";

interface PersonaDetailProps {
  persona: FinancialPersona;
}

export const PersonaDetail: React.FC<PersonaDetailProps> = ({ persona }) => {
  const { personalBackground, rawTransactions, narrativeTransactions, lifeChapters, factoids, lastUpdated } = persona;
  
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Personal Background Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Background
          </CardTitle>
        </CardHeader>
        <CardContent>
          {personalBackground ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">Name</h3>
                <p className="text-lg">{personalBackground.name || "Not provided"}</p>
              </div>
              
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">Birth Date</h3>
                <p className="text-lg">
                  {personalBackground.birthDate 
                    ? format(new Date(personalBackground.birthDate), "MMMM d, yyyy")
                    : "Not provided"}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">Education</h3>
                <div className="flex items-start gap-2">
                  <GraduationCap className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div>
                    {personalBackground.education?.level ? (
                      <>
                        <p className="text-lg">{personalBackground.education.level}</p>
                        {personalBackground.education.school && (
                          <p className="text-muted-foreground">
                            {personalBackground.education.school}
                            {personalBackground.education.major && ` - ${personalBackground.education.major}`}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground italic">No education details provided</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground italic">No personal background available</p>
          )}
        </CardContent>
      </Card>
      
      {/* Location History Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {personalBackground?.locations && personalBackground.locations.length > 0 ? (
            <div className="space-y-4">
              {personalBackground.locations.map(location => (
                <div key={location.id} className="border-l-2 border-primary pl-4 py-1">
                  <p className="font-medium">{location.location}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(location.startDate), "MMM yyyy")} - {
                      location.endDate 
                        ? format(new Date(location.endDate), "MMM yyyy")
                        : "Present"
                    }
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground italic">No location history available</p>
          )}
        </CardContent>
      </Card>
      
      {/* Financial Data Summary Card */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Financial Profile Summary
          </CardTitle>
          <CardDescription>
            Last updated: {lastUpdated ? format(new Date(lastUpdated), "MMMM d, yyyy 'at' h:mm a") : "Never"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="bg-muted rounded-lg p-4 text-center">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Raw Transactions</h3>
              <p className="text-2xl font-bold">{rawTransactions?.length || 0}</p>
            </div>
            
            <div className="bg-muted rounded-lg p-4 text-center">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Narrative Transactions</h3>
              <p className="text-2xl font-bold">{narrativeTransactions?.length || 0}</p>
            </div>
            
            <div className="bg-muted rounded-lg p-4 text-center">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Factoids</h3>
              <p className="text-2xl font-bold">{factoids?.length || 0}</p>
            </div>
            
            <div className="bg-muted rounded-lg p-4 text-center">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Life Chapters</h3>
              <p className="text-2xl font-bold">{lifeChapters?.length || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

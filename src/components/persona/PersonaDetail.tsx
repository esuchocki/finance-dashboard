
import React, { useState } from "react";
import { FinancialPersona, PersonalBackground } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { User, GraduationCap, MapPin, Clock, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackgroundFormDialog } from "@/components/BackgroundFormDialog";
import { useFinance } from "@/context/FinanceContext";
import { toast } from "sonner";

interface PersonaDetailProps {
  persona: FinancialPersona;
}

export const PersonaDetail: React.FC<PersonaDetailProps> = ({ persona }) => {
  const { rawTransactions, narrativeTransactions, lifeChapters, factoids, lastUpdated } = persona;
  const { updatePersonalBackground } = useFinance();
  const [showBackgroundForm, setShowBackgroundForm] = useState(false);
  
  // Convert PersonalBackground to BackgroundFormData format
  const getInitialFormData = () => {
    const { personalBackground } = persona;
    
    if (!personalBackground) return undefined;
    
    return {
      name: personalBackground.name || "",
      birthDate: personalBackground.birthDate ? new Date(personalBackground.birthDate) : null,
      locations: personalBackground.locations.map(loc => ({
        id: loc.id || `loc-${Math.random().toString(36).substring(2, 9)}`,
        place: loc.location || "",
        startDate: loc.startDate ? new Date(loc.startDate) : null,
        endDate: loc.endDate ? new Date(loc.endDate) : null
      })) || [],
      education: {
        level: personalBackground.education?.level || "",
        school: personalBackground.education?.school || "",
        major: personalBackground.education?.major || "",
        graduationDate: null // This field isn't in the PersonalBackground type, so default to null
      }
    };
  };

  const handleSaveBackground = (formData: any) => {
    // Convert BackgroundFormData to PersonalBackground format
    const personalBackground: PersonalBackground = {
      name: formData.name,
      birthDate: formData.birthDate,
      education: {
        level: formData.education.level,
        school: formData.education.school,
        major: formData.education.major
      },
      locations: formData.locations.map((loc: any) => ({
        id: loc.id,
        location: loc.place,
        startDate: loc.startDate,
        endDate: loc.endDate
      }))
    };
    
    console.log("Saving personal background:", personalBackground);
    
    // Update the personal background
    const success = updatePersonalBackground(personalBackground);
    
    if (success) {
      toast.success("Personal background updated successfully");
    } else {
      toast.error("Failed to update personal background");
    }
  };
  
  // Helper function to safely format dates
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "Not provided";
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) return "Invalid date";
      return format(dateObj, "MMMM d, yyyy");
    } catch (error) {
      console.error("Error formatting date:", error, date);
      return "Date error";
    }
  };

  const formatLocationDate = (date: Date | string | null | undefined) => {
    if (!date) return "Present";
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) return "Invalid date";
      return format(dateObj, "MMM yyyy");
    } catch (error) {
      console.error("Error formatting location date:", error, date);
      return "Date error";
    }
  };
  
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Personal Background Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Background
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8"
              onClick={() => setShowBackgroundForm(true)}
            >
              <Edit className="h-4 w-4 mr-1" /> Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {persona.personalBackground ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">Name</h3>
                <p className="text-lg">{persona.personalBackground.name || "Not provided"}</p>
              </div>
              
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">Birth Date</h3>
                <p className="text-lg">
                  {formatDate(persona.personalBackground.birthDate)}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-sm text-muted-foreground">Education</h3>
                <div className="flex items-start gap-2">
                  <GraduationCap className="h-5 w-5 mt-0.5 text-muted-foreground" />
                  <div>
                    {persona.personalBackground.education?.level ? (
                      <>
                        <p className="text-lg">{persona.personalBackground.education.level}</p>
                        {persona.personalBackground.education.school && (
                          <p className="text-muted-foreground">
                            {persona.personalBackground.education.school}
                            {persona.personalBackground.education.major && ` - ${persona.personalBackground.education.major}`}
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
          {persona.personalBackground?.locations && persona.personalBackground.locations.length > 0 ? (
            <div className="space-y-4">
              {persona.personalBackground.locations
                .sort((a, b) => {
                  const aDate = a.startDate instanceof Date ? a.startDate.getTime() : 0;
                  const bDate = b.startDate instanceof Date ? b.startDate.getTime() : 0;
                  return bDate - aDate; // Sort newest first
                })
                .map(location => (
                  <div key={location.id} className="border-l-2 border-primary pl-4 py-1">
                    <p className="font-medium">{location.location || "Unknown location"}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatLocationDate(location.startDate)} - {
                        location.endDate 
                          ? formatLocationDate(location.endDate)
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
            Last updated: {lastUpdated ? formatDate(lastUpdated) : "Never"}
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
      
      {/* Background Form Dialog */}
      <BackgroundFormDialog
        open={showBackgroundForm}
        onOpenChange={setShowBackgroundForm}
        onSubmit={handleSaveBackground}
        initialData={getInitialFormData()}
      />
    </div>
  );
};

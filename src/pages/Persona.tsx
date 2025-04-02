
import React, { useState } from "react";
import { useFinance } from "@/context/FinanceContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { PersonaDetail } from "@/components/persona/PersonaDetail";
import { NarrativeTransactionList } from "@/components/persona/NarrativeTransactionList";
import { FactoidList } from "@/components/persona/FactoidList";
import { LifeChaptersList } from "@/components/persona/LifeChaptersList";
import { BackgroundFormDialog } from "@/components/BackgroundFormDialog";
import { UserCircle2, Plus } from "lucide-react";

const Persona = () => {
  // Get financial persona data from context
  const { financialPersona, updatePersonalBackground } = useFinance();
  const [showBackgroundForm, setShowBackgroundForm] = useState(false);

  // Handle saving background data
  const handleSaveBackground = (formData: any) => {
    // Convert BackgroundFormData to PersonalBackground format
    const personalBackground = {
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
    
    // Update the personal background
    updatePersonalBackground(personalBackground);
  };

  // Handle case when no persona data is available
  if (!financialPersona) {
    return (
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>Financial Persona</CardTitle>
            <CardDescription>
              No personal background information available yet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Complete your personal background information to get started with your financial persona.
            </p>
            <Button 
              onClick={() => setShowBackgroundForm(true)}
              className="mt-4"
            >
              <UserCircle2 className="mr-2 h-4 w-4" />
              Add Personal Information
            </Button>
          </CardContent>
        </Card>
        
        {/* Background Form Dialog for new users */}
        <BackgroundFormDialog
          open={showBackgroundForm}
          onOpenChange={setShowBackgroundForm}
          onSubmit={handleSaveBackground}
        />
      </div>
    );
  }

  // Calculate completion percentage for personal background
  const personalBackground = financialPersona.personalBackground;
  const hasName = !!personalBackground?.name;
  const hasBirthDate = !!personalBackground?.birthDate;
  const hasEducation = !!(personalBackground?.education?.level || personalBackground?.education?.school);
  const hasLocations = !!(personalBackground?.locations && personalBackground.locations.length > 0);
  
  const completedFields = [hasName, hasBirthDate, hasEducation, hasLocations].filter(Boolean).length;
  const totalFields = 4;
  const completionPercentage = Math.round((completedFields / totalFields) * 100);

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Financial Persona</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1">
            Profile {completionPercentage}% Complete
          </Badge>
        </div>
      </div>
      
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="narrative">
            Narrative Transactions
            <Badge variant="secondary" className="ml-2">
              {financialPersona.narrativeTransactions?.length || 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="factoids">
            Factoids
            <Badge variant="secondary" className="ml-2">
              {financialPersona.factoids?.length || 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="chapters">
            Life Chapters
            <Badge variant="secondary" className="ml-2">
              {financialPersona.lifeChapters?.length || 0}
            </Badge>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6 mt-6">
          <PersonaDetail persona={financialPersona} />
        </TabsContent>
        
        <TabsContent value="narrative" className="mt-6">
          <NarrativeTransactionList narrativeTransactions={financialPersona.narrativeTransactions} />
        </TabsContent>
        
        <TabsContent value="factoids" className="mt-6">
          <FactoidList factoids={financialPersona.factoids} />
        </TabsContent>
        
        <TabsContent value="chapters" className="mt-6">
          <LifeChaptersList lifeChapters={financialPersona.lifeChapters} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Persona;


import { useState, useEffect } from 'react';
import { 
  FinancialPersona, 
  PersonalBackground, 
  Transaction,
  NarrativeTransaction,
  LifeChapter,
  Factoid,
  TimeOfDay,
  LifestyleTag
} from '@/lib/types';
import { toast } from "sonner";
import { differenceInYears, isBefore, isAfter } from 'date-fns';
import { determineTimeOfDay } from '@/lib/qbo/transactionUtils';

// Initialize an empty financial persona
const createEmptyFinancialPersona = (): FinancialPersona => ({
  personalBackground: {
    name: '',
    birthDate: new Date(),
    education: {
      level: '',
      school: '',
      major: ''
    },
    locations: []
  },
  rawTransactions: [],
  narrativeTransactions: [],
  lifeChapters: [],
  currentLifeChapter: '',
  factoids: [],
  lastUpdated: new Date()
});

export const useFinancialPersona = () => {
  const [financialPersona, setFinancialPersona] = useState<FinancialPersona>(createEmptyFinancialPersona());
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Load the financial persona from local storage on initialization
  useEffect(() => {
    loadFinancialPersona();
  }, []);
  
  // Load the financial persona from localStorage
  const loadFinancialPersona = (): boolean => {
    try {
      setIsLoading(true);
      
      // First, check for the existing background information
      const backgroundData = localStorage.getItem('financial_persona');
      if (!backgroundData) {
        console.log("No financial persona data found in localStorage");
        setIsInitialized(false);
        return false;
      }
      
      // Try parsing the stored data
      const parsedBackground = JSON.parse(backgroundData) as PersonalBackground;
      
      // Convert date strings to Date objects
      if (typeof parsedBackground.birthDate === 'string') {
        parsedBackground.birthDate = new Date(parsedBackground.birthDate);
      }
      
      parsedBackground.locations = parsedBackground.locations.map(loc => ({
        ...loc,
        startDate: typeof loc.startDate === 'string' ? new Date(loc.startDate) : loc.startDate,
        endDate: loc.endDate ? (typeof loc.endDate === 'string' ? new Date(loc.endDate) : loc.endDate) : null
      }));
      
      // Check for full financial persona data
      const fullPersonaData = localStorage.getItem('full_financial_persona');
      let persona: FinancialPersona;
      
      if (fullPersonaData) {
        // Parse the full persona data
        persona = JSON.parse(fullPersonaData) as FinancialPersona;
        
        // Convert date strings to Date objects
        persona.lastUpdated = new Date(persona.lastUpdated);
        persona.personalBackground = parsedBackground;
        
        // Convert dates in narrative transactions
        persona.narrativeTransactions = persona.narrativeTransactions.map(t => ({
          ...t,
          date: new Date(t.date)
        }));
        
        // Convert dates in life chapters
        persona.lifeChapters = persona.lifeChapters.map(ch => ({
          ...ch,
          startDate: new Date(ch.startDate),
          endDate: ch.endDate ? new Date(ch.endDate) : null,
          majorLifeEvents: ch.majorLifeEvents.map(e => ({
            ...e,
            date: new Date(e.date)
          }))
        }));
        
        // Convert dates in factoids
        persona.factoids = persona.factoids.map(f => ({
          ...f,
          date: new Date(f.date)
        }));
        
        console.log("Loaded full financial persona", persona);
      } else {
        // Create a new financial persona with just the background data
        persona = {
          ...createEmptyFinancialPersona(),
          personalBackground: parsedBackground,
          lastUpdated: new Date()
        };
        console.log("Created new financial persona with existing background data", persona);
      }
      
      setFinancialPersona(persona);
      setIsInitialized(true);
      return true;
    } catch (error) {
      console.error("Error loading financial persona:", error);
      toast.error("Error loading personal data", {
        description: "There was a problem loading your financial persona"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Save the current financial persona to localStorage
  const saveFinancialPersona = () => {
    try {
      const updatedPersona = {
        ...financialPersona,
        lastUpdated: new Date()
      };
      
      // Save the full financial persona
      localStorage.setItem('full_financial_persona', JSON.stringify(updatedPersona));
      
      // Also update the background-only data for compatibility
      localStorage.setItem('financial_persona', JSON.stringify(updatedPersona.personalBackground));
      
      setFinancialPersona(updatedPersona);
      return true;
    } catch (error) {
      console.error("Error saving financial persona:", error);
      toast.error("Error saving personal data", {
        description: "There was a problem saving your financial persona"
      });
      return false;
    }
  };
  
  // Update the personal background data
  const updatePersonalBackground = (personalBackground: PersonalBackground): boolean => {
    try {
      const updatedPersona = {
        ...financialPersona,
        personalBackground,
        lastUpdated: new Date()
      };
      
      setFinancialPersona(updatedPersona);
      
      // Save to localStorage
      localStorage.setItem('full_financial_persona', JSON.stringify(updatedPersona));
      localStorage.setItem('financial_persona', JSON.stringify(personalBackground));
      
      setIsInitialized(true);
      return true;
    } catch (error) {
      console.error("Error updating personal background:", error);
      toast.error("Error saving personal data", {
        description: "There was a problem updating your personal background"
      });
      return false;
    }
  };
  
  // Determine the user's age at a specific date
  const calculateAgeAtDate = (date: Date): number => {
    return differenceInYears(date, financialPersona.personalBackground.birthDate);
  };
  
  // Determine the user's location at a specific date
  const determineLocationAtDate = (date: Date): string => {
    const { locations } = financialPersona.personalBackground;
    
    if (!locations || locations.length === 0) return "Unknown";
    
    // Find the location where the date falls between startDate and endDate (or current)
    const matchedLocation = locations.find(loc => 
      isBefore(loc.startDate, date) && 
      (!loc.endDate || isAfter(loc.endDate, date))
    );
    
    return matchedLocation ? matchedLocation.location : "Unknown";
  };
  
  // Process raw transactions into narrative transactions
  const processTransactionsToNarrative = (transactions: Transaction[]): NarrativeTransaction[] => {
    // This would be expanded with Claude's processing in the future
    const narratives = transactions.map(transaction => {
      const userAge = calculateAgeAtDate(transaction.date);
      const userLocation = determineLocationAtDate(transaction.date);
      
      // Create a basic narrative
      const narrative = `${financialPersona.personalBackground.name} ${
        transaction.amount > 0 ? "received" : "spent"
      } $${Math.abs(transaction.amount).toFixed(2)} ${
        transaction.payee ? `at ${transaction.payee}` : ""
      }`;
      
      // Determine time of day
      const timeOfDay = determineTimeOfDay(transaction.date.toString());
      
      // Return a complete NarrativeTransaction object
      return {
        ...transaction,
        narrative,
        timeOfDay,
        userAge,
        userLocation,
        lifestyleTags: [] as LifestyleTag[],
        transactionTags: transaction.tags || [],
        lifeContext: "",
        isNotable: false,
        relatedFactoids: [],
        majorCategory: transaction.category || "Uncategorized",
        minorCategory: transaction.subCategory || "",
        vendor: transaction.name || transaction.payee || ""
      };
    });
    
    return narratives;
  };
  
  // Update the financial persona with new transactions
  const updateWithTransactions = (transactions: Transaction[]) => {
    setIsLoading(true);
    
    try {
      const narrativeTransactions = processTransactionsToNarrative(transactions);
      
      // For now, we're just updating the raw and narrative transactions
      // Life chapters and factoids would be generated with Claude in later steps
      const updatedPersona = {
        ...financialPersona,
        rawTransactions: transactions,
        narrativeTransactions,
        lastUpdated: new Date()
      };
      
      setFinancialPersona(updatedPersona);
      saveFinancialPersona();
      
      return true;
    } catch (error) {
      console.error("Error updating financial persona with transactions:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Reset the financial persona
  const resetFinancialPersona = () => {
    localStorage.removeItem('full_financial_persona');
    localStorage.removeItem('financial_persona');
    setFinancialPersona(createEmptyFinancialPersona());
    setIsInitialized(false);
  };
  
  return {
    financialPersona,
    isInitialized,
    isLoading,
    loadFinancialPersona,
    saveFinancialPersona,
    updateWithTransactions,
    resetFinancialPersona,
    calculateAgeAtDate,
    determineLocationAtDate,
    updatePersonalBackground
  };
};

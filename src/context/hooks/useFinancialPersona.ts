import { useState } from 'react';
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

  const updatePersonalBackground = (personalBackground: PersonalBackground): boolean => {
    try {
      const updatedPersona: FinancialPersona = {
        ...financialPersona,
        personalBackground,
        lastUpdated: new Date()
      };

      setFinancialPersona(updatedPersona);
      toast.success("Personal background updated");
      return true;
    } catch (error) {
      console.error("Error updating personal background:", error);
      toast.error("Failed to update personal background");
      return false;
    }
  };

  const updateRawTransactions = (transactions: Transaction[]): boolean => {
    try {
      const updatedPersona: FinancialPersona = {
        ...financialPersona,
        rawTransactions: transactions,
        lastUpdated: new Date()
      };

      setFinancialPersona(updatedPersona);
      return true;
    } catch (error) {
      console.error("Error updating transactions:", error);
      return false;
    }
  };

  const updateNarrativeTransactions = (narrativeTransactions: NarrativeTransaction[]): boolean => {
    try {
      const updatedPersona: FinancialPersona = {
        ...financialPersona,
        narrativeTransactions,
        lastUpdated: new Date()
      };

      setFinancialPersona(updatedPersona);
      return true;
    } catch (error) {
      console.error("Error updating narrative transactions:", error);
      return false;
    }
  };

  const updateLifeChapters = (lifeChapters: LifeChapter[]): boolean => {
    try {
      const updatedPersona: FinancialPersona = {
        ...financialPersona,
        lifeChapters,
        lastUpdated: new Date()
      };

      setFinancialPersona(updatedPersona);
      return true;
    } catch (error) {
      console.error("Error updating life chapters:", error);
      return false;
    }
  };

  const updateFactoids = (factoids: Factoid[]): boolean => {
    try {
      const updatedPersona: FinancialPersona = {
        ...financialPersona,
        factoids,
        lastUpdated: new Date()
      };

      setFinancialPersona(updatedPersona);
      return true;
    } catch (error) {
      console.error("Error updating factoids:", error);
      return false;
    }
  };

  const clearPersona = (): void => {
    setFinancialPersona(createEmptyFinancialPersona());
  };

  return {
    financialPersona,
    updatePersonalBackground,
    updateRawTransactions,
    updateNarrativeTransactions,
    updateLifeChapters,
    updateFactoids,
    clearPersona
  };
};


import React, { createContext, useContext } from 'react';
import { 
  Transaction, 
  TransactionFilterOptions,
  FinancialSummary,
  FinancialPersona,
  PersonalBackground
} from '@/lib/types';
import { useFinanceUpload } from '@/context/hooks/useFinanceUpload';
import { useTransactionFilters } from '@/context/hooks/useTransactionFilters';
import { useFinanceSummary } from '@/context/hooks/useFinanceSummary';
import { useFinanceInsights } from '@/context/hooks/useFinanceInsights';
import { useFinancialPersona } from '@/context/hooks/useFinancialPersona';

// Define the shape of our finance context
interface FinanceContextType {
  // File uploads and transactions
  uploadedFiles: string[];
  transactions: Transaction[];
  isLoading: boolean;
  isProcessingQbo: boolean;
  uploadProgress: number;
  handleFileUpload: (files: File[]) => Promise<void>;
  clearTransactions: () => void;
  
  // Transaction filtering
  filteredTransactions: Transaction[];
  filterOptions: TransactionFilterOptions;
  updateFilterOptions: (updates: Partial<TransactionFilterOptions>) => void;
  clearFilters: () => void;
  
  // Financial summary
  financialSummary: FinancialSummary | null;
  updateDateRange: (startDate: Date, endDate: Date) => void;
  
  // Financial insights
  generateInsights: () => Promise<void>;
  isGeneratingInsights: boolean;
  hasGeneratedInsights: boolean;
  
  // Claude API
  claudeApiKey: string | null;
  setClaudeApiKey: (key: string | null) => void;
  isApiKeyValid: boolean;
  isValidatingApiKey: boolean;
  
  // Financial persona
  financialPersona: FinancialPersona | null;
  updatePersonalBackground: (personalBackground: PersonalBackground) => boolean;
}

// Create the context
const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

// Provider component
export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use our custom hooks to manage different aspects of the finance data
  const {
    uploadedFiles,
    transactions,
    isLoading,
    isProcessingQbo,
    uploadProgress,
    handleFileUpload,
    clearTransactions,
    claudeApiKey,
    setClaudeApiKey,
    isApiKeyValid,
    isValidatingApiKey,
  } = useFinanceUpload();
  
  const {
    filteredTransactions,
    filterOptions,
    updateFilterOptions,
    clearFilters,
  } = useTransactionFilters(transactions);
  
  const {
    financialSummary,
    updateDateRange,
  } = useFinanceSummary(filteredTransactions);
  
  const {
    generateInsights,
    isGeneratingInsights,
    hasGeneratedInsights,
  } = useFinanceInsights(financialSummary);
  
  const {
    financialPersona,
    updatePersonalBackground,
  } = useFinancialPersona();
  
  // Combine all values into the context
  const contextValue: FinanceContextType = {
    uploadedFiles,
    transactions,
    isLoading,
    isProcessingQbo,
    uploadProgress,
    handleFileUpload,
    clearTransactions,
    
    filteredTransactions,
    filterOptions,
    updateFilterOptions,
    clearFilters,
    
    financialSummary,
    updateDateRange,
    
    generateInsights,
    isGeneratingInsights,
    hasGeneratedInsights,
    
    claudeApiKey,
    setClaudeApiKey,
    isApiKeyValid,
    isValidatingApiKey,
    
    financialPersona,
    updatePersonalBackground,
  };
  
  return (
    <FinanceContext.Provider value={contextValue}>
      {children}
    </FinanceContext.Provider>
  );
};

// Custom hook for using the context
export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};

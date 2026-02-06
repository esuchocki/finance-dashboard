
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Transaction,
  TransactionFilterOptions,
  FinancialSummary,
  FinancialPersona,
  PersonalBackground,
  FinancialInsight,
  AppMode,
  BankAccount,
  BusinessTransaction,
  AccountType
} from '@/lib/types';
import type { VendorGranularity } from '@/lib/types';
import { useFinanceUpload } from '@/context/hooks/useFinanceUpload';
import { useTransactionFilters } from '@/context/hooks/useTransactionFilters';
import { useFinanceSummary } from '@/context/hooks/useFinanceSummary';
import { useFinanceInsights } from '@/context/hooks/useFinanceInsights';
import { useFinancialPersona } from '@/context/hooks/useFinancialPersona';
import { useBusinessAccounts } from '@/context/hooks/useBusinessAccounts';

// Define the shape of our finance context
interface FinanceContextType {
  // App mode
  appMode: AppMode;

  // File uploads and transactions
  uploadedFiles: string[];
  transactions: Transaction[];
  isLoading: boolean;
  isProcessingQbo: boolean;
  uploadProgress: number;
  handleFileUpload: (files: File[]) => Promise<void>;
  clearTransactions: () => void;
  error: string | null;
  isUsingCache: boolean;

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
  insights: FinancialInsight[];

  // Claude API
  claudeApiKey: string | null;
  setClaudeApiKey: (key: string | null) => void;
  isApiKeyValid: boolean;
  isValidatingApiKey: boolean;

  // Financial persona
  financialPersona: FinancialPersona | null;
  updatePersonalBackground: (personalBackground: PersonalBackground) => boolean;

  // Business accounts (for business mode)
  businessAccounts: BankAccount[];
  addBusinessAccount: (file: File, accountName: string, accountType: AccountType, institutionName: string) => Promise<void>;
  removeBusinessAccount: (accountId: string) => void;
  getAccountTransactions: (accountId: string) => BusinessTransaction[];
  updateBusinessAccount: (accountId: string, updates: Partial<BankAccount>) => void;
  clearAllBusinessAccounts: () => void;
  selectedAccountIds: string[];
  setSelectedAccountIds: (accountIds: string[]) => void;

  // Vendor analytics preferences
  vendorGranularity: VendorGranularity;
  setVendorGranularity: (granularity: VendorGranularity) => void;

  // Additional properties used by components
  summary: FinancialSummary | null; // Alias for financialSummary
  clearData: () => void; // Alias for clearTransactions

  // These properties are used in components but missing from context definition
  uploadQBOFile: (file: File) => Promise<void>;
  isDevelopmentMode: boolean;
  toggleDevelopmentMode: () => void;
  filters: TransactionFilterOptions;
  updateFilters: (updates: Partial<TransactionFilterOptions>) => void;
  resetFilters: () => void;
  applyPresetDateRange: (preset: string) => void;
  stats: { minAmount: number; maxAmount: number } | null;
}

// Create the context
const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

// Provider component
interface FinanceProviderProps {
  children: React.ReactNode;
  mode?: AppMode;
}

export const FinanceProvider: React.FC<FinanceProviderProps> = ({
  children,
  mode = 'personal'
}) => {
  // State for development mode toggle
  const [developmentMode, setDevelopmentMode] = useState<boolean>(false);

  // State for selected business accounts
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  // State for vendor granularity
  const [vendorGranularity, setVendorGranularity] = useState<VendorGranularity>('standard');

  // Persist vendor granularity to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('vendorGranularity');
    const validGranularities: VendorGranularity[] = ['detailed', 'standard', 'consolidated'];
    if (saved && validGranularities.includes(saved as VendorGranularity)) {
      setVendorGranularity(saved as VendorGranularity);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('vendorGranularity', vendorGranularity);
  }, [vendorGranularity]);

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
    uploadQBOFile,
    error,
    isUsingCache
  } = useFinanceUpload(developmentMode);

  // Business accounts hook (only used in business mode)
  const {
    accounts: businessAccounts,
    isLoading: isLoadingAccounts,
    error: accountsError,
    addAccount,
    removeAccount,
    getAccountTransactions,
    updateAccount,
    clearAllAccounts
  } = useBusinessAccounts(claudeApiKey);
  
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
    insights
  } = useFinanceInsights(financialSummary);
  
  const {
    financialPersona,
    updatePersonalBackground,
  } = useFinancialPersona();
  
  // Toggle development mode
  const toggleDevelopmentMode = () => {
    setDevelopmentMode(prev => !prev);
  };
  
  // Calculate basic stats for filters
  const stats = transactions.length > 0 
    ? {
        minAmount: Math.min(...transactions.map(t => t.amount)),
        maxAmount: Math.max(...transactions.map(t => t.amount))
      }
    : null;
  
  // Helper function for preset date ranges
  const applyPresetDateRange = (preset: string) => {
    const now = new Date();
    let start: Date, end: Date;
    
    switch (preset) {
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'last3Months':
        start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        end = new Date();
        break;
      case 'lastYear':
        start = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        end = new Date();
        break;
      case 'ytd':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date();
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date();
    }
    
    updateFilterOptions({
      dateRange: { start, end }
    });
    
    updateDateRange(start, end);
  };
  
  // Combine all values into the context
  const contextValue: FinanceContextType = {
    appMode: mode,

    uploadedFiles,
    transactions,
    isLoading: isLoading || isLoadingAccounts,
    isProcessingQbo,
    uploadProgress,
    handleFileUpload,
    clearTransactions,
    error: error || accountsError,
    isUsingCache,

    filteredTransactions,
    filterOptions,
    updateFilterOptions,
    clearFilters,

    financialSummary,
    updateDateRange,

    generateInsights,
    isGeneratingInsights,
    hasGeneratedInsights,
    insights,

    claudeApiKey,
    setClaudeApiKey,
    isApiKeyValid,
    isValidatingApiKey,

    financialPersona,
    updatePersonalBackground,

    // Business accounts
    businessAccounts,
    addBusinessAccount: addAccount,
    removeBusinessAccount: removeAccount,
    getAccountTransactions,
    updateBusinessAccount: updateAccount,
    clearAllBusinessAccounts: clearAllAccounts,
    selectedAccountIds,
    setSelectedAccountIds,

    // Vendor analytics preferences
    vendorGranularity,
    setVendorGranularity,

    // Aliases for backward compatibility with existing components
    summary: financialSummary,
    clearData: clearTransactions,

    // Additional properties needed by components
    uploadQBOFile,
    isDevelopmentMode: developmentMode,
    toggleDevelopmentMode,
    filters: filterOptions,
    updateFilters: updateFilterOptions,
    resetFilters: clearFilters,
    applyPresetDateRange,
    stats
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

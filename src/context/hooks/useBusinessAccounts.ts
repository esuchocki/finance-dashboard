import { useState, useCallback, useEffect } from 'react';
import { BankAccount, BusinessTransaction, AccountType, Transaction } from '@/lib/types';
import { parseQBOFile } from '@/lib/qboParser';
import { parseIIFFile, isIIFFile } from '@/lib/iif/parser';
import { enhanceTransactionsWithClaude } from '@/lib/claudeService';
import { toast } from 'sonner';

// localStorage keys for business accounts
const ACCOUNTS_LIST_KEY = 'business_accounts_list';
const ACCOUNT_DATA_PREFIX = 'business_account_';

interface UseBusinessAccountsResult {
  accounts: BankAccount[];
  isLoading: boolean;
  error: string | null;
  addAccount: (file: File, accountName: string, accountType: AccountType, institutionName: string) => Promise<void>;
  removeAccount: (accountId: string) => void;
  getAccountTransactions: (accountId: string) => BusinessTransaction[];
  updateAccount: (accountId: string, updates: Partial<BankAccount>) => void;
  clearAllAccounts: () => void;
}

export const useBusinessAccounts = (claudeApiKey: string | null): UseBusinessAccountsResult => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load accounts from localStorage on mount
  useEffect(() => {
    loadAccountsFromStorage();
  }, []);

  // Save accounts to localStorage whenever they change
  useEffect(() => {
    if (accounts.length > 0) {
      saveAccountsToStorage();
    }
  }, [accounts]);

  const loadAccountsFromStorage = () => {
    try {
      const stored = localStorage.getItem(ACCOUNTS_LIST_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        const accountsWithDates = parsed.map((account: any) => ({
          ...account,
          dateUploaded: new Date(account.dateUploaded),
          dateRange: {
            start: new Date(account.dateRange.start),
            end: new Date(account.dateRange.end)
          }
        }));
        setAccounts(accountsWithDates);
      }
    } catch (err) {
      console.error('Error loading accounts from storage:', err);
      setError('Failed to load saved accounts');
    }
  };

  const saveAccountsToStorage = () => {
    try {
      localStorage.setItem(ACCOUNTS_LIST_KEY, JSON.stringify(accounts));
    } catch (err) {
      console.error('Error saving accounts to storage:', err);
      toast.error('Failed to save accounts');
    }
  };

  const saveAccountTransactions = (accountId: string, transactions: BusinessTransaction[]) => {
    try {
      const key = `${ACCOUNT_DATA_PREFIX}${accountId}_transactions`;
      localStorage.setItem(key, JSON.stringify(transactions));
    } catch (err) {
      console.error('Error saving account transactions:', err);
      throw new Error('Failed to save transaction data. localStorage may be full.');
    }
  };

  const getAccountTransactions = useCallback((accountId: string): BusinessTransaction[] => {
    try {
      const key = `${ACCOUNT_DATA_PREFIX}${accountId}_transactions`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        return parsed.map((tx: any) => ({
          ...tx,
          date: new Date(tx.date)
        }));
      }
      return [];
    } catch (err) {
      console.error('Error loading account transactions:', err);
      return [];
    }
  }, []);

  const addAccount = async (
    file: File,
    accountName: string,
    accountType: AccountType = 'checking',
    institutionName: string = 'Unknown Bank'
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Read file content
      const fileContent = await file.text();

      // Detect file type and parse accordingly
      let transactions: Transaction[];
      if (isIIFFile(fileContent)) {
        console.log('Detected IIF file, parsing...');
        transactions = parseIIFFile(fileContent);
      } else {
        console.log('Detected QBO file, parsing...');
        transactions = await parseQBOFile(fileContent);
      }

      if (transactions.length === 0) {
        throw new Error('No transactions found in file');
      }

      console.log(`Parsed ${transactions.length} transactions from ${file.name}`);

      // Enhance transactions with Claude if API key is available
      if (claudeApiKey) {
        toast.info('Enhancing transactions with Claude AI...', {
          duration: 3000
        });
        transactions = await enhanceTransactionsWithClaude(transactions, claudeApiKey);
      }

      // Generate unique account ID
      const accountId = `account_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Calculate date range
      const dates = transactions.map(t => t.date.getTime());
      const dateRange = {
        start: new Date(Math.min(...dates)),
        end: new Date(Math.max(...dates))
      };

      // Convert transactions to BusinessTransaction format
      const businessTransactions: BusinessTransaction[] = transactions.map(tx => ({
        ...tx,
        accountId,
        accountName,
        institutionName,
        fundType: 'unrestricted', // Default to unrestricted
        functionalCategory: undefined,
        isIntercompany: false
      }));

      // Create account metadata
      const newAccount: BankAccount = {
        id: accountId,
        name: accountName,
        institutionName,
        accountType,
        fileSource: file.name,
        dateUploaded: new Date(),
        transactionCount: transactions.length,
        dateRange,
        currency: 'USD'
      };

      // Save transactions to localStorage
      saveAccountTransactions(accountId, businessTransactions);

      // Add account to list
      setAccounts(prev => [...prev, newAccount]);

      toast.success(`Account "${accountName}" added successfully`, {
        description: `${transactions.length} transactions loaded from ${institutionName}`
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process file';
      setError(errorMessage);
      toast.error('Failed to add account', {
        description: errorMessage
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const removeAccount = (accountId: string) => {
    try {
      // Remove transactions from localStorage
      const txKey = `${ACCOUNT_DATA_PREFIX}${accountId}_transactions`;
      localStorage.removeItem(txKey);

      // Remove account from list
      setAccounts(prev => prev.filter(a => a.id !== accountId));

      toast.success('Account removed successfully');
    } catch (err) {
      console.error('Error removing account:', err);
      toast.error('Failed to remove account');
    }
  };

  const updateAccount = (accountId: string, updates: Partial<BankAccount>) => {
    setAccounts(prev =>
      prev.map(account =>
        account.id === accountId
          ? { ...account, ...updates }
          : account
      )
    );
  };

  const clearAllAccounts = () => {
    try {
      // Remove all account data from localStorage
      accounts.forEach(account => {
        const txKey = `${ACCOUNT_DATA_PREFIX}${account.id}_transactions`;
        localStorage.removeItem(txKey);
      });

      // Clear accounts list
      localStorage.removeItem(ACCOUNTS_LIST_KEY);
      setAccounts([]);

      toast.success('All accounts cleared');
    } catch (err) {
      console.error('Error clearing accounts:', err);
      toast.error('Failed to clear accounts');
    }
  };

  return {
    accounts,
    isLoading,
    error,
    addAccount,
    removeAccount,
    getAccountTransactions,
    updateAccount,
    clearAllAccounts
  };
};

/**
 * Business Accounts Hook - Session Only
 *
 * All data stored in memory only (no persistence between sessions).
 * Data cleared when browser closes.
 */

import { useState, useCallback } from 'react';
import { BankAccount, BusinessTransaction, AccountType, Transaction } from '@/lib/types';
import { parseQBOFile } from '@/lib/qboParser';
import { parseIIFFile, isIIFFile } from '@/lib/iif/parser';
import { toast } from 'sonner';

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

export const useBusinessAccounts = (): UseBusinessAccountsResult => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [accountTransactions, setAccountTransactions] = useState<Map<string, BusinessTransaction[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAccountTransactions = useCallback((accountId: string): BusinessTransaction[] => {
    return accountTransactions.get(accountId) || [];
  }, [accountTransactions]);

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

      console.log(`Parsed ${transactions.length} transactions from ${file.name} (stored in memory only)`);

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

      // Store transactions in memory
      setAccountTransactions(prev => {
        const newMap = new Map(prev);
        newMap.set(accountId, businessTransactions);
        return newMap;
      });

      // Add account to list
      setAccounts(prev => [...prev, newAccount]);

      toast.success(`Account "${accountName}" added successfully`, {
        description: `${transactions.length} transactions loaded (session only)`
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
      // Remove transactions from memory
      setAccountTransactions(prev => {
        const newMap = new Map(prev);
        newMap.delete(accountId);
        return newMap;
      });

      // Remove account from list
      setAccounts(prev => prev.filter(a => a.id !== accountId));

      toast.success('Account removed from session');
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
      setAccountTransactions(new Map());
      setAccounts([]);
      toast.success('All accounts cleared from session');
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

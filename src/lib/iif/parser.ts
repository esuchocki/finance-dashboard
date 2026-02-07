import { BusinessTransaction } from '@/lib/types';

/**
 * Parse PayPal IIF (Intuit Interchange Format) files
 * IIF is a tab-delimited text format used by QuickBooks and PayPal
 */

interface IIFTransaction {
  date: Date;
  payee: string;
  memo: string;
  amount: number;
  account: string;
  category: string;
  type: string;
  cleared: boolean;
}

export function parseIIFFile(fileContent: string): BusinessTransaction[] {
  const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  const transactions: BusinessTransaction[] = [];
  let currentTransaction: Partial<IIFTransaction> | null = null;
  let transactionId = 0;

  // Find header lines to understand column positions
  let trnsHeaderColumns: string[] = [];
  let splHeaderColumns: string[] = [];

  for (const line of lines) {
    const parts = line.split('\t');
    const recordType = parts[0];

    // Parse header lines
    if (recordType === '!TRNS') {
      trnsHeaderColumns = parts;
      continue;
    }
    if (recordType === '!SPL') {
      splHeaderColumns = parts;
      continue;
    }
    if (recordType === '!ENDTRNS') {
      continue;
    }

    // Parse TRNS (main transaction line)
    if (recordType === 'TRNS') {
      if (currentTransaction) {
        // Save previous transaction if exists
        const tx = buildTransaction(currentTransaction, transactionId++);
        if (tx) transactions.push(tx);
      }

      // Start new transaction
      currentTransaction = {};

      // Parse TRNS fields
      const dateIdx = trnsHeaderColumns.indexOf('DATE');
      const nameIdx = trnsHeaderColumns.indexOf('NAME');
      const memoIdx = trnsHeaderColumns.indexOf('MEMO');
      const amountIdx = trnsHeaderColumns.indexOf('AMOUNT');
      const accountIdx = trnsHeaderColumns.indexOf('ACCNT');
      const clearIdx = trnsHeaderColumns.indexOf('CLEAR');

      if (dateIdx >= 0 && parts[dateIdx]) {
        currentTransaction.date = parseIIFDate(parts[dateIdx]);
      }
      if (nameIdx >= 0 && parts[nameIdx]) {
        currentTransaction.payee = parts[nameIdx].replace(/^"|"$/g, '').trim();
      }
      if (memoIdx >= 0 && parts[memoIdx]) {
        currentTransaction.memo = parts[memoIdx].replace(/^"|"$/g, '').trim();
      }
      if (amountIdx >= 0 && parts[amountIdx]) {
        // Remove quotes and commas from amount before parsing
        const cleanAmount = parts[amountIdx].replace(/^"|"$/g, '').replace(/,/g, '');
        currentTransaction.amount = parseFloat(cleanAmount) || 0;
      }
      if (accountIdx >= 0 && parts[accountIdx]) {
        currentTransaction.account = parts[accountIdx].replace(/^"|"$/g, '').trim();
      }
      if (clearIdx >= 0 && parts[clearIdx]) {
        currentTransaction.cleared = parts[clearIdx] === 'X' || parts[clearIdx] === 'Y';
      }
    }

    // Parse SPL (split/category line)
    if (recordType === 'SPL' && currentTransaction) {
      const accountIdx = splHeaderColumns.indexOf('ACCNT');
      const amountIdx = splHeaderColumns.indexOf('AMOUNT');

      if (accountIdx >= 0 && parts[accountIdx]) {
        const account = parts[accountIdx].replace(/^"|"$/g, '').trim();
        // The SPL line contains the category/account for the expense
        if (account && !account.toLowerCase().includes('paypal')) {
          currentTransaction.category = account;
        }
      }

      // If amount is in SPL, use it to determine the gross amount (before fees)
      // But preserve the sign from the TRNS line which indicates direction
      if (amountIdx >= 0 && parts[amountIdx] && currentTransaction.amount !== undefined) {
        // Remove quotes and commas from amount before parsing
        const cleanAmount = parts[amountIdx].replace(/^"|"$/g, '').replace(/,/g, '');
        const splAmount = parseFloat(cleanAmount) || 0;
        const trnsSign = currentTransaction.amount >= 0 ? 1 : -1;

        // Use the larger absolute value but keep the sign from TRNS
        if (Math.abs(splAmount) > Math.abs(currentTransaction.amount)) {
          currentTransaction.amount = Math.abs(splAmount) * trnsSign;
        }
      }
    }

    // End of transaction
    if (recordType === 'ENDTRNS' && currentTransaction) {
      const tx = buildTransaction(currentTransaction, transactionId++);
      if (tx) transactions.push(tx);
      currentTransaction = null;
    }
  }

  // Handle last transaction if file doesn't end with ENDTRNS
  if (currentTransaction) {
    const tx = buildTransaction(currentTransaction, transactionId++);
    if (tx) transactions.push(tx);
  }

  return transactions;
}

function parseIIFDate(dateStr: string): Date {
  // IIF dates are typically in format: MM/DD/YYYY or MM/DD/YY
  // They may be wrapped in quotes, so strip them first
  const cleanDateStr = dateStr.replace(/^"|"$/g, '').trim();

  const parts = cleanDateStr.split('/');
  if (parts.length === 3) {
    const month = parseInt(parts[0], 10) - 1; // JS months are 0-indexed
    const day = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);

    // Handle 2-digit years
    if (year < 100) {
      year += year < 50 ? 2000 : 1900;
    }

    return new Date(year, month, day);
  }

  // Fallback to standard date parsing
  return new Date(cleanDateStr);
}

function buildTransaction(partial: Partial<IIFTransaction>, id: number): BusinessTransaction | null {
  if (!partial.date || !partial.amount) {
    return null;
  }

  const amount = Math.abs(partial.amount);
  const isCredit = partial.amount > 0;

  return {
    id: `iif-${id}`,
    date: partial.date,
    amount: amount,
    type: isCredit ? 'CREDIT' : 'DEBIT',
    name: partial.payee || 'Unknown',
    payee: partial.payee || 'Unknown',
    description: partial.memo || '',
    category: partial.category || 'Uncategorized',
    categoryType: isCredit ? 'income' : 'expense',

    // Business transaction fields
    accountId: '',
    accountName: '',
    institutionName: 'PayPal',
    fundType: 'unrestricted',
    isIntercompany: false,

    // Additional fields
    memo: partial.memo,
    cleared: partial.account === 'PayPal',
    checkNumber: undefined,
    subCategory: undefined,
    balance: undefined,
    isRecurring: false,
    tags: [],
    confidence: undefined,
    verboseDescription: partial.memo
  };
}

/**
 * Detect if a file is an IIF file by checking its content
 */
export function isIIFFile(content: string): boolean {
  const firstLine = content.split('\n')[0]?.trim() || '';
  return firstLine.startsWith('!TRNS') || firstLine.startsWith('!SPL') || firstLine.includes('\t!TRNS');
}

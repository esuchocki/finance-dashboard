/**
 * Transaction Validation Layer
 *
 * Validates transaction data quality on import to catch:
 * - Invalid dates
 * - Invalid amounts (negative, zero, unreasonably large)
 * - Missing required fields
 * - Duplicate IDs
 * - Data type mismatches
 */

import { Transaction, BusinessTransaction } from '@/lib/types';
import { isValidDate, isReasonableDate } from '@/lib/dateUtils';
import { isValidAmount } from '@/lib/safeMath';

export interface ValidationError {
  transactionId: string;
  field: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validate a single transaction
 */
export function validateTransaction(
  tx: Transaction | BusinessTransaction
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Validate ID
  if (!tx.id || typeof tx.id !== 'string' || tx.id.trim() === '') {
    errors.push({
      transactionId: tx.id || 'unknown',
      field: 'id',
      severity: 'error',
      message: 'Transaction ID is missing or invalid'
    });
  }

  // Validate date
  if (!isValidDate(tx.date)) {
    errors.push({
      transactionId: tx.id,
      field: 'date',
      severity: 'error',
      message: `Invalid date: ${tx.date}`
    });
  } else if (!isReasonableDate(tx.date)) {
    warnings.push({
      transactionId: tx.id,
      field: 'date',
      severity: 'warning',
      message: `Date outside reasonable range: ${tx.date.toISOString()}`
    });
  }

  // Validate amount
  if (!isValidAmount(tx.amount)) {
    errors.push({
      transactionId: tx.id,
      field: 'amount',
      severity: 'error',
      message: `Invalid amount: ${tx.amount} (NaN or Infinity)`
    });
  } else {
    // Check for negative amounts (should be positive with categoryType indicating direction)
    if (tx.amount < 0) {
      warnings.push({
        transactionId: tx.id,
        field: 'amount',
        severity: 'warning',
        message: `Negative amount: ${tx.amount}. Amounts should be positive with categoryType indicating income/expense`
      });
    }

    // Check for zero amounts
    if (tx.amount === 0) {
      warnings.push({
        transactionId: tx.id,
        field: 'amount',
        severity: 'warning',
        message: 'Zero amount transaction'
      });
    }

    // Check for unreasonably large amounts (>$10M)
    if (tx.amount > 10_000_000) {
      warnings.push({
        transactionId: tx.id,
        field: 'amount',
        severity: 'warning',
        message: `Unusually large amount: $${tx.amount.toLocaleString()}. Verify this is correct.`
      });
    }

    // Check for very small amounts (<$0.01)
    if (tx.amount > 0 && tx.amount < 0.01) {
      warnings.push({
        transactionId: tx.id,
        field: 'amount',
        severity: 'warning',
        message: `Very small amount: $${tx.amount}. Possible data entry error?`
      });
    }
  }

  // Validate categoryType
  if (!tx.categoryType || !['income', 'expense', 'transfer'].includes(tx.categoryType)) {
    errors.push({
      transactionId: tx.id,
      field: 'categoryType',
      severity: 'error',
      message: `Invalid categoryType: "${tx.categoryType}". Must be "income", "expense", or "transfer"`
    });
  }

  // Validate required string fields
  const requiredStringFields: (keyof Transaction)[] = ['name', 'category'];
  for (const field of requiredStringFields) {
    const value = tx[field];
    if (!value || typeof value !== 'string' || value.trim() === '') {
      warnings.push({
        transactionId: tx.id,
        field,
        severity: 'warning',
        message: `Missing or empty ${field}`
      });
    }
  }

  // Validate BusinessTransaction-specific fields
  if ('accountId' in tx) {
    const btx = tx as BusinessTransaction;

    if (!btx.accountId || typeof btx.accountId !== 'string' || btx.accountId.trim() === '') {
      errors.push({
        transactionId: tx.id,
        field: 'accountId',
        severity: 'error',
        message: 'Business transaction missing accountId'
      });
    }

    if (!btx.accountName || typeof btx.accountName !== 'string' || btx.accountName.trim() === '') {
      warnings.push({
        transactionId: tx.id,
        field: 'accountName',
        severity: 'warning',
        message: 'Business transaction missing accountName'
      });
    }

    if (!btx.institutionName || typeof btx.institutionName !== 'string') {
      warnings.push({
        transactionId: tx.id,
        field: 'institutionName',
        severity: 'warning',
        message: 'Business transaction missing institutionName'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate a batch of transactions
 * Also checks for duplicate IDs across the batch
 */
export function validateTransactionBatch(
  transactions: (Transaction | BusinessTransaction)[]
): {
  results: Map<string, ValidationResult>;
  duplicateIds: string[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    totalErrors: number;
    totalWarnings: number;
  };
} {
  const results = new Map<string, ValidationResult>();
  const idCounts = new Map<string, number>();
  const duplicateIds: string[] = [];

  // Track ID occurrences
  for (const tx of transactions) {
    const count = idCounts.get(tx.id) || 0;
    idCounts.set(tx.id, count + 1);
  }

  // Find duplicates
  for (const [id, count] of idCounts.entries()) {
    if (count > 1) {
      duplicateIds.push(id);
    }
  }

  // Validate each transaction
  let totalErrors = 0;
  let totalWarnings = 0;
  let valid = 0;
  let invalid = 0;

  for (const tx of transactions) {
    const result = validateTransaction(tx);

    // Add duplicate ID error if applicable
    if (duplicateIds.includes(tx.id)) {
      result.errors.push({
        transactionId: tx.id,
        field: 'id',
        severity: 'error',
        message: `Duplicate transaction ID: ${tx.id} appears ${idCounts.get(tx.id)} times`
      });
      result.isValid = false;
    }

    results.set(tx.id, result);

    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;

    if (result.isValid) {
      valid++;
    } else {
      invalid++;
    }
  }

  return {
    results,
    duplicateIds,
    summary: {
      total: transactions.length,
      valid,
      invalid,
      totalErrors,
      totalWarnings
    }
  };
}

/**
 * Format validation results for display
 */
export function formatValidationReport(
  validation: ReturnType<typeof validateTransactionBatch>
): string {
  const { summary, duplicateIds } = validation;

  const lines: string[] = [];
  lines.push('Transaction Validation Report');
  lines.push('='.repeat(50));
  lines.push(`Total Transactions: ${summary.total}`);
  lines.push(`Valid: ${summary.valid}`);
  lines.push(`Invalid: ${summary.invalid}`);
  lines.push(`Total Errors: ${summary.totalErrors}`);
  lines.push(`Total Warnings: ${summary.totalWarnings}`);

  if (duplicateIds.length > 0) {
    lines.push('');
    lines.push(`Duplicate IDs Found: ${duplicateIds.length}`);
    lines.push(duplicateIds.slice(0, 10).join(', '));
    if (duplicateIds.length > 10) {
      lines.push(`... and ${duplicateIds.length - 10} more`);
    }
  }

  return lines.join('\n');
}

/**
 * Filter out invalid transactions and return only valid ones
 * Also logs all errors and warnings
 */
export function filterValidTransactions<T extends Transaction | BusinessTransaction>(
  transactions: T[]
): {
  valid: T[];
  invalid: T[];
  validation: ReturnType<typeof validateTransactionBatch>;
} {
  const validation = validateTransactionBatch(transactions);
  const valid: T[] = [];
  const invalid: T[] = [];

  for (const tx of transactions) {
    const result = validation.results.get(tx.id);
    if (result && result.isValid) {
      valid.push(tx);
    } else {
      invalid.push(tx);
    }
  }

  // Log validation results
  if (validation.summary.invalid > 0) {
    console.warn(formatValidationReport(validation));

    // Log first 5 errors in detail
    let errorCount = 0;
    for (const [txId, result] of validation.results.entries()) {
      if (result.errors.length > 0 && errorCount < 5) {
        console.error(`Transaction ${txId} errors:`, result.errors);
        errorCount++;
      }
    }
  }

  if (validation.summary.totalWarnings > 0) {
    console.info(`${validation.summary.totalWarnings} warnings found during validation`);
  }

  return { valid, invalid, validation };
}

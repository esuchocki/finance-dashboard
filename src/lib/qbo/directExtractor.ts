
import { Transaction, TransactionType } from '../types';
import { categoryPatterns, locationPatterns } from './categoryPatterns';
import { createTransactionFromData, parseQBODate } from './transactionUtils';

// Extract transactions directly from the XML string for better performance
export function extractTransactionsDirectly(xmlContent: string): Transaction[] {
  const transactions: Transaction[] = [];
  const stmtTrnPattern = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
  const fieldPattern = /<(\w+)>([\s\S]*?)(?=<\/\1>|<\w+>)/g;
  
  let match;
  while ((match = stmtTrnPattern.exec(xmlContent)) !== null) {
    const trnContent = match[1];
    const trnData: Record<string, string> = {};
    
    let fieldMatch;
    while ((fieldMatch = fieldPattern.exec(trnContent)) !== null) {
      const [, fieldName, fieldValue] = fieldMatch;
      trnData[fieldName] = fieldValue.trim();
    }
    
    const transaction = createTransactionFromData(trnData);
    if (transaction) {
      transactions.push(transaction);
    }
  }
  
  return transactions;
}

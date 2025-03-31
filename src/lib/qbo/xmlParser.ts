
import { XMLParser } from "fast-xml-parser";
import { Transaction } from '../types';
import { processTransactionsInBatches } from './transactionUtils';

// Fallback to XML parser with minimal options
export function parseWithXMLParser(xmlContent: string): Transaction[] {
  const parser = new XMLParser({
    ignoreAttributes: true,
    isArray: (name) => name === "STMTTRN",
    parseTagValue: false,
    trimValues: true
  });
  
  const result = parser.parse(xmlContent);
  const xmlTransactions = findSTMTTRNArrayInParsedXML(result);
  
  if (xmlTransactions && xmlTransactions.length > 0) {
    console.log(`Found ${xmlTransactions.length} transactions using XML parser`);
    return processTransactionsInBatches(xmlTransactions, 50);
  } else {
    console.error("No transactions found in QBO file");
    return [];
  }
}

// Fallback XML parsing approach
export function findSTMTTRNArrayInParsedXML(obj: any): any[] {
  if (!obj) return [];
  
  // Common paths to look for transaction arrays
  const paths = [
    ['OFX', 'BANKMSGSRSV1', 'STMTTRNRS', 'STMTRS', 'BANKTRANLIST', 'STMTTRN'],
    ['OFX', 'CREDITCARDMSGSRSV1', 'CCSTMTTRNRS', 'CCSTMTRS', 'BANKTRANLIST', 'STMTTRN'],
    ['OFX', 'BANKMSGSRSV1', 'STMTRS', 'BANKTRANLIST', 'STMTTRN']
  ];
  
  // Try each path
  for (const path of paths) {
    let current = obj;
    let valid = true;
    
    for (let i = 0; i < path.length; i++) {
      if (!current || !current[path[i]]) {
        valid = false;
        break;
      }
      current = current[path[i]];
    }
    
    if (valid && Array.isArray(current)) {
      return current;
    }
  }
  
  // Last resort: search for STMTTRN array anywhere in the object
  if (obj.OFX) {
    const result = searchForSTMTTRNArray(obj.OFX);
    if (result.length > 0) return result;
  }
  
  return [];
}

// Non-recursive search for STMTTRN arrays
export function searchForSTMTTRNArray(obj: any): any[] {
  if (!obj || typeof obj !== 'object') return [];
  
  // Check direct properties
  if (obj.STMTTRN && Array.isArray(obj.STMTTRN)) {
    return obj.STMTTRN;
  }
  
  // Check BANKTRANLIST property
  if (obj.BANKTRANLIST && obj.BANKTRANLIST.STMTTRN && Array.isArray(obj.BANKTRANLIST.STMTTRN)) {
    return obj.BANKTRANLIST.STMTTRN;
  }
  
  // Check first-level properties
  for (const key in obj) {
    if (obj[key] && typeof obj[key] === 'object') {
      if (obj[key].STMTTRN && Array.isArray(obj[key].STMTTRN)) {
        return obj[key].STMTTRN;
      }
      if (obj[key].BANKTRANLIST && 
          obj[key].BANKTRANLIST.STMTTRN && 
          Array.isArray(obj[key].BANKTRANLIST.STMTTRN)) {
        return obj[key].BANKTRANLIST.STMTTRN;
      }
    }
  }
  
  return [];
}

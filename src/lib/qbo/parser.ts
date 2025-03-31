
import { Transaction } from '../types';
import { extractTransactionsDirectly } from './directExtractor';
import { parseWithXMLParser } from './xmlParser';

// Main parser function
export function parseQBOFile(fileContent: string): Transaction[] {
  try {
    // Basic validation check
    if (!fileContent || fileContent.length < 100) {
      throw new Error("Invalid QBO file: File content too short");
    }
    
    // Check if the file is QBO format with headers
    const isQBO = fileContent.includes("OFXHEADER:") || fileContent.includes("<OFX>");
    
    if (!isQBO) {
      throw new Error("Invalid file format: Not a QBO file");
    }
    
    // Extract XML content from QBO file
    const ofxStartIndex = fileContent.indexOf("<OFX>");
    if (ofxStartIndex === -1) {
      throw new Error("Invalid QBO file: Missing <OFX> tag");
    }
    
    // Extract just the XML part
    const xmlContent = fileContent.substring(ofxStartIndex);
    
    console.log("Processing QBO file...");
    
    // Simplified direct extraction approach 
    // Instead of using complex XML parsing, directly extract transactions using string manipulation
    // This is much faster than deep XML parsing for large files
    const transactions = extractTransactionsDirectly(xmlContent);
    
    if (!transactions || transactions.length === 0) {
      console.log("No transactions found using direct extraction, trying XML parser as fallback");
      
      try {
        return parseWithXMLParser(xmlContent);
      } catch (parseError) {
        console.error("XML parsing error:", parseError);
        throw new Error(`Failed to parse QBO XML content: ${(parseError as Error).message}`);
      }
    }
    
    console.log(`Found ${transactions.length} transactions in QBO file using direct extraction`);
    return transactions;
    
  } catch (error) {
    console.error("Error parsing QBO file:", error);
    throw new Error(`Failed to parse QBO file: ${(error as Error).message}`);
  }
}

// Export the XML parser and direct extractor for use in other modules if needed
export * from './directExtractor';
export * from './xmlParser';

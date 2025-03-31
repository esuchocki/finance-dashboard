
import { useState } from 'react';
import { Transaction, FinancialSummary, FinancialInsight } from "@/lib/types";
import { parseQBOFile } from "@/lib/qbo";
import { toast } from "sonner";
import { enhanceTransactionsWithClaude, hasClaudeApiKey } from "@/lib/claudeService";
import { calculateSummary } from "./useFinanceSummary";
import { generateInsights } from "./useFinanceInsights";

export const useFinanceUpload = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [insights, setInsights] = useState<FinancialInsight[]>([]);

  const uploadQBOFile = async (file: File): Promise<number> => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log("Starting QBO file upload and parsing");
      const content = await file.text();
      let parsedTransactions = parseQBOFile(content);
      
      // Enhanced categorization with Claude if API key is available
      if (hasClaudeApiKey()) {
        try {
          toast.info("Starting transaction categorization with Claude AI", {
            description: "This may take a moment for larger datasets",
            duration: 5000
          });
          
          // Wait for Claude AI to enhance the transactions
          parsedTransactions = await enhanceTransactionsWithClaude(parsedTransactions);
          console.log(`Transactions enhanced: ${parsedTransactions.length}`);
          
          // Check if categorization was successful
          const categorizedCount = parsedTransactions.filter(t => 
            t.category && t.category !== "Uncategorized"
          ).length;
          
          const categorizedPercent = Math.round((categorizedCount / parsedTransactions.length) * 100);
          
          // Count unique categories for better feedback
          const uniqueCategories = new Set(parsedTransactions.map(t => t.category)).size;
          
          if (categorizedPercent < 50) {
            toast.warning("Limited categorization success", {
              description: `Only ${categorizedPercent}% of transactions were successfully categorized`,
              duration: 5000
            });
          } else {
            toast.success("Transactions categorized successfully", {
              description: `${categorizedPercent}% of transactions were categorized into ${uniqueCategories} categories`,
              duration: 5000
            });
          }
        } catch (error) {
          console.error("Error enhancing transactions with Claude:", error);
          toast.error("Could not enhance all transactions with Claude AI", {
            description: "Using basic categorization instead for some transactions"
          });
          // We continue with partial results rather than failing completely
        }
      } else {
        toast.info("Add a Claude API key to enhance transaction categorization", {
          description: "Click the 'Add Claude API' button in the navbar"
        });
      }
      
      // Sort by date descending
      parsedTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());
      
      // Safety check to ensure we have valid transactions
      if (!Array.isArray(parsedTransactions) || parsedTransactions.length === 0) {
        throw new Error("No valid transactions found in the file");
      }
      
      // Log a sample transaction to debug categorization issues
      if (parsedTransactions.length > 0) {
        console.log("Sample transaction:", JSON.stringify(parsedTransactions[0], null, 2));
      }
      
      console.log(`Setting ${parsedTransactions.length} transactions`);
      setTransactions(parsedTransactions);
      setFilteredTransactions(parsedTransactions);
      
      const transactionCount = parsedTransactions.length;
      
      // Only calculate summary and generate insights if we have transactions
      if (transactionCount > 0) {
        try {
          // Calculate summary
          console.log("Calculating financial summary");
          const newSummary = calculateSummary(parsedTransactions);
          setSummary(newSummary);
          
          // Generate insights
          console.log("Generating financial insights");
          const newInsights = generateInsights(parsedTransactions, newSummary);
          setInsights(newInsights);
          
          const dateRange = newSummary.dateRange;
          const formattedStartDate = dateRange.start.toLocaleDateString();
          const formattedEndDate = dateRange.end.toLocaleDateString();
          
          toast.success(
            `Imported ${transactionCount} transactions from ${formattedStartDate} to ${formattedEndDate}.`
          );
          
          // Show key insights as toasts for immediate feedback
          if (newInsights.length > 0) {
            setTimeout(() => {
              // Only show one key insight for now to avoid overwhelming the user
              const keyInsight = newInsights.find(i => i.type === "warning") || newInsights[0];
              if (keyInsight) {
                toast.info(`${keyInsight.title}: ${keyInsight.description}`);
              }
            }, 1000);
          }
        } catch (error) {
          console.error("Error processing transaction data:", error);
          toast.error("Error processing transaction data", {
            description: "The data was imported but could not be fully analyzed"
          });
          // We continue with the transactions, even if summary/insights failed
        }
      } else {
        setSummary(null);
        setInsights([]);
        throw new Error("No transactions found in the file. Please check the file format.");
      }
      
      return transactionCount;
    } catch (error) {
      console.error("Error uploading QBO file:", error);
      setError((error as Error).message);
      toast.error(`Error uploading file: ${(error as Error).message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const clearData = () => {
    setTransactions([]);
    setFilteredTransactions([]);
    setSummary(null);
    setInsights([]);
    toast.success("Data cleared. You can now upload a new file.");
  };

  return {
    transactions,
    setTransactions,
    filteredTransactions,
    setFilteredTransactions,
    isLoading,
    error,
    summary,
    setSummary,
    insights,
    setInsights,
    uploadQBOFile,
    clearData
  };
};

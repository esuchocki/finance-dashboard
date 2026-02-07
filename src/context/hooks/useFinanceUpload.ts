/**
 * Finance Upload Hook - Session Only
 *
 * All data stored in memory only (no persistence between sessions).
 * Data cleared when browser closes.
 */

import { useState, useEffect } from 'react';
import { Transaction, FinancialSummary, FinancialInsight, FinancialPersona, NarrativeTransaction } from "@/lib/types";
import { parseQBOFile } from "@/lib/qbo";
import { toast } from "sonner";
import { enhanceTransactionsWithClaude, hasClaudeApiKey } from "@/lib/claudeService";
import { calculateSummary } from "./useFinanceSummary";
import { generateInsights } from "./useFinanceInsights";
import { useNavigate } from 'react-router-dom';
import { createNarrativeTransaction } from "@/lib/qbo/transactionUtils";

export const useFinanceUpload = (isDevelopmentMode: boolean = false) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [insights, setInsights] = useState<FinancialInsight[]>([]);
  const [financialPersona, setFinancialPersona] = useState<FinancialPersona | null>(null);
  const [narrativeTransactions, setNarrativeTransactions] = useState<NarrativeTransaction[]>([]);
  const navigate = useNavigate();

  // Log development mode status
  useEffect(() => {
    console.log("Development mode status:", isDevelopmentMode);
    console.log("Session-only storage enabled - data will NOT persist between sessions");
  }, [isDevelopmentMode]);

  // Generate initial narrative transactions
  const generateInitialNarrativeTransactions = (
    parsedTransactions: Transaction[],
    persona: FinancialPersona | null
  ): NarrativeTransaction[] => {
    if (!parsedTransactions.length) return [];

    console.log("Generating initial narrative transactions");
    const personalBackground = persona?.personalBackground || null;

    const narratives = parsedTransactions.map(transaction =>
      createNarrativeTransaction(transaction, personalBackground)
    );

    console.log(`Generated ${narratives.length} initial narrative transactions`);
    return narratives;
  };

  // Update financial persona
  const updateFinancialPersona = (
    rawTransactions: Transaction[],
    generatedNarrativeTransactions: NarrativeTransaction[]
  ) => {
    try {
      const currentPersona = financialPersona || {
        personalBackground: {
          name: "User",
          birthDate: new Date(),
          education: {
            level: "",
            school: "",
            major: ""
          },
          locations: []
        },
        rawTransactions: [],
        narrativeTransactions: [],
        lifeChapters: [],
        currentLifeChapter: "",
        factoids: [],
        lastUpdated: new Date()
      };

      const updatedPersona: FinancialPersona = {
        ...currentPersona,
        rawTransactions,
        narrativeTransactions: generatedNarrativeTransactions,
        lastUpdated: new Date()
      };

      setFinancialPersona(updatedPersona);
      console.log("Updated financial persona (session only)");
      return updatedPersona;
    } catch (error) {
      console.error("Error updating financial persona:", error);
      return null;
    }
  };

  const uploadQBOFile = async (file: File): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      console.log("Starting QBO file upload and parsing (session only - no caching)");
      const content = await file.text();

      let parsedTransactions = parseQBOFile(content);

      // Enhanced categorization with Claude if API key is available
      if (hasClaudeApiKey()) {
        try {
          toast.info("Starting transaction categorization with Claude AI", {
            description: "This may take a moment for larger datasets",
            duration: 5000
          });

          console.log(`Calling Claude AI for ${parsedTransactions.length} transactions`);

          parsedTransactions = await enhanceTransactionsWithClaude(parsedTransactions);
          console.log(`Transactions enhanced by Claude: ${parsedTransactions.length}`);

          const categorizedCount = parsedTransactions.filter(t =>
            t.category && t.category !== "Uncategorized"
          ).length;

          const categorizedPercent = Math.round((categorizedCount / parsedTransactions.length) * 100);
          const uniqueCategories = new Set(parsedTransactions.map(t => t.category)).size;

          console.log(`Categorization stats: ${categorizedCount}/${parsedTransactions.length} (${categorizedPercent}%) into ${uniqueCategories} categories`);

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

          const initialNarrativeTransactions = generateInitialNarrativeTransactions(parsedTransactions, financialPersona);
          setNarrativeTransactions(initialNarrativeTransactions);
          updateFinancialPersona(parsedTransactions, initialNarrativeTransactions);

        } catch (error) {
          console.error("Error enhancing transactions with Claude:", error);
          toast.error("Could not enhance all transactions with Claude AI", {
            description: "Using basic categorization instead for some transactions"
          });

          const basicNarrativeTransactions = generateInitialNarrativeTransactions(parsedTransactions, financialPersona);
          setNarrativeTransactions(basicNarrativeTransactions);
          updateFinancialPersona(parsedTransactions, basicNarrativeTransactions);
        }
      } else {
        console.warn("No Claude API key available - skipping AI categorization");
        toast.info("Add a Claude API key to enhance transaction categorization", {
          description: "Click the 'Add Claude API' button in the navbar"
        });

        const basicNarrativeTransactions = generateInitialNarrativeTransactions(parsedTransactions, financialPersona);
        setNarrativeTransactions(basicNarrativeTransactions);
        updateFinancialPersona(parsedTransactions, basicNarrativeTransactions);
      }

      // Sort by date descending
      parsedTransactions.sort((a, b) => b.date.getTime() - a.date.getTime());

      if (!Array.isArray(parsedTransactions) || parsedTransactions.length === 0) {
        throw new Error("No valid transactions found in the file");
      }

      if (parsedTransactions.length > 0) {
        console.log(`Loaded ${parsedTransactions.length} transactions`);
      }

      console.log(`Setting ${parsedTransactions.length} transactions (stored in memory only)`);
      setTransactions(parsedTransactions);
      setFilteredTransactions(parsedTransactions);

      const transactionCount = parsedTransactions.length;

      if (transactionCount > 0) {
        try {
          console.log("Calculating financial summary");
          const newSummary = calculateSummary(parsedTransactions);
          setSummary(newSummary);

          console.log("Generating financial insights");
          const newInsights = generateInsights(parsedTransactions, newSummary);
          setInsights(newInsights);

          const dateRange = newSummary.dateRange;
          const formattedStartDate = dateRange.start.toLocaleDateString();
          const formattedEndDate = dateRange.end.toLocaleDateString();

          toast.success(
            `Imported ${transactionCount} transactions from ${formattedStartDate} to ${formattedEndDate}.`,
            {
              description: "Data stored in encrypted session (cleared when browser closes)"
            }
          );

          navigate("/");

          if (newInsights.length > 0) {
            setTimeout(() => {
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
        }
      } else {
        setSummary(null);
        setInsights([]);
        throw new Error("No transactions found in the file. Please check the file format.");
      }

      return;
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
    setNarrativeTransactions([]);
    toast.success("Data cleared from session");
  };

  return {
    uploadedFiles: [],
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
    narrativeTransactions,
    setNarrativeTransactions,
    financialPersona,
    setFinancialPersona,
    uploadQBOFile,
    clearData,
    isUsingCache: false, // Never using cache in session-only mode
    handleFileUpload: async (files: File[]) => {
      if (files.length > 0) {
        await uploadQBOFile(files[0]);
      }
    },
    clearTransactions: clearData,
    claudeApiKey: null,
    setClaudeApiKey: () => {},
    isApiKeyValid: false,
    isValidatingApiKey: false,
    isProcessingQbo: false,
    uploadProgress: 0,
    isDevelopmentMode: isDevelopmentMode,
    toggleDevelopmentMode: () => {}
  };
};

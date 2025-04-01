
import { useState, useEffect } from 'react';
import { Transaction, FinancialSummary, FinancialInsight, FinancialPersona, NarrativeTransaction } from "@/lib/types";
import { parseQBOFile } from "@/lib/qbo";
import { toast } from "sonner";
import { enhanceTransactionsWithClaude, hasClaudeApiKey } from "@/lib/claudeService";
import { calculateSummary } from "./useFinanceSummary";
import { generateInsights } from "./useFinanceInsights";
import { useNavigate } from 'react-router-dom';
import { createNarrativeTransaction } from "@/lib/qbo/transactionUtils";

// Cache key for localStorage
const TRANSACTION_CACHE_KEY = 'financeDashboard_transactionCache';
const CACHE_EXPIRY_KEY = 'financeDashboard_cacheExpiry';
const CACHE_EXPIRY_HOURS = 24; // Cache data for 24 hours
const FINANCIAL_PERSONA_KEY = 'financial_persona';

export const useFinanceUpload = (isDevelopmentMode: boolean = false) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [insights, setInsights] = useState<FinancialInsight[]>([]);
  const [isUsingCache, setIsUsingCache] = useState(false);
  const [financialPersona, setFinancialPersona] = useState<FinancialPersona | null>(null);
  const [narrativeTransactions, setNarrativeTransactions] = useState<NarrativeTransaction[]>([]);
  const navigate = useNavigate();

  // Load financial persona from localStorage
  useEffect(() => {
    const loadFinancialPersona = () => {
      try {
        const savedData = localStorage.getItem(FINANCIAL_PERSONA_KEY);
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          
          // Convert date strings back to Date objects for proper usage
          if (parsedData.personalBackground) {
            if (parsedData.personalBackground.birthDate) {
              parsedData.personalBackground.birthDate = new Date(parsedData.personalBackground.birthDate);
            }
            
            if (Array.isArray(parsedData.personalBackground.locations)) {
              parsedData.personalBackground.locations = parsedData.personalBackground.locations.map((loc: any) => ({
                ...loc,
                startDate: new Date(loc.startDate),
                endDate: loc.endDate ? new Date(loc.endDate) : null
              }));
            }
          }
          
          // Initialize other arrays if they don't exist
          if (!parsedData.narrativeTransactions) parsedData.narrativeTransactions = [];
          if (!parsedData.lifeChapters) parsedData.lifeChapters = [];
          if (!parsedData.factoids) parsedData.factoids = [];
          if (!parsedData.rawTransactions) parsedData.rawTransactions = [];
          
          parsedData.lastUpdated = new Date();
          
          setFinancialPersona(parsedData);
          console.log("Loaded financial persona from localStorage:", parsedData);
          
          return parsedData;
        }
      } catch (error) {
        console.error("Error loading financial persona:", error);
      }
      return null;
    };
    
    loadFinancialPersona();
  }, []);

  // Log development mode status whenever it changes
  useEffect(() => {
    console.log("Development mode status:", isDevelopmentMode);
  }, [isDevelopmentMode]);

  // Check for cached data on initial load
  useEffect(() => {
    const loadCachedData = () => {
      // Skip loading cache in development mode
      if (isDevelopmentMode) {
        console.log("Development mode enabled - skipping cache load");
        return false;
      }

      try {
        const cachedDataJson = localStorage.getItem(TRANSACTION_CACHE_KEY);
        if (!cachedDataJson) return false;
        
        // Check if cache has expired
        const expiryTime = localStorage.getItem(CACHE_EXPIRY_KEY);
        if (expiryTime && new Date().getTime() > parseInt(expiryTime)) {
          console.log("Cache expired, will refresh data on next upload");
          return false;
        }
        
        const cachedData = JSON.parse(cachedDataJson);
        
        // Validate cache structure
        if (!cachedData || !Array.isArray(cachedData.transactions) || !cachedData.summary) {
          console.log("Invalid cache structure, will refresh data on next upload");
          return false;
        }
        
        // Convert date strings back to Date objects for transactions
        const parsedTransactions = cachedData.transactions.map((t: any) => ({
          ...t,
          date: new Date(t.date)
        }));
        
        // Convert date strings back to Date objects for summary
        const parsedSummary = {
          ...cachedData.summary,
          dateRange: {
            start: new Date(cachedData.summary.dateRange.start),
            end: new Date(cachedData.summary.dateRange.end)
          }
        };
        
        // Handle largest transaction date conversion if present
        if (parsedSummary.largestTransaction) {
          parsedSummary.largestTransaction.date = new Date(parsedSummary.largestTransaction.date);
        }
        
        // Handle largest expense/income date conversion if present
        if (parsedSummary.largestExpense) {
          parsedSummary.largestExpense.date = new Date(parsedSummary.largestExpense.date);
        }
        if (parsedSummary.largestIncome) {
          parsedSummary.largestIncome.date = new Date(parsedSummary.largestIncome.date);
        }
        
        // Handle recurring expenses date conversion
        if (Array.isArray(parsedSummary.recurringExpenses)) {
          parsedSummary.recurringExpenses = parsedSummary.recurringExpenses.map((t: any) => ({
            ...t,
            date: new Date(t.date)
          }));
        }
        
        // Convert narrative transactions if they exist
        let parsedNarrativeTransactions: NarrativeTransaction[] = [];
        if (cachedData.narrativeTransactions && Array.isArray(cachedData.narrativeTransactions)) {
          parsedNarrativeTransactions = cachedData.narrativeTransactions.map((t: any) => ({
            ...t,
            date: new Date(t.date)
          }));
          setNarrativeTransactions(parsedNarrativeTransactions);
        }
        
        console.log(`Loaded ${parsedTransactions.length} transactions from cache`);
        setTransactions(parsedTransactions);
        setFilteredTransactions(parsedTransactions);
        setSummary(parsedSummary);
        setInsights(cachedData.insights || []);
        setIsUsingCache(true);
        
        toast.info("Using cached financial data", {
          description: "New data will be processed when you upload a new file"
        });
        
        return true;
      } catch (err) {
        console.error("Error loading cached data:", err);
        return false;
      }
    };
    
    loadCachedData();
  }, [isDevelopmentMode]);

  // Cache the current data
  const cacheCurrentData = (
    currentTransactions: Transaction[], 
    currentSummary: FinancialSummary,
    currentInsights: FinancialInsight[],
    currentNarrativeTransactions: NarrativeTransaction[] = []
  ) => {
    // Skip caching in development mode
    if (isDevelopmentMode) {
      console.log("Development mode enabled - skipping cache storage");
      return;
    }
    
    try {
      const dataToCache = {
        transactions: currentTransactions,
        summary: currentSummary,
        insights: currentInsights,
        narrativeTransactions: currentNarrativeTransactions
      };
      
      localStorage.setItem(TRANSACTION_CACHE_KEY, JSON.stringify(dataToCache));
      
      // Set expiry time
      const expiryTime = new Date().getTime() + (CACHE_EXPIRY_HOURS * 60 * 60 * 1000);
      localStorage.setItem(CACHE_EXPIRY_KEY, expiryTime.toString());
      
      console.log(`Cached ${currentTransactions.length} transactions successfully`);
    } catch (err) {
      console.error("Error caching data:", err);
      // Non-critical error, so just log it
    }
  };

  // Create initial narrative transactions from regular transactions
  const generateInitialNarrativeTransactions = (
    parsedTransactions: Transaction[],
    persona: FinancialPersona | null
  ): NarrativeTransaction[] => {
    if (!parsedTransactions.length) return [];
    
    console.log("Generating initial narrative transactions");
    
    // Extract personal background or use null if not available
    const personalBackground = persona?.personalBackground || null;
    
    // Create narrative transaction for each regular transaction
    const narratives = parsedTransactions.map(transaction => 
      createNarrativeTransaction(transaction, personalBackground)
    );
    
    console.log(`Generated ${narratives.length} initial narrative transactions`);
    return narratives;
  };

  // Update financial persona with new data
  const updateFinancialPersona = (
    rawTransactions: Transaction[],
    generatedNarrativeTransactions: NarrativeTransaction[]
  ) => {
    try {
      // Get existing persona or create a new one
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
      
      // Update with new transactions
      const updatedPersona: FinancialPersona = {
        ...currentPersona,
        rawTransactions,
        narrativeTransactions: generatedNarrativeTransactions,
        lastUpdated: new Date()
      };
      
      // Save to state and localStorage
      setFinancialPersona(updatedPersona);
      localStorage.setItem(FINANCIAL_PERSONA_KEY, JSON.stringify(updatedPersona));
      
      console.log("Updated financial persona:", updatedPersona);
      return updatedPersona;
    } catch (error) {
      console.error("Error updating financial persona:", error);
      return null;
    }
  };

  const uploadQBOFile = async (file: File): Promise<number> => {
    try {
      setIsLoading(true);
      setError(null);
      setIsUsingCache(false);
      
      console.log("Starting QBO file upload and parsing");
      const content = await file.text();
      
      // Generate a simple hash of the file content to check if it's the same file
      const contentHash = btoa(content.slice(0, 1000)).substring(0, 20);
      const cachedHash = localStorage.getItem('financeDashboard_lastFileHash');
      
      console.log("File content hash:", contentHash);
      console.log("Previous file hash:", cachedHash);
      console.log("Development mode active:", isDevelopmentMode);
      
      // Only use file cache detection in non-development mode
      if (!isDevelopmentMode && contentHash === cachedHash) {
        toast.info("This appears to be the same file you uploaded before", {
          description: "Using cached data for faster processing"
        });
      }
      
      // Store the hash for next time
      localStorage.setItem('financeDashboard_lastFileHash', contentHash);
      
      let parsedTransactions = parseQBOFile(content);
      
      // Enhanced categorization with Claude if API key is available
      if (hasClaudeApiKey()) {
        try {
          toast.info("Starting transaction categorization with Claude AI", {
            description: isDevelopmentMode ? 
              "Development mode enabled - all transactions will be re-categorized" : 
              "This may take a moment for larger datasets",
            duration: 5000
          });
          
          console.log(`Calling Claude AI for ${parsedTransactions.length} transactions (Development mode: ${isDevelopmentMode})`);
          
          // Wait for Claude AI to enhance the transactions
          parsedTransactions = await enhanceTransactionsWithClaude(parsedTransactions);
          console.log(`Transactions enhanced by Claude: ${parsedTransactions.length}`);
          
          // Check if categorization was successful
          const categorizedCount = parsedTransactions.filter(t => 
            t.category && t.category !== "Uncategorized"
          ).length;
          
          const categorizedPercent = Math.round((categorizedCount / parsedTransactions.length) * 100);
          
          // Count unique categories for better feedback
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
          
          // Generate narrative transactions with personal background context
          const initialNarrativeTransactions = generateInitialNarrativeTransactions(parsedTransactions, financialPersona);
          setNarrativeTransactions(initialNarrativeTransactions);
          
          // Update financial persona with new data
          updateFinancialPersona(parsedTransactions, initialNarrativeTransactions);
          
        } catch (error) {
          console.error("Error enhancing transactions with Claude:", error);
          toast.error("Could not enhance all transactions with Claude AI", {
            description: "Using basic categorization instead for some transactions"
          });
          // We continue with partial results rather than failing completely
          
          // Generate narrative transactions with basic info
          const basicNarrativeTransactions = generateInitialNarrativeTransactions(parsedTransactions, financialPersona);
          setNarrativeTransactions(basicNarrativeTransactions);
          
          // Update financial persona with basic narrative data
          updateFinancialPersona(parsedTransactions, basicNarrativeTransactions);
        }
      } else {
        console.warn("No Claude API key available - skipping AI categorization");
        toast.info("Add a Claude API key to enhance transaction categorization", {
          description: "Click the 'Add Claude API' button in the navbar"
        });
        
        // Still generate basic narrative transactions
        const basicNarrativeTransactions = generateInitialNarrativeTransactions(parsedTransactions, financialPersona);
        setNarrativeTransactions(basicNarrativeTransactions);
        
        // Update financial persona with basic narrative data
        updateFinancialPersona(parsedTransactions, basicNarrativeTransactions);
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
        
        // Also log a sample narrative transaction if available
        if (narrativeTransactions.length > 0) {
          console.log("Sample narrative transaction:", JSON.stringify(narrativeTransactions[0], null, 2));
        }
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
          
          // Cache all data for future use (unless in development mode)
          cacheCurrentData(parsedTransactions, newSummary, newInsights, narrativeTransactions);
          
          const dateRange = newSummary.dateRange;
          const formattedStartDate = dateRange.start.toLocaleDateString();
          const formattedEndDate = dateRange.end.toLocaleDateString();
          
          toast.success(
            `Imported ${transactionCount} transactions from ${formattedStartDate} to ${formattedEndDate}.`
          );
          
          // Navigate to dashboard after successful upload (changed from /transactions to /)
          navigate("/");
          
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
    setNarrativeTransactions([]);
    setIsUsingCache(false);
    // Clear the cache when explicitly clearing data
    localStorage.removeItem(TRANSACTION_CACHE_KEY);
    localStorage.removeItem(CACHE_EXPIRY_KEY);
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
    narrativeTransactions,
    setNarrativeTransactions,
    financialPersona,
    setFinancialPersona,
    uploadQBOFile,
    clearData,
    isUsingCache
  };
};

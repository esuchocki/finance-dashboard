import { useState, useCallback, useEffect } from 'react';
import { BusinessEntity, BusinessTransaction, EntityType, Transaction } from '@/lib/types';
import { parseQBOFile } from '@/lib/qboParser';
import { enhanceTransactionsWithClaude } from '@/lib/claudeService';
import { toast } from 'sonner';

// localStorage keys for business entities
const ENTITIES_LIST_KEY = 'business_entities_list';
const ENTITY_DATA_PREFIX = 'business_entity_';

interface UseBusinessEntitiesResult {
  entities: BusinessEntity[];
  isLoading: boolean;
  error: string | null;
  addEntity: (file: File, entityName: string, entityType: EntityType) => Promise<void>;
  removeEntity: (entityId: string) => void;
  getEntityTransactions: (entityId: string) => BusinessTransaction[];
  updateEntity: (entityId: string, updates: Partial<BusinessEntity>) => void;
  clearAllEntities: () => void;
}

export const useBusinessEntities = (claudeApiKey: string | null): UseBusinessEntitiesResult => {
  const [entities, setEntities] = useState<BusinessEntity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load entities from localStorage on mount
  useEffect(() => {
    loadEntitiesFromStorage();
  }, []);

  // Save entities to localStorage whenever they change
  useEffect(() => {
    if (entities.length > 0) {
      saveEntitiesToStorage();
    }
  }, [entities]);

  const loadEntitiesFromStorage = () => {
    try {
      const stored = localStorage.getItem(ENTITIES_LIST_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        const entitiesWithDates = parsed.map((entity: any) => ({
          ...entity,
          dateUploaded: new Date(entity.dateUploaded),
          dateRange: {
            start: new Date(entity.dateRange.start),
            end: new Date(entity.dateRange.end)
          }
        }));
        setEntities(entitiesWithDates);
      }
    } catch (err) {
      console.error('Error loading entities from storage:', err);
      setError('Failed to load saved entities');
    }
  };

  const saveEntitiesToStorage = () => {
    try {
      localStorage.setItem(ENTITIES_LIST_KEY, JSON.stringify(entities));
    } catch (err) {
      console.error('Error saving entities to storage:', err);
      toast.error('Failed to save entities');
    }
  };

  const saveEntityTransactions = (entityId: string, transactions: BusinessTransaction[]) => {
    try {
      const key = `${ENTITY_DATA_PREFIX}${entityId}_transactions`;
      localStorage.setItem(key, JSON.stringify(transactions));
    } catch (err) {
      console.error('Error saving entity transactions:', err);
      throw new Error('Failed to save transaction data. localStorage may be full.');
    }
  };

  const getEntityTransactions = useCallback((entityId: string): BusinessTransaction[] => {
    try {
      const key = `${ENTITY_DATA_PREFIX}${entityId}_transactions`;
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
      console.error('Error loading entity transactions:', err);
      return [];
    }
  }, []);

  const addEntity = async (
    file: File,
    entityName: string,
    entityType: EntityType = 'operating'
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Read and parse the QBO file
      const fileContent = await file.text();
      let transactions = await parseQBOFile(fileContent);

      if (transactions.length === 0) {
        throw new Error('No transactions found in file');
      }

      // Enhance transactions with Claude if API key is available
      if (claudeApiKey) {
        toast.info('Enhancing transactions with Claude AI...', {
          duration: 3000
        });
        transactions = await enhanceTransactionsWithClaude(transactions, claudeApiKey);
      }

      // Generate unique entity ID
      const entityId = `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Calculate date range
      const dates = transactions.map(t => t.date.getTime());
      const dateRange = {
        start: new Date(Math.min(...dates)),
        end: new Date(Math.max(...dates))
      };

      // Convert transactions to BusinessTransaction format
      const businessTransactions: BusinessTransaction[] = transactions.map(tx => ({
        ...tx,
        entityId,
        entityName,
        fundType: 'unrestricted', // Default to unrestricted
        functionalCategory: undefined,
        isIntercompany: false
      }));

      // Create entity metadata
      const newEntity: BusinessEntity = {
        id: entityId,
        name: entityName,
        type: entityType,
        fileSource: file.name,
        dateUploaded: new Date(),
        transactionCount: transactions.length,
        dateRange,
        accountType: undefined // Could be extracted from QBO if needed
      };

      // Save transactions to localStorage
      saveEntityTransactions(entityId, businessTransactions);

      // Add entity to list
      setEntities(prev => [...prev, newEntity]);

      toast.success(`Entity "${entityName}" added successfully`, {
        description: `${transactions.length} transactions loaded`
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process file';
      setError(errorMessage);
      toast.error('Failed to add entity', {
        description: errorMessage
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const removeEntity = (entityId: string) => {
    try {
      // Remove transactions from localStorage
      const txKey = `${ENTITY_DATA_PREFIX}${entityId}_transactions`;
      localStorage.removeItem(txKey);

      // Remove entity from list
      setEntities(prev => prev.filter(e => e.id !== entityId));

      toast.success('Entity removed successfully');
    } catch (err) {
      console.error('Error removing entity:', err);
      toast.error('Failed to remove entity');
    }
  };

  const updateEntity = (entityId: string, updates: Partial<BusinessEntity>) => {
    setEntities(prev =>
      prev.map(entity =>
        entity.id === entityId
          ? { ...entity, ...updates }
          : entity
      )
    );
  };

  const clearAllEntities = () => {
    try {
      // Remove all entity data from localStorage
      entities.forEach(entity => {
        const txKey = `${ENTITY_DATA_PREFIX}${entity.id}_transactions`;
        localStorage.removeItem(txKey);
      });

      // Clear entities list
      localStorage.removeItem(ENTITIES_LIST_KEY);
      setEntities([]);

      toast.success('All entities cleared');
    } catch (err) {
      console.error('Error clearing entities:', err);
      toast.error('Failed to clear entities');
    }
  };

  return {
    entities,
    isLoading,
    error,
    addEntity,
    removeEntity,
    getEntityTransactions,
    updateEntity,
    clearAllEntities
  };
};

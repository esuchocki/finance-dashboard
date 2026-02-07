import { useState, useCallback } from 'react';
import { BusinessEntity, BusinessTransaction, EntityType, Transaction } from '@/lib/types';
import { parseQBOFile } from '@/lib/qboParser';
import { parseIIFFile, isIIFFile } from '@/lib/iif/parser';
import { enhanceTransactionsWithClaude } from '@/lib/claudeService';
import { toast } from 'sonner';

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
  const [entityTransactions, setEntityTransactions] = useState<Map<string, BusinessTransaction[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getEntityTransactions = useCallback((entityId: string): BusinessTransaction[] => {
    return entityTransactions.get(entityId) || [];
  }, [entityTransactions]);

  const addEntity = async (
    file: File,
    entityName: string,
    entityType: EntityType = 'subsidiary'
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const fileContent = await file.text();

      let transactions: Transaction[];
      if (isIIFFile(fileContent)) {
        transactions = parseIIFFile(fileContent);
      } else {
        transactions = await parseQBOFile(fileContent);
      }

      if (transactions.length === 0) {
        throw new Error('No transactions found in file');
      }

      if (claudeApiKey) {
        toast.info('Enhancing transactions with Claude AI...', {
          duration: 3000
        });
        transactions = await enhanceTransactionsWithClaude(transactions, claudeApiKey);
      }

      const entityId = `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const dates = transactions.map(t => t.date.getTime());
      const dateRange = {
        start: new Date(Math.min(...dates)),
        end: new Date(Math.max(...dates))
      };

      const businessTransactions: BusinessTransaction[] = transactions.map(tx => ({
        ...tx,
        entityId,
        entityName,
        fundType: 'unrestricted',
        functionalCategory: undefined,
        isIntercompany: false
      }));

      const newEntity: BusinessEntity = {
        id: entityId,
        name: entityName,
        type: entityType,
        fileSource: file.name,
        dateUploaded: new Date(),
        transactionCount: transactions.length,
        dateRange
      };

      setEntityTransactions(prev => {
        const newMap = new Map(prev);
        newMap.set(entityId, businessTransactions);
        return newMap;
      });

      setEntities(prev => [...prev, newEntity]);

      toast.success(`Entity "${entityName}" added successfully`, {
        description: `${transactions.length} transactions loaded (session only)`
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
      setEntityTransactions(prev => {
        const newMap = new Map(prev);
        newMap.delete(entityId);
        return newMap;
      });

      setEntities(prev => prev.filter(e => e.id !== entityId));

      toast.success('Entity removed from session');
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
      setEntityTransactions(new Map());
      setEntities([]);
      toast.success('All entities cleared from session');
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

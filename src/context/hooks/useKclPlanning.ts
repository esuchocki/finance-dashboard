/**
 * useKclPlanning
 *
 * Manages KCL annual financial datasets — one per calendar year.
 * Data is session-only (React state). Nothing is written to localStorage
 * or any other storage — consistent with the rest of the application.
 */

import { useState, useEffect, useCallback } from 'react';
import type { KclDataSourceKey, KclAnnualDataset } from '@/lib/kclTypes';
import { emptyDataset, isDatasetReady, REQUIRED_SOURCES } from '@/lib/kclTypes';
import {
  parseGlTransactions,
  parseProgramCatalog,
  parseProgramRevenue,
  parseResidentialRoster,
  parseRoomInventory,
  parseStaffSalaries,
  parseTrialBalance,
  parseDonations,
  parseOutstandingAr,
  parseProgramTransactions,
  parseRecurringDonors,
  parseRoomBookings,
} from '@/lib/kclParser';
import { computeKclMetrics } from '@/lib/kclCompute';

const AVAILABLE_YEARS = [2024, 2025, 2026, 2027];

// ─── Parsers map ──────────────────────────────────────────────────────────────

type ParserFn = (content: string) => unknown[];

const PARSERS: Record<KclDataSourceKey, ParserFn> = {
  glTransactions:      parseGlTransactions,
  programCatalog:      parseProgramCatalog,
  programRevenue:      parseProgramRevenue,
  residentialRoster:   parseResidentialRoster,
  roomInventory:       parseRoomInventory,
  staffSalaries:       parseStaffSalaries,
  trialBalance:        parseTrialBalance,
  donations:           parseDonations,
  outstandingAr:       parseOutstandingAr,
  programTransactions: parseProgramTransactions,
  recurringDonors:     parseRecurringDonors,
  roomBookings:        parseRoomBookings,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseKclPlanningResult {
  datasets: Record<number, KclAnnualDataset>;
  activeYear: number;
  activeDataset: KclAnnualDataset;
  availableYears: number[];
  setActiveYear: (year: number) => void;
  loadSource: (year: number, key: KclDataSourceKey, file: File) => Promise<void>;
  removeSource: (year: number, key: KclDataSourceKey) => void;
  clearYear: (year: number) => void;
  isReady: (year: number) => boolean;
}

export function useKclPlanning(): UseKclPlanningResult {
  const [datasets, setDatasets] = useState<Record<number, KclAnnualDataset>>({});
  const [activeYear, setActiveYear] = useState<number>(2025);

  // Ensure the active year always has a dataset slot
  useEffect(() => {
    setDatasets(prev => {
      if (prev[activeYear]) return prev;
      return { ...prev, [activeYear]: emptyDataset(activeYear) };
    });
  }, [activeYear]);

  const activeDataset = datasets[activeYear] ?? emptyDataset(activeYear);

  // ── Recompute metrics when all required sources are loaded ──────────────────

  const recompute = useCallback((dataset: KclAnnualDataset): KclAnnualDataset => {
    if (!isDatasetReady(dataset)) {
      return { ...dataset, computed: null };
    }
    try {
      const computed = computeKclMetrics(
        dataset.year,
        dataset.data.glTransactions,
        dataset.data.programCatalog,
        dataset.data.programRevenue,
        dataset.data.roomInventory,
        dataset.data.residentialRoster,
        dataset.data.staffSalaries,
        dataset.data.trialBalance,
        dataset.data.donations,
        dataset.data.outstandingAr,
        dataset.data.programTransactions,
        dataset.data.recurringDonors,
        dataset.data.roomBookings,
      );
      return { ...dataset, computed };
    } catch (err) {
      console.error('KCL compute error:', err);
      return { ...dataset, computed: null };
    }
  }, []);

  // ── Load a source file ──────────────────────────────────────────────────────

  const loadSource = useCallback(async (
    year: number,
    key: KclDataSourceKey,
    file: File,
  ): Promise<void> => {
    let content: string;
    try {
      content = await file.text();
    } catch {
      setDatasets(prev => {
        const dataset = prev[year] ?? emptyDataset(year);
        return {
          ...prev,
          [year]: {
            ...dataset,
            lastUpdated: new Date().toISOString(),
            sources: {
              ...dataset.sources,
              [key]: {
                status: 'error' as const,
                fileName: file.name,
                recordCount: 0,
                loadedAt: new Date().toISOString(),
                error: 'Could not read file',
              },
            },
          },
        };
      });
      return;
    }

    let parsed: unknown[];
    let errorMsg: string | null = null;
    try {
      parsed = PARSERS[key](content);
      if (parsed.length === 0) {
        errorMsg = 'File parsed but no valid rows found — check column headers';
      }
    } catch (err) {
      parsed = [];
      errorMsg = err instanceof Error ? err.message : 'Parse error';
    }

    setDatasets(prev => {
      const existing = prev[year] ?? emptyDataset(year);
      const updated: KclAnnualDataset = {
        ...existing,
        lastUpdated: new Date().toISOString(),
        sources: {
          ...existing.sources,
          [key]: {
            status: (errorMsg ? 'error' : 'loaded') as 'error' | 'loaded',
            fileName: file.name,
            recordCount: parsed.length,
            loadedAt: new Date().toISOString(),
            error: errorMsg,
          },
        },
        data: {
          ...existing.data,
          [key]: parsed,
        },
      };
      return { ...prev, [year]: recompute(updated) };
    });
  }, [recompute]);

  // ── Remove a source ─────────────────────────────────────────────────────────

  const removeSource = useCallback((year: number, key: KclDataSourceKey): void => {
    setDatasets(prev => {
      const existing = prev[year];
      if (!existing) return prev;
      const updated: KclAnnualDataset = {
        ...existing,
        lastUpdated: new Date().toISOString(),
        sources: {
          ...existing.sources,
          [key]: {
            status: 'missing',
            fileName: null,
            recordCount: 0,
            loadedAt: null,
            error: null,
          },
        },
        data: {
          ...existing.data,
          [key]: [],
        },
      };
      // Clear computed since required data may now be missing
      const requiredMissing = REQUIRED_SOURCES.some(
        k => updated.sources[k].status !== 'loaded'
      );
      return { ...prev, [year]: requiredMissing ? { ...updated, computed: null } : recompute(updated) };
    });
  }, [recompute]);

  // ── Clear an entire year ────────────────────────────────────────────────────

  const clearYear = useCallback((year: number): void => {
    setDatasets(prev => ({ ...prev, [year]: emptyDataset(year) }));
  }, []);

  const isReady = useCallback((year: number): boolean => {
    const ds = datasets[year];
    return ds ? isDatasetReady(ds) : false;
  }, [datasets]);

  return {
    datasets,
    activeYear,
    activeDataset,
    availableYears: AVAILABLE_YEARS,
    setActiveYear,
    loadSource,
    removeSource,
    clearYear,
    isReady,
  };
}

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useKclPlanning } from '@/context/hooks/useKclPlanning';
import DataSourceUploader from '@/components/business/planning/DataSourceUploader';
import ComputedMetricsPanel from '@/components/business/planning/ComputedMetricsPanel';
import type { KclDataSourceKey } from '@/lib/kclTypes';
import { ALL_SOURCES, REQUIRED_SOURCES, KCL_SOURCE_META } from '@/lib/kclTypes';

const BusinessPlanning: React.FC = () => {
  const {
    activeYear,
    activeDataset,
    availableYears,
    setActiveYear,
    loadSource,
    removeSource,
    clearYear,
    isReady,
  } = useKclPlanning();

  const sources = activeDataset.sources;
  const loadedCount = ALL_SOURCES.filter(k => sources[k].status === 'loaded').length;
  const requiredLoaded = REQUIRED_SOURCES.every(k => sources[k].status === 'loaded');

  const handleLoad = (key: KclDataSourceKey, file: File) =>
    loadSource(activeYear, key, file);

  const handleRemove = (key: KclDataSourceKey) =>
    removeSource(activeYear, key);

  return (
    <div className="container py-6 space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Financial Planning</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Load annual data sources to compute break-even metrics and program pricing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Year selector */}
          <Select value={String(activeYear)} onValueChange={v => setActiveYear(parseInt(v, 10))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear year */}
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-red-600"
            onClick={() => clearYear(activeYear)}
            title={`Clear all ${activeYear} data`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {loadedCount} of {ALL_SOURCES.length} sources loaded
        </span>
        {ALL_SOURCES.map(k => {
          const s = sources[k];
          const isRequired = REQUIRED_SOURCES.includes(k);
          return (
            <Badge
              key={k}
              variant="outline"
              className={
                s.status === 'loaded'  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                s.status === 'error'   ? 'bg-red-50 text-red-700 border-red-200' :
                isRequired             ? 'text-amber-700 border-amber-300' :
                                         'text-muted-foreground'
              }
            >
              {KCL_SOURCE_META[k].label}
            </Badge>
          );
        })}
      </div>

      <Tabs defaultValue="sources">
        <TabsList>
          <TabsTrigger value="sources">Data Sources</TabsTrigger>
          <TabsTrigger value="results" disabled={!requiredLoaded}>
            Results {isReady(activeYear) ? '' : '(load required sources)'}
          </TabsTrigger>
        </TabsList>

        {/* ── Data Sources tab ──────────────────────────────────────────────── */}
        <TabsContent value="sources" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {ALL_SOURCES.map(key => (
              <DataSourceUploader
                key={key}
                sourceKey={key}
                year={activeYear}
                status={sources[key]}
                onLoad={handleLoad}
                onRemove={handleRemove}
              />
            ))}
          </div>
        </TabsContent>

        {/* ── Results tab ───────────────────────────────────────────────────── */}
        <TabsContent value="results" className="mt-4">
          {activeDataset.computed ? (
            <ComputedMetricsPanel metrics={activeDataset.computed} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Load all required data sources to compute metrics.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BusinessPlanning;

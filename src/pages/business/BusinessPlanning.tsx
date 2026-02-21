import React, { useState, useRef, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Archive, CheckCircle2, AlertCircle } from 'lucide-react';
import { unzipSync } from 'fflate';
import { useKclPlanning } from '@/context/hooks/useKclPlanning';
import DataSourceUploader from '@/components/business/planning/DataSourceUploader';
import ComputedMetricsPanel from '@/components/business/planning/ComputedMetricsPanel';
import type { KclDataSourceKey } from '@/lib/kclTypes';
import { ALL_SOURCES, REQUIRED_SOURCES, KCL_SOURCE_META, matchZipFilename } from '@/lib/kclTypes';

interface ZipEntry {
  filename: string;
  key: KclDataSourceKey | null;
}

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

  // ── Zip upload state ────────────────────────────────────────────────────────
  const zipInputRef = useRef<HTMLInputElement>(null);
  const [zipLoading, setZipLoading] = useState(false);
  const [zipResults, setZipResults] = useState<ZipEntry[] | null>(null);
  const [zipIsDragOver, setZipIsDragOver] = useState(false);

  useEffect(() => { setZipResults(null); }, [activeYear]);

  const ZIP_MAX_SIZE = 200 * 1024 * 1024; // 200 MB

  const handleZipFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) return;
    if (file.size > ZIP_MAX_SIZE) {
      setZipResults([{ filename: `${file.name} — too large (max 200 MB, received ${(file.size / 1024 / 1024).toFixed(1)} MB)`, key: null }]);
      return;
    }
    setZipLoading(true);
    setZipResults(null);
    try {
      const buf = await file.arrayBuffer();
      const entries = unzipSync(new Uint8Array(buf));
      const results: ZipEntry[] = [];
      const loads: Promise<void>[] = [];
      for (const [path, data] of Object.entries(entries)) {
        const basename = path.split('/').pop() ?? path;
        if (!basename.toLowerCase().endsWith('.csv') || data.length === 0) continue;
        const key = matchZipFilename(basename);
        results.push({ filename: basename, key });
        if (key) {
          loads.push(loadSource(activeYear, key, new File([data], basename, { type: 'text/csv' })));
        }
      }
      await Promise.all(loads);
      setZipResults(results);
    } catch {
      setZipResults([{ filename: file.name, key: null }]);
    } finally {
      setZipLoading(false);
    }
  };

  const handleLoad = (key: KclDataSourceKey, file: File) =>
    loadSource(activeYear, key, file);

  const handleRemove = (key: KclDataSourceKey) =>
    removeSource(activeYear, key);

  return (
    <div className="container py-6 space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Planning</h1>
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
        <TabsContent value="sources" className="mt-4 space-y-4">

          {/* Zip bundle upload */}
          <div
            className={`rounded-lg border-2 border-dashed p-4 space-y-3 transition-colors ${
              zipIsDragOver ? 'border-primary bg-primary/5' : 'border-muted'
            }`}
            onDragOver={e => { e.preventDefault(); setZipIsDragOver(true); }}
            onDragLeave={() => setZipIsDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setZipIsDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleZipFile(f);
            }}
          >
            <input
              ref={zipInputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleZipFile(f);
                e.target.value = '';
              }}
            />
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <Archive className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">Upload all sources as a zip</p>
                  <p className="text-xs text-muted-foreground">
                    CSV files are matched to sources by filename — drop a .zip or click to browse
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={zipLoading}
                onClick={() => zipInputRef.current?.click()}
              >
                {zipLoading ? 'Extracting...' : 'Upload zip'}
              </Button>
            </div>

            {zipResults && zipResults.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-1.5 pt-1">
                {zipResults.map((r, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-1.5 text-xs rounded px-2 py-1.5 ${
                      r.key ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                             : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                    }`}
                  >
                    {r.key
                      ? <CheckCircle2 className="h-3 w-3 shrink-0" />
                      : <AlertCircle className="h-3 w-3 shrink-0" />}
                    <span className="truncate" title={r.filename}>{r.filename}</span>
                    {r.key && (
                      <span className="shrink-0 text-emerald-500 dark:text-emerald-500">
                        &rarr; {KCL_SOURCE_META[r.key].label}
                      </span>
                    )}
                    {!r.key && <span className="shrink-0 text-amber-500">unrecognized</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Individual source cards */}
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

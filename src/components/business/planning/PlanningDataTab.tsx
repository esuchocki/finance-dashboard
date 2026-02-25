import React, { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search, ChevronDown, ChevronUp, SlidersHorizontal, Code2, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KclAnnualDataset, KclDataSourceKey } from '@/lib/kclTypes';
import { ALL_SOURCES, KCL_SOURCE_META } from '@/lib/kclTypes';
import { SQL_CONTENT } from '@/lib/kclSqlContent';
import { COLS, SEARCH_FIELDS, DATE_FIELD, AMOUNT_FIELD, CATEGORY_FIELD } from '@/lib/kclColumnDefs';
import type { Row, Col } from '@/lib/kclColumnDefs';
import { KclSourceCharts } from './KclSourceCharts';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

// ─── Main component ───────────────────────────────────────────────────────────

interface PlanningDataTabProps {
  dataset: KclAnnualDataset;
}

const PlanningDataTab: React.FC<PlanningDataTabProps> = ({ dataset }) => {
  const [selectedKey, setSelectedKey] = useState<KclDataSourceKey | null>(null);
  const [text, setText] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [category, setCategory] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [sqlOpen, setSqlOpen] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const loadedSources = useMemo(
    () => ALL_SOURCES.filter(k => dataset.sources[k].status === 'loaded'),
    [dataset.sources]
  );

  const activeKey: KclDataSourceKey | null =
    selectedKey && loadedSources.includes(selectedKey) ? selectedKey : loadedSources[0] ?? null;

  // Clear stale selected key if it's been removed
  useEffect(() => {
    if (selectedKey && !loadedSources.includes(selectedKey)) setSelectedKey(null);
  }, [loadedSources, selectedKey]);

  // Reset filters and page when source changes
  useEffect(() => {
    setText('');
    setDateStart('');
    setDateEnd('');
    setAmountMin('');
    setAmountMax('');
    setCategory('all');
    setPage(1);
    setSqlOpen(false);
    setSortKey(null);
    setSortDir('asc');
  }, [activeKey]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [text, dateStart, dateEnd, amountMin, amountMax, category]);

  const rawData = useMemo((): Row[] => {
    if (!activeKey) return [];
    return (dataset.data[activeKey] as Row[]) ?? [];
  }, [activeKey, dataset.data]);

  const categoryOptions = useMemo(() => {
    if (!activeKey) return [];
    const cfg = CATEGORY_FIELD[activeKey];
    if (!cfg) return [];
    const seen = new Set<string>();
    rawData.forEach(r => { const v = String(r[cfg.field] ?? ''); if (v) seen.add(v); });
    return Array.from(seen).sort();
  }, [activeKey, rawData]);

  const filteredData = useMemo((): Row[] => {
    if (!activeKey) return [];
    const searchFields = SEARCH_FIELDS[activeKey];
    const dateField    = DATE_FIELD[activeKey];
    const amountField  = AMOUNT_FIELD[activeKey];
    const catCfg       = CATEGORY_FIELD[activeKey];
    const textLower    = text.toLowerCase();

    return rawData.filter(row => {
      if (textLower) {
        const match = searchFields.some(f => String(row[f] ?? '').toLowerCase().includes(textLower));
        if (!match) return false;
      }
      if (dateStart && dateField) {
        const d = new Date(String(row[dateField] || '') + 'T00:00:00');
        if (!isNaN(d.getTime()) && d < new Date(dateStart + 'T00:00:00')) return false;
      }
      if (dateEnd && dateField) {
        const d = new Date(String(row[dateField] || '') + 'T00:00:00');
        if (!isNaN(d.getTime()) && d > new Date(dateEnd + 'T23:59:59')) return false;
      }
      if (amountMin && amountField) {
        const v = Number(row[amountField]);
        if (!isNaN(v) && v < parseFloat(amountMin)) return false;
      }
      if (amountMax && amountField) {
        const v = Number(row[amountField]);
        if (!isNaN(v) && v > parseFloat(amountMax)) return false;
      }
      if (category !== 'all' && catCfg) {
        if (String(row[catCfg.field]) !== category) return false;
      }
      return true;
    });
  }, [activeKey, rawData, text, dateStart, dateEnd, amountMin, amountMax, category]);

  const sortedData = useMemo((): Row[] => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const aEmpty = av == null || av === '';
      const bEmpty = bv == null || bv === '';
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;
      const an = Number(av);
      const bn = Number(bv);
      const cmp = (!isNaN(an) && !isNaN(bn))
        ? an - bn
        : String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredData, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const handleExport = () => {
    if (!activeKey || sortedData.length === 0) return;
    const exportCols = COLS[activeKey];
    const header = exportCols.map(c => `"${c.label}"`).join(',');
    const rows = sortedData.map(row =>
      exportCols.map(c => {
        const v = row[c.key];
        if (v == null) return '';
        return `"${String(v).replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeKey}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages  = Math.max(1, Math.ceil(sortedData.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageData    = sortedData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const cols: Col[] = activeKey ? COLS[activeKey] : [];

  const hasActiveFilters = dateStart || dateEnd || amountMin || amountMax || (category !== 'all');
  const showDateFilter   = activeKey ? !!DATE_FIELD[activeKey]   : false;
  const showAmountFilter = activeKey ? !!AMOUNT_FIELD[activeKey] : false;
  const showCatFilter    = activeKey ? !!CATEGORY_FIELD[activeKey] : false;
  const hasAnyFilter     = showDateFilter || showAmountFilter || showCatFilter;

  const sqlContent = activeKey ? SQL_CONTENT[activeKey] : undefined;
  const origin     = activeKey ? KCL_SOURCE_META[activeKey].origin : '';

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (loadedSources.length === 0) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        <p className="text-sm font-medium">No data sources loaded yet.</p>
        <p className="text-xs mt-1">Upload data in the Upload tab to explore it here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Source selector */}
      <div className="overflow-x-auto pb-1">
        <div className="flex gap-2 min-w-max">
          {loadedSources.map(k => (
            <button
              key={k}
              onClick={() => setSelectedKey(k)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors whitespace-nowrap',
                activeKey === k
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-primary/60 hover:text-foreground'
              )}
            >
              {KCL_SOURCE_META[k].label}
              <span className={cn(
                'text-xs rounded-full px-1.5 py-0 font-normal',
                activeKey === k ? 'bg-primary-foreground/20 text-primary-foreground' : 'text-muted-foreground'
              )}>
                {dataset.sources[k].recordCount.toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      </div>

      {activeKey && (
        <>
          {/* Source header */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">{KCL_SOURCE_META[activeKey].label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{KCL_SOURCE_META[activeKey].description}</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted-foreground">
                {filteredData.length < rawData.length
                  ? `${filteredData.length.toLocaleString()} of ${rawData.length.toLocaleString()} records`
                  : `${rawData.length.toLocaleString()} records`}
                {dataset.sources[activeKey].fileName && (
                  <span className="ml-2 text-muted-foreground/60">{dataset.sources[activeKey].fileName}</span>
                )}
              </p>
              <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={handleExport} disabled={sortedData.length === 0}>
                <Download className="h-3 w-3" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={`Search ${KCL_SOURCE_META[activeKey].label.toLowerCase()}...`}
                className="pl-9"
              />
            </div>
            {hasAnyFilter && (
              <Button
                variant="outline"
                size="sm"
                className={cn('gap-1.5', hasActiveFilters && 'border-primary text-primary')}
                onClick={() => setShowFilters(v => !v)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            )}
            {(text || hasActiveFilters) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => { setText(''); setDateStart(''); setDateEnd(''); setAmountMin(''); setAmountMax(''); setCategory('all'); }}
              >
                Clear
              </Button>
            )}
          </div>

          {/* Advanced filters */}
          {showFilters && hasAnyFilter && (
            <div className="flex flex-wrap gap-4 rounded-lg border px-4 py-3 bg-muted/20">
              {showDateFilter && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Date range</Label>
                  <div className="flex items-center gap-2">
                    <Input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="h-8 text-sm w-36" />
                    <span className="text-muted-foreground text-sm">to</span>
                    <Input type="date" value={dateEnd}   onChange={e => setDateEnd(e.target.value)}   className="h-8 text-sm w-36" />
                  </div>
                </div>
              )}
              {showAmountFilter && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Amount range</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" placeholder="Min" value={amountMin} onChange={e => setAmountMin(e.target.value)} className="h-8 text-sm w-28" />
                    <span className="text-muted-foreground text-sm">to</span>
                    <Input type="number" placeholder="Max" value={amountMax} onChange={e => setAmountMax(e.target.value)} className="h-8 text-sm w-28" />
                  </div>
                </div>
              )}
              {showCatFilter && categoryOptions.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{CATEGORY_FIELD[activeKey]!.label}</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-8 text-sm w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {categoryOptions.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Charts */}
          <KclSourceCharts sourceKey={activeKey} data={rawData} />

          {/* Table */}
          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    {cols.map(c => (
                      <TableHead
                        key={c.key}
                        className="text-xs font-medium whitespace-nowrap py-2.5 cursor-pointer select-none hover:text-foreground"
                        onClick={() => handleSort(c.key)}
                      >
                        <div className={cn('flex items-center gap-1', c.right && 'justify-end')}>
                          {c.label}
                          {sortKey === c.key
                            ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)
                            : <ArrowUpDown className="h-3 w-3 opacity-30" />}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={cols.length} className="text-center py-12 text-sm text-muted-foreground">
                        No records match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageData.map((row, i) => (
                      <TableRow key={i} className="hover:bg-muted/20">
                        {cols.map(c => {
                          const raw = row[c.key];
                          const display = c.render ? c.render(raw) : (raw != null ? String(raw) : '');
                          return (
                            <TableCell
                              key={c.key}
                              className={cn('py-2 text-sm', c.right && 'text-right tabular-nums')}
                              title={display.length > 30 ? String(raw ?? '') : undefined}
                            >
                              {display}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {((currentPage - 1) * PAGE_SIZE + 1).toLocaleString()}–{Math.min(currentPage * PAGE_SIZE, sortedData.length).toLocaleString()} of {sortedData.length.toLocaleString()}
              </span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(1)}>First</Button>
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                <span className="px-3 text-sm">Page {currentPage} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(totalPages)}>Last</Button>
              </div>
            </div>
          )}

          {/* SQL viewer */}
          <div className="rounded-lg border overflow-hidden">
            <button
              onClick={() => setSqlOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Code2 className="h-3.5 w-3.5" />
                {sqlContent ? `SQL query — data/queries/${origin.split('data/queries/').pop()?.split(' ')[0] ?? ''}` : `Source — ${origin}`}
              </span>
              {sqlOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {sqlOpen && (
              <div className="border-t bg-muted/10 px-4 py-3">
                {sqlContent ? (
                  <pre className="text-xs font-mono text-muted-foreground overflow-x-auto leading-relaxed whitespace-pre">
                    {sqlContent}
                  </pre>
                ) : (
                  <p className="text-xs text-muted-foreground">{origin}</p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PlanningDataTab;

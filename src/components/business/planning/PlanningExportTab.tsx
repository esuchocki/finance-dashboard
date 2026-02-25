import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import type { KclAnnualDataset } from '@/lib/kclTypes';
import { generateKclReport } from '@/lib/kclReportGenerator';
import { downloadCsv, downloadXlsx } from '@/lib/kclExportUtils';
import type { CsvRows } from '@/lib/kclExportUtils';
import {
  buildMonthlySummary,
  buildMonthlyPnL,
  buildOccupancyMetrics,
  buildFixedCostBaseline,
} from '@/lib/kclCsvBuilders';

// ─── Component ────────────────────────────────────────────────────────────────

interface PlanningExportTabProps {
  dataset: KclAnnualDataset;
}

const PlanningExportTab: React.FC<PlanningExportTabProps> = ({ dataset }) => {
  const { computed, year } = dataset;

  const report = useMemo(() => {
    if (!computed) return null;
    return generateKclReport(computed, dataset);
  }, [computed, dataset]);

  const handleDownloadMd = () => {
    if (!report) return;
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kcl_financial_report_${year}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsv = (builder: () => CsvRows, filename: string) => () =>
    downloadCsv(builder(), filename);

  const handleXlsx = () => {
    if (!computed) return;
    downloadXlsx([
      { name: 'Monthly Summary',            rows: buildMonthlySummary(computed, dataset) },
      { name: 'Monthly P&L',                rows: buildMonthlyPnL(computed, dataset) },
      { name: 'Occupancy & Revenue Metrics', rows: buildOccupancyMetrics(computed, dataset) },
      { name: 'Fixed Cost Baseline',        rows: buildFixedCostBaseline(computed, dataset) },
    ], `kcl_financial_data_${year}.xlsx`);
  };

  if (!computed) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium">Load all required data sources to generate the report.</p>
        <p className="text-xs mt-1">Required: GL Transactions, Program Catalog, Program Revenue, Room Inventory.</p>
      </div>
    );
  }

  const lineCount = report?.split('\n').length ?? 0;

  return (
    <div className="space-y-4">

      {/* Markdown report row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">Financial Report — {year}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Markdown report covering all loaded data sources — {lineCount.toLocaleString()} lines.
            Download and feed to an LLM to start a financial analysis conversation.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={handleDownloadMd}>
          <Download className="h-4 w-4" />
          Download .md
        </Button>
      </div>

      {/* CSV exports */}
      <div className="rounded-lg border px-4 py-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">CSV Exports</p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline" size="sm" className="gap-1.5 h-8 text-xs"
            onClick={handleCsv(() => buildMonthlySummary(computed, dataset), `kcl_monthly_summary_${year}.csv`)}
          >
            <Download className="h-3 w-3" />
            Monthly Summary
          </Button>
          <Button
            variant="outline" size="sm" className="gap-1.5 h-8 text-xs"
            onClick={handleCsv(() => buildMonthlyPnL(computed, dataset), `kcl_monthly_pnl_${year}.csv`)}
          >
            <Download className="h-3 w-3" />
            Monthly P&amp;L
          </Button>
          <Button
            variant="outline" size="sm" className="gap-1.5 h-8 text-xs"
            onClick={handleCsv(() => buildOccupancyMetrics(computed, dataset), `kcl_occupancy_metrics_${year}.csv`)}
          >
            <Download className="h-3 w-3" />
            Occupancy &amp; Revenue Metrics
          </Button>
          <Button
            variant="outline" size="sm" className="gap-1.5 h-8 text-xs"
            onClick={handleCsv(() => buildFixedCostBaseline(computed, dataset), `kcl_fixed_cost_baseline_${year}.csv`)}
          >
            <Download className="h-3 w-3" />
            Fixed Cost Baseline
          </Button>
        </div>
        <div className="border-t pt-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">All four sheets in a single file</p>
          <Button
            variant="secondary" size="sm" className="gap-1.5 h-8 text-xs"
            onClick={handleXlsx}
          >
            <Download className="h-3 w-3" />
            Export All as XLSX
          </Button>
        </div>
      </div>

      {/* Markdown preview */}
      <div className="rounded-lg border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <span className="text-xs text-muted-foreground font-mono">kcl_financial_report_{year}.md</span>
          <span className="text-xs text-muted-foreground">{lineCount.toLocaleString()} lines</span>
        </div>
        <div className="overflow-auto max-h-[65vh] p-4">
          <pre className="text-xs font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {report}
          </pre>
        </div>
      </div>

    </div>
  );
};

export default PlanningExportTab;

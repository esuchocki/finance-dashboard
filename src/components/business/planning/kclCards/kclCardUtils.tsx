import React from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

// ─── Tip helper ───────────────────────────────────────────────────────────────

export const Tip: React.FC<{ hint: string; children: React.ReactNode }> = ({ hint, children }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="border-b border-dashed border-current cursor-help">{children}</span>
    </TooltipTrigger>
    <TooltipContent className="max-w-80 text-xs leading-relaxed whitespace-pre-wrap">{hint}</TooltipContent>
  </Tooltip>
);

// ─── Small summary card ───────────────────────────────────────────────────────

export interface SummaryCardProps {
  label: string;
  value: string;
  sub?: React.ReactNode;
  valueClass?: string;
  hint?: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, sub, valueClass, hint }) => (
  <div className="rounded border px-3 py-2.5 space-y-0.5">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={`text-sm font-semibold ${valueClass ?? ''}`}>
      {hint ? <Tip hint={hint}>{value}</Tip> : value}
    </p>
    {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
  </div>
);

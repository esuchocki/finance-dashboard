import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle2, AlertCircle, X, FileText } from 'lucide-react';
import type { KclDataSourceKey, KclSourceStatus } from '@/lib/kclTypes';
import { KCL_SOURCE_META } from '@/lib/kclTypes';

interface DataSourceUploaderProps {
  sourceKey: KclDataSourceKey;
  year: number;
  status: KclSourceStatus;
  onLoad: (key: KclDataSourceKey, file: File) => Promise<void>;
  onRemove: (key: KclDataSourceKey) => void;
}

const DataSourceUploader: React.FC<DataSourceUploaderProps> = ({
  sourceKey,
  year,
  status,
  onLoad,
  onRemove,
}) => {
  const meta = KCL_SOURCE_META[sourceKey];
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return;
    }
    setIsLoading(true);
    try {
      await onLoad(sourceKey, file);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const statusBadge = () => {
    if (status.status === 'loaded') {
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Loaded</Badge>;
    }
    if (status.status === 'error') {
      return <Badge className="bg-red-100 text-red-800 border-red-200">Error</Badge>;
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        {meta.required ? 'Required' : 'Optional'}
      </Badge>
    );
  };

  const origin = meta.origin.replace('{year}', String(year));

  return (
    <Card className={`transition-colors ${isDragOver ? 'border-primary bg-primary/5' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-medium">{meta.label}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
          </div>
          {statusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Loaded state */}
        {status.status === 'loaded' && (
          <div className="flex items-center justify-between rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300 truncate">
                  {status.fileName}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  {status.recordCount.toLocaleString()} records
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-emerald-600 hover:text-red-600 hover:bg-red-50"
              onClick={() => onRemove(sourceKey)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Error state */}
        {status.status === 'error' && (
          <div className="flex items-start gap-2 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-red-800 dark:text-red-300">{status.fileName}</p>
              <p className="text-xs text-red-600 dark:text-red-400">{status.error}</p>
            </div>
          </div>
        )}

        {/* Drop zone */}
        <div
          className={`rounded-md border-2 border-dashed px-4 py-3 text-center cursor-pointer transition-colors
            ${isLoading
              ? 'border-muted bg-muted/20 cursor-not-allowed'
              : 'border-muted hover:border-primary/50 hover:bg-primary/5'
            }`}
          onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !isLoading && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleInputChange}
            disabled={isLoading}
          />
          <Upload className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            {isLoading ? 'Loading...' : status.status === 'loaded' ? 'Drop to replace' : 'Drop CSV or click to browse'}
          </p>
        </div>

        {/* Source info */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">{origin}</p>
          </div>
          <p className="text-xs text-muted-foreground/70 pl-4.5">
            Columns: {meta.expectedColumns.join(', ')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataSourceUploader;

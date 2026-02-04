import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EntityType } from "@/lib/types";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { useFinance } from "@/context/FinanceContext";
import { toast } from "sonner";

interface PendingFile {
  file: File;
  entityName: string;
  entityType: EntityType;
}

const EntityUploader: React.FC = () => {
  const { addBusinessEntity, isLoading } = useFinance();
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles
      .filter(file => file.name.endsWith('.qbo') || file.name.endsWith('.QBO'))
      .map(file => ({
        file,
        entityName: file.name.replace(/\.qbo$/i, ''),
        entityType: 'operating' as EntityType
      }));

    if (newFiles.length < acceptedFiles.length) {
      toast.warning('Some files were skipped', {
        description: 'Only .qbo files are accepted'
      });
    }

    setPendingFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/x-qbo': ['.qbo', '.QBO']
    },
    multiple: true,
    disabled: isLoading
  });

  const removeFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateFileName = (index: number, name: string) => {
    setPendingFiles(prev =>
      prev.map((item, i) => i === index ? { ...item, entityName: name } : item)
    );
  };

  const updateFileType = (index: number, type: EntityType) => {
    setPendingFiles(prev =>
      prev.map((item, i) => i === index ? { ...item, entityType: type } : item)
    );
  };

  const handleUpload = async (index: number) => {
    const pending = pendingFiles[index];
    if (!pending) return;

    if (!pending.entityName.trim()) {
      toast.error('Entity name is required');
      return;
    }

    try {
      setUploadingIndex(index);
      await addBusinessEntity(pending.file, pending.entityName, pending.entityType);

      // Remove the successfully uploaded file
      setPendingFiles(prev => prev.filter((_, i) => i !== index));

      toast.success(`Entity "${pending.entityName}" uploaded successfully`);
    } catch (error) {
      console.error('Error uploading entity:', error);
      toast.error('Failed to upload entity', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleUploadAll = async () => {
    for (let i = 0; i < pendingFiles.length; i++) {
      if (pendingFiles[i].entityName.trim()) {
        await handleUpload(i);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <Card>
        <CardHeader>
          <CardTitle>Upload QBO Files</CardTitle>
          <CardDescription>
            Upload multiple QuickBooks Online files to consolidate across accounts and years
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
              ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg font-medium">Drop files here...</p>
            ) : (
              <>
                <p className="text-lg font-medium mb-2">
                  Drag & drop QBO files here, or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  Upload one or more .qbo files from QuickBooks Online
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Files List */}
      {pendingFiles.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Files Ready to Upload</CardTitle>
                <CardDescription>
                  Configure entity names and types before uploading
                </CardDescription>
              </div>
              <Button
                onClick={handleUploadAll}
                disabled={isLoading || pendingFiles.some(f => !f.entityName.trim())}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  `Upload All (${pendingFiles.length})`
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingFiles.map((pending, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 space-y-3 bg-muted/30"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="font-medium">{pending.file.name}</p>
                      <p className="text-muted-foreground">
                        {(pending.file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    disabled={uploadingIndex === index}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor={`entity-name-${index}`}>Entity Name</Label>
                    <Input
                      id={`entity-name-${index}`}
                      value={pending.entityName}
                      onChange={(e) => updateFileName(index, e.target.value)}
                      placeholder="e.g., Operating Account 2024"
                      disabled={uploadingIndex === index}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`entity-type-${index}`}>Entity Type</Label>
                    <Select
                      value={pending.entityType}
                      onValueChange={(value: EntityType) => updateFileType(index, value)}
                      disabled={uploadingIndex === index}
                    >
                      <SelectTrigger id={`entity-type-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="operating">Operating</SelectItem>
                        <SelectItem value="capital">Capital Reserve</SelectItem>
                        <SelectItem value="restricted">Restricted Fund</SelectItem>
                        <SelectItem value="vendor">Vendor Account</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={() => handleUpload(index)}
                  disabled={uploadingIndex !== null || !pending.entityName.trim()}
                  className="w-full"
                  size="sm"
                >
                  {uploadingIndex === index ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload This Entity'
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EntityUploader;

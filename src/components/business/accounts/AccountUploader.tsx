import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AccountType } from "@/lib/types";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { useFinance } from "@/context/FinanceContext";
import { toast } from "sonner";

interface PendingFile {
  file: File;
  accountName: string;
  accountType: AccountType;
  institutionName: string;
}

const AccountUploader: React.FC = () => {
  const { addBusinessAccount, isLoading } = useFinance();
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles
      .filter(file =>
        file.name.endsWith('.qbo') ||
        file.name.endsWith('.QBO') ||
        file.name.endsWith('.iif') ||
        file.name.endsWith('.IIF')
      )
      .map(file => {
        const isIIF = file.name.toLowerCase().endsWith('.iif');
        return {
          file,
          accountName: file.name.replace(/\.(qbo|iif)$/i, ''),
          accountType: (isIIF ? 'paypal' : 'checking') as AccountType,
          institutionName: isIIF ? 'PayPal' : ''
        };
      });

    if (newFiles.length < acceptedFiles.length) {
      toast.warning('Some files were skipped', {
        description: 'Only .qbo and .iif files are accepted'
      });
    }

    setPendingFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/x-qbo': ['.qbo', '.QBO'],
      'application/x-iif': ['.iif', '.IIF']
    },
    multiple: true,
    disabled: isLoading
  });

  const removeFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateAccountName = (index: number, name: string) => {
    setPendingFiles(prev =>
      prev.map((item, i) => i === index ? { ...item, accountName: name } : item)
    );
  };

  const updateAccountType = (index: number, type: AccountType) => {
    setPendingFiles(prev =>
      prev.map((item, i) => i === index ? { ...item, accountType: type } : item)
    );
  };

  const updateInstitutionName = (index: number, name: string) => {
    setPendingFiles(prev =>
      prev.map((item, i) => i === index ? { ...item, institutionName: name } : item)
    );
  };

  const handleUpload = async (index: number) => {
    const pending = pendingFiles[index];
    if (!pending) return;

    if (!pending.accountName.trim()) {
      toast.error('Account name is required');
      return;
    }

    if (!pending.institutionName.trim()) {
      toast.error('Institution name is required');
      return;
    }

    try {
      setUploadingIndex(index);
      await addBusinessAccount(
        pending.file,
        pending.accountName,
        pending.accountType,
        pending.institutionName
      );

      // Remove the successfully uploaded file
      setPendingFiles(prev => prev.filter((_, i) => i !== index));

      toast.success(`Account "${pending.accountName}" uploaded successfully`);
    } catch (error) {
      console.error('Error uploading account:', error);
      toast.error('Failed to upload account', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleUploadAll = async () => {
    for (let i = 0; i < pendingFiles.length; i++) {
      if (pendingFiles[i].accountName.trim() && pendingFiles[i].institutionName.trim()) {
        await handleUpload(i);
      }
    }
  };

  const canUploadAll = pendingFiles.length > 0 &&
    pendingFiles.every(f => f.accountName.trim() && f.institutionName.trim());

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <Card>
        <CardHeader>
          <CardTitle>Upload QBO or IIF Files</CardTitle>
          <CardDescription>
            Upload QuickBooks Online (.qbo) or PayPal IIF (.iif) files from different bank accounts
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
                  Drag & drop QBO or IIF files here, or click to browse
                </p>
                <p className="text-sm text-muted-foreground">
                  Upload .qbo files from banks or .iif files from PayPal
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
                  Configure account details before uploading
                </CardDescription>
              </div>
              <Button
                onClick={handleUploadAll}
                disabled={isLoading || !canUploadAll}
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor={`account-name-${index}`}>Account Name *</Label>
                    <Input
                      id={`account-name-${index}`}
                      value={pending.accountName}
                      onChange={(e) => updateAccountName(index, e.target.value)}
                      placeholder="e.g., NP Stmt MMA"
                      disabled={uploadingIndex === index}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`institution-name-${index}`}>Bank/Institution *</Label>
                    <Input
                      id={`institution-name-${index}`}
                      value={pending.institutionName}
                      onChange={(e) => updateInstitutionName(index, e.target.value)}
                      placeholder="e.g., Passumpsic Bank"
                      disabled={uploadingIndex === index}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`account-type-${index}`}>Account Type</Label>
                    <Select
                      value={pending.accountType}
                      onValueChange={(value: AccountType) => updateAccountType(index, value)}
                      disabled={uploadingIndex === index}
                    >
                      <SelectTrigger id={`account-type-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checking">Checking</SelectItem>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="mma">Money Market</SelectItem>
                        <SelectItem value="credit">Credit Card</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={() => handleUpload(index)}
                  disabled={
                    uploadingIndex !== null ||
                    !pending.accountName.trim() ||
                    !pending.institutionName.trim()
                  }
                  className="w-full"
                  size="sm"
                >
                  {uploadingIndex === index ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload This Account'
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

export default AccountUploader;

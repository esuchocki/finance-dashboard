
import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useFinance } from "@/context/FinanceContext";
import { Upload, AlertCircle, FileText } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

const FileUploader = () => {
  const { uploadQBOFile, isLoading } = useFinance();
  const { toast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processingTimeout, setProcessingTimeout] = useState<NodeJS.Timeout | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " bytes";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    else return (bytes / 1048576).toFixed(1) + " MB";
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setProgress(0);
    
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);
      setFileSize(formatFileSize(file.size));
      
      if (file.name.endsWith('.qbo')) {
        // Start progress animation
        setProgress(10);
        
        // Set a timeout to show an error if processing takes too long
        if (processingTimeout) {
          clearTimeout(processingTimeout);
        }
        
        const timeout = setTimeout(() => {
          setError("Processing is taking longer than expected. The file might be too large or in an unsupported format.");
          setProgress(0);
        }, 20000); // 20 seconds timeout
        
        setProcessingTimeout(timeout);
        
        const progressInterval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 300);
        
        try {
          const transactionCount = await uploadQBOFile(file);
          
          clearInterval(progressInterval);
          setProgress(100);
          
          if (processingTimeout) {
            clearTimeout(processingTimeout);
            setProcessingTimeout(null);
          }
          
          if (transactionCount === 0) {
            toast({
              title: "No transactions found",
              description: "The file was processed but no transactions were found. Please check the file format.",
              variant: "destructive"
            });
          }
        } catch (err) {
          clearInterval(progressInterval);
          setProgress(0);
          
          if (processingTimeout) {
            clearTimeout(processingTimeout);
            setProcessingTimeout(null);
          }
          
          setError((err as Error).message || "Failed to upload file");
        }
      } else {
        setError("Please upload a .qbo file.");
      }
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError(null);
    setProgress(0);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setFileName(file.name);
      setFileSize(formatFileSize(file.size));
      
      if (file.name.endsWith('.qbo')) {
        // Start progress animation
        setProgress(10);
        
        // Set a timeout to show an error if processing takes too long
        if (processingTimeout) {
          clearTimeout(processingTimeout);
        }
        
        const timeout = setTimeout(() => {
          setError("Processing is taking longer than expected. The file might be too large or in an unsupported format.");
          setProgress(0);
        }, 20000); // 20 seconds timeout
        
        setProcessingTimeout(timeout);
        
        const progressInterval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 300);
        
        try {
          const transactionCount = await uploadQBOFile(file);
          
          clearInterval(progressInterval);
          setProgress(100);
          
          if (processingTimeout) {
            clearTimeout(processingTimeout);
            setProcessingTimeout(null);
          }
          
          if (transactionCount === 0) {
            toast({
              title: "No transactions found",
              description: "The file was processed but no transactions were found. Please check the file format.",
              variant: "destructive"
            });
          }
        } catch (err) {
          clearInterval(progressInterval);
          setProgress(0);
          
          if (processingTimeout) {
            clearTimeout(processingTimeout);
            setProcessingTimeout(null);
          }
          
          setError((err as Error).message || "Failed to upload file");
        }
      } else {
        setError("Please upload a .qbo file.");
      }
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Clean up the timeout when component unmounts
  React.useEffect(() => {
    return () => {
      if (processingTimeout) {
        clearTimeout(processingTimeout);
      }
    };
  }, [processingTimeout]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Import Transactions</CardTitle>
        <CardDescription>Upload a .qbo file from your bank or financial institution</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragActive ? "border-primary bg-primary/5" : "border-gray-300"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={handleButtonClick}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".qbo"
            onChange={handleFileChange}
            className="hidden"
          />
          
          {isLoading || progress > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <FileText className="h-8 w-8 text-primary animate-pulse" />
                {fileName && (
                  <div className="text-left">
                    <p className="font-medium text-sm">{fileName}</p>
                    <p className="text-xs text-muted-foreground">{fileSize}</p>
                  </div>
                )}
              </div>
              <Progress value={progress} className="h-2 w-full max-w-md mx-auto" />
              <p className="text-sm text-muted-foreground">Processing file...</p>
            </div>
          ) : (
            <>
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                Drag and drop your .qbo file here, or click to browse
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Your data stays on your device and is not uploaded to any server
              </p>
            </>
          )}
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          <p className="font-medium mb-1">Supported formats and tips:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>QBO files exported from your bank or financial institution</li>
            <li>Files containing transaction data (date, amount, description, etc.)</li>
            <li>For large files (500KB+), please give the app a moment to process</li>
            <li>Files with multiple months or years of data are supported</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button onClick={handleButtonClick} disabled={isLoading || progress > 0}>
          {isLoading || progress > 0 ? "Processing..." : "Select QBO File"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default FileUploader;

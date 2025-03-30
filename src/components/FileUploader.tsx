
import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useFinance } from "@/context/FinanceContext";
import { Upload, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const FileUploader = () => {
  const { uploadQBOFile, isLoading } = useFinance();
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith('.qbo')) {
        try {
          await uploadQBOFile(file);
        } catch (err) {
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
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.qbo')) {
        try {
          await uploadQBOFile(file);
        } catch (err) {
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
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">
            Drag and drop your .qbo file here, or click to browse
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Your data stays on your device and is not uploaded to any server
          </p>
        </div>

        <div className="mt-4 text-xs text-muted-foreground">
          <p className="font-medium mb-1">Supported format:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>QBO files exported from your bank or financial institution</li>
            <li>Files containing transaction data (date, amount, description, etc.)</li>
            <li>Files with the .qbo extension</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button onClick={handleButtonClick} disabled={isLoading}>
          {isLoading ? "Uploading..." : "Select QBO File"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default FileUploader;

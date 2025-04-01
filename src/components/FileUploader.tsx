import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { FilePlus, Upload } from "lucide-react";
import { useFinance } from "@/context/FinanceContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const FileUploader = () => {
  const { uploadQBOFile, isLoading } = useFinance();
  const [file, setFile] = useState<File | null>(null);
  const [open, setOpen] = React.useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFile(acceptedFiles[0]);
    setOpen(true); // Open the AlertDialog when a file is dropped
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "application/xml": [".qbo"],
    },
  });

  const handleUpload = async () => {
    if (file) {
      try {
        await uploadQBOFile(file);
        setOpen(false); // Close the AlertDialog after successful upload
      } catch (error) {
        // Error is already handled in the useFinanceUpload hook
        setOpen(false); // Ensure AlertDialog is closed even on error
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4 animate-fade-in">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-md p-6 w-full max-w-md text-center cursor-pointer ${
          isDragActive ? "border-finance-primary bg-muted" : "border-border"
        }`}
      >
        <input {...getInputProps()} />
        <FilePlus className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          {isDragActive
            ? "Drop the file here..."
            : "Click here or drag and drop a .QBO file"}
        </p>
      </div>

      {file && (
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="outline">
              Import {file.name}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Import</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to import this file? This will overwrite any
                existing data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleUpload} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default FileUploader;

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { FilePlus, Upload, AlertCircle, CheckCircle2, UserCog } from "lucide-react";
import { useFinance } from "@/context/FinanceContext";
import { useToast } from "@/hooks/use-toast";
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BackgroundFormDialog, BackgroundFormData } from "@/components/BackgroundFormDialog";
import { toast } from "sonner";
import { PersonalBackground } from "@/lib/types";

const FileUploader = () => {
  const { uploadQBOFile, isLoading, updatePersonalBackground } = useFinance();
  const [file, setFile] = useState<File | null>(null);
  const [open, setOpen] = React.useState(false);
  const [backgroundFormOpen, setBackgroundFormOpen] = useState(false);
  const [backgroundData, setBackgroundData] = useState<BackgroundFormData | null>(null);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setOpen(true); // Open the AlertDialog when a file is dropped
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
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
        toast({
          title: "File Upload Success",
          description: `${file.name} has been successfully imported.`,
          variant: "default",
        });
        setOpen(false); // Close the AlertDialog after successful upload
      } catch (error) {
        toast({
          title: "Upload Failed",
          description: "There was an error importing your transactions.",
          variant: "destructive",
        });
        setOpen(false); // Ensure AlertDialog is closed even on error
      }
    }
  };

  const handleBackgroundFormSubmit = (data: BackgroundFormData) => {
    setBackgroundData(data);
    
    // Convert BackgroundFormData to PersonalBackground format
    const personalBackground: PersonalBackground = {
      name: data.name,
      birthDate: data.birthDate || new Date(),
      education: {
        level: data.education.level,
        school: data.education.school,
        major: data.education.major
      },
      locations: data.locations.map(loc => ({
        id: loc.id,
        location: loc.place,
        startDate: loc.startDate || new Date(),
        endDate: loc.endDate
      }))
    };
    
    // Update the personal background in the finance context
    updatePersonalBackground(personalBackground);
    
    // Store in localStorage for persistence
    localStorage.setItem('financial_persona', JSON.stringify(data));
    
    toast({
      title: "Background Information Saved",
      description: `Your personal information has been saved locally. This will help personalize your financial insights.`,
      variant: "default",
    });
  };

  // Load background data from localStorage on component mount
  React.useEffect(() => {
    const savedData = localStorage.getItem('financial_persona');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        
        // Convert date strings back to Date objects
        if (parsedData.birthDate) {
          parsedData.birthDate = new Date(parsedData.birthDate);
        }
        
        if (parsedData.locations) {
          parsedData.locations = parsedData.locations.map((loc: any) => ({
            ...loc,
            startDate: loc.startDate ? new Date(loc.startDate) : null,
            endDate: loc.endDate ? new Date(loc.endDate) : null,
          }));
        }
        
        setBackgroundData(parsedData);
      } catch (error) {
        console.error("Error loading background data:", error);
      }
    }
  }, []);

  return (
    <Card className="w-full max-w-3xl mx-auto border border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl flex items-center gap-2">
            <FilePlus className="h-6 w-6 text-finance-primary" />
            Import QBO File
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setBackgroundFormOpen(true)}
              className="flex items-center gap-1"
            >
              <UserCog className="h-4 w-4" />
              {backgroundData ? "Edit Background" : "Add Background"}
            </Button>
          </div>
        </div>
        <CardDescription>
          Upload your financial transactions from Quickbooks or other compatible software
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-6">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragActive ? "border-finance-primary bg-muted/50" : "border-border"
          } ${isDragReject ? "border-destructive bg-destructive/10" : ""}`}
        >
          <input {...getInputProps()} />
          {isDragReject ? (
            <div className="flex flex-col items-center text-destructive">
              <AlertCircle className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">File type not supported</p>
              <p className="text-sm mt-1">Please upload a .QBO file only</p>
            </div>
          ) : isDragActive ? (
            <div className="flex flex-col items-center text-finance-primary">
              <Upload className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">Drop your file here</p>
            </div>
          ) : (
            <div className="flex flex-col items-center text-muted-foreground">
              <FilePlus className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">Drag & drop your QBO file here</p>
              <p className="text-sm mt-1">or click to browse files</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Badge variant="outline" className="bg-muted/80">Quickbooks</Badge>
                <Badge variant="outline" className="bg-muted/80">Web Connect</Badge>
                <Badge variant="outline" className="bg-muted/80">.QBO Format</Badge>
              </div>
            </div>
          )}
        </div>

        {file && (
          <div className="mt-4 p-4 bg-muted/30 rounded-md border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="font-medium">{file.name}</span>
              <Badge variant="outline" className="ml-2">
                {(file.size / 1024).toFixed(1)} KB
              </Badge>
            </div>

            <AlertDialog open={open} onOpenChange={setOpen}>
              <AlertDialogTrigger asChild>
                <Button>
                  Import File
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Import</AlertDialogTitle>
                  <AlertDialogDescription>
                    <p>Are you sure you want to import <strong>{file.name}</strong>?</p>
                    <p className="mt-2">
                      This will process all transactions in the file. Existing data will be overwritten.
                    </p>
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
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col items-start border-t pt-4 text-sm text-muted-foreground">
        <p>Supported files: Quickbooks Web Connect (.qbo) files</p>
        <p className="mt-1">For best results, export your financial data from the last 12 months</p>
      </CardFooter>

      {/* Background Information Form Dialog */}
      <BackgroundFormDialog
        open={backgroundFormOpen}
        onOpenChange={setBackgroundFormOpen}
        onSubmit={handleBackgroundFormSubmit}
        initialData={backgroundData || undefined}
      />
    </Card>
  );
};

export default FileUploader;

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EntityUploader from "@/components/business/entities/EntityUploader";
import EntityList from "@/components/business/entities/EntityList";
import { Upload, List } from "lucide-react";

const BusinessEntities = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Entity Management</h1>
        <p className="text-muted-foreground mt-2">
          Upload and manage QuickBooks files for multi-entity consolidation
        </p>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            <span>Entities</span>
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span>Upload</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          <EntityList />
        </TabsContent>

        <TabsContent value="upload" className="mt-6">
          <EntityUploader />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BusinessEntities;

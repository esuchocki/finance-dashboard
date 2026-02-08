import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AccountUploader from "@/components/business/accounts/AccountUploader";
import AccountList from "@/components/business/accounts/AccountList";
import { Upload, List } from "lucide-react";

const BusinessAccounts = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Account Management</h1>
        <p className="text-muted-foreground mt-2">
          Upload and manage QBO files from different bank accounts for consolidated financial analysis
        </p>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            <span>Accounts</span>
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span>Upload</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          <AccountList />
        </TabsContent>

        <TabsContent value="upload" className="mt-6">
          <AccountUploader />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BusinessAccounts;

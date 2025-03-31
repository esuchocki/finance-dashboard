
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClaudeApiTest from "./ClaudeApiTest";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Info } from "lucide-react";
import { hasClaudeApiKey, getClaudeApiKey, setClaudeApiKey } from "@/lib/claudeService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ClaudeDebugPage: React.FC = () => {
  const [apiKey, setApiKeyState] = React.useState<string>(() => getClaudeApiKey() || "");

  const updateApiKey = () => {
    setClaudeApiKey(apiKey);
    toast.success("Claude API key updated");
  };

  return (
    <div className="container py-8 space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">Claude API Debug</h1>
        <p className="text-muted-foreground">
          Diagnose and test Claude AI categorization issues
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Key Status</CardTitle>
          <CardDescription>
            Check if your Claude API key is configured properly
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasClaudeApiKey() ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>API Key Found</AlertTitle>
              <AlertDescription>
                A Claude API key is present. Key starts with: {getClaudeApiKey().substring(0, 4)}...
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No API Key</AlertTitle>
              <AlertDescription>
                No Claude API key has been configured. Add your key below.
              </AlertDescription>
            </Alert>
          )}

          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium">Claude API Key</label>
            <div className="flex space-x-2">
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKeyState(e.target.value)}
                placeholder="Enter your Claude API key (sk-ant-...)"
                className="flex-1"
              />
              <Button onClick={updateApiKey}>Update Key</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Your API key is stored only in your browser's local storage.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="api-test" className="w-full">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="api-test">API Test</TabsTrigger>
          <TabsTrigger value="prompt-test">Prompt Engineering</TabsTrigger>
          <TabsTrigger value="parsing-test">Response Parsing</TabsTrigger>
        </TabsList>
        
        <TabsContent value="api-test">
          <ClaudeApiTest />
        </TabsContent>
        
        <TabsContent value="prompt-test">
          <Card>
            <CardHeader>
              <CardTitle>Prompt Engineering Test</CardTitle>
              <CardDescription>
                Test different prompts to see which ones produce better categorization results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This feature is under development. Check back soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="parsing-test">
          <Card>
            <CardHeader>
              <CardTitle>Response Parsing Test</CardTitle>
              <CardDescription>
                Test parsing different Claude responses to ensure the JSON extraction works
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                This feature is under development. Check back soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClaudeDebugPage;

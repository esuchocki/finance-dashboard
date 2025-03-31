
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getClaudeApiKey } from "@/lib/claudeService";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

const ClaudeApiTest: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<any>(null);

  const runApiTest = async () => {
    const apiKey = getClaudeApiKey();
    
    if (!apiKey) {
      setError("No Claude API key found. Please add your Claude API key first.");
      toast.error("No Claude API key found", {
        description: "Please add your Claude API key in the settings menu"
      });
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setResult(null);
      setRawResponse(null);
      
      console.log("Testing Claude API with key:", apiKey.substring(0, 4) + "..." + apiKey.substring(apiKey.length - 4));
      
      // Simple test prompt
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-3-opus-20240229",
          max_tokens: 500,
          temperature: 0.7,
          system: "You are a helpful financial assistant. When asked to categorize transactions, use specific descriptive categories, never generic ones like 'Income' or 'Expenses'.",
          messages: [
            {
              role: "user",
              content: "Categorize this financial transaction into a specific category and subcategory: 'AMAZON MKTPLACE 9/15 PURCHASE'. Respond in JSON format only with fields 'category', 'subcategory', and 'description'."
            }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claude API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      setRawResponse(data);
      
      // Display the raw content
      const content = data.content?.[0]?.text || "";
      setResult(content);
      
      toast.success("Claude API test successful", {
        description: "Received valid response from Claude API"
      });
      
      // Attempt to parse JSON if it exists in the response
      try {
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                          content.match(/```\n([\s\S]*?)\n```/) ||
                          content.match(/(\{[\s\S]*\})/);
        
        if (jsonMatch) {
          const jsonStr = jsonMatch[1];
          const parsedJson = JSON.parse(jsonStr);
          console.log("Parsed JSON:", parsedJson);
          
          // Check if the response has specific categories rather than generic ones
          const category = parsedJson.category?.toLowerCase() || "";
          if (category === "income" || category === "expenses" || category === "uncategorized" || category === "other") {
            setError("Claude returned a generic category. Our prompt engineering needs improvement.");
          }
        }
      } catch (jsonError) {
        console.warn("Could not parse JSON from Claude response:", jsonError);
      }
    } catch (error) {
      console.error("Error testing Claude API:", error);
      setError((error as Error).message);
      toast.error("Claude API test failed", {
        description: (error as Error).message
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Claude API Test</CardTitle>
        <CardDescription>
          Test if the Claude API is working properly and returning expected categories
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {result && !error && (
          <Alert className="mb-4">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>Claude API responded successfully</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-4">
          <div>
            <Button 
              onClick={runApiTest} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Testing API..." : "Test Claude API"}
            </Button>
          </div>
          
          {result && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Response:</h4>
              <Textarea
                value={result}
                readOnly
                className="font-mono text-xs h-[200px] whitespace-pre-wrap"
              />
              
              <div className="text-xs text-muted-foreground">
                <h4 className="font-medium">Raw Response Object:</h4>
                <Textarea
                  value={JSON.stringify(rawResponse, null, 2)}
                  readOnly
                  className="font-mono text-xs h-[200px] whitespace-pre-wrap"
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <div className="text-xs text-muted-foreground">
          This test sends a single transaction to Claude and checks if it returns specific categories.
        </div>
      </CardFooter>
    </Card>
  );
};

export default ClaudeApiTest;

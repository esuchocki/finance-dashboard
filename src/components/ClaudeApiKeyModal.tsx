
import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Key, ShieldAlert, Trash2 } from "lucide-react";
import { saveClaudeApiKey, getClaudeApiKey, clearClaudeApiKey } from "@/lib/claudeService";

interface ClaudeApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ClaudeApiKeyModal: React.FC<ClaudeApiKeyModalProps> = ({ 
  open, 
  onOpenChange 
}) => {
  const [apiKey, setApiKey] = useState<string>(() => {
    // Load from localStorage if available
    return getClaudeApiKey();
  });
  const [isLoading, setIsLoading] = useState(false);

  const saveApiKey = () => {
    if (!apiKey.trim()) {
      clearClaudeApiKey();
      toast.info("Claude API key has been removed");
    } else {
      // Store the API key in localStorage
      saveClaudeApiKey(apiKey);
      toast.success("Claude API key has been saved");
      
      // Log that the key was saved (without showing the key)
      console.log("Claude API key saved. Length:", apiKey.length);
    }
    onOpenChange(false);
  };

  const clearApiKey = () => {
    setApiKey("");
    clearClaudeApiKey();
    toast.info("Claude API key has been removed");
    onOpenChange(false);
  };

  const testApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter an API key to test");
      return;
    }
    
    setIsLoading(true);
    
    try {
      toast.info("Testing Claude API key...");
      
      // In development environment, we might hit CORS issues, so let's handle that better
      try {
        // Test with a simple request to the Claude API
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 10,
            temperature: 0.1,
            messages: [{
              role: 'user',
              content: "Say hello"
            }]
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          toast.success("API key is valid!");
        } else {
          const errorText = await response.text();
          let errorMessage = 'Unknown error';
          
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error?.message || 'API validation failed';
          } catch (e) {
            errorMessage = `HTTP error ${response.status}`;
          }
          
          toast.error(`API key is invalid: ${errorMessage}`);
        }
      } catch (fetchError) {
        console.error("Fetch error during API test:", fetchError);
        
        // Special handling for development environment
        if (fetchError.name === 'AbortError') {
          toast.error("API request timed out. Please check your internet connection and try again.");
        } else if (fetchError.message === 'Failed to fetch') {
          // In development environment, this might be due to CORS
          toast.warning(
            "Network error detected. This may be due to CORS restrictions in the development environment. The key may still be valid for actual use."
          );
          // Save the key anyway since this might just be a development environment issue
          saveClaudeApiKey(apiKey);
          toast.info("API key has been saved despite network error");
        } else {
          toast.error(`Error testing API key: ${fetchError.message || 'Network error'}`);
        }
      }
    } catch (error) {
      console.error("Error in test API key function:", error);
      toast.error(`Unexpected error: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Claude API Key
          </DialogTitle>
          <DialogDescription>
            Enter your Claude API key to enhance transaction categorization and merchant identification.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="claude-api-key">API Key</Label>
            <Input
              id="claude-api-key"
              type="password"
              placeholder="sk-ant-api..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              Your API key is stored locally in your browser and never sent to our servers.
              It's used only for direct API calls from your device to Claude.
            </p>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-md mt-2">
            <p className="text-sm text-amber-800">
              <strong>Note:</strong> When testing in development environments, you may see network errors due to CORS restrictions. 
              If you encounter a "Failed to fetch" error, the key may still be valid for actual use.
            </p>
          </div>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              onClick={testApiKey} 
              disabled={isLoading}
              className="flex-shrink-0"
            >
              {isLoading ? "Testing..." : "Test Key"}
            </Button>
            
            {apiKey && (
              <Button 
                variant="outline" 
                onClick={clearApiKey}
                className="text-destructive hover:text-destructive flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear Key
              </Button>
            )}
          </div>
          
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button 
              onClick={saveApiKey} 
              disabled={isLoading}
              className="bg-sky-500 hover:bg-sky-600"
            >
              Save API Key
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClaudeApiKeyModal;

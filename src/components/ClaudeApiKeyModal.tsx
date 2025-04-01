
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
      
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 50,
          temperature: 0.1,
          messages: [{
            role: 'user',
            content: "Please respond with 'API key is valid' and nothing else."
          }]
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        toast.success("API key is valid!");
      } else {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        toast.error(`API key is invalid: ${errorData.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error testing API key:", error);
      toast.error(`Error testing API key: ${(error as Error).message || 'Network error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
            />
          </div>
          
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              Your API key is stored locally in your browser and never sent to our servers.
              It's used only for direct API calls from your device to Claude.
            </p>
          </div>
        </div>
        
        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={testApiKey} 
              type="button"
              disabled={isLoading}
            >
              {isLoading ? "Testing..." : "Test Key"}
            </Button>
            
            {apiKey && (
              <Button 
                variant="outline" 
                onClick={clearApiKey}
                type="button"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Key
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={saveApiKey} disabled={isLoading}>Save API Key</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClaudeApiKeyModal;

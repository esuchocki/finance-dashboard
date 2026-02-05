import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Building2, TrendingUp, Users, FileText, BarChart3 } from "lucide-react";
import { AppMode } from "@/lib/types";

const ModeSelection = () => {
  const navigate = useNavigate();
  const [selectedMode, setSelectedMode] = useState<AppMode | null>(null);

  // Check if user has already selected a mode
  useEffect(() => {
    const savedMode = localStorage.getItem('app_mode') as AppMode | null;
    if (savedMode) {
      // If mode was previously selected, redirect directly
      if (savedMode === 'personal') {
        navigate('/personal');
      } else {
        navigate('/business/dashboard');
      }
    }
  }, [navigate]);

  const handleModeSelect = (mode: AppMode) => {
    // Save mode preference to localStorage
    localStorage.setItem('app_mode', mode);

    // Navigate to the appropriate dashboard
    if (mode === 'personal') {
      navigate('/personal');
    } else {
      navigate('/business/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-5xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BarChart3 className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold">Finance</h1>
          </div>
          <p className="text-xl text-muted-foreground">
            Financial Analysis & Insights
          </p>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Choose your experience: Personal finance tracking or comprehensive business analysis for nonprofit organizations
          </p>
        </div>

        {/* Mode Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Personal Mode Card */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedMode === 'personal' ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedMode('personal')}
          >
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <User className="h-8 w-8 text-primary" />
                <Badge variant="outline">Individual</Badge>
              </div>
              <CardTitle className="text-2xl">Personal Finance</CardTitle>
              <CardDescription>
                Track your personal spending, income, and build financial insights
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Single QBO File</p>
                    <p className="text-xs text-muted-foreground">
                      Upload and analyze your personal QuickBooks transactions
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <FileText className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">AI-Powered Insights</p>
                    <p className="text-xs text-muted-foreground">
                      Get personalized spending analysis and recommendations
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <User className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Financial Persona</p>
                    <p className="text-xs text-muted-foreground">
                      Build your financial story with narrative transactions
                    </p>
                  </div>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  handleModeSelect('personal');
                }}
                variant={selectedMode === 'personal' ? 'default' : 'outline'}
              >
                Choose Personal Mode
              </Button>
            </CardContent>
          </Card>

          {/* Business Mode Card */}
          <Card
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedMode === 'business' ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedMode('business')}
          >
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <Building2 className="h-8 w-8 text-primary" />
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Nonprofit
                </Badge>
              </div>
              <CardTitle className="text-2xl">Business & Nonprofit</CardTitle>
              <CardDescription>
                Multi-entity consolidation and nonprofit financial analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <FileText className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Multi-Entity Consolidation</p>
                    <p className="text-xs text-muted-foreground">
                      Combine multiple QBO files across accounts and years
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Nonprofit Metrics</p>
                    <p className="text-xs text-muted-foreground">
                      Program expense ratio, operating reserves, fund accounting
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Users className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Vendor & Donor Analysis</p>
                    <p className="text-xs text-muted-foreground">
                      Track vendor spending and donor retention rates
                    </p>
                  </div>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  handleModeSelect('business');
                }}
                variant={selectedMode === 'business' ? 'default' : 'outline'}
              >
                Choose Business Mode
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer Info */}
        <div className="text-center text-xs text-muted-foreground space-y-2">
          <p>
            Your data is processed locally and never leaves your device
          </p>
          <p className="text-xs">
            You can change modes anytime from the settings menu
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModeSelection;

import React from "react";
import BusinessDashboard from "@/components/business/dashboard/BusinessDashboard";

const BusinessDashboardPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Business Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Consolidated financial analysis across multiple entities
        </p>
      </div>

      <BusinessDashboard />
    </div>
  );
};

export default BusinessDashboardPage;


import React from "react";
import TransactionPage from "@/components/TransactionPage";

const Transactions = () => {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-4 italic">Every expense avoided is one step closer to an Amel...</p>
      <TransactionPage />
    </div>
  );
};

export default Transactions;

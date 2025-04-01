
import React from "react";
import TransactionPage from "@/components/TransactionPage";

const Transactions = () => {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-4 italic">Every expense logged is one step closer to the open sea...</p>
      <TransactionPage />
    </div>
  );
};

export default Transactions;

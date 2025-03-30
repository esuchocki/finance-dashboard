
import React from "react";
import { useFinance } from "@/context/FinanceContext";
import AnalysisSection from "./AnalysisSection";

const AnalysisSectionWrapper = () => {
  const { filteredTransactions } = useFinance();
  
  return <AnalysisSection transactions={filteredTransactions} />;
};

export default AnalysisSectionWrapper;
